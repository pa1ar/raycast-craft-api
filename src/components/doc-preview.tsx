// DocPreview - Detail view showing a document's markdown
// local PTS is source of truth (instant, clean plain markdown)
// API fallback only kicks in when local store is unavailable or doc not yet synced
import {
  Detail,
  ActionPanel,
  Action,
  Icon,
  open,
  Clipboard,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import type { CraftClient, Document } from "@1ar/craft-cli/lib";
import { getLocalStoreAsync } from "../client";

interface Props {
  doc: Document;
  client: CraftClient;
}

// strip Craft API's XML wrapper tags. only used on the API fallback path;
// PTS content is already clean markdown with no wrappers.
function cleanApiMarkdown(raw: string): string {
  const contentMatch = raw.match(/<content>([\s\S]*?)<\/content>/);
  let body = contentMatch ? contentMatch[1] : raw;
  body = body.replace(/<page[^>]*>/g, "");
  body = body.replace(/<\/page>/g, "");
  body = body.replace(/<pageTitle>[\s\S]*?<\/pageTitle>/g, "");
  body = body.replace(/<\/?(?:highlight|gradient|callout|caption)[^>]*>/g, "");
  return body.trim();
}

export function DocPreview({ doc, client }: Props) {
  const { data, isLoading } = useCachedPromise(
    async (id: string) => {
      // local PTS is source of truth - instant read (~1ms), already clean markdown
      const local = await getLocalStoreAsync();
      const localContent = local?.getDocContent(id);
      if (localContent !== null && localContent !== undefined)
        return localContent;

      // API fallback: only when local store missing or doc not yet synced
      const raw = (await client.blocks.get(id, {
        format: "markdown",
      })) as string;
      return cleanApiMarkdown(raw);
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
              await showToast({
                style: Toast.Style.Animated,
                title: "Fetching...",
              });
              try {
                const local = await getLocalStoreAsync();
                let md = local?.getDocContent(doc.id);
                if (md === null || md === undefined) {
                  md = (await client.blocks.get(doc.id, {
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
