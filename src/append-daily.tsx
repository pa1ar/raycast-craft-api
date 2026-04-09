// Append to today's daily note — no-view
import { LaunchProps, showToast, Toast } from "@raycast/api";
import { getClient } from "./client";

export default async function Command(
  props: LaunchProps<{ arguments: { text: string } }>,
) {
  const text = props.arguments.text.trim();
  if (!text) return;
  const client = getClient();
  try {
    await client.blocks.append(text, { date: "today" });
    await showToast({
      style: Toast.Style.Success,
      title: "Appended to daily note",
      message: text.slice(0, 60),
    });
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to append",
      message: (e as Error).message,
    });
  }
}
