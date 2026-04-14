import { getClient } from "../client";

type Input = {
  /**
   * Collection ID (UUID) containing the items.
   */
  collectionId: string;

  /**
   * Array of item IDs (UUIDs) to delete.
   */
  itemIds: string[];

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
 * Delete items from a Craft collection. Destructive. Requires confirm: true.
 *
 * Defaults: none. confirm must be explicitly true.
 * Example: { collectionId: "abc-...", itemIds: ["xyz-..."], confirm: true }
 * Use this when: user explicitly asks to remove / delete rows from a collection.
 * DO NOT use this to: delete a collection (not supported), delete a document
 * (use delete-document), or delete blocks (use delete-blocks).
 */
export default async function tool({
  collectionId,
  itemIds,
  confirm,
}: Input): Promise<DeleteResult> {
  if (!confirm) {
    throw new Error(
      "delete-collection-items refused: confirm must be true. Ask the user to confirm before retrying.",
    );
  }
  if (!itemIds || itemIds.length === 0) {
    throw new Error("delete-collection-items requires at least one itemId");
  }
  const client = getClient();
  const res = await client.collections.deleteItems(collectionId, itemIds);
  return { ok: true, deletedIds: res.items.map((x: { id: string }) => x.id) };
}
