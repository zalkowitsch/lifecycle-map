// SettingsDrawer — theme/mode/language picker drawer.
//
// Mirrors viewer.js `initSettingsDrawer`, `openSettings`, `renderThemeSwatches`
// (~line 435–532), and `syncSettingsUI` (~line 997). The 8 theme cards are
// rendered as mini-previews: we mount an off-screen probe div carrying the
// theme/mode data attributes, read the resolved CSS variables via
// `getComputedStyle`, and apply those colors as inline styles on the card.
//
// Imports `useTheme` and `useI18n` from contexts being created in parallel.
// The expected shapes (inferred from the legacy viewer + i18n index):
//
//   useTheme(): { theme: string; mode: 'light'|'dark';
//                  setTheme(t: string): void; setMode(m: 'light'|'dark'): void }
//
//   useI18n():  { uiLang: UILang; dataLang: string;
//                  availableDataLangs: string[];
//                  setUILang(l: UILang): void; setDataLang(l: string): void;
//                  t(key: string): string; L(v: unknown): string }
//
// If those exports differ when the contexts land, the imports below are the
// only thing to retarget.

import { useEffect, useLayoutEffect, useState } from 'react';

import { useI18n } from '@/contexts/I18nContext';
import { useTheme, type Theme } from '@/contexts/ThemeContext';
import { LANG_NAMES, UI_LANGS } from '@/i18n';

import styles from './SettingsDrawer.module.css';

export interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
}

interface ThemeDef {
  id: Theme;
  name: string;
  desc: string;
}

/** Ported verbatim from viewer.js line 34. */
const THEMES: readonly ThemeDef[] = [
  { id: 'paper',      name: 'Paper',       desc: 'editorial schematic' },
  { id: 'mono',       name: 'Mono',        desc: 'brutalist terminal' },
  { id: 'midcentury', name: 'Mid-Century', desc: 'wes-anderson poster' },
  { id: 'blueprint',  name: 'Blueprint',   desc: 'technical drawing' },
  { id: 'solarized',  name: 'Solarized',   desc: 'developer classic' },
  { id: 'newsprint',  name: 'Newsprint',   desc: '1920s newspaper' },
  { id: 'neon',       name: 'Neon',        desc: 'cyberpunk minimal' },
  { id: 'botanical',  name: 'Botanical',   desc: 'herbarium plate' },
];

interface ThemePalette {
  bg: string;
  bg2: string;
  ink: string;
  mute: string;
  accent: string;
  rule: string;
  nodeBg: string;
}

const FALLBACK_PALETTE: ThemePalette = {
  bg: '#fff', bg2: '#fff', ink: '#000',
  mute: '#888', accent: '#000', rule: '#888', nodeBg: '#fff',
};

/** Sample a theme's palette by mounting a hidden probe div carrying the
 *  theme/mode data attributes and reading the resolved CSS variables.
 *  Mirrors viewer.js `renderThemeSwatches` (~line 490). */
function sampleThemePalette(themeId: string, mode: 'light' | 'dark'): ThemePalette {
  if (typeof document === 'undefined') return FALLBACK_PALETTE;
  const probe = document.createElement('div');
  probe.setAttribute('data-theme', themeId);
  probe.setAttribute('data-mode', mode);
  probe.style.cssText =
    'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;visibility:hidden;pointer-events:none;';
  document.body.appendChild(probe);
  // Force a style recalc.
  void probe.offsetWidth;
  const cs = getComputedStyle(probe);
  const read = (name: string, fallback: string): string =>
    cs.getPropertyValue(name).trim() || fallback;
  const bg = read('--bg', FALLBACK_PALETTE.bg);
  const palette: ThemePalette = {
    bg,
    bg2: read('--bg-2', bg),
    ink: read('--ink', FALLBACK_PALETTE.ink),
    mute: read('--mute', FALLBACK_PALETTE.mute),
    accent: read('--accent', FALLBACK_PALETTE.ink),
    rule: read('--rule', FALLBACK_PALETTE.mute),
    nodeBg: read('--node-bg', bg),
  };
  probe.remove();
  return palette;
}

export function SettingsDrawer(props: SettingsDrawerProps): JSX.Element {
  const { open, onClose } = props;
  const { theme, mode, setTheme, setMode } = useTheme();
  const {
    uiLang, dataLang, availableLangs,
    setUILang, setDataLang, t,
  } = useI18n();

  // Re-sample palettes whenever the drawer opens or mode flips. Light/dark
  // change the resolved vars, so cards need fresh colors.
  const [palettes, setPalettes] = useState<Record<string, ThemePalette>>({});
  useLayoutEffect(() => {
    if (!open) return;
    const next: Record<string, ThemePalette> = {};
    for (const th of THEMES) next[th.id] = sampleThemePalette(th.id, mode);
    setPalettes(next);
  }, [open, mode]);

  // Escape closes.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const drawerCls = open ? `${styles.drawer} ${styles.open}` : styles.drawer;
  const showDataLang = availableLangs.length > 1;

  return (
    <aside
      className={drawerCls}
      aria-hidden={open ? 'false' : 'true'}
      role="complementary"
    >
      <button
        type="button"
        className={styles.close}
        onClick={onClose}
        aria-label="Close"
      >
        ×
      </button>
      <div className={styles.inner}>
        <h2
          className={styles.title}
          // Title contains an <em> tag in the dictionary — render as HTML to
          // match the legacy viewer's `innerHTML` path.
          dangerouslySetInnerHTML={{ __html: t('settings.title') }}
        />

        {/* Theme */}
        <div className={styles.group}>
          <div className={styles.groupLabel}>{t('settings.theme')}</div>
          <div className={styles.themeGrid}>
            {THEMES.map((th) => {
              const p = palettes[th.id];
              const active = th.id === theme;
              const cardCls = active ? `${styles.themeCard} ${styles.active}` : styles.themeCard;
              const cardStyle = p
                ? {
                  backgroundColor: p.bg,
                  borderColor: active ? p.accent : p.rule,
                  color: p.ink,
                }
                : undefined;
              const swatches = p
                ? [p.bg, p.ink, p.accent, p.nodeBg, p.mute]
                : [];
              return (
                <button
                  key={th.id}
                  type="button"
                  className={cardCls}
                  style={cardStyle}
                  onClick={() => setTheme(th.id)}
                  aria-pressed={active}
                >
                  <div className={styles.swatches}>
                    {swatches.map((c, i) => (
                      <div key={i} className={styles.swatch} style={{ background: c }} />
                    ))}
                  </div>
                  <div
                    className={styles.themeName}
                    style={p ? { color: p.ink } : undefined}
                  >
                    {th.name}
                  </div>
                  <div
                    className={styles.themeDesc}
                    style={p ? { color: p.mute } : undefined}
                  >
                    {th.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mode (light/dark) */}
        <div className={styles.group}>
          <div className={styles.groupLabel}>{t('settings.appearance')}</div>
          <div className={styles.modeToggle}>
            <button
              type="button"
              className={mode === 'light' ? styles.active : undefined}
              onClick={() => setMode('light')}
              aria-pressed={mode === 'light'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </svg>
              <span>{t('settings.mode.light')}</span>
            </button>
            <button
              type="button"
              className={mode === 'dark' ? styles.active : undefined}
              onClick={() => setMode('dark')}
              aria-pressed={mode === 'dark'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
              <span>{t('settings.mode.dark')}</span>
            </button>
          </div>
        </div>

        {/* UI language — always shown */}
        <div className={styles.group}>
          <div className={styles.groupLabel}>{t('settings.uiLanguage')}</div>
          <div className={styles.langToggle}>
            {UI_LANGS.map((lang) => (
              <button
                key={lang}
                type="button"
                className={lang === uiLang ? styles.active : undefined}
                onClick={() => setUILang(lang)}
                aria-pressed={lang === uiLang}
              >
                {LANG_NAMES[lang] ?? lang.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Data language — only if 2+ langs in the loaded map */}
        {showDataLang ? (
          <div className={styles.group}>
            <div className={styles.groupLabel}>{t('settings.dataLanguage')}</div>
            <div className={styles.langToggle}>
              {availableLangs.map((lang: string) => (
                <button
                  key={lang}
                  type="button"
                  className={lang === dataLang ? styles.active : undefined}
                  onClick={() => setDataLang(lang)}
                  aria-pressed={lang === dataLang}
                >
                  {LANG_NAMES[lang] ?? lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className={styles.foot}>
          <a href="./docs/" target="_blank" rel="noreferrer">
            {t('settings.foot.docs')}
          </a>
          {' · '}
          <a href="https://github.com/" target="_blank" rel="noreferrer">
            {t('settings.foot.github')}
          </a>
          {' · '}
          <span>{t('settings.foot.license')}</span>
        </div>
      </div>
    </aside>
  );
}

export default SettingsDrawer;
