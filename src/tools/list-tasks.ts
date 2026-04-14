import { getClient } from "../client";
import type { TaskScope } from "@1ar/craft-cli/lib";

type Input = {
  /**
   * Task scope:
   * - "inbox": tasks in the Craft task inbox (unsorted)
   * - "active": tasks currently being worked on
   * - "upcoming": tasks scheduled for the future
   * - "logbook": completed/canceled tasks
   * - "document": tasks in a specific document (requires documentId)
   */
  scope: TaskScope;

  /**
   * Document ID, required only when scope is "document".
   */
  documentId?: string;
};

type TaskSummary = {
  taskId: string;
  markdown: string;
  state?: string;
  scheduleDate?: string;
  deadlineDate?: string;
};

/**
 * List tasks from the user's Craft vault by scope.
 *
 * Defaults: none - scope is required.
 * Example: { scope: "active" } returns in-progress tasks.
 * Use this when: user asks about tasks, todos, or what's on their plate.
 * Returns task IDs for update-task / delete-tasks.
 * DO NOT use this to: list documents (use list-documents), list collections
 * (use list-collections), or search content (use search-craft).
 */
export default async function tool({
  scope,
  documentId,
}: Input): Promise<TaskSummary[]> {
  const client = getClient();
  const res = await client.tasks.list(scope, documentId);
  return res.items.map((t) => ({
    taskId: t.id,
    markdown: t.markdown,
    state: t.taskInfo?.state,
    scheduleDate: t.taskInfo?.scheduleDate,
    deadlineDate: t.taskInfo?.deadlineDate,
  }));
}
