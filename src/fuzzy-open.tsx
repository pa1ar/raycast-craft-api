// Fuzzy open any document by title - full-vault list cached, filtered client-side
import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getClient } from "./client";
import { DocListItem } from "./components/doc-list-item";

export default function Command() {
  const client = getClient();
  const { data, isLoading } = useCachedPromise(
    async () => {
      const res = await client.documents.list({ fetchMetadata: true });
      return res.items;
    },
    [],
    { initialData: [] },
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Fuzzy-filter all documents by title"
    >
      {data?.map((doc) => (
        <DocListItem key={doc.id} doc={doc} client={client} />
      ))}
    </List>
  );
}
