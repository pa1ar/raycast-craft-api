// shared: build a CraftClient from Raycast preferences + optional local store
import { getPreferenceValues } from "@raycast/api";
import { CraftClient } from "@1ar/craft-cli/lib";
import { discoverLocalStore, type LocalStore } from "./local-store";

interface Preferences {
  craftUrl: string;
  craftKey: string;
}

let cachedClient: CraftClient | null = null;
let cachedLocal: LocalStore | null = null;
let localPromise: Promise<LocalStore | null> | null = null;

export function getClient(): CraftClient {
  if (cachedClient) return cachedClient;
  const prefs = getPreferenceValues<Preferences>();
  if (!prefs.craftUrl || !prefs.craftKey) {
    throw new Error(
      "Craft API URL and key are not configured. Set them in Raycast extension preferences.",
    );
  }
  cachedClient = new CraftClient({ url: prefs.craftUrl, key: prefs.craftKey });
  return cachedClient;
}

export async function getLocalStoreAsync(): Promise<LocalStore | null> {
  if (cachedLocal) return cachedLocal;
  if (!localPromise) {
    localPromise = discoverLocalStore().then((store) => {
      cachedLocal = store;
      // if discovery failed, allow retry next time
      if (!store) localPromise = null;
      return store;
    });
  }
  return localPromise;
}
