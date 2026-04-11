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
 * Append markdown content to a daily note in Craft.
 *
 * Use this when the user wants to add a thought, observation, or note to
 * their daily log/journal. The content is appended at the end of the daily
 * note.
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
