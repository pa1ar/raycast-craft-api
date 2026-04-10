// Recent Documents - local store for speed, API fallback
import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getClient, getLocalStoreAsync } from "./client";
import { DocListItem } from "./components/doc-list-item";
import { toDocument } from "./local-store";

export default function Command() {
  const client = getClient();
  const since = isoDaysAgo(14);

  const { data, isLoading } = useCachedPromise(async () => {
    const local = await getLocalStoreAsync();
    if (local) {
      const docs = local
        .listDocs()
        .filter((d) => d.modified >= since)
        .map(toDocument);
      return docs.sort((a, b) =>
        (b.lastModifiedAt ?? "").localeCompare(a.lastModifiedAt ?? ""),
      );
    }
    const res = await client.documents.list({
      lastModifiedDateGte: since,
      fetchMetadata: true,
    });
    return res.items
      .slice()
      .sort((a, b) =>
        (b.lastModifiedAt ?? "").localeCompare(a.lastModifiedAt ?? ""),
      );
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter recent documents">
      {data?.map((doc) => (
        <DocListItem key={doc.id} doc={doc} client={client} />
      ))}
    </List>
  );
}

function isoDaysAgo(n: number): string {
  const d = new Date(Date.now() - n * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}
