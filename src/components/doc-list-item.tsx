// reusable document list item with standard actions
import {
  List,
  ActionPanel,
  Action,
  Detail,
  Icon,
  open,
  Clipboard,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import type { CraftClient } from "@1ar/craft-cli/lib";
import type { Document, BlockLink } from "@1ar/craft-cli/lib";
import type { ReactNode } from "react";

interface Props {
  doc: Document;
  client: CraftClient;
  subtitle?: string;
  icon?: Icon;
  extraActions?: ReactNode;
}

function DocPreview({ docId, client }: { docId: string; client: CraftClient }) {
  const { data, isLoading } = useCachedPromise(
    async (id: string) =>
      (await client.blocks.get(id, { format: "markdown" })) as string,
    [docId],
  );
  return <Detail isLoading={isLoading} markdown={data ?? ""} />;
}

function BacklinksList({
  docId,
  client,
}: {
  docId: string;
  client: CraftClient;
}) {
  const { data, isLoading } = useCachedPromise(
    async (id: string) => {
      const links = await client.links.backlinks(id);
      return links;
    },
    [docId],
  );

  return (
    <List isLoading={isLoading} navigationTitle="Backlinks">
      {data?.map((link: BlockLink, i: number) => (
        <List.Item
          key={`${link.inBlockId}-${i}`}
          title={link.text || "(untitled)"}
          subtitle={link.inDocumentId.slice(0, 8)}
          icon={Icon.Link}
          actions={
            <ActionPanel>
              <Action
                title="Open Source Document"
                icon={Icon.AppWindow}
                onAction={async () => {
                  const url = await client.deeplink(link.inDocumentId);
                  await open(url);
                }}
              />
              <Action
                title="Copy Document ID"
                icon={Icon.CopyClipboard}
                onAction={() => Clipboard.copy(link.inDocumentId)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export function DocListItem({
  doc,
  client,
  subtitle,
  icon,
  extraActions,
}: Props) {
  const sub = subtitle ?? doc.lastModifiedAt?.slice(0, 10) ?? "";

  return (
    <List.Item
      key={doc.id}
      title={doc.title}
      subtitle={sub}
      icon={icon ?? Icon.Document}
      actions={
        <ActionPanel>
          <Action
            title="Open in Craft"
            icon={Icon.AppWindow}
            onAction={async () => {
              const link = doc.clickableLink ?? (await client.deeplink(doc.id));
              await open(link);
            }}
          />
          <Action.Push
            title="Preview"
            icon={Icon.Eye}
            target={<DocPreview docId={doc.id} client={client} />}
            shortcut={{ modifiers: ["cmd"], key: "p" }}
          />
          <Action.Push
            title="Show Backlinks"
            icon={Icon.Link}
            target={<BacklinksList docId={doc.id} client={client} />}
            shortcut={{ modifiers: ["cmd"], key: "b" }}
          />
          {extraActions}
          <Action
            title="Copy Document ID"
            icon={Icon.CopyClipboard}
            onAction={() => Clipboard.copy(doc.id)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
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
                const md = (await client.blocks.get(doc.id, {
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
        </ActionPanel>
      }
    />
  );
}
