import { getClient } from "../client";

type Input = {
  /**
   * Optional document ID filter. If provided, only collections inside that
   * document are returned. Omit to list all collections across the vault.
   */
  documentId?: string;
};

type Collection = {
  collectionId: string;
  name: string;
  itemCount: number;
  documentId?: string;
};

/**
 * List collections (database-like blocks) in the user's Craft vault.
 *
 * Defaults: documentId omitted → list across all documents.
 * Example: {} lists every collection. { documentId: "..." } scopes to one doc.
 * Use this when: user asks about their databases/collections, or you need a
 * collectionId to pass to get-collection-items / add-collection-item.
 * DO NOT use this to: list folders (use list-folders) or documents (use
 * list-documents).
 */
export default async function tool({
  documentId,
}: Input): Promise<Collection[]> {
  const client = getClient();
  const res = await client.collections.list(documentId);
  return res.items.map(
    (c: {
      id: string;
      name: string;
      itemCount?: number;
      documentId?: string;
    }) => ({
      collectionId: c.id,
      name: c.name,
      itemCount: c.itemCount ?? 0,
      documentId: c.documentId,
    }),
  );
}
