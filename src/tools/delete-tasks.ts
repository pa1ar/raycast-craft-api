import { getClient } from "../client";

type Input = {
  /**
   * Array of task IDs (UUIDs) to delete. Get task IDs from list-tasks.
   */
  taskIds: string[];

  /**
   * Must be set to true to confirm the destructive action. Safety guard.
   */
  confirm: boolean;
};

type DeleteResult = {
  ok: true;
  deletedIds: string[];
};

/**
 * Delete tasks by ID. Destructive. Requires confirm: true.
 *
 * Defaults: none. confirm must be explicitly true.
 * Example: { taskIds: ["abc-..."], confirm: true }
 * Use this when: user explicitly asks to delete / remove a task.
 * DO NOT use this to: mark a task as done/canceled (use update-task with
 * state: "done" or "canceled"), or delete a non-task block (use delete-blocks).
 */
export default async function tool({
  taskIds,
  confirm,
}: Input): Promise<DeleteResult> {
  if (!confirm) {
    throw new Error(
      "delete-tasks refused: confirm must be true. Ask the user to confirm before retrying.",
    );
  }
  if (!taskIds || taskIds.length === 0) {
    throw new Error("delete-tasks requires at least one taskId");
  }
  const client = getClient();
  const res = await client.tasks.delete(taskIds);
  return { ok: true, deletedIds: res.items.map((x: { id: string }) => x.id) };
}
