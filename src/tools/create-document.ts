import { getClient, getLocalStoreAsync } from "../client";

type Input = {
  /**
   * Title of the new document.
   */
  title: string;

  /**
   * Optional folder ID to create the document in. Get folder IDs from list-folders.
   * If omitted, the document is created in the unsorted location.
   */
  folderId?: string;
};

type CreateResult = {
  documentId: string;
  title: string;
  deeplink: string;
};

/**
 * Create a new document in the user's Craft vault.
 *
 * Returns the new document's ID and a deeplink to open it in Craft.
 * Use this when the user wants to start a new note, create a page, or add a document.
 */
export default async function tool({
  title,
  folderId,
}: Input): Promise<CreateResult> {
  const client = getClient();
  const destination = folderId ? { folderId } : undefined;
  const res = await client.documents.create([{ title }], destination);
  const doc = res.items[0];
  if (!doc) throw new Error("no document returned");

  const local = await getLocalStoreAsync();
  const deeplink =
    local?.deeplink(doc.id) ??
    doc.clickableLink ??
    (await client.deeplink(doc.id));

  return {
    documentId: doc.id,
    title: doc.title,
    deeplink,
  };
}
