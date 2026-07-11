# Database Editor v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add spreadsheet copy/paste + undo/redo to the Database grid, make states/meta editable with a delete-dependents warning and a localized-field hint, and give the CodeDrawer a Format button plus multi-file zip export.

**Architecture:** Pure logic units first (`pasteEdits`, `countDependents`, `discoverLangs`, `zipStore`, fixed `applyNodeNestedEdit`), each testable without UI. Then a `useSourceHistory` hook for panel-scoped undo/redo, wired through a single batched-commit path (`onEditBatch`). Then UI wiring in EntityGrid, NestedTable, DatabasePanel, and CodeDrawer. Everything reuses the existing commit pipeline (`applyEntityEdit`/`applyNodeNestedEdit` → `serializeSource` → `commitSource`); no schema changes.

**Tech Stack:** TypeScript, React, Vitest, `@glideapps/glide-data-grid` (installed), `js-yaml` (installed). No new dependencies — zip is hand-written (store method + CRC32).

**Spec:** [`docs/superpowers/specs/2026-07-11-database-editor-v2-design.md`](../specs/2026-07-11-database-editor-v2-design.md).

## Global Constraints

- **No new runtime dependencies.** Zip is hand-written (ZIP "store", no deflate, with CRC32).
- **Reuse the live-commit pipeline.** All edits go through `applyEntityEdit`/`applyNodeNestedEdit` → `serializeSource` → `commitSource`. No new persistence path.
- **Undo/redo is per-source and panel-scoped**; history resets when the panel closes or a new map loads. Cap 50.
- **Paste applies as ONE batched commit** (one undo step, one re-render); read-only (`id`) and out-of-range target cells are skipped.
- **Format reformats only the editor buffer**, never stored source; no-op on invalid input.
- **Multi-file export:** >1 source → a `.zip` of all sources; 1 source → unchanged single-file download. Share-by-URL stays map-only.
- **Delete shows a dependent-count confirm**, then deletes anyway (no cascade; dangling ref degrades to `{_unresolved}`).
- **Must pass** `npx tsc --noEmit` (tsconfig `noUncheckedIndexedAccess: true`), `npx eslint` clean on touched files, and the full `npx vitest run` suite.
- **Out of scope:** collaborative editing, cell formulas, sharing a bundle via URL, editing the drawer layout.

---

## File Structure

- `src/lib/database/applyPaste.ts` — pure `pasteEdits(grid, target, values)`.
- `src/lib/database/countDependents.ts` — pure dependent counter.
- `src/lib/database/zip.ts` — pure `zipStore(files)` + CRC32.
- `src/lib/discoverLangs.ts` — extracted shared language discovery.
- `src/lib/database/applyEntityEdit.ts` — MODIFY: fix states/meta index convention.
- `src/components/DatabasePanel/useSourceHistory.ts` — undo/redo over source commits.
- `src/components/DatabasePanel/EntityGrid.tsx` — MODIFY: copy, paste, `onEditBatch`.
- `src/components/DatabasePanel/NestedTable.tsx` — MODIFY: states/meta editors.
- `src/components/DatabasePanel/DatabasePanel.tsx` — MODIFY: batched commit, history + keyboard, delete confirm, lang hint, zip via CodeDrawer? (export lives in CodeDrawer).
- `src/components/CodeDrawer/CodeDrawer.tsx` — MODIFY: Format button, "Download all" (zip).
- `src/App.tsx` — MODIFY: use extracted `discoverLangs`.

---

### Task 1: `discoverLangs` extracted + shared

**Files:**
- Create: `src/lib/discoverLangs.ts`
- Test: `src/lib/discoverLangs.test.ts`
- Modify: `src/App.tsx` (replace local `discoverLangs` with the import)

**Interfaces:**
- Produces: `discoverLangs(data: unknown): string[]` — sorted 2-letter (or `xx-YY`) language codes found in localized `{lang: string}` objects.

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/discoverLangs.test.ts
import { describe, expect, it } from 'vitest';
import { discoverLangs } from '@/lib/discoverLangs';

describe('discoverLangs', () => {
  it('finds language codes in localized string objects', () => {
    const data = { meta: { title: { en: 'Hi', pt: 'Oi' } }, nodes: [{ title: { en: 'A', es: 'B' } }] };
    expect(discoverLangs(data)).toEqual(['en', 'es', 'pt']);
  });
  it('returns empty when there are no localized objects', () => {
    expect(discoverLangs({ meta: { title: 'Plain' } })).toEqual([]);
  });
  it('ignores non-lang objects (keys not 2-letter codes)', () => {
    expect(discoverLangs({ a: { foo: 'x', bar: 'y' } })).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/discoverLangs.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation** (ported verbatim from `App.tsx`'s local copy)

```typescript
// src/lib/discoverLangs.ts

/** Discover language codes used in localized strings inside the data. */
export function discoverLangs(data: unknown): string[] {
  const set = new Set<string>();
  const visit = (val: unknown): void => {
    if (!val || typeof val !== 'object') return;
    if (Array.isArray(val)) { val.forEach(visit); return; }
    const obj = val as Record<string, unknown>;
    const keys = Object.keys(obj);
    if (
      keys.length > 0 &&
      keys.every((k) => /^[a-z]{2}(-[A-Z]{2})?$/.test(k)) &&
      keys.every((k) => typeof obj[k] === 'string')
    ) {
      keys.forEach((k) => set.add(k));
      return;
    }
    Object.values(obj).forEach(visit);
  };
  visit(data);
  return Array.from(set).sort();
}
```

- [ ] **Step 4: Replace the local copy in App.tsx**

In `src/App.tsx`, add `import { discoverLangs } from '@/lib/discoverLangs';` near the other `@/lib` imports, and DELETE the local `function discoverLangs(data: unknown): string[] { … }` definition (near the bottom of the file). Leave the call sites unchanged.

- [ ] **Step 5: Run tests + typecheck + lint**

Run: `npx vitest run src/lib/discoverLangs.test.ts && npx tsc --noEmit && npx eslint src/lib/discoverLangs.ts src/App.tsx`
Expected: pass, zero errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/discoverLangs.ts src/lib/discoverLangs.test.ts src/App.tsx
git commit -m "refactor(database): extract shared discoverLangs util"
```

---

### Task 2: `countDependents` (pure)

**Files:**
- Create: `src/lib/database/countDependents.ts`
- Test: `src/lib/database/countDependents.test.ts`

**Interfaces:**
- Consumes: `Entity` from `@/lib/database/types`; a parsed map object.
- Produces: `countDependents(map: Record<string, unknown>, entity: Entity, id: string): number`.

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/database/countDependents.test.ts
import { describe, expect, it } from 'vitest';
import { countDependents } from '@/lib/database/countDependents';

const map = {
  lanes: [{ id: 'patient' }, { id: 'biller' }],
  phases: [{ id: 'preVisit' }],
  nodes: [
    { id: 'n1', lane: 'patient', phase: 'preVisit', context: { modules: ['f1', 'f2'] } },
    { id: 'n2', lane: 'biller', phase: 'preVisit', context: { modules: ['f1'] } },
    { id: 'n3', lane: 'patient', phase: 'preVisit', context: {} },
  ],
};

describe('countDependents', () => {
  it('features: counts nodes whose modules include the id', () => {
    expect(countDependents(map, 'features', 'f1')).toBe(2);
    expect(countDependents(map, 'features', 'f2')).toBe(1);
    expect(countDependents(map, 'features', 'nope')).toBe(0);
  });
  it('lanes: counts nodes on the lane', () => {
    expect(countDependents(map, 'lanes', 'patient')).toBe(2);
    expect(countDependents(map, 'lanes', 'biller')).toBe(1);
  });
  it('phases: counts nodes in the phase', () => {
    expect(countDependents(map, 'phases', 'preVisit')).toBe(3);
  });
  it('nodes: always 0 (edges handled elsewhere)', () => {
    expect(countDependents(map, 'nodes', 'n1')).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/database/countDependents.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/database/countDependents.ts
import type { Entity } from './types';

function nodesOf(map: Record<string, unknown>): Record<string, unknown>[] {
  return Array.isArray(map.nodes) ? (map.nodes as Record<string, unknown>[]) : [];
}

/** How many nodes reference the given entity row. Nodes → 0 (edges elsewhere). */
export function countDependents(map: Record<string, unknown>, entity: Entity, id: string): number {
  const nodes = nodesOf(map);
  if (entity === 'lanes') return nodes.filter((n) => n.lane === id).length;
  if (entity === 'phases') return nodes.filter((n) => n.phase === id).length;
  if (entity === 'features') {
    return nodes.filter((n) => {
      const ctx = (n.context && typeof n.context === 'object' ? n.context : {}) as Record<string, unknown>;
      const mods = Array.isArray(ctx.modules) ? ctx.modules : [];
      return mods.includes(id);
    }).length;
  }
  return 0; // nodes
}
```

- [ ] **Step 4: Run tests + typecheck**

Run: `npx vitest run src/lib/database/countDependents.test.ts && npx tsc --noEmit`
Expected: pass, zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/database/countDependents.ts src/lib/database/countDependents.test.ts
git commit -m "feat(database): countDependents pure helper"
```

---

### Task 3: `pasteEdits` (pure)

**Files:**
- Create: `src/lib/database/applyPaste.ts`
- Test: `src/lib/database/applyPaste.test.ts`

**Interfaces:**
- Consumes: `GridRows`, `EntityEdit` from `@/lib/database/types`.
- Produces: `pasteEdits(grid: GridRows, target: [number, number], values: readonly (readonly string[])[]): EntityEdit[]` — `target` is `[colIndex, rowIndex]`; returns `{op:'update', id, field, value}` edits, skipping out-of-range cells and read-only columns.

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/database/applyPaste.test.ts
import { describe, expect, it } from 'vitest';
import { pasteEdits } from '@/lib/database/applyPaste';
import type { GridRows } from '@/lib/database/types';

const grid: GridRows = {
  columns: [
    { id: 'id', title: 'id', kind: 'text', readOnly: true },
    { id: 'label', title: 'label', kind: 'text' },
    { id: 'sub', title: 'sub', kind: 'text' },
  ],
  rows: [
    { id: 'a', label: 'A', sub: 'sa' },
    { id: 'b', label: 'B', sub: 'sb' },
  ],
};

describe('pasteEdits', () => {
  it('maps a 2D paste onto rows/cols starting at target', () => {
    const edits = pasteEdits(grid, [1, 0], [['X', 'Y'], ['Z', 'W']]);
    expect(edits).toEqual([
      { op: 'update', id: 'a', field: 'label', value: 'X' },
      { op: 'update', id: 'a', field: 'sub', value: 'Y' },
      { op: 'update', id: 'b', field: 'label', value: 'Z' },
      { op: 'update', id: 'b', field: 'sub', value: 'W' },
    ]);
  });
  it('skips read-only columns (id)', () => {
    const edits = pasteEdits(grid, [0, 0], [['NEWID', 'NEWLABEL']]);
    expect(edits).toEqual([{ op: 'update', id: 'a', field: 'label', value: 'NEWLABEL' }]);
  });
  it('skips out-of-range rows and columns', () => {
    const edits = pasteEdits(grid, [2, 1], [['only', 'overflow'], ['pastEnd', 'x']]);
    expect(edits).toEqual([{ op: 'update', id: 'b', field: 'sub', value: 'only' }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/database/applyPaste.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/database/applyPaste.ts
import type { GridRows, EntityEdit } from './types';

/**
 * Map a clipboard grid (2D string array) onto edits, starting at `target`
 * ([colIndex, rowIndex]). Skips out-of-range cells and read-only columns.
 */
export function pasteEdits(
  grid: GridRows,
  target: [number, number],
  values: readonly (readonly string[])[],
): EntityEdit[] {
  const [targetCol, targetRow] = target;
  const edits: EntityEdit[] = [];
  for (let r = 0; r < values.length; r++) {
    const rowVals = values[r];
    if (!rowVals) continue;
    const row = grid.rows[targetRow + r];
    if (!row) continue;
    for (let c = 0; c < rowVals.length; c++) {
      const col = grid.columns[targetCol + c];
      if (!col || col.readOnly) continue;
      const value = rowVals[c];
      if (value == null) continue;
      edits.push({ op: 'update', id: String(row.id), field: col.id, value });
    }
  }
  return edits;
}
```

- [ ] **Step 4: Run tests + typecheck**

Run: `npx vitest run src/lib/database/applyPaste.test.ts && npx tsc --noEmit`
Expected: pass, zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/database/applyPaste.ts src/lib/database/applyPaste.test.ts
git commit -m "feat(database): pasteEdits pure helper"
```

---

### Task 4: `zipStore` (pure, no dependency)

**Files:**
- Create: `src/lib/database/zip.ts`
- Test: `src/lib/database/zip.test.ts`

**Interfaces:**
- Produces: `zipStore(files: { name: string; text: string }[]): Uint8Array` — a valid ZIP archive using the "store" method (no compression), with correct CRC32 per entry.

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/database/zip.test.ts
import { describe, expect, it } from 'vitest';
import { zipStore, crc32 } from '@/lib/database/zip';

describe('crc32', () => {
  it('computes the known CRC32 of "hello"', () => {
    // CRC32("hello") = 0x3610a686
    expect(crc32(new TextEncoder().encode('hello')) >>> 0).toBe(0x3610a686);
  });
});

describe('zipStore', () => {
  it('produces bytes starting with the local file header magic PK\\x03\\x04', () => {
    const zip = zipStore([{ name: 'a.json', text: '{}' }]);
    expect(zip[0]).toBe(0x50); // P
    expect(zip[1]).toBe(0x4b); // K
    expect(zip[2]).toBe(0x03);
    expect(zip[3]).toBe(0x04);
  });
  it('ends with the end-of-central-directory magic PK\\x05\\x06', () => {
    const zip = zipStore([{ name: 'a.json', text: '{}' }, { name: 'b.csv', text: 'id\n1' }]);
    // find EOCD signature 0x06054b50 near the end
    let found = false;
    for (let i = zip.length - 22; i >= 0; i--) {
      if (zip[i] === 0x50 && zip[i + 1] === 0x4b && zip[i + 2] === 0x05 && zip[i + 3] === 0x06) { found = true; break; }
    }
    expect(found).toBe(true);
  });
  it('records the correct number of entries in the EOCD', () => {
    const zip = zipStore([{ name: 'a', text: 'x' }, { name: 'b', text: 'y' }, { name: 'c', text: 'z' }]);
    // EOCD total-entries field (offset +10 from EOCD start) should be 3
    let eocd = -1;
    for (let i = zip.length - 22; i >= 0; i--) {
      if (zip[i] === 0x50 && zip[i + 1] === 0x4b && zip[i + 2] === 0x05 && zip[i + 3] === 0x06) { eocd = i; break; }
    }
    const total = zip[eocd + 10]! | (zip[eocd + 11]! << 8);
    expect(total).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/database/zip.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/database/zip.ts
// Minimal ZIP writer using the "store" method (no compression). Enough to bundle
// a handful of small text files (a map + its datatables) with no dependency.

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]!) & 0xff]! ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

interface Entry { nameBytes: Uint8Array; data: Uint8Array; crc: number; offset: number; }

export function zipStore(files: { name: string; text: string }[]): Uint8Array {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const entries: Entry[] = [];
  let offset = 0;

  const push = (u: Uint8Array): void => { chunks.push(u); offset += u.length; };
  const u16 = (n: number): Uint8Array => new Uint8Array([n & 0xff, (n >>> 8) & 0xff]);
  const u32 = (n: number): Uint8Array => new Uint8Array([n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff]);

  // Local file headers + data.
  for (const f of files) {
    const nameBytes = enc.encode(f.name);
    const data = enc.encode(f.text);
    const crc = crc32(data);
    const localOffset = offset;
    push(u32(0x04034b50));        // local file header signature
    push(u16(20));                // version needed
    push(u16(0));                 // flags
    push(u16(0));                 // method 0 = store
    push(u16(0)); push(u16(0));   // mod time, mod date
    push(u32(crc));               // crc32
    push(u32(data.length));       // compressed size
    push(u32(data.length));       // uncompressed size
    push(u16(nameBytes.length));  // file name length
    push(u16(0));                 // extra length
    push(nameBytes);
    push(data);
    entries.push({ nameBytes, data, crc, offset: localOffset });
  }

  // Central directory.
  const cdStart = offset;
  for (const e of entries) {
    push(u32(0x02014b50));        // central dir header signature
    push(u16(20)); push(u16(20)); // version made by / needed
    push(u16(0)); push(u16(0));   // flags / method
    push(u16(0)); push(u16(0));   // time / date
    push(u32(e.crc));
    push(u32(e.data.length)); push(u32(e.data.length));
    push(u16(e.nameBytes.length));
    push(u16(0)); push(u16(0));   // extra / comment length
    push(u16(0)); push(u16(0));   // disk number / internal attrs
    push(u32(0));                 // external attrs
    push(u32(e.offset));          // local header offset
    push(e.nameBytes);
  }
  const cdSize = offset - cdStart;

  // End of central directory.
  push(u32(0x06054b50));
  push(u16(0)); push(u16(0));     // disk numbers
  push(u16(entries.length)); push(u16(entries.length));
  push(u32(cdSize));
  push(u32(cdStart));
  push(u16(0));                   // comment length

  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let p = 0;
  for (const c of chunks) { out.set(c, p); p += c.length; }
  return out;
}
```

- [ ] **Step 4: Run tests + typecheck**

Run: `npx vitest run src/lib/database/zip.test.ts && npx tsc --noEmit`
Expected: pass (CRC32 of "hello" = 0x3610a686; magics present; entry count 3), zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/database/zip.ts src/lib/database/zip.test.ts
git commit -m "feat(database): hand-written zipStore (store method + crc32)"
```

---

### Task 5: Fix `applyNodeNestedEdit` states/meta convention

**Files:**
- Modify: `src/lib/database/applyEntityEdit.ts` (the `applyNodeNestedEdit` states/meta branch)
- Modify: `src/lib/database/applyEntityEdit.test.ts` (add states/meta tests)

**Interfaces:**
- Produces: `applyNodeNestedEdit(mapObj, nodeId, field, edit)` — for ALL fields (`modules`/`states`/`meta`): update uses `edit.field` as the array index; delete uses `edit.id` as the array index; add appends (`''` for modules, `{}` for states/meta). For states/meta object rows, update sets `arr[index][subField] = value` where the sub-field name is carried in a new edit shape — see below.

> **Design note:** `modules` rows are bare strings (index-addressed by `edit.field`). `states`/`meta` rows are objects with named sub-fields (e.g. `label`, `mode`). To set a sub-field we need both the row index AND the sub-field name. Use the existing `EntityEdit` `update` shape as `{ op:'update', id: <rowIndex>, field: <subField>, value }` for states/meta, and `{ op:'update', id: <rowIndex>, field: <rowIndex>, value }` for modules (field == index, sub-field is the whole cell). The implementation branches on `field`.

- [ ] **Step 1: Write the failing tests** (append to `applyEntityEdit.test.ts`)

```typescript
describe('applyNodeNestedEdit — states (array of objects)', () => {
  const map = () => ({ lanes: [], phases: [], edges: [],
    nodes: [{ id: 'n1', lane: 'l', phase: 'p', title: 'N', context: { states: [{ label: 'Today', mode: 'Manual' }] } }] });
  it('update sets a sub-field on the row at index (id=index, field=subField)', () => {
    const out = applyNodeNestedEdit(map(), 'n1', 'states', { op: 'update', id: '0', field: 'mode', value: 'Auto' });
    expect((out.nodes as any)[0].context.states[0]).toEqual({ label: 'Today', mode: 'Auto' });
  });
  it('add appends an empty object; delete by index removes', () => {
    const added = applyNodeNestedEdit(map(), 'n1', 'states', { op: 'add', id: '' });
    expect((added.nodes as any)[0].context.states).toHaveLength(2);
    const removed = applyNodeNestedEdit(map(), 'n1', 'states', { op: 'delete', id: '0' });
    expect((removed.nodes as any)[0].context.states).toEqual([]);
  });
});

describe('applyNodeNestedEdit — meta (label/value pairs)', () => {
  const map = () => ({ lanes: [], phases: [], edges: [],
    nodes: [{ id: 'n1', lane: 'l', phase: 'p', title: 'N', context: { meta: [{ label: 'Entity', value: 'Claim' }] } }] });
  it('update sets value on the pair at index', () => {
    const out = applyNodeNestedEdit(map(), 'n1', 'meta', { op: 'update', id: '0', field: 'value', value: 'Payer' });
    expect((out.nodes as any)[0].context.meta[0]).toEqual({ label: 'Entity', value: 'Payer' });
  });
});

describe('applyNodeNestedEdit — modules still index-addressed by field', () => {
  const map = () => ({ lanes: [], phases: [], edges: [],
    nodes: [{ id: 'n1', lane: 'l', phase: 'p', title: 'N', context: { modules: ['f1', 'f2'] } }] });
  it('update replaces a module id by index (field=index)', () => {
    const out = applyNodeNestedEdit(map(), 'n1', 'modules', { op: 'update', id: '0', field: '0', value: 'fX' });
    expect((out.nodes as any)[0].context.modules).toEqual(['fX', 'f2']);
  });
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx vitest run src/lib/database/applyEntityEdit.test.ts`
Expected: the states/meta cases FAIL (current branch uses a different convention); modules case passes.

- [ ] **Step 3: Rewrite the `applyNodeNestedEdit` array-editing branch**

Replace the body of `applyNodeNestedEdit` in `src/lib/database/applyEntityEdit.ts` (from the `if (field === 'modules')` block through the `else` block) with:

```typescript
  if (field === 'modules') {
    if (edit.op === 'add') arr.push('');
    else if (edit.op === 'delete') arr.splice(Number(edit.id), 1);
    else arr[Number(edit.field)] = edit.value; // field == row index; cell is the whole string
  } else {
    // states / meta: array of objects. update: id = row index, field = sub-field name.
    if (edit.op === 'add') arr.push({});
    else if (edit.op === 'delete') arr.splice(Number(edit.id), 1);
    else {
      const idx = Number(edit.id);
      const item = (arr[idx] && typeof arr[idx] === 'object' ? arr[idx] : {}) as Record<string, unknown>;
      item[edit.field] = edit.value;
      arr[idx] = item;
    }
  }
```

- [ ] **Step 4: Run tests + typecheck**

Run: `npx vitest run src/lib/database/applyEntityEdit.test.ts && npx tsc --noEmit`
Expected: all pass (incl. the pre-existing modules tests), zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/database/applyEntityEdit.ts src/lib/database/applyEntityEdit.test.ts
git commit -m "fix(database): unify states/meta nested-edit index convention (+tests)"
```

---

### Task 6: `useSourceHistory` hook

**Files:**
- Create: `src/components/DatabasePanel/useSourceHistory.ts`
- Test: `src/components/DatabasePanel/useSourceHistory.test.ts`

**Interfaces:**
- Consumes: React.
- Produces:
  - `useSourceHistory(commit: (index: number, text: string) => void, getText: (index: number) => string | undefined)` →
    `{ record: (index: number, prevText: string) => void; undo: () => void; redo: () => void; canUndo: boolean; canRedo: boolean; reset: () => void }`.
  - `record(index, prevText)` pushes an undo entry (call it BEFORE committing new text). `undo()` re-commits the recorded prev text and pushes the current text (via `getText`) to redo. Cap 50.

- [ ] **Step 1: Write the failing test**

```typescript
// src/components/DatabasePanel/useSourceHistory.test.ts
import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSourceHistory } from '@/components/DatabasePanel/useSourceHistory';

function setup() {
  const texts: Record<number, string> = { 0: 'v0' };
  const commit = vi.fn((i: number, t: string) => { texts[i] = t; });
  const getText = (i: number) => texts[i];
  const hook = renderHook(() => useSourceHistory(commit, getText));
  return { hook, commit, texts };
}

describe('useSourceHistory', () => {
  it('undo re-commits the recorded previous text', () => {
    const { hook, commit, texts } = setup();
    // Simulate: record prev "v0", then the app commits "v1".
    act(() => { hook.result.current.record(0, 'v0'); });
    texts[0] = 'v1'; commit.mockClear();
    expect(hook.result.current.canUndo).toBe(true);
    act(() => { hook.result.current.undo(); });
    expect(commit).toHaveBeenCalledWith(0, 'v0');
    expect(hook.result.current.canRedo).toBe(true);
  });
  it('redo re-applies the undone text', () => {
    const { hook, commit, texts } = setup();
    act(() => { hook.result.current.record(0, 'v0'); });
    texts[0] = 'v1';
    act(() => { hook.result.current.undo(); });   // commits v0; redo stack has v1
    texts[0] = 'v0'; commit.mockClear();
    act(() => { hook.result.current.redo(); });
    expect(commit).toHaveBeenCalledWith(0, 'v1');
  });
  it('reset clears both stacks', () => {
    const { hook } = setup();
    act(() => { hook.result.current.record(0, 'v0'); });
    act(() => { hook.result.current.reset(); });
    expect(hook.result.current.canUndo).toBe(false);
    expect(hook.result.current.canRedo).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/DatabasePanel/useSourceHistory.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```typescript
// src/components/DatabasePanel/useSourceHistory.ts
import { useCallback, useRef, useState } from 'react';

interface Snapshot { index: number; text: string; }

/**
 * Panel-scoped undo/redo over source-text commits. Call `record(index, prevText)`
 * immediately before committing new text for that source. `undo` re-commits the
 * recorded previous text (and stashes the current text for redo).
 */
export function useSourceHistory(
  commit: (index: number, text: string) => void,
  getText: (index: number) => string | undefined,
  maxSize = 50,
) {
  const undoStack = useRef<Snapshot[]>([]);
  const redoStack = useRef<Snapshot[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const sync = useCallback(() => {
    setCanUndo(undoStack.current.length > 0);
    setCanRedo(redoStack.current.length > 0);
  }, []);

  const record = useCallback((index: number, prevText: string) => {
    const s = undoStack.current;
    s.push({ index, text: prevText });
    if (s.length > maxSize) s.splice(0, s.length - maxSize);
    redoStack.current = [];
    sync();
  }, [maxSize, sync]);

  const undo = useCallback(() => {
    const snap = undoStack.current.pop();
    if (!snap) return;
    const current = getText(snap.index);
    if (current !== undefined) redoStack.current.push({ index: snap.index, text: current });
    commit(snap.index, snap.text);
    sync();
  }, [commit, getText, sync]);

  const redo = useCallback(() => {
    const snap = redoStack.current.pop();
    if (!snap) return;
    const current = getText(snap.index);
    if (current !== undefined) undoStack.current.push({ index: snap.index, text: current });
    commit(snap.index, snap.text);
    sync();
  }, [commit, getText, sync]);

  const reset = useCallback(() => {
    undoStack.current = [];
    redoStack.current = [];
    sync();
  }, [sync]);

  return { record, undo, redo, canUndo, canRedo, reset };
}
```

- [ ] **Step 4: Run tests + typecheck**

Run: `npx vitest run src/components/DatabasePanel/useSourceHistory.test.ts && npx tsc --noEmit`
Expected: pass, zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/DatabasePanel/useSourceHistory.ts src/components/DatabasePanel/useSourceHistory.test.ts
git commit -m "feat(database): useSourceHistory (panel-scoped undo/redo)"
```

---

### Task 7: EntityGrid — copy, paste, onEditBatch

**Files:**
- Modify: `src/components/DatabasePanel/EntityGrid.tsx`
- Modify: `src/components/DatabasePanel/EntityGrid.test.tsx` (add an onPaste→onEditBatch test)

**Interfaces:**
- Consumes: `pasteEdits` (Task 3).
- Produces: `EntityGridProps` gains `onEditBatch?: (edits: EntityEdit[]) => void`. When present, paste calls it; `onEdit` (single) still works. `DataEditor` gets `getCellsForSelection={true}`, `onPaste`.

- [ ] **Step 1: Write the failing test** (append to `EntityGrid.test.tsx`)

```typescript
import { pasteEditsFromClipboard } from '@/components/DatabasePanel/EntityGrid';
import type { GridRows } from '@/lib/database/types';

describe('EntityGrid paste helper', () => {
  const grid: GridRows = {
    columns: [
      { id: 'id', title: 'id', kind: 'text', readOnly: true },
      { id: 'label', title: 'label', kind: 'text' },
    ],
    rows: [{ id: 'a', label: 'A' }],
  };
  it('builds batch edits from a paste at a target', () => {
    const edits = pasteEditsFromClipboard(grid, [1, 0], [['X']]);
    expect(edits).toEqual([{ op: 'update', id: 'a', field: 'label', value: 'X' }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/DatabasePanel/EntityGrid.test.tsx`
Expected: FAIL — `pasteEditsFromClipboard` not exported.

- [ ] **Step 3: Add the export + props + DataEditor wiring**

In `src/components/DatabasePanel/EntityGrid.tsx`:

Add the import and a thin re-export helper (so the component and its test share one path):

```typescript
import { pasteEdits } from '@/lib/database/applyPaste';
import type { EntityEdit } from '@/lib/database/types';

// eslint-disable-next-line react-refresh/only-export-components -- pure helper, exported for unit tests
export function pasteEditsFromClipboard(
  grid: GridRows,
  target: [number, number],
  values: readonly (readonly string[])[],
): EntityEdit[] {
  return pasteEdits(grid, target, values);
}
```

Add `onEditBatch?: (edits: EntityEdit[]) => void;` to `EntityGridProps`, and destructure it in the component signature.

Add an `onPaste` callback (near `onCellEdited`):

```typescript
  const onPaste = useCallback((target: Item, values: readonly (readonly string[])[]): boolean => {
    const edits = pasteEdits(grid, target as [number, number], values);
    if (edits.length > 0) {
      if (onEditBatch) onEditBatch(edits);
      else edits.forEach((e) => { if (e.op === 'update') onEdit(e.id, e.field, String(e.value)); });
    }
    return false; // we applied them; don't let Glide also apply
  }, [grid, onEditBatch, onEdit]);
```

On the `<DataEditor>`, add: `getCellsForSelection={true}` and `onPaste={onPaste}`.

- [ ] **Step 4: Run tests + typecheck + lint**

Run: `npx vitest run src/components/DatabasePanel/EntityGrid.test.tsx && npx tsc --noEmit && npx eslint src/components/DatabasePanel/EntityGrid.tsx`
Expected: pass, zero errors, lint clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/DatabasePanel/EntityGrid.tsx src/components/DatabasePanel/EntityGrid.test.tsx
git commit -m "feat(database): grid copy (getCellsForSelection) + batched paste"
```

---

### Task 8: NestedTable — states/meta editors

**Files:**
- Modify: `src/components/DatabasePanel/NestedTable.tsx`
- Modify: `src/components/DatabasePanel/EntityGrid.test.tsx` OR a new `NestedTable.test.tsx` (add a states-editor render test)

**Interfaces:**
- Consumes: `applyNodeNestedEdit` convention (Task 5): update `{op:'update', id: rowIndex, field: subField, value}`.
- Produces: `NestedTable` renders editable tables for `states` (label/mode/narrative) and `meta` (label/value), emitting `EntityEdit`s via the existing `onEdit` prop; gains a `modes: Mode[]` prop for the states `mode` dropdown.

- [ ] **Step 1: Write the failing test**

```typescript
// src/components/DatabasePanel/NestedTable.test.tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NestedTable } from '@/components/DatabasePanel/NestedTable';

const node = { id: 'n1', context: { states: [{ label: 'Today', mode: 'Manual', narrative: 'By hand' }] } };
const modes = [{ id: 'Manual', label: 'Manual', color: '#000' }, { id: 'Auto', label: 'Auto', color: '#0a0' }];

describe('NestedTable states editor', () => {
  it('renders state rows and emits an update with row index + sub-field', () => {
    const onEdit = vi.fn();
    render(<NestedTable node={node as any} field="states" featureIds={[]} modes={modes as any}
      onFieldChange={() => {}} onEdit={onEdit} />);
    // the narrative text input for row 0
    const input = screen.getByDisplayValue('By hand');
    fireEvent.change(input, { target: { value: 'Automated' } });
    expect(onEdit).toHaveBeenCalledWith({ op: 'update', id: '0', field: 'narrative', value: 'Automated' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/DatabasePanel/NestedTable.test.tsx`
Expected: FAIL — states editor not implemented; `modes` prop missing.

- [ ] **Step 3: Implement the states/meta editors**

In `src/components/DatabasePanel/NestedTable.tsx`:

Add `modes: Mode[]` to `NestedTableProps` (import `Mode` from `@/types/lifecycle-map`), destructure it. Replace the non-modules placeholder branch (`{field} editing (key/value)…`) with real editors:

```tsx
        ) : field === 'states' ? (
          <table className={styles.nestedTable}>
            <thead><tr><th className={styles.rowNum}>#</th><th>label</th><th>mode</th><th>narrative</th><th></th></tr></thead>
            <tbody>
              {rows.map((r, i) => {
                const row = (r && typeof r === 'object' ? r : {}) as Record<string, unknown>;
                return (
                  <tr key={i}>
                    <td className={styles.rowNum}>{i + 1}</td>
                    <td><input className={styles.select} value={String(row.label ?? '')}
                      onChange={(e) => onEdit({ op: 'update', id: String(i), field: 'label', value: e.target.value })} /></td>
                    <td>
                      <select className={styles.select} value={String(row.mode ?? '')}
                        onChange={(e) => onEdit({ op: 'update', id: String(i), field: 'mode', value: e.target.value })}>
                        <option value="">—</option>
                        {modes.map((m) => <option key={m.id} value={m.id}>{m.id}</option>)}
                      </select>
                    </td>
                    <td><input className={`${styles.select} ${styles.refSelect}`} value={String(row.narrative ?? '')}
                      onChange={(e) => onEdit({ op: 'update', id: String(i), field: 'narrative', value: e.target.value })} /></td>
                    <td><button className={styles.iconBtn} onClick={() => onEdit({ op: 'delete', id: String(i) })} aria-label={`Remove state ${i + 1}`}>✕</button></td>
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td className={styles.rowNum}></td><td className={styles.nestedEmpty} colSpan={4}>No states yet.</td></tr>}
            </tbody>
          </table>
        ) : (
          <table className={styles.nestedTable}>
            <thead><tr><th className={styles.rowNum}>#</th><th>label</th><th>value</th><th></th></tr></thead>
            <tbody>
              {rows.map((r, i) => {
                const row = (r && typeof r === 'object' ? r : {}) as Record<string, unknown>;
                return (
                  <tr key={i}>
                    <td className={styles.rowNum}>{i + 1}</td>
                    <td><input className={styles.select} value={String(row.label ?? '')}
                      onChange={(e) => onEdit({ op: 'update', id: String(i), field: 'label', value: e.target.value })} /></td>
                    <td><input className={`${styles.select} ${styles.refSelect}`} value={String(row.value ?? '')}
                      onChange={(e) => onEdit({ op: 'update', id: String(i), field: 'value', value: e.target.value })} /></td>
                    <td><button className={styles.iconBtn} onClick={() => onEdit({ op: 'delete', id: String(i) })} aria-label={`Remove pair ${i + 1}`}>✕</button></td>
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td className={styles.rowNum}></td><td className={styles.nestedEmpty} colSpan={3}>No entries yet.</td></tr>}
            </tbody>
          </table>
        )}
```

Also: the `+ add` button in the header currently only shows for `modules`. Change its condition to show for all three fields (`{['modules','states','meta'].includes(field) && (…)}`), keeping its `onEdit({ op: 'add', id: '' })`.

- [ ] **Step 4: Pass `modes` from DatabasePanel**

In `src/components/DatabasePanel/DatabasePanel.tsx`, the `<NestedTable … />` usage: add `modes={modes}` (the `modes` const already exists in the component).

- [ ] **Step 5: Run tests + typecheck + lint**

Run: `npx vitest run src/components/DatabasePanel/ && npx tsc --noEmit && npx eslint src/components/DatabasePanel/`
Expected: pass, zero errors, lint clean.

- [ ] **Step 6: Commit**

```bash
git add src/components/DatabasePanel/NestedTable.tsx src/components/DatabasePanel/DatabasePanel.tsx src/components/DatabasePanel/NestedTable.test.tsx
git commit -m "feat(database): editable states/meta in the nodes split"
```

---

### Task 9: DatabasePanel — batched commit, history + keyboard, delete confirm, lang hint

**Files:**
- Modify: `src/components/DatabasePanel/DatabasePanel.tsx`
- Test: `src/components/DatabasePanel/DatabasePanel.test.tsx` (add a delete-confirm + lang-hint test)

**Interfaces:**
- Consumes: `useSourceHistory` (T6), `countDependents` (T2), `discoverLangs` (T1), `pasteEdits`/`onEditBatch` (T3/T7), `applyEntityEdit`.
- Produces: panel wires undo/redo (buttons + Cmd+Z/Cmd+Shift+Z), a batched `commitEntityEdits`, a delete confirm, and a localized-field hint.

- [ ] **Step 1: Write the failing test** (append to `DatabasePanel.test.tsx`)

```typescript
import { fireEvent } from '@testing-library/react';

describe('DatabasePanel delete confirm + lang hint', () => {
  const data = {
    meta: { modes: [], default_lang: 'en' },
    lanes: [{ id: 'l', label: { en: 'L', pt: 'Le' } }], phases: [{ id: 'p', label: 'P' }],
    nodes: [{ id: 'n1', lane: 'l', phase: 'p', title: 'N', states: {} }], edges: [], _modeMap: {}, _moduleCatalog: {},
  } as any;
  const sources = [{ name: 'map.json', text: JSON.stringify(data), lang: 'json' as const }];

  it('shows a language hint when localized fields exist', () => {
    render(<DatabasePanel open data={data} rawSources={sources} onClose={() => {}} onCommit={() => {}} lang="en" />);
    expect(screen.getByText(/editing:/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/DatabasePanel/DatabasePanel.test.tsx`
Expected: FAIL — no language hint rendered.

- [ ] **Step 3: Add batched commit + history + keyboard**

In `DatabasePanel.tsx`:

Add imports:
```typescript
import { useSourceHistory } from './useSourceHistory';
import { countDependents } from '@/lib/database/countDependents';
import { discoverLangs } from '@/lib/discoverLangs';
import type { EntityEdit } from '@/lib/database/types';
```

After the existing `commitEntity`/`commitNodeNested`, add a history layer. First a raw committer that records history, then wire helpers:

```typescript
  const getSourceText = (i: number): string | undefined => rawSources[i]?.text;
  const history = useSourceHistory(onCommit, getSourceText);

  // Reset history when the panel opens or the source set changes.
  useEffect(() => { history.reset(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [open, rawSources]);

  const commitWithHistory = (index: number, newText: string): void => {
    const prev = rawSources[index]?.text;
    if (prev !== undefined) history.record(index, prev);
    onCommit(index, newText);
  };
```

Replace the `onCommit(...)` calls inside `commitEntity` and `commitNodeNested` with `commitWithHistory(...)`.

Add a batched entity commit (used by paste):
```typescript
  const commitEntityEdits = (edits: EntityEdit[]): void => {
    const idx = sourceIndexForEntity(rawSources, tab);
    const src = rawSources[idx];
    if (!src) return;
    let obj = parseSource(src.text) as unknown as Record<string, unknown>;
    for (const e of edits) obj = applyEntityEdit(obj, tab, e, lang);
    commitWithHistory(idx, serializeSource(obj, src.lang));
  };
```

Wire `onEditBatch={commitEntityEdits}` on BOTH `<EntityGrid>` usages (nodes-split left grid and the non-nodes grid).

Add the keyboard handler:
```typescript
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod || (e.key !== 'z' && e.key !== 'Z' && e.key !== 'y')) return;
      // If a Glide overlay editor is open, let it handle in-cell undo.
      if (document.getElementById('portal')?.childElementCount) return;
      e.preventDefault();
      if (e.key === 'y' || ((e.key === 'z' || e.key === 'Z') && e.shiftKey)) history.redo();
      else history.undo();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, history]);
```

- [ ] **Step 4: Add the delete confirm + language hint**

Wrap the delete handlers so they confirm when there are dependents. Replace the `onDelete` passed to the grids with:
```typescript
  const handleDelete = (id: string): void => {
    const idx = sourceIndexForEntity(rawSources, tab);
    const src = rawSources[idx];
    if (!src) return;
    const obj = parseSource(src.text) as unknown as Record<string, unknown>;
    const deps = countDependents(obj, tab, id);
    if (deps > 0 && !window.confirm(`${deps} node(s) reference this ${tab.slice(0, -1)}. Delete anyway?`)) return;
    const next = applyEntityEdit(obj, tab, { op: 'delete', id }, lang);
    commitWithHistory(idx, serializeSource(next, src.lang));
  };
```
Use `onDelete={handleDelete}` on both grids (replacing the inline `commitEntity({op:'delete'…})`).

Add the language hint in the tabs/toolbar. Compute once:
```typescript
  const langs = discoverLangs(data);
  const otherLangs = langs.filter((l) => l !== lang);
```
And render (e.g. after the tabs, before `back to map`, or in the toolbar area):
```tsx
        {langs.length > 1 && (
          <span className={styles.langHint}>
            Editing: {lang.toUpperCase()}{otherLangs.length ? ` · also: ${otherLangs.map((l) => l.toUpperCase()).join(', ')}` : ''}
          </span>
        )}
```
Add a `.langHint` CSS rule to `DatabasePanel.module.css`:
```css
.langHint { margin-left: 12px; font-size: 11px; color: var(--mute); font-family: var(--font-mono); }
```

Add undo/redo buttons to the toolbar area (near the "+ Add row" toolbar is per-grid; place panel-level undo/redo in the tabs bar before `back`):
```tsx
        <button className={styles.tab} onClick={history.undo} disabled={!history.canUndo} title="Undo (Cmd+Z)">Undo</button>
        <button className={styles.tab} onClick={history.redo} disabled={!history.canRedo} title="Redo (Cmd+Shift+Z)">Redo</button>
```

- [ ] **Step 5: Run tests + typecheck + lint**

Run: `npx vitest run src/components/DatabasePanel/ && npx tsc --noEmit && npx eslint src/components/DatabasePanel/`
Expected: pass, zero errors, lint clean.

- [ ] **Step 6: Commit**

```bash
git add src/components/DatabasePanel/DatabasePanel.tsx src/components/DatabasePanel/DatabasePanel.module.css src/components/DatabasePanel/DatabasePanel.test.tsx
git commit -m "feat(database): undo/redo + batched paste commit + delete confirm + lang hint"
```

---

### Task 10: CodeDrawer — Format button + zip "Download all"

**Files:**
- Modify: `src/components/CodeDrawer/CodeDrawer.tsx`
- Modify: `src/components/CodeDrawer/CodeDrawer.module.css` (pre/scroll on the textarea)
- Test: `src/components/CodeDrawer/CodeDrawer.test.tsx` (Format reformats; no-op on invalid)

**Interfaces:**
- Consumes: `zipStore` (T4), `js-yaml`.
- Produces: a Format action that pretty-prints the active buffer; a "Download all" action (zip) when `sources.length > 1`.

- [ ] **Step 1: Write the failing test** (append to `CodeDrawer.test.tsx`)

```typescript
it('Format button pretty-prints minified JSON in the active buffer', async () => {
  const sources = [{ name: 'map.json', text: '{"a":1,"b":[2,3]}', lang: 'json' as const }];
  render(<CodeDrawer open onClose={() => {}} sources={sources} onEdit={() => {}} />);
  const ta = screen.getByRole('textbox') as HTMLTextAreaElement;
  expect(ta.value).toBe('{"a":1,"b":[2,3]}');
  fireEvent.click(screen.getByRole('button', { name: /format/i }));
  expect(ta.value).toBe('{\n  "a": 1,\n  "b": [\n    2,\n    3\n  ]\n}');
});

it('Format is a no-op on invalid JSON', () => {
  const sources = [{ name: 'map.json', text: '{invalid', lang: 'json' as const }];
  render(<CodeDrawer open onClose={() => {}} sources={sources} onEdit={() => {}} />);
  const ta = screen.getByRole('textbox') as HTMLTextAreaElement;
  fireEvent.click(screen.getByRole('button', { name: /format/i }));
  expect(ta.value).toBe('{invalid'); // unchanged
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/CodeDrawer/CodeDrawer.test.tsx`
Expected: FAIL — no Format button.

- [ ] **Step 3: Add the Format handler + button**

In `CodeDrawer.tsx`, add `import yaml from 'js-yaml';` and `import { zipStore } from '@/lib/database/zip';` at the top.

Add a format handler (near `onDownload`):
```typescript
  const onFormat = useCallback((): void => {
    if (!activeSource) return;
    try {
      const pretty = activeSource.lang === 'yaml'
        ? yaml.dump(yaml.load(activeBuffer))
        : JSON.stringify(JSON.parse(activeBuffer), null, 2);
      // Push current buffer to this tab's undo stack, then set the formatted text.
      undoStacks.current[activeTab]?.push(activeBuffer);
      setBuffers((prev) => prev.map((b, i) => (i === activeTab ? pretty : b)));
      // Reuse the debounced parse→onEdit path by simulating a change:
      onEdit(activeTab, pretty);
      setStatus('saved');
    } catch {
      setStatus('error');
      setErrorMsg('Cannot format: invalid ' + (activeSource.lang === 'yaml' ? 'YAML' : 'JSON'));
    }
  }, [activeBuffer, activeSource, activeTab, onEdit]);
```

Add a "Download all" (zip) handler:
```typescript
  const onDownloadAll = useCallback((): void => {
    if (sources.length <= 1) { onDownload(); return; }
    const bytes = zipStore(sources.map((s, i) => ({ name: s.name, text: buffers[i] ?? s.text })));
    const blob = new Blob([bytes], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'map-bundle.zip';
    document.body.appendChild(a); a.click(); a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [sources, buffers, onDownload]);
```

Add buttons to the toolbar. After the Redo button / before Copy, add Format:
```tsx
        <button type="button" className={styles.actionBtn} onClick={onFormat}
          disabled={!activeSource} title="Format">Format</button>
```
And change the Download button to offer zip when multi-source:
```tsx
        <button type="button" className={styles.actionBtn}
          onClick={sources.length > 1 ? onDownloadAll : onDownload} disabled={!activeSource}>
          {sources.length > 1 ? 'Download all' : t('code.download')}
        </button>
```

- [ ] **Step 4: Add pre/scroll CSS**

In `CodeDrawer.module.css`, find the code textarea rule (the editor `<textarea>`) and add:
```css
  white-space: pre;
  overflow-x: auto;
```
(If the textarea class is e.g. `.editor`, add to that rule. Confirm the class name by reading the file; do not guess.)

- [ ] **Step 5: Run tests + typecheck + lint**

Run: `npx vitest run src/components/CodeDrawer/CodeDrawer.test.tsx && npx tsc --noEmit && npx eslint src/components/CodeDrawer/CodeDrawer.tsx`
Expected: pass, zero errors, lint clean.

- [ ] **Step 6: Commit**

```bash
git add src/components/CodeDrawer/CodeDrawer.tsx src/components/CodeDrawer/CodeDrawer.module.css src/components/CodeDrawer/CodeDrawer.test.tsx
git commit -m "feat(code-drawer): Format (beautify) + zip Download-all for bundles"
```

---

### Task 11: Full-suite gate + browser verification + docs

**Files:**
- Modify: `SCHEMA.md` (extend the Database-panel note with copy/paste, undo/redo, states/meta, Format, bundle download)

- [ ] **Step 1: Full gate**

Run: `npx tsc --noEmit && npx vitest run && npx eslint . --ext ts,tsx --max-warnings 0 || true && npm run build`
Expected: tsc clean; full suite green; build OK. (The repo has 7 pre-existing lint errors in untouched files — VersionBadge/parseSource/version-check; new/modified files must add none.)

- [ ] **Step 2: Browser smoke (manual, in-session)**

Start `npm run dev`, load a map + features bundle, open Database:
- Copy a cell/range (Cmd+C), paste into other cells (Cmd+V) → values update in one step.
- Cmd+Z reverts the paste; Cmd+Shift+Z replays it.
- Nodes tab → select a node → switch nested field to `states` → edit a mode; switch to `meta` → edit a value.
- Delete a referenced feature → confirm dialog shows the count.
- Open the Code drawer → click Format → the 1-line JSON expands to indented multi-line.
- With a bundle loaded, the Download button reads "Download all" and yields a `.zip` with both files.

- [ ] **Step 3: Update SCHEMA.md**

Extend the existing "Editing in the Database panel" section: the grid supports spreadsheet copy/paste (Cmd+C/Cmd+V) and undo/redo (Cmd+Z / Cmd+Shift+Z); the Nodes split edits modules, states, and meta; deleting a referenced row warns with the dependent count; localized fields edit the active language (shown in the panel hint); the Code drawer's Format button pretty-prints the source, and a multi-file bundle downloads as a `.zip`.

- [ ] **Step 4: Commit**

```bash
git add SCHEMA.md
git commit -m "docs: document Database editor v2 (copy/paste, undo, states/meta, format, zip)"
```

---

## Self-Review

**Spec coverage:**
- A1 copy/paste → Tasks 3 (pasteEdits), 7 (EntityGrid copy+paste+batch), 9 (batched commit). ✓
- A2 undo/redo → Tasks 6 (useSourceHistory), 9 (wiring + keyboard). ✓
- B1 states/meta edit → Tasks 5 (convention fix), 8 (editors). ✓
- B2 delete warning → Tasks 2 (countDependents), 9 (confirm). ✓
- B3 lang hint → Tasks 1 (discoverLangs), 9 (hint). ✓
- C1 CodeDrawer Format → Task 10. ✓
- C2 multi-file zip export → Tasks 4 (zipStore), 10 (Download all). ✓
- Docs → Task 11. ✓

**Placeholder scan:** No TBD/TODO; every code step has complete code. Task 10 Step 4 says "confirm the class name by reading the file; do not guess" — that's a concrete instruction, not a placeholder. ✓

**Type consistency:** `EntityEdit` (existing) used uniformly; `pasteEdits(grid, target, values)` identical in T3/T7; `useSourceHistory(commit, getText, maxSize?)` returns `{record,undo,redo,canUndo,canRedo,reset}` in T6, consumed in T9; `countDependents(map, entity, id)` T2→T9; `zipStore(files)` T4→T10; `discoverLangs(data)` T1→T9; `applyNodeNestedEdit` states/meta convention (update: id=index, field=subField) consistent T5→T8. The `onEditBatch?: (edits: EntityEdit[]) => void` prop defined T7, supplied T9. ✓

**Gap check:** The spec's "share-by-URL stays map-only with a note" is a ShareModal note. It's minor copy; folded into Task 11 docs rather than its own task — acceptable, but if a reviewer wants the actual UI note, it's a one-line add to ShareModal. Flagging as the single deliberate simplification.
