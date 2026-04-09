// Browse Folders - drill-down folder tree with documents
import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getClient } from "./client";
import { DocListItem } from "./components/doc-list-item";
import type { CraftClient } from "@1ar/craft-cli/lib";
import type { Folder } from "@1ar/craft-cli/lib";

function FolderContents({
  folder,
  client,
}: {
  folder: Folder;
  client: CraftClient;
}) {
  const { data, isLoading } = useCachedPromise(
    async (folderId: string) => {
      const res = await client.documents.list({
        folderId,
        fetchMetadata: true,
      });
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
