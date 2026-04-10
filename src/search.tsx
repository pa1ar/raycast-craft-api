// Search Craft - local FTS5 for speed, API fallback
// displays document title + matching snippet
import { useState } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  Clipboard,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getClient, getLocalStoreAsync } from "./client";
import { toDocument } from "./local-store";
import type { Document } from "@1ar/craft-cli/lib";

interface SearchHit {
  doc: Document;
  snippet: string;
}

export default function Command() {
  const [query, setQuery] = useState("");
  const client = getClient();

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
        return results; // return even if empty - don't fall through to API
      }

      // API fallback
      const [searchRes, docsRes] = await Promise.all([
        client.documents.search({ regexps: q }),
        client.documents.list({ fetchMetadata: true }),
      ]);
      const docMap = new Map<string, Document>();
      for (const d of docsRes.items) docMap.set(d.id, d);

      return searchRes.items.map((hit): SearchHit => {
        const d = docMap.get(hit.documentId);
        return {
          doc: d ?? { id: hit.documentId, title: hit.documentId.slice(0, 8) },
          snippet: hit.markdown.slice(0, 150).replace(/\n/g, " "),
        };
      });
    },
    [query],
    { keepPreviousData: true },
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search Craft"
      throttle
    >
      {data?.map((hit, i) => (
        <List.Item
          key={`${hit.doc.id}-${i}`}
          title={hit.doc.title}
          subtitle={hit.snippet}
          icon={Icon.Document}
          accessories={[{ text: hit.doc.lastModifiedAt?.slice(0, 10) ?? "" }]}
          actions={
            <ActionPanel>
              <Action
                title="Open in Craft"
                icon={Icon.AppWindow}
                onAction={async () => {
                  const link =
                    hit.doc.clickableLink ??
                    (await client.deeplink(hit.doc.id));
                  await open(link);
                }}
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
                    // try local first
                    const local = getLocalStore();
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
