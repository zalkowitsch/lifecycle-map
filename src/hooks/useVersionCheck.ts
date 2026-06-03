// useVersionCheck — React port of the polling/visibility logic from
// version-check.js. The IIFE's module-scoped state (baselineSha, pollHandle,
// badgeShown) becomes a single hook instance's refs + state.
//
// Activation gate: only runs on *.github.io hosts, matching the original's
// "skip on file:// or local dev to avoid burning rate limit" check.

import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchLatestSha, hardRefresh, INITIAL_DELAY_MS, POLL_INTERVAL_MS } from '@/lib/version-check';

interface UseVersionCheckResult {
  updateAvailable: boolean;
  dismiss: () => void;
  refresh: () => void;
}

function isGithubPagesHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'zalkowitsch.github.io' || host.endsWith('.github.io');
}

export function useVersionCheck(): UseVersionCheckResult {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  // Refs avoid restarting the effect every time these change. The effect
  // runs exactly once and lives until unmount (or dismissal).
  const baselineShaRef = useRef<string | null>(null);
  const pollHandleRef = useRef<number | null>(null);
  const dismissedRef = useRef(false);
  const updateAvailableRef = useRef(false);

  // Keep the ref in sync so checkOnce can early-return without re-creating.
  useEffect(() => {
    updateAvailableRef.current = updateAvailable;
  }, [updateAvailable]);

  const clearPoll = useCallback(() => {
    if (pollHandleRef.current !== null) {
      window.clearInterval(pollHandleRef.current);
      pollHandleRef.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    dismissedRef.current = true;
    setUpdateAvailable(false);
    clearPoll();
  }, [clearPoll]);

  const refresh = useCallback(() => {
    void hardRefresh();
  }, []);

  useEffect(() => {
    if (!isGithubPagesHost()) return;

    let cancelled = false;
    let initialTimer: number | null = null;

    const checkOnce = async (): Promise<void> => {
      if (cancelled) return;
      if (document.visibilityState !== 'visible') return;
      if (dismissedRef.current) return;
      if (updateAvailableRef.current) return;

      const latest = await fetchLatestSha();
      if (cancelled || !latest) return;

      if (baselineShaRef.current === null) {
        baselineShaRef.current = latest;
        return;
      }

      if (latest !== baselineShaRef.current) {
        setUpdateAvailable(true);
        clearPoll();
      }
    };

    const onVisibilityChange = (): void => {
      if (
        document.visibilityState === 'visible'
        && !dismissedRef.current
        && !updateAvailableRef.current
      ) {
        void checkOnce();
      }
    };

    initialTimer = window.setTimeout(() => {
      initialTimer = null;
      void checkOnce().then(() => {
        if (cancelled || dismissedRef.current || updateAvailableRef.current) return;
        pollHandleRef.current = window.setInterval(() => {
          void checkOnce();
        }, POLL_INTERVAL_MS);
      });
    }, INITIAL_DELAY_MS);

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      if (initialTimer !== null) window.clearTimeout(initialTimer);
      clearPoll();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [clearPoll]);

  return { updateAvailable, dismiss, refresh };
}
