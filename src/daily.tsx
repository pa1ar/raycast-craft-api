// Open Daily Note - no-view command, tries local store first, falls back to API
import { LaunchProps, open, showToast, Toast } from "@raycast/api";
import { getClient, getLocalStoreAsync } from "./client";

export default async function Command(
  props: LaunchProps<{ arguments: { date?: string } }>,
) {
  const date = props.arguments.date?.trim() || "today";
  try {
    // try local: find daily note + build deeplink without API
    const local = await getLocalStoreAsync();
    if (local) {
      const blockId = local.findDailyNote(date);
      if (blockId) {
        const link = local.deeplink(blockId);
        if (link) {
          await open(link);
          return;
        }
      }
    }

    // API fallback
    const client = getClient();
    const root = (await client.blocks.getDaily(date, { maxDepth: 0 })) as any;
    const link = await client.deeplink(root.id);
    await open(link);
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open daily note",
      message: (e as Error).message,
    });
  }
}
