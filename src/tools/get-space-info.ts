import { getClient, getLocalStoreAsync } from "../client";

type SpaceInfo = {
  api: {
    ok: boolean;
    latencyMs: number;
    space?: {
      id: string;
      name: string;
      timezone: string;
      time: string;
    };
    error?: string;
  };
  localStore: {
    ok: boolean;
    spaceId?: string;
    documentCount?: number;
    error?: string;
  };
};

/**
 * Get diagnostic information about the connected Craft space.
 *
 * Returns API connection status, local store availability, space name, ID,
 * timezone, and document count. Use this when the user asks about their
 * Craft setup, wants to know if the connection is working, or needs the
 * space ID.
 */
export default async function tool(): Promise<SpaceInfo> {
  const result: SpaceInfo = {
    api: { ok: false, latencyMs: 0 },
    localStore: { ok: false },
  };

  // API probe
  const t0 = Date.now();
  try {
    const client = getClient();
    const info = await client.connection();
    result.api = {
      ok: true,
      latencyMs: Date.now() - t0,
      space: {
        id: info.space.id,
        name: info.space.name,
        timezone: info.space.timezone,
        time: info.space.time,
      },
    };
  } catch (e) {
    result.api = {
      ok: false,
      latencyMs: Date.now() - t0,
      error: (e as Error).message,
    };
  }

  // local store probe
  try {
    const local = await getLocalStoreAsync();
    if (local) {
      const docs = local.listDocs();
      result.localStore = {
        ok: true,
        spaceId: local.spaceId ?? undefined,
        documentCount: docs.length,
      };
    } else {
      result.localStore = {
        ok: false,
        error: "Craft app not installed or local data not accessible",
      };
    }
  } catch (e) {
    result.localStore = {
      ok: false,
      error: (e as Error).message,
    };
  }

  return result;
}
