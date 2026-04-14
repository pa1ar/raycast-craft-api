import { getClient } from "../client";

type Input = {
  /**
   * Markdown content to append to the daily note.
   * Can include multiple lines, block-level formatting, and links.
   */
  markdown: string;

  /**
   * Daily note date. Accepts YYYY-MM-DD or "today"/"yesterday"/"tomorrow".
   * Defaults to "today".
   */
  date?: string;
};

type AppendResult = {
  ok: true;
  date: string;
  blockIds: string[];
};

/**
 * Append markdown content to the end of a daily note in Craft.
 *
 * Defaults: date → "today".
 * Example: { markdown: "quick thought" } appends to today's daily note.
 * Use this when: user wants to add a thought / observation / log entry to
 * their daily note or journal.
 * DO NOT use this to: append to a non-daily document (use append-to-document),
 * add a task (use add-task), or create a new doc (use create-document).
 */
export default async function tool({
  markdown,
  date = "today",
}: Input): Promise<AppendResult> {
  const client = getClient();
  const res = await client.blocks.append(markdown, { date });
  return {
    ok: true,
    date,
    blockIds: res.items.map((b: { id: string }) => b.id),
  };
}
