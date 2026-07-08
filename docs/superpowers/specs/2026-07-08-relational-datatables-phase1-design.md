# Relational Datatables — Phase 1 (Implementation) — Design

**Date:** 2026-07-08
**Status:** Approved, pending implementation
**Realizes:** [`2026-06-14-relational-datatables-design.md`](./2026-06-14-relational-datatables-design.md)

## Why now

The user wants a **"database" view** in the viewer — editable lists of features,
personas (lanes), and steps (phases/nodes) — so the lifecycle map can be edited
structurally (add a persona, edit a step, …), and, crucially, so entities can be
**referenced** from a node's content instead of copied into it.

"Referenceable entities" *is* the relational model. An approved design for it
already exists (June 14) but was never implemented — today everything is
**inline** (each node's `context` embeds its own copy of modules/states), and its
"Out of scope" line explicitly deferred *editing datatables in the viewer*.

So the work splits into two phases, each its own spec → plan → implementation
cycle:

- **Phase 1 (this spec):** implement the relational resolver from the June design
  and migrate Air Billing to it — the read/resolve foundation. Delivers
  referenceable entities.
- **Phase 2 (later spec):** the "Database" editor panel — a viewer tab that lists
  and edits those datatables, edits in memory, persists via the existing
  export/share paths. Depends on Phase 1's registry as its data model.

This spec is Phase 1. Phase 2 is sketched only enough to prove Phase 1 doesn't
paint it into a corner (see "Phase 2 seam").

## Scope

**In scope (Phase 1):**

1. The five pure units from the June design: `parseDatatable`,
   `DatatableRegistry`, `resolveRefs`, `loadBundle`, `resolveDatatableRefs`.
2. Wiring them into the **two existing resolution seams** without breaking either
   or the already-inline maps:
   - URL/example/fetch load (`loadFromExample`, `loadFromText` with `baseUrl`),
     where `resolveExternalModules` runs today.
   - Drag-and-drop bundle (`mergeDroppedFiles`), where multi-file merge runs today.
3. Migrating **Air Billing** to relational: `features.json` → datatable format;
   `biller-lifecycle.json` nodes reference features by id via
   `meta.nodeTypes.stage.contextRefs`.

**Out of scope (Phase 1):**

- The Database editor UI (Phase 2).
- SQL/SQLite datatables (deferred by the June design).
- A query language over datatables (refs only).
- Migrating personas/wedges to datatables (can follow later with no rework —
  Air Billing already proves the mechanism on `features`).

## Architecture

A **pre-render resolution step** turns referenced ids into resolved row objects
inside each node's `context`, *before* `normalize()`. The map schema, `normalize`,
NodeDrawer, and the primitive layer are **unchanged** — they keep receiving an
already-resolved `context` full of plain objects, exactly as the inline maps
produce today.

This ordering is load-bearing. `normalize()` (in `useViewerState.ts`) reads
`m.today`/`m.tomorrow` off each module **object** to auto-discover modes. If a
module were still a string id at that point, its modes wouldn't register. So the
resolver must run **before** `normalize`, at the same two seams where
`resolveExternalModules` runs today (verified: `useViewerState.ts` lines ~190,
~216 for fetch; ~262 for DnD).

```
Load (URL bundle / dragged files / zip)
      │
      ▼
1. Collect all source files.
2. parseDatatable(text, format) → { name, schema, rows }   (JSON or CSV → same shape)
3. DatatableRegistry indexes tables by name → getRow(table, id)
4. resolveDatatableRefs(map, registry) walks each node's ref fields (declared in
   meta.nodeTypes.<type>.contextRefs) → substitutes resolved row objects into
   node.context; resolves refs *inside* those rows (bounded depth, cycle-safe).
      │
      ▼
5. normalize(resolvedMap)         ← UNCHANGED (now sees plain objects, as before)
6. NodeDrawer renders via meta.nodeTypes  ← UNCHANGED
```

### Units (each independently testable, all pure except `loadBundle` I/O)

- **`parseDatatable(text, format)` → `{ name, schema, rows }`.** Pure. JSON and
  CSV produce the *same* output shape. JSON reads `_meta.name`, `_schema`, and the
  rows dict (`rows`, or the legacy `features`/`modules` key). **String-valued
  entries are dropped** — the existing `features.json` interleaves comment markers
  (e.g. `"_comment_air_billing_rules": "==== … ===="`) among the rows, and only
  object entries are real rows (matches today's `extractModules`/`mergeDroppedFiles`
  tolerance). CSV: first column `id` → row key; schema comes from the map
  (`meta.datatables`); a cell splits on `;` into an array **only** when its column
  is schema-declared a list.
- **`DatatableRegistry`** — indexes parsed tables by name; `getRow(table, id)`
  O(1). Built from all datatables in a bundle.
- **`resolveRefs(value, registry, ctx)`** — the hybrid resolver. `ctx = { schema,
  depth, maxDepth: 3, seen: Set<"table:id"> }`. Rules (from June design):
  1. `{ table, id }` object → resolve directly (escape hatch, schema-free).
  2. string + column has `schema.<col>.ref` → resolve as row id in that table.
  3. array → apply per element (list refs, e.g. `modules`).
  4. else → literal (plain text is never a ref).
  Resolution is **in-place substitution**: the ref field *becomes* the target row
  object, so a layout can later bind `$owner.name`. Degrade, never crash:
  cycle → stop branch, keep raw `{table,id}`, `console.warn`; cap reached → same;
  broken ref → `{ _unresolved: true, table, id }` + warn.
- **`loadBundle(files)` → `{ lifecycle, registry }`.** The only I/O unit.
  Multi-file / zip → identify the lifecycle file (the one with `nodes`), parse the
  rest as datatables, build the registry. Generalizes `mergeDroppedFiles`.
- **`resolveDatatableRefs(map, registry)` → resolved map.** Glue. For each node,
  reads `meta.nodeTypes[node.type].contextRefs` to know which `context` fields are
  refs and into which table, then calls `resolveRefs` on them. The generalized
  successor to `resolveExternalModules`. When there are no refs / no registry, it
  is a no-op returning the same map — this is how inline maps stay valid.

## Data formats

Canonical shapes are fixed by the June design (§ "Datatable format",
§ "Reference syntax"). Summary for implementation:

**JSON datatable:**
```jsonc
{
  "_meta":   { "name": "features" },
  "_schema": { "owner": { "ref": "people" } },   // optional; only FK columns
  "rows": { "<id>": { "name": "…", "today": "…", "owner": "jake-p" } }
}
```

**CSV datatable:** first column `id`; other columns are fields; schema declared in
the map (`meta.datatables.<name>.schema`) since CSV can't embed `_schema`.

**Node-side ref declaration** (the node analog of `_schema`), declared once per
node type:
```jsonc
"meta": {
  "nodeTypes": { "stage": { "layout": [ … ], "contextRefs": { "modules": { "ref": "features" } } } },
  "datatables": { "features": { "schema": { … } } }   // lists tables; src for fetch
}
```
Without a `contextRefs` entry, a context field is a ref **only** via the explicit
`{table,id}` form.

## Air Billing migration (the Phase 1 proof)

The user's real map moves from inline to relational, proving the flow end-to-end
and killing the duplication (a feature is edited in one place, not per node):

1. **`features.json` → datatable.** It is already a dict of feature defs keyed by
   id under `features`. Add `_meta.name: "features"`; the per-id entries stay as
   the rows dict (`parseDatatable` accepts the legacy `features` key as `rows` and
   drops the interleaved `_comment_*` string markers, matching the existing
   `extractModules` tolerance). No manual stripping of comments needed.
2. **`biller-lifecycle.json` nodes reference by id.** Each node's
   `context.modules` becomes an array of **feature ids** (strings) instead of
   inline objects. Add `meta.nodeTypes.stage.contextRefs = { "modules": { "ref":
   "features" } }` and `meta.datatables.features` so the resolver knows to expand
   them.
3. **Rendering is unchanged.** After resolution, `context.modules` is again an
   array of objects with `name`/`today`/`tomorrow`/`levels`/`tags`, so the
   existing `stage` layout (`List` → `Tile`) and `normalize`'s mode discovery work
   exactly as they do on the current inline file.
4. **Loading.** In `workspace/air-billing/`, drop `biller-lifecycle.json` +
   `features.json` together (multi-file DnD → `loadBundle`). The README is updated
   to describe the relational bundle. The pre-migration inline file is preserved
   in git history; the workspace copies are git-ignored already.

The `states` array stays inline (it is per-node, not a shared entity), so only
`modules` becomes a ref in Phase 1.

## Coexistence & backward compatibility

- **Inline maps stay valid.** `resolveDatatableRefs` acts only when a node field
  is an unresolved ref (string id with a `contextRefs`/`_schema` entry, or a
  `{table,id}` object) *and* a registry exists. The already-migrated inline maps
  (interview loop, the pre-migration biller) have object modules and no
  `contextRefs`, so the resolver is a no-op for them.
- **Single-file drop unaffected.** `loadBundle` with one file = the lifecycle,
  empty registry, no-op resolve — same as today.
- **`resolveExternalModules` / `mergeDroppedFiles`** are generalized, not deleted;
  their current single-catalog behavior is a special case of the registry path.
  Their existing tests must still pass.

## Phase 2 seam (sketch, not built here)

The Database editor (Phase 2) will read/write the **same registry + map**:
list features from the registry, list lanes/phases/nodes from the map, edit them
in memory (like the CodeDrawer's live-parse edit path), and persist via the
existing download/share. Phase 1 must therefore keep the registry and the
map-with-refs both available in viewer state after load (not discard the registry
post-resolution) so Phase 2 can surface tables without re-parsing. Concretely:
Phase 1 stashes the parsed registry alongside `rawSources` in `ViewerState`.
No editor code, no UI, no new tab in Phase 1 — only this data availability.

## Testing strategy

Per the June design, plus the migration:

- **Unit:** `parseDatatable` JSON+CSV parity (same shape); JSON parse **drops
  `_comment_*` string markers** and keeps only object rows; `resolveRefs`
  cycle-truncates / cap-respected / broken-ref-flagged / both hybrid forms
  resolve; `DatatableRegistry` lookup; `loadBundle` identifies lifecycle vs
  datatables.
- **Integration:** a generic fixture bundle (lifecycle + JSON datatable + CSV
  datatable with a datatable→datatable ref) through `loadBundle` →
  `resolveDatatableRefs` → rendered NodeDrawer, asserting resolved row data
  appears and a deliberate cycle/broken ref degrades without crashing. Fixtures
  are generic (no proprietary content).
- **Regression:** existing `resolveModules`, `mergeDroppedFiles`,
  `typed-stage-map`, and normalize tests still pass unchanged.
- **Air Billing:** a workspace-local check (not in the repo test suite, since the
  data is git-ignored) that the migrated bundle renders the same drawer content as
  the pre-migration inline file — objective, module names, colored modes, no
  unresolved `$bindings` and no "Unknown".

## Risks

- **`normalize` ordering.** If resolution runs after `normalize`, modes from
  referenced modules won't be discovered. Mitigation: resolver runs before
  `normalize` at both seams; a regression test asserts a referenced module's
  `tomorrow` mode appears colored.
- **CSV list ambiguity.** Splitting `;` in non-list columns would corrupt text.
  Mitigation: split only schema-declared list columns (June rule), covered by a
  unit test with a `;`-containing text cell.
- **Registry retained in state.** Keeping the registry for Phase 2 slightly grows
  viewer state. Acceptable; it is the parsed datatables already in memory.
