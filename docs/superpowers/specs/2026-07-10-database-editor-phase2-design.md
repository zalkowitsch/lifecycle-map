# Database Editor Panel — Phase 2 — Design

**Date:** 2026-07-10
**Status:** Approved, pending implementation
**Builds on:** [`2026-07-08-relational-datatables-phase1-design.md`](./2026-07-08-relational-datatables-phase1-design.md) (the relational resolver + registry, now merged)

## Problem

The viewer today is read-first. A map is edited only as raw JSON/YAML text in the
CodeDrawer. The user wants a **structured "database" view** to edit the lifecycle
map as tables: list and CRUD **Personas** (lanes), **Steps** (phases),
**Features** (the Phase-1 datatable), and **Nodes** (cards) — e.g. "add a persona",
"edit a step" — without hand-editing JSON.

Phase 1 made features a **referenced datatable** (nodes reference feature ids;
the resolver joins them on load). Phase 2 is the **write** complement: a
full-screen, spreadsheet-style editor over the same map + datatables, editing
live.

## Decisions (locked during brainstorming)

1. **Full-screen mode**, not a side drawer. Entering the Database view hides the
   canvas; a "← back to map" control returns. Tabs switch entity:
   Personas · Steps · Features · Nodes.
2. **Spreadsheet grid via Glide Data Grid** (`@glideapps/glide-data-grid`, MIT).
   Chosen over Handsontable, whose free tier is non-commercial only and whose
   commercial license is ~$999/dev/yr — a real cost/legal risk for internal
   Commure content. Glide gives the Excel-like feel (cell editing, dropdown
   cells, copy/paste, keyboard nav) at no license cost.
3. **Full CRUD** on all four entities (create, edit, delete).
4. **Live edits.** Every change re-serializes the affected source and calls the
   existing `loadFromText`, so the map (and canvas, on return) reflect edits
   immediately — the same round-trip the CodeDrawer already uses. No "save" button.
5. **Multi-file `rawSources`.** Viewer state currently holds only the map text in
   `rawSources[0]`. Phase 2 extends `rawSources` to hold **every** loaded source
   (the map + each datatable) with its text. The editor mutates the right source
   and re-serializes; export/share emit all of them. Backward compatible:
   single-file maps keep exactly one entry.
6. **Nodes tab is a split** (nodes have nested `context`). Left: the flat node
   grid (id, title, lane, phase, sub). Selecting a row opens a right-hand nested
   table for that node's nested fields, with a field selector
   (modules / states / meta) and a `<` connector marker on the divider aligned to
   the selected row. The `modules` nested table edits **feature-id refs** via a
   dropdown offering only ids that exist in the Features table; a resolved
   "name" column is read-only for confirmation.

## Scope

**In scope (Phase 2):**

- A full-screen Database view toggled from the header (new icon button), with the
  four entity tabs and "back to map".
- Glide Data Grid rendering each entity; inline cell editing; add-row; delete-row;
  live re-serialization → `loadFromText`.
- Multi-file `rawSources` refactor + threading through export/share.
- The Nodes split with the nested-field table and ref picker.
- Mode-valued columns (`today`/`tomorrow` on features, `mode` on states) edited via
  a dropdown cell sourced from `meta.modes`.

**Out of scope (Phase 2):**

- Editing the drawer **layout** (`meta.nodeTypes.<type>.layout`) — that is a
  primitive-tree editor, a separate effort.
- Editing edges (the graph wiring) — nodes/lanes/phases/features only; edges stay
  text-only in the CodeDrawer for now.
- Undo/redo across grid edits (the CodeDrawer already offers per-tab undo on the
  raw text; grid-level undo is a later iteration).
- Formulas / computed cells / validation rules beyond "ref must exist" and "mode
  must be a known mode id".
- CSV datatable **editing** round-trip fidelity beyond rows (comments/column order
  in a hand-authored CSV may not be preserved; JSON datatables round-trip fully).

## Architecture

The editor is a **new full-screen component tree** that reads the normalized map
+ the raw sources from viewer state, renders grids, and writes edits back through
one choke point: a small **edit-commit** module that mutates the correct raw
source's parsed object, re-serializes it to text, and calls
`viewer.loadFromText(...)` (or a new multi-source variant). The map schema,
resolver, normalize, NodeDrawer, and Canvas are **unchanged**.

```
Header "Database" button → dbOpen state in AppShell
      │
      ▼
<DatabasePanel open data=normalizedMap rawSources=[…] onCommit=…>
  ├── Tabs: Personas | Steps | Features | Nodes   (+ ← back to map)
  ├── <EntityGrid entity=… rows=… columns=… onEdit/onAdd/onDelete>   (Glide grid)
  └── Nodes tab → <NodeSplit>
        ├── left  <EntityGrid entity="nodes" …>
        └── right <NestedTable node=selected field=modules|states|meta …>
      │  (every edit →)
      ▼
editCommit(sourceName, mutateFn)
  1. find rawSources[i] by name (map or a datatable)
  2. parse its text → object, apply mutateFn(object)
  3. re-serialize → text  (JSON.stringify 2-space; YAML if the source was YAML)
  4. viewer.commitSource(i, newText)   ← re-parses, re-resolves refs, re-normalizes
      │
      ▼
existing load pipeline (resolveDatatableRefs → normalize) → canvas/map updated
```

### Units (each independently testable)

- **`deriveEntityRows(map, registry, entity)`** — pure. Given the map + datatable
  registry, produce `{ columns, rows }` for an entity. Lanes/phases/nodes come
  from the map; features come from the Features datatable's rows. Nodes rows are
  the flat columns only (id/title/lane/phase/sub).
- **`applyEntityEdit(source, entity, edit)`** — pure. Given a parsed source object,
  an entity, and an edit (`{op:'update'|'add'|'delete', id, field?, value?}`),
  return the new source object. Lane/phase/node edits mutate the **map** source;
  feature edits mutate the **features datatable** source; a node's `modules`/
  `states`/`meta` edits mutate that node's `context` in the map source.
- **`serializeSource(obj, lang)`** — pure. JSON (`JSON.stringify(obj, null, 2)`) or
  YAML (`js-yaml.dump`) depending on the source's original lang.
- **`EntityGrid`** — React wrapper around Glide Data Grid: maps `{columns, rows}` to
  Glide's cell API, emits `onEdit(rowId, field, value)`, `onAdd()`, `onDelete(rowId)`.
  Mode/ref columns render as dropdown cells.
- **`NestedTable`** — the Nodes-split right pane: given the selected node and a
  chosen nested field, render that field's rows (modules → ref rows; states →
  state objects; meta → label/value pairs) with the appropriate editors.
- **`DatabasePanel`** — composition: tabs, entity switching, the Nodes split, and
  wiring grid callbacks to `editCommit`.
- **State changes in `useViewerState`:** `rawSources` becomes multi-entry;
  add `commitSource(index, newText)` that re-runs the load pipeline (rebuild the
  registry from the current datatable sources, `resolveDatatableRefs`, `normalize`)
  and updates state. Backward compatible.

## Data flow: multi-file `rawSources`

Today `loadFromText` sets `rawSources: [{ name, text, lang }]` (one entry) and the
DnD path discards the datatable **texts** (keeping only a parsed `DatatableRegistry`).
Phase 2 changes loading so **every** source's text is retained:

- On DnD bundle load, `rawSources` = `[mapSource, ...datatableSources]` (each with
  name/text/lang). The registry is still built (for resolution) but is now
  **derived from** the datatable sources, so editing a datatable source and
  rebuilding the registry stays consistent.
- `getJsonText()` / ShareModal / download: for a single-source map, unchanged
  (emit the map). For a multi-source bundle, export emits all sources (e.g. a
  zip, or the map plus each datatable — exact packaging decided in the plan;
  minimum: the map text, with a documented note that datatables export
  alongside).
- `commitSource(i, text)` replaces `rawSources[i].text`, then re-runs
  parse → (rebuild registry from datatable sources) → `resolveDatatableRefs` →
  `normalize`, and updates `data`. This is the single write path the grid uses.

## Error handling

- **Invalid edit → invalid JSON/YAML:** grid edits are structured (we mutate
  objects, not text), so serialization always yields valid text. The re-parse in
  `commitSource` therefore won't fail on our own edits; if it somehow does, surface
  the existing `state.error` and keep the last good `data` (don't blank the view).
- **Broken ref after edit:** if a user points a node `modules` row at a feature id
  and later deletes that feature, the resolver already degrades to
  `{_unresolved:true,…}` (Phase 1) — the grid shows the raw id with an "unresolved"
  affordance rather than crashing. The `modules` picker only offers existing ids to
  avoid creating broken refs in the first place.
- **Delete with dependents:** deleting a lane/phase that nodes reference, or a
  feature that nodes reference, is allowed but **warns** with the count of
  referencing nodes (e.g. "3 nodes use this feature") before applying. No cascade
  in v1 — the map may contain a now-dangling reference, surfaced as above.
- **Mode column:** editing a `today`/`tomorrow`/`mode` cell offers only known
  `meta.modes` ids via dropdown; free-typing an unknown mode is allowed (normalize
  auto-discovers it) but flagged visually.

## Testing strategy

- **Unit (pure):** `deriveEntityRows` (each entity → correct columns/rows,
  features from registry, nodes flat-only); `applyEntityEdit` (update/add/delete
  for each entity routes to the correct source and shape; node modules/states/meta
  edits land in `context`); `serializeSource` (JSON 2-space + YAML round-trip).
- **State:** `commitSource` re-parses, rebuilds the registry from datatable
  sources, re-resolves, re-normalizes; a feature edit shows up resolved in a
  referencing node; multi-source `rawSources` preserved; single-source unaffected.
- **Component:** `EntityGrid` emits edit/add/delete callbacks; dropdown cells for
  modes/refs offer the right options; `NestedTable` switches fields and the
  `modules` picker lists only existing feature ids; the `<` marker aligns to the
  selected row.
- **Integration:** open Database → edit a feature name → the node drawer / canvas
  reflects it after commit; add a lane → it appears as a swimlane; delete a
  referenced feature → warning shown, ref degrades without crash.
- **Regression:** existing CodeDrawer edit path, share/export, and single-file
  load still work; the Phase-1 datatable suite stays green.

## Dependencies (a deliberate departure)

Phase 1's constraint was "no new runtime dependencies." Phase 2 **adds** them, on
purpose: `@glideapps/glide-data-grid` (MIT) plus its peer deps (`lodash`,
`marked`, `react-responsive-carousel`). This is the cost of a real spreadsheet
grid. Mitigation: the rich-cell peer deps (marked/carousel) aren't used by our
cell types; we lazy-load the Database panel so the grid + peers are **code-split**
out of the initial viewer bundle (the read-only viewer stays lean; the grid loads
only when the user opens Database). The plan must verify the code-split (grid not
in the main chunk).

## Risks

- **Bundle growth.** Mitigated by lazy-loading/code-splitting the Database panel
  (see above); verified in the plan by inspecting the build chunks.
- **Multi-source `rawSources` touching a core hook.** The refactor changes
  `useViewerState` state shape. Mitigated by keeping single-source behavior
  identical (one entry) and gating multi-source paths behind "more than one
  source present"; the existing hook tests must stay green.
- **CSV edit fidelity.** Editing a CSV datatable and re-serializing may lose
  hand-authored comments/column order. Documented as out-of-scope fidelity; JSON
  datatables (the Air Billing case) round-trip fully. The plan should prefer JSON
  for edited datatables.
- **Canvas hidden while editing.** Full-screen mode hides the canvas; on "back to
  map" the canvas re-renders from the committed `data`. Low risk since `data`
  updates live.
