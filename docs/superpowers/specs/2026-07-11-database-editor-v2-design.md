# Database Editor v2 — Design

**Date:** 2026-07-11
**Status:** Approved, pending implementation
**Builds on:** [`2026-07-10-database-editor-phase2-design.md`](./2026-07-10-database-editor-phase2-design.md) (the editor panel, merged) and the datatable resolver.

## Problem

The Database editor ships (full-screen grid, live edits, CRUD, nodes split). Seven
gaps remain, spanning three surfaces:

- The grid has no **copy/paste** and no **undo/redo** — table editing feels
  unfinished without spreadsheet keyboard ergonomics.
- The nodes split only edits `modules`; **`states`/`meta` are read-only**.
- Deleting a referenced feature/lane/phase gives **no warning** about dependents.
- **Localized (`{en,pt,es}`) fields** edit the active language but give no signal
  which language is being changed.
- **Export** emits only the map, not its datatables.
- The **CodeDrawer shows the source minified on one line** (~85 KB), which is
  unusable for hand-editing.

This spec adds all seven. No schema changes; everything reuses the existing
live-commit pipeline (`applyEntityEdit`/`applyNodeNestedEdit` → `serializeSource`
→ `commitSource` → resolve → normalize).

## Decisions (locked in brainstorming)

1. **Undo/redo is per-source and panel-scoped** — history covers edits made in the
   Database panel while it's open; clears on close / new map load. Reuses the
   existing `useUndo` hook semantics.
2. **Copy uses Glide's native path** (`getCellsForSelection`); **paste is handled**
   (`onPaste`) and applied as ONE batched commit (one undo step, one re-render).
3. **CodeDrawer "Format"** reformats only the editor buffer, not stored source.
4. **Multi-file export = a client-built `.zip`** (store method, no new dependency);
   single-source maps keep single-file download. Share-by-URL stays map-only.
5. **Delete shows a dependent count confirm**, no cascade (a dangling ref
   degrades gracefully, per Phase-1 behavior).

## Group A — Grid power features (EntityGrid)

### A1. Copy / paste

- **Copy:** pass `getCellsForSelection={true}` to `DataEditor`. Glide then serializes
  the selected range to TSV on Cmd/Ctrl+C using `getCellContent`. No extra code
  beyond enabling it (our cells are plain text/dropdown → their `copyData`/`data`
  is the value).
- **Paste:** implement `onPaste(target: Item, values: readonly (readonly string[])[]): boolean`.
  `target` is `[col, row]` of the top-left target cell; `values` is the clipboard
  grid already split by tabs/newlines. Behavior:
  - For each `values[r][c]`, compute `col = target[0] + c`, `row = target[1] + r`.
  - Skip if `col`/`row` out of range, or the target column is `readOnly` (e.g. `id`).
  - Collect all `{ rowId, field, value }` edits, then apply them in ONE pass and
    emit ONE commit (see "batched commit" below). Return `false` so Glide doesn't
    also apply them cell-by-cell.
- **Batched commit:** add an `onEditBatch(edits: EntityEdit[])` prop to `EntityGrid`
  (alongside the existing `onEdit`). `DatabasePanel` implements it by parsing the
  source once, folding all edits through `applyEntityEdit` in sequence, serializing
  once, and calling `onCommit` once. `onEdit` (single) becomes `onEditBatch` of length 1.

### A2. Undo / redo (Cmd+Z / Cmd+Shift+Z)

- New hook `useSourceHistory(rawSources)` in `DatabasePanel` (built on `useUndo`'s
  stack pattern, generalized to key by source index): it records, per commit, the
  **previous** text of the source being changed as `{ index, text }` on an undo
  stack; redo stack mirrors.
- `DatabasePanel` routes every commit through the history: `commitWithHistory(index,
  newText)` pushes `{ index, prevText }` then calls `onCommit(index, newText)`.
- `undo()` pops the last `{ index, prevText }`, pushes the current text of that
  source to redo, and calls `onCommit(index, prevText)`. `redo()` is symmetric.
- **Keyboard:** a listener active only while the panel is `open`. Cmd+Z → undo,
  Cmd+Shift+Z (and Cmd+Y) → redo; Ctrl on non-Mac. **Guard:** if a Glide overlay
  cell editor is open (detect `#portal` has children), let the event pass so
  Glide's in-cell text undo wins; otherwise `preventDefault` and run source undo.
- History `reset()`s when `open` goes false→true or `rawSources` identity changes
  (new map). Cap 50 (the `useUndo` default).

## Group B — Nodes-split follow-ups

### B1. Edit `states` / `meta`

`applyNodeNestedEdit` already has a states/meta branch but with an index convention
asymmetric to `modules` and no tests. Fix it so all three use the same convention
(`edit.field` carries the array index for updates; `edit.id` carries the index for
delete), and add unit tests. `NestedTable` gains real editors:

- **`states`** → a table with columns `label` (text), `mode` (dropdown from
  `meta.modes`), `narrative` (text). `+ add` appends `{}`; per-row `✕` deletes.
  Each edit sets `arr[i].<field>`.
- **`meta`** → a key/value table: columns `label` (text), `value` (text) — the
  `[{label,value}]` shape the drawer's KeyValue primitive renders. Add/remove rows.

All route through `applyNodeNestedEdit` → `serializeSource` → the history-wrapped
commit (so nested edits are undoable too).

### B2. Delete-with-dependents warning

- Pure helper `countDependents(map, entity, id): number`:
  - `features` → count nodes whose `context.modules` contains `id` (raw source ids).
  - `lanes` → count nodes with `node.lane === id`.
  - `phases` → count nodes with `node.phase === id`.
  - `nodes` → 0 (deleting a node only affects edges, handled elsewhere).
- In `DatabasePanel`'s delete handler: if `countDependents > 0`, show a confirm
  (native `window.confirm` is acceptable v1, styled inline dialog preferred if
  cheap): "N node(s) reference this <entity>. Delete anyway?" Proceed only on yes.
- No cascade: a now-dangling ref renders as the Phase-1 `{_unresolved}` marker.

### B3. Localized field language indicator

- Editing already writes only the active language (`setFieldPreservingLangs`).
- Add a toolbar hint in `DatabasePanel`: when the current entity has any localized
  field, show "Editing: <ACTIVE> · also: <others>" derived from the languages
  present in the data (reuse `App.tsx`'s `discoverLangs` logic, extracted to a
  shared util `discoverLangs(data)` in `src/lib/`).
- The active language is the `lang` prop already passed to `DatabasePanel`.

## Group C — CodeDrawer + export

### C1. CodeDrawer "Format" (beautify)

- Add a **Format** button to the CodeDrawer toolbar (next to Copy / Download).
- On click, reformat the **active tab's buffer**: JSON → `JSON.stringify(JSON.parse(buf),
  null, 2)`; YAML → `yaml.dump(yaml.load(buf))`. Push the pre-format text to that
  tab's undo stack (so Format is undoable), set the buffer, and run the normal
  debounced parse→`onEdit` path (formatting a valid doc re-commits identical data,
  pretty-printed — the map render is unchanged; only the editor text expands).
- On parse failure: no-op + show the existing error status (can't format invalid text).
- CSS: the code `<textarea>`/pre uses `white-space: pre; overflow-x: auto` so long
  minified lines scroll rather than wrap, and formatted output reads cleanly.
- Disable Format when the buffer is empty or currently unparseable.

### C2. Multi-file export

- `rawSources` is already multi-entry. Change the **Download** action:
  - 1 source → unchanged (download the single file, current behavior).
  - >1 source → build a `.zip` (ZIP "store"/no-compression, hand-written: local
    file headers + central directory + CRC32) containing each source by its
    `name`, and download `map-bundle.zip`. No new dependency (CRC32 + zip layout is
    ~60 lines, unit-tested).
- **Share link** (`#data=`) stays map-only with a one-line note in the ShareModal
  when a bundle is loaded ("datatables aren't included in share links — use
  Download for the full bundle"). Sharing a bundle via URL is out of scope.

## Architecture & units

New / changed units, each independently testable:

- `src/lib/database/applyPaste.ts` — pure `pasteEdits(grid, target, values):
  EntityEdit[]` (maps clipboard grid → edits, skipping OOB/read-only). Tested.
- `EntityGrid` — add `getCellsForSelection`, `onPaste`, `onEditBatch`; keep `onEdit`.
- `src/components/DatabasePanel/useSourceHistory.ts` — undo/redo over source commits.
- `NestedTable` — states/meta editors (new render branches + wiring).
- `src/lib/database/applyEntityEdit.ts` — fix states/meta index convention (+tests).
- `src/lib/database/countDependents.ts` — pure dependent counter. Tested.
- `src/lib/discoverLangs.ts` — extracted from App.tsx, shared. Tested.
- `src/lib/zip.ts` — pure `zipStore(files: {name,text}[]): Uint8Array` (+CRC32). Tested.
- `CodeDrawer` — Format button + buffer reformat + pre/scroll CSS.
- `ShareModal` / download wiring — multi-source zip download.

## Error handling

- Paste onto read-only/OOB cells: silently skipped (no error).
- Paste/format that yields invalid source: the commit's re-parse can't fail on our
  structured edits; Format guards with try/catch and no-ops on invalid input.
- Undo with empty stack: no-op (buttons/shortcuts inert, `canUndo=false`).
- Delete confirm declined: nothing changes.
- Zip of a single source: never happens (single-source takes the plain-download path).

## Testing strategy

- **Unit:** `pasteEdits` (mapping, OOB, read-only skip); `useSourceHistory`
  (push/undo/redo/reset, per-index); `countDependents` (features/lanes/phases/none);
  `discoverLangs`; `zipStore` (valid zip bytes: local header magic, CRC32, central
  dir — decode round-trip with a JS unzip in-test or assert structure); the fixed
  `applyEntityEdit`/`applyNodeNestedEdit` states/meta branches.
- **Component:** `EntityGrid` fires `onEditBatch` from a simulated paste;
  `NestedTable` states/meta editors emit the right `EntityEdit`s; CodeDrawer Format
  button reformats the buffer and stays a no-op on invalid JSON.
- **Integration/browser (manual, verified in-session):** copy a range → paste
  elsewhere; Cmd+Z/Cmd+Shift+Z reverts/replays; edit a state's mode; delete a
  referenced feature → warning; Format expands the 1-line source; download a bundle
  → a zip with both files.
- **Regression:** full suite stays green; existing CodeDrawer undo, single-file
  download, share, and the Phase-2 editor tests unaffected.

## Risks

- **Keyboard collision (undo vs Glide):** mitigated by the overlay-open guard and
  panel-scoped listener; covered by a manual browser check.
- **Hand-written zip correctness:** mitigated by unit-testing the bytes and a
  round-trip decode in-test; store method (no deflate) keeps it simple.
- **Batched paste size:** a huge paste = one big commit; acceptable (one re-render).
  Cap paste to the grid's existing rows (no auto-row-creation in v1).
- **Format on very large source (85 KB):** `JSON.parse`+stringify is fine at this
  size; the textarea `pre`/scroll avoids reflow cost from wrapping.
