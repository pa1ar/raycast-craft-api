// Browse Collections - list collections, drill into items
// Enter = preview item content; Shift+Enter = open in Craft
import { List, ActionPanel, Action, Icon, open, Clipboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getClient, getLocalStoreAsync } from "./client";
import { DocPreview } from "./components/doc-preview";
import type {
  CraftClient,
  Collection,
  CollectionItem,
} from "@1ar/craft-cli/lib";

function CollectionItems({
  collection,
  client,
}: {
  collection: Collection;
  client: CraftClient;
}) {
  const { data, isLoading } = useCachedPromise(
    async (id: string) => {
      const res = await client.collections.getItems(id);
      return res.items;
    },
    [collection.id],
  );

  return (
    <List
      isLoading={isLoading}
      navigationTitle={collection.name}
      searchBarPlaceholder="Filter items"
    >
      {data?.map((item: CollectionItem) => {
        // Craft collection items use the schema's first property as
        // the display field (e.g. "service" instead of "title").
        // Find the first string value that isn't a system key.
        const systemKeys = new Set(["id", "properties", "content"]);
        const titleEntry = Object.entries(item).find(
          ([k, v]) => !systemKeys.has(k) && typeof v === "string",
        );
        const displayTitle =
          item.title ?? titleEntry?.[1] ?? item.id.slice(0, 8);

        const props = item.properties ?? {};
        const propSummary = Object.entries(props)
          .filter(([, v]) => v !== null && v !== undefined && v !== "")
          .map(([k, v]) => `${k}: ${v}`)
          .join(" | ");

        return (
          <List.Item
            key={item.id}
            title={displayTitle as string}
            subtitle={propSummary.slice(0, 80)}
            icon={Icon.Dot}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Preview"
                  icon={Icon.Eye}
                  target={
                    <DocPreview
                      doc={{ id: item.id, title: displayTitle as string }}
                      client={client}
                    />
                  }
                />
                <Action
                  title="Open in Craft"
                  icon={Icon.AppWindow}
                  shortcut={{ modifiers: ["shift"], key: "return" }}
                  onAction={async () => {
                    const local = await getLocalStoreAsync();
                    const link =
                      local?.deeplink(item.id) ??
                      (await client.deeplink(item.id));
                    await open(link);
                  }}
                />
                {collection.documentId && (
                  <Action
                    title="Open Parent Document"
                    icon={Icon.AppWindow}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                    onAction={async () => {
                      const link = await client.deeplink(
                        collection.documentId!,
                      );
                      await open(link);
                    }}
                  />
                )}
                <Action
                  title="Copy Item ID"
                  icon={Icon.CopyClipboard}
                  onAction={() => Clipboard.copy(item.id)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

export default function Command() {
  const client = getClient();

  const { data, isLoading } = useCachedPromise(async () => {
    const res = await client.collections.list();
    return res.items;
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter collections">
      {data?.map((col: Collection) => (
        <List.Item
          key={col.id}
          title={col.name}
          icon={Icon.List}
          accessories={[{ text: `${col.itemCount ?? 0} items` }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Browse Items"
                icon={Icon.List}
                target={<CollectionItems collection={col} client={client} />}
              />
              {col.documentId && (
                <Action
                  title="Open Parent Document"
                  icon={Icon.AppWindow}
                  onAction={async () => {
                    const link = await client.deeplink(col.documentId!);
                    await open(link);
                  }}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
