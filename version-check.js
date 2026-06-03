/* lifecycle-map · version-check.js
 *
 * Polls the GitHub API every 5 minutes (only when the tab is visible) to
 * check whether the deployed commit has moved past the one we loaded with.
 * If it has, shows a small badge in the bottom-right with a refresh button.
 *
 * Boot sequence:
 *   1. On first load, fetch the latest commit SHA + store it as our baseline.
 *   2. Every POLL_INTERVAL_MS, fetch again and compare.
 *   3. When SHAs diverge, slide in the update badge.
 *
 * No-ops gracefully if the fetch fails (offline, rate-limited, network error).
 * No build step needed — runs as plain ES5+ in any modern browser.
 */
(function () {
  'use strict';

  const REPO = 'zalkowitsch/lifecycle-map';
  const BRANCH = 'main';
  const POLL_INTERVAL_MS = 60 * 1000;     // 1 minute
  const INITIAL_DELAY_MS = 20 * 1000;     // first check 20s after load
  const API_URL = `https://api.github.com/repos/${REPO}/commits/${BRANCH}`;

  let baselineSha = null;
  let pollHandle = null;
  let badgeShown = false;

  // Localized strings — read whatever the viewer's UI lang is, if available
  const LANG_STRINGS = {
    en: {
      title: 'A new version is available',
      sub:   'Refresh to pick up the latest changes',
      btn:   'Refresh',
      dismiss: 'Dismiss',
    },
    pt: {
      title: 'Uma nova versão está disponível',
      sub:   'Recarregue para pegar as últimas mudanças',
      btn:   'Recarregar',
      dismiss: 'Dispensar',
    },
    es: {
      title: 'Una nueva versión está disponible',
      sub:   'Recarga para obtener los últimos cambios',
      btn:   'Recargar',
      dismiss: 'Descartar',
    },
  };
  function getLang() {
    try {
      const stored = localStorage.getItem('lifecycle-map.uiLang');
      if (stored && LANG_STRINGS[stored]) return stored;
    } catch (_) {}
    const browser = (navigator.language || 'en').slice(0, 2).toLowerCase();
    return LANG_STRINGS[browser] ? browser : 'en';
  }
  function s(key) { return LANG_STRINGS[getLang()][key] || LANG_STRINGS.en[key]; }

  async function fetchLatestSha() {
    try {
      const resp = await fetch(API_URL, {
        method: 'GET',
        cache: 'no-store',
        headers: { 'Accept': 'application/vnd.github+json' },
      });
      if (!resp.ok) return null;
      const json = await resp.json();
      return json && json.sha ? json.sha : null;
    } catch (_) {
      return null;
    }
  }

  function injectStyles() {
    if (document.getElementById('version-badge-styles')) return;
    const style = document.createElement('style');
    style.id = 'version-badge-styles';
    style.textContent = `
      #version-update-badge {
        position: fixed;
        bottom: 20px; right: 20px;
        z-index: 400;
        background: var(--bg);
        color: var(--ink);
        border: 1px solid var(--ink);
        border-radius: var(--button-radius, 0);
        box-shadow: 0 12px 36px rgba(0,0,0,0.18);
        padding: 14px 18px 14px 16px;
        display: flex;
        align-items: center;
        gap: 14px;
        max-width: 380px;
        opacity: 0;
        transform: translateY(20px);
        transition: opacity 320ms cubic-bezier(.22,.61,.36,1), transform 320ms cubic-bezier(.22,.61,.36,1);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
      }
      [data-mode="dark"] #version-update-badge {
        box-shadow: 0 12px 36px rgba(0,0,0,0.55);
      }
      #version-update-badge.show {
        opacity: 1; transform: translateY(0);
      }
      #version-update-badge .vb-icon {
        flex-shrink: 0;
        width: 36px; height: 36px;
        border: 1px solid var(--accent);
        background: var(--accent);
        color: var(--bg);
        display: flex; align-items: center; justify-content: center;
        border-radius: 50%;
        position: relative;
      }
      #version-update-badge .vb-icon::before {
        content: ''; position: absolute; inset: -4px;
        border: 1px solid var(--accent);
        opacity: 0;
        border-radius: 50%;
        animation: vb-pulse 2.4s ease-in-out infinite;
      }
      @keyframes vb-pulse {
        0%   { opacity: 0.5; transform: scale(1); }
        70%  { opacity: 0;   transform: scale(1.5); }
        100% { opacity: 0;   transform: scale(1.5); }
      }
      #version-update-badge .vb-icon svg { width: 18px; height: 18px; stroke-width: 1.8; }
      #version-update-badge .vb-text {
        flex: 1; min-width: 0; line-height: 1.35;
      }
      #version-update-badge .vb-title {
        font-family: var(--font-display);
        font-variation-settings: 'opsz' 14;
        font-size: 14px; font-weight: 500;
        color: var(--ink);
        letter-spacing: var(--display-tracking);
      }
      #version-update-badge .vb-sub {
        font-family: var(--font-mono); font-size: 10px;
        letter-spacing: 0.06em; color: var(--mute);
        margin-top: 2px;
      }
      #version-update-badge .vb-actions {
        display: flex; flex-direction: column; gap: 4px; flex-shrink: 0;
      }
      #version-update-badge .vb-refresh {
        font-family: var(--font-mono); font-size: 10px;
        letter-spacing: 0.14em; text-transform: uppercase;
        background: var(--ink); color: var(--bg);
        border: 1px solid var(--ink);
        padding: 7px 12px; cursor: pointer;
        border-radius: var(--button-radius, 0);
        white-space: nowrap;
        transition: background 140ms, color 140ms;
      }
      #version-update-badge .vb-refresh:hover {
        background: var(--accent); border-color: var(--accent);
      }
      #version-update-badge .vb-dismiss {
        font-family: var(--font-mono); font-size: 9px;
        letter-spacing: 0.1em; text-transform: uppercase;
        background: transparent; color: var(--mute);
        border: none; padding: 0; cursor: pointer;
        text-align: center;
      }
      #version-update-badge .vb-dismiss:hover { color: var(--ink); }
      @media (max-width: 480px) {
        #version-update-badge { left: 12px; right: 12px; max-width: none; }
      }
    `;
    document.head.appendChild(style);
  }

  function showBadge() {
    if (badgeShown) return;
    badgeShown = true;
    injectStyles();
    const badge = document.createElement('div');
    badge.id = 'version-update-badge';
    badge.setAttribute('role', 'status');
    badge.setAttribute('aria-live', 'polite');
    badge.innerHTML = `
      <div class="vb-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M3 12a9 9 0 1 0 3-6.7"/>
          <path d="M3 4v5h5"/>
        </svg>
      </div>
      <div class="vb-text">
        <div class="vb-title">${escapeHtml(s('title'))}</div>
        <div class="vb-sub">${escapeHtml(s('sub'))}</div>
      </div>
      <div class="vb-actions">
        <button class="vb-refresh" type="button">${escapeHtml(s('btn'))}</button>
        <button class="vb-dismiss" type="button">${escapeHtml(s('dismiss'))}</button>
      </div>
    `;
    document.body.appendChild(badge);
    requestAnimationFrame(() => badge.classList.add('show'));

    badge.querySelector('.vb-refresh').addEventListener('click', () => {
      // Hard refresh: bust query-string cache so HTML/JS/CSS reload from
      // origin instead of the browser disk cache. Session state in
      // sessionStorage survives this (it's keyed by the same origin).
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('_v', Date.now().toString(36));
        window.location.replace(url.toString());
      } catch (_) {
        try { window.location.reload(); } catch (__) { window.location.href = window.location.href; }
      }
    });
    badge.querySelector('.vb-dismiss').addEventListener('click', () => {
      badge.classList.remove('show');
      setTimeout(() => badge.remove(), 320);
      badgeShown = false;
      // Stop polling for the rest of the session
      if (pollHandle) { clearInterval(pollHandle); pollHandle = null; }
    });
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  async function checkOnce() {
    if (document.visibilityState !== 'visible') return;
    if (badgeShown) return;
    const latest = await fetchLatestSha();
    if (!latest) return;
    if (!baselineSha) {
      baselineSha = latest;
      return;
    }
    if (latest !== baselineSha) {
      showBadge();
      if (pollHandle) { clearInterval(pollHandle); pollHandle = null; }
    }
  }

  function start() {
    // Defer the first check so we don't compete with the viewer's initial load
    setTimeout(async () => {
      await checkOnce();
      pollHandle = setInterval(checkOnce, POLL_INTERVAL_MS);
    }, INITIAL_DELAY_MS);

    // Also check when the tab becomes visible again — common after long idle
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && !badgeShown) checkOnce();
    });
  }

  // Only run on the live deployed site; skip on file:// or local dev to
  // avoid burning rate limit while developing.
  const host = window.location.hostname;
  if (host === 'zalkowitsch.github.io' || host.endsWith('.github.io')) {
    start();
  }
})();
