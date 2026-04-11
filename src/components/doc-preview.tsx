// DocPreview - Detail view showing a document's markdown with metadata panel
// fetches via API with maxDepth=1, strips Craft's XML wrapper tags for clean rendering
import {
  Detail,
  ActionPanel,
  Action,
  Icon,
  open,
  Clipboard,
  showToast,
  Toast,
  Cache,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import type { CraftClient, Document } from "@1ar/craft-cli/lib";
import { getLocalStoreAsync } from "../client";

interface Props {
  doc: Document;
  client: CraftClient;
}

// persistent cache keyed by "{docId}:{contentHash}"
// since contentHash changes when content changes, cached entries are always fresh
const previewCache = new Cache({ namespace: "doc-preview" });

// strip Craft's XML wrapper and inline formatting tags
// keeps markdown content and inner text of tags like <highlight>, <gradient>, <callout>
function cleanMarkdown(raw: string): string {
  // extract content between <content>...</content> if present
  const contentMatch = raw.match(/<content>([\s\S]*?)<\/content>/);
  let body = contentMatch ? contentMatch[1] : raw;

  // strip <page ...> and <pageTitle>...</pageTitle> if still present
  body = body.replace(/<page[^>]*>/g, "");
  body = body.replace(/<\/page>/g, "");
  body = body.replace(/<pageTitle>[\s\S]*?<\/pageTitle>/g, "");

  // strip inline formatting tags but keep their text content
  // e.g. <highlight color="..."><gradient kind="1">text</gradient></highlight> -> text
  body = body.replace(/<\/?(?:highlight|gradient|callout|caption)[^>]*>/g, "");

  return body.trim();
}

export function DocPreview({ doc, client }: Props) {
  const { data, isLoading } = useCachedPromise(
    async (id: string) => {
      // cache key: local contentHash ensures freshness across content changes
      const local = await getLocalStoreAsync();
      const contentHash = local?.getContentHash(id);
      const cacheKey = contentHash ? `${id}:${contentHash}` : null;

      // cache hit: instant
      if (cacheKey) {
        const cached = previewCache.get(cacheKey);
        if (cached) return cleanMarkdown(cached);
      }

      // cache miss: fetch shallow markdown from API (maxDepth=1 = top-level blocks only)
      try {
        const raw = (await client.blocks.get(id, {
          format: "markdown",
          maxDepth: 1,
        })) as string;
        if (cacheKey) previewCache.set(cacheKey, raw);
        return cleanMarkdown(raw);
      } catch {
        // API failed (offline, bad creds, etc.) - fall back to local full content
        const fullLocal = local?.getDocContent(id);
        if (fullLocal) return fullLocal;
        throw new Error("Preview unavailable (no local data and API failed)");
      }
    },
    [doc.id],
  );

  async function getDeeplink(): Promise<string> {
    const local = await getLocalStoreAsync();
    return (
      local?.deeplink(doc.id) ??
      doc.clickableLink ??
      (await client.deeplink(doc.id))
    );
  }

  // single-line header: Title • Modified: date • ID
  const modified = doc.lastModifiedAt?.slice(0, 10) ?? "—";
  const header = `**${doc.title}** • Modified: ${modified} • \`${doc.id}\``;
  const markdown = `${header}\n\n---\n\n${data ?? ""}`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={doc.title}
      actions={
        <ActionPanel>
          <Action
            title="Open in Craft"
            icon={Icon.AppWindow}
            onAction={async () => {
              await open(await getDeeplink());
            }}
          />
          <Action
            title="Copy Full Markdown"
            icon={Icon.Download}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onAction={async () => {
              // fetch FULL content (not the shallow preview).
              // prefer local PTS markdownContent (fast, full recursive),
              // fall back to API without maxDepth for complete tree.
              await showToast({
                style: Toast.Style.Animated,
                title: "Fetching full markdown...",
              });
              try {
                const local = await getLocalStoreAsync();
                let md = local?.getDocContent(doc.id);
                if (!md) {
                  md = (await client.blocks.get(doc.id, {
                    format: "markdown",
                  })) as string;
                }
                await Clipboard.copy(md);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Copied full markdown",
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
              await Clipboard.copy(await getDeeplink());
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
            onAction={() => Clipboard.copy(doc.id)}
          />
        </ActionPanel>
      }
    />
  );
}
