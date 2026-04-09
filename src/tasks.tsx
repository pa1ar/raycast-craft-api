// Craft Tasks - browse and manage tasks by scope
import { useState } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  open,
  Clipboard,
  showToast,
  Toast,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getClient } from "./client";
import type { Task, TaskScope, TaskState } from "@1ar/craft-cli/lib";

const SCOPES: { value: TaskScope; title: string }[] = [
  { value: "inbox", title: "Inbox" },
  { value: "active", title: "Active" },
  { value: "upcoming", title: "Upcoming" },
  { value: "logbook", title: "Logbook" },
];

function taskIcon(state?: TaskState) {
  switch (state) {
    case "done":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "canceled":
      return { source: Icon.XMarkCircle, tintColor: Color.SecondaryText };
    default:
      return { source: Icon.Circle, tintColor: Color.Blue };
  }
}

function stripCheckbox(md: string): string {
  return md.replace(/^-\s*\[[ xX-]\]\s*/, "").trim();
}

export default function Command() {
  const client = getClient();
  const [scope, setScope] = useState<TaskScope>("inbox");

  const { data, isLoading, revalidate } = useCachedPromise(
    async (s: TaskScope) => {
      const res = await client.tasks.list(s);
      return res.items;
    },
    [scope],
  );

  async function markState(task: Task, state: TaskState) {
    try {
      await client.tasks.update([{ id: task.id, taskInfo: { state } }]);
      await showToast({ style: Toast.Style.Success, title: `Marked ${state}` });
      revalidate();
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Update failed",
        message: (e as Error).message,
      });
    }
  }

  async function deleteTask(task: Task) {
    const confirmed = await confirmAlert({
      title: "Delete Task?",
      message: stripCheckbox(task.markdown),
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      await client.tasks.delete([task.id]);
      await showToast({ style: Toast.Style.Success, title: "Deleted" });
      revalidate();
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Delete failed",
        message: (e as Error).message,
      });
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter tasks"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Scope"
          onChange={(v) => setScope(v as TaskScope)}
        >
          {SCOPES.map((s) => (
            <List.Dropdown.Item key={s.value} title={s.title} value={s.value} />
          ))}
        </List.Dropdown>
      }
    >
      {data?.map((task) => {
        const title = stripCheckbox(task.markdown);
        const accessories: List.Item.Accessory[] = [];
        if (task.taskInfo?.scheduleDate) {
          accessories.push({
            text: task.taskInfo.scheduleDate,
            icon: Icon.Calendar,
          });
        }
        if (task.taskInfo?.deadlineDate) {
          accessories.push({
            text: task.taskInfo.deadlineDate,
            icon: Icon.Alarm,
          });
        }

        return (
          <List.Item
            key={task.id}
            title={title}
            icon={taskIcon(task.taskInfo?.state)}
            accessories={accessories}
            actions={
              <ActionPanel>
                <Action
                  title="Open in Craft"
                  icon={Icon.AppWindow}
                  onAction={async () => {
                    const link = await client.deeplink(task.id);
                    await open(link);
                  }}
                />
                {task.taskInfo?.state !== "done" && (
                  <Action
                    title="Mark Done"
                    icon={Icon.CheckCircle}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={() => markState(task, "done")}
                  />
                )}
                {task.taskInfo?.state !== "canceled" && (
                  <Action
                    title="Mark Canceled"
                    icon={Icon.XMarkCircle}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                    onAction={() => markState(task, "canceled")}
                  />
                )}
                {task.taskInfo?.state !== "todo" && (
                  <Action
                    title="Reopen"
                    icon={Icon.ArrowCounterClockwise}
                    onAction={() => markState(task, "todo")}
                  />
                )}
                <Action
                  title="Delete"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => deleteTask(task)}
                />
                <Action
                  title="Copy Task Text"
                  icon={Icon.CopyClipboard}
                  onAction={() => Clipboard.copy(title)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
