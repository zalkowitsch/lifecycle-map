# Relational Datatables — Design

**Date:** 2026-06-14
**Status:** Approved, pending implementation

## Problem

Today, a lifecycle map's drawer data is **embedded inline** in each node's
`context` (we migrated the biller and interview maps this way: their feature/
rubric catalogs were resolved and copied into every referencing node). This is
self-contained — drag-and-drop a single file and it renders — but it
**duplicates** data: the biller's "User-editable billing rules" feature is
copied into every node that touches it, and editing the catalog means
re-resolving every node.

We want a **relational** option: separate **datatables** (one "table" of
entities per file), referenced by id from the lifecycle map *and* from other
datatables. Editing happens in one place; the app joins on load.

This must coexist with the inline model — the maps we already migrated stay
valid (they are simply "no datatables, already resolved").

## Decisions (locked during brainstorming)

1. **Formats: JSON + CSV now; SQL deferred.** SQLite-WASM (full query engine)
   needs COOP/COEP headers GitHub Pages can't set, is ~1MB+, and breaks on
   Safari <17 — it fights the single-file/zero-build/drag-and-drop nature of the
   viewer. SQL is documented as a *future* datatable source (read-only file →
   rows), decided when a real case appears. JSON and CSV cover the biller
   features case today.
2. **Two reference directions:** lifecycle → datatable, AND datatable →
   datatable (full relational, with cycle detection).
3. **Bundle on load:** drag/drop the lifecycle file together with its datatable
   files (or a `.zip`); the app joins locally. No fetch → no "Unknown" chips.
   URL/example loads may additionally fetch via a declared `src`.
4. **Hybrid reference syntax:** a lean string ref resolved via a per-column
   `_schema`, OR an explicit `{ table, id }` object for escape (heterogeneous
   columns / schema-less tables).

## Architecture

A pre-render resolution step (generalizing the existing `resolveExternalModules`)
turns referenced ids into resolved row objects in each node's `context`. The
lifecycle map and the NodeDrawer/primitive layer are **unchanged** — they keep
receiving an already-resolved `context`.

```
Bundle (dragged / zipped / fetched together)
├── lifecycle.json            ← nodes reference datatable rows by id
├── features.datatable.json   ← rows keyed by id, optional _schema
├── people.datatable.csv      ← CSV → same in-memory rows shape
└── wedges.datatable.json
         ↑ datatable rows may reference rows of other datatables

On load:
1. Collect all bundle files.
2. parseDatatable(text, format) → { name, schema, rows }   (JSON or CSV → same shape)
3. DatatableRegistry indexes tables by name → getRow(table, id)
4. resolveDatatableRefs walks each node's ref fields → rows, then resolves
   refs *inside* those rows (bounded depth, cycle-safe) → writes resolved
   objects into node.context
5. NodeDrawer renders context via meta.nodeTypes (unchanged)
```

### Units (each independently testable)

- **`parseDatatable(text, format)`** → `{ name, schema, rows }`. Pure. JSON and
  CSV produce the **same** output shape.
- **`DatatableRegistry`** — indexes parsed tables by name; `getRow(table, id)`.
- **`resolveRefs(value, registry, ctx)`** — follows hybrid refs, bounded depth,
  cycle-safe. Pure (no I/O).
- **`loadBundle(files)`** — multi-file / zip → `{ lifecycle, registry }`.
- **`resolveDatatableRefs(map, registry)`** — glue: resolves node ref fields
  before render. The generalized successor to `resolveExternalModules`.

## Datatable format

### JSON (canonical)

```jsonc
{
  "_meta":   { "name": "features" },
  "_schema": { "owner": { "ref": "people" }, "wedge": { "ref": "wedges" } },
  "rows": {
    "air-billing-bre-main": {
      "name": "User-editable billing rules",
      "today": "Customer Ops", "tomorrow": "Self-Serve",
      "owner": "jake-p", "wedge": "wedge-3",
      "tags": ["Top wedge"]
    }
  }
}
```

- `_meta.name` — table name used in refs. Fallback: filename without extension
  (`features.datatable.json` → `features`). Explicit wins.
- `_schema` — optional. Maps a column → `{ ref: "<tableName>" }`. Only FK columns
  appear. No schema = no outgoing refs (still referenceable from outside).
- `rows` — dict keyed by id (O(1) lookup; matches the biller's existing shape).

### CSV

```csv
id,name,today,tomorrow,owner,wedge,tags
air-billing-bre-main,User-editable billing rules,Customer Ops,Self-Serve,jake-p,wedge-3,Top wedge
```

- First column `id` → row key. Other columns → fields.
- CSV cannot embed `_schema`; its schema is declared in the lifecycle map under
  `meta.datatables.<name>.schema`.
- A cell becomes an **array** (split on `;`) **only** when the schema/convention
  declares that column a list — otherwise it stays a string (never split text
  that legitimately contains `;`).
- CSV is flat/tabular (no nesting). Use JSON for nested data.

## Reference syntax & resolver

A reference is one of two forms (hybrid):

```jsonc
"owner": "jake-p"                              // string → resolved via _schema.owner.ref
"related": { "table": "teams", "id": "billing-core" }  // explicit object (ignores schema)
```

**Resolver rule (per field value):**

1. Value is `{ table, id }` object → resolve directly (escape; works without
   schema; supports heterogeneous columns).
2. Value is a string AND the column has `_schema.<col>.ref` → resolve the string
   as a row id in that table.
3. Value is an array → apply the rule per element (list refs, e.g. `modules`).
4. Otherwise → literal. **No schema and not a `{table,id}` object = not a ref.**
   Plain text is never mistaken for a reference.

**Resolution = in-place substitution.** A resolved ref field becomes the target
**row object** (e.g. `owner` becomes `{ name, role, ... }`), so a layout can bind
`$owner.name`.

**Depth & cycles:**

- Recursive with a depth cap (**default 3**) and a `seen` set of `(table:id)` on
  the current path.
- Resolving a `feature` resolves its ref fields (`owner`, `wedge`); resolving
  `owner` (a people row) resolves *its* ref fields, up to the cap.
- **Cycle** (`feature → owner → team → feature`): when a `(table:id)` reappears
  on the path, stop that branch and leave the ref as an unexpanded
  `{ table, id }` + `console.warn`. ("Warn + degrade, never crash" — same
  philosophy as the drawer's recursion guard.)
- **Cap reached:** same — stop the branch, keep the raw ref, warn.
- **Broken ref** (id absent in table): resolve to
  `{ _unresolved: true, table, id }` + warn, so a layout can surface the raw id
  instead of silently vanishing.

`resolveRefs(value, registry, ctx)` where `ctx = { schema, depth: 0, maxDepth: 3,
seen: Set }`. No I/O. Tests: cycle truncates, cap respected, broken ref flagged,
both hybrid forms (string+schema, object) resolve.

## Lifecycle → datatable wiring

```jsonc
"meta": {
  "datatables": {
    "features": { "schema": { "owner": { "ref": "people" }, "wedge": { "ref": "wedges" } } },
    "people":   {},
    "wedges":   {}
  }
}
```

- JSON datatables carry their own `_schema`; `meta.datatables` just lists the
  name (or omits it if the bundle supplies the file).
- CSV datatables declare their schema here (CSV can't embed it).
- A node references rows as it does today — `"modules": ["air-billing-bre-main"]`.
  Which context fields are refs (and into which table) is declared **once** per
  nodeType, under `meta.nodeTypes.<type>.contextRefs`, e.g.
  `"contextRefs": { "modules": { "ref": "features" } }`. This is the node-side
  analog of a datatable's `_schema`: the resolver reads it to know that
  `context.modules` strings are `features` row ids. (Without a `contextRefs`
  entry, a context field is only a ref if it uses the explicit `{table,id}`
  form.) The resolver injects resolved rows into `context` before render; the
  drawer is unchanged.
- `meta.datatables.<name>.src: "./features.json"` enables fetch on URL/example
  loads (reusing the generalized `resolveExternalModules`).

## Bundle loading

- **Multi-file drag-and-drop:** generalize the existing `mergeDroppedFiles`. The
  file with `nodes` is the lifecycle; the rest are datatables (keyed by
  `_meta.name`/filename). Build the registry, resolve, render. Kills "Unknown"
  with no fetch.
- **Zip:** a dragged `.zip` is unzipped client-side (pako / `vendor-compress`
  already bundled) and treated as the multi-file bundle. Mobile-friendly (one
  file).
- **URL/example:** `meta.datatables.<t>.src` permits fetch when served.

## Coexistence with the inline model

The inline maps we already migrated (biller, interview) **stay valid** — they are
the "no datatables, already resolved" case. The resolver acts only when there are
unresolved refs *and* a registry. Inline and relational coexist; the user chooses
per map. The biller can move **back** to relational (`features.json` is already a
datatable minus the `_meta`/`rows` wrapper), trading the self-contained property
for DRY.

## Out of scope

- SQL/SQLite datatables (deferred; documented as a future source).
- A query language over datatables (refs only, not filters/joins-as-queries).
- Writing/editing datatables in the viewer (read-only resolution).
- Deep ref expansion beyond the depth cap (default 3, configurable).

## Testing strategy

Unit tests per pure unit (`parseDatatable` JSON+CSV parity; `resolveRefs` cycle/
cap/broken/hybrid; `DatatableRegistry` lookup). Integration: a bundle (lifecycle
+ JSON datatable + CSV datatable with a datatable→datatable ref) loaded through
`loadBundle` → `resolveDatatableRefs` → rendered NodeDrawer, asserting resolved
row data appears and a deliberate cycle/broken ref degrades without crashing.
Keep fixtures generic (no proprietary content in the repo).
