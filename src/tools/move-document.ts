import { getClient } from "../client";

type Input = {
  /**
   * Array of document IDs (UUIDs) to move.
   */
  documentIds: string[];

  /**
   * Destination. Either a folder UUID, or one of the sentinel values
   * "unsorted" / "templates" to move to those virtual locations.
   */
  folderId: string;
};

type MoveResult = {
  ok: true;
  movedIds: string[];
};

/**
 * Move documents to a different folder (or to unsorted/templates).
 *
 * Defaults: none.
 * Example: { documentIds: ["b2bb..."], folderId: "unsorted" } moves to inbox.
 * Use this when: user wants to reorganize docs, move a note into a folder,
 * or send something back to unsorted.
 * DO NOT use this to: move folders themselves (use move-folder), rename a
 * doc (Craft API doesn't support title edits).
 */
export default async function tool({
  documentIds,
  folderId,
}: Input): Promise<MoveResult> {
  if (!documentIds || documentIds.length === 0) {
    throw new Error("move-document requires at least one documentId");
  }
  const destination =
    folderId === "unsorted" || folderId === "templates"
      ? { destination: folderId as "unsorted" | "templates" }
      : { folderId };
  const client = getClient();
  const res = await client.documents.move(documentIds, destination);
  return { ok: true, movedIds: res.items.map((x: { id: string }) => x.id) };
}
