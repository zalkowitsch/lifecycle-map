import { useEffect, useState } from 'react';

/** A partial Glide `theme` object built from the app's CSS custom properties. */
export interface GlideTheme {
  accentColor: string;
  accentLight: string;
  textDark: string;
  textMedium: string;
  textLight: string;
  bgCell: string;
  bgCellMedium: string;
  bgHeader: string;
  bgHeaderHovered: string;
  bgHeaderHasFocus: string;
  borderColor: string;
  horizontalBorderColor: string;
  textHeader: string;
  fontFamily: string;
  baseFontStyle: string;
  headerFontStyle: string;
}

function readVar(styles: CSSStyleDeclaration, name: string, fallback: string): string {
  const v = styles.getPropertyValue(name).trim();
  return v || fallback;
}

/**
 * Build a Glide Data Grid theme from the active app theme's CSS variables so the
 * spreadsheet re-skins with the selected theme × mode. Reads theme/mode from
 * `<html data-theme/data-mode>` (what actually drives the CSS vars) and observes
 * changes to those attributes, so it re-themes without coupling to React context
 * (and works in tests rendered without a ThemeProvider).
 */
export function useGlideTheme(): GlideTheme {
  const [glide, setGlide] = useState<GlideTheme>(() => computeTheme());

  useEffect(() => {
    const recompute = () => {
      // Defer one frame so the attribute swap has propagated to computed styles.
      requestAnimationFrame(() => setGlide(computeTheme()));
    };
    const el = document.documentElement;
    const observer = new MutationObserver(recompute);
    observer.observe(el, { attributes: true, attributeFilter: ['data-theme', 'data-mode'] });
    recompute();
    return () => observer.disconnect();
  }, []);

  return glide;
}

function computeTheme(): GlideTheme {
  const s = getComputedStyle(document.documentElement);
  const ink = readVar(s, '--ink', '#0d0d0d');
  const ink2 = readVar(s, '--ink-2', ink);
  const mute = readVar(s, '--mute', '#837d70');
  const bg = readVar(s, '--node-bg', readVar(s, '--bg', '#ffffff'));
  const bg2 = readVar(s, '--bg-2', '#f4f4f4');
  const rule = readVar(s, '--rule', '#cccccc');
  const rule2 = readVar(s, '--rule-2', '#e5e5e5');
  const accent = readVar(s, '--accent', '#c2410c');
  const accent2 = readVar(s, '--accent-2', accent);
  const fontBody = readVar(s, '--font-body', 'Inter, sans-serif');

  return {
    accentColor: accent,
    accentLight: accent2,
    textDark: ink,
    textMedium: ink2,
    textLight: mute,
    textHeader: ink,
    bgCell: bg,
    bgCellMedium: bg2,
    bgHeader: bg2,
    bgHeaderHovered: rule2,
    bgHeaderHasFocus: rule2,
    borderColor: rule,
    horizontalBorderColor: rule2,
    fontFamily: fontBody,
    baseFontStyle: '13px',
    headerFontStyle: '600 12px',
  };
}
