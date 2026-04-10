# Craft API - Raycast Extension

Raycast extension for Craft Docs. Hybrid architecture: reads from Craft's local SQLite FTS5 + PlainTextSearch JSON, writes via the "API for All Docs" through `@1ar/craft-cli`.

## Architecture

```
Craft macOS app
  -> local SQLite FTS5 + PTS JSON (read by this extension via WASM sql.js)
  -> Craft REST API (written by this extension via @1ar/craft-cli)
```

- **Reads** (search, doc listing, content, daily notes, daily note deeplink): go through `src/local-store.ts` -> bundled `assets/sql-wasm-fts5.*` (WASM SQLite with FTS5) + `readFileSync` on PTS JSON files
- **Writes** (tasks, create doc, collections, folders, comments, append daily): go through `CraftClient` from `@1ar/craft-cli/lib`
- **Fallback**: every read command falls back to the API when local store discovery fails (non-Mac, Craft not installed, first-run permission denial)

Local data stores are maintained by the Craft macOS app and update within ~1s of any API or in-app write.

## Why WASM SQLite (not native)

`better-sqlite3` doesn't bundle with esbuild (Raycast's bundler) - native `.node` binaries are not copied to the Raycast extensions directory. WASM sql.js works because it's pure JS + a WASM binary we bundle ourselves in `assets/`. Same approach as the [original craftdocs extension](https://github.com/raycast/extensions/tree/main/extensions/craftdocs). The WASM assets (`sql-wasm-fts5.wasm`, `sql-wasm-fts5.js`, `sql-wasm-fts5.d.ts`) are a custom build of sql.js with FTS5 enabled - borrowed from that extension.

## When changing things

- **API endpoint behavior changed?** Fix in craft-cli first (`~/dev/tools/craft-cli/src/lib/`), then `bun install` here
- **Craft local DB schema changed?** Update `src/local-store.ts` (the SQL queries + PTS JSON shape assumptions)
- **New Raycast command?** Add to `src/`, register in `package.json` commands array. Prefer local reads where possible, API only when the data isn't in local stores
- **New write operation?** Add to craft-cli lib first, then consume here

## Repos

- CLI + lib: https://github.com/pa1ar/craft-cli (`~/dev/tools/craft-cli`)
- This extension: https://github.com/pa1ar/raycast-craft-api (`~/dev/raycast/craft-api`)
- API docs: `~/dev/craft-docs/craft-do-api/craft-do-api-docs.md`
- OpenAPI spec: `~/dev/craft-docs/craft-do-api/craft-do-openapi.json`
- Caveats: `~/dev/craft-docs/craft-do-api/trials/CAVEATS.md`
- Local DB schema doc: `~/dev/tools/craft-cli/docs/local-sqlite-schema.md`

## Structure

```
src/
  client.ts             CraftClient singleton + getLocalStoreAsync()
  local-store.ts        local SQLite FTS5 + PTS JSON reader (WASM sql.js)
  components/
    doc-list-item.tsx   reusable List.Item with Open/Preview/Backlinks/Copy actions
  search.tsx            FTS5 search (local) with API fallback (view)
  fuzzy-open.tsx        fuzzy-filter all docs (local) with API fallback (view)
  recent.tsx            docs modified in last 14 days (local) (view)
  daily-notes.tsx       browse all daily notes (local) (view)
  daily.tsx             open daily note by date (local deeplink, API fallback) (no-view)
  append-daily.tsx      append markdown to today (API) (no-view)
  add-task.tsx          add task to inbox (API) (no-view)
  tasks.tsx             browse/manage tasks by scope (API) (view)
  create-document.tsx   create new doc (API) (no-view)
  folders.tsx           browse folder tree (API) (view)
  collections.tsx       browse collections (API) (view)
  whoami.tsx            show connected space name (API) (no-view)

assets/
  craft.png             extension icon (Craft app logo)
  sql-wasm-fts5.wasm    ~1.2MB SQLite WASM with FTS5
  sql-wasm-fts5.js      sql.js loader
  sql-wasm-fts5.d.ts    sql.js types
```

## Conventions

- Local reads first: always call `const local = await getLocalStoreAsync();` and use local data when available, fall back to API only if `local === null`
- Never cache `null` from `getLocalStoreAsync` - first call may happen before the macOS "access other apps' data" permission is granted; retry on subsequent calls
- `useCachedPromise` for async calls in view commands
- `showHUD` + `closeMainWindow` for no-view commands
- Preferences store API URL + key in Raycast's secure store
- All "open in Craft" actions go through `craftdocs://open?blockId=X&spaceId=Y` - either via `local.deeplink(id)` or `client.deeplink(id)` (API call to `/connection` for the template). Local is preferred since it's synchronous and needs no API

## Dev

```sh
bun install
ray develop    # hot-reload into Raycast
ray build      # production build (also updates ~/.config/raycast/extensions/craft-api/)
ray lint       # validate manifest + lint
```

After changing craft-cli: `cd ~/dev/tools/craft-cli && bun install && bun run build` then `bun install` here.

## Publishing

This is a standalone extension (not in the raycast/extensions monorepo yet). To publish to the Raycast Store:

1. `bun update @raycast/api @raycast/utils`
2. `ray lint && ray build`
3. `npx ray publish`

Blockers before store submission:
- The `file:` link to craft-cli must be replaced with a published npm package or vendored - the store build will not accept a file path outside the extension directory
- Credit the WASM SQLite assets to the original craftdocs extension in the submission notes
