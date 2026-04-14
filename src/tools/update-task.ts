import { getClient } from "../client";

type Input = {
  /**
   * The task ID (block UUID).
   */
  id: string;

  /**
   * New task state.
   * - "todo": mark as pending
   * - "done": mark as completed
   * - "canceled": mark as canceled
   */
  state?: "todo" | "done" | "canceled";

  /**
   * New task markdown text. Omit to keep the existing text.
   */
  markdown?: string;

  /**
   * New scheduled date. YYYY-MM-DD or "today"/"yesterday"/"tomorrow".
   */
  scheduleDate?: string;

  /**
   * New deadline date. YYYY-MM-DD or "today"/"yesterday"/"tomorrow".
   */
  deadlineDate?: string;
};

type UpdateResult = {
  taskId: string;
  markdown: string;
  state?: string;
};

/**
 * Update an existing task (checkbox block) in Craft.
 *
 * Defaults: fields not provided are left unchanged.
 * Example: { id: "abc-...", state: "done" } marks a task complete.
 * Use this when: user wants to mark tasks done/canceled, reschedule them,
 * or edit task text. Get task IDs from list-tasks.
 * DO NOT use this to: edit a document's body (use update-block or
 * append-to-document), change a document title (Craft API doesn't support it),
 * or set document content (use create-document with content, or
 * append-to-document). This tool only targets existing task blocks.
 */
export default async function tool({
  id,
  state,
  markdown,
  scheduleDate,
  deadlineDate,
}: Input): Promise<UpdateResult> {
  const client = getClient();

  const taskInfo: {
    state?: "todo" | "done" | "canceled";
    scheduleDate?: string;
    deadlineDate?: string;
  } = {};
  if (state) taskInfo.state = state;
  if (scheduleDate) taskInfo.scheduleDate = scheduleDate;
  if (deadlineDate) taskInfo.deadlineDate = deadlineDate;

  const res = await client.tasks.update([
    {
      id,
      ...(markdown !== undefined ? { markdown } : {}),
      ...(Object.keys(taskInfo).length > 0 ? { taskInfo } : {}),
    },
  ]);

  const task = res.items[0];
  return {
    taskId: task?.id ?? id,
    markdown: task?.markdown ?? "",
    state: task?.taskInfo?.state,
  };
}
