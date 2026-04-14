import { getClient, getLocalStoreAsync } from "../client";

type Input = {
  /**
   * Document identifier. Can be either:
   * - a block/document UUID (e.g. "AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE")
   * - a document title (will be resolved via search)
   *
   * Prefer UUIDs when possible - they're returned by search-craft and list-documents tools.
   */
  id: string;
};

type DocumentResult = {
  documentId: string;
  title: string;
  markdown: string;
  lastModifiedAt: string;
  isDailyNote: boolean;
  tags: string[];
};

/**
 * Fetch the full markdown content of a Craft document.
 *
 * Defaults: none - id is required. UUID or title accepted (title resolves
 * via local title match, then fuzzy).
 * Example: { id: "b2bb-..." } or { id: "Weekly Review" }.
 * Use this when: user asks to read / show / display the content of a doc.
 * DO NOT use this to: list docs (use list-documents), search full-text
 * (use search-craft), or find links within a doc (use get-outgoing-links).
 */
export default async function tool({
  id,
}: Input): Promise<DocumentResult | null> {
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const client = getClient();
  let resolvedId = id;

  // resolve by title if not a UUID
  if (!UUID_RE.test(id)) {
    const local = await getLocalStoreAsync();
    if (local) {
      const docs = local.listDocs();
      const match = docs.find(
        (d) => d.title.toLowerCase() === id.toLowerCase(),
      );
      if (match) {
        resolvedId = match.id;
      } else {
        // fuzzy: first doc whose title includes the query
        const partial = docs.find((d) =>
          d.title.toLowerCase().includes(id.toLowerCase()),
        );
        if (partial) resolvedId = partial.id;
        else return null;
      }
    } else {
      const res = await client.documents.search({ regexps: id });
      if (res.items.length === 0) return null;
      resolvedId = res.items[0].documentId;
    }
  }

  const local = await getLocalStoreAsync();
  if (local) {
    const content = local.getDocContent(resolvedId);
    if (content) {
      const docs = local.listDocs();
      const doc = docs.find((d) => d.id === resolvedId);
      return {
        documentId: resolvedId,
        title: doc?.title ?? "",
        markdown: content,
        lastModifiedAt: doc?.modified ?? "",
        isDailyNote: doc?.isDailyNote ?? false,
        tags: doc?.tags ?? [],
      };
    }
  }

  // API fallback
  const markdown = (await client.blocks.get(resolvedId, {
    format: "markdown",
  })) as string;
  return {
    documentId: resolvedId,
    title: "",
    markdown,
    lastModifiedAt: "",
    isDailyNote: false,
    tags: [],
  };
}
