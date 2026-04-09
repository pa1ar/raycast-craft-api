// Create Craft Document - no-view, opens new doc in Craft
import { LaunchProps, showToast, Toast, open } from "@raycast/api";
import { getClient } from "./client";

export default async function Command(
  props: LaunchProps<{ arguments: { title: string } }>,
) {
  const title = props.arguments.title.trim();
  if (!title) return;
  const client = getClient();
  try {
    const res = await client.documents.create([{ title }]);
    const doc = res.items[0];
    if (!doc) throw new Error("no document returned");
    const link = doc.clickableLink ?? (await client.deeplink(doc.id));
    await open(link);
    await showToast({
      style: Toast.Style.Success,
      title: "Created",
      message: title,
    });
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to create document",
      message: (e as Error).message,
    });
  }
}
