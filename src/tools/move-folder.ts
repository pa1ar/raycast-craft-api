import { getClient } from "../client";

type Input = {
  /**
   * Array of folder IDs (UUIDs) to move.
   */
  folderIds: string[];

  /**
   * Destination. Either a parent folder UUID, or the sentinel "root" to move
   * to the top level.
   */
  parentFolderId: string;
};

type MoveResult = {
  ok: true;
  movedIds: string[];
};

/**
 * Move folders to a different parent (or to root).
 *
 * Defaults: none.
 * Example: { folderIds: ["abc-..."], parentFolderId: "root" } moves to top level.
 * Use this when: user wants to reorganize the folder tree.
 * DO NOT use this to: move documents (use move-document).
 */
export default async function tool({
  folderIds,
  parentFolderId,
}: Input): Promise<MoveResult> {
  if (!folderIds || folderIds.length === 0) {
    throw new Error("move-folder requires at least one folderId");
  }
  const destination =
    parentFolderId === "root"
      ? ("root" as const)
      : ({ parentFolderId } as const);
  const client = getClient();
  const res = await client.folders.move(folderIds, destination);
  return { ok: true, movedIds: res.items.map((x: { id: string }) => x.id) };
}
