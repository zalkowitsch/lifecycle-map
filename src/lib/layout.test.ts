// Tests for src/lib/layout.ts
//
// Covers computeLayout shape, monotonicity of phase/lane positions,
// node coordinate finiteness, default phase roman assignment,
// missing meta.modes, and the empty-map edge case.

import { describe, expect, it } from 'vitest';

import { computeLayout, LAYOUT_CONSTANTS } from '@/lib/layout';
import type { LifecycleMap } from '@/types/lifecycle-map';

const baseMap: LifecycleMap = {
  meta: { title: 'Test' },
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
  ],
  edges: [{ from: 'n1', to: 'n2' }],
};

describe('LAYOUT_CONSTANTS', () => {
  it('exports the expected constants', () => {
    expect(LAYOUT_CONSTANTS.LANE_LABEL_W).toBe(130);
    expect(LAYOUT_CONSTANTS.SUBCOL_W).toBe(220);
    expect(LAYOUT_CONSTANTS.PHASE_LABEL_H).toBe(52);
    expect(LAYOUT_CONSTANTS.BACKWARD_BUS_H).toBe(52);
    expect(LAYOUT_CONSTANTS.BOTTOM_RAIL_H).toBe(40);
    expect(LAYOUT_CONSTANTS.NODE_W).toBe(200);
    expect(LAYOUT_CONSTANTS.NODE_H).toBe(64);
    expect(LAYOUT_CONSTANTS.LANE_PAD_V).toBe(16);
    expect(LAYOUT_CONSTANTS.BASE_PHASE_PAD_X).toBe(12);
    expect(LAYOUT_CONSTANTS.BASE_NODE_GAP_V).toBe(28);
    expect(LAYOUT_CONSTANTS.SLOT_SPACING).toBe(14);
  });
});

describe('computeLayout', () => {
  it('returns the documented shape (svgW, svgH, lanes, phases, nodes)', () => {
    const layout = computeLayout(baseMap);
    expect(layout).toHaveProperty('svgW');
    expect(layout).toHaveProperty('svgH');
    expect(layout).toHaveProperty('lanes');
    expect(layout).toHaveProperty('phases');
    expect(layout).toHaveProperty('nodes');
    expect(typeof layout.svgW).toBe('number');
    expect(typeof layout.svgH).toBe('number');
    expect(layout.svgW).toBeGreaterThan(0);
    expect(layout.svgH).toBeGreaterThan(0);
  });

  it('emits finite numeric cx, cy, x, y for every node', () => {
    const layout = computeLayout(baseMap);
    for (const id of ['n1', 'n2']) {
      const n = layout.nodes[id];
      expect(n).toBeDefined();
      expect(Number.isFinite(n!.cx)).toBe(true);
      expect(Number.isFinite(n!.cy)).toBe(true);
      expect(Number.isFinite(n!.x)).toBe(true);
      expect(Number.isFinite(n!.y)).toBe(true);
      // cx/cy must be the node-rect center
      expect(n!.cx).toBeCloseTo(n!.x + LAYOUT_CONSTANTS.NODE_W / 2, 6);
      expect(n!.cy).toBeCloseTo(n!.y + LAYOUT_CONSTANTS.NODE_H / 2, 6);
    }
  });

  it('places phases at strictly increasing x positions', () => {
    const layout = computeLayout(baseMap);
    const xs = Object.values(layout.phases)
      .sort((a, b) => a.idx - b.idx)
      .map((p) => p.x);
    expect(xs).toHaveLength(2);
    for (let i = 1; i < xs.length; i++) {
      expect(xs[i]!).toBeGreaterThan(xs[i - 1]!);
    }
  });

  it('places lanes at strictly increasing y positions (top)', () => {
    const layout = computeLayout(baseMap);
    const tops = Object.values(layout.lanes)
      .sort((a, b) => a.idx - b.idx)
      .map((l) => l.top);
    expect(tops).toHaveLength(2);
    for (let i = 1; i < tops.length; i++) {
      expect(tops[i]!).toBeGreaterThan(tops[i - 1]!);
    }
  });

  it('does not throw on an empty map (no nodes/edges)', () => {
    const emptyMap: LifecycleMap = {
      meta: { title: 'Empty' },
      lanes: [],
      phases: [],
      nodes: [],
      edges: [],
    };
    expect(() => computeLayout(emptyMap)).not.toThrow();
    const layout = computeLayout(emptyMap);
    expect(layout.nodes).toEqual({});
    expect(layout.lanes).toEqual({});
    expect(layout.phases).toEqual({});
    expect(layout.svgW).toBeGreaterThan(0);
    expect(layout.svgH).toBeGreaterThan(0);
  });

  it('uses default behavior when meta.modes is undefined', () => {
    const mapWithoutModes: LifecycleMap = {
      ...baseMap,
      meta: { title: 'No modes' },
    };
    expect(() => computeLayout(mapWithoutModes)).not.toThrow();
    const layout = computeLayout(mapWithoutModes);
    expect(layout.nodes['n1']).toBeDefined();
    expect(layout.nodes['n2']).toBeDefined();
  });

  it('auto-assigns roman numerals when phases omit the `roman` field', () => {
    const layout = computeLayout(baseMap);
    expect(layout.phases['p1']?.roman).toBe('I');
    expect(layout.phases['p2']?.roman).toBe('II');
  });

  it('preserves an explicit `roman` value if provided', () => {
    const mapWithRoman: LifecycleMap = {
      ...baseMap,
      phases: [
        { id: 'p1', label: 'Phase 1', roman: 'Alpha' },
        { id: 'p2', label: 'Phase 2' },
      ],
    };
    const layout = computeLayout(mapWithRoman);
    expect(layout.phases['p1']?.roman).toBe('Alpha');
    expect(layout.phases['p2']?.roman).toBe('II');
  });

  it('honors an explicit viewportWidth (svgW grows to fill viewport)', () => {
    const layoutSmall = computeLayout(baseMap, 100);
    const layoutLarge = computeLayout(baseMap, 5000);
    // small viewport => svgW driven by content; large viewport => svgW >= 5000
    expect(layoutLarge.svgW).toBeGreaterThanOrEqual(5000);
    expect(layoutSmall.svgW).toBeGreaterThanOrEqual(layoutSmall.phases['p2']!.x);
  });

  it('positions each node within its declared phase and lane band', () => {
    const layout = computeLayout(baseMap);
    const n1 = layout.nodes['n1']!;
    const p1 = layout.phases['p1']!;
    const l1 = layout.lanes['l1']!;
    expect(n1.cx).toBeGreaterThanOrEqual(p1.x);
    expect(n1.cx).toBeLessThanOrEqual(p1.x + p1.width);
    expect(n1.cy).toBeGreaterThanOrEqual(l1.top);
    expect(n1.cy).toBeLessThanOrEqual(l1.top + l1.height);
  });
});
