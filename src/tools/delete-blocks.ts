import { getClient } from "../client";

type Input = {
  /**
   * Array of block IDs (UUIDs) to delete. Deleting a parent block removes its
   * children too.
   */
  blockIds: string[];

  /**
   * Must be set to true to confirm the destructive action. Safety guard.
   */
  confirm: boolean;
};

type DeleteResult = {
  ok: true;
  deletedIds: string[];
};

/**
 * Delete blocks by ID. Destructive, for AI. Requires confirm: true.
 *
 * Defaults: none. confirm must be explicitly true.
 * Example: { blockIds: ["b2bb..."], confirm: true }
 * Use this when: user explicitly asks to delete a line/block/paragraph and you
 * have the block IDs (from search-in-document or get-document).
 * DO NOT use this to: delete a whole document (use delete-document), delete a
 * task (use delete-tasks), or "clear" content without user confirmation.
 */
export default async function tool({
  blockIds,
  confirm,
}: Input): Promise<DeleteResult> {
  if (!confirm) {
    throw new Error(
      "delete-blocks refused: confirm must be true. Ask the user to confirm deletion before retrying.",
    );
  }
  if (!blockIds || blockIds.length === 0) {
    throw new Error("delete-blocks requires at least one blockId");
  }
  const client = getClient();
  const res = await client.blocks.delete(blockIds);
  return { ok: true, deletedIds: res.items.map((b: { id: string }) => b.id) };
}
