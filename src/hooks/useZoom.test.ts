import { beforeEach, describe, expect, test } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { createRef, type RefObject } from 'react';
import { useZoom } from './useZoom';

const STORAGE_ZOOM = 'lifecycle-map.zoom';

function makeContentRef(): RefObject<HTMLElement> {
  const ref = createRef<HTMLElement>();
  // Mount a wrapper > content tree so `el.parentElement` is non-null for fit.
  const parent = document.createElement('div');
  const content = document.createElement('div');
  parent.appendChild(content);
  document.body.appendChild(parent);
  (ref as { current: HTMLElement }).current = content;
  return ref;
}

function defineDimension(el: Element, prop: 'clientWidth' | 'clientHeight' | 'scrollWidth' | 'scrollHeight', value: number): void {
  Object.defineProperty(el, prop, { configurable: true, value });
}

describe('useZoom', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
  });

  test('default zoom is 1 when localStorage is empty', () => {
    const ref = makeContentRef();
    const { result } = renderHook(() => useZoom(ref));
    expect(result.current.zoom).toBe(1);
  });

  test('initial zoom is read from localStorage', () => {
    localStorage.setItem(STORAGE_ZOOM, '0.5');
    const ref = makeContentRef();
    const { result } = renderHook(() => useZoom(ref));
    expect(result.current.zoom).toBe(0.5);
  });

  test('falls back to default when stored value is not a number', () => {
    localStorage.setItem(STORAGE_ZOOM, 'garbage');
    const ref = makeContentRef();
    const { result } = renderHook(() => useZoom(ref));
    expect(result.current.zoom).toBe(1);
  });

  test('setZoom updates state, persists, and applies CSS transform', () => {
    const ref = makeContentRef();
    const { result } = renderHook(() => useZoom(ref));

    act(() => {
      result.current.setZoom(0.5);
    });

    expect(result.current.zoom).toBe(0.5);
    expect(localStorage.getItem(STORAGE_ZOOM)).toBe('0.5');
    expect(ref.current?.style.transform).toBe('scale(0.5)');
    expect(ref.current?.style.transformOrigin).toBe('0 0');
  });

  test('setZoom clamps to MIN_ZOOM / MAX_ZOOM bounds', () => {
    const ref = makeContentRef();
    const { result } = renderHook(() => useZoom(ref));

    act(() => {
      result.current.setZoom(100);
    });
    expect(result.current.zoom).toBe(4);

    act(() => {
      result.current.setZoom(0);
    });
    expect(result.current.zoom).toBe(0.05);
  });

  test('zoomIn moves to the next preset above the current value', () => {
    const ref = makeContentRef();
    const { result } = renderHook(() => useZoom(ref));

    act(() => {
      result.current.setZoom(0.25);
    });
    act(() => {
      result.current.zoomIn();
    });
    expect(result.current.zoom).toBe(0.5);

    act(() => {
      result.current.zoomIn();
    });
    expect(result.current.zoom).toBe(1);

    // No higher preset — stays put.
    act(() => {
      result.current.zoomIn();
    });
    expect(result.current.zoom).toBe(1);
  });

  test('zoomOut moves to the next preset below the current value', () => {
    const ref = makeContentRef();
    const { result } = renderHook(() => useZoom(ref));

    expect(result.current.zoom).toBe(1);
    act(() => {
      result.current.zoomOut();
    });
    expect(result.current.zoom).toBe(0.5);

    act(() => {
      result.current.zoomOut();
    });
    expect(result.current.zoom).toBe(0.25);

    // No lower preset — stays put.
    act(() => {
      result.current.zoomOut();
    });
    expect(result.current.zoom).toBe(0.25);
  });

  test('reset returns to the default zoom level', () => {
    const ref = makeContentRef();
    const { result } = renderHook(() => useZoom(ref));

    act(() => {
      result.current.setZoom(0.25);
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.zoom).toBe(1);
  });

  test('fitToScreen computes a ratio from content vs viewport', () => {
    const ref = makeContentRef();
    const { result } = renderHook(() => useZoom(ref));

    const content = ref.current as HTMLElement;
    const parent = content.parentElement as HTMLElement;

    // Natural content is 2000x1000, viewport is 520x520 (after the 20px pad).
    defineDimension(content, 'scrollWidth', 2000);
    defineDimension(content, 'scrollHeight', 1000);
    defineDimension(parent, 'clientWidth', 520);
    defineDimension(parent, 'clientHeight', 520);

    act(() => {
      result.current.fitToScreen();
    });

    // (520 - 20) / 2000 = 0.25 — the limiting axis.
    expect(result.current.zoom).toBeCloseTo(0.25, 5);
  });

  test('fitToScreen falls back to default when ref is detached', () => {
    const ref: RefObject<HTMLElement> = { current: null };
    const { result } = renderHook(() => useZoom(ref));

    act(() => {
      result.current.setZoom(0.5);
    });
    act(() => {
      result.current.fitToScreen();
    });
    expect(result.current.zoom).toBe(1);
  });
});
