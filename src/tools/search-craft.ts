import { getClient, getLocalStoreAsync } from "../client";

type Input = {
  /**
   * The search query. Supports SQLite FTS5 syntax when local store is available:
   * - plain text: "weekly review"
   * - phrase: "\"exact phrase\""
   * - boolean: "foo AND bar", "foo OR bar", "foo NOT bar"
   * - prefix: "craft*"
   *
   * When local store is unavailable, falls back to Craft API RE2 regex search.
   */
  query: string;

  /**
   * Maximum number of results to return. Defaults to 20.
   */
  limit?: number;
};

type SearchHit = {
  documentId: string;
  title: string;
  snippet: string;
  lastModifiedAt: string;
  isDailyNote: boolean;
  tags: string[];
};

/**
 * Search across every document in the user's Craft vault.
 *
 * Returns documents matching the query with title, snippet, and metadata.
 * Uses Craft's local SQLite FTS5 index for instant results (<10ms).
 * Falls back to the Craft API when local data is unavailable.
 *
 * Use this tool when the user asks to find notes, look up content, or search
 * for anything in their Craft vault.
 */
export default async function tool({
  query,
  limit = 20,
}: Input): Promise<SearchHit[]> {
  if (!query.trim()) return [];

  const local = await getLocalStoreAsync();
  if (local) {
    const hits = local.search(query, limit * 2);
    const allDocs = local.listDocs();
    const docMap = new Map(allDocs.map((d) => [d.documentId, d]));
    const seen = new Set<string>();
    const results: SearchHit[] = [];

    for (const hit of hits) {
      if (seen.has(hit.documentId)) continue;
      seen.add(hit.documentId);
      const doc = docMap.get(hit.documentId);
      if (!doc) continue;
      results.push({
        documentId: doc.id,
        title: doc.title,
        snippet: hit.content.slice(0, 200).replace(/\n/g, " "),
        lastModifiedAt: doc.modified,
        isDailyNote: doc.isDailyNote,
        tags: doc.tags,
      });
      if (results.length >= limit) break;
    }
    return results;
  }

  // API fallback
  const client = getClient();
  const [searchRes, docsRes] = await Promise.all([
    client.documents.search({ regexps: query }),
    client.documents.list({ fetchMetadata: true }),
  ]);
  const docMap = new Map(docsRes.items.map((d) => [d.id, d]));

  return searchRes.items.slice(0, limit).map((hit) => {
    const doc = docMap.get(hit.documentId);
    return {
      documentId: hit.documentId,
      title: doc?.title ?? "",
      snippet: hit.markdown.slice(0, 200).replace(/\n/g, " "),
      lastModifiedAt: doc?.lastModifiedAt ?? "",
      isDailyNote: !!doc?.dailyNoteDate,
      tags: [],
    };
  });
}
