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
 * Update an existing task in Craft.
 *
 * Use this to mark tasks as done/canceled, reschedule them, or change their
 * text. Get task IDs from list-tasks.
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
