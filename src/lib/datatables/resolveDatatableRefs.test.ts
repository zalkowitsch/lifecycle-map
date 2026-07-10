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
