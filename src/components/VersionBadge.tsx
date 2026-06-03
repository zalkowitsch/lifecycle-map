// VersionBadge — slide-in toast that announces a fresh deploy.
//
// JSX mirrors the `showBadge` template in version-check.js (icon + text +
// refresh/dismiss buttons). Styles live in VersionBadge.module.css.
// i18n strings are inlined here (same 3 langs as the original); when a
// shared `@/i18n` module lands, lift them out.

import { useEffect, useState } from 'react';

import { useVersionCheck } from '@/hooks/useVersionCheck';

import styles from './VersionBadge.module.css';

type Lang = 'en' | 'pt' | 'es';
type StringKey = 'title' | 'sub' | 'btn' | 'dismiss';

const LANG_STRINGS: Record<Lang, Record<StringKey, string>> = {
  en: {
    title: 'A new version is available',
    sub: 'Refresh to pick up the latest changes',
    btn: 'Refresh',
    dismiss: 'Dismiss',
  },
  pt: {
    title: 'Uma nova versão está disponível',
    sub: 'Recarregue para pegar as últimas mudanças',
    btn: 'Recarregar',
    dismiss: 'Dispensar',
  },
  es: {
    title: 'Una nueva versión está disponible',
    sub: 'Recarga para obtener los últimos cambios',
    btn: 'Recargar',
    dismiss: 'Descartar',
  },
};

function isLang(value: string): value is Lang {
  return value === 'en' || value === 'pt' || value === 'es';
}

function getLang(): Lang {
  try {
    const stored = localStorage.getItem('lifecycle-map.uiLang');
    if (stored && isLang(stored)) return stored;
  } catch (_) {
    // localStorage may throw in private mode / sandboxed contexts
  }
  const browser = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return isLang(browser) ? browser : 'en';
}

function t(key: StringKey): string {
  return LANG_STRINGS[getLang()][key];
}

export function VersionBadge(): JSX.Element | null {
  const { updateAvailable, dismiss, refresh } = useVersionCheck();
  const [refreshing, setRefreshing] = useState(false);
  // Drives the slide-in transition: mount with .badge (transform: 20px,
  // opacity 0), then on the next frame add .show to trigger the move.
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!updateAvailable) {
      setShown(false);
      return;
    }
    const raf = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(raf);
  }, [updateAvailable]);

  if (!updateAvailable) return null;

  const handleRefresh = (): void => {
    setRefreshing(true);
    refresh();
    // Safety net: if the reload is blocked (extension, etc.), re-enable the
    // button so the user can try again. Matches the 4s fallback in the
    // original.
    window.setTimeout(() => setRefreshing(false), 4000);
  };

  const className = shown ? `${styles.badge} ${styles.show}` : styles.badge;

  return (
    <div className={className} role="status" aria-live="polite">
      <div className={styles.icon} aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 4v5h5" />
        </svg>
      </div>
      <div className={styles.text}>
        <div className={styles.title}>{t('title')}</div>
        <div className={styles.sub}>{t('sub')}</div>
      </div>
      <div className={styles.actions}>
        <button
          className={styles.refresh}
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? '…' : t('btn')}
        </button>
        <button className={styles.dismiss} type="button" onClick={dismiss}>
          {t('dismiss')}
        </button>
      </div>
    </div>
  );
}
