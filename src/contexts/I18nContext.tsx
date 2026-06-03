// I18nContext — two-axis language state.
//
//   uiLang   = the chrome language (settings drawer, splash, buttons). One of
//              `UI_LANGS`. Falls back to browser-language then 'en'.
//   dataLang = the language used to resolve `I18nString` values in the loaded
//              map. Can be any 2-letter code present in the data; defaults to
//              `meta.default_lang` or the first available language.
//
// Both axes are independent so the user can read a Portuguese map with the
// English chrome, etc. UI-lang persists in localStorage; data-lang persists
// only when the user actively picks one (so loading a new map can re-default).
//
// Ported from viewer.js (~lines 92-220 for the dictionaries, ~line 1527 for L).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type FC,
  type ReactNode,
} from 'react';

import { UI_LANGS, dictionaries, type UILang } from '@/i18n';

const STORAGE_UI_LANG = 'lifecycle-map.uiLang';
const STORAGE_DATA_LANG = 'lifecycle-map.lang';

const UI_LANG_SET = new Set<string>(UI_LANGS);

function isUILang(value: string | null | undefined): value is UILang {
  return value != null && UI_LANG_SET.has(value);
}

function detectInitialUILang(): UILang {
  if (typeof window === 'undefined') return 'en';
  try {
    const stored = window.localStorage.getItem(STORAGE_UI_LANG);
    if (isUILang(stored)) return stored;
  } catch {
    // ignore
  }
  const browser = (navigator.language ?? 'en').slice(0, 2).toLowerCase();
  return isUILang(browser) ? browser : 'en';
}

function detectInitialDataLang(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(STORAGE_DATA_LANG);
    if (stored && stored.length > 0) return stored;
  } catch {
    // ignore
  }
  return null;
}

interface I18nContextValue {
  uiLang: UILang;
  setUILang: (l: UILang) => void;
  t: (key: string) => string;
  dataLang: string | null;
  setDataLang: (l: string) => void;
  availableLangs: string[];
  setAvailableLangs: (l: string[]) => void;
  /** Resolve an I18nString (or any unknown) to the current data-lang. */
  L: (value: unknown) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

/**
 * Resolve a value that may be a string, a number, an array, or a localized
 * `{ lang: string }` map to a plain string for the given language.
 * Mirrors viewer.js `L()` (~line 1527) including array-join behavior.
 */
function resolveLocalized(value: unknown, lang: string | null): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value.map((v) => resolveLocalized(v, lang)).join(', ');
  }
  if (typeof value !== 'object') return String(value);

  const map = value as Record<string, unknown>;
  if (lang) {
    const v = map[lang];
    if (typeof v === 'string') return v;
  }
  const en = map['en'];
  if (typeof en === 'string') return en;
  for (const key of Object.keys(map)) {
    const v = map[key];
    if (typeof v === 'string') return v;
  }
  return '';
}

export const I18nProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [uiLang, setUILangState] = useState<UILang>(detectInitialUILang);
  const [dataLang, setDataLangState] = useState<string | null>(detectInitialDataLang);
  const [availableLangs, setAvailableLangs] = useState<string[]>([]);

  // Keep the document language attribute in sync — assistive tech reads it.
  useEffect(() => {
    document.documentElement.lang = uiLang;
  }, [uiLang]);

  const setUILang = useCallback((next: UILang) => {
    if (!UI_LANG_SET.has(next)) return;
    setUILangState(next);
    try {
      window.localStorage.setItem(STORAGE_UI_LANG, next);
    } catch {
      // ignore
    }
  }, []);

  const setDataLang = useCallback((next: string) => {
    setDataLangState(next);
    try {
      window.localStorage.setItem(STORAGE_DATA_LANG, next);
    } catch {
      // ignore
    }
  }, []);

  const t = useCallback(
    (key: string): string => {
      const dict = dictionaries[uiLang];
      const hit = dict[key];
      if (typeof hit === 'string') return hit;
      const fallback = dictionaries.en[key];
      return typeof fallback === 'string' ? fallback : key;
    },
    [uiLang],
  );

  const L = useCallback(
    (value: unknown): string => resolveLocalized(value, dataLang),
    [dataLang],
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      uiLang,
      setUILang,
      t,
      dataLang,
      setDataLang,
      availableLangs,
      setAvailableLangs,
      L,
    }),
    [uiLang, setUILang, t, dataLang, setDataLang, availableLangs, L],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used inside an <I18nProvider>');
  }
  return ctx;
}
