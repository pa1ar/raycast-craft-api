# AI Extension Tools + Preview-First UX

## Context

Two parallel additions:
1. **AI Extension tools** - expose Craft capabilities to Raycast AI so users can "@craft-api search for X" or "@craft-api add task Y"
2. **Preview-first UX** - hitting Enter on any document shows a rich markdown preview first; Shift+Enter opens directly in Craft; Enter from preview opens in Craft

Both leverage local-first architecture. Tools reuse `local-store.ts` and `CraftClient` so reads stay fast (<10ms) and writes go through the API.

---

## Part A: Preview-first UX

### Goal
Change the default Enter action on list items from "Open in Craft" to "Preview". Users can still open in Craft immediately via Shift+Enter. From the preview Detail view, Enter opens in Craft.

### [x] A.1 Refactor `DocListItem` primary/secondary actions
- Preview (`Action.Push` to Detail) becomes the first action in ActionPanel - Enter triggers it
- "Open in Craft" becomes second action with `shortcut: { modifiers: ["shift"], key: "return" }`
- All other actions (Backlinks, Copy Markdown, Copy ID) stay with their current shortcuts
- files: `src/components/doc-list-item.tsx`
notes: -

### [x] A.2 Add Open-in-Craft action inside DocPreview
- The existing `DocPreview` internal component needs its own ActionPanel
- Primary action (Enter): Open in Craft via deeplink
- Secondary: Copy Full Markdown, Copy Document ID, Show Backlinks
- files: `src/components/doc-list-item.tsx`
notes: -

### [x] A.3 Apply same pattern to `search.tsx`
- Search doesn't use DocListItem - it has its own List.Item
- Swap Enter action: preview (Action.Push to DocPreview) first, Open in Craft on Shift+Enter
- files: `src/search.tsx`
notes: DocPreview component should be extracted from doc-list-item.tsx into its own file for reuse

### [x] A.4 Apply to `daily-notes.tsx`
- Same swap: preview first, Shift+Enter opens in Craft
- files: `src/daily-notes.tsx`
notes: -

### [ ] A.5 Apply to `collections.tsx` (for collection items that are docs)
- Collection items that have a parent documentId should also support preview
- files: `src/collections.tsx`
notes: collection items may not have a block ID - check the CollectionItem shape

### [x] A.6 Extract DocPreview to its own component
- Move `DocPreview` from `doc-list-item.tsx` to `components/doc-preview.tsx`
- Export for reuse by search.tsx, daily-notes.tsx, collections.tsx
- Accept props: `docId`, `client`, optional `title` for navigation bar
- files: `src/components/doc-preview.tsx` (new), `src/components/doc-list-item.tsx` (refactor)
notes: -

---

## Part B: AI Extension tools

### Goal
Add `tools` array to `package.json` so Raycast AI can call Craft capabilities. Tools are async functions with typed Input, rich JSDoc comments drive the AI's understanding.

### Architecture
```
src/tools/
  search-craft.ts        - FTS5 search (local)
  get-document.ts        - fetch full markdown (local)
  list-documents.ts      - list with filters (local)
  list-daily-notes.ts    - daily notes (local)
  get-backlinks.ts       - find backlinks (local + API for title search)
  list-folders.ts        - folder tree (API)
  list-tasks.ts          - tasks by scope (API)
  create-document.ts     - create new doc (API)
  add-task.ts            - add to inbox (API)
  update-task.ts         - mark done/canceled/reschedule (API)
  append-to-daily.ts     - append markdown (API)
  get-space-info.ts      - diagnostics (local + API)
```

Each tool file:
- Exports default async function
- Has typed `Input` object with JSDoc for each field (Raycast AI reads these)
- Returns JSON-serializable object

### Phase 1: Core reads (local-first)

#### [x] B.1 `search-craft`
- Input: `{ query: string, limit?: number }`
- Returns: `[{ id, title, snippet, lastModifiedAt, isDailyNote, tags }]`
- Uses `local.search()` + `local.listDocs()` for enrichment
- Falls back to API `documents.search`
- files: `src/tools/search-craft.ts` (new), `package.json` (register)
notes: JSDoc needs to explain FTS5 query syntax

#### [x] B.2 `get-document`
- Input: `{ id: string }` (block ID or title)
- Returns: `{ id, title, markdown, lastModifiedAt, tags }`
- Uses `local.getDocContent()` for fast path
- If input is a title, fall back to search first to resolve ID
- files: `src/tools/get-document.ts` (new), `package.json`
notes: -

#### [x] B.3 `list-documents`
- Input: `{ filter?: { modifiedAfter?, folderId?, location?, isDailyNote? }, limit?: number }`
- Returns: `[{ id, title, lastModifiedAt, isDailyNote, tags }]`
- Uses `local.listDocs()` with JS filtering for modifiedAfter/isDailyNote/tags
- Falls back to API for folderId/location (not in local)
- files: `src/tools/list-documents.ts`, `package.json`
notes: -

#### [x] B.4 `list-daily-notes`
- Input: `{ limit?: number, since?: string }` (YYYY-MM-DD)
- Returns: `[{ id, title, date, markdown }]` - markdown optional, only if `includeContent: true`
- Uses `local.listDocs()` filtered by `isDailyNote`
- files: `src/tools/list-daily-notes.ts`, `package.json`
notes: -

### Phase 2: Writes (API)

#### [x] B.5 `create-document`
- Input: `{ title: string, folderId?: string, location?: "unsorted" | "templates" }`
- Returns: `{ id, title, deeplink }`
- Calls `client.documents.create()`
- files: `src/tools/create-document.ts`, `package.json`
notes: -

#### [x] B.6 `add-task`
- Input: `{ markdown: string, to?: "inbox" | "daily" | "document", documentId?: string, scheduleDate?: string, deadlineDate?: string }`
- Returns: `{ id, markdown }`
- Calls `client.tasks.add()`
- files: `src/tools/add-task.ts`, `package.json`
notes: -

#### [x] B.7 `append-to-daily`
- Input: `{ markdown: string, date?: string }` (default today)
- Returns: `{ ok: true }`
- Calls `client.blocks.append()`
- files: `src/tools/append-to-daily.ts`, `package.json`
notes: -

#### [x] B.8 `update-task`
- Input: `{ id: string, state?: "todo" | "done" | "canceled", markdown?: string, scheduleDate?: string, deadlineDate?: string }`
- Returns: `{ id, state }`
- Calls `client.tasks.update()`
- files: `src/tools/update-task.ts`, `package.json`
notes: -

### Phase 3: Structural / meta

#### [x] B.9 `list-folders`
- Input: `{}`
- Returns: recursive folder tree
- API only (folders not in local stores)
- files: `src/tools/list-folders.ts`, `package.json`
notes: -

#### [x] B.10 `list-tasks`
- Input: `{ scope: "inbox" | "active" | "upcoming" | "logbook" | "document", documentId?: string }`
- Returns: `[{ id, markdown, state, scheduleDate, deadlineDate }]`
- Calls `client.tasks.list()`
- files: `src/tools/list-tasks.ts`, `package.json`
notes: -

#### [x] B.11 `get-backlinks`
- Input: `{ documentId: string, exhaustive?: boolean }`
- Returns: `[{ blockId, text, inDocumentId, inDocumentTitle }]`
- Uses `client.links.backlinks()` (title-based, fast)
- Enriches with doc titles from local store if available
- files: `src/tools/get-backlinks.ts`, `package.json`
notes: -

#### [x] B.12 `get-space-info`
- Input: `{}`
- Returns: `{ space: { name, id, timezone }, localStore: { ok, docCount }, api: { ok, latencyMs } }`
- Combines API `connection()` with local store diagnostics
- files: `src/tools/get-space-info.ts`, `package.json`
notes: -

### Optional Phase 4: Evals

Raycast supports `evals` field in package.json tools for testing. Each eval is a prompt + expected tool call. Would let us verify the AI picks the right tool for common queries.

- files: `package.json` evals field
notes: defer until tools work end-to-end

---

## Sequencing

```
Part A (Preview UX):
  A.6 Extract DocPreview -> A.1 Refactor DocListItem -> A.2 Add actions in preview
  -> A.3 search.tsx -> A.4 daily-notes.tsx -> A.5 collections.tsx

Part B (AI tools):
  B.1-B.4 (reads, local) - can be built in parallel
  B.5-B.8 (writes, API) - can be built in parallel after reads
  B.9-B.12 (structural) - independent
```

Part A and Part B are fully independent. Can ship either first.

Recommended order:
1. Part A first (smaller scope, immediate UX win)
2. Part B Phase 1 (core reads - highest value for AI)
3. Part B Phase 2 (writes)
4. Part B Phase 3 (structural + meta)

## Verification

After each phase:
1. `bun run lint` - must pass
2. `bun run build` - must compile
3. Manual test in Raycast
4. For tools: test via Raycast AI chat with `@craft-api` queries

Tool-specific verification:
- Ask Raycast AI: "@craft-api search for weekly review" -> should call search-craft
- "@craft-api add a task to call the dentist" -> should call add-task
- "@craft-api what's in my daily note from yesterday?" -> should call list-daily-notes or get-document
- "@craft-api what did I write about LTM last week?" -> should call search-craft + get-document

## Key files to modify

- `src/components/doc-preview.tsx` (new) - extracted preview Detail
- `src/components/doc-list-item.tsx` - primary/secondary action swap
- `src/search.tsx`, `src/daily-notes.tsx`, `src/collections.tsx` - same pattern
- `src/tools/*.ts` (12 new files)
- `package.json` - `tools` array registration

## Reference implementations

- anytype extension (https://github.com/raycast/extensions/tree/main/extensions/anytype) - 12+ tools, similar domain (knowledge base), good reference for tool JSDoc style and Input shapes
- e2b, dtf, focus - simpler tool examples
