// Open Daily Note — no-view command, fetches today's daily note root and opens in Craft app
import { LaunchProps, open, showToast, Toast } from "@raycast/api";
import { getClient } from "./client";

export default async function Command(
  props: LaunchProps<{ arguments: { date?: string } }>,
) {
  const date = props.arguments.date?.trim() || "today";
  const client = getClient();
  try {
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
