// ZoomControl — header dropdown that shows the current zoom percentage
// and lets the user pick a preset (25 / 50 / 100 %) or "Fit to screen".
//
// Behavior:
//   - Click trigger to open. Click outside or press Esc to close.
//   - Active preset is highlighted (background = ink) when zoom matches.
//
// The component is purely presentational — all zoom state lives in the
// parent (App.tsx); we just emit `onSetZoom` / `onFitToScreen`.

import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './ZoomControl.module.css';

export interface ZoomControlProps {
  zoom: number;                            // current value (0..3)
  onSetZoom: (z: number) => void;
  onFitToScreen: () => void;
  uiLang?: string;                         // optional for i18n labels
}

const PRESETS: ReadonlyArray<{ label: string; value: number }> = [
  { label: '25%', value: 0.25 },
  { label: '50%', value: 0.5 },
  { label: '100%', value: 1 },
];

// Float-safe equality for matching the active preset.
const EPS = 1e-3;
function near(a: number, b: number): boolean {
  return Math.abs(a - b) < EPS;
}

export function ZoomControl({
  zoom,
  onSetZoom,
  onFitToScreen,
  uiLang: _uiLang,
}: ZoomControlProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Click-outside to close.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (ev: MouseEvent): void => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      if (ev.target instanceof Node && wrap.contains(ev.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  // Esc to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (ev: KeyboardEvent): void => {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const pickPreset = useCallback(
    (value: number) => {
      onSetZoom(value);
      setOpen(false);
    },
    [onSetZoom],
  );

  const pickFit = useCallback(() => {
    onFitToScreen();
    setOpen(false);
  }, [onFitToScreen]);

  const label = `${Math.round(zoom * 100)}%`;

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.trigger}
        title="Zoom"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {label}
      </button>
      {open ? (
        <div className={styles.menu} role="menu">
          {PRESETS.map((p) => {
            const isActive = near(zoom, p.value);
            const cls = isActive ? styles.active : undefined;
            return (
              <button
                key={p.value}
                type="button"
                role="menuitem"
                className={cls}
                onClick={() => pickPreset(p.value)}
              >
                {p.label}
              </button>
            );
          })}
          <div className={styles.separator} aria-hidden="true" />
          <button type="button" role="menuitem" onClick={pickFit}>
            Fit to screen
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default ZoomControl;
