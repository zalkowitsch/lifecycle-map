// Edge routing for the lifecycle map.
//
// Faithful port of the edge routing pass inside `render(DATA)` in `viewer.js`
// (approx. lines 1745-1895): inlet/outlet slot pre-computation, midX slotting
// for parallel edges, backward bus routing, and the `edgePath` SVG path
// builder. Pure math — zero DOM, zero React, no side effects.

import { LAYOUT_CONSTANTS } from './layout';
import type { ComputedLayout, NodeLayout, PhaseLayout } from './layout';

export type EdgeKind =
  | 'forward-phase'
  | 'forward-col'
  | 'forward-stack'
  | 'back-phase'
  | 'back-col'
  | 'back-stack'
  | 'self';

export interface EdgeRoute {
  d: string;
  kind: EdgeKind;
  backward: boolean;
}

export function classifyEdge(
  from: NodeLayout,
  to: NodeLayout,
  phases: Record<string, PhaseLayout>,
): EdgeKind {
  const fromPhase = phases[from.phase];
  const toPhase = phases[to.phase];
  if (!fromPhase || !toPhase) return 'self';
  const dPhase = toPhase.idx - fromPhase.idx;
  const dCol = (to.col || 0) - (from.col || 0);
  if (dPhase > 0) return 'forward-phase';
  if (dPhase < 0) return 'back-phase';
  if (dCol > 0) return 'forward-col';
  if (dCol < 0) return 'back-col';
  if (to.cy > from.cy) return 'forward-stack';
  if (to.cy < from.cy) return 'back-stack';
  return 'self';
}

function isBackward(kind: EdgeKind): boolean {
  return kind === 'back-phase' || kind === 'back-col' || kind === 'back-stack';
}

function stableHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

interface BBox {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export function routeEdges(
  edges: { from: string; to: string }[],
  layout: ComputedLayout,
): Map<string, EdgeRoute> {
  const { NODE_W, NODE_H, SLOT_SPACING, PHASE_LABEL_H, BACKWARD_BUS_H } = LAYOUT_CONSTANTS;
  const nodeById = layout.nodes;
  const phaseById = layout.phases;
  const allNodes = Object.values(nodeById);

  // Per-call cache (one-shot — match viewer.js Map lifecycle)
  const nodeBBoxCache = new Map<string, BBox[]>();
  function bboxesExcluding(srcId: string, dstId: string): BBox[] {
    const k = srcId + '|' + dstId;
    const cached = nodeBBoxCache.get(k);
    if (cached) return cached;
    const set = new Set([srcId, dstId]);
    const list: BBox[] = allNodes
      .filter((n) => !set.has(n.id))
      .map((n) => ({
        id: n.id,
        x1: n.x - 2,
        y1: n.y - 2,
        x2: n.x + NODE_W + 2,
        y2: n.y + NODE_H + 2,
      }));
    nodeBBoxCache.set(k, list);
    return list;
  }

  function vertCrosses(X: number, Y1: number, Y2: number, boxes: BBox[]): boolean {
    const yMin = Math.min(Y1, Y2);
    const yMax = Math.max(Y1, Y2);
    return boxes.some((b) => X > b.x1 && X < b.x2 && yMax > b.y1 && yMin < b.y2);
  }

  function safeMidX(
    initial: number,
    gapStart: number,
    gapEnd: number,
    y1: number,
    y2: number,
    boxes: BBox[],
  ): number {
    if (!vertCrosses(initial, y1, y2, boxes)) return initial;
    const lo = Math.min(gapStart, gapEnd);
    const hi = Math.max(gapStart, gapEnd);
    for (let dx = 4; dx <= hi - lo; dx += 4) {
      const left = initial - dx;
      const right = initial + dx;
      if (left >= lo && !vertCrosses(left, y1, y2, boxes)) return left;
      if (right <= hi && !vertCrosses(right, y1, y2, boxes)) return right;
    }
    return initial;
  }

  // ---- pre-compute slot positions ----
  const inletYByEdge = new Map<string, number>();
  const outletYByEdge = new Map<string, number>();
  const midXSlotByEdge = new Map<string, number>();

  const incoming: Record<string, { from: string; to: string }[]> = {};
  const outgoing: Record<string, { from: string; to: string }[]> = {};
  edges.forEach((e) => {
    (incoming[e.to] ||= []).push(e);
    (outgoing[e.from] ||= []).push(e);
  });
  Object.values(incoming).forEach((list) => {
    if (list.length <= 1) return;
    list.sort((a, b) => stableHash(a.from) - stableHash(b.from));
    list.forEach((e, i) => {
      const spread = NODE_H - 16;
      const step = spread / (list.length + 1);
      inletYByEdge.set(e.from + '>' + e.to, step * (i + 1) - spread / 2);
    });
  });
  Object.values(outgoing).forEach((list) => {
    if (list.length <= 1) return;
    list.sort((a, b) => stableHash(a.to) - stableHash(b.to));
    list.forEach((e, i) => {
      const spread = NODE_H - 16;
      const step = spread / (list.length + 1);
      outletYByEdge.set(e.from + '>' + e.to, step * (i + 1) - spread / 2);
    });
  });

  const groupByGap: Record<string, { from: string; to: string }[]> = {};
  edges.forEach((e) => {
    const from = nodeById[e.from];
    const to = nodeById[e.to];
    if (!from || !to) return;
    const fromPhase = phaseById[from.phase];
    const toPhase = phaseById[to.phase];
    if (!fromPhase || !toPhase) return;
    const dPhase = toPhase.idx - fromPhase.idx;
    const dCol = (to.col || 0) - (from.col || 0);
    let gk: string | null = null;
    if (dPhase > 0) gk = `phase:${from.phase}>${to.phase}`;
    else if (dPhase === 0 && dCol > 0) {
      gk = `col:${from.phase}:${from.col || 0}>${to.col || 0}`;
    }
    if (!gk) return;
    (groupByGap[gk] ||= []).push(e);
  });
  Object.values(groupByGap).forEach((list) => {
    if (list.length <= 1) return;
    list.sort((a, b) => {
      const af = nodeById[a.from];
      const at = nodeById[a.to];
      const bf = nodeById[b.from];
      const bt = nodeById[b.to];
      if (!af || !at || !bf || !bt) return 0;
      const aY = (af.cy + at.cy) / 2;
      const bY = (bf.cy + bt.cy) / 2;
      return aY === bY
        ? stableHash(a.from + a.to) - stableHash(b.from + b.to)
        : aY - bY;
    });
    list.forEach((e, i) => {
      midXSlotByEdge.set(e.from + '>' + e.to, i - (list.length - 1) / 2);
    });
  });

  // ---- compute SVG path per edge ----
  const TOTAL_LANES_H = Object.values(layout.lanes).reduce((acc, l) => acc + l.height, 0);

  function edgePath(from: NodeLayout, to: NodeLayout): { d: string; kind: EdgeKind } {
    const key = from.id + '>' + to.id;
    const inletOff = inletYByEdge.get(key) || 0;
    const outletOff = outletYByEdge.get(key) || 0;
    const slot = midXSlotByEdge.get(key) || 0;
    const kind = classifyEdge(from, to, phaseById);
    const r = 8;
    const MIN_RUN_IN = 22;
    const srcRight = { x: from.x + NODE_W, y: from.cy + outletOff };
    const srcLeft = { x: from.x, y: from.cy + outletOff };
    const srcTop = { x: from.cx, y: from.y };
    const srcBot = { x: from.cx, y: from.y + NODE_H };
    const dstLeft = { x: to.x, y: to.cy + inletOff };
    const dstTop = { x: to.cx, y: to.y };
    const dstBot = { x: to.cx, y: to.y + NODE_H };

    if (kind === 'forward-phase') {
      const srcPhase = phaseById[from.phase];
      const dstPhase = phaseById[to.phase];
      if (!srcPhase || !dstPhase) {
        return { d: `M ${srcRight.x} ${srcRight.y} L ${dstLeft.x} ${dstLeft.y}`, kind };
      }
      const gapStart = srcPhase.x + srcPhase.width;
      const gapEnd = dstPhase.x;
      let midX =
        gapEnd - gapStart > 4
          ? (gapStart + gapEnd) / 2
          : (srcRight.x + dstLeft.x) / 2;
      midX += slot * SLOT_SPACING;
      if (slot === 0) midX += (stableHash(key) % 9) - 4;
      if (Math.abs(srcRight.y - dstLeft.y) < 3) {
        return { d: `M ${srcRight.x} ${srcRight.y} L ${dstLeft.x} ${dstLeft.y}`, kind };
      }
      midX = safeMidX(
        midX,
        gapStart,
        gapEnd,
        srcRight.y,
        dstLeft.y,
        bboxesExcluding(from.id, to.id),
      );
      if (dstLeft.x - midX < MIN_RUN_IN + r) midX = dstLeft.x - MIN_RUN_IN - r;
      const dirV = Math.sign(dstLeft.y - srcRight.y);
      const d = `M ${srcRight.x} ${srcRight.y} L ${midX - r} ${srcRight.y} Q ${midX} ${srcRight.y} ${midX} ${srcRight.y + r * dirV} L ${midX} ${dstLeft.y - r * dirV} Q ${midX} ${dstLeft.y} ${midX + r} ${dstLeft.y} L ${dstLeft.x} ${dstLeft.y}`;
      return { d, kind };
    }
    if (kind === 'forward-col') {
      if (Math.abs(srcRight.y - dstLeft.y) < 3) {
        return { d: `M ${srcRight.x} ${srcRight.y} L ${dstLeft.x} ${dstLeft.y}`, kind };
      }
      let midX = (srcRight.x + dstLeft.x) / 2 + slot * SLOT_SPACING;
      midX = safeMidX(
        midX,
        srcRight.x + 4,
        dstLeft.x - 4,
        srcRight.y,
        dstLeft.y,
        bboxesExcluding(from.id, to.id),
      );
      const available = dstLeft.x - srcRight.x;
      const runIn = Math.min(MIN_RUN_IN, available / 2 - r);
      if (dstLeft.x - midX < runIn + r) midX = dstLeft.x - runIn - r;
      const dirV = Math.sign(dstLeft.y - srcRight.y);
      const d = `M ${srcRight.x} ${srcRight.y} L ${midX - r} ${srcRight.y} Q ${midX} ${srcRight.y} ${midX} ${srcRight.y + r * dirV} L ${midX} ${dstLeft.y - r * dirV} Q ${midX} ${dstLeft.y} ${midX + r} ${dstLeft.y} L ${dstLeft.x} ${dstLeft.y}`;
      return { d, kind };
    }
    if (kind === 'forward-stack') {
      return { d: `M ${srcBot.x} ${srcBot.y + 2} L ${dstTop.x} ${dstTop.y - 4}`, kind };
    }
    if (kind === 'back-stack') {
      const loopX = from.x - 14;
      const d = `M ${srcLeft.x} ${srcLeft.y} L ${loopX + r} ${srcLeft.y} Q ${loopX} ${srcLeft.y} ${loopX} ${srcLeft.y - r} L ${loopX} ${dstLeft.y + r} Q ${loopX} ${dstLeft.y} ${loopX + r} ${dstLeft.y} L ${dstLeft.x} ${dstLeft.y}`;
      return { d, kind };
    }
    if (kind === 'back-col') {
      const lanesBottom = PHASE_LABEL_H + BACKWARD_BUS_H + TOTAL_LANES_H;
      const dCol = Math.abs((to.col || 0) - (from.col || 0));
      const railY = lanesBottom + 8 + Math.min(dCol, 3) * 6 + (stableHash(key) % 8);
      const d = `M ${srcBot.x} ${srcBot.y} L ${srcBot.x} ${railY - r} Q ${srcBot.x} ${railY} ${srcBot.x - r} ${railY} L ${dstBot.x + r} ${railY} Q ${dstBot.x} ${railY} ${dstBot.x} ${railY - r} L ${dstBot.x} ${dstBot.y}`;
      return { d, kind };
    }
    if (kind === 'back-phase') {
      const srcPhase = phaseById[from.phase];
      const dstPhase = phaseById[to.phase];
      if (!srcPhase || !dstPhase) {
        return { d: `M ${srcRight.x} ${srcRight.y} L ${dstLeft.x} ${dstLeft.y}`, kind };
      }
      const dist = Math.abs(srcPhase.idx - dstPhase.idx);
      const busY =
        PHASE_LABEL_H + 6 + (4 - Math.min(dist, 4)) * 7 + ((stableHash(key) % 8) - 4);
      const d = `M ${srcTop.x} ${srcTop.y} L ${srcTop.x} ${busY + r} Q ${srcTop.x} ${busY} ${srcTop.x + r * Math.sign(dstTop.x - srcTop.x)} ${busY} L ${dstTop.x - r * Math.sign(dstTop.x - srcTop.x)} ${busY} Q ${dstTop.x} ${busY} ${dstTop.x} ${busY + r} L ${dstTop.x} ${dstTop.y}`;
      return { d, kind };
    }
    return { d: `M ${srcRight.x} ${srcRight.y} L ${dstLeft.x} ${dstLeft.y}`, kind };
  }

  const out = new Map<string, EdgeRoute>();
  edges.forEach((e) => {
    const from = nodeById[e.from];
    const to = nodeById[e.to];
    if (!from || !to) return;
    const { d, kind } = edgePath(from, to);
    out.set(`${e.from}>${e.to}`, { d, kind, backward: isBackward(kind) });
  });
  return out;
}
