import { getClient, getLocalStoreAsync } from "../client";

type Input = {
  /**
   * Title of the new document. Required.
   */
  title: string;

  /**
   * Optional markdown body. Inserted as blocks after the page title.
   * Multi-line markdown is auto-split into blocks by the API.
   * Example: "first paragraph\n\n- bullet one\n- bullet two"
   */
  content?: string;

  /**
   * Optional folder ID to create the document in. Get folder IDs from list-folders.
   * Pass the real UUID of a folder, or one of the sentinel values "unsorted" /
   * "templates" to create in those virtual locations. If omitted, the document
   * is created in the unsorted location (inbox) - this is the right default for
   * most quick-capture requests, no folder lookup needed.
   */
  folderId?: string;
};

type CreateResult = {
  documentId: string;
  title: string;
  deeplink: string;
  contentBlockIds?: string[];
  contentError?: string;
};

/**
 * Create a new document in the user's Craft vault.
 *
 * Defaults: folderId omitted → unsorted (inbox). content omitted → empty body.
 * Example: { title: "hi", content: "there" } creates a doc titled "hi" with
 * body "there" in unsorted. No folder lookup required.
 * Use this when: user wants to start a new note, create a page, or add a
 * document - optionally with body text.
 * DO NOT use this to: edit an existing document (use append-to-document or
 * update-block), add a task (use add-task), or append to the daily note
 * (use append-to-daily).
 */
export default async function tool({
  title,
  content,
  folderId,
}: Input): Promise<CreateResult> {
  const client = getClient();
  const destination:
    | { folderId: string }
    | { destination: "unsorted" | "templates" }
    | undefined =
    folderId === "unsorted" || folderId === "templates"
      ? { destination: folderId as "unsorted" | "templates" }
      : folderId
        ? { folderId }
        : undefined;
  const res = await client.documents.create([{ title }], destination);
  const doc = res.items[0];
  if (!doc) throw new Error("no document returned");

  let contentBlockIds: string[] | undefined;
  let contentError: string | undefined;
  if (content && content.trim().length > 0) {
    try {
      const appended = await client.blocks.append(content, { pageId: doc.id });
      contentBlockIds = appended.items.map((b: { id: string }) => b.id);
    } catch (e) {
      // doc was created successfully; body append failed. return the doc with
      // an error note so the caller doesn't retry and create a duplicate.
      contentError = (e as Error).message;
    }
  }

  const local = await getLocalStoreAsync();
  const deeplink =
    local?.deeplink(doc.id) ??
    doc.clickableLink ??
    (await client.deeplink(doc.id));

  return {
    documentId: doc.id,
    title: doc.title,
    deeplink,
    ...(contentBlockIds ? { contentBlockIds } : {}),
    ...(contentError ? { contentError } : {}),
  };
}
