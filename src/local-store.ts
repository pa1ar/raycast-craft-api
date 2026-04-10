// local-store.ts - read from Craft's local SQLite FTS5 + PlainTextSearch JSON
// uses sql.js WASM (no native modules - works in Raycast's bundled environment)

import { environment } from "@raycast/api";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, basename } from "node:path";
import { homedir } from "node:os";
import type { Document } from "@1ar/craft-cli/lib";

// nsdate epoch: 2001-01-01 00:00:00 UTC
const NSDATE_EPOCH = 978307200;

function nsdateToIso(nsdate: number): string {
  const ms = (nsdate + NSDATE_EPOCH) * 1000;
  return new Date(ms).toISOString();
}

// craft app container IDs
const CONTAINER_IDS = ["com.lukilabs.lukiapp", "com.lukilabs.lukiapp-setapp"];

function containerBase(containerId: string): string {
  return join(
    homedir(),
    "Library/Containers",
    containerId,
    "Data/Library/Application Support",
    containerId,
  );
}

export interface LocalDoc {
  id: string; // block/entity ID (API-compatible)
  documentId: string; // internal ID (PTS filename, SQLite documentId)
  title: string;
  markdownContent: string;
  isDailyNote: boolean;
  tags: string[];
  modified: string; // ISO date
  contentHash: string;
}

export interface LocalSearchResult {
  id: string;
  content: string;
  documentId: string;
  isTodo: boolean;
}

// sql.js database handle (loaded async from WASM)
type SqlJsDatabase = {
  exec: (
    sql: string,
    params?: unknown[],
  ) => { columns: string[]; values: unknown[][] }[];
  close: () => void;
};

export class LocalStore {
  private db: SqlJsDatabase;
  private ptsDir: string | null;
  readonly spaceId: string | null;

  constructor(db: SqlJsDatabase, ptsDir: string | null, spaceId?: string) {
    this.db = db;
    this.ptsDir = ptsDir;
    this.spaceId = spaceId ?? null;
  }

  // build a craftdocs:// deeplink for a block ID
  deeplink(blockId: string): string | null {
    if (!this.spaceId) return null;
    return `craftdocs://open?blockId=${blockId}&spaceId=${this.spaceId}`;
  }

  // find daily note block ID for a given date
  findDailyNote(dateStr: string): string | null {
    // resolve relative dates
    const date = resolveDate(dateStr);
    if (!this.ptsDir) return null;

    // scan PTS files for matching daily note
    try {
      const files = readdirSync(this.ptsDir).filter((f) =>
        f.startsWith("document_"),
      );
      for (const file of files) {
        const pts = this.readPts(
          file.replace("document_", "").replace(".json", ""),
        );
        if (!pts?.isDailyNote) continue;
        // PTS modified is NSDate, but dailyNoteDate may not exist
        // match by title which is typically the formatted date
        const modDate = nsdateToIso(pts.modified).slice(0, 10);
        if (modDate === date) {
          // need to reverse-lookup the entity ID from documentId
          const documentId = file.replace("document_", "").replace(".json", "");
          const result = this.db.exec(
            `SELECT id FROM BlockSearch WHERE documentId = ? AND entityType = 'document' LIMIT 1`,
            [documentId],
          );
          if (result.length && result[0].values.length) {
            return result[0].values[0][0] as string;
          }
        }
      }
    } catch {
      // fall through
    }
    return null;
  }

  listDocs(): LocalDoc[] {
    try {
      const result = this.db.exec(
        `SELECT id, content, documentId FROM BlockSearch WHERE entityType = 'document'`,
      );
      if (!result.length) return [];

      const UUID_RE =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      return result[0].values
        .filter((row) => UUID_RE.test(row[0] as string))
        .map((row) => {
          const id = row[0] as string;
          const content = row[1] as string;
          const documentId = row[2] as string;
          const pts = this.readPts(documentId);
          return {
            id,
            documentId,
            title: pts?.title ?? content ?? "",
            markdownContent: pts?.markdownContent ?? "",
            isDailyNote: pts?.isDailyNote ?? false,
            tags: pts?.tags ?? [],
            modified: pts ? nsdateToIso(pts.modified) : "",
            contentHash: pts?.contentHash ?? "",
          };
        });
    } catch {
      return [];
    }
  }

  search(query: string, limit = 50): LocalSearchResult[] {
    try {
      const result = this.db.exec(
        `SELECT id, content, documentId, isTodo
         FROM BlockSearch WHERE BlockSearch MATCH ?
         LIMIT ${limit}`,
        [query],
      );
      if (!result.length) return [];

      return result[0].values.map((row) => ({
        id: row[0] as string,
        content: (row[1] as string) ?? "",
        documentId: (row[2] as string) ?? "",
        isTodo: row[3] === "1" || row[3] === 1 || row[3] === true,
      }));
    } catch {
      return [];
    }
  }

  resolveId(entityId: string): string | null {
    try {
      const result = this.db.exec(
        `SELECT documentId FROM BlockSearch WHERE id = ? AND entityType = 'document'`,
        [entityId],
      );
      if (!result.length || !result[0].values.length) return null;
      return result[0].values[0][0] as string;
    } catch {
      return null;
    }
  }

  getDocContent(entityId: string): string | null {
    const docId = this.resolveId(entityId);
    if (!docId) return null;
    const pts = this.readPts(docId);
    return pts?.markdownContent ?? null;
  }

  close(): void {
    try {
      this.db.close();
    } catch {
      // already closed
    }
  }

  private readPts(documentId: string): any | null {
    if (!this.ptsDir) return null;
    const path = join(this.ptsDir, `document_${documentId}.json`);
    try {
      return JSON.parse(readFileSync(path, "utf-8"));
    } catch {
      return null;
    }
  }
}

function resolveDate(input: string): string {
  const today = new Date();
  switch (input.toLowerCase()) {
    case "today":
    case "":
      return today.toISOString().slice(0, 10);
    case "yesterday": {
      const d = new Date(today);
      d.setDate(d.getDate() - 1);
      return d.toISOString().slice(0, 10);
    }
    case "tomorrow": {
      const d = new Date(today);
      d.setDate(d.getDate() + 1);
      return d.toISOString().slice(0, 10);
    }
    default:
      return input; // assume YYYY-MM-DD
  }
}

// convert LocalDoc to API-compatible Document shape
export function toDocument(local: LocalDoc): Document {
  return {
    id: local.id,
    title: local.title,
    lastModifiedAt: local.modified,
    dailyNoteDate: local.isDailyNote ? local.modified.slice(0, 10) : undefined,
  };
}

// async: discover and open local Craft data stores
export async function discoverLocalStore(): Promise<LocalStore | null> {
  for (const containerId of CONTAINER_IDS) {
    const store = await discoverInBase(containerBase(containerId));
    if (store) return store;
  }
  return null;
}

async function discoverInBase(base: string): Promise<LocalStore | null> {
  const searchDir = join(base, "Search");
  const ptsBase = join(base, "PlainTextSearch");

  if (!existsSync(searchDir)) return null;

  let sqliteFiles: string[];
  try {
    sqliteFiles = readdirSync(searchDir).filter((f) => f.endsWith(".sqlite"));
  } catch {
    return null;
  }

  if (sqliteFiles.length === 0) return null;

  // pick the largest sqlite file (primary space)
  let best: { file: string; size: number } | null = null;
  for (const f of sqliteFiles) {
    try {
      const s = statSync(join(searchDir, f)).size;
      if (!best || s > best.size) best = { file: f, size: s };
    } catch {
      continue;
    }
  }

  if (!best) return null;

  const dbPath = join(searchDir, best.file);

  // load WASM SQLite and open the database
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const initSqlJs = require(join(environment.assetsPath, "sql-wasm-fts5.js"));
    const wasmBinary = readFileSync(
      join(environment.assetsPath, "sql-wasm-fts5.wasm"),
    );
    const SQL = await initSqlJs({ wasmBinary });
    const fileBuffer = readFileSync(dbPath);
    const db = new SQL.Database(fileBuffer);

    // validate schema
    db.exec(
      `SELECT id, content, type, entityType, isTodo, isTodoChecked, documentId
       FROM BlockSearch LIMIT 0`,
    );

    const ptsDirName = basename(best.file, ".sqlite").replace(
      "SearchIndex_",
      "",
    );
    const ptsDir = join(ptsBase, ptsDirName);
    // spaceId is the ptsDirName (without || suffix for shared spaces)
    const spaceId = ptsDirName.split("||")[0];

    return new LocalStore(db, existsSync(ptsDir) ? ptsDir : null, spaceId);
  } catch {
    return null;
  }
}
