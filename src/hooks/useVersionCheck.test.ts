// Tests for src/hooks/useVersionCheck.ts
//
// Strategy: mock `@/lib/version-check` so we control `fetchLatestSha` and
// `hardRefresh` directly, then use fake timers to advance through
// INITIAL_DELAY_MS / POLL_INTERVAL_MS. window.location.hostname is patched
// per-test to flip between the github-pages activation gate and the
// non-activated localhost case.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { useVersionCheck } from './useVersionCheck';
import * as versionCheckLib from '@/lib/version-check';

vi.mock('@/lib/version-check', async () => {
  const actual = await vi.importActual<typeof import('@/lib/version-check')>(
    '@/lib/version-check',
  );
  return {
    ...actual,
    fetchLatestSha: vi.fn(async () => null),
    hardRefresh: vi.fn(async () => undefined),
  };
});

const fetchLatestSha = vi.mocked(versionCheckLib.fetchLatestSha);
const hardRefresh = vi.mocked(versionCheckLib.hardRefresh);

const { INITIAL_DELAY_MS, POLL_INTERVAL_MS } = versionCheckLib;

function setHostname(hostname: string): void {
  Object.defineProperty(window, 'location', {
    value: { ...window.location, hostname },
    writable: true,
    configurable: true,
  });
}

function setVisibility(state: 'visible' | 'hidden'): void {
  Object.defineProperty(document, 'visibilityState', {
    value: state,
    writable: true,
    configurable: true,
  });
}

/** Advance fake timers + flush any awaited microtasks. */
async function tick(ms: number): Promise<void> {
  await act(async () => {
    vi.advanceTimersByTime(ms);
    // Drain microtasks so `then`-chained code after fetch resolves.
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('useVersionCheck', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fetchLatestSha.mockReset();
    fetchLatestSha.mockResolvedValue(null);
    hardRefresh.mockReset();
    hardRefresh.mockResolvedValue(undefined);
    setHostname('zalkowitsch.github.io');
    setVisibility('visible');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does nothing on non-github.io hosts', async () => {
    setHostname('localhost');

    const { result } = renderHook(() => useVersionCheck());
    expect(result.current.updateAvailable).toBe(false);

    // Let the entire poll window elapse.
    await tick(INITIAL_DELAY_MS + POLL_INTERVAL_MS * 2);

    expect(fetchLatestSha).not.toHaveBeenCalled();
    expect(result.current.updateAvailable).toBe(false);
  });

  it('activates on a *.github.io subdomain', async () => {
    setHostname('someone.github.io');
    fetchLatestSha.mockResolvedValue('sha-baseline');

    renderHook(() => useVersionCheck());

    await tick(INITIAL_DELAY_MS + 10);

    expect(fetchLatestSha).toHaveBeenCalled();
  });

  it('records baseline on first check, then flips updateAvailable when SHA changes', async () => {
    fetchLatestSha
      .mockResolvedValueOnce('sha-1')
      .mockResolvedValueOnce('sha-1') // unchanged poll
      .mockResolvedValueOnce('sha-2'); // changed -> trigger

    const { result } = renderHook(() => useVersionCheck());

    // Initial delay: first checkOnce records baseline.
    await tick(INITIAL_DELAY_MS + 10);
    expect(fetchLatestSha).toHaveBeenCalledTimes(1);
    expect(result.current.updateAvailable).toBe(false);

    // First poll: still sha-1.
    await tick(POLL_INTERVAL_MS);
    expect(fetchLatestSha).toHaveBeenCalledTimes(2);
    expect(result.current.updateAvailable).toBe(false);

    // Second poll: sha-2 -> updateAvailable=true.
    await tick(POLL_INTERVAL_MS);
    expect(result.current.updateAvailable).toBe(true);
  });

  it('null SHA from fetch is treated as "no signal" and does not set baseline', async () => {
    fetchLatestSha
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('sha-real');

    const { result } = renderHook(() => useVersionCheck());

    await tick(INITIAL_DELAY_MS + 10);
    // Baseline still unset (first response was null) — next call sets it.
    expect(result.current.updateAvailable).toBe(false);

    await tick(POLL_INTERVAL_MS);
    // Now sha-real is the baseline; still no update.
    expect(result.current.updateAvailable).toBe(false);
  });

  it('skips checks while the document is hidden', async () => {
    setVisibility('hidden');
    fetchLatestSha.mockResolvedValue('sha-1');

    renderHook(() => useVersionCheck());
    await tick(INITIAL_DELAY_MS + 10);

    expect(fetchLatestSha).not.toHaveBeenCalled();
  });

  it('visibilitychange fires a check when tab becomes visible again', async () => {
    fetchLatestSha.mockResolvedValue('sha-1');
    setVisibility('hidden');

    renderHook(() => useVersionCheck());
    await tick(INITIAL_DELAY_MS + 10);
    expect(fetchLatestSha).not.toHaveBeenCalled();

    setVisibility('visible');
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchLatestSha).toHaveBeenCalled();
  });

  it('dismiss() stops polling and resets updateAvailable', async () => {
    fetchLatestSha
      .mockResolvedValueOnce('sha-1')
      .mockResolvedValueOnce('sha-2');

    const { result } = renderHook(() => useVersionCheck());
    await tick(INITIAL_DELAY_MS + 10);
    await tick(POLL_INTERVAL_MS);
    expect(result.current.updateAvailable).toBe(true);

    act(() => {
      result.current.dismiss();
    });
    expect(result.current.updateAvailable).toBe(false);

    // Advance well past where the next poll would have fired.
    const beforeCalls = fetchLatestSha.mock.calls.length;
    await tick(POLL_INTERVAL_MS * 3);
    // No further calls — polling is stopped, and the dismiss flag short-circuits
    // any in-flight callback.
    expect(fetchLatestSha.mock.calls.length).toBe(beforeCalls);
  });

  it('refresh() delegates to hardRefresh()', () => {
    const { result } = renderHook(() => useVersionCheck());

    act(() => {
      result.current.refresh();
    });

    expect(hardRefresh).toHaveBeenCalledTimes(1);
  });

  it('stops polling after updateAvailable becomes true', async () => {
    fetchLatestSha
      .mockResolvedValueOnce('sha-1')
      .mockResolvedValueOnce('sha-2');

    const { result } = renderHook(() => useVersionCheck());
    await tick(INITIAL_DELAY_MS + 10);
    await tick(POLL_INTERVAL_MS);
    expect(result.current.updateAvailable).toBe(true);

    const calls = fetchLatestSha.mock.calls.length;
    await tick(POLL_INTERVAL_MS * 3);
    expect(fetchLatestSha.mock.calls.length).toBe(calls);
  });

  it('cleans up timer and listener on unmount', async () => {
    fetchLatestSha.mockResolvedValue('sha-1');

    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const { unmount } = renderHook(() => useVersionCheck());

    // Unmount BEFORE the initial timer fires — exercises the
    // `if (initialTimer !== null) clearTimeout` branch.
    unmount();

    await tick(INITIAL_DELAY_MS + POLL_INTERVAL_MS);

    // No fetch was issued (effect cleanup cancelled before timer fired).
    expect(fetchLatestSha).not.toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalledWith(
      'visibilitychange',
      expect.any(Function),
    );
    removeSpy.mockRestore();
  });
});
