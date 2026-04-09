// Craft Space Info - no-view, shows connected space
import { showHUD, showToast, Toast } from "@raycast/api";
import { getClient } from "./client";

export default async function Command() {
  const client = getClient();
  try {
    const info = await client.connection();
    await showHUD(`${info.space.name} (${info.space.timezone})`);
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Connection failed",
      message: (e as Error).message,
    });
  }
}
