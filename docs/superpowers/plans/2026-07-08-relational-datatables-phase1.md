# Relational Datatables — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a lifecycle map reference shared entities (features) by id from separate "datatable" files that resolve into each node's `context` on load, and migrate Air Billing onto it.

**Architecture:** A pre-render resolution step turns referenced ids into resolved row objects inside each node's `context`, *before* `normalize()`. Five small units — `parseDatatable`, `DatatableRegistry`, `resolveRefs`, `loadBundle`, `resolveDatatableRefs` — plus wiring into the two existing load seams (fetch + drag-drop). The map schema, `normalize`, and NodeDrawer stay unchanged; inline maps remain valid (resolver is a no-op without refs).

**Tech Stack:** TypeScript, React, Vitest, `js-yaml` (already used by `parseSource`). No new dependencies — CSV is hand-rolled (flat/tabular); zip is deferred.

**Spec:** [`docs/superpowers/specs/2026-07-08-relational-datatables-phase1-design.md`](../specs/2026-07-08-relational-datatables-phase1-design.md), realizing [`2026-06-14-relational-datatables-design.md`](../specs/2026-06-14-relational-datatables-design.md).

## Global Constraints

- **No new runtime dependencies.** CSV parsing is hand-rolled; zip is out of scope for Phase 1.
- **Resolver runs before `normalize()`** at every load seam — `normalize()` discovers modes off resolved module *objects*, so refs must already be substituted.
- **Degrade, never crash.** Cycle / depth-cap / broken ref → keep a raw marker + `console.warn`; never throw.
- **Backward compatible.** Inline maps (object modules, no `contextRefs`) resolve to a no-op. Existing tests for `resolveModules`, `mergeDroppedFiles`, `normalize`, `typed-stage-map` must still pass.
- **Ref depth cap default 3**, configurable via `ctx.maxDepth`.
- **Tests offline & generic.** Inject fetch; fixtures carry no proprietary content.
- **Plain text is never a ref.** A context field is a ref only via a `contextRefs`/`_schema` entry (string form) or an explicit `{table,id}` object.

---

## File Structure

- `src/lib/datatables/parseDatatable.ts` — parse JSON/CSV text → `{ name, schema, rows }`. Pure.
- `src/lib/datatables/registry.ts` — `DatatableRegistry` class: index tables by name, `getRow`.
- `src/lib/datatables/resolveRefs.ts` — hybrid ref resolver, bounded depth, cycle-safe. Pure.
- `src/lib/datatables/resolveDatatableRefs.ts` — glue: walk node `context` ref fields via `contextRefs`, substitute rows. Pure.
- `src/lib/datatables/loadBundle.ts` — multi-file `{name,text}[]` → `{ lifecycleText, lifecycleName, registry, mergedCount }`. Generalizes `mergeDroppedFiles`.
- `src/lib/datatables/types.ts` — shared TS types (`Datatable`, `DatatableSchema`, `ResolveCtx`).
- `src/types/lifecycle-map.ts` — MODIFY: add `datatables?` to `MapMeta`, `contextRefs?` to nodeType entries.
- `src/hooks/useViewerState.ts` — MODIFY: call the resolver before `normalize()` on the fetch and DnD seams.
- Test files alongside each unit (`*.test.ts`), plus one integration test and fixtures under `src/lib/datatables/__fixtures__/`.

---

### Task 1: Datatable types + `parseDatatable`

**Files:**
- Create: `src/lib/datatables/types.ts`
- Create: `src/lib/datatables/parseDatatable.ts`
- Test: `src/lib/datatables/parseDatatable.test.ts`

**Interfaces:**
- Consumes: `parseSource` from `@/lib/parseSource` (JSON/YAML parse).
- Produces:
  - `interface DatatableSchema { [column: string]: { ref: string } }`
  - `interface Datatable { name: string; schema: DatatableSchema; rows: Record<string, Record<string, unknown>> }`
  - `parseDatatable(text: string, opts?: { name?: string; format?: 'json' | 'csv'; schema?: DatatableSchema }): Datatable`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/datatables/parseDatatable.test.ts
import { describe, expect, it } from 'vitest';
import { parseDatatable } from '@/lib/datatables/parseDatatable';

describe('parseDatatable — JSON', () => {
  it('reads _meta.name, _schema, and rows', () => {
    const text = JSON.stringify({
      _meta: { name: 'features' },
      _schema: { owner: { ref: 'people' } },
      rows: { f1: { name: 'Rules', owner: 'jake' } },
    });
    const dt = parseDatatable(text, { format: 'json' });
    expect(dt.name).toBe('features');
    expect(dt.schema).toEqual({ owner: { ref: 'people' } });
    expect(dt.rows.f1).toEqual({ name: 'Rules', owner: 'jake' });
  });

  it('accepts the legacy `features` key as rows and drops string comment markers', () => {
    const text = JSON.stringify({
      features: {
        _comment_x: '==== marker ====',
        f1: { name: 'Rules' },
      },
    });
    const dt = parseDatatable(text, { format: 'json', name: 'features' });
    expect(dt.rows.f1).toEqual({ name: 'Rules' });
    expect(dt.rows._comment_x).toBeUndefined();
  });

  it('falls back to the opts.name when _meta.name is absent', () => {
    const dt = parseDatatable(JSON.stringify({ rows: {} }), { format: 'json', name: 'wedges' });
    expect(dt.name).toBe('wedges');
  });
});

describe('parseDatatable — CSV', () => {
  it('uses first column `id` as row key, other columns as fields', () => {
    const text = 'id,name,today\nf1,Rules,Manual\nf2,Posting,Auto';
    const dt = parseDatatable(text, { format: 'csv', name: 'features' });
    expect(dt.rows.f1).toEqual({ name: 'Rules', today: 'Manual' });
    expect(dt.rows.f2).toEqual({ name: 'Posting', today: 'Auto' });
  });

  it('splits a cell into an array only for schema-declared list columns', () => {
    const text = 'id,name,tags\nf1,Rules,a;b;c';
    const listSchema = { tags: { ref: '__list__' } };
    const dt = parseDatatable(text, { format: 'csv', name: 'features', schema: listSchema });
    // tags declared a list -> split; name not -> kept as string even if it had ';'
    expect(dt.rows.f1.tags).toEqual(['a', 'b', 'c']);
    expect(dt.rows.f1.name).toBe('Rules');
  });

  it('does NOT split a non-list column containing a semicolon', () => {
    const text = 'id,note\nf1,see: a; then b';
    const dt = parseDatatable(text, { format: 'csv', name: 't' });
    expect(dt.rows.f1.note).toBe('see: a; then b');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/datatables/parseDatatable.test.ts`
Expected: FAIL — `Cannot find module '@/lib/datatables/parseDatatable'`.

- [ ] **Step 3: Write the types**

```typescript
// src/lib/datatables/types.ts

/** A column marked as a foreign key (or, by convention, a list) in a datatable. */
export interface DatatableSchema {
  [column: string]: { ref: string };
}

/** A parsed datatable: rows keyed by id, plus its name and FK schema. */
export interface Datatable {
  name: string;
  schema: DatatableSchema;
  rows: Record<string, Record<string, unknown>>;
}

/** Resolution context threaded through resolveRefs. */
export interface ResolveCtx {
  schema: DatatableSchema;
  depth: number;
  maxDepth: number;
  seen: Set<string>;
}
```

- [ ] **Step 4: Write minimal implementation**

```typescript
// src/lib/datatables/parseDatatable.ts
import { parseSource } from '@/lib/parseSource';
import type { Datatable, DatatableSchema } from './types';

export interface ParseDatatableOpts {
  name?: string;
  format?: 'json' | 'csv';
  /** For CSV (which can't embed _schema): declares list/ref columns. */
  schema?: DatatableSchema;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function parseJson(text: string, opts: ParseDatatableOpts): Datatable {
  const raw = parseSource(text) as unknown as Record<string, unknown>;
  const meta = isObject(raw._meta) ? raw._meta : {};
  const name = (typeof meta.name === 'string' && meta.name) || opts.name || 'table';
  const schema = (isObject(raw._schema) ? raw._schema : opts.schema ?? {}) as DatatableSchema;
  // rows may live under `rows` (canonical) or a legacy `features`/`modules` key.
  const rowsSrc =
    (isObject(raw.rows) && raw.rows) ||
    (isObject(raw.features) && raw.features) ||
    (isObject(raw.modules) && raw.modules) ||
    {};
  const rows: Record<string, Record<string, unknown>> = {};
  for (const [id, def] of Object.entries(rowsSrc)) {
    if (isObject(def)) rows[id] = def; // drop string comment markers
  }
  return { name, schema, rows };
}

/** Split a single CSV line into cells, honoring double-quote quoting. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

function parseCsv(text: string, opts: ParseDatatableOpts): Datatable {
  const schema = opts.schema ?? {};
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter((l) => l.trim() !== '');
  const rows: Record<string, Record<string, unknown>> = {};
  if (lines.length === 0) return { name: opts.name || 'table', schema, rows };
  const headers = splitCsvLine(lines[0]);
  for (let r = 1; r < lines.length; r++) {
    const cells = splitCsvLine(lines[r]);
    const id = cells[0];
    if (!id) continue;
    const row: Record<string, unknown> = {};
    for (let c = 1; c < headers.length; c++) {
      const col = headers[c];
      const val = cells[c] ?? '';
      // split into a list ONLY when the column is schema-declared.
      row[col] = schema[col] ? val.split(';').map((s) => s.trim()) : val;
    }
    rows[id] = row;
  }
  return { name: opts.name || 'table', schema, rows };
}

export function parseDatatable(text: string, opts: ParseDatatableOpts = {}): Datatable {
  return opts.format === 'csv' ? parseCsv(text, opts) : parseJson(text, opts);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/datatables/parseDatatable.test.ts`
Expected: PASS (all cases).

- [ ] **Step 6: Commit**

```bash
git add src/lib/datatables/types.ts src/lib/datatables/parseDatatable.ts src/lib/datatables/parseDatatable.test.ts
git commit -m "feat(datatables): parseDatatable (JSON+CSV) with shared row shape"
```

---

### Task 2: `DatatableRegistry`

**Files:**
- Create: `src/lib/datatables/registry.ts`
- Test: `src/lib/datatables/registry.test.ts`

**Interfaces:**
- Consumes: `Datatable` from `./types`.
- Produces:
  - `class DatatableRegistry { constructor(tables?: Datatable[]); add(t: Datatable): void; getRow(table: string, id: string): Record<string, unknown> | undefined; has(table: string): boolean; get size(): number }`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/datatables/registry.test.ts
import { describe, expect, it } from 'vitest';
import { DatatableRegistry } from '@/lib/datatables/registry';
import type { Datatable } from '@/lib/datatables/types';

const features: Datatable = {
  name: 'features',
  schema: {},
  rows: { f1: { name: 'Rules' } },
};

describe('DatatableRegistry', () => {
  it('indexes tables by name and looks rows up by id', () => {
    const reg = new DatatableRegistry([features]);
    expect(reg.getRow('features', 'f1')).toEqual({ name: 'Rules' });
    expect(reg.has('features')).toBe(true);
    expect(reg.size).toBe(1);
  });

  it('returns undefined for a missing table or id', () => {
    const reg = new DatatableRegistry([features]);
    expect(reg.getRow('people', 'x')).toBeUndefined();
    expect(reg.getRow('features', 'nope')).toBeUndefined();
  });

  it('add() registers a table after construction', () => {
    const reg = new DatatableRegistry();
    reg.add(features);
    expect(reg.getRow('features', 'f1')).toEqual({ name: 'Rules' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/datatables/registry.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/lib/datatables/registry.ts
import type { Datatable } from './types';

/** Indexes parsed datatables by name for O(1) row lookup. */
export class DatatableRegistry {
  private tables = new Map<string, Datatable>();

  constructor(tables: Datatable[] = []) {
    for (const t of tables) this.add(t);
  }

  add(t: Datatable): void {
    this.tables.set(t.name, t);
  }

  has(table: string): boolean {
    return this.tables.has(table);
  }

  getRow(table: string, id: string): Record<string, unknown> | undefined {
    return this.tables.get(table)?.rows[id];
  }

  getSchema(table: string): Datatable['schema'] | undefined {
    return this.tables.get(table)?.schema;
  }

  get size(): number {
    return this.tables.size;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/datatables/registry.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/datatables/registry.ts src/lib/datatables/registry.test.ts
git commit -m "feat(datatables): DatatableRegistry (index by name, getRow)"
```

---

### Task 3: `resolveRefs` — hybrid, bounded, cycle-safe

**Files:**
- Create: `src/lib/datatables/resolveRefs.ts`
- Test: `src/lib/datatables/resolveRefs.test.ts`

**Interfaces:**
- Consumes: `DatatableRegistry` (Task 2); `ResolveCtx`, `DatatableSchema` from `./types`.
- Produces:
  - `resolveRefs(value: unknown, registry: DatatableRegistry, ctx: ResolveCtx): unknown`
  - `const DEFAULT_MAX_DEPTH = 3`

Resolution rules (from spec): `{table,id}` object → resolve directly; string + `ctx.schema[col].ref` → resolve as row id (the *caller* sets `ctx.schema` to the row's own schema when recursing; the *field* being a ref is decided by the caller passing the matching schema — see note below); array → per element; else literal. On resolve, substitute the row object and recurse into ITS ref fields using that table's schema, incrementing depth and tracking `seen`.

> **Note on the string-form contract.** `resolveRefs` decides a *string* is a ref only when told which table via a schema keyed by the field. To keep the unit pure and simple, the entry point resolves a single **field value** given the ref target table name. We expose two helpers: `resolveFieldValue(value, refTable, registry, ctx)` for a known target table (used by the glue in Task 4), and internal recursion that consults `registry.getSchema(table)` for a resolved row's own outgoing refs.

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/datatables/resolveRefs.test.ts
import { describe, expect, it, vi } from 'vitest';
import { DatatableRegistry } from '@/lib/datatables/registry';
import { resolveFieldValue, DEFAULT_MAX_DEPTH } from '@/lib/datatables/resolveRefs';
import type { Datatable } from '@/lib/datatables/types';

function reg(...tables: Datatable[]) {
  return new DatatableRegistry(tables);
}
const ctx = () => ({ depth: 0, maxDepth: DEFAULT_MAX_DEPTH, seen: new Set<string>(), schema: {} });

describe('resolveFieldValue', () => {
  it('resolves a string id against the given target table', () => {
    const r = reg({ name: 'features', schema: {}, rows: { f1: { name: 'Rules' } } });
    expect(resolveFieldValue('f1', 'features', r, ctx())).toEqual({ name: 'Rules' });
  });

  it('resolves an array of string ids per element', () => {
    const r = reg({ name: 'features', schema: {}, rows: { f1: { name: 'A' }, f2: { name: 'B' } } });
    expect(resolveFieldValue(['f1', 'f2'], 'features', r, ctx())).toEqual([{ name: 'A' }, { name: 'B' }]);
  });

  it('resolves an explicit {table,id} object ignoring the target table', () => {
    const r = reg({ name: 'people', schema: {}, rows: { jake: { role: 'Eng' } } });
    expect(resolveFieldValue({ table: 'people', id: 'jake' }, 'features', r, ctx())).toEqual({ role: 'Eng' });
  });

  it('recurses into a resolved row\'s own ref columns via its schema', () => {
    const r = reg(
      { name: 'features', schema: { owner: { ref: 'people' } }, rows: { f1: { name: 'Rules', owner: 'jake' } } },
      { name: 'people', schema: {}, rows: { jake: { role: 'Eng' } } },
    );
    expect(resolveFieldValue('f1', 'features', r, ctx())).toEqual({
      name: 'Rules',
      owner: { role: 'Eng' },
    });
  });

  it('flags a broken ref and warns, without throwing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const r = reg({ name: 'features', schema: {}, rows: {} });
    expect(resolveFieldValue('missing', 'features', r, ctx())).toEqual({
      _unresolved: true, table: 'features', id: 'missing',
    });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('truncates a cycle: feature -> owner -> team -> feature', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const r = reg(
      { name: 'features', schema: { owner: { ref: 'people' } }, rows: { f1: { owner: 'jake' } } },
      { name: 'people', schema: { team: { ref: 'teams' } }, rows: { jake: { team: 't1' } } },
      { name: 'teams', schema: { lead: { ref: 'features' } }, rows: { t1: { lead: 'f1' } } },
    );
    const out = resolveFieldValue('f1', 'features', r, ctx()) as any;
    // f1 -> owner(jake) -> team(t1) -> lead(f1) : f1 already seen -> left as raw ref
    expect(out.owner.team.lead).toEqual({ table: 'features', id: 'f1' });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('respects the depth cap', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const r = reg(
      { name: 'a', schema: { next: { ref: 'a' } }, rows: {
        x1: { next: 'x2' }, x2: { next: 'x3' }, x3: { next: 'x4' }, x4: { name: 'deep' },
      } },
    );
    const shallow = { depth: 0, maxDepth: 1, seen: new Set<string>(), schema: {} };
    const out = resolveFieldValue('x1', 'a', r, shallow) as any;
    // depth 1 resolves x1; x2 is at the cap -> left raw
    expect(out.next).toEqual({ table: 'a', id: 'x2' });
    warn.mockRestore();
  });

  it('leaves a plain non-ref value (no target table) as a literal', () => {
    const r = reg();
    expect(resolveFieldValue('just text', undefined, r, ctx())).toBe('just text');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/datatables/resolveRefs.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/lib/datatables/resolveRefs.ts
import type { DatatableRegistry } from './registry';
import type { ResolveCtx } from './types';

export const DEFAULT_MAX_DEPTH = 3;

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isExplicitRef(v: unknown): v is { table: string; id: string } {
  return isObject(v) && typeof v.table === 'string' && typeof v.id === 'string'
    && Object.keys(v).length === 2;
}

/**
 * Resolve one field value that MAY be a reference into `refTable`.
 * - `{table,id}` object → resolve directly (ignores refTable).
 * - string + refTable given → resolve as a row id in refTable.
 * - array → per element.
 * - otherwise → literal (returned as-is).
 * Degrades (raw marker + warn) on broken ref, cycle, or depth cap; never throws.
 */
export function resolveFieldValue(
  value: unknown,
  refTable: string | undefined,
  registry: DatatableRegistry,
  ctx: ResolveCtx,
): unknown {
  if (Array.isArray(value)) {
    return value.map((el) => resolveFieldValue(el, refTable, registry, ctx));
  }

  let table: string | undefined;
  let id: string | undefined;
  if (isExplicitRef(value)) {
    table = value.table;
    id = value.id;
  } else if (typeof value === 'string' && refTable) {
    table = refTable;
    id = value;
  } else {
    return value; // literal
  }

  const key = `${table}:${id}`;

  if (ctx.depth >= ctx.maxDepth) {
    console.warn(`[datatables] depth cap (${ctx.maxDepth}) reached at ${key}; leaving raw ref`);
    return { table, id };
  }
  if (ctx.seen.has(key)) {
    console.warn(`[datatables] cycle at ${key}; leaving raw ref`);
    return { table, id };
  }

  const row = registry.getRow(table, id);
  if (!row) {
    console.warn(`[datatables] broken ref ${key}; no such row`);
    return { _unresolved: true, table, id };
  }

  // Resolve the row's OWN outgoing refs, per its table schema.
  const rowSchema = registry.getSchema(table) ?? {};
  const childCtx: ResolveCtx = {
    schema: rowSchema,
    depth: ctx.depth + 1,
    maxDepth: ctx.maxDepth,
    seen: new Set(ctx.seen).add(key),
  };

  const resolved: Record<string, unknown> = {};
  for (const [col, colVal] of Object.entries(row)) {
    const childRef = rowSchema[col]?.ref;
    resolved[col] = childRef
      ? resolveFieldValue(colVal, childRef, registry, childCtx)
      : colVal;
  }
  return resolved;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/datatables/resolveRefs.test.ts`
Expected: PASS (all 8 cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/datatables/resolveRefs.ts src/lib/datatables/resolveRefs.test.ts
git commit -m "feat(datatables): resolveFieldValue — hybrid, bounded, cycle-safe"
```

---

### Task 4: Schema fields + `resolveDatatableRefs` glue

**Files:**
- Modify: `src/types/lifecycle-map.ts:143-154` (add `datatables` to `MapMeta`; add `contextRefs` to nodeType entry type)
- Create: `src/lib/datatables/resolveDatatableRefs.ts`
- Test: `src/lib/datatables/resolveDatatableRefs.test.ts`

**Interfaces:**
- Consumes: `DatatableRegistry` (Task 2), `resolveFieldValue`/`DEFAULT_MAX_DEPTH` (Task 3), `LifecycleMap`/`MapNode` types.
- Produces:
  - `resolveDatatableRefs(map: LifecycleMap, registry: DatatableRegistry): LifecycleMap`
  - New optional schema: `MapMeta.datatables?: Record<string, { schema?: DatatableSchema; src?: string }>` and per-nodeType `contextRefs?: Record<string, { ref: string }>`.

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/datatables/resolveDatatableRefs.test.ts
import { describe, expect, it } from 'vitest';
import { DatatableRegistry } from '@/lib/datatables/registry';
import { resolveDatatableRefs } from '@/lib/datatables/resolveDatatableRefs';
import type { LifecycleMap } from '@/types/lifecycle-map';

const registry = () => new DatatableRegistry([
  { name: 'features', schema: {}, rows: {
    f1: { name: 'Rules', tomorrow: 'Self-Serve' },
    f2: { name: 'Posting', tomorrow: 'Auto' },
  } },
]);

function mapWithModules(modules: unknown): LifecycleMap {
  return {
    meta: {
      nodeTypes: { stage: { layout: [], contextRefs: { modules: { ref: 'features' } } } },
      datatables: { features: {} },
    },
    lanes: [], phases: [],
    nodes: [{ id: 'n1', lane: 'l', phase: 'p', title: 'N', type: 'stage', context: { modules } }],
    edges: [],
  } as unknown as LifecycleMap;
}

describe('resolveDatatableRefs', () => {
  it('substitutes string ids in a contextRefs field with row objects', () => {
    const out = resolveDatatableRefs(mapWithModules(['f1', 'f2']), registry());
    expect(out.nodes[0].context!.modules).toEqual([
      { name: 'Rules', tomorrow: 'Self-Serve' },
      { name: 'Posting', tomorrow: 'Auto' },
    ]);
  });

  it('is a no-op when the node has no type / no contextRefs (inline map)', () => {
    const inline = mapWithModules([{ name: 'Inline', tomorrow: 'Manual' }]);
    // remove contextRefs so the field is treated as already-resolved
    (inline.meta!.nodeTypes!.stage as any).contextRefs = undefined;
    const out = resolveDatatableRefs(inline, registry());
    expect(out.nodes[0].context!.modules).toEqual([{ name: 'Inline', tomorrow: 'Manual' }]);
  });

  it('is a no-op with an empty registry', () => {
    const out = resolveDatatableRefs(mapWithModules(['f1']), new DatatableRegistry());
    // broken ref marker, not a crash
    expect((out.nodes[0].context!.modules as any[])[0]).toEqual({ _unresolved: true, table: 'features', id: 'f1' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/datatables/resolveDatatableRefs.test.ts`
Expected: FAIL — module not found and/or `contextRefs`/`datatables` type errors.

- [ ] **Step 3: Extend the schema types**

In `src/types/lifecycle-map.ts`, add an import and modify `MapMeta`:

```typescript
// near the top, after existing imports
import type { DatatableSchema } from '@/lib/datatables/types';
```

Replace the `nodeTypes` line and add `datatables` inside `MapMeta`:

```typescript
  /** Map of node-type id -> layout (primitive tree) + optional context ref decls. */
  nodeTypes?: Record<string, {
    layout: PrimitiveNode[];
    /** Declares which context fields are datatable refs, and into which table. */
    contextRefs?: Record<string, { ref: string }>;
  }>;
  /** Declared datatables: CSV schema and/or a fetchable src. */
  datatables?: Record<string, { schema?: DatatableSchema; src?: string }>;
```

- [ ] **Step 4: Write the glue implementation**

```typescript
// src/lib/datatables/resolveDatatableRefs.ts
import type { LifecycleMap } from '@/types/lifecycle-map';
import type { DatatableRegistry } from './registry';
import { resolveFieldValue, DEFAULT_MAX_DEPTH } from './resolveRefs';
import type { ResolveCtx } from './types';

/**
 * Walk each node's context fields declared as refs (meta.nodeTypes[type].contextRefs)
 * and substitute resolved datatable rows in place. Returns a new map; the input is
 * not mutated. Nodes without a type / contextRefs are left untouched (inline maps).
 */
export function resolveDatatableRefs(map: LifecycleMap, registry: DatatableRegistry): LifecycleMap {
  const nodeTypes = map.meta?.nodeTypes ?? {};
  const nodes = map.nodes.map((node) => {
    if (!node.type || !node.context) return node;
    const refs = nodeTypes[node.type]?.contextRefs;
    if (!refs) return node;

    const context = { ...node.context };
    for (const [field, { ref }] of Object.entries(refs)) {
      if (!(field in context)) continue;
      const ctx: ResolveCtx = { schema: {}, depth: 0, maxDepth: DEFAULT_MAX_DEPTH, seen: new Set() };
      context[field] = resolveFieldValue(context[field], ref, registry, ctx);
    }
    return { ...node, context };
  });
  return { ...map, nodes };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/datatables/resolveDatatableRefs.test.ts`
Expected: PASS (all 3 cases).

- [ ] **Step 6: Typecheck the schema change**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/types/lifecycle-map.ts src/lib/datatables/resolveDatatableRefs.ts src/lib/datatables/resolveDatatableRefs.test.ts
git commit -m "feat(datatables): resolveDatatableRefs glue + contextRefs/datatables schema"
```

---

### Task 5: `loadBundle` — multi-file → lifecycle + registry

**Files:**
- Create: `src/lib/datatables/loadBundle.ts`
- Test: `src/lib/datatables/loadBundle.test.ts`

**Interfaces:**
- Consumes: `parseSource` (`@/lib/parseSource`), `parseDatatable` (Task 1), `DatatableRegistry` (Task 2), `MapMeta.datatables` (Task 4).
- Produces:
  - `interface BundleFile { name: string; text: string }`
  - `interface Bundle { lifecycleText: string; lifecycleName: string; registry: DatatableRegistry; mergedCount: number }`
  - `loadBundle(files: BundleFile[]): Bundle`

Rules: the file whose parsed content has an array `nodes` is the lifecycle. Every other file is a datatable — format by extension (`.csv` → csv, else json). Its name is `_meta.name` (JSON) or the filename without extension. For CSV files, the schema comes from the lifecycle map's `meta.datatables[name].schema`.

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/datatables/loadBundle.test.ts
import { describe, expect, it } from 'vitest';
import { loadBundle } from '@/lib/datatables/loadBundle';

const lifecycle = JSON.stringify({
  meta: { datatables: { people: { schema: { skills: { ref: '__list__' } } } } },
  nodes: [{ id: 'n1', lane: 'l', phase: 'p', title: 'N' }],
  edges: [],
  lanes: [], phases: [],
});
const featuresDt = JSON.stringify({ _meta: { name: 'features' }, rows: { f1: { name: 'Rules' } } });
const peopleCsv = 'id,role,skills\njake,Eng,ts;react';

describe('loadBundle', () => {
  it('identifies the lifecycle file and builds a registry from the rest', () => {
    const b = loadBundle([
      { name: 'features.json', text: featuresDt },
      { name: 'biller.json', text: lifecycle },
      { name: 'people.csv', text: peopleCsv },
    ]);
    expect(b.lifecycleName).toBe('biller.json');
    expect(b.mergedCount).toBe(2);
    expect(b.registry.getRow('features', 'f1')).toEqual({ name: 'Rules' });
    // CSV schema (skills as list) came from meta.datatables.people.schema
    expect(b.registry.getRow('people', 'jake')).toEqual({ role: 'Eng', skills: ['ts', 'react'] });
  });

  it('single file (just the lifecycle) yields an empty registry', () => {
    const b = loadBundle([{ name: 'biller.json', text: lifecycle }]);
    expect(b.lifecycleName).toBe('biller.json');
    expect(b.mergedCount).toBe(0);
    expect(b.registry.size).toBe(0);
  });

  it('throws when no file has `nodes`', () => {
    expect(() => loadBundle([{ name: 'a.json', text: featuresDt }])).toThrow(/no lifecycle map/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/datatables/loadBundle.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/lib/datatables/loadBundle.ts
import { parseSource } from '@/lib/parseSource';
import type { LifecycleMap } from '@/types/lifecycle-map';
import { parseDatatable } from './parseDatatable';
import { DatatableRegistry } from './registry';
import type { Datatable } from './types';

export interface BundleFile {
  name: string;
  text: string;
}

export interface Bundle {
  lifecycleText: string;
  lifecycleName: string;
  registry: DatatableRegistry;
  mergedCount: number;
}

function baseName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '');
}

/**
 * Split dropped files into the lifecycle map (the one with an array `nodes`) and
 * datatables (everything else), building a registry. CSV schemas come from the
 * lifecycle's meta.datatables[name].schema.
 */
export function loadBundle(files: BundleFile[]): Bundle {
  const parsed = files.map((f) => {
    let data: unknown;
    try {
      data = parseSource(f.text);
    } catch {
      data = undefined; // CSV isn't JSON/YAML; that's fine — it's a datatable
    }
    return { ...f, data };
  });

  const mapFile = parsed.find(
    (f) => f.data && typeof f.data === 'object' && Array.isArray((f.data as LifecycleMap).nodes),
  );
  if (!mapFile) {
    throw new Error('Bundle contains no lifecycle map (a file with `nodes`).');
  }

  const map = mapFile.data as LifecycleMap;
  const declared = map.meta?.datatables ?? {};

  const registry = new DatatableRegistry();
  let mergedCount = 0;
  for (const f of parsed) {
    if (f === mapFile) continue;
    const isCsv = f.name.toLowerCase().endsWith('.csv');
    const name = baseName(f.name);
    const schema = declared[name]?.schema;
    const dt: Datatable = parseDatatable(f.text, {
      format: isCsv ? 'csv' : 'json',
      name,
      schema,
    });
    registry.add(dt);
    mergedCount++;
  }

  return {
    lifecycleText: mapFile.text,
    lifecycleName: mapFile.name,
    registry,
    mergedCount,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/datatables/loadBundle.test.ts`
Expected: PASS (all 3 cases).

> Note: the JSON datatable's `_meta.name` ("features") wins over the filename base; the CSV's name is the filename base ("people"), matched against `meta.datatables.people`. The test asserts both.

- [ ] **Step 5: Commit**

```bash
git add src/lib/datatables/loadBundle.ts src/lib/datatables/loadBundle.test.ts
git commit -m "feat(datatables): loadBundle — split lifecycle vs datatables, build registry"
```

---

### Task 6: Wire the resolver into the viewer load seams

**Files:**
- Modify: `src/hooks/useViewerState.ts` — `loadFromText` (~208-243), `handleFileDrop` (~255-267)
- Test: `src/hooks/useViewerState.datatables.test.ts`

**Interfaces:**
- Consumes: `loadBundle` (Task 5), `resolveDatatableRefs` (Task 4), existing `normalize`, `parseSource`.
- Produces: no new exports; behavior — after building/resolving refs, `normalize()` sees resolved objects. Registry is stashed in `ViewerState` as `datatables?: DatatableRegistry` for Phase 2.

- [ ] **Step 1: Write the failing test**

```typescript
// src/hooks/useViewerState.datatables.test.ts
import { describe, expect, it } from 'vitest';
import { normalize } from '@/hooks/useViewerState';
import { loadBundle } from '@/lib/datatables/loadBundle';
import { resolveDatatableRefs } from '@/lib/datatables/resolveDatatableRefs';
import { parseSource } from '@/lib/parseSource';

// This mirrors what the DnD seam does: loadBundle -> resolveDatatableRefs -> normalize.
const lifecycle = JSON.stringify({
  meta: {
    modes: [{ id: 'Self-Serve', label: 'Self-Serve', color: '#16a34a' }],
    nodeTypes: { stage: { layout: [], contextRefs: { modules: { ref: 'features' } } } },
    datatables: { features: {} },
  },
  lanes: [{ id: 'l', label: 'L' }],
  phases: [{ id: 'p', label: 'P' }],
  nodes: [{ id: 'n1', lane: 'l', phase: 'p', title: 'N', type: 'stage', context: { modules: ['f1'] } }],
  edges: [],
});
const features = JSON.stringify({ _meta: { name: 'features' }, rows: { f1: { name: 'Rules', tomorrow: 'Self-Serve' } } });

describe('datatables end-to-end through the load pipeline', () => {
  it('resolves refs before normalize so a referenced module renders as an object', () => {
    const bundle = loadBundle([
      { name: 'biller.json', text: lifecycle },
      { name: 'features.json', text: features },
    ]);
    const map = resolveDatatableRefs(parseSource(bundle.lifecycleText), bundle.registry);
    const norm = normalize(map);
    const mods = norm.nodes[0].context!.modules as Array<Record<string, unknown>>;
    expect(mods[0]).toEqual({ name: 'Rules', tomorrow: 'Self-Serve' });
    // normalize discovered the referenced module's mode (from the resolved object)
    expect(norm._modeMap['Self-Serve']).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/useViewerState.datatables.test.ts`
Expected: FAIL — `normalize`'s `_modeMap` may already pass, but the module resolution assertion fails only if wiring is wrong; since this test calls the units directly, it should PASS *once units exist*. If it passes immediately, that confirms the pipeline is correct — proceed to wire it into the hook (Steps 3-4) which the next test guards.

> If Step 2 passes (units already correct), treat this as the integration guard and continue; the wiring in Steps 3-4 is what makes the *hook* use it.

- [ ] **Step 3: Wire the DnD seam**

In `src/hooks/useViewerState.ts`, add imports near the top (after existing lib imports):

```typescript
import { loadBundle } from '@/lib/datatables/loadBundle';
import { resolveDatatableRefs } from '@/lib/datatables/resolveDatatableRefs';
import { parseSource as parseSourceForRefs } from '@/lib/parseSource';
import type { DatatableRegistry } from '@/lib/datatables/registry';
```

Add `datatables` to `ViewerState`:

```typescript
export interface ViewerState {
  data: NormalizedMap | null;
  source: ViewerSource | null;
  slug: string | null;
  rawSources: RawSource[];
  loading: boolean;
  error: string | null;
  needsPassword: { url: string } | null;
  needsPaste: boolean;
  datatables?: DatatableRegistry;
}
```

Add it to the initial state (`useState<ViewerState>({ … })`): `datatables: undefined,`.

Replace `handleFileDrop` body so it uses `loadBundle` and passes the registry through `loadFromText`:

```typescript
  const handleFileDrop = useCallback(async (files: File[]) => {
    const dropped = await Promise.all(
      files.map(async (f) => ({ name: f.name, text: await f.text() })),
    );
    try {
      const bundle = loadBundle(dropped);
      await loadFromText(bundle.lifecycleText, bundle.lifecycleName, 'dnd', undefined, undefined, bundle.registry);
    } catch (e) {
      setState((s) => ({ ...s, error: e instanceof Error ? e.message : String(e) }));
    }
  }, [loadFromText]);
```

- [ ] **Step 4: Thread the registry through `loadFromText`**

Change the `loadFromText` signature and add the resolve step before `normalize`:

```typescript
  const loadFromText = useCallback(async (
    text: string,
    name: string,
    source: ViewerSource,
    slug?: string,
    baseUrl?: string,
    registry?: DatatableRegistry,
  ) => {
    try {
      const data = parseSource(text);
      const resolved = baseUrl
        ? await resolveExternalModules(data, (u) => fetchRelativeText(u, baseUrl), name)
        : data;
      // Substitute datatable refs (if any) before normalize, so mode discovery
      // and the drawer see resolved row objects (not raw ids).
      const withRefs = registry ? resolveDatatableRefs(resolved, registry) : resolved;
      const normalized = normalize(withRefs);
      const finalSlug = slug ?? (source === 'dnd' ? slugify(name) : null);
      if (finalSlug) {
        const newHash = '#' + finalSlug;
        if (window.location.hash !== newHash) {
          history.replaceState(null, '', window.location.pathname + window.location.search + newHash);
        }
        lastHandledSlug.current = finalSlug;
      }
      setState({
        data: normalized,
        source,
        slug: finalSlug,
        rawSources: [{ name, text, lang: detectLang(name, text) }],
        loading: false,
        error: null,
        needsPassword: null,
        needsPaste: false,
        datatables: registry,
      });
      if (source === 'dnd' || source === 'paste') {
        session.save({ source: source === 'dnd' ? 'dnd' : 'paste', slug: finalSlug ?? undefined, rawJson: text });
      }
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e instanceof Error ? e.message : String(e) }));
    }
  }, [session]);
```

> Remove the now-unused `parseSourceForRefs` import if not referenced — it was listed defensively; `parseSource` is already imported. Delete that import line to keep the lint clean.

- [ ] **Step 5: Run the datatables + existing hook tests**

Run: `npx vitest run src/hooks/useViewerState.datatables.test.ts src/hooks/useViewerState.test.ts`
Expected: PASS.

- [ ] **Step 6: Typecheck + full suite (regression gate)**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no type errors; all tests pass (existing `resolveModules`, `mergeDroppedFiles`, `normalize`, `typed-stage-map` unaffected).

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useViewerState.ts src/hooks/useViewerState.datatables.test.ts
git commit -m "feat(datatables): resolve refs before normalize on fetch + DnD seams"
```

---

### Task 7: Integration test — full bundle render (generic fixtures)

**Files:**
- Create: `src/lib/datatables/__fixtures__/lifecycle.json`
- Create: `src/lib/datatables/__fixtures__/features.datatable.json`
- Create: `src/lib/datatables/__fixtures__/people.datatable.csv`
- Test: `src/lib/datatables/integration.test.tsx`

**Interfaces:**
- Consumes: `loadBundle`, `resolveDatatableRefs`, `normalize`, `NodeDrawer`, `parseSource`.
- Produces: nothing (test only).

- [ ] **Step 1: Create the fixtures**

```json
// src/lib/datatables/__fixtures__/lifecycle.json
{
  "meta": {
    "title": "Fixture Flow",
    "modes": [{ "id": "Auto", "label": "Auto", "color": "#16a34a" }],
    "nodeTypes": {
      "stage": {
        "layout": [
          { "type": "Prose", "bind": "$objective" },
          { "type": "Section", "title": "Features", "children": [
            { "type": "List", "bind": "$modules", "item": {
              "type": "Tile", "title": "$name", "sub": "$tomorrow"
            }}
          ]}
        ],
        "contextRefs": { "modules": { "ref": "features" } }
      }
    },
    "datatables": {
      "features": { "schema": { "owner": { "ref": "people" } } },
      "people": { "schema": {} }
    }
  },
  "lanes": [{ "id": "l", "label": "Lane" }],
  "phases": [{ "id": "p", "label": "Phase" }],
  "nodes": [
    { "id": "n1", "lane": "l", "phase": "p", "title": "Node One", "type": "stage",
      "context": { "objective": "Fixture objective text.", "modules": ["feat-a", "feat-b"] } }
  ],
  "edges": []
}
```

```json
// src/lib/datatables/__fixtures__/features.datatable.json
{
  "_meta": { "name": "features" },
  "_schema": { "owner": { "ref": "people" } },
  "rows": {
    "feat-a": { "name": "Alpha feature", "tomorrow": "Auto", "owner": "pat" },
    "feat-b": { "name": "Beta feature", "tomorrow": "Auto" }
  }
}
```

```csv
# src/lib/datatables/__fixtures__/people.datatable.csv
id,name,role
pat,Pat Owner,Engineer
```

> The CSV file's first line is the header `id,name,role` — do NOT include the `#` comment line above in the actual file; it is only a path label here.

- [ ] **Step 2: Write the failing integration test**

```typescript
// src/lib/datatables/integration.test.tsx
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import { loadBundle } from '@/lib/datatables/loadBundle';
import { resolveDatatableRefs } from '@/lib/datatables/resolveDatatableRefs';
import { normalize } from '@/hooks/useViewerState';
import { parseSource } from '@/lib/parseSource';
import { NodeDrawer } from '@/components/NodeDrawer';

const F = (n: string) => readFileSync(join(__dirname, '__fixtures__', n), 'utf-8');
const L = (v: unknown): string => (typeof v === 'string' ? v : String((v as { en?: string })?.en ?? v ?? ''));

describe('datatables integration — bundle → resolve → render', () => {
  it('renders resolved feature rows in the node drawer, with a datatable→datatable ref', () => {
    const bundle = loadBundle([
      { name: 'lifecycle.json', text: F('lifecycle.json') },
      { name: 'features.datatable.json', text: F('features.datatable.json') },
      { name: 'people.datatable.csv', text: F('people.datatable.csv') },
    ]);
    const map = normalize(resolveDatatableRefs(parseSource(bundle.lifecycleText), bundle.registry));

    // feature rows resolved into context.modules, and feat-a.owner resolved to a people row
    const mods = map.nodes[0].context!.modules as Array<Record<string, unknown>>;
    expect(mods[0].name).toBe('Alpha feature');
    expect(mods[0].owner).toEqual({ name: 'Pat Owner', role: 'Engineer' });

    const { getByText, getAllByText } = render(
      <NodeDrawer open mode="node" data={map}
        activeNodeId="n1" activeEdge={null} walkOrder={['n1']}
        onClose={() => {}} onNavigate={() => {}} L={L} />,
    );
    expect(getByText(/Fixture objective text/)).toBeInTheDocument();
    expect(getAllByText('Alpha feature').length).toBeGreaterThan(0);
    expect(getAllByText('Beta feature').length).toBeGreaterThan(0);
  });

  it('degrades a broken ref without crashing', () => {
    const badLifecycle = F('lifecycle.json').replace('"feat-b"', '"does-not-exist"');
    const bundle = loadBundle([
      { name: 'lifecycle.json', text: badLifecycle },
      { name: 'features.datatable.json', text: F('features.datatable.json') },
    ]);
    const map = normalize(resolveDatatableRefs(parseSource(bundle.lifecycleText), bundle.registry));
    const mods = map.nodes[0].context!.modules as Array<Record<string, unknown>>;
    expect(mods[1]).toEqual({ _unresolved: true, table: 'features', id: 'does-not-exist' });
  });
});
```

- [ ] **Step 3: Run test to verify it fails, then create the CSV file correctly**

Run: `npx vitest run src/lib/datatables/integration.test.tsx`
Expected: FAIL until all three fixture files exist (the CSV must contain exactly `id,name,role\npat,Pat Owner,Engineer`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/datatables/integration.test.tsx`
Expected: PASS (both cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/datatables/__fixtures__ src/lib/datatables/integration.test.tsx
git commit -m "test(datatables): end-to-end bundle → resolve → render integration"
```

---

### Task 8: Migrate Air Billing to a referenced datatable

**Files:**
- Modify (git-ignored, local): `~/Projects/zalkowitsch/lifecycle-map/workspace/air-billing/biller-lifecycle.json`
- Modify (git-ignored, local): `~/Projects/zalkowitsch/lifecycle-map/workspace/air-billing/features.json`
- Modify: `workspace/air-billing/README.md` (tracked — describes the relational bundle)
- Also update the source copies under `/Users/arkady/Projects/my-claude/spot/biller-lifecycle/` to match.

> These data files are git-ignored, so this task's verification is a **local render check**, not a repo test. The tracked change is the README.

- [ ] **Step 1: Add datatable meta to the map**

In `workspace/air-billing/biller-lifecycle.json`, inside `meta`, add `contextRefs` to the `stage` nodeType and declare the datatable. Add to `meta.nodeTypes.stage` (alongside `layout`):

```json
"contextRefs": { "modules": { "ref": "features" } }
```

And add to `meta` (after `modes`):

```json
"datatables": { "features": {} }
```

- [ ] **Step 2: Convert each node's `context.modules` from inline objects to feature ids**

Run this script to rewrite modules arrays to id lists, matching each inline module `name` back to its feature id in `features.json`:

```bash
cd /Users/arkady/Projects/zalkowitsch/lifecycle-map/workspace/air-billing
python3 - <<'PY'
import json
feats = json.load(open('features.json'))['features']
# name -> id (skip string comment markers)
name_to_id = { v['name']: k for k, v in feats.items() if isinstance(v, dict) and 'name' in v }
m = json.load(open('biller-lifecycle.json'))
missing = []
for n in m['nodes']:
    ctx = n.get('context', {})
    mods = ctx.get('modules')
    if not isinstance(mods, list): continue
    ids = []
    for mod in mods:
        if isinstance(mod, str):
            ids.append(mod); continue
        name = mod.get('name')
        fid = name_to_id.get(name)
        if fid: ids.append(fid)
        else: missing.append((n['id'], name))
    ctx['modules'] = ids
json.dump(m, open('biller-lifecycle.json','w'), ensure_ascii=False, indent=2)
print('rewrote modules to ids. unmatched:', missing)
PY
```

Expected: `unmatched: []` (every inline module name maps to a feature id). If any are unmatched, add the missing feature to `features.json` or fix the name, then re-run.

- [ ] **Step 3: Add `_meta.name` to the features datatable**

In `workspace/air-billing/features.json`, add at the top level:

```json
"_meta": { "name": "features" }
```

(Keep the existing `features` object as-is — `parseDatatable` reads it as `rows` and drops the `_comment_*` markers.)

- [ ] **Step 4: Local render check (git-ignored data — not a repo test)**

Create a temporary test inside the project, run it, then delete it:

```bash
cd /Users/arkady/Projects/zalkowitsch/lifecycle-map
cat > src/_verify_airbilling.test.tsx <<'EOF'
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { loadBundle } from '@/lib/datatables/loadBundle';
import { resolveDatatableRefs } from '@/lib/datatables/resolveDatatableRefs';
import { normalize } from '@/hooks/useViewerState';
import { parseSource } from '@/lib/parseSource';
import { NodeDrawer } from '@/components/NodeDrawer';

const DIR = process.env.HOME + '/Projects/zalkowitsch/lifecycle-map/workspace/air-billing';
const L = (v: unknown): string => (typeof v === 'string' ? v : String((v as {en?:string})?.en ?? v ?? ''));

describe('air-billing relational bundle', () => {
  it('resolves features and renders the sched drawer, no unresolved refs', () => {
    const bundle = loadBundle([
      { name: 'biller-lifecycle.json', text: readFileSync(`${DIR}/biller-lifecycle.json`,'utf8') },
      { name: 'features.json', text: readFileSync(`${DIR}/features.json`,'utf8') },
    ]);
    const map = normalize(resolveDatatableRefs(parseSource(bundle.lifecycleText), bundle.registry));
    // no _unresolved markers anywhere in any node's modules
    const bad: string[] = [];
    for (const n of map.nodes) {
      const mods = (n.context?.modules ?? []) as any[];
      for (const mod of mods) if (mod && mod._unresolved) bad.push(`${n.id}:${mod.id}`);
    }
    expect(bad).toEqual([]);
    const { getAllByText } = render(
      <NodeDrawer open mode="node" data={map} activeNodeId="sched"
        activeEdge={null} walkOrder={map.nodes.map(n=>n.id)}
        onClose={()=>{}} onNavigate={()=>{}} L={L} />,
    );
    expect(getAllByText('Online scheduling').length).toBeGreaterThan(0);
  });
});
EOF
npx vitest run src/_verify_airbilling.test.tsx
rm src/_verify_airbilling.test.tsx
```

Expected: PASS — `bad` is empty (every ref resolved) and the referenced module name renders.

- [ ] **Step 5: Sync the source copies**

Copy the migrated files back to the source location so both stay in sync:

```bash
cp /Users/arkady/Projects/zalkowitsch/lifecycle-map/workspace/air-billing/biller-lifecycle.json /Users/arkady/Projects/my-claude/spot/biller-lifecycle/biller-lifecycle.json
cp /Users/arkady/Projects/zalkowitsch/lifecycle-map/workspace/air-billing/features.json /Users/arkady/Projects/my-claude/spot/biller-lifecycle/features.json
```

- [ ] **Step 6: Update the README (tracked)**

In `workspace/air-billing/README.md`, replace the "How to open" section to describe the relational bundle: the map now references features by id, so you MUST drop `biller-lifecycle.json` **and** `features.json` together (multi-file drag-drop). Add a line under the file list noting `features.json` is now a datatable (`_meta.name: "features"`) referenced via `meta.nodeTypes.stage.contextRefs`.

- [ ] **Step 7: Commit the tracked change**

```bash
cd /Users/arkady/Projects/zalkowitsch/lifecycle-map
git add workspace/air-billing/README.md
git commit -m "docs(air-billing): relational bundle — features referenced by id"
```

---

### Task 9: Documentation — SCHEMA.md + push

**Files:**
- Modify: `SCHEMA.md` (add a "Datatables (relational references)" section)

- [ ] **Step 1: Add a datatables section to SCHEMA.md**

After the "`modules` (top-level catalog)" section, add a new section documenting: the `meta.datatables` map, per-nodeType `contextRefs`, the JSON datatable shape (`_meta`, `_schema`, `rows`), the CSV shape + schema-declared list columns, the hybrid ref forms (string via schema, `{table,id}` object), multi-file drag-drop bundle loading, and the depth cap / degrade-on-error behavior. Note that inline maps remain valid (no `contextRefs` = no resolution).

- [ ] **Step 2: Full suite + typecheck**

Run: `npx tsc --noEmit && npx vitest run`
Expected: all pass.

- [ ] **Step 3: Commit and push**

```bash
git add SCHEMA.md
git commit -m "docs: document relational datatables in SCHEMA.md"
git push origin main
```

---

## Self-Review

**Spec coverage:**
- 5 units → Tasks 1 (parseDatatable), 2 (registry), 3 (resolveRefs), 4 (resolveDatatableRefs + schema), 5 (loadBundle). ✓
- Wiring into both seams before `normalize` → Task 6. ✓
- Air Billing migration → Task 8. ✓
- Coexistence / inline no-op → covered by Task 4 test (no contextRefs) and Task 6 regression gate. ✓
- JSON+CSV parity, cycle/cap/broken-ref, hybrid forms → Tasks 1 & 3 tests. ✓
- Integration (bundle + datatable→datatable ref + degrade) → Task 7. ✓
- Docs → Task 9. ✓
- Phase 2 seam (registry retained in state) → Task 6 (`ViewerState.datatables`). ✓
- **Deferred vs June spec:** zip loading is explicitly deferred (no zip dep; noted in Global Constraints and plan intro) — documented deviation, JSON/CSV cover the Air Billing case.

**Placeholder scan:** No TBD/TODO; every code step has full code; no "similar to Task N". ✓

**Type consistency:** `Datatable`/`DatatableSchema`/`ResolveCtx` defined in Task 1, used consistently in 2–5. `resolveFieldValue(value, refTable, registry, ctx)` signature identical in Tasks 3, 4, 7. `loadBundle` returns `{ lifecycleText, lifecycleName, registry, mergedCount }` in Task 5, consumed with those exact names in Tasks 6, 7, 8. `ViewerState.datatables?: DatatableRegistry` added in Task 6. ✓
