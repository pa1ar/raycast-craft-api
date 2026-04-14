import { getClient } from "../client";

type Input = {
  /**
   * Document or block ID (UUID) to extract outgoing links from.
   */
  blockId: string;
};

type Link = {
  targetBlockId: string;
  text: string;
  inBlockId: string;
  inDocumentId: string;
};

/**
 * Extract all outgoing [text](block://UUID) links from a document.
 *
 * Defaults: none.
 * Example: { blockId: "b2bb..." } returns all block-reference links inside.
 * Use this when: user wants to see what a doc references, or you need to
 * traverse the Craft graph forward. Pair with get-backlinks for the reverse.
 */
export default async function tool({ blockId }: Input): Promise<Link[]> {
  const client = getClient();
  const links = await client.links.outgoing(blockId);
  return links.map(
    (l: {
      blockId: string;
      text: string;
      inBlockId: string;
      inDocumentId: string;
    }) => ({
      targetBlockId: l.blockId,
      text: l.text,
      inBlockId: l.inBlockId,
      inDocumentId: l.inDocumentId,
    }),
  );
}
