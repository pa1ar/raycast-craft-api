// Search Craft (via Craft API) - typed query -> /documents/search
// displays document title + matching snippet, like the official Craft extension
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
import { getClient } from "./client";
import type { Document, DocumentSearchHit } from "@1ar/craft-cli/lib";

interface EnrichedHit extends DocumentSearchHit {
  docTitle: string;
  docDate: string;
  docLink?: string;
}

export default function Command() {
  const [query, setQuery] = useState("");
  const client = getClient();

  const { data, isLoading } = useCachedPromise(
    async (q: string) => {
      if (!q.trim()) return [];

      // fetch search results and doc list in parallel
      const [searchRes, docsRes] = await Promise.all([
        client.documents.search({ regexps: q }),
        client.documents.list({ fetchMetadata: true }),
      ]);

      const docMap = new Map<string, Document>();
      for (const doc of docsRes.items) docMap.set(doc.id, doc);

      return searchRes.items.map((hit): EnrichedHit => {
        const doc = docMap.get(hit.documentId);
        return {
          ...hit,
          docTitle: doc?.title ?? hit.documentId.slice(0, 8),
          docDate: doc?.lastModifiedAt?.slice(0, 10) ?? "",
          docLink: doc?.clickableLink,
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
      searchBarPlaceholder="Search Craft (regex)"
      throttle
    >
      {data?.map((hit, i) => {
        const snippet = hit.markdown.slice(0, 150).replace(/\n/g, " ");
        return (
          <List.Item
            key={`${hit.documentId}-${i}`}
            title={hit.docTitle}
            subtitle={snippet}
            icon={Icon.Document}
            accessories={[{ text: hit.docDate }]}
            actions={
              <ActionPanel>
                <Action
                  title="Open in Craft"
                  icon={Icon.AppWindow}
                  onAction={async () => {
                    const link =
                      hit.docLink ?? (await client.deeplink(hit.documentId));
                    await open(link);
                  }}
                />
                <Action
                  title="Copy Snippet"
                  icon={Icon.Text}
                  onAction={() => Clipboard.copy(hit.markdown)}
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
                      const md = (await client.blocks.get(hit.documentId, {
                        format: "markdown",
                      })) as string;
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
                  onAction={() => Clipboard.copy(hit.documentId)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
