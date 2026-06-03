// useZoom — CSS-transform zoom for the canvas content.
//
// The legacy viewer re-rendered the whole SVG on every zoom step (viewer.js
// `applyZoom` → `rerenderForTheme`). That worked but was expensive for large
// maps and made smooth zoom impossible. The React port flips the approach:
// the SVG is rendered ONCE at logical dimensions and we apply
// `transform: scale(z)` (origin `0 0`) to the content wrapper element. The
// browser handles the rasterization, scrollbars adjust automatically because
// the scaled content reports a larger layout box, and edge routing / sticky
// headers don't need to know zoom exists.
//
// Persisted in localStorage so a reload preserves the user's preferred level.

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

export const ZOOM_LEVELS = [0.25, 0.5, 1.0] as const;

const STORAGE_ZOOM = 'lifecycle-map.zoom';
const MIN_ZOOM = 0.05;
const MAX_ZOOM = 4;
const DEFAULT_ZOOM = 1.0;

function readInitialZoom(): number {
  if (typeof window === 'undefined') return DEFAULT_ZOOM;
  try {
    const stored = window.localStorage.getItem(STORAGE_ZOOM);
    if (stored == null) return DEFAULT_ZOOM;
    const parsed = parseFloat(stored);
    if (!Number.isFinite(parsed)) return DEFAULT_ZOOM;
    if (parsed >= 0.1 && parsed <= MAX_ZOOM) return parsed;
  } catch {
    // ignore
  }
  return DEFAULT_ZOOM;
}

function clamp(z: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
}

interface UseZoomResult {
  zoom: number;
  setZoom: (z: number) => void;
  fitToScreen: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
}

export function useZoom(canvasContentRef: RefObject<HTMLElement>): UseZoomResult {
  const [zoom, setZoomState] = useState<number>(readInitialZoom);

  // Apply CSS transform whenever zoom OR the ref's element changes. Doing this
  // in an effect (rather than inside setZoom) keeps the source of truth in
  // React state — useful for fast-refresh and for callers that read `zoom`.
  useEffect(() => {
    const el = canvasContentRef.current;
    if (!el) return;
    el.style.transformOrigin = '0 0';
    el.style.transform = `scale(${zoom})`;
  }, [zoom, canvasContentRef]);

  const setZoom = useCallback((z: number) => {
    const clamped = clamp(z);
    setZoomState(clamped);
    try {
      window.localStorage.setItem(STORAGE_ZOOM, String(clamped));
    } catch {
      // ignore
    }
  }, []);

  // Track the latest zoom in a ref so zoomIn/zoomOut/fitToScreen can read it
  // without resubscribing every render.
  const zoomRef = useRef(zoom);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const fitToScreen = useCallback(() => {
    const el = canvasContentRef.current;
    if (!el) {
      setZoom(DEFAULT_ZOOM);
      return;
    }
    const parent = el.parentElement;
    if (!parent) {
      setZoom(DEFAULT_ZOOM);
      return;
    }
    // scrollWidth/scrollHeight already reflect the un-scaled content size as
    // long as we read BEFORE applying the new transform. We compute the ratio
    // from the natural content box vs. the viewport.
    const currentZoom = zoomRef.current || 1;
    const naturalW = el.scrollWidth / currentZoom;
    const naturalH = el.scrollHeight / currentZoom;
    const viewportW = Math.max(200, parent.clientWidth - 20);
    const viewportH = Math.max(200, parent.clientHeight - 20);
    if (naturalW <= 0) {
      setZoom(DEFAULT_ZOOM);
      return;
    }
    const zoomW = viewportW / naturalW;
    const zoomH = naturalH > 0 ? viewportH / naturalH : zoomW;
    const fit = Math.max(MIN_ZOOM, Math.min(1.0, Math.min(zoomW, zoomH)));
    setZoom(fit);
  }, [canvasContentRef, setZoom]);

  const zoomIn = useCallback(() => {
    const current = zoomRef.current;
    const higher = ZOOM_LEVELS.find((z) => z > current + 0.001);
    if (higher !== undefined) setZoom(higher);
  }, [setZoom]);

  const zoomOut = useCallback(() => {
    const current = zoomRef.current;
    // Iterate descending — `[...].reverse()` allocates; a manual loop avoids it.
    for (let i = ZOOM_LEVELS.length - 1; i >= 0; i--) {
      const level = ZOOM_LEVELS[i];
      if (level !== undefined && level < current - 0.001) {
        setZoom(level);
        return;
      }
    }
  }, [setZoom]);

  const reset = useCallback(() => {
    setZoom(DEFAULT_ZOOM);
  }, [setZoom]);

  return { zoom, setZoom, fitToScreen, zoomIn, zoomOut, reset };
}
