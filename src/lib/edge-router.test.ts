// Tests for src/lib/edge-router.ts
//
// Covers classifyEdge across kinds, routeEdges return shape (Map of EdgeRoute),
// self/backward classification, and that path strings start with "M ".

import { describe, expect, it } from 'vitest';

import { classifyEdge, routeEdges } from '@/lib/edge-router';
import { computeLayout } from '@/lib/layout';
import type { NodeLayout, PhaseLayout } from '@/lib/layout';
import type { LifecycleMap } from '@/types/lifecycle-map';

function makeNode(overrides: Partial<NodeLayout> & { id: string }): NodeLayout {
  return {
    id: overrides.id,
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    cx: overrides.cx ?? 100,
    cy: overrides.cy ?? 100,
    lane: overrides.lane ?? 'l1',
    phase: overrides.phase ?? 'p1',
    col: overrides.col ?? 0,
  };
}

function makePhase(id: string, idx: number): PhaseLayout {
  return {
    id,
    idx,
    x: 100 + idx * 300,
    width: 280,
    padX: 12,
    subCols: 1,
    roman: String(idx + 1),
  };
}

const phaseMap: Record<string, PhaseLayout> = {
  p1: makePhase('p1', 0),
  p2: makePhase('p2', 1),
};

describe('classifyEdge', () => {
  it('returns "forward-phase" when target phase has a greater idx', () => {
    const from = makeNode({ id: 'a', phase: 'p1' });
    const to = makeNode({ id: 'b', phase: 'p2' });
    expect(classifyEdge(from, to, phaseMap)).toBe('forward-phase');
  });

  it('returns "back-phase" when target phase has a lower idx', () => {
    const from = makeNode({ id: 'a', phase: 'p2' });
    const to = makeNode({ id: 'b', phase: 'p1' });
    expect(classifyEdge(from, to, phaseMap)).toBe('back-phase');
  });

  it('returns "forward-col" when same phase, higher col', () => {
    const from = makeNode({ id: 'a', phase: 'p1', col: 0 });
    const to = makeNode({ id: 'b', phase: 'p1', col: 1 });
    expect(classifyEdge(from, to, phaseMap)).toBe('forward-col');
  });

  it('returns "back-col" when same phase, lower col', () => {
    const from = makeNode({ id: 'a', phase: 'p1', col: 2 });
    const to = makeNode({ id: 'b', phase: 'p1', col: 1 });
    expect(classifyEdge(from, to, phaseMap)).toBe('back-col');
  });

  it('returns "forward-stack" when same phase/col, target cy > source cy', () => {
    const from = makeNode({ id: 'a', phase: 'p1', col: 0, cy: 100 });
    const to = makeNode({ id: 'b', phase: 'p1', col: 0, cy: 200 });
    expect(classifyEdge(from, to, phaseMap)).toBe('forward-stack');
  });

  it('returns "back-stack" when same phase/col, target cy < source cy', () => {
    const from = makeNode({ id: 'a', phase: 'p1', col: 0, cy: 200 });
    const to = makeNode({ id: 'b', phase: 'p1', col: 0, cy: 100 });
    expect(classifyEdge(from, to, phaseMap)).toBe('back-stack');
  });

  it('returns "self" when from and to share phase, col, and cy', () => {
    const n = makeNode({ id: 'a', phase: 'p1', col: 0, cy: 100 });
    expect(classifyEdge(n, n, phaseMap)).toBe('self');
  });

  it('returns "self" when phase metadata is missing', () => {
    const from = makeNode({ id: 'a', phase: 'missing' });
    const to = makeNode({ id: 'b', phase: 'p1' });
    expect(classifyEdge(from, to, phaseMap)).toBe('self');
  });
});

describe('routeEdges', () => {
  const map: LifecycleMap = {
    meta: { title: 'Edges' },
    lanes: [
      { id: 'l1', label: 'Lane 1' },
      { id: 'l2', label: 'Lane 2' },
    ],
    phases: [
      { id: 'p1', label: 'Phase 1' },
      { id: 'p2', label: 'Phase 2' },
    ],
    nodes: [
      { id: 'n1', lane: 'l1', phase: 'p1', title: 'Node 1' },
      { id: 'n2', lane: 'l2', phase: 'p2', title: 'Node 2' },
      { id: 'n3', lane: 'l1', phase: 'p1', title: 'Node 3' },
    ],
    edges: [],
  };

  it('returns an empty Map for an empty edges array', () => {
    const layout = computeLayout(map);
    const result = routeEdges([], layout);
    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(0);
  });

  it('returns a Map with one entry per valid edge', () => {
    const layout = computeLayout(map);
    const result = routeEdges([{ from: 'n1', to: 'n2' }], layout);
    expect(result.size).toBe(1);
    const route = result.get('n1>n2');
    expect(route).toBeDefined();
    expect(route!.kind).toBe('forward-phase');
    expect(route!.backward).toBe(false);
  });

  it('emits SVG path strings that begin with "M "', () => {
    const layout = computeLayout(map);
    const result = routeEdges(
      [
        { from: 'n1', to: 'n2' },
        { from: 'n2', to: 'n1' },
      ],
      layout,
    );
    for (const route of result.values()) {
      expect(route.d.startsWith('M ')).toBe(true);
    }
  });

  it('marks backward edges with `backward: true`', () => {
    const layout = computeLayout(map);
    const result = routeEdges([{ from: 'n2', to: 'n1' }], layout);
    const route = result.get('n2>n1');
    expect(route).toBeDefined();
    expect(route!.kind).toBe('back-phase');
    expect(route!.backward).toBe(true);
  });

  it('skips edges whose endpoints are not in the layout', () => {
    const layout = computeLayout(map);
    const result = routeEdges(
      [
        { from: 'n1', to: 'n2' },
        { from: 'ghost', to: 'n2' },
        { from: 'n1', to: 'ghost' },
      ],
      layout,
    );
    expect(result.size).toBe(1);
    expect(result.has('n1>n2')).toBe(true);
  });

  it('classifies a same-phase same-col edge correctly through routeEdges', () => {
    // n1 and n3 share lane l1, phase p1, col 0 — vertical stack
    const layout = computeLayout(map);
    const result = routeEdges([{ from: 'n1', to: 'n3' }], layout);
    const route = result.get('n1>n3');
    expect(route).toBeDefined();
    // direction depends on which sits higher after layout — assert it's a stack route
    expect(['forward-stack', 'back-stack', 'self']).toContain(route!.kind);
    expect(route!.d.startsWith('M ')).toBe(true);
  });
});
