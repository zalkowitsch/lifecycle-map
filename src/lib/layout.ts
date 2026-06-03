// Layout math for the lifecycle map.
//
// Faithful port of the layout pass inside `render(DATA)` in `viewer.js`
// (approx. lines 1604-1743). Pure math — zero DOM, zero React, no side
// effects. Keep PARITY with viewer.js; refactor later.

import type { LifecycleMap, MapEdge, MapNode, Phase } from '@/types/lifecycle-map';

export const LAYOUT_CONSTANTS = {
  LANE_LABEL_W: 130,
  SUBCOL_W: 220,
  PHASE_LABEL_H: 52,
  BACKWARD_BUS_H: 52,
  BOTTOM_RAIL_H: 40,
  NODE_W: 200,
  NODE_H: 64,
  LANE_PAD_V: 16,
  BASE_PHASE_PAD_X: 12,
  BASE_NODE_GAP_V: 28,
  SLOT_SPACING: 14,
} as const;

export interface LaneLayout {
  id: string;
  idx: number;
  top: number;
  height: number;
}

export interface PhaseLayout {
  id: string;
  idx: number;
  x: number;
  width: number;
  padX: number;
  subCols: number;
  roman: string;
}

export interface NodeLayout {
  id: string;
  x: number;
  y: number;
  cx: number;
  cy: number;
  lane: string;
  phase: string;
  col: number;
}

export interface ComputedLayout {
  svgW: number;
  svgH: number;
  lanes: Record<string, LaneLayout>;
  phases: Record<string, PhaseLayout>;
  nodes: Record<string, NodeLayout>;
}

const ROMAN = [
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV',
];

interface NormalizedPhase extends Phase {
  roman: string;
  subCols: number;
}

function normalizePhases(phases: readonly Phase[]): NormalizedPhase[] {
  return phases.map((p, i) => ({
    ...p,
    roman: p.roman || ROMAN[i] || String(i + 1),
    subCols: p.subCols || 1,
  }));
}

export function computeLayout(map: LifecycleMap, viewportWidth?: number): ComputedLayout {
  const {
    LANE_LABEL_W,
    SUBCOL_W,
    PHASE_LABEL_H,
    BACKWARD_BUS_H,
    BOTTOM_RAIL_H,
    NODE_W,
    NODE_H,
    LANE_PAD_V,
    BASE_PHASE_PAD_X,
    BASE_NODE_GAP_V,
  } = LAYOUT_CONSTANTS;

  const lanes = map.lanes;
  const phases = normalizePhases(map.phases);
  const nodes = map.nodes;
  const edges = map.edges;

  // ---- congestion sizing ----
  const edgesPerPhaseGap: Record<string, number> = {};
  const edgesPerCell: Record<string, number> = {};
  edges.forEach((e: MapEdge) => {
    const from = nodes.find((n) => n.id === e.from);
    const to = nodes.find((n) => n.id === e.to);
    if (!from || !to) return;
    if (from.phase !== to.phase) {
      const k = `${from.phase}>${to.phase}`;
      edgesPerPhaseGap[k] = (edgesPerPhaseGap[k] || 0) + 1;
    }
    const ck = `${to.lane}|${to.phase}`;
    edgesPerCell[ck] = (edgesPerCell[ck] || 0) + 1;
  });

  function phasePadX(phaseId: string): number {
    let inbound = 0;
    let outbound = 0;
    Object.entries(edgesPerPhaseGap).forEach(([k, c]) => {
      const [s, d] = k.split('>');
      if (d === phaseId) inbound += c;
      if (s === phaseId) outbound += c;
    });
    const congestion = Math.max(inbound, outbound);
    return BASE_PHASE_PAD_X + Math.min(40, Math.max(0, (congestion - 2) * 6));
  }

  function cellNodeGapV(laneId: string, phaseId: string): number {
    const c = edgesPerCell[`${laneId}|${phaseId}`] || 0;
    return BASE_NODE_GAP_V + Math.min(24, Math.max(0, (c - 2) * 4));
  }

  // ---- lane heights ----
  const laneMaxStack: Record<string, number> = {};
  lanes.forEach((l) => {
    laneMaxStack[l.id] = 1;
  });
  const cellCount: Record<string, number> = {};
  nodes.forEach((n) => {
    const k = `${n.lane}|${n.phase}|${n.col || 0}`;
    cellCount[k] = (cellCount[k] || 0) + 1;
  });
  Object.entries(cellCount).forEach(([k, c]) => {
    const laneId = k.split('|')[0];
    if (laneId === undefined) return;
    const cur = laneMaxStack[laneId] ?? 1;
    if (c > cur) laneMaxStack[laneId] = c;
  });

  const LANE_GAP_V_BY_ID: Record<string, number> = {};
  lanes.forEach((l) => {
    let maxGap: number = BASE_NODE_GAP_V;
    phases.forEach((p) => {
      const g = cellNodeGapV(l.id, p.id);
      if (g > maxGap) maxGap = g;
    });
    LANE_GAP_V_BY_ID[l.id] = maxGap;
  });

  const LANE_HEIGHT_BY_ID: Record<string, number> = {};
  lanes.forEach((l) => {
    const s = laneMaxStack[l.id] ?? 1;
    const gap = LANE_GAP_V_BY_ID[l.id] ?? BASE_NODE_GAP_V;
    LANE_HEIGHT_BY_ID[l.id] = s * NODE_H + (s - 1) * gap + LANE_PAD_V * 2;
  });

  const LANE_TOP_BY_ID: Record<string, number> = {};
  let yCursor = PHASE_LABEL_H + BACKWARD_BUS_H;
  lanes.forEach((l) => {
    LANE_TOP_BY_ID[l.id] = yCursor;
    yCursor += LANE_HEIGHT_BY_ID[l.id] ?? 0;
  });

  // ---- phase positions ----
  let xCursor = LANE_LABEL_W;
  const phaseById: Record<string, PhaseLayout> = {};
  phases.forEach((p, i) => {
    const pad = phasePadX(p.id);
    const width = p.subCols * SUBCOL_W + pad * 2;
    phaseById[p.id] = {
      id: p.id,
      idx: i,
      x: xCursor,
      width,
      padX: pad,
      subCols: p.subCols,
      roman: p.roman,
    };
    xCursor += width;
  });

  // For small maps, ensure the canvas fills the viewport. Mirrors viewer.js
  // behavior (which reads canvas-wrap clientWidth or innerWidth, falling back
  // to 1024). Here we accept an explicit `viewportWidth` from the caller and
  // fall back to 1024 — keeps this function DOM-free.
  const viewportW = viewportWidth ?? 1024;
  const SVG_W = Math.max(xCursor + 40, viewportW);
  const TOTAL_LANES_H = lanes.reduce((acc, l) => acc + (LANE_HEIGHT_BY_ID[l.id] ?? 0), 0);
  const SVG_H = PHASE_LABEL_H + BACKWARD_BUS_H + TOTAL_LANES_H + BOTTOM_RAIL_H + 20;

  // ---- node positions ----
  const cellNodes: Record<string, MapNode[]> = {};
  nodes.forEach((n) => {
    const k = `${n.lane}|${n.phase}|${n.col || 0}`;
    (cellNodes[k] ||= []).push(n);
  });

  const nodeById: Record<string, NodeLayout> = {};
  nodes.forEach((n) => {
    const colIdx = n.col || 0;
    const cellArr = cellNodes[`${n.lane}|${n.phase}|${colIdx}`] ?? [];
    const stackIdx = cellArr.indexOf(n);
    const stackCount = cellArr.length;
    const phase = phaseById[n.phase];
    if (!phase) return;
    const gapV = LANE_GAP_V_BY_ID[n.lane] ?? BASE_NODE_GAP_V;
    const xCenter = phase.x + phase.padX + colIdx * SUBCOL_W + SUBCOL_W / 2;
    const cellTop = LANE_TOP_BY_ID[n.lane] ?? 0;
    const cellH = LANE_HEIGHT_BY_ID[n.lane] ?? 0;
    const totalStackH = stackCount * NODE_H + (stackCount - 1) * gapV;
    const yCenter =
      cellTop + (cellH - totalStackH) / 2 + stackIdx * (NODE_H + gapV) + NODE_H / 2;
    nodeById[n.id] = {
      id: n.id,
      x: xCenter - NODE_W / 2,
      y: yCenter - NODE_H / 2,
      cx: xCenter,
      cy: yCenter,
      lane: n.lane,
      phase: n.phase,
      col: colIdx,
    };
  });

  // ---- assemble lane layouts ----
  const laneById: Record<string, LaneLayout> = {};
  lanes.forEach((l, i) => {
    laneById[l.id] = {
      id: l.id,
      idx: i,
      top: LANE_TOP_BY_ID[l.id] ?? 0,
      height: LANE_HEIGHT_BY_ID[l.id] ?? 0,
    };
  });

  return {
    svgW: SVG_W,
    svgH: SVG_H,
    lanes: laneById,
    phases: phaseById,
    nodes: nodeById,
  };
}
