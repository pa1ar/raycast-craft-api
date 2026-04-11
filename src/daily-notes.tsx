// Daily Notes - pinned Today/Yesterday/Tomorrow + past 7 days
// Enter = preview; Shift+Enter = open in Craft
// Today is always shown - if not present, created via API on mount
import { useState } from "react";
import { List, ActionPanel, Action, Icon, Color, open } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getClient, getLocalStoreAsync } from "./client";
import { toDocument } from "./local-store";
import { DocPreview } from "./components/doc-preview";
import type { Document, Block } from "@1ar/craft-cli/lib";

const PAST_LIMIT = 7;

function parseNoteTitle(title: string): Date | null {
  const m = title.match(/^(\d{4})\.(\d{2})\.(\d{2})$/);
  if (!m) return null;
  const [, y, mo, d] = m;
  return new Date(Number(y), Number(mo) - 1, Number(d));
}

// best-effort ISO date for a daily note: explicit dailyNoteDate > parsed title
function dailyNoteIso(doc: Document): string | null {
  if (doc.dailyNoteDate) return doc.dailyNoteDate.slice(0, 10);
  const parsed = parseNoteTitle(doc.title);
  return parsed ? toIsoDate(parsed) : null;
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isoTitle(doc: Document): string {
  // prefer explicit dailyNoteDate, fall back to parsing title
  const iso = dailyNoteIso(doc);
  return iso ?? doc.title;
}

function weekdayTag(doc: Document): string {
  const iso = dailyNoteIso(doc);
  if (!iso) return "";
  const date = new Date(iso + "T00:00:00");
  return date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
}

type Kind = "today" | "yesterday" | "tomorrow" | "past";

interface Data {
  today: Document | null;
  yesterday: Document | null;
  tomorrow: Document | null;
  past: Document[];
}

export default function Command() {
  const client = getClient();
  const [showDetail, setShowDetail] = useState(false);

  const { data, isLoading } = useCachedPromise(async (): Promise<Data> => {
    const local = await getLocalStoreAsync();

    // collect all daily note docs
    let docs: Document[] = [];
    if (local) {
      // listDailyNotes reads in mtime order, fetch extras so we can re-sort by title
      const raw = local.listDailyNotes(40).map(toDocument);
      // dedupe by title (shared spaces can produce dupes)
      const seen = new Set<string>();
      docs = raw.filter((d) => {
        if (seen.has(d.title)) return false;
        seen.add(d.title);
        return true;
      });
    } else {
      const res = await client.documents.list({
        location: "daily_notes",
        fetchMetadata: true,
      });
      docs = res.items;
    }

    // index by YYYY-MM-DD. prefer explicit dailyNoteDate when available,
    // fall back to parsing title (handles custom/localized titles)
    const byDate = new Map<string, Document>();
    for (const doc of docs) {
      const iso = dailyNoteIso(doc);
      if (iso) byDate.set(iso, doc);
    }

    // compute today/yesterday/tomorrow iso
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const yesterdayDate = new Date(todayDate);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const tomorrowDate = new Date(todayDate);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);

    const todayIso = toIsoDate(todayDate);
    const yesterdayIso = toIsoDate(yesterdayDate);
    const tomorrowIso = toIsoDate(tomorrowDate);

    let today = byDate.get(todayIso) ?? null;
    const yesterday = byDate.get(yesterdayIso) ?? null;
    const tomorrow = byDate.get(tomorrowIso) ?? null;

    // today must exist - create via API if missing (getDaily is idempotent)
    if (!today) {
      try {
        const root = (await client.blocks.getDaily("today", {
          maxDepth: 0,
        })) as Block;
        today = {
          id: root.id,
          title: `${todayDate.getFullYear()}.${String(todayDate.getMonth() + 1).padStart(2, "0")}.${String(todayDate.getDate()).padStart(2, "0")}`,
        };
      } catch {
        // API failed - show placeholder that will error on action
        today = null;
      }
    }

    // past 7 days: docs older than yesterday, excluding yesterday/today/tomorrow slots
    const excluded = new Set([todayIso, yesterdayIso, tomorrowIso]);
    const past = docs
      .filter((d) => {
        const iso = dailyNoteIso(d);
        if (!iso) return false;
        if (excluded.has(iso)) return false;
        return iso < todayIso; // strictly before today
      })
      .sort((a, b) => {
        const ai = dailyNoteIso(a) ?? "";
        const bi = dailyNoteIso(b) ?? "";
        return bi.localeCompare(ai);
      })
      .slice(0, PAST_LIMIT);

    return { today, yesterday, tomorrow, past };
  }, []);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail}
      searchBarPlaceholder="Filter daily notes"
    >
      <List.Section title="Pinned">
        {data?.today && (
          <NoteItem
            doc={data.today}
            kind="today"
            client={client}
            onToggleDetail={() => setShowDetail((v) => !v)}
          />
        )}
        {data?.yesterday && (
          <NoteItem
            doc={data.yesterday}
            kind="yesterday"
            client={client}
            onToggleDetail={() => setShowDetail((v) => !v)}
          />
        )}
        {data?.tomorrow && (
          <NoteItem
            doc={data.tomorrow}
            kind="tomorrow"
            client={client}
            onToggleDetail={() => setShowDetail((v) => !v)}
          />
        )}
      </List.Section>
      <List.Section title="Previous">
        {data?.past.map((doc) => (
          <NoteItem
            key={doc.id}
            doc={doc}
            kind="past"
            client={client}
            onToggleDetail={() => setShowDetail((v) => !v)}
          />
        ))}
      </List.Section>
    </List>
  );
}

function NoteItem({
  doc,
  kind,
  client,
  onToggleDetail,
}: {
  doc: Document;
  kind: Kind;
  client: ReturnType<typeof getClient>;
  onToggleDetail: () => void;
}) {
  const accessories: List.Item.Accessory[] = [];
  if (kind === "today") {
    accessories.push({ tag: { value: "Today", color: Color.Yellow } });
  } else if (kind === "yesterday") {
    accessories.push({ tag: { value: "Yesterday", color: Color.Blue } });
  } else if (kind === "tomorrow") {
    accessories.push({ tag: { value: "Tomorrow", color: Color.Green } });
  }

  const icon =
    kind === "today"
      ? { source: Icon.Calendar, tintColor: Color.Yellow }
      : Icon.Calendar;

  return (
    <List.Item
      title={isoTitle(doc)}
      subtitle={weekdayTag(doc)}
      icon={icon}
      accessories={accessories}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Title" text={doc.title} />
              <List.Item.Detail.Metadata.Label
                title="Document ID"
                text={doc.id}
              />
              {doc.lastModifiedAt && (
                <List.Item.Detail.Metadata.Label
                  title="Modified"
                  text={doc.lastModifiedAt.slice(0, 10)}
                />
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.Push
            title="Preview"
            icon={Icon.Eye}
            target={<DocPreview doc={doc} client={client} />}
          />
          <Action
            title="Open in Craft"
            icon={Icon.AppWindow}
            shortcut={{ modifiers: ["shift"], key: "return" }}
            onAction={async () => {
              const local = await getLocalStoreAsync();
              const link =
                local?.deeplink(doc.id) ??
                doc.clickableLink ??
                (await client.deeplink(doc.id));
              await open(link);
            }}
          />
          <Action
            title="Toggle Details"
            icon={Icon.Sidebar}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
            onAction={onToggleDetail}
          />
        </ActionPanel>
      }
    />
  );
}
