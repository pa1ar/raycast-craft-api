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
 * Reads from the local PlainTextSearch JSON file for instant results (~1ms)
 * when Craft is installed locally. Falls back to the Craft API otherwise.
 *
 * If the input is a title (not a UUID), this tool first searches for the
 * document by title, then returns the top match.
 *
 * Use this tool when the user asks to read, show, display, or retrieve the
 * content of a specific document they've already identified.
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
