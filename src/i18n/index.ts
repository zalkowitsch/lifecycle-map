// UI dictionary aggregation.
//
// Per-language string tables live in `./en`, `./pt`, `./es`. This module
// re-exports the lang catalog, the supported-UI-lang list, the dictionary
// registry, and the `LANG_NAMES` lookup used by the language switcher.

import { en } from './en';
import { pt } from './pt';
import { es } from './es';

/** Shape of a UI string table. Keys are stable identifiers used in the chrome. */
export type UIStrings = { [key: string]: string };

/** Supported UI languages. Order matches viewer.js `UI_LANGS`. */
export const UI_LANGS = ['en', 'pt', 'es'] as const;
export type UILang = (typeof UI_LANGS)[number];

/** Per-language UI dictionary. */
export const dictionaries: Record<UILang, UIStrings> = { en, pt, es };

/**
 * Display names for the language-picker dropdowns. Used by the chrome
 * for both the UI-language switcher and the map-language switcher,
 * so it covers more codes than `UI_LANGS`. Ported from viewer.js (~line 76).
 */
export const LANG_NAMES: Record<string, string> = {
  en: 'EN · English',
  pt: 'PT · Português',
  es: 'ES · Español',
  fr: 'FR · Français',
  de: 'DE · Deutsch',
  it: 'IT · Italiano',
  ja: 'JA · 日本語',
  zh: 'ZH · 中文',
  ko: 'KO · 한국어',
};

export { en, pt, es };
