/// <reference types="vitest/globals" />
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';

import { StickyHeaders } from './StickyHeaders';
import { normalize } from '@/hooks/useViewerState';
import { computeLayout } from '@/lib/layout';
import type { NormalizedMap } from '@/types/lifecycle-map';

const L = (v: unknown): string => (typeof v === 'string' ? v : String(v ?? ''));

function makeData(): NormalizedMap {
  return normalize({
    meta: { title: 'Test' },
    lanes: [
      { id: 'l1', label: 'Lane 1', sub: 'sublabel' },
      { id: 'l2', label: 'Lane 2' },
    ],
    phases: [
      { id: 'p1', label: 'Phase One' },
      { id: 'p2', label: 'Phase Two' },
    ],
    nodes: [
      { id: 'n1', lane: 'l1', phase: 'p1', title: 'A' },
      { id: 'n2', lane: 'l2', phase: 'p2', title: 'B' },
    ],
    edges: [{ from: 'n1', to: 'n2' }],
  });
}

describe('StickyHeaders', () => {
  it('renders 3 SVGs (phase header, lane labels, corner)', () => {
    const data = makeData();
    const layout = computeLayout(data);
    const { container } = render(
      <StickyHeaders data={data} layout={layout} zoom={1} L={L} />,
    );
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBe(3);
  });

  it('phase labels are rendered', () => {
    const data = makeData();
    const layout = computeLayout(data);
    const { container } = render(
      <StickyHeaders data={data} layout={layout} zoom={1} L={L} />,
    );
    const phaseLabels = container.querySelectorAll('text.phase-label');
    const texts = Array.from(phaseLabels).map((n) => n.textContent ?? '');
    expect(texts).toContain('Phase One');
    expect(texts).toContain('Phase Two');
  });

  it('phase roman numerals are rendered', () => {
    const data = makeData();
    const layout = computeLayout(data);
    const { container } = render(
      <StickyHeaders data={data} layout={layout} zoom={1} L={L} />,
    );
    const romans = container.querySelectorAll('text.phase-roman');
    const texts = Array.from(romans).map((n) => n.textContent ?? '');
    expect(texts).toContain('I');
    expect(texts).toContain('II');
  });

  it('lane labels are rendered', () => {
    const data = makeData();
    const layout = computeLayout(data);
    const { container } = render(
      <StickyHeaders data={data} layout={layout} zoom={1} L={L} />,
    );
    const labels = container.querySelectorAll('text.lane-label');
    const texts = Array.from(labels).map((n) => n.textContent ?? '');
    expect(texts).toContain('Lane 1');
    expect(texts).toContain('Lane 2');
  });

  it('lane sub-text is rendered when present (and order-number lane-sub elements too)', () => {
    const data = makeData();
    const layout = computeLayout(data);
    const { container } = render(
      <StickyHeaders data={data} layout={layout} zoom={1} L={L} />,
    );
    const subs = container.querySelectorAll('text.lane-sub');
    const texts = Array.from(subs).map((n) => n.textContent ?? '');
    expect(texts).toContain('01');
    expect(texts).toContain('02');
    expect(texts).toContain('sublabel');
  });

  it('zoom prop scales the sticky SVGs width/height', () => {
    const data = makeData();
    const layout = computeLayout(data);
    const { container, rerender } = render(
      <StickyHeaders data={data} layout={layout} zoom={1} L={L} />,
    );
    const svgsAtOne = container.querySelectorAll('svg');
    const heightAtOne = Number(svgsAtOne[0].getAttribute('height'));
    const widthCornerAtOne = Number(svgsAtOne[2].getAttribute('width'));

    rerender(<StickyHeaders data={data} layout={layout} zoom={2} L={L} />);
    const svgsAtTwo = container.querySelectorAll('svg');
    const heightAtTwo = Number(svgsAtTwo[0].getAttribute('height'));
    const widthCornerAtTwo = Number(svgsAtTwo[2].getAttribute('width'));

    expect(heightAtTwo).toBeCloseTo(heightAtOne * 2);
    expect(widthCornerAtTwo).toBeCloseTo(widthCornerAtOne * 2);
  });

  it('returns null for phases not in layout (defensive branch)', () => {
    const data = makeData();
    const layout = computeLayout(data);
    // remove p2 from layout
    delete layout.phases.p2;
    const { container } = render(
      <StickyHeaders data={data} layout={layout} zoom={1} L={L} />,
    );
    const phaseLabels = container.querySelectorAll('text.phase-label');
    expect(phaseLabels.length).toBe(1);
  });

  it('returns null for lanes not in layout (defensive branch)', () => {
    const data = makeData();
    const layout = computeLayout(data);
    delete layout.lanes.l2;
    const { container } = render(
      <StickyHeaders data={data} layout={layout} zoom={1} L={L} />,
    );
    const laneLabels = container.querySelectorAll('text.lane-label');
    expect(laneLabels.length).toBe(1);
  });
});
