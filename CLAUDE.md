# Craft API - Raycast Extension

Raycast extension for the Craft Docs "API for All Docs". NOT a standalone project - depends on `@1ar/craft-cli` as a library.

## Dependency chain

```
Craft Docs API (source of truth)
  -> @1ar/craft-cli (~/dev/tools/craft-cli) - typed TS library + CLI binary
    -> this extension (~/dev/raycast/craft-api) - Raycast UI layer
    -> Claude Code skill (~/.claude/skills/craft-cli/) - agent interface
```

All API interaction goes through `CraftClient` from `@1ar/craft-cli/lib`. This extension never calls the Craft API directly.

## When changing things

- **API endpoint behavior changed?** Fix in craft-cli first (`~/dev/tools/craft-cli/src/lib/`), then `bun install` here
- **New Raycast command?** Add to `src/`, register in `package.json` commands array
- **New API capability?** Add to craft-cli lib, then consume here

## Repos

- CLI + lib: https://github.com/pa1ar/craft-cli (`~/dev/tools/craft-cli`)
- This extension: https://github.com/pa1ar/raycast-craft-api (`~/dev/raycast/craft-api`)
- API docs: `~/dev/craft-docs/craft-do-api/craft-do-api-docs.md`
- OpenAPI spec: `~/dev/craft-docs/craft-do-api/craft-do-openapi.json`
- Caveats: `~/dev/craft-docs/craft-do-api/trials/CAVEATS.md`

## Structure

```
src/
  client.ts       shared CraftClient singleton (from Raycast prefs)
  search.tsx      full-vault regex search (view)
  daily.tsx       open daily note deeplink (no-view)
  add-task.tsx    add task to inbox (no-view)
  append-daily.tsx  append to daily note (no-view)
  recent.tsx      recent documents list (view)
  fuzzy-open.tsx  fuzzy open any doc (view, 5-min cache)
```

## Conventions

- `useCachedPromise` for API calls in view commands
- `showHUD` + `closeMainWindow` for no-view commands
- Preferences store API URL + key in Raycast's secure store (not shared with CLI config)
- Commands open `craftdocs://` deeplinks via `open()` to launch the native app

## Dev

```sh
bun install
ray develop    # hot-reload into Raycast
ray build      # production build
ray lint       # validate manifest + lint
```

After changing craft-cli: `cd ~/dev/tools/craft-cli && bun install` then `bun install` here.

## Publishing

This is a standalone extension (not in the raycast/extensions monorepo yet). To publish to the Raycast Store:
1. `bun update @raycast/api @raycast/utils`
2. `ray lint && ray build`
3. `npx ray publish`

The `file:` link to craft-cli must be replaced with a published npm package or vendored before store submission.
