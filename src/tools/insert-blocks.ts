import { getClient } from "../client";

type Input = {
  /**
   * Markdown content to insert. Multi-line markdown is auto-split into blocks.
   */
  markdown: string;

  /**
   * Position within the target. One of: "start", "end".
   * Defaults to "end".
   */
  position?: "start" | "end";

  /**
   * Target document/page ID (UUID). Use this for any doc. Mutually exclusive
   * with `date`.
   */
  pageId?: string;

  /**
   * Target daily note date. YYYY-MM-DD or "today"/"yesterday"/"tomorrow".
   * Mutually exclusive with `pageId`.
   */
  date?: string;
};

type InsertResult = {
  ok: true;
  blockIds: string[];
};

/**
 * Insert markdown blocks at the start or end of a page / daily note. Advanced, for AI.
 *
 * Defaults: position → "end". Either pageId OR date must be provided.
 * Example: { markdown: "new item", position: "start", pageId: "b2bb..." }
 * Use this when: user wants to prepend content to a doc, or needs explicit
 * start/end positioning (append-to-document always appends to end).
 * DO NOT use this to: insert between specific blocks (the move API is required,
 * not supported by this tool), update an existing block (use update-block),
 * or add a task (use add-task).
 */
export default async function tool({
  markdown,
  position = "end",
  pageId,
  date,
}: Input): Promise<InsertResult> {
  if (!pageId && !date) {
    throw new Error("insert-blocks requires either pageId or date");
  }
  if (pageId && date) {
    throw new Error("insert-blocks: pass only one of pageId or date, not both");
  }
  const client = getClient();
  const pos = pageId
    ? ({ position, pageId } as const)
    : ({ position, date: date! } as const);
  const res = await client.blocks.insertMarkdown(markdown, pos);
  return { ok: true, blockIds: res.items.map((b: { id: string }) => b.id) };
}
