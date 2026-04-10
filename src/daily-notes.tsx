// Daily Notes - browse daily notes list, search by date
import { List, ActionPanel, Action, Icon, open } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getClient, getLocalStoreAsync } from "./client";
import { toDocument } from "./local-store";
import type { Document } from "@1ar/craft-cli/lib";

export default function Command() {
  const client = getClient();

  const { data, isLoading } = useCachedPromise(async () => {
    const local = await getLocalStoreAsync();
    if (local) {
      return local
        .listDocs()
        .filter((d) => d.isDailyNote)
        .sort((a, b) => b.modified.localeCompare(a.modified))
        .map(toDocument);
    }
    // API fallback: list daily notes location
    const res = await client.documents.list({
      location: "daily_notes",
      fetchMetadata: true,
    });
    return res.items.sort((a, b) =>
      (b.lastModifiedAt ?? "").localeCompare(a.lastModifiedAt ?? ""),
    );
  }, []);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter daily notes by date"
    >
      {data?.map((doc: Document) => {
        const dateStr =
          doc.dailyNoteDate ?? doc.lastModifiedAt?.slice(0, 10) ?? "";
        return (
          <List.Item
            key={doc.id}
            title={doc.title}
            subtitle={dateStr}
            icon={Icon.Calendar}
            actions={
              <ActionPanel>
                <Action
                  title="Open in Craft"
                  icon={Icon.AppWindow}
                  onAction={async () => {
                    const local = await getLocalStoreAsync();
                    const link =
                      local?.deeplink(doc.id) ??
                      doc.clickableLink ??
                      (await client.deeplink(doc.id));
                    await open(link);
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
