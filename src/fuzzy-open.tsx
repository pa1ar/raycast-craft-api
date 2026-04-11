// Fuzzy open any document by title - local store for speed, API fallback
import { useState } from "react";
import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getClient, getLocalStoreAsync } from "./client";
import { DocListItem } from "./components/doc-list-item";
import { toDocument } from "./local-store";

export default function Command() {
  const client = getClient();
  const [showDetail, setShowDetail] = useState(false);

  const { data, isLoading } = useCachedPromise(
    async () => {
      const local = await getLocalStoreAsync();
      if (local) {
        return local.listDocs().map(toDocument);
      }
      const res = await client.documents.list({ fetchMetadata: true });
      return res.items;
    },
    [],
    { initialData: [] },
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail}
      searchBarPlaceholder="Fuzzy-filter all documents by title"
    >
      {data?.map((doc) => (
        <DocListItem
          key={doc.id}
          doc={doc}
          client={client}
          onToggleDetail={() => setShowDetail((v) => !v)}
        />
      ))}
    </List>
  );
}
