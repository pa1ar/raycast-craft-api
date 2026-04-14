import { getClient, getLocalStoreAsync } from "../client";

type Input = {
  /**
   * The document ID (block UUID) to find backlinks for.
   */
  documentId: string;
};

type BacklinkResult = {
  sourceDocumentId: string;
  sourceDocumentTitle: string;
  sourceBlockId: string;
  linkText: string;
};

/**
 * Find backlinks to a Craft document - other docs that reference this one.
 *
 * Defaults: none.
 * Example: { documentId: "b2bb..." } returns sources linking to this doc.
 * Use this when: user asks "what links to X", "where is this referenced", or
 * wants to explore connections backward through the graph.
 * DO NOT use this to: find links going OUT of a doc (use get-outgoing-links),
 * or search content (use search-craft).
 */
export default async function tool({
  documentId,
}: Input): Promise<BacklinkResult[]> {
  const client = getClient();
  const links = await client.links.backlinks(documentId);

  // enrich with source document titles
  const local = await getLocalStoreAsync();
  let titleMap = new Map<string, string>();
  if (local) {
    titleMap = new Map(local.listDocs().map((d) => [d.id, d.title]));
  }

  return links.map((link) => ({
    sourceDocumentId: link.inDocumentId,
    sourceDocumentTitle: titleMap.get(link.inDocumentId) ?? "",
    sourceBlockId: link.inBlockId,
    linkText: link.text,
  }));
}
