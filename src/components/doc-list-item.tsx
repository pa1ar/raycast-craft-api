// reusable document list item with standard actions
// primary action: Preview (Enter); secondary: Open in Craft (Shift+Enter)
import {
  List,
  ActionPanel,
  Action,
  Icon,
  open,
  Clipboard,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import type { CraftClient, Document, BlockLink } from "@1ar/craft-cli/lib";
import type { ReactNode } from "react";
import { getLocalStoreAsync } from "../client";
import { DocPreview } from "./doc-preview";

interface Props {
  doc: Document;
  client: CraftClient;
  subtitle?: string;
  icon?: Icon;
  extraActions?: ReactNode;
  /** Toggle callback for showing/hiding the detail panel. If provided, renders a Toggle Details action. */
  onToggleDetail?: () => void;
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
  onToggleDetail,
}: Props) {
  const sub = subtitle ?? doc.lastModifiedAt?.slice(0, 10) ?? "";

  return (
    <List.Item
      key={doc.id}
      title={doc.title}
      subtitle={sub}
      icon={icon ?? Icon.Document}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Title" text={doc.title} />
              <List.Item.Detail.Metadata.Label
                title="Document ID"
                text={doc.id}
              />
              {doc.lastModifiedAt && (
                <List.Item.Detail.Metadata.Label
                  title="Modified"
                  text={doc.lastModifiedAt.slice(0, 10)}
                />
              )}
              {doc.createdAt && (
                <List.Item.Detail.Metadata.Label
                  title="Created"
                  text={doc.createdAt.slice(0, 10)}
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
            target={<DocPreview doc={doc} client={client} />}
          />
          <Action
            title="Open in Craft"
            icon={Icon.AppWindow}
            shortcut={{ modifiers: ["shift"], key: "return" }}
            onAction={async () => {
              const local = await getLocalStoreAsync();
              const link =
                local?.deeplink(doc.id) ??
                doc.clickableLink ??
                (await client.deeplink(doc.id));
              await open(link);
            }}
          />
          <Action.Push
            title="Show Backlinks"
            icon={Icon.Link}
            target={<BacklinksList docId={doc.id} client={client} />}
            shortcut={{ modifiers: ["cmd"], key: "b" }}
          />
          {onToggleDetail && (
            <Action
              title="Toggle Details"
              icon={Icon.Sidebar}
              shortcut={{ modifiers: ["cmd"], key: "i" }}
              onAction={onToggleDetail}
            />
          )}
          {extraActions}
          <Action
            title="Copy Deeplink"
            icon={Icon.Link}
            shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
            onAction={async () => {
              const local = await getLocalStoreAsync();
              const link =
                local?.deeplink(doc.id) ??
                doc.clickableLink ??
                (await client.deeplink(doc.id));
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
