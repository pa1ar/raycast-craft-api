import { getClient } from "../client";

type Input = {
  /**
   * Array of folder IDs (UUIDs) to delete. Deleting a folder also affects
   * documents inside - check the Craft docs for exact behavior (typically
   * docs move to unsorted).
   */
  folderIds: string[];

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
 * Delete folders by ID. Destructive. Requires confirm: true.
 *
 * Defaults: none. confirm must be explicitly true.
 * Example: { folderIds: ["abc-..."], confirm: true }
 * Use this when: user explicitly asks to delete a folder.
 * DO NOT use this to: delete the unsorted/templates virtual folders (API will
 * reject), or delete documents (use delete-document).
 */
export default async function tool({
  folderIds,
  confirm,
}: Input): Promise<DeleteResult> {
  if (!confirm) {
    throw new Error(
      "delete-folder refused: confirm must be true. Ask the user to confirm before retrying.",
    );
  }
  if (!folderIds || folderIds.length === 0) {
    throw new Error("delete-folder requires at least one folderId");
  }
  const client = getClient();
  const res = await client.folders.delete(folderIds);
  return { ok: true, deletedIds: res.items };
}
