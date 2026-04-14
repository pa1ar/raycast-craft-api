import { getClient } from "../client";

type Input = {
  /**
   * The block ID (UUID) to update. Get block IDs from search-in-document,
   * get-document output, or get-outgoing-links.
   */
  blockId: string;

  /**
   * New markdown content for the block. Replaces the current text.
   * Children blocks (nested content) are preserved.
   */
  markdown: string;
};

type UpdateResult = {
  ok: true;
  blockId: string;
  markdown: string;
};

/**
 * Update a single block's markdown content in place. Advanced, for AI.
 *
 * Defaults: none - both blockId and markdown required.
 * Example: { blockId: "b2bb36ae-...", markdown: "updated text" }
 * Use this when: user wants to edit a specific line/block, fix a typo in an
 * existing block, or replace block text. Use search-in-document first to find
 * the block ID.
 * DO NOT use this to: edit a task (use update-task), append new content (use
 * append-to-document or insert-blocks), delete content (use delete-blocks),
 * or change a document's title (Craft API doesn't support title edits).
 */
export default async function tool({
  blockId,
  markdown,
}: Input): Promise<UpdateResult> {
  const client = getClient();
  await client.blocks.update([{ id: blockId, markdown }]);
  return { ok: true, blockId, markdown };
}
