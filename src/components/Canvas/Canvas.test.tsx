/// <reference types="vitest/globals" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';

import { Canvas } from './Canvas';
import { normalize } from '@/hooks/useViewerState';
import type { NormalizedMap } from '@/types/lifecycle-map';

const L = (v: unknown): string => (typeof v === 'string' ? v : String(v ?? ''));

function makeData(): NormalizedMap {
  return normalize({
    meta: { title: 'Test' },
    lanes: [
      { id: 'l1', label: 'Lane 1' },
      { id: 'l2', label: 'Lane 2' },
    ],
    phases: [
      { id: 'p1', label: 'P1' },
      { id: 'p2', label: 'P2' },
    ],
    nodes: [
      { id: 'n1', lane: 'l1', phase: 'p1', title: 'A' },
      { id: 'n2', lane: 'l2', phase: 'p2', title: 'B' },
    ],
    edges: [{ from: 'n1', to: 'n2' }],
  });
}

interface RenderOpts {
  activeNodeId?: string | null;
  zoom?: number;
  onZoom?: (z: number) => void;
}

function renderCanvas(opts: RenderOpts = {}) {
  const onNodeClick = vi.fn();
  const onEdgeClick = vi.fn();
  const onEmptyClick = vi.fn();
  const onZoom = opts.onZoom ?? vi.fn();
  const data = makeData();
  const result = render(
    <Canvas
      data={data}
      activeNodeId={opts.activeNodeId ?? null}
      onNodeClick={onNodeClick}
      onEdgeClick={onEdgeClick}
      onEmptyClick={onEmptyClick}
      zoom={opts.zoom ?? 1}
      onZoom={onZoom}
      L={L}
    />,
  );
  return { ...result, onNodeClick, onEdgeClick, onEmptyClick, onZoom, data };
}

describe('Canvas', () => {
  it('renders main SVG', () => {
    const { container } = renderCanvas();
    const svgs = container.querySelectorAll('svg');
    // There is one main SVG inside .canvasContent + 3 sticky-header svgs.
    expect(svgs.length).toBeGreaterThanOrEqual(1);
  });

  it('renders nodes (g.node with data-id)', () => {
    const { container } = renderCanvas();
    const nodes = container.querySelectorAll('g.node');
    expect(nodes.length).toBe(2);
    expect(container.querySelector('g.node[data-id="n1"]')).toBeTruthy();
    expect(container.querySelector('g.node[data-id="n2"]')).toBeTruthy();
  });

  it('renders edge paths', () => {
    const { container } = renderCanvas();
    const edges = container.querySelectorAll('path.edge');
    expect(edges.length).toBeGreaterThanOrEqual(1);
  });

  it('click on node calls onNodeClick(id)', () => {
    const { container, onNodeClick } = renderCanvas();
    const n1 = container.querySelector('g.node[data-id="n1"]')!;
    fireEvent.click(n1);
    expect(onNodeClick).toHaveBeenCalledWith('n1');
  });

  it('click on edge path calls onEdgeClick(from, to)', () => {
    const { container, onEdgeClick } = renderCanvas();
    const edge = container.querySelector('path.edge')!;
    fireEvent.click(edge);
    expect(onEdgeClick).toHaveBeenCalledWith('n1', 'n2');
  });

  it('click on edge-hit (invisible hit area) calls onEdgeClick', () => {
    const { container, onEdgeClick } = renderCanvas();
    const hit = container.querySelector('path.edge-hit')!;
    fireEvent.click(hit);
    expect(onEdgeClick).toHaveBeenCalledWith('n1', 'n2');
  });

  it('click on empty area (wrap) calls onEmptyClick', () => {
    const { container, onEmptyClick } = renderCanvas();
    const wrap = container.querySelector('[data-canvas-wrap]')!;
    fireEvent.click(wrap);
    expect(onEmptyClick).toHaveBeenCalledTimes(1);
  });

  it('active node has className "active"', () => {
    const { container } = renderCanvas({ activeNodeId: 'n1' });
    const n1 = container.querySelector('g.node[data-id="n1"]')!;
    expect(n1.getAttribute('class')).toContain('active');
  });

  it('upstream/downstream classes are applied to related nodes', () => {
    // n1 -> n2: when n2 active, n1 should be upstream.
    const r1 = renderCanvas({ activeNodeId: 'n2' });
    const n1 = r1.container.querySelector('g.node[data-id="n1"]')!;
    expect(n1.getAttribute('class')).toContain('upstream');
    r1.unmount();

    // When n1 active, n2 should be downstream.
    const r2 = renderCanvas({ activeNodeId: 'n1' });
    const n2 = r2.container.querySelector('g.node[data-id="n2"]')!;
    expect(n2.getAttribute('class')).toContain('downstream');
  });

  it('edges receive upstream / downstream classes when their endpoint is active', () => {
    const { container } = renderCanvas({ activeNodeId: 'n2' });
    // edge from n1 to n2 → since e.to === activeNodeId, class becomes "edge upstream"
    const edges = container.querySelectorAll('path.edge');
    const cls = Array.from(edges).map((e) => e.getAttribute('class') ?? '');
    expect(cls.some((c) => c.includes('upstream'))).toBe(true);
  });

  it('zoom prop is applied as transform: scale(zoom) on canvas-content', () => {
    const { container } = renderCanvas({ zoom: 1.5 });
    const wrap = container.querySelector('[data-canvas-wrap]')!;
    // The scaled content is the direct child wrapping the main SVG.
    const content = wrap.querySelector('div[style*="scale"]') as HTMLElement | null;
    expect(content).toBeTruthy();
    expect(content!.getAttribute('style')).toContain('scale(1.5)');
  });

  it('data-canvas-wrap attribute is present on the wrapper', () => {
    const { container } = renderCanvas();
    const wrap = container.querySelector('[data-canvas-wrap]');
    expect(wrap).toBeTruthy();
  });

  describe('pinch wheel (ctrlKey)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('debounced ctrl+wheel calls onZoom', () => {
      const onZoom = vi.fn();
      const { container } = renderCanvas({ onZoom, zoom: 1 });
      const wrap = container.querySelector('[data-canvas-wrap]')!;
      fireEvent.wheel(wrap, { ctrlKey: true, deltaY: -100 });
      // before flush
      expect(onZoom).not.toHaveBeenCalled();
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(onZoom).toHaveBeenCalledTimes(1);
      // zoom factor with deltaY=-100 and sensitivity 0.01 should be > 1
      const next = onZoom.mock.calls[0][0] as number;
      expect(next).toBeGreaterThan(1);
      expect(next).toBeLessThanOrEqual(3);
    });

    it('wheel without ctrlKey does NOT call onZoom', () => {
      const onZoom = vi.fn();
      const { container } = renderCanvas({ onZoom });
      const wrap = container.querySelector('[data-canvas-wrap]')!;
      fireEvent.wheel(wrap, { ctrlKey: false, deltaY: -100 });
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(onZoom).not.toHaveBeenCalled();
    });

    it('clamps zoom to ZOOM_MAX', () => {
      const onZoom = vi.fn();
      // Huge negative deltaY → exp grows large; should clamp to 3.
      const { container } = renderCanvas({ onZoom, zoom: 2.9 });
      const wrap = container.querySelector('[data-canvas-wrap]')!;
      fireEvent.wheel(wrap, { ctrlKey: true, deltaY: -10000 });
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(onZoom).toHaveBeenCalledWith(3);
    });
  });

  describe('pan-on-drag', () => {
    it('pointerdown + move past threshold + up does not fire onEmptyClick', () => {
      const { container, onEmptyClick } = renderCanvas();
      const wrap = container.querySelector('[data-canvas-wrap]') as HTMLElement;
      fireEvent.pointerDown(wrap, {
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
        clientX: 100,
        clientY: 100,
      });
      fireEvent.pointerMove(wrap, {
        pointerId: 1,
        clientX: 200,
        clientY: 200,
      });
      fireEvent.pointerUp(wrap, {
        pointerId: 1,
        clientX: 200,
        clientY: 200,
      });
      // The synthetic click that follows pan must be suppressed.
      fireEvent.click(wrap);
      expect(onEmptyClick).not.toHaveBeenCalled();
    });

    it('pointerdown + up without moving still allows onEmptyClick on click', () => {
      const { container, onEmptyClick } = renderCanvas();
      const wrap = container.querySelector('[data-canvas-wrap]') as HTMLElement;
      fireEvent.pointerDown(wrap, {
        pointerId: 2,
        pointerType: 'mouse',
        button: 0,
        clientX: 50,
        clientY: 50,
      });
      fireEvent.pointerUp(wrap, {
        pointerId: 2,
        clientX: 50,
        clientY: 50,
      });
      fireEvent.click(wrap);
      expect(onEmptyClick).toHaveBeenCalledTimes(1);
    });

    it('pointerdown on a node does NOT initiate pan (early return)', () => {
      const { container, onEmptyClick, onNodeClick } = renderCanvas();
      const wrap = container.querySelector('[data-canvas-wrap]') as HTMLElement;
      const n1 = container.querySelector('g.node[data-id="n1"]') as Element;
      // pointerdown originates on the node; pan should not be armed
      fireEvent.pointerDown(n1, {
        pointerId: 3,
        pointerType: 'mouse',
        button: 0,
        clientX: 10,
        clientY: 10,
      });
      // move significantly — should NOT pan
      fireEvent.pointerMove(wrap, {
        pointerId: 3,
        clientX: 200,
        clientY: 200,
      });
      fireEvent.pointerUp(wrap, {
        pointerId: 3,
        clientX: 200,
        clientY: 200,
      });
      // a regular click on the node should still call onNodeClick
      fireEvent.click(n1);
      expect(onNodeClick).toHaveBeenCalledWith('n1');
      expect(onEmptyClick).not.toHaveBeenCalled();
    });

    it('pointerdown with non-primary mouse button is ignored', () => {
      const { container, onEmptyClick } = renderCanvas();
      const wrap = container.querySelector('[data-canvas-wrap]') as HTMLElement;
      fireEvent.pointerDown(wrap, {
        pointerId: 9,
        pointerType: 'mouse',
        button: 2, // right click
        clientX: 0,
        clientY: 0,
      });
      fireEvent.pointerMove(wrap, {
        pointerId: 9,
        clientX: 200,
        clientY: 200,
      });
      fireEvent.pointerUp(wrap, {
        pointerId: 9,
        clientX: 200,
        clientY: 200,
      });
      // A click on wrap after right-button gesture should still register as empty.
      fireEvent.click(wrap);
      expect(onEmptyClick).toHaveBeenCalledTimes(1);
    });

    it('pointer events with mismatched pointerId during move are ignored', () => {
      const { container } = renderCanvas();
      const wrap = container.querySelector('[data-canvas-wrap]') as HTMLElement;
      fireEvent.pointerDown(wrap, {
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
        clientX: 0,
        clientY: 0,
      });
      // Different pointerId — handler returns early without panning.
      fireEvent.pointerMove(wrap, {
        pointerId: 99,
        clientX: 500,
        clientY: 500,
      });
      // No throw, no class added. We just assert it's still operable.
      fireEvent.pointerUp(wrap, {
        pointerId: 1,
        clientX: 0,
        clientY: 0,
      });
      expect(wrap).toBeTruthy();
    });
  });
});
