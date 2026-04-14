# Expand AI tools & doc writes

context: AI agent in raycast failed the simple prompt "create a doc called hi with body there". retried `create-document` 3x with `{}`, then with `content: "there"` (ignored, tool has no `content` field), then fell back to `update-task` with `text: "there"` - which silently turned the new doc into a task. underlying lib (`@1ar/craft-cli`) supports all needed ops; extension exposes only a sliver.

two problems to solve in parallel:
1. **immediate functional gaps** - create-document has no body, no way to edit doc content, no delete, no folder mgmt, no collection items
2. **tool legibility** - AI doesn't know defaults, passes empty args, picks wrong tool. needs clearer descriptions, required fields, and guardrails (e.g. reject unknown params loudly instead of silently dropping `content`)

## guiding principles

- **default behavior is obvious**: creating a doc with no folder = unsorted. creating a task with no location = inbox. AI should never need to call `list-folders` just to create an unsorted doc.
- **human commands are few, AI tools are many**: UIs should be minimal and goal-oriented (browse, search, open, quick-capture). AI tools cover the full write surface.
- **AI-only ops get a disclaimer in raycast command description**: e.g. "Update Document Block (advanced, for AI)" so users don't see a useless form in raycast. some ops (update-block, insert-blocks) are pointless to expose as no-view commands - skip them for raycast UI, expose only as AI tools.
- **dangerous ops confirm**: delete-document / delete-folder via raycast UI should use `confirmAlert`. AI tool equivalents require an explicit `confirm: true` parameter.
- **tool args: required fields are required**: stop making everything optional. if `title` is required, mark it required in the JSON schema so raycast AI fails fast instead of letting the agent call with `{}`.

## scope

**add to AI tools** (src/tools/):
1. `create-document` - add `content?: string` parameter. after creating, if content is non-empty, call `blocks.append` with pageId = new doc id. [FIXES REPORTED BUG]
2. `append-to-document` - append markdown to any page (not just daily note). wraps `blocks.append({ pageId })`.
3. `update-block` - AI-only. edit a single block's markdown by id. wraps `blocks.update`.
4. `insert-blocks` - AI-only. insert markdown at position (start/end/before/after) of a parent block or daily note. wraps `blocks.insertMarkdown`.
5. `delete-blocks` - AI-only. delete blocks by ids. wraps `blocks.delete`. require `confirm: true`.
6. `search-in-document` - AI-only. search within a single doc for a pattern. wraps `blocks.search`.
7. `delete-document` - delete doc(s) by id. require `confirm: true`. wraps `documents.delete`.
8. `move-document` - move doc between folders / to unsorted. wraps `documents.move`.
9. `list-collections` - list collections in vault. wraps `collections.list`.
10. `get-collection-items` - list items in a collection. wraps `collections.getItems`.
11. `add-collection-item` - add item to collection with title + properties. wraps `collections.addItems`.
12. `update-collection-item` - update title / properties of item. wraps `collections.updateItems`.
13. `delete-collection-items` - require `confirm: true`. wraps `collections.deleteItems`.
14. `delete-tasks` - wraps `tasks.delete`. require `confirm: true`.
15. `create-folder` - create folder(s) optionally under a parent. wraps `folders.create`.
16. `delete-folder` - require `confirm: true`. wraps `folders.delete`.
17. `move-folder` - move folder to root or under a parent. wraps `folders.move`.
18. `get-outgoing-links` - extract outgoing `[text](block://id)` links from a block tree. wraps `links.outgoing`.
19. `get-collection-schema` - AI-only. wraps `collections.getSchema`. useful before adding items.

**NOT in scope** (explicit defer):
- comments (niche, skip)
- whiteboards (UI-heavy, skip)
- upload/file (raycast can't easily pipe binaries, skip for now)
- backlinksExhaustive (too expensive for AI loop)
- journal (CLI-only, by design)

**revise existing tools** for clarity:
- `list-folders` - output should already mention "unsorted" is a sentinel (done).
- `add-task` - rename `to` to `location` or add explicit examples. describe `markdown` field as task body only, NOT document body.
- `update-task` - description must say "this edits a task block, not a document. do not use to set document content."
- all tools: add concrete example payload in the description so the AI sees "create-document with title='foo'" as a template.

**revise existing raycast commands** (human UI):
- none urgent. existing views cover browse/search/open/capture. focus on AI tools first.

**new raycast commands** (human-facing, optional - phase 2):
- Create Folder (no-view, one argument `name`) - small convenience.
- Delete Document via fuzzy-open Action (already makes sense as contextual action).
- Move Document via fuzzy-open Action (submenu of folders).

## tool-description template

every tool file should include:
```
/**
 * <one-sentence purpose>
 *
 * Defaults: <list defaults so AI doesn't need to fetch anything>
 * Example: <concrete minimal call>
 * Use this when: <user-phrases that trigger it>
 * DO NOT use this to: <explicit negatives pointing at sibling tools>
 */
```

this template is the main lever for fixing tool confusion.

## validation

- after implementing, run the original failing prompts through raycast AI:
  - "create a doc called hi with body there" - should succeed with `create-document { title: "hi", content: "there" }` one call, no folder lookup.
  - "make a folder called 'inbox-ai' and put a new doc in it" - should call `create-folder` then `create-document`.
  - "delete that doc" - should refuse without confirm, succeed with confirm.
- diff `package.json` tools array - every new tool listed with a description that mirrors the file header.
- `ray lint && ray build` must pass.

## tasks

[x] T1 create-document content support
notes: add content param, after create call blocks.append. write a test harness doc or just manual raycast test. ship this alone first - fixes the reported bug.

[x] T2 append-to-document, update-block, insert-blocks, delete-blocks
notes: block-level write surface. all four go together. update/insert/delete need `confirm` for destructive ops. raycast package.json description for insert/update/delete flags "advanced, for AI" if we expose as no-view commands at all - prefer NOT to expose; AI-tool-only.

[x] T3 delete-document, move-document
notes: doc-level. destructive. require confirm. move supports both folderId and "unsorted" sentinel - reuse the destination normalization from create-document.

[x] T4 collections tools (list/get-items/add/update/delete + schema)
notes: five tools. get-collection-schema is AI-only and advanced - include in description.

[x] T5 folders tools (create/delete/move)
notes: straightforward wrappers. delete needs confirm.

[x] T6 delete-tasks
notes: small but missing. require confirm.

[x] T7 search-in-document, get-outgoing-links
notes: read-only AI helpers for graph traversal / contextual search inside one doc.

[x] T8 revise tool descriptions + add example blocks
notes: apply template above to ALL tools, old and new. the biggest lever for AI reliability. can run in parallel with implementation.

[x] T9 package.json tools array entries
notes: one entry per new tool with 1-line description. raycast uses this as the short label; the doc-comment in the file is the long one.

[x] T10 validation pass
notes: build + lint green. manual AI prompt tests deferred to user's next raycast session.

## outcome

- 19 new AI tools added. covers entire craft-cli write surface except comments/whiteboards/upload (explicit defer).
- collections property maps use JSON-string input (propertiesJson) because raycast schema extractor rejects Record<string, unknown>.
- all destructive ops require confirm: true. surfaced clearly in descriptions.
- all tools updated with Defaults/Example/Use when/DO NOT template.
- create-document now accepts content param - closes the reported failure mode.

## unresolved questions

- should `create-document` accept markdown with leading `# title` and strip it, or keep title and content as separate args? **decision**: keep separate. title arg → doc title. content arg → body markdown appended after creation. if AI passes `# foo` in content, it'll become an H1 inside the body, which is wrong but not catastrophic.
- confirm-semantic: should destructive AI tools require `confirm: true` arg, or should we add a top-level raycast preference "allow destructive AI ops"? **lean**: per-call `confirm: true` is simpler and auditable. no preference needed.
- expose the entire block-level write surface to raycast AI, or gate behind a preference (e.g. `enableAdvancedAITools`)? **lean**: no gate, just mark them clearly in descriptions. users don't see tool schemas directly; only the AI sees them.
