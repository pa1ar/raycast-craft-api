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
 * Find backlinks to a Craft document - other documents that reference this one.
 *
 * Uses a title-based search (fast, covers most cases). Enriches results with
 * source document titles from local data when available.
 *
 * Use this when the user asks "what links to X", "where is this referenced",
 * or wants to find the connections around a specific note.
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
