// Add Task to Inbox — no-view
import { LaunchProps, showToast, Toast } from "@raycast/api";
import { getClient } from "./client";

export default async function Command(
  props: LaunchProps<{ arguments: { task: string } }>,
) {
  const task = props.arguments.task.trim();
  if (!task) return;
  const client = getClient();
  try {
    await client.tasks.add([{ markdown: task, location: { type: "inbox" } }]);
    await showToast({
      style: Toast.Style.Success,
      title: "Added to Craft inbox",
      message: task,
    });
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to add task",
      message: (e as Error).message,
    });
  }
}
