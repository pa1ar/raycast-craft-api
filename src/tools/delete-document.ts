import { getClient } from "../client";

type Input = {
  /**
   * Array of document IDs (UUIDs) to delete.
   */
  documentIds: string[];

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
 * Delete one or more documents by ID. Destructive. Requires confirm: true.
 *
 * Defaults: none. confirm must be explicitly true.
 * Example: { documentIds: ["b2bb..."], confirm: true }
 * Use this when: user explicitly asks to delete / remove / trash a document
 * and you have the document ID.
 * DO NOT use this to: delete a single block/paragraph (use delete-blocks),
 * delete a task (use delete-tasks), or "clear" a doc without confirmation.
 */
export default async function tool({
  documentIds,
  confirm,
}: Input): Promise<DeleteResult> {
  if (!confirm) {
    throw new Error(
      "delete-document refused: confirm must be true. Ask the user to confirm deletion before retrying.",
    );
  }
  if (!documentIds || documentIds.length === 0) {
    throw new Error("delete-document requires at least one documentId");
  }
  const client = getClient();
  const res = await client.documents.delete(documentIds);
  return { ok: true, deletedIds: res.items };
}
