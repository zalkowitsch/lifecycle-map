// Version-check core logic, ported from version-check.js (the IIFE).
//
// Pure functions only — no React, no DOM event listeners, no global state.
// The React layer lives in src/hooks/useVersionCheck.ts and
// src/components/VersionBadge.tsx.

export const REPO = 'zalkowitsch/lifecycle-map';
export const BRANCH = 'main';
export const POLL_INTERVAL_MS = 60_000;
export const INITIAL_DELAY_MS = 20_000;

const API_URL = `https://api.github.com/repos/${REPO}/commits/${BRANCH}`;

interface CommitResponse {
  sha?: string;
}

/**
 * Fetch the latest commit SHA on `BRANCH` from the GitHub REST API.
 *
 * Returns `null` on any failure (offline, rate-limited, non-2xx, malformed
 * payload). Callers should treat `null` as "no signal" and not as an error.
 */
export async function fetchLatestSha(): Promise<string | null> {
  try {
    const resp = await fetch(API_URL, {
      method: 'GET',
      cache: 'no-store',
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!resp.ok) return null;
    const json = (await resp.json()) as CommitResponse;
    return json && typeof json.sha === 'string' ? json.sha : null;
  } catch (_) {
    return null;
  }
}

/**
 * Re-fetch every same-origin script + stylesheet with `cache: 'reload'` to
 * invalidate the disk cache, then navigate to the same URL with a fresh
 * `?_v=` cache-buster so the HTML document itself isn't served from cache.
 *
 * Ported from the `vb-refresh` click handler in version-check.js. Falls
 * through to a plain reload if anything blows up — the goal is to always
 * end the function on the new build, never get stuck on the old one.
 */
export async function hardRefresh(): Promise<void> {
  try {
    const sameOriginAssets = Array.from(
      document.querySelectorAll<HTMLScriptElement | HTMLLinkElement>(
        'script[src], link[rel="stylesheet"][href]',
      ),
    )
      .map((el) =>
        el.tagName === 'SCRIPT'
          ? (el as HTMLScriptElement).src
          : (el as HTMLLinkElement).href,
      )
      .filter((u): u is string => {
        if (!u) return false;
        try {
          return new URL(u, window.location.href).origin === window.location.origin;
        } catch (_) {
          return false;
        }
      });

    await Promise.all(
      sameOriginAssets.map((u) =>
        fetch(u, { cache: 'reload', credentials: 'same-origin' }).catch(() => null),
      ),
    );
  } catch (_) {
    // fall through to reload regardless
  }

  try {
    const url = new URL(window.location.href);
    url.searchParams.set('_v', Date.now().toString(36));
    window.location.replace(url.toString());
  } catch (_) {
    try {
      window.location.reload();
    } catch (__) {
      window.location.href = window.location.href;
    }
  }
}
