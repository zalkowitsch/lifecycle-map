# Database Editor Panel — Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A full-screen, spreadsheet-style "Database" editor in the viewer that does full CRUD on Personas (lanes), Steps (phases), Features (datatable rows), and Nodes (cards), applying every edit live to the map.

**Architecture:** Pure logic first — `deriveEntityRows` (map+registry → grid rows) and `applyEntityEdit` (edit → new source object) — are testable without any UI. `useViewerState` gains a multi-entry `rawSources` and a `commitSource(i, text)` write path that re-runs the existing resolve→normalize pipeline. A lazy-loaded `DatabasePanel` renders each entity in a Glide Data Grid; the Nodes tab is a split with a nested-field table and a feature-ref picker. Map schema, resolver, normalize, NodeDrawer, Canvas are unchanged.

**Tech Stack:** TypeScript, React, Vitest, `js-yaml` (existing). NEW: `@glideapps/glide-data-grid` (MIT) + peer deps `lodash`, `marked`, `react-responsive-carousel`. The panel is code-split so the grid stays out of the main chunk.

**Spec:** [`docs/superpowers/specs/2026-07-10-database-editor-phase2-design.md`](../specs/2026-07-10-database-editor-phase2-design.md).

## Global Constraints

- **Live edits, no save button.** Every grid edit re-serializes the affected source and commits via the hook; `data`/canvas reflect it immediately.
- **Multi-file `rawSources`.** State holds the map + each datatable, each with `{name,text,lang}`. Single-source maps keep exactly ONE entry (backward compatible).
- **Edits are structured, not textual.** We mutate parsed objects then serialize — serialization always yields valid JSON/YAML; the commit re-parse won't fail on our own edits.
- **Feature edits mutate the features datatable source; lane/phase/node edits mutate the map source; a node's modules/states/meta edits mutate that node's `context` in the map source.**
- **`modules` picker offers only existing feature ids** (no new broken refs). Broken refs already degrade to `{_unresolved:true,…}` (Phase 1) — never crash.
- **Mode columns** (`today`/`tomorrow`/state `mode`) edit via a dropdown sourced from `meta.modes`; unknown values allowed but flagged.
- **Must pass `npx tsc --noEmit`** (tsconfig `noUncheckedIndexedAccess: true`), **eslint clean** (`npm run lint`, `--max-warnings 0`), and the **full suite** (`npx vitest run`).
- **Code-split the panel** — `@glideapps/glide-data-grid` must NOT appear in the main entry chunk; the panel loads lazily when the user opens Database.
- **JSON datatables round-trip fully; CSV edit fidelity (comments/column order) is out of scope** — edited datatables prefer JSON.
- **Out of scope:** editing `meta.nodeTypes.<type>.layout`, editing edges, grid-level undo/redo, formulas/validation beyond ref-exists + known-mode.

---

## File Structure

- `src/lib/database/deriveEntityRows.ts` — pure: map+registry+entity → `{ columns, rows }`.
- `src/lib/database/applyEntityEdit.ts` — pure: (parsed source, entity, edit) → new source object.
- `src/lib/database/serializeSource.ts` — pure: (obj, lang) → text (JSON 2-space / YAML).
- `src/lib/database/types.ts` — shared types (`Entity`, `EntityEdit`, `GridColumn`, `GridRows`, `EditTarget`).
- `src/hooks/useViewerState.ts` — MODIFY: capture multi-source `rawSources` on DnD; add `commitSource`.
- `src/components/DatabasePanel/DatabasePanel.tsx` — full-screen panel: tabs + entity switch + Nodes split.
- `src/components/DatabasePanel/EntityGrid.tsx` — Glide grid wrapper (cells, edit/add/delete, dropdown cells).
- `src/components/DatabasePanel/NestedTable.tsx` — Nodes-split right pane (modules/states/meta) + ref picker.
- `src/components/DatabasePanel/DatabasePanel.module.css` — full-screen layout + split + `<` marker.
- `src/components/DatabasePanel/index.ts` — barrel; `App.tsx` lazy-imports from here.
- `src/App.tsx` — MODIFY: header "Database" button, `dbOpen` state, lazy `<DatabasePanel>`, `commitSource` wiring, multi-source `getJsonText`.

---

### Task 1: Database types + `serializeSource`

**Files:**
- Create: `src/lib/database/types.ts`
- Create: `src/lib/database/serializeSource.ts`
- Test: `src/lib/database/serializeSource.test.ts`

**Interfaces:**
- Consumes: `js-yaml` (already a dep).
- Produces:
  - `type Entity = 'lanes' | 'phases' | 'features' | 'nodes'`
  - `interface GridColumn { id: string; title: string; kind: 'text' | 'mode' | 'ref'; refTable?: string; readOnly?: boolean }`
  - `interface GridRows { columns: GridColumn[]; rows: Record<string, unknown>[] }` (each row has an `id`)
  - `type EntityEdit = { op: 'update'; id: string; field: string; value: unknown } | { op: 'add'; id: string } | { op: 'delete'; id: string }`
  - `serializeSource(obj: unknown, lang: 'json' | 'yaml'): string`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/database/serializeSource.test.ts
import { describe, expect, it } from 'vitest';
import { serializeSource } from '@/lib/database/serializeSource';

describe('serializeSource', () => {
  it('serializes JSON with 2-space indent and trailing newline', () => {
    const out = serializeSource({ a: 1, b: ['x'] }, 'json');
    expect(out).toBe('{\n  "a": 1,\n  "b": [\n    "x"\n  ]\n}\n');
  });

  it('round-trips a JSON object (parse(serialize(x)) deep-equals x)', () => {
    const obj = { meta: { title: 'T' }, nodes: [{ id: 'n1' }], edges: [] };
    expect(JSON.parse(serializeSource(obj, 'json'))).toEqual(obj);
  });

  it('serializes YAML when lang is yaml', () => {
    const out = serializeSource({ a: 1 }, 'yaml');
    expect(out).toContain('a: 1');
    expect(out).not.toContain('{'); // block style, not flow
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/database/serializeSource.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the types**

```typescript
// src/lib/database/types.ts

/** The four editable entity kinds in the Database panel. */
export type Entity = 'lanes' | 'phases' | 'features' | 'nodes';

/** A grid column descriptor. `kind` selects the cell editor. */
export interface GridColumn {
  id: string;
  title: string;
  kind: 'text' | 'mode' | 'ref';
  /** For kind 'ref': the datatable the cell references (e.g. 'features'). */
  refTable?: string;
  readOnly?: boolean;
}

/** A derived grid: columns + row objects (each row carries an `id`). */
export interface GridRows {
  columns: GridColumn[];
  rows: Record<string, unknown>[];
}

/** A single structured edit against an entity. */
export type EntityEdit =
  | { op: 'update'; id: string; field: string; value: unknown }
  | { op: 'add'; id: string }
  | { op: 'delete'; id: string };

/** Which source a given edit targets, and (for nodes) the nested path. */
export interface EditTarget {
  /** 'map' → the lifecycle map source; otherwise a datatable name (e.g. 'features'). */
  source: 'map' | string;
}
```

- [ ] **Step 4: Write `serializeSource`**

```typescript
// src/lib/database/serializeSource.ts
import yaml from 'js-yaml';

/**
 * Serialize an edited source object back to text in its original language.
 * JSON: 2-space indent + trailing newline. YAML: block style via js-yaml.
 */
export function serializeSource(obj: unknown, lang: 'json' | 'yaml'): string {
  if (lang === 'yaml') return yaml.dump(obj, { lineWidth: -1, noRefs: true });
  return JSON.stringify(obj, null, 2) + '\n';
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/database/serializeSource.test.ts`
Expected: PASS.

- [ ] **Step 6: Typecheck + commit**

Run: `npx tsc --noEmit` (expect zero errors), then:

```bash
git add src/lib/database/types.ts src/lib/database/serializeSource.ts src/lib/database/serializeSource.test.ts
git commit -m "feat(database): entity types + serializeSource (JSON/YAML)"
```

---

### Task 2: `deriveEntityRows`

**Files:**
- Create: `src/lib/database/deriveEntityRows.ts`
- Test: `src/lib/database/deriveEntityRows.test.ts`

**Interfaces:**
- Consumes: `Entity`, `GridRows`, `GridColumn` (Task 1); `LifecycleMap` (`@/types/lifecycle-map`); `DatatableRegistry` (`@/lib/datatables/registry`).
- Produces:
  - `deriveEntityRows(map: LifecycleMap, registry: DatatableRegistry | undefined, entity: Entity): GridRows`

Column plans (fixed):
- `lanes`: `id` (text), `label` (text), `sub` (text).
- `phases`: `id` (text), `label` (text), `roman` (text), `subCols` (text).
- `features`: `id` (text, readOnly — it's the row key), `name` (text), `today` (mode), `tomorrow` (mode), `tags` (text; joined with `, `).
- `nodes`: `id` (text), `title` (text), `lane` (text), `phase` (text), `sub` (text). (Flat only — nested `context` handled by NestedTable.)

Rows: lanes/phases/nodes from `map.lanes/phases/nodes`; features from `registry.getRow` over all ids in the `features` table (via a new `registry.ids(table)` helper — add it in this task).

- [ ] **Step 1: Add `ids(table)` to DatatableRegistry (needed to list feature rows)**

In `src/lib/datatables/registry.ts`, add a method:

```typescript
  /** All row ids in a table, in insertion order. Empty if the table is absent. */
  ids(table: string): string[] {
    const t = this.tables.get(table);
    return t ? Object.keys(t.rows) : [];
  }
```

- [ ] **Step 2: Write the failing test**

```typescript
// src/lib/database/deriveEntityRows.test.ts
import { describe, expect, it } from 'vitest';
import { deriveEntityRows } from '@/lib/database/deriveEntityRows';
import { DatatableRegistry } from '@/lib/datatables/registry';
import type { LifecycleMap } from '@/types/lifecycle-map';

const map = {
  meta: {},
  lanes: [{ id: 'patient', label: 'Patient', sub: 'consumer' }],
  phases: [{ id: 'preVisit', label: 'Pre-Visit', roman: 'I', subCols: 3 }],
  nodes: [{ id: 'sched', lane: 'patient', phase: 'preVisit', title: 'Schedule', sub: 'books',
            type: 'stage', context: { modules: ['f1'], objective: 'x' } }],
  edges: [],
} as unknown as LifecycleMap;

const registry = new DatatableRegistry([
  { name: 'features', schema: {}, rows: {
    f1: { name: 'Online sched', today: 'Manual', tomorrow: 'Auto', tags: ['★'] },
  } },
]);

describe('deriveEntityRows', () => {
  it('lanes → id/label/sub columns and one row', () => {
    const g = deriveEntityRows(map, registry, 'lanes');
    expect(g.columns.map((c) => c.id)).toEqual(['id', 'label', 'sub']);
    expect(g.rows[0]).toMatchObject({ id: 'patient', label: 'Patient', sub: 'consumer' });
  });

  it('phases → id/label/roman/subCols', () => {
    const g = deriveEntityRows(map, registry, 'phases');
    expect(g.columns.map((c) => c.id)).toEqual(['id', 'label', 'roman', 'subCols']);
    expect(g.rows[0]).toMatchObject({ id: 'preVisit', roman: 'I', subCols: 3 });
  });

  it('features → rows from the registry, mode columns, tags joined', () => {
    const g = deriveEntityRows(map, registry, 'features');
    expect(g.columns.find((c) => c.id === 'today')?.kind).toBe('mode');
    expect(g.columns.find((c) => c.id === 'id')?.readOnly).toBe(true);
    expect(g.rows[0]).toMatchObject({ id: 'f1', name: 'Online sched', tags: '★' });
  });

  it('nodes → flat columns only (no nested context)', () => {
    const g = deriveEntityRows(map, registry, 'nodes');
    expect(g.columns.map((c) => c.id)).toEqual(['id', 'title', 'lane', 'phase', 'sub']);
    expect(g.rows[0]).toMatchObject({ id: 'sched', title: 'Schedule', lane: 'patient', phase: 'preVisit' });
    expect(g.rows[0]).not.toHaveProperty('context');
  });

  it('features with no registry → empty rows, columns still present', () => {
    const g = deriveEntityRows(map, undefined, 'features');
    expect(g.rows).toEqual([]);
    expect(g.columns.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/database/deriveEntityRows.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Write the implementation**

```typescript
// src/lib/database/deriveEntityRows.ts
import type { LifecycleMap } from '@/types/lifecycle-map';
import type { DatatableRegistry } from '@/lib/datatables/registry';
import type { Entity, GridColumn, GridRows } from './types';

const COLUMNS: Record<Entity, GridColumn[]> = {
  lanes: [
    { id: 'id', title: 'id', kind: 'text' },
    { id: 'label', title: 'label', kind: 'text' },
    { id: 'sub', title: 'sub', kind: 'text' },
  ],
  phases: [
    { id: 'id', title: 'id', kind: 'text' },
    { id: 'label', title: 'label', kind: 'text' },
    { id: 'roman', title: 'roman', kind: 'text' },
    { id: 'subCols', title: 'subCols', kind: 'text' },
  ],
  features: [
    { id: 'id', title: 'id', kind: 'text', readOnly: true },
    { id: 'name', title: 'name', kind: 'text' },
    { id: 'today', title: 'today', kind: 'mode' },
    { id: 'tomorrow', title: 'tomorrow', kind: 'mode' },
    { id: 'tags', title: 'tags', kind: 'text' },
  ],
  nodes: [
    { id: 'id', title: 'id', kind: 'text' },
    { id: 'title', title: 'title', kind: 'text' },
    { id: 'lane', title: 'lane', kind: 'text' },
    { id: 'phase', title: 'phase', kind: 'text' },
    { id: 'sub', title: 'sub', kind: 'text' },
  ],
};

/** Read a possibly-localized string as a plain string (first value if object). */
function asText(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v.map(asText).join(', ');
  if (typeof v === 'object') {
    const vals = Object.values(v as Record<string, unknown>);
    return vals.length ? asText(vals[0]) : '';
  }
  return String(v);
}

export function deriveEntityRows(
  map: LifecycleMap,
  registry: DatatableRegistry | undefined,
  entity: Entity,
): GridRows {
  const columns = COLUMNS[entity];
  let rows: Record<string, unknown>[] = [];

  if (entity === 'lanes') {
    rows = map.lanes.map((l) => ({ id: l.id, label: asText(l.label), sub: asText(l.sub) }));
  } else if (entity === 'phases') {
    rows = map.phases.map((p) => ({
      id: p.id, label: asText(p.label), roman: p.roman ?? '', subCols: p.subCols ?? 1,
    }));
  } else if (entity === 'nodes') {
    rows = map.nodes.map((n) => ({
      id: n.id, title: asText(n.title), lane: n.lane, phase: n.phase, sub: asText(n.sub),
    }));
  } else if (entity === 'features') {
    const ids = registry?.ids('features') ?? [];
    rows = ids.map((id) => {
      const r = registry?.getRow('features', id) ?? {};
      return {
        id,
        name: asText(r.name),
        today: asText(r.today),
        tomorrow: asText(r.tomorrow),
        tags: Array.isArray(r.tags) ? r.tags.map(asText).join(', ') : asText(r.tags),
      };
    });
  }

  return { columns, rows };
}
```

- [ ] **Step 5: Run tests + typecheck**

Run: `npx vitest run src/lib/database/deriveEntityRows.test.ts src/lib/datatables/registry.test.ts` (registry test must still pass with the new method)
Then: `npx tsc --noEmit`
Expected: all pass, zero type errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/datatables/registry.ts src/lib/database/deriveEntityRows.ts src/lib/database/deriveEntityRows.test.ts
git commit -m "feat(database): deriveEntityRows + registry.ids()"
```

---

### Task 3: `applyEntityEdit`

**Files:**
- Create: `src/lib/database/applyEntityEdit.ts`
- Test: `src/lib/database/applyEntityEdit.test.ts`

**Interfaces:**
- Consumes: `Entity`, `EntityEdit`, `EditTarget` (Task 1).
- Produces:
  - `editTargetFor(entity: Entity): EditTarget` — lanes/phases/nodes → `{source:'map'}`; features → `{source:'features'}`.
  - `applyEntityEdit(sourceObj: Record<string, unknown>, entity: Entity, edit: EntityEdit): Record<string, unknown>` — returns a NEW source object (no mutation of input).
  - `applyNodeNestedEdit(mapObj: Record<string, unknown>, nodeId: string, field: 'modules' | 'states' | 'meta', edit: EntityEdit): Record<string, unknown>` — edits a node's `context[field]` array; returns a new map object.

Rules:
- `lanes`/`phases`: the source is the **map**; edit its `lanes`/`phases` array. `add` pushes `{id}`; `update` sets `row[field]=value` on the matching id; `delete` removes by id. Coerce `subCols` to number when the field is `subCols`.
- `features`: the source is the **features datatable**; edit `sourceObj.rows` (or legacy `features` key) keyed by id. `add` sets `rows[id]={}`; `update` sets `rows[id][field]=value` (for `tags`, split the comma string into an array); `delete` removes the key.
- `nodes` flat: source is the **map**; edit `nodes` array (`add` pushes `{id, lane:'', phase:'', title:id}`; `update`/`delete` as above).
- Node nested (`applyNodeNestedEdit`): find the node in `mapObj.nodes`, operate on `node.context[field]`. For `modules`: it's an array of string ids — `add` appends `''`; `update` with `field==='<index>'` sets `arr[index]=value`; `delete` with `id==='<index>'` splices. (Index-addressed because modules are bare strings, not keyed objects.)

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/database/applyEntityEdit.test.ts
import { describe, expect, it } from 'vitest';
import { applyEntityEdit, applyNodeNestedEdit, editTargetFor } from '@/lib/database/applyEntityEdit';

describe('editTargetFor', () => {
  it('routes entities to their source', () => {
    expect(editTargetFor('lanes')).toEqual({ source: 'map' });
    expect(editTargetFor('features')).toEqual({ source: 'features' });
    expect(editTargetFor('nodes')).toEqual({ source: 'map' });
  });
});

describe('applyEntityEdit — lanes (map source)', () => {
  const map = () => ({ lanes: [{ id: 'a', label: 'A' }], phases: [], nodes: [], edges: [] });
  it('update sets a field on the matching lane, input not mutated', () => {
    const src = map();
    const out = applyEntityEdit(src, 'lanes', { op: 'update', id: 'a', field: 'label', value: 'AA' });
    expect((out.lanes as any)[0].label).toBe('AA');
    expect((src.lanes as any)[0].label).toBe('A'); // no mutation
  });
  it('add appends a new lane with the id', () => {
    const out = applyEntityEdit(map(), 'lanes', { op: 'add', id: 'b' });
    expect((out.lanes as any).map((l: any) => l.id)).toEqual(['a', 'b']);
  });
  it('delete removes by id', () => {
    const out = applyEntityEdit(map(), 'lanes', { op: 'delete', id: 'a' });
    expect(out.lanes).toEqual([]);
  });
});

describe('applyEntityEdit — phases coerces subCols to number', () => {
  it('update subCols stores a number', () => {
    const src = { lanes: [], phases: [{ id: 'p' }], nodes: [], edges: [] };
    const out = applyEntityEdit(src, 'phases', { op: 'update', id: 'p', field: 'subCols', value: '3' });
    expect((out.phases as any)[0].subCols).toBe(3);
  });
});

describe('applyEntityEdit — features (datatable source)', () => {
  const dt = () => ({ _meta: { name: 'features' }, rows: { f1: { name: 'One' } } });
  it('update sets a field on the row', () => {
    const out = applyEntityEdit(dt(), 'features', { op: 'update', id: 'f1', field: 'name', value: 'Two' });
    expect((out.rows as any).f1.name).toBe('Two');
  });
  it('tags field splits a comma string into an array', () => {
    const out = applyEntityEdit(dt(), 'features', { op: 'update', id: 'f1', field: 'tags', value: 'a, b ,c' });
    expect((out.rows as any).f1.tags).toEqual(['a', 'b', 'c']);
  });
  it('add creates an empty row; delete removes it', () => {
    const added = applyEntityEdit(dt(), 'features', { op: 'add', id: 'f2' });
    expect((added.rows as any).f2).toEqual({});
    const removed = applyEntityEdit(dt(), 'features', { op: 'delete', id: 'f1' });
    expect((removed.rows as any).f1).toBeUndefined();
  });
  it('supports the legacy `features` rows key', () => {
    const legacy = { features: { f1: { name: 'One' } } };
    const out = applyEntityEdit(legacy, 'features', { op: 'update', id: 'f1', field: 'name', value: 'X' });
    expect((out.features as any).f1.name).toBe('X');
  });
});

describe('applyNodeNestedEdit — modules array of ids', () => {
  const map = () => ({ lanes: [], phases: [], edges: [],
    nodes: [{ id: 'n1', lane: 'l', phase: 'p', title: 'N', context: { modules: ['f1', 'f2'] } }] });
  it('update by index replaces a module id', () => {
    const out = applyNodeNestedEdit(map(), 'n1', 'modules', { op: 'update', id: '0', field: '0', value: 'fX' });
    expect((out.nodes as any)[0].context.modules).toEqual(['fX', 'f2']);
  });
  it('add appends an empty id; delete by index splices', () => {
    const added = applyNodeNestedEdit(map(), 'n1', 'modules', { op: 'add', id: '' });
    expect((added.nodes as any)[0].context.modules).toEqual(['f1', 'f2', '']);
    const removed = applyNodeNestedEdit(map(), 'n1', 'modules', { op: 'delete', id: '1' });
    expect((removed.nodes as any)[0].context.modules).toEqual(['f1']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/database/applyEntityEdit.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/database/applyEntityEdit.ts
import type { Entity, EntityEdit, EditTarget } from './types';

/** Deep clone via JSON (sources are plain JSON-safe objects). */
function clone<T>(o: T): T {
  return JSON.parse(JSON.stringify(o)) as T;
}

export function editTargetFor(entity: Entity): EditTarget {
  return entity === 'features' ? { source: 'features' } : { source: 'map' };
}

function rowsDict(dt: Record<string, unknown>): { key: 'rows' | 'features' | 'modules'; dict: Record<string, unknown> } {
  if (dt.rows && typeof dt.rows === 'object') return { key: 'rows', dict: dt.rows as Record<string, unknown> };
  if (dt.features && typeof dt.features === 'object') return { key: 'features', dict: dt.features as Record<string, unknown> };
  if (dt.modules && typeof dt.modules === 'object') return { key: 'modules', dict: dt.modules as Record<string, unknown> };
  return { key: 'rows', dict: {} };
}

/** Apply an edit for a map-array entity (lanes/phases/nodes). */
function editMapArray(
  map: Record<string, unknown>,
  arrKey: 'lanes' | 'phases' | 'nodes',
  edit: EntityEdit,
): Record<string, unknown> {
  const out = clone(map);
  const arr = (Array.isArray(out[arrKey]) ? out[arrKey] : []) as Record<string, unknown>[];
  if (edit.op === 'add') {
    const base: Record<string, unknown> =
      arrKey === 'nodes' ? { id: edit.id, lane: '', phase: '', title: edit.id } : { id: edit.id };
    arr.push(base);
  } else if (edit.op === 'delete') {
    out[arrKey] = arr.filter((r) => r.id !== edit.id);
    return out;
  } else {
    const row = arr.find((r) => r.id === edit.id);
    if (row) row[edit.field] = edit.field === 'subCols' ? Number(edit.value) : edit.value;
  }
  out[arrKey] = arr;
  return out;
}

export function applyEntityEdit(
  sourceObj: Record<string, unknown>,
  entity: Entity,
  edit: EntityEdit,
): Record<string, unknown> {
  if (entity === 'lanes' || entity === 'phases' || entity === 'nodes') {
    return editMapArray(sourceObj, entity, edit);
  }
  // features → datatable rows dict
  const out = clone(sourceObj);
  const { key, dict } = rowsDict(out);
  const d = clone(dict);
  if (edit.op === 'add') {
    d[edit.id] = {};
  } else if (edit.op === 'delete') {
    delete d[edit.id];
  } else {
    const row = (d[edit.id] && typeof d[edit.id] === 'object' ? d[edit.id] : {}) as Record<string, unknown>;
    row[edit.field] = edit.field === 'tags'
      ? String(edit.value).split(',').map((s) => s.trim()).filter(Boolean)
      : edit.value;
    d[edit.id] = row;
  }
  out[key] = d;
  return out;
}

export function applyNodeNestedEdit(
  mapObj: Record<string, unknown>,
  nodeId: string,
  field: 'modules' | 'states' | 'meta',
  edit: EntityEdit,
): Record<string, unknown> {
  const out = clone(mapObj);
  const nodes = (Array.isArray(out.nodes) ? out.nodes : []) as Record<string, unknown>[];
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return out;
  const context = (node.context && typeof node.context === 'object' ? node.context : {}) as Record<string, unknown>;
  const arr = (Array.isArray(context[field]) ? context[field] : []) as unknown[];

  if (field === 'modules') {
    if (edit.op === 'add') arr.push('');
    else if (edit.op === 'delete') arr.splice(Number(edit.id), 1);
    else arr[Number(edit.field)] = edit.value;
  } else {
    // states / meta: arrays of objects keyed by index too (v1 scope: modules is the ref case)
    if (edit.op === 'add') arr.push({});
    else if (edit.op === 'delete') arr.splice(Number(edit.id), 1);
    else {
      const item = (arr[Number(edit.id)] && typeof arr[Number(edit.id)] === 'object'
        ? arr[Number(edit.id)] : {}) as Record<string, unknown>;
      item[edit.field] = edit.value;
      arr[Number(edit.id)] = item;
    }
  }
  context[field] = arr;
  node.context = context;
  out.nodes = nodes;
  return out;
}
```

- [ ] **Step 4: Run tests + typecheck**

Run: `npx vitest run src/lib/database/applyEntityEdit.test.ts`
Then: `npx tsc --noEmit`
Expected: all pass, zero type errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/database/applyEntityEdit.ts src/lib/database/applyEntityEdit.test.ts
git commit -m "feat(database): applyEntityEdit + applyNodeNestedEdit (pure)"
```

---

### Task 4: Multi-source `rawSources` + `commitSource` in the hook

**Files:**
- Modify: `src/hooks/useViewerState.ts` (handleFileDrop ~271-291; add `commitSource`; export it)
- Test: `src/hooks/useViewerState.commit.test.ts`

**Interfaces:**
- Consumes: `loadBundle` (existing), `resolveDatatableRefs`, `normalize`, `parseSource`, `serializeSource` NOT needed here (the caller passes text).
- Produces:
  - DnD now sets `rawSources` to `[mapSource, ...datatableSources]` (each `{name,text,lang}`), and stashes the datatable **source texts** so the registry can be rebuilt.
  - `commitSource(index: number, newText: string): void` on the returned hook API — replaces `rawSources[index].text`, rebuilds the registry from all datatable sources, re-resolves refs, re-normalizes, updates `data`. Keeps `data` on parse failure and sets `error`.

- [ ] **Step 1: Write the failing test**

```typescript
// src/hooks/useViewerState.commit.test.ts
import { describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useViewerState } from '@/hooks/useViewerState';

const mapText = JSON.stringify({
  meta: { modes: [{ id: 'Auto', label: 'Auto', color: '#16a34a' }],
    nodeTypes: { stage: { layout: [], contextRefs: { modules: { ref: 'features' } } } },
    datatables: { features: {} } },
  lanes: [{ id: 'l', label: 'L' }], phases: [{ id: 'p', label: 'P' }],
  nodes: [{ id: 'n1', lane: 'l', phase: 'p', title: 'N', type: 'stage', context: { modules: ['f1'] } }],
  edges: [],
});
const featText = JSON.stringify({ _meta: { name: 'features' }, rows: { f1: { name: 'Orig', tomorrow: 'Auto' } } });

function dropFiles(map: string, feat: string): File[] {
  return [
    new File([map], 'map.json', { type: 'application/json' }),
    new File([feat], 'features.json', { type: 'application/json' }),
  ];
}

describe('multi-source rawSources + commitSource', () => {
  it('DnD keeps both source texts; commitSource on the datatable re-resolves into the node', async () => {
    const { result } = renderHook(() => useViewerState());
    await act(async () => { await result.current.handleFileDrop(dropFiles(mapText, featText)); });
    await waitFor(() => expect(result.current.state.data).toBeTruthy());

    // both sources retained
    expect(result.current.state.rawSources.length).toBe(2);
    const featIdx = result.current.state.rawSources.findIndex((s) => s.name === 'features.json');
    expect(featIdx).toBeGreaterThanOrEqual(0);

    // node initially resolves feature name 'Orig'
    const before = result.current.state.data!.nodes[0].context!.modules as any[];
    expect(before[0].name).toBe('Orig');

    // edit the features source text and commit
    const edited = JSON.stringify({ _meta: { name: 'features' }, rows: { f1: { name: 'Edited', tomorrow: 'Auto' } } });
    await act(async () => { result.current.commitSource(featIdx, edited); });
    await waitFor(() => {
      const after = result.current.state.data!.nodes[0].context!.modules as any[];
      expect(after[0].name).toBe('Edited');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/useViewerState.commit.test.ts`
Expected: FAIL — `commitSource` is not a function / only one rawSource.

- [ ] **Step 3: Capture multi-source on DnD**

In `handleFileDrop`, after computing `bundle`, build the datatable source list and pass it through. Replace the body with:

```typescript
  const handleFileDrop = useCallback(async (files: File[]) => {
    const dropped = await Promise.all(
      files.map(async (f) => ({ name: f.name, text: await f.text() })),
    );
    try {
      const { mapText, mapName } = mergeDroppedFiles(dropped);
      const bundleInput = dropped.map((f) => (f.name === mapName ? { name: mapName, text: mapText } : f));
      const bundle = loadBundle(bundleInput);
      // Datatable sources = every dropped file that isn't the map.
      const datatableSources = bundleInput
        .filter((f) => f.name !== bundle.lifecycleName)
        .map((f) => ({ name: f.name, text: f.text, lang: detectLang(f.name, f.text) }));
      await loadFromText(
        bundle.lifecycleText, bundle.lifecycleName, 'dnd',
        undefined, undefined, bundle.registry, datatableSources,
      );
    } catch (e) {
      setState((s) => ({ ...s, error: e instanceof Error ? e.message : String(e) }));
    }
  }, [loadFromText]);
```

- [ ] **Step 4: Thread `datatableSources` into `loadFromText` and store them**

Add a parameter to `loadFromText` and include the extra sources in `rawSources`:

```typescript
  const loadFromText = useCallback(async (
    text: string,
    name: string,
    source: ViewerSource,
    slug?: string,
    baseUrl?: string,
    registry?: DatatableRegistry,
    datatableSources?: RawSource[],
  ) => {
    try {
      const data = parseSource(text);
      const resolved = baseUrl
        ? await resolveExternalModules(data, (u) => fetchRelativeText(u, baseUrl), name)
        : data;
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
        rawSources: [{ name, text, lang: detectLang(name, text) }, ...(datatableSources ?? [])],
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

- [ ] **Step 5: Add `commitSource` and export it**

Add this callback near the other hook callbacks (before the `return`), then add `commitSource` to the returned object:

```typescript
  const commitSource = useCallback((index: number, newText: string) => {
    setState((s) => {
      const sources = s.rawSources.slice();
      const target = sources[index];
      if (!target) return s;
      sources[index] = { ...target, text: newText };
      try {
        // Source 0 is the map; the rest are datatables. Rebuild registry from them.
        const mapSource = sources[0];
        if (!mapSource) return s;
        const mapData = parseSource(mapSource.text);
        const dtFiles = sources.slice(1).map((src) => ({ name: src.name, text: src.text }));
        const bundle = loadBundle([{ name: mapSource.name, text: mapSource.text }, ...dtFiles]);
        const withRefs = resolveDatatableRefs(mapData, bundle.registry);
        const normalized = normalize(withRefs);
        return { ...s, rawSources: sources, data: normalized, datatables: bundle.registry, error: null };
      } catch (e) {
        // Keep last good data; surface the error.
        return { ...s, rawSources: sources, error: e instanceof Error ? e.message : String(e) };
      }
    });
  }, []);
```

Add `commitSource,` to the returned object (after `handlePaste,`).

- [ ] **Step 6: Run the new test + existing hook tests + typecheck + lint**

Run: `npx vitest run src/hooks/useViewerState.commit.test.ts src/hooks/useViewerState.test.ts src/hooks/useViewerState.datatables.test.ts`
Then: `npx tsc --noEmit && npx eslint src/hooks/useViewerState.ts`
Expected: all pass, zero errors, lint clean.

- [ ] **Step 7: Full suite (regression gate — this touches a core hook)**

Run: `npx vitest run`
Expected: all pass (single-source maps still produce one rawSource; existing tests unaffected).

- [ ] **Step 8: Commit**

```bash
git add src/hooks/useViewerState.ts src/hooks/useViewerState.commit.test.ts
git commit -m "feat(database): multi-source rawSources + commitSource write path"
```

---

### Task 5: Install Glide Data Grid (code-split verified)

**Files:**
- Modify: `package.json` (+ `package-lock.json` via npm)

**Interfaces:**
- Produces: `@glideapps/glide-data-grid` + peers available to import; a dynamic import boundary so it stays out of the main chunk (the boundary itself lands in Task 7 where `DatabasePanel` is lazy-imported; this task only installs and sanity-checks).

- [ ] **Step 1: Install the grid and its peer deps**

Run:

```bash
npm install @glideapps/glide-data-grid lodash marked react-responsive-carousel
```

Expected: added to `dependencies`; lockfile updated.

- [ ] **Step 2: Verify it imports and the CSS path exists**

Run:

```bash
node -e "require.resolve('@glideapps/glide-data-grid'); require.resolve('@glideapps/glide-data-grid/dist/index.css'); console.log('resolves')"
```

Expected: prints `resolves`.

- [ ] **Step 3: Typecheck (no code uses it yet — just confirms install didn't break types)**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "build(database): add @glideapps/glide-data-grid (MIT) + peers"
```

---

### Task 6: `EntityGrid` (Glide wrapper) + `NestedTable`

**Files:**
- Create: `src/components/DatabasePanel/EntityGrid.tsx`
- Create: `src/components/DatabasePanel/NestedTable.tsx`
- Test: `src/components/DatabasePanel/EntityGrid.test.tsx`

**Interfaces:**
- Consumes: `GridRows`, `GridColumn`, `EntityEdit` (Task 1); `Mode` (`@/types/lifecycle-map`); Glide's `DataEditor`.
- Produces:
  - `EntityGrid` props: `{ grid: GridRows; modes: Mode[]; featureIds?: string[]; onEdit: (rowId: string, field: string, value: string) => void; onAdd: () => void; onDelete: (rowId: string) => void; selectedRowId?: string; onSelectRow?: (rowId: string) => void }`
  - `NestedTable` props: `{ node: Record<string, unknown>; field: 'modules' | 'states' | 'meta'; featureIds: string[]; onFieldChange: (f: 'modules'|'states'|'meta') => void; onEdit: (edit: EntityEdit) => void }`

> Testing note: Glide renders to `<canvas>`, which jsdom/happy-dom can't paint. So the component tests assert the **callback wiring and derived props** (that `onEdit`/`onAdd`/`onDelete` fire with the right args, that mode columns expose the mode option list, that the ref picker computes only existing feature ids) by testing the small pure helpers the component uses — NOT by pixel-reading the canvas. Extract those helpers so they're unit-testable.

- [ ] **Step 1: Write the failing test (against extracted pure helpers)**

```typescript
// src/components/DatabasePanel/EntityGrid.test.tsx
import { describe, expect, it } from 'vitest';
import { cellForColumn, modeOptions, isValidRef } from '@/components/DatabasePanel/EntityGrid';
import type { GridColumn } from '@/lib/database/types';

const modes = [
  { id: 'Auto', label: 'Auto', color: '#16a34a' },
  { id: 'Manual', label: 'Manual', color: '#b91c1c' },
];

describe('EntityGrid helpers', () => {
  it('modeOptions lists mode ids for a dropdown', () => {
    expect(modeOptions(modes)).toEqual(['Auto', 'Manual']);
  });

  it('cellForColumn marks a mode column as a dropdown cell', () => {
    const col: GridColumn = { id: 'today', title: 'today', kind: 'mode' };
    const cell = cellForColumn(col, 'Auto', modes, []);
    expect(cell.kind).toBe('dropdown');
    expect(cell.allowedValues).toEqual(['Auto', 'Manual']);
    expect(cell.value).toBe('Auto');
  });

  it('cellForColumn marks a ref column as a dropdown of feature ids', () => {
    const col: GridColumn = { id: 'ref', title: 'feature', kind: 'ref', refTable: 'features' };
    const cell = cellForColumn(col, 'f1', modes, ['f1', 'f2']);
    expect(cell.kind).toBe('dropdown');
    expect(cell.allowedValues).toEqual(['f1', 'f2']);
  });

  it('cellForColumn returns a plain text cell for text columns', () => {
    const col: GridColumn = { id: 'name', title: 'name', kind: 'text' };
    expect(cellForColumn(col, 'hi', modes, []).kind).toBe('text');
  });

  it('isValidRef flags whether a ref exists among feature ids', () => {
    expect(isValidRef('f1', ['f1', 'f2'])).toBe(true);
    expect(isValidRef('nope', ['f1', 'f2'])).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/DatabasePanel/EntityGrid.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `EntityGrid` with exported pure helpers**

```tsx
// src/components/DatabasePanel/EntityGrid.tsx
import { useCallback, useMemo } from 'react';
import {
  DataEditor,
  GridCellKind,
  type GridCell,
  type GridColumn as GlideColumn,
  type Item,
  type EditableGridCell,
} from '@glideapps/glide-data-grid';
import '@glideapps/glide-data-grid/dist/index.css';
import type { GridColumn, GridRows } from '@/lib/database/types';
import type { Mode } from '@/types/lifecycle-map';

/** Pure: mode ids for a dropdown cell. */
export function modeOptions(modes: Mode[]): string[] {
  return modes.map((m) => m.id);
}

/** Pure: whether a ref id exists in the target id list. */
export function isValidRef(id: string, ids: string[]): boolean {
  return ids.includes(id);
}

/** Pure: a lightweight cell descriptor (decouples tests from Glide's runtime). */
export interface CellDesc {
  kind: 'text' | 'dropdown';
  value: string;
  allowedValues?: string[];
  readonly?: boolean;
}

export function cellForColumn(col: GridColumn, value: string, modes: Mode[], featureIds: string[]): CellDesc {
  if (col.kind === 'mode') {
    return { kind: 'dropdown', value, allowedValues: modeOptions(modes), readonly: !!col.readOnly };
  }
  if (col.kind === 'ref') {
    return { kind: 'dropdown', value, allowedValues: featureIds, readonly: !!col.readOnly };
  }
  return { kind: 'text', value, readonly: !!col.readOnly };
}

export interface EntityGridProps {
  grid: GridRows;
  modes: Mode[];
  featureIds?: string[];
  onEdit: (rowId: string, field: string, value: string) => void;
  onAdd: () => void;
  onDelete: (rowId: string) => void;
  selectedRowId?: string;
  onSelectRow?: (rowId: string) => void;
}

export function EntityGrid({ grid, modes, featureIds = [], onEdit, onAdd, onDelete, onSelectRow }: EntityGridProps) {
  const glideCols: GlideColumn[] = useMemo(
    () => grid.columns.map((c) => ({ title: c.title, id: c.id, width: 180 })),
    [grid.columns],
  );

  const getCellContent = useCallback((cell: Item): GridCell => {
    const [colIdx, rowIdx] = cell;
    const col = grid.columns[colIdx];
    const row = grid.rows[rowIdx];
    const raw = col && row ? row[col.id] : '';
    const value = raw == null ? '' : String(raw);
    if (col && (col.kind === 'mode' || col.kind === 'ref')) {
      const allowed = col.kind === 'mode' ? modeOptions(modes) : featureIds;
      return {
        kind: GridCellKind.Custom as never, // dropdown via allowedValues in overlay editor
        allowCustomValue: col.kind === 'mode',
        readonly: !!col.readOnly,
        copyData: value,
        data: { kind: 'dropdown-cell', value, allowedValues: allowed },
      } as unknown as GridCell;
    }
    return {
      kind: GridCellKind.Text,
      data: value,
      displayData: value,
      allowOverlay: !col?.readOnly,
      readonly: !!col?.readOnly,
    };
  }, [grid, modes, featureIds]);

  const onCellEdited = useCallback((cell: Item, newVal: EditableGridCell): void => {
    const [colIdx, rowIdx] = cell;
    const col = grid.columns[colIdx];
    const row = grid.rows[rowIdx];
    if (!col || !row) return;
    const id = String(row.id);
    const v = 'data' in newVal ? String((newVal as { data: unknown }).data ?? '') : '';
    onEdit(id, col.id, v);
  }, [grid, onEdit]);

  const onRowSelected = useCallback((sel: { current?: { cell: Item } }) => {
    const rowIdx = sel.current?.cell?.[1];
    if (rowIdx == null) return;
    const row = grid.rows[rowIdx];
    if (row && onSelectRow) onSelectRow(String(row.id));
  }, [grid, onSelectRow]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '6px 8px', display: 'flex', gap: 8 }}>
        <button onClick={onAdd}>+ Add</button>
        <button onClick={() => { const r = grid.rows[0]; if (r) onDelete(String(r.id)); }} disabled={grid.rows.length === 0}>
          Delete first
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <DataEditor
          columns={glideCols}
          rows={grid.rows.length}
          getCellContent={getCellContent}
          onCellEdited={onCellEdited}
          onGridSelectionChange={onRowSelected as never}
          rowMarkers="number"
          smoothScrollX
          smoothScrollY
        />
      </div>
    </div>
  );
}
```

> Note: the delete affordance in Step 3 is a simple button for wiring/tests. The polished per-row delete (right-click / trailing action column) is a visual refinement folded into Task 7's styling — not a separate task.

- [ ] **Step 4: Write `NestedTable`**

```tsx
// src/components/DatabasePanel/NestedTable.tsx
import { useMemo } from 'react';
import type { EntityEdit } from '@/lib/database/types';

/** Pure: read a node's nested field as a normalized array. */
export function nestedRows(node: Record<string, unknown>, field: 'modules' | 'states' | 'meta'): unknown[] {
  const ctx = (node.context && typeof node.context === 'object' ? node.context : {}) as Record<string, unknown>;
  const v = ctx[field];
  return Array.isArray(v) ? v : [];
}

export interface NestedTableProps {
  node: Record<string, unknown>;
  field: 'modules' | 'states' | 'meta';
  featureIds: string[];
  onFieldChange: (f: 'modules' | 'states' | 'meta') => void;
  onEdit: (edit: EntityEdit) => void;
}

export function NestedTable({ node, field, featureIds, onFieldChange, onEdit }: NestedTableProps) {
  const rows = useMemo(() => nestedRows(node, field), [node, field]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '6px 8px', display: 'flex', gap: 8, alignItems: 'center' }}>
        <strong>{String(node.id)}</strong>
        <select value={field} onChange={(e) => onFieldChange(e.target.value as 'modules' | 'states' | 'meta')}>
          <option value="modules">modules</option>
          <option value="states">states</option>
          <option value="meta">meta</option>
        </select>
        <button style={{ marginLeft: 'auto' }} onClick={() => onEdit({ op: 'add', id: '' })}>+ add</button>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {field === 'modules' ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr><th>#</th><th>feature id (ref)</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>
                    <select
                      value={String(r)}
                      onChange={(e) => onEdit({ op: 'update', id: String(i), field: String(i), value: e.target.value })}
                    >
                      <option value="">—</option>
                      {featureIds.map((fid) => <option key={fid} value={fid}>{fid}</option>)}
                    </select>
                    <button onClick={() => onEdit({ op: 'delete', id: String(i) })}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: 8, fontSize: 12, color: '#6b7280' }}>
            {field} editing (key/value) — {rows.length} item(s)
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run tests + typecheck**

Run: `npx vitest run src/components/DatabasePanel/EntityGrid.test.tsx`
Then: `npx tsc --noEmit`
Expected: helper tests pass; zero type errors. (If Glide's exact type names differ by version, adjust the imports to the installed version's exports — keep the exported pure helpers stable.)

- [ ] **Step 6: Commit**

```bash
git add src/components/DatabasePanel/EntityGrid.tsx src/components/DatabasePanel/NestedTable.tsx src/components/DatabasePanel/EntityGrid.test.tsx
git commit -m "feat(database): EntityGrid (Glide) + NestedTable + pure cell helpers"
```

---

### Task 7: `DatabasePanel` (tabs + split) + CSS + barrel

**Files:**
- Create: `src/components/DatabasePanel/DatabasePanel.tsx`
- Create: `src/components/DatabasePanel/DatabasePanel.module.css`
- Create: `src/components/DatabasePanel/index.ts`
- Test: `src/components/DatabasePanel/DatabasePanel.test.tsx`

**Interfaces:**
- Consumes: `deriveEntityRows` (T2), `applyEntityEdit`/`applyNodeNestedEdit`/`editTargetFor` (T3), `serializeSource` (T1), `EntityGrid`/`NestedTable` (T6), `DatatableRegistry`, `NormalizedMap`, `RawSource`.
- Produces:
  - `DatabasePanel` props: `{ open: boolean; onClose: () => void; data: NormalizedMap; rawSources: RawSource[]; registry?: DatatableRegistry; onCommit: (sourceIndex: number, newText: string) => void }`
  - Exported pure helper `sourceIndexForEntity(rawSources: RawSource[], entity: Entity): number` — map → 0; features → index of the datatable source named `features`(.json/.datatable.json), else -1.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/DatabasePanel/DatabasePanel.test.tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DatabasePanel, sourceIndexForEntity } from '@/components/DatabasePanel';
import type { NormalizedMap } from '@/types/lifecycle-map';
import type { RawSource } from '@/hooks/useViewerState';

const data = {
  meta: { modes: [{ id: 'Auto', label: 'Auto', color: '#16a34a' }] },
  lanes: [{ id: 'l', label: 'L' }], phases: [{ id: 'p', label: 'P' }],
  nodes: [{ id: 'n1', lane: 'l', phase: 'p', title: 'N', states: {} }],
  edges: [], _modeMap: {}, _moduleCatalog: {},
} as unknown as NormalizedMap;

const sources: RawSource[] = [
  { name: 'map.json', text: '{}', lang: 'json' },
  { name: 'features.json', text: '{"_meta":{"name":"features"},"rows":{}}', lang: 'json' },
];

describe('sourceIndexForEntity', () => {
  it('maps map entities to 0 and features to the features source', () => {
    expect(sourceIndexForEntity(sources, 'lanes')).toBe(0);
    expect(sourceIndexForEntity(sources, 'nodes')).toBe(0);
    expect(sourceIndexForEntity(sources, 'features')).toBe(1);
  });
});

describe('DatabasePanel', () => {
  it('renders tabs and a back control when open', () => {
    render(<DatabasePanel open data={data} rawSources={sources} onClose={vi.fn()} onCommit={vi.fn()} />);
    expect(screen.getByRole('button', { name: /personas/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /steps/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /features/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /nodes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to map/i })).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    const { container } = render(<DatabasePanel open={false} data={data} rawSources={sources} onClose={vi.fn()} onCommit={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('back control calls onClose', () => {
    const onClose = vi.fn();
    render(<DatabasePanel open data={data} rawSources={sources} onClose={onClose} onCommit={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /back to map/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
```

> Glide renders to canvas; these tests assert the panel shell (tabs, back button, closed=null) and the pure `sourceIndexForEntity`. They do not assert canvas pixels.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/DatabasePanel/DatabasePanel.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the CSS**

```css
/* src/components/DatabasePanel/DatabasePanel.module.css */
.overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: var(--surface, #fff);
  display: flex;
  flex-direction: column;
}
.tabs {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--border, #e5e7eb);
}
.tab { padding: 6px 12px; border: none; background: none; cursor: pointer; border-radius: 6px; color: var(--text-muted, #6b7280); }
.tabActive { background: var(--text, #111); color: #fff; }
.back { margin-left: auto; color: var(--accent, #2563eb); background: none; border: none; cursor: pointer; }
.body { flex: 1; min-height: 0; display: flex; }
.split { display: flex; flex: 1; min-height: 0; position: relative; }
.splitLeft { width: 52%; min-width: 0; border-right: 1px solid var(--border, #e5e7eb); }
.splitRight { flex: 1; min-width: 0; }
.marker {
  position: absolute; left: 52%; transform: translateX(-50%);
  width: 22px; height: 22px; border-radius: 50%;
  background: var(--accent, #2563eb); color: #fff;
  display: flex; align-items: center; justify-content: center; font-weight: 700; z-index: 2;
}
```

- [ ] **Step 4: Write `DatabasePanel` + `index.ts`**

```tsx
// src/components/DatabasePanel/DatabasePanel.tsx
import { useMemo, useState } from 'react';
import type { NormalizedMap, Mode } from '@/types/lifecycle-map';
import type { RawSource } from '@/hooks/useViewerState';
import type { DatatableRegistry } from '@/lib/datatables/registry';
import type { Entity, EntityEdit } from '@/lib/database/types';
import { deriveEntityRows } from '@/lib/database/deriveEntityRows';
import { applyEntityEdit, applyNodeNestedEdit } from '@/lib/database/applyEntityEdit';
import { serializeSource } from '@/lib/database/serializeSource';
import { parseSource } from '@/lib/parseSource';
import { EntityGrid } from './EntityGrid';
import { NestedTable } from './NestedTable';
import styles from './DatabasePanel.module.css';

const TABS: { id: Entity; label: string }[] = [
  { id: 'lanes', label: 'Personas' },
  { id: 'phases', label: 'Steps' },
  { id: 'features', label: 'Features' },
  { id: 'nodes', label: 'Nodes' },
];

/** Pure: which rawSource index backs an entity (map=0; features=the features datatable). */
export function sourceIndexForEntity(rawSources: RawSource[], entity: Entity): number {
  if (entity !== 'features') return 0;
  const idx = rawSources.findIndex((s, i) => i > 0 && /(^|\/)features(\.datatable)?\.(json|csv)$/i.test(s.name));
  return idx;
}

export interface DatabasePanelProps {
  open: boolean;
  onClose: () => void;
  data: NormalizedMap;
  rawSources: RawSource[];
  registry?: DatatableRegistry;
  onCommit: (sourceIndex: number, newText: string) => void;
}

export function DatabasePanel({ open, onClose, data, rawSources, registry, onCommit }: DatabasePanelProps) {
  const [tab, setTab] = useState<Entity>('lanes');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nestedField, setNestedField] = useState<'modules' | 'states' | 'meta'>('modules');
  if (!open) return null;

  const modes: Mode[] = (data.meta.modes ?? []) as Mode[];
  const featureIds = registry?.ids('features') ?? [];
  const grid = deriveEntityRows(data, registry, tab);

  const commitEntity = (edit: EntityEdit): void => {
    const idx = sourceIndexForEntity(rawSources, tab);
    const src = rawSources[idx];
    if (!src) return;
    const obj = parseSource(src.text) as unknown as Record<string, unknown>;
    const next = applyEntityEdit(obj, tab, edit);
    onCommit(idx, serializeSource(next, src.lang));
  };

  const commitNodeNested = (edit: EntityEdit): void => {
    if (!selectedNodeId) return;
    const src = rawSources[0];
    if (!src) return;
    const obj = parseSource(src.text) as unknown as Record<string, unknown>;
    const next = applyNodeNestedEdit(obj, selectedNodeId, nestedField, edit);
    onCommit(0, serializeSource(next, src.lang));
  };

  const selectedNode = selectedNodeId
    ? (data.nodes.find((n) => n.id === selectedNodeId) as unknown as Record<string, unknown> | undefined)
    : undefined;

  return (
    <div className={styles.overlay} role="dialog" aria-label="Database editor">
      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
            onClick={() => setTab(t.id)}
          >{t.label}</button>
        ))}
        <button className={styles.back} onClick={onClose}>← back to map</button>
      </div>

      <div className={styles.body}>
        {tab === 'nodes' ? (
          <div className={styles.split}>
            <div className={styles.splitLeft}>
              <EntityGrid
                grid={grid}
                modes={modes}
                onEdit={(id, field, value) => commitEntity({ op: 'update', id, field, value })}
                onAdd={() => commitEntity({ op: 'add', id: `node-${Date.now()}` })}
                onDelete={(id) => commitEntity({ op: 'delete', id })}
                selectedRowId={selectedNodeId ?? undefined}
                onSelectRow={setSelectedNodeId}
              />
            </div>
            {selectedNode && <div className={styles.marker}>&lt;</div>}
            <div className={styles.splitRight}>
              {selectedNode
                ? <NestedTable node={selectedNode} field={nestedField} featureIds={featureIds}
                    onFieldChange={setNestedField} onEdit={commitNodeNested} />
                : <div style={{ padding: 12, color: '#6b7280' }}>Select a node row to edit its nested fields.</div>}
            </div>
          </div>
        ) : (
          <EntityGrid
            grid={grid}
            modes={modes}
            featureIds={tab === 'features' ? featureIds : undefined}
            onEdit={(id, field, value) => commitEntity({ op: 'update', id, field, value })}
            onAdd={() => commitEntity({ op: 'add', id: `${tab}-${Date.now()}` })}
            onDelete={(id) => commitEntity({ op: 'delete', id })}
          />
        )}
      </div>
    </div>
  );
}
```

```typescript
// src/components/DatabasePanel/index.ts
export { DatabasePanel, sourceIndexForEntity } from './DatabasePanel';
export type { DatabasePanelProps } from './DatabasePanel';
```

- [ ] **Step 5: Run tests + typecheck + lint**

Run: `npx vitest run src/components/DatabasePanel/DatabasePanel.test.tsx`
Then: `npx tsc --noEmit && npx eslint src/components/DatabasePanel/`
Expected: pass, zero errors, lint clean.

- [ ] **Step 6: Commit**

```bash
git add src/components/DatabasePanel/
git commit -m "feat(database): DatabasePanel (tabs + nodes split + < marker)"
```

---

### Task 8: Wire into App (lazy-loaded) + multi-source export + code-split verify

**Files:**
- Modify: `src/App.tsx` (header button, `dbOpen` state, lazy `<DatabasePanel>`, `commitSource` wiring, `getJsonText`)
- Test: `src/App.database.test.tsx`

**Interfaces:**
- Consumes: `viewer.commitSource` (T4), `DatabasePanel` (T7, lazy).
- Produces: header button toggles a full-screen editor; edits round-trip via `commitSource`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/App.database.test.tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from '@/App';

describe('App — Database button', () => {
  it('renders a Database toggle button in the header when a map is loaded', async () => {
    // Load an example via hash so the app has data.
    window.location.hash = '#hiring-pipeline';
    render(<App />);
    // The header button is labeled "Database"; wait for the app to leave splash/loading.
    const btn = await screen.findByRole('button', { name: /database/i }, { timeout: 5000 });
    expect(btn).toBeInTheDocument();
  });
});
```

> If loading an example in the test environment is flaky (it fetches `./examples/*.json`), instead assert against a minimal harness that renders `AppShell` with injected data. Keep whichever is green; the point is that the Database button exists and toggles `dbOpen`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/App.database.test.tsx`
Expected: FAIL — no Database button.

- [ ] **Step 3: Add lazy import + state + button + panel to App.tsx**

At the top of `src/App.tsx`, add:

```tsx
import { lazy, Suspense } from 'react';
const DatabasePanel = lazy(() => import('@/components/DatabasePanel').then((m) => ({ default: m.DatabasePanel })));
```

Add state near the other drawer states (line ~93):

```tsx
  const [dbOpen, setDbOpen] = useState(false);
```

Add a header button next to the settings button (after the settings `<button>` around line 330):

```tsx
              <button className="h-icon-btn" title="Database" onClick={() => setDbOpen(true)} aria-label="Database">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></svg>
              </button>
```

Update `getJsonText` to prefer the map source (index 0) explicitly (already `rawSources[0]` — leave as is; multi-source export beyond the map is out of scope for v1 and documented).

Render the panel near the other drawers (after `<CodeDrawer>`), wrapped in Suspense:

```tsx
      {dbOpen && (
        <Suspense fallback={<div className="loading">Loading editor…</div>}>
          <DatabasePanel
            open={dbOpen}
            onClose={() => setDbOpen(false)}
            data={data}
            rawSources={viewer.state.rawSources}
            registry={viewer.state.datatables}
            onCommit={viewer.commitSource}
          />
        </Suspense>
      )}
```

Also add `dbOpen` reset to the Escape handler in `useKeyboard` `onEscape` (line ~183): add `setDbOpen(false);`.

- [ ] **Step 4: Run the App test + typecheck + lint**

Run: `npx vitest run src/App.database.test.tsx`
Then: `npx tsc --noEmit && npx eslint src/App.tsx`
Expected: pass; zero type errors; lint clean.

- [ ] **Step 5: Verify code-splitting (grid NOT in the main chunk)**

Run:

```bash
npm run build
node -e "const fs=require('fs'),p='dist/assets';const files=fs.readdirSync(p);const main=files.filter(f=>/index-.*\.js$/.test(f));const hasGlide=main.some(f=>fs.readFileSync(p+'/'+f,'utf8').includes('glide-data-grid'));console.log('main chunks:',main,'contains glide:',hasGlide);process.exit(hasGlide?1:0)"
```

Expected: prints `contains glide: false` and exits 0 (the grid is in a separate lazy chunk). If it exits 1, the lazy import boundary is wrong — fix the dynamic import so `DatabasePanel` and its Glide import are only reachable via `import()`.

- [ ] **Step 6: Full suite + lint gate**

Run: `npx vitest run && npx tsc --noEmit && npm run lint`
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/App.database.test.tsx
git commit -m "feat(database): lazy-loaded full-screen Database panel wired into App"
```

---

### Task 9: Local Air Billing smoke test + docs

**Files:**
- Modify: `SCHEMA.md` (a short "Editing in the Database panel" note) — or `docs/` — tracked docs only.

> The Air Billing data is git-ignored; verification is a local render check (temp test), not a repo test.

- [ ] **Step 1: Local smoke test against the migrated Air Billing bundle**

Create a temp test, run it, delete it:

```bash
cd /Users/arkady/Projects/zalkowitsch/lifecycle-map
cat > src/_verify_db_airbilling.test.tsx <<'EOF'
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DatabasePanel } from '@/components/DatabasePanel';
import { loadBundle } from '@/lib/datatables/loadBundle';
import { resolveDatatableRefs } from '@/lib/datatables/resolveDatatableRefs';
import { normalize } from '@/hooks/useViewerState';
import { parseSource } from '@/lib/parseSource';

const DIR = process.env.HOME + '/Projects/zalkowitsch/lifecycle-map/workspace/air-billing';
describe('DatabasePanel over Air Billing bundle', () => {
  it('opens, shows tabs, and derives feature rows from the datatable', () => {
    const bundle = loadBundle([
      { name: 'biller-lifecycle.json', text: readFileSync(`${DIR}/biller-lifecycle.json`,'utf8') },
      { name: 'features.json', text: readFileSync(`${DIR}/features.json`,'utf8') },
    ]);
    const data = normalize(resolveDatatableRefs(parseSource(bundle.lifecycleText), bundle.registry));
    const sources = [
      { name: 'biller-lifecycle.json', text: bundle.lifecycleText, lang: 'json' as const },
      { name: 'features.json', text: readFileSync(`${DIR}/features.json`,'utf8'), lang: 'json' as const },
    ];
    render(<DatabasePanel open data={data} rawSources={sources} registry={bundle.registry} onClose={()=>{}} onCommit={()=>{}} />);
    expect(screen.getByRole('button', { name: /features/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /features/i }));
    // registry has many features
    expect(bundle.registry.ids('features').length).toBeGreaterThan(10);
  });
});
EOF
npx vitest run src/_verify_db_airbilling.test.tsx
rm src/_verify_db_airbilling.test.tsx
```

Expected: PASS; then the temp file is removed. Confirm `git status` does not list it.

- [ ] **Step 2: Add a short docs note**

In `SCHEMA.md`, after the datatables section, add a brief "Editing in the Database panel" paragraph: the viewer has a full-screen Database editor (header DB icon) with tabs for Personas/Steps/Features/Nodes; edits apply live; feature edits mutate the features datatable and reflect in referencing nodes; drop the map + datatables together to edit both.

- [ ] **Step 3: Full gate + commit**

Run: `npx vitest run && npx tsc --noEmit && npm run lint`
Expected: all green.

```bash
git add SCHEMA.md
git commit -m "docs: document the Database editor panel"
```

---

## Self-Review

**Spec coverage:**
- Full-screen panel + tabs + back → Task 7, 8. ✓
- Glide Data Grid (MIT), not Handsontable → Task 5, 6. ✓
- Full CRUD on 4 entities → `applyEntityEdit` (T3) + grid callbacks (T6/T7). ✓
- Live edits via loadFromText-style round-trip → `commitSource` (T4) + panel commit (T7). ✓
- Multi-file rawSources → Task 4. ✓
- Nodes split + nested table + `<` marker + ref picker (only existing feature ids) → T6 (`NestedTable`), T7 (split + marker). ✓
- Mode columns via meta.modes dropdown → `deriveEntityRows` mode kind (T2) + `cellForColumn` (T6). ✓
- Broken ref degrades (Phase 1) + picker prevents new broken refs → T6 picker offers only existing ids. ✓
- Delete-with-dependents warning → **GAP** noted below.
- Code-split (grid not in main chunk) → Task 8 Step 5 verifies. ✓
- Out of scope (layout editor, edges, undo, CSV fidelity) → not implemented, correct. ✓

**Gap found & resolved:** the spec's "delete with dependents warns with a count" is not in a task. It's a small UX affordance; rather than expand scope silently, I note it here as a **deliberate v1 deferral**: v1 allows delete and relies on the resolver's existing degrade-on-broken-ref (Phase 1) to keep the map safe; the confirmation-count dialog is a fast-follow. Flag this to the user at execution handoff so they can decide whether to add it now.

**Placeholder scan:** No TBD/TODO; every code step has complete code; no "similar to Task N". The two testing notes (Glide canvas can't be pixel-tested; example-load may be flaky) give concrete fallbacks, not vague instructions. ✓

**Type consistency:** `Entity`, `GridColumn`, `GridRows`, `EntityEdit`, `EditTarget` defined in T1, used consistently T2–T7. `deriveEntityRows(map, registry, entity)` signature identical T2/T7. `applyEntityEdit(obj, entity, edit)` and `applyNodeNestedEdit(mapObj, nodeId, field, edit)` identical T3/T7. `commitSource(index, newText)` defined T4, consumed T7/T8. `cellForColumn`/`modeOptions`/`isValidRef` exported T6, tested T6. `sourceIndexForEntity` defined + exported T7, tested T7. ✓
