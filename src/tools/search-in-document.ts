import { getClient } from "../client";

type Input = {
  /**
   * Document or block ID (UUID) to search within.
   */
  blockId: string;

  /**
   * Regex pattern to match against block markdown.
   */
  pattern: string;

  /**
   * Case sensitive? Default: false.
   */
  caseSensitive?: boolean;

  /**
   * Number of context blocks to include before each hit. Default: 0.
   */
  beforeBlockCount?: number;

  /**
   * Number of context blocks to include after each hit. Default: 0.
   */
  afterBlockCount?: number;
};

type Hit = {
  blockId: string;
  markdown: string;
  pageBlockPath?: { id: string; content: string }[];
  beforeBlocks?: { blockId: string; markdown: string }[];
  afterBlocks?: { blockId: string; markdown: string }[];
};

/**
 * Search inside a single Craft document by regex pattern.
 *
 * Defaults: caseSensitive → false. beforeBlockCount → 0. afterBlockCount → 0.
 * Example: { blockId: "b2bb...", pattern: "\\btodo\\b" }
 * Use this when: user asks to find text inside a specific doc, or you need a
 * specific block ID (for update-block / delete-blocks) and know which document.
 * DO NOT use this to: search across the entire vault (use search-craft).
 */
export default async function tool({
  blockId,
  pattern,
  caseSensitive,
  beforeBlockCount,
  afterBlockCount,
}: Input): Promise<Hit[]> {
  const client = getClient();
  const res = await client.blocks.search({
    blockId,
    pattern,
    caseSensitive,
    beforeBlockCount,
    afterBlockCount,
    fetchBlocks: true,
  });
  return res.items.map(
    (h: {
      blockId: string;
      markdown: string;
      pageBlockPath?: { id: string; content: string }[];
      beforeBlocks?: { blockId: string; markdown: string }[];
      afterBlocks?: { blockId: string; markdown: string }[];
    }) => ({
      blockId: h.blockId,
      markdown: h.markdown,
      pageBlockPath: h.pageBlockPath,
      beforeBlocks: h.beforeBlocks,
      afterBlocks: h.afterBlocks,
    }),
  );
}
