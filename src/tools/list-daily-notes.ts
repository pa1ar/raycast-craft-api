import { getClient, getLocalStoreAsync } from "../client";

type Input = {
  /**
   * Maximum number of daily notes to return. Defaults to 14.
   */
  limit?: number;

  /**
   * Only return daily notes on or after this ISO date (YYYY-MM-DD).
   */
  since?: string;
};

type DailyNoteSummary = {
  documentId: string;
  title: string;
  date: string;
  lastModifiedAt: string;
};

// parse Craft's "YYYY.MM.DD" daily note title format
function parseNoteTitle(title: string): string | null {
  const m = title.match(/^(\d{4})\.(\d{2})\.(\d{2})$/);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/**
 * List daily notes from the user's Craft vault.
 *
 * Defaults: limit → 14.
 * Example: { since: "2026-04-01" } returns April daily notes.
 * Use this when: user asks about daily notes, journal entries, or wants a
 * list sorted by calendar date.
 * DO NOT use this to: search note content (use search-craft), read a specific
 * daily note (use get-document with the returned documentId), or append to
 * today's daily note (use append-to-daily).
 */
export default async function tool({
  limit = 14,
  since,
}: Input): Promise<DailyNoteSummary[]> {
  const local = await getLocalStoreAsync();
  if (local) {
    const docs = local.listDocs().filter((d) => d.isDailyNote);
    const withDate = docs
      .map((d) => {
        const date = parseNoteTitle(d.title);
        return date ? { doc: d, date } : null;
      })
      .filter((x): x is { doc: (typeof docs)[0]; date: string } => x !== null);

    let filtered = withDate;
    if (since) {
      filtered = filtered.filter((x) => x.date >= since);
    }
    return filtered
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, limit)
      .map(({ doc, date }) => ({
        documentId: doc.id,
        title: doc.title,
        date,
        lastModifiedAt: doc.modified,
      }));
  }

  // API fallback
  const client = getClient();
  const res = await client.documents.list({
    location: "daily_notes",
    fetchMetadata: true,
    dailyNoteDateGte: since,
  });
  return res.items
    .map((d) => {
      const date =
        d.dailyNoteDate?.slice(0, 10) ?? parseNoteTitle(d.title) ?? "";
      return { doc: d, date };
    })
    .filter((x) => x.date !== "")
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit)
    .map(({ doc, date }) => ({
      documentId: doc.id,
      title: doc.title,
      date,
      lastModifiedAt: doc.lastModifiedAt ?? "",
    }));
}
