// shared: build a CraftClient from Raycast preferences
import { getPreferenceValues } from "@raycast/api";
import { CraftClient } from "@1ar/craft-cli/lib";

interface Preferences {
  craftUrl: string;
  craftKey: string;
}

let cached: CraftClient | null = null;

export function getClient(): CraftClient {
  if (cached) return cached;
  const prefs = getPreferenceValues<Preferences>();
  cached = new CraftClient({ url: prefs.craftUrl, key: prefs.craftKey });
  return cached;
}
