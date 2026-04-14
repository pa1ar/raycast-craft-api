import { getClient } from "../client";
import type { TaskLocation } from "@1ar/craft-cli/lib";

type Input = {
  /**
   * Task text in markdown format.
   * Example: "call the accountant", "review Q2 goals"
   */
  markdown: string;

  /**
   * Where to add the task. Defaults to "inbox".
   * - "inbox": adds to the Craft task inbox (default)
   * - "daily": adds to a daily note (today unless date is specified)
   * - "document": adds to a specific document (requires documentId)
   */
  to?: "inbox" | "daily" | "document";

  /**
   * Document ID, required only when `to` is "document".
   */
  documentId?: string;

  /**
   * Daily note date in YYYY-MM-DD or "today"/"yesterday"/"tomorrow".
   * Only used when `to` is "daily". Defaults to "today".
   */
  date?: string;

  /**
   * Scheduled date for the task (YYYY-MM-DD or "today"/"yesterday"/"tomorrow").
   */
  scheduleDate?: string;

  /**
   * Deadline for the task (YYYY-MM-DD or "today"/"yesterday"/"tomorrow").
   */
  deadlineDate?: string;
};

type AddTaskResult = {
  taskId: string;
  markdown: string;
};

/**
 * Add a task (checkbox item) to the user's Craft vault.
 *
 * Defaults: to → "inbox". date → "today" (only matters when to="daily").
 * Example: { markdown: "call accountant" } adds to inbox.
 * Use this when: user wants to capture a todo, add a task, or create a
 * checkbox item.
 * DO NOT use this to: write the body of a new document (use create-document
 * with content), append general text to a daily note (use append-to-daily),
 * or append text to an existing doc (use append-to-document). A task is a
 * structured checkbox block, not a prose paragraph.
 */
export default async function tool({
  markdown,
  to = "inbox",
  documentId,
  date = "today",
  scheduleDate,
  deadlineDate,
}: Input): Promise<AddTaskResult> {
  const client = getClient();

  let location: TaskLocation;
  if (to === "inbox") {
    location = { type: "inbox" };
  } else if (to === "daily") {
    location = { type: "dailyNote", date };
  } else {
    if (!documentId)
      throw new Error("documentId is required when to is 'document'");
    location = { type: "document", documentId };
  }

  const taskInfo: { scheduleDate?: string; deadlineDate?: string } = {};
  if (scheduleDate) taskInfo.scheduleDate = scheduleDate;
  if (deadlineDate) taskInfo.deadlineDate = deadlineDate;

  const res = await client.tasks.add([
    {
      markdown,
      location,
      ...(Object.keys(taskInfo).length > 0 ? { taskInfo } : {}),
    },
  ]);

  const task = res.items[0];
  return {
    taskId: task?.id ?? "",
    markdown: task?.markdown ?? markdown,
  };
}
