import { getClient, getLocalStoreAsync } from "../client";

type Input = {
  /**
   * Only return documents modified on or after this ISO date (YYYY-MM-DD).
   * Example: "2026-04-01" returns docs modified in April.
   */
  modifiedAfter?: string;

  /**
   * Only return daily notes when true, or non-daily notes when false.
   * Omit to return both.
   */
  isDailyNote?: boolean;

  /**
   * Only return documents that have this tag.
   */
  tag?: string;

  /**
   * Maximum number of documents to return. Defaults to 50.
   */
  limit?: number;
};

type DocSummary = {
  documentId: string;
  title: string;
  lastModifiedAt: string;
  isDailyNote: boolean;
  tags: string[];
};

/**
 * List documents in the user's Craft vault with optional filters.
 *
 * Defaults: limit → 50. No filters → all docs sorted by last modified.
 * Example: { modifiedAfter: "2026-04-01", tag: "wip" } returns recent wip docs.
 * Use this when: user asks to browse, list, or show docs ("recent notes",
 * "what have I modified lately", "docs tagged X").
 * DO NOT use this to: search by full-text content (use search-craft), list
 * only daily notes (use list-daily-notes for date-sorted output), or list
 * tasks (use list-tasks).
 */
export default async function tool({
  modifiedAfter,
  isDailyNote,
  tag,
  limit = 50,
}: Input): Promise<DocSummary[]> {
  const local = await getLocalStoreAsync();
  if (local) {
    let docs = local.listDocs();
    if (modifiedAfter) {
      docs = docs.filter((d) => d.modified >= modifiedAfter);
    }
    if (typeof isDailyNote === "boolean") {
      docs = docs.filter((d) => d.isDailyNote === isDailyNote);
    }
    if (tag) {
      docs = docs.filter((d) => d.tags.includes(tag));
    }
    return docs
      .sort((a, b) => b.modified.localeCompare(a.modified))
      .slice(0, limit)
      .map((d) => ({
        documentId: d.id,
        title: d.title,
        lastModifiedAt: d.modified,
        isDailyNote: d.isDailyNote,
        tags: d.tags,
      }));
  }

  // API fallback
  const client = getClient();
  const res = await client.documents.list({
    fetchMetadata: true,
    lastModifiedDateGte: modifiedAfter,
    location: isDailyNote === true ? "daily_notes" : undefined,
  });

  return res.items
    .slice()
    .sort((a, b) =>
      (b.lastModifiedAt ?? "").localeCompare(a.lastModifiedAt ?? ""),
    )
    .slice(0, limit)
    .map((d) => ({
      documentId: d.id,
      title: d.title,
      lastModifiedAt: d.lastModifiedAt ?? "",
      isDailyNote: !!d.dailyNoteDate,
      tags: [],
    }));
}
