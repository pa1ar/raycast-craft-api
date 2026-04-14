import { getClient } from "../client";

type Input = {
  /**
   * ID of the document (page block UUID) to append to.
   * Get document IDs from search-craft, list-documents, or create-document.
   */
  documentId: string;

  /**
   * Markdown content to append at the end of the document.
   * Can include multi-line text, lists, and block-level formatting.
   */
  markdown: string;
};

type AppendResult = {
  ok: true;
  documentId: string;
  blockIds: string[];
};

/**
 * Append markdown content to the end of an existing document.
 *
 * Defaults: none - both documentId and markdown are required.
 * Example: { documentId: "b2bb36ae-...", markdown: "new paragraph" }
 * Use this when: user wants to add content to an existing note, extend a doc,
 * or log something to a specific document.
 * DO NOT use this to: append to the daily note (use append-to-daily), edit
 * an existing block in place (use update-block), or create a new document
 * (use create-document with content).
 */
export default async function tool({
  documentId,
  markdown,
}: Input): Promise<AppendResult> {
  const client = getClient();
  const res = await client.blocks.append(markdown, { pageId: documentId });
  return {
    ok: true,
    documentId,
    blockIds: res.items.map((b: { id: string }) => b.id),
  };
}
