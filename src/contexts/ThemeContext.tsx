// ThemeContext — owns the current visual theme + light/dark mode and keeps
// `document.documentElement.dataset.theme` / `data-mode` in sync.
//
// Boot order:
//   1. URL `?theme=` / `?mode=` (highest priority — share-link override).
//   2. localStorage (`lifecycle-map.theme` / `lifecycle-map.mode`).
//   3. Default theme `paper`, mode follows `prefers-color-scheme`.
//
// Ported from viewer.js `initThemeAndMode` / `applyTheme` / `applyMode`
// (~lines 384-411).

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

export type Theme =
  | 'paper'
  | 'mono'
  | 'midcentury'
  | 'blueprint'
  | 'solarized'
  | 'newsprint'
  | 'neon'
  | 'botanical';

export type Mode = 'light' | 'dark';

export const THEMES = [
  { id: 'paper', name: 'Paper', desc: 'editorial schematic' },
  { id: 'mono', name: 'Mono', desc: 'brutalist terminal' },
  { id: 'midcentury', name: 'Mid-Century', desc: 'wes-anderson poster' },
  { id: 'blueprint', name: 'Blueprint', desc: 'technical drawing' },
  { id: 'solarized', name: 'Solarized', desc: 'developer classic' },
  { id: 'newsprint', name: 'Newsprint', desc: '1920s newspaper' },
  { id: 'neon', name: 'Neon', desc: 'cyberpunk minimal' },
  { id: 'botanical', name: 'Botanical', desc: 'herbarium plate' },
] as const;

const STORAGE_THEME = 'lifecycle-map.theme';
const STORAGE_MODE = 'lifecycle-map.mode';
const DEFAULT_THEME: Theme = 'paper';

const VALID_THEMES = new Set<string>(THEMES.map((t) => t.id));

function isTheme(value: string | null): value is Theme {
  return value !== null && VALID_THEMES.has(value);
}

function isMode(value: string | null): value is Mode {
  return value === 'light' || value === 'dark';
}

function readInitialTheme(): Theme {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  try {
    const params = new URLSearchParams(window.location.search);
    const queryTheme = params.get('theme');
    if (isTheme(queryTheme)) return queryTheme;
    const stored = window.localStorage.getItem(STORAGE_THEME);
    if (isTheme(stored)) return stored;
  } catch {
    // ignore — fall through to default
  }
  return DEFAULT_THEME;
}

function readInitialMode(): Mode {
  if (typeof window === 'undefined') return 'light';
  try {
    const params = new URLSearchParams(window.location.search);
    const queryMode = params.get('mode');
    if (isMode(queryMode)) return queryMode;
    const stored = window.localStorage.getItem(STORAGE_MODE);
    if (isMode(stored)) return stored;
  } catch {
    // ignore
  }
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

interface ThemeContextValue {
  theme: Theme;
  mode: Mode;
  setTheme: (t: Theme) => void;
  setMode: (m: Mode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(readInitialTheme);
  const [mode, setModeState] = useState<Mode>(readInitialMode);

  // Apply theme to <html data-theme=...> any time it changes, including the
  // initial render. Mirrors viewer.js's `document.documentElement.dataset.theme`.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.mode = mode;
  }, [mode]);

  const setTheme = useCallback((next: Theme) => {
    if (!VALID_THEMES.has(next)) return;
    setThemeState(next);
    try {
      window.localStorage.setItem(STORAGE_THEME, next);
    } catch {
      // localStorage may be unavailable (privacy mode) — ignore.
    }
  }, []);

  const setMode = useCallback((next: Mode) => {
    if (next !== 'light' && next !== 'dark') return;
    setModeState(next);
    try {
      window.localStorage.setItem(STORAGE_MODE, next);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, mode, setTheme, setMode }),
    [theme, mode, setTheme, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside a <ThemeProvider>');
  }
  return ctx;
}
