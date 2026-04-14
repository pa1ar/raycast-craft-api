// Search Craft - local FTS5 for speed, API fallback
// displays document title + matching snippet
// recent searches persisted via LocalStorage
import { useState, useEffect } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  Clipboard,
  open,
  showToast,
  Toast,
  LocalStorage,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getClient, getLocalStoreAsync } from "./client";
import { toDocument } from "./local-store";
import { DocPreview } from "./components/doc-preview";
import type { Document } from "@1ar/craft-cli/lib";

const RECENT_KEY = "recent-searches";
const MAX_RECENT = 10;

async function getRecentSearches(): Promise<string[]> {
  const raw = await LocalStorage.getItem<string>(RECENT_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function addRecentSearch(query: string): Promise<void> {
  const trimmed = query.trim();
  if (!trimmed) return;
  const recent = await getRecentSearches();
  const updated = [trimmed, ...recent.filter((q) => q !== trimmed)].slice(
    0,
    MAX_RECENT,
  );
  await LocalStorage.setItem(RECENT_KEY, JSON.stringify(updated));
}

async function removeRecentSearch(query: string): Promise<void> {
  const recent = await getRecentSearches();
  await LocalStorage.setItem(
    RECENT_KEY,
    JSON.stringify(recent.filter((q) => q !== query)),
  );
}

async function clearRecentSearches(): Promise<void> {
  await LocalStorage.removeItem(RECENT_KEY);
}

interface SearchHit {
  doc: Document;
  snippet: string;
}

export default function Command() {
  const [query, setQuery] = useState("");
  const [showDetail, setShowDetail] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const client = getClient();

  useEffect(() => {
    getRecentSearches().then(setRecentSearches);
  }, []);

  const { data, isLoading } = useCachedPromise(
    async (q: string) => {
      if (!q.trim()) return [];

      const local = await getLocalStoreAsync();
      if (local) {
        // local FTS5 search + enrich with doc titles from PTS
        const hits = local.search(q);
        const allDocs = local.listDocs();
        const docMap = new Map(allDocs.map((d) => [d.documentId, d]));
        const seen = new Set<string>();
        const results: SearchHit[] = [];
        for (const hit of hits) {
          if (seen.has(hit.documentId)) continue;
          seen.add(hit.documentId);
          const localDoc = docMap.get(hit.documentId);
          const doc: Document = localDoc
            ? toDocument(localDoc)
            : { id: hit.id, title: hit.content.slice(0, 60) };
          results.push({
            doc,
            snippet: hit.content.slice(0, 150).replace(/\n/g, " "),
          });
        }
        if (results.length > 0) {
          await addRecentSearch(q);
          getRecentSearches().then(setRecentSearches);
        }
        return results;
      }

      // API fallback
      const [searchRes, docsRes] = await Promise.all([
        client.documents.search({ regexps: q }),
        client.documents.list({ fetchMetadata: true }),
      ]);
      const docMap = new Map<string, Document>();
      for (const d of docsRes.items) docMap.set(d.id, d);

      const results = searchRes.items.map((hit): SearchHit => {
        const d = docMap.get(hit.documentId);
        return {
          doc: d ?? { id: hit.documentId, title: hit.documentId.slice(0, 8) },
          snippet: hit.markdown.slice(0, 150).replace(/\n/g, " "),
        };
      });
      if (results.length > 0) {
        await addRecentSearch(q);
        getRecentSearches().then(setRecentSearches);
      }
      return results;
    },
    [query],
    { keepPreviousData: true },
  );

  const showRecent = !query.trim() && recentSearches.length > 0;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search Craft"
      throttle
    >
      {showRecent && (
        <List.Section title="Recent Searches">
          {recentSearches.map((q) => (
            <List.Item
              key={q}
              title={q}
              icon={Icon.Clock}
              actions={
                <ActionPanel>
                  <Action
                    title="Search Again"
                    icon={Icon.MagnifyingGlass}
                    onAction={() => setQuery(q)}
                  />
                  <Action
                    title="Remove from Recent"
                    icon={Icon.Trash}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={async () => {
                      await removeRecentSearch(q);
                      setRecentSearches(await getRecentSearches());
                    }}
                  />
                  <Action
                    title="Clear All Recent"
                    icon={Icon.Trash}
                    shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                    onAction={async () => {
                      await clearRecentSearches();
                      setRecentSearches([]);
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {data?.map((hit, i) => (
        <List.Item
          key={`${hit.doc.id}-${i}`}
          title={hit.doc.title}
          subtitle={showDetail ? undefined : hit.snippet}
          icon={Icon.Document}
          accessories={
            showDetail
              ? undefined
              : [{ text: hit.doc.lastModifiedAt?.slice(0, 10) ?? "" }]
          }
          detail={
            <List.Item.Detail
              markdown={hit.snippet}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Title"
                    text={hit.doc.title}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Document ID"
                    text={hit.doc.id}
                  />
                  {hit.doc.lastModifiedAt && (
                    <List.Item.Detail.Metadata.Label
                      title="Modified"
                      text={hit.doc.lastModifiedAt.slice(0, 10)}
                    />
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.Push
                title="Preview"
                icon={Icon.Eye}
                target={<DocPreview doc={hit.doc} client={client} />}
              />
              <Action
                title="Open in Craft"
                icon={Icon.AppWindow}
                shortcut={{ modifiers: ["shift"], key: "return" }}
                onAction={async () => {
                  const local = await getLocalStoreAsync();
                  const link =
                    local?.deeplink(hit.doc.id) ??
                    hit.doc.clickableLink ??
                    (await client.deeplink(hit.doc.id));
                  await open(link);
                }}
              />
              <Action
                title="Toggle Details"
                icon={Icon.Sidebar}
                shortcut={{ modifiers: ["cmd"], key: "i" }}
                onAction={() => setShowDetail((v) => !v)}
              />
              <Action
                title="Copy Snippet"
                icon={Icon.Text}
                onAction={() => Clipboard.copy(hit.snippet)}
              />
              <Action
                title="Copy Full Markdown"
                icon={Icon.Download}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
                onAction={async () => {
                  await showToast({
                    style: Toast.Style.Animated,
                    title: "Fetching...",
                  });
                  try {
                    const local = await getLocalStoreAsync();
                    let md = local?.getDocContent(hit.doc.id);
                    if (!md) {
                      md = (await client.blocks.get(hit.doc.id, {
                        format: "markdown",
                      })) as string;
                    }
                    await Clipboard.copy(md);
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Copied markdown",
                    });
                  } catch (e) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Fetch failed",
                      message: (e as Error).message,
                    });
                  }
                }}
              />
              <Action
                title="Copy Deeplink"
                icon={Icon.Link}
                shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                onAction={async () => {
                  const local = await getLocalStoreAsync();
                  const link =
                    local?.deeplink(hit.doc.id) ??
                    hit.doc.clickableLink ??
                    (await client.deeplink(hit.doc.id));
                  await Clipboard.copy(link);
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Copied deeplink",
                  });
                }}
              />
              <Action
                title="Copy Document ID"
                icon={Icon.CopyClipboard}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                onAction={() => Clipboard.copy(hit.doc.id)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
