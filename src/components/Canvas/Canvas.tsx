// Canvas — the swim-lane SVG renderer.
//
// Architecture:
//   <div .canvasWrap>  ← scroll container; pan-on-drag handlers attached here
//     <StickyHeaders/>  ← sticky row/col/corner SVGs, NOT scaled by zoom
//     <div .canvasContent style={transform: scale(zoom)}>
//       <svg #main>      ← lanes + phases + edges + nodes, NOT re-rendered on zoom
//     </div>
//   </div>
//
// Why CSS transform for zoom: re-rendering 200+ nodes / 400+ edges on every
// zoom tick is wasteful and would re-route edges (jitter). A pure GPU-accel
// transform on the wrapper keeps zoom interactive. The sticky layers stay
// at natural size because they sit OUTSIDE the scaled wrapper.

import { useCallback, useMemo, useRef } from 'react';
import type { CSSProperties, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import { computeLayout } from '@/lib/layout';
import { LAYOUT_CONSTANTS } from '@/lib/layout';
import { routeEdges } from '@/lib/edge-router';
import type { MapEdge, MapNode, Mode, NormalizedMap } from '@/types/lifecycle-map';
import { StickyHeaders } from './StickyHeaders';
import styles from './Canvas.module.css';

const { LANE_LABEL_W, PHASE_LABEL_H, BACKWARD_BUS_H, NODE_W, NODE_H, SUBCOL_W } = LAYOUT_CONSTANTS;

interface CanvasProps {
  data: NormalizedMap;
  activeNodeId: string | null;
  onNodeClick: (id: string) => void;
  onEdgeClick: (fromId: string, toId: string) => void;
  onEmptyClick: () => void;
  zoom: number;
  L: (value: unknown) => string;
}

// Pan-on-drag threshold (px). Movement below this is treated as a click;
// above, the pointerup handler swallows the click that would follow.
const DRAG_THRESHOLD = 4;

export function Canvas({
  data,
  activeNodeId,
  onNodeClick,
  onEdgeClick,
  onEmptyClick,
  zoom,
  L,
}: CanvasProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Layout + edge routing are pure functions of `data`. We don't re-compute
  // them on zoom changes — zoom is purely a CSS transform on the wrapper.
  const layout = useMemo(() => computeLayout(data), [data]);
  const edgeRoutes = useMemo(() => routeEdges(data.edges, layout), [data.edges, layout]);

  // Pre-build mode → color map. _modeMap is already normalized.
  const modeMap = data._modeMap;

  // Upstream / downstream sets for the active node — drives node + edge
  // styling. Cheap to recompute on activeNodeId change (O(edges)).
  const { upstreamSet, downstreamSet } = useMemo(() => {
    const up = new Set<string>();
    const down = new Set<string>();
    if (activeNodeId) {
      data.edges.forEach((e: MapEdge) => {
        if (e.to === activeNodeId) up.add(e.from);
        if (e.from === activeNodeId) down.add(e.to);
      });
    }
    return { upstreamSet: up, downstreamSet: down };
  }, [data.edges, activeNodeId]);

  // ---- pan-on-drag ----
  const panStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
    moved: boolean;
  } | null>(null);

  const handlePointerDown = useCallback((ev: ReactPointerEvent<HTMLDivElement>) => {
    // Don't initiate pan when starting on an interactive element. We let the
    // node/edge click handler win.
    const target = ev.target as Element | null;
    if (target && target.closest && (target.closest('.node') || target.closest('.edge') || target.closest('.edge-hit'))) {
      return;
    }
    // Only primary button (mouse) or touch/pen.
    if (ev.pointerType === 'mouse' && ev.button !== 0) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    panStateRef.current = {
      pointerId: ev.pointerId,
      startX: ev.clientX,
      startY: ev.clientY,
      scrollLeft: wrap.scrollLeft,
      scrollTop: wrap.scrollTop,
      moved: false,
    };
  }, []);

  const handlePointerMove = useCallback((ev: ReactPointerEvent<HTMLDivElement>) => {
    const st = panStateRef.current;
    const wrap = wrapRef.current;
    if (!st || !wrap || ev.pointerId !== st.pointerId) return;
    const dx = ev.clientX - st.startX;
    const dy = ev.clientY - st.startY;
    if (!st.moved && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;
    if (!st.moved) {
      st.moved = true;
      wrap.classList.add(styles.panning ?? 'panning');
      try {
        wrap.setPointerCapture(ev.pointerId);
      } catch {
        /* no-op */
      }
    }
    wrap.scrollLeft = st.scrollLeft - dx;
    wrap.scrollTop = st.scrollTop - dy;
  }, []);

  const endPan = useCallback((ev: ReactPointerEvent<HTMLDivElement>) => {
    const st = panStateRef.current;
    const wrap = wrapRef.current;
    if (!st || !wrap) return;
    if (st.moved) {
      wrap.classList.remove(styles.panning ?? 'panning');
    }
    try {
      if (wrap.hasPointerCapture(ev.pointerId)) wrap.releasePointerCapture(ev.pointerId);
    } catch {
      /* no-op */
    }
    panStateRef.current = null;
  }, []);

  // Empty-canvas click — fires only when the user didn't pan and clicked on
  // a non-interactive part of the SVG (lane bg, phase divider, empty space).
  const handleClick = useCallback(
    (ev: ReactPointerEvent<HTMLDivElement>) => {
      // If a drag actually happened, swallow the synthetic click.
      const target = ev.target as Element | null;
      if (target && target.closest && (target.closest('.node') || target.closest('.edge') || target.closest('.edge-hit'))) {
        return;
      }
      onEmptyClick();
    },
    [onEmptyClick],
  );

  // ---- render ----
  const { svgW, svgH } = layout;

  const contentStyle: CSSProperties = {
    width: svgW * zoom,
    height: svgH * zoom,
    transform: `scale(${zoom})`,
    transformOrigin: '0 0',
  };

  return (
    <div
      ref={wrapRef}
      className={styles.canvasWrap}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endPan}
      onPointerCancel={endPan}
      onClick={handleClick}
    >
      {/* Sticky layers — natural size, outside the scaled wrapper. */}
      <StickyHeaders data={data} layout={layout} zoom={zoom} L={L} />

      {/* Scaled content wrapper holds the main SVG. */}
      <div className={styles.canvasContent} style={contentStyle}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={svgW}
          height={svgH}
          viewBox={`0 0 ${svgW} ${svgH}`}
        >
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX={9}
              refY={5}
              markerWidth={7}
              markerHeight={7}
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" className="arrow-fill" />
            </marker>
            <marker
              id="arrow-upstream"
              viewBox="0 0 10 10"
              refX={9}
              refY={5}
              markerWidth={8}
              markerHeight={8}
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" className="arrow-upstream-fill" />
            </marker>
            <marker
              id="arrow-downstream"
              viewBox="0 0 10 10"
              refX={9}
              refY={5}
              markerWidth={8}
              markerHeight={8}
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" className="arrow-downstream-fill" />
            </marker>
          </defs>

          <LanesLayer data={data} layout={layout} />
          <PhasesLayer data={data} layout={layout} />
          <EdgesLayer
            data={data}
            edgeRoutes={edgeRoutes}
            activeNodeId={activeNodeId}
            upstreamSet={upstreamSet}
            downstreamSet={downstreamSet}
            onEdgeClick={onEdgeClick}
          />
          <NodesLayer
            data={data}
            layout={layout}
            activeNodeId={activeNodeId}
            upstreamSet={upstreamSet}
            downstreamSet={downstreamSet}
            modeMap={modeMap}
            onNodeClick={onNodeClick}
            L={L}
          />
        </svg>
      </div>
    </div>
  );
}

// --- sub-layers ---------------------------------------------------------

interface LanesLayerProps {
  data: NormalizedMap;
  layout: ReturnType<typeof computeLayout>;
}

function LanesLayer({ data, layout }: LanesLayerProps) {
  const { svgW } = layout;
  return (
    <g>
      {data.lanes.map((l, i) => {
        const lane = layout.lanes[l.id];
        if (!lane) return null;
        const y = lane.top;
        const h = lane.height;
        return (
          <g key={l.id}>
            {/* Zebra background for odd rows. The opacity matches the legacy
                paint and lets the page-level grid show through subtly. */}
            {i % 2 === 1 ? (
              <rect
                x={LANE_LABEL_W}
                y={y}
                width={svgW - LANE_LABEL_W}
                height={h}
                fill="var(--bg-2)"
                opacity={0.5}
              />
            ) : null}
            {/* Divider between this lane and the next */}
            {i < data.lanes.length - 1 ? (
              <line
                x1={LANE_LABEL_W}
                y1={y + h}
                x2={svgW}
                y2={y + h}
                className="lane-divider"
              />
            ) : null}
          </g>
        );
      })}
    </g>
  );
}

interface PhasesLayerProps {
  data: NormalizedMap;
  layout: ReturnType<typeof computeLayout>;
}

function PhasesLayer({ data, layout }: PhasesLayerProps) {
  const { svgH } = layout;
  return (
    <g>
      {data.phases.map((p, i) => {
        const phase = layout.phases[p.id];
        if (!phase) return null;
        const subDividers: number[] = [];
        for (let c = 1; c < phase.subCols; c++) {
          subDividers.push(phase.x + phase.padX + c * SUBCOL_W);
        }
        return (
          <g key={p.id}>
            {/* Main phase divider on the LEFT edge (skip for first phase). */}
            {i > 0 ? (
              <line
                x1={phase.x}
                y1={PHASE_LABEL_H}
                x2={phase.x}
                y2={svgH - 30}
                className="phase-divider"
              />
            ) : null}
            {/* Sub-column dividers — dashed, start below the backward bus. */}
            {subDividers.map((x) => (
              <line
                key={x}
                x1={x}
                y1={PHASE_LABEL_H + BACKWARD_BUS_H}
                x2={x}
                y2={svgH - 30}
                className="subphase-divider"
              />
            ))}
          </g>
        );
      })}
    </g>
  );
}

interface EdgesLayerProps {
  data: NormalizedMap;
  edgeRoutes: Map<string, { d: string; backward: boolean }>;
  activeNodeId: string | null;
  upstreamSet: Set<string>;
  downstreamSet: Set<string>;
  onEdgeClick: (fromId: string, toId: string) => void;
}

function EdgesLayer({
  data,
  edgeRoutes,
  activeNodeId,
  upstreamSet,
  downstreamSet,
  onEdgeClick,
}: EdgesLayerProps) {
  return (
    <g>
      {data.edges.map((e: MapEdge) => {
        const key = `${e.from}>${e.to}`;
        const route = edgeRoutes.get(key);
        if (!route) return null;
        // Classify for styling/marker.
        let cls = 'edge';
        let marker = 'url(#arrow)';
        if (route.backward) cls += ' backward';
        if (activeNodeId) {
          if (e.to === activeNodeId) {
            cls = 'edge upstream';
            marker = 'url(#arrow-upstream)';
          } else if (e.from === activeNodeId) {
            cls = 'edge downstream';
            marker = 'url(#arrow-downstream)';
          } else if (upstreamSet.size === 0 && downstreamSet.size === 0) {
            // no relations — leave default classes
          }
        }
        const handleClick = (ev: ReactMouseEvent) => {
          ev.stopPropagation();
          onEdgeClick(e.from, e.to);
        };
        return (
          <g key={key}>
            {/* Thick invisible hit area for easier targeting. */}
            <path d={route.d} className="edge-hit" onClick={handleClick} />
            <path d={route.d} className={cls} markerEnd={marker} onClick={handleClick} />
          </g>
        );
      })}
    </g>
  );
}

interface NodesLayerProps {
  data: NormalizedMap;
  layout: ReturnType<typeof computeLayout>;
  activeNodeId: string | null;
  upstreamSet: Set<string>;
  downstreamSet: Set<string>;
  modeMap: Record<string, Mode>;
  onNodeClick: (id: string) => void;
  L: (value: unknown) => string;
}

function NodesLayer({
  data,
  layout,
  activeNodeId,
  upstreamSet,
  downstreamSet,
  modeMap,
  onNodeClick,
  L,
}: NodesLayerProps) {
  const modeColor = (id: string | undefined): string => {
    if (!id) return '#6b6557';
    const m = modeMap[id];
    return m ? m.color : '#6b6557';
  };
  return (
    <g>
      {data.nodes.map((n: MapNode) => {
        const pos = layout.nodes[n.id];
        if (!pos) return null;
        let cls = 'node';
        if (n.id === activeNodeId) cls += ' active';
        else if (upstreamSet.has(n.id)) cls += ' upstream';
        else if (downstreamSet.has(n.id)) cls += ' downstream';
        const subTxt = n.sub ? L(n.sub) : '';
        const displaySub = subTxt.length > 30 ? subTxt.slice(0, 30) + '…' : subTxt;
        const todayMode = n.today?.mode;
        const tomorrowMode = n.tomorrow?.mode;
        const handleClick = (ev: ReactMouseEvent) => {
          ev.stopPropagation();
          onNodeClick(n.id);
        };
        return (
          <g
            key={n.id}
            className={cls}
            transform={`translate(${pos.x}, ${pos.y})`}
            data-id={n.id}
            onClick={handleClick}
          >
            <rect width={NODE_W} height={NODE_H} className="node-rect" />
            {todayMode ? (
              <circle
                cx={NODE_W - 18}
                cy={11}
                r={4}
                fill={modeColor(todayMode)}
                stroke="var(--ink)"
                strokeWidth={1}
              />
            ) : null}
            {tomorrowMode ? (
              <circle
                cx={NODE_W - 8}
                cy={11}
                r={4}
                fill={modeColor(tomorrowMode)}
                stroke="var(--ink)"
                strokeWidth={1}
              />
            ) : null}
            <text className="node-id" x={12} y={14}>
              {n.id}
            </text>
            <text className="node-title" x={12} y={36}>
              {L(n.title)}
            </text>
            {displaySub ? (
              <text className="node-sub" x={12} y={52}>
                {displaySub}
              </text>
            ) : null}
          </g>
        );
      })}
    </g>
  );
}

export default Canvas;
