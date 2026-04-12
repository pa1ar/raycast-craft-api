// Browse Folders - drill-down folder tree with documents
import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getClient } from "./client";
import { DocListItem } from "./components/doc-list-item";
import type { CraftClient, Folder } from "@1ar/craft-cli/lib";

// virtual locations returned by folders.list have non-UUID IDs
const VIRTUAL_LOCATIONS = new Set([
  "unsorted",
  "trash",
  "templates",
  "daily_notes",
]);

function FolderContents({
  folder,
  client,
}: {
  folder: Folder;
  client: CraftClient;
}) {
  const { data, isLoading } = useCachedPromise(
    async (folderId: string) => {
      const opts = VIRTUAL_LOCATIONS.has(folderId)
        ? {
            location: folderId as
              | "unsorted"
              | "trash"
              | "templates"
              | "daily_notes",
            fetchMetadata: true,
          }
        : { folderId, fetchMetadata: true };
      const res = await client.documents.list(opts);
      return res.items;
    },
    [folder.id],
  );

  const subfolders = folder.folders ?? [];

  return (
    <List
      isLoading={isLoading}
      navigationTitle={folder.name}
      searchBarPlaceholder="Filter contents"
    >
      {subfolders.length > 0 && (
        <List.Section title="Folders">
          {subfolders.map((sub) => (
            <List.Item
              key={sub.id}
              title={sub.name}
              icon={Icon.Folder}
              accessories={[{ text: `${sub.documentCount ?? 0} docs` }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Open Folder"
                    icon={Icon.Folder}
                    target={<FolderContents folder={sub} client={client} />}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      <List.Section title="Documents">
        {data?.map((doc) => (
          <DocListItem key={doc.id} doc={doc} client={client} />
        ))}
      </List.Section>
    </List>
  );
}

export default function Command() {
  const client = getClient();

  const { data, isLoading } = useCachedPromise(async () => {
    const res = await client.folders.list();
    return res.items;
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter folders">
      {data?.map((folder) => (
        <List.Item
          key={folder.id}
          title={folder.name}
          icon={Icon.Folder}
          accessories={[{ text: `${folder.documentCount ?? 0} docs` }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Open Folder"
                icon={Icon.Folder}
                target={<FolderContents folder={folder} client={client} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
