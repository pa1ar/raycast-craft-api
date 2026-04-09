# Craft API Raycast Extension - CLI Parity

## Context

Extension has 6 commands (search, daily, add-task, append-daily, recent, fuzzy-open) but the underlying `@1ar/craft-cli` library exposes much more: tasks CRUD, folders, document create/delete/move, collections, backlinks, comments, whiteboards. Goal: bring Raycast commands to near-parity with CLI, skipping things that don't translate to Raycast UX (block-level CRUD, whiteboards, patch/diff/undo, upload).

## What to skip (keep CLI-only)

- Block update/delete/move - too granular for Raycast
- Whiteboards - too visual
- File upload - workflow mismatch
- patch/log/diff/undo - CLI power-user features
- setup/profiles - Raycast has preferences UI
- Document delete - destructive, do in Craft app or CLI
- Exhaustive backlink scan - too slow

---

## Phase 1: Shared DocListItem component + document preview

Extract duplicated action panels from search/recent/fuzzy-open into reusable component. Add markdown preview action.

### [x] 1.1 Create `src/components/doc-list-item.tsx`
- Props: `doc: Document`, `client: CraftClient`, optional `subtitle`, `icon`
- Actions: Open in Craft, Preview (push Detail with markdown), Copy Doc ID, Copy Full Markdown
- Preview: `Action.Push` to Detail view, fetches `client.blocks.get(docId, { format: "markdown" })`
- files: `src/components/doc-list-item.tsx` (new)
notes: -

### [x] 1.2 Refactor search.tsx, recent.tsx, fuzzy-open.tsx to use DocListItem
- search.tsx: slightly different since hits are `DocumentSearchHit` not `Document` - adapt or keep separate
- recent.tsx + fuzzy-open.tsx: straightforward swap
- files: `src/search.tsx`, `src/recent.tsx`, `src/fuzzy-open.tsx`
notes: search has snippet-specific actions (Copy Snippet), may need extra actions prop on DocListItem

---

## Phase 2: Task management (highest daily-use value)

### [x] 2.1 Create `src/tasks.tsx` (view command)
- Scope dropdown in search bar: inbox | active | upcoming | logbook
- `useCachedPromise` calling `client.tasks.list(scope)`
- List.Item: title = task.markdown (strip leading `- [ ] ` etc), accessories = schedule/deadline dates
- Icon: checkbox unchecked for todo, checked for done, xmark for canceled
- Actions:
  - Open in Craft (`client.deeplink(task.id)`)
  - Mark Done (`client.tasks.update([{ id, taskInfo: { state: "done" } }])`)
  - Mark Canceled (same pattern)
  - Delete (with confirmation Alert)
  - Copy Task Text
- Register in package.json: name "tasks", title "Craft Tasks", mode "view"
- files: `src/tasks.tsx` (new), `package.json`
- types: `Task`, `TaskScope`, `TaskState` from `@1ar/craft-cli/lib`
notes: task.id is a block id, deeplink should work

---

## Phase 3: Document creation

### [x] 3.1 Create `src/create-document.tsx` (no-view command)
- Argument: `title` (required)
- `client.documents.create([{ title }])` -> get returned doc -> `open(deeplink)`
- Pattern matches add-task.tsx
- Register in package.json: name "create-document", title "Create Craft Document", mode "no-view"
- files: `src/create-document.tsx` (new), `package.json`
notes: creates in unsorted by default. folder picker can come later.

---

## Phase 4: Folder browsing

### [x] 4.1 Create `src/folders.tsx` (view command)
- `useCachedPromise` calling `client.folders.list()`
- Top level: root folders with documentCount as accessory
- Action.Push to drill into folder: show nested folders + documents via `client.documents.list({ folderId })`
- Documents rendered with DocListItem
- Nested folders rendered as pushable list items
- Register in package.json: name "folders", title "Browse Folders", mode "view"
- files: `src/folders.tsx` (new), `package.json`
notes: Folder type has recursive `folders?: Folder[]`

---

## Phase 5: Backlinks + Collections

### [x] 5.1 Add "Show Backlinks" action to DocListItem
- Action.Push to a list view calling `client.links.backlinks(doc.id)`
- Each backlink: title = link text, subtitle = source document ID
- Action: Open source document in Craft
- files: `src/components/doc-list-item.tsx`
notes: uses fast title-based search, not exhaustive scan

### [x] 5.2 Create `src/collections.tsx` (view command)
- `useCachedPromise` calling `client.collections.list()`
- List.Item: name, itemCount as accessory
- Action.Push to items list: `client.collections.getItems(collectionId)`
- Each item: title, properties as subtitle/accessories
- Action: Open parent document in Craft (collection has documentId)
- Register in package.json
- files: `src/collections.tsx` (new), `package.json`
notes: -

---

## Phase 6: Polish

### [x] 6.1 `src/whoami.tsx` (no-view command)
- `client.connection()` -> `showHUD` with space name
- Useful for debugging, trivial to implement
- files: `src/whoami.tsx` (new), `package.json`
notes: -

### [ ] 6.2 Add "Move to Folder" action to DocListItem (deferred)
- Action.Push to folder picker list, then `client.documents.move([docId], { folderId })`
- files: `src/components/doc-list-item.tsx`
notes: only if folder browsing works well first

---

## Sequencing & dependencies

```
Phase 1 (DocListItem) -> Phase 4 (folders, uses DocListItem)
Phase 1 (DocListItem) -> Phase 5.1 (backlinks, added to DocListItem)
Phase 2 (tasks) - independent
Phase 3 (create-document) - independent
Phase 5.2 (collections) - independent
Phase 6 - after everything else
```

Phases 1, 2, 3 can run in parallel. Phase 4 depends on 1. Phase 5.1 depends on 1.

## Verification

After each phase:
1. `bun install` (if craft-cli changed)
2. `ray lint` - must pass
3. `ray develop` - hot-reload, test each new command manually
4. verify deeplinks open correctly in Craft app
5. verify list items render with correct titles/subtitles/icons

## Key files

- Extension source: `/Users/pavel/dev/raycast/craft-api/src/`
- Package manifest: `/Users/pavel/dev/raycast/craft-api/package.json`
- CraftClient lib: `/Users/pavel/dev/tools/craft-cli/src/lib/`
- Types: `/Users/pavel/dev/tools/craft-cli/src/lib/types.ts`
- Existing patterns to follow: `src/recent.tsx` (view), `src/add-task.tsx` (no-view)
