// StickyHeaders — the 3 sticky SVG layers that live OUTSIDE the zoom-scaled
// canvas wrapper: phase header (top row), lane labels (left column) and the
// top-left corner. Keeping them out of the scaled wrapper means their SVG
// text always renders at natural size — no `--text-scale` hack needed inside
// the wrapper, no CSS transform fighting with the sticky position.
//
// Each layer is a separate <svg>. They sit inside positioned divs that
// implement the sticky behavior (see Canvas.module.css). The SVGs paint
// their own backgrounds + divider lines.

import type { ComputedLayout } from '@/lib/layout';
import { LAYOUT_CONSTANTS } from '@/lib/layout';
import type { Lane, NormalizedMap, Phase } from '@/types/lifecycle-map';
import styles from './Canvas.module.css';

const { LANE_LABEL_W, PHASE_LABEL_H } = LAYOUT_CONSTANTS;
const ROMAN_LABEL_GAP = 10;

interface StickyHeadersProps {
  data: NormalizedMap;
  layout: ComputedLayout;
  zoom: number;
  L: (value: unknown) => string;
}

export function StickyHeaders({ data, layout, zoom, L }: StickyHeadersProps) {
  const { svgW, svgH } = layout;
  return (
    <>
      <PhaseHeader data={data} layout={layout} zoom={zoom} L={L} svgW={svgW} />
      <LaneLabels data={data} layout={layout} zoom={zoom} L={L} svgH={svgH} />
      <Corner zoom={zoom} />
    </>
  );
}

interface PhaseHeaderProps {
  data: NormalizedMap;
  layout: ComputedLayout;
  zoom: number;
  L: (value: unknown) => string;
  svgW: number;
}

function PhaseHeader({ data, layout, zoom, L, svgW }: PhaseHeaderProps) {
  return (
    <div className={`${styles.stickyLayer} ${styles.stickyRow}`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={svgW * zoom}
        height={PHASE_LABEL_H * zoom}
        viewBox={`0 0 ${svgW} ${PHASE_LABEL_H}`}
      >
        <rect x={0} y={0} width={svgW} height={PHASE_LABEL_H} fill="var(--bg)" />
        {data.phases.map((p: Phase) => {
          const phase = layout.phases[p.id];
          if (!phase) return null;
          // Roman width is unknown without measuring. Approximate from char
          // count + nominal font size — visually close to the legacy
          // getBBox() result; minor pixel drift is fine here.
          const romanText = phase.roman;
          const approxRomanW = romanText.length * 14;
          const labelX = phase.x + phase.padX + approxRomanW + ROMAN_LABEL_GAP;
          return (
            <g key={p.id}>
              <text className="phase-roman" x={phase.x + phase.padX} y={30}>
                {romanText}
              </text>
              <text className="phase-label" x={labelX} y={22}>
                {L(p.label)}
              </text>
              <text className="phase-sub" x={labelX} y={36}>
                {`${phase.subCols} ${phase.subCols === 1 ? 'lane' : 'lanes'}`}
              </text>
            </g>
          );
        })}
        {/* bottom border */}
        <line
          x1={0}
          y1={PHASE_LABEL_H - 0.5}
          x2={svgW}
          y2={PHASE_LABEL_H - 0.5}
          className="lane-edge"
        />
      </svg>
    </div>
  );
}

interface LaneLabelsProps {
  data: NormalizedMap;
  layout: ComputedLayout;
  zoom: number;
  L: (value: unknown) => string;
  svgH: number;
}

function LaneLabels({ data, layout, zoom, L, svgH }: LaneLabelsProps) {
  return (
    <div className={`${styles.stickyLayer} ${styles.stickyCol}`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={LANE_LABEL_W * zoom}
        height={svgH * zoom}
        viewBox={`0 0 ${LANE_LABEL_W} ${svgH}`}
      >
        <rect x={0} y={0} width={LANE_LABEL_W} height={svgH} fill="var(--bg)" />
        {data.lanes.map((l: Lane, i: number) => {
          const lane = layout.lanes[l.id];
          if (!lane) return null;
          const y = lane.top;
          const h = lane.height;
          const subText = l.sub ? L(l.sub) : '';
          return (
            <g key={l.id}>
              <text className="lane-sub" x={14} y={y + 16}>
                {String(i + 1).padStart(2, '0')}
              </text>
              <text className="lane-label" x={14} y={y + h / 2 + 2}>
                {L(l.label)}
              </text>
              {subText ? (
                <text className="lane-sub" x={14} y={y + h / 2 + 16}>
                  {subText}
                </text>
              ) : null}
              {i < data.lanes.length - 1 ? (
                <line
                  x1={0}
                  y1={y + h}
                  x2={LANE_LABEL_W}
                  y2={y + h}
                  className="lane-divider"
                />
              ) : null}
            </g>
          );
        })}
        <line
          x1={LANE_LABEL_W - 1}
          y1={PHASE_LABEL_H}
          x2={LANE_LABEL_W - 1}
          y2={svgH}
          className="lane-edge"
        />
      </svg>
    </div>
  );
}

function Corner({ zoom }: { zoom: number }) {
  return (
    <div className={`${styles.stickyLayer} ${styles.stickyCorner}`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={LANE_LABEL_W * zoom}
        height={PHASE_LABEL_H * zoom}
        viewBox={`0 0 ${LANE_LABEL_W} ${PHASE_LABEL_H}`}
      >
        <rect x={0} y={0} width={LANE_LABEL_W} height={PHASE_LABEL_H} fill="var(--bg)" />
        <line
          x1={LANE_LABEL_W - 1}
          y1={0}
          x2={LANE_LABEL_W - 1}
          y2={PHASE_LABEL_H}
          className="lane-edge"
        />
        <line
          x1={0}
          y1={PHASE_LABEL_H - 0.5}
          x2={LANE_LABEL_W}
          y2={PHASE_LABEL_H - 0.5}
          className="lane-edge"
        />
      </svg>
    </div>
  );
}
