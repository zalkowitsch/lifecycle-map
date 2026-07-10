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
    expect(g.columns.find((c) => c.id === 'id')?.readOnly).toBe(true);
    expect(g.rows[0]).toMatchObject({ id: 'patient', label: 'Patient', sub: 'consumer' });
  });

  it('phases → id/label/roman/subCols', () => {
    const g = deriveEntityRows(map, registry, 'phases');
    expect(g.columns.map((c) => c.id)).toEqual(['id', 'label', 'roman', 'subCols']);
    expect(g.columns.find((c) => c.id === 'id')?.readOnly).toBe(true);
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
    expect(g.columns.find((c) => c.id === 'id')?.readOnly).toBe(true);
    expect(g.rows[0]).toMatchObject({ id: 'sched', title: 'Schedule', lane: 'patient', phase: 'preVisit' });
    expect(g.rows[0]).not.toHaveProperty('context');
  });

  it('features with no registry → empty rows, columns still present', () => {
    const g = deriveEntityRows(map, undefined, 'features');
    expect(g.rows).toEqual([]);
    expect(g.columns.length).toBeGreaterThan(0);
  });
});
