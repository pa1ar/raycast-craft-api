// Browse Collections - list collections, drill into items
import { List, ActionPanel, Action, Icon, open, Clipboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getClient } from "./client";
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
        const props = item.properties ?? {};
        const propSummary = Object.entries(props)
          .filter(([, v]) => v !== null && v !== undefined && v !== "")
          .map(([k, v]) => `${k}: ${v}`)
          .join(" | ");

        return (
          <List.Item
            key={item.id}
            title={item.title}
            subtitle={propSummary.slice(0, 80)}
            icon={Icon.Dot}
            actions={
              <ActionPanel>
                {collection.documentId && (
                  <Action
                    title="Open Parent Document"
                    icon={Icon.AppWindow}
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
