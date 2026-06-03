import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useSessionState } from './useSessionState';

const SS_KEY = 'lifecycle-map.session';

describe('useSessionState', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('load returns null when sessionStorage is empty', () => {
    const { result } = renderHook(() => useSessionState());
    expect(result.current.state).toBeNull();
    expect(result.current.load()).toBeNull();
  });

  test('save persists patch with ts, load returns the stored state', () => {
    const { result } = renderHook(() => useSessionState());

    act(() => {
      result.current.save({ source: 'dnd', rawJson: 'x' });
    });

    const loaded = result.current.load();
    expect(loaded).not.toBeNull();
    expect(loaded?.source).toBe('dnd');
    expect(loaded?.rawJson).toBe('x');

    // Raw storage row carries the timestamp.
    const raw = sessionStorage.getItem(SS_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string) as { ts: number };
    expect(typeof parsed.ts).toBe('number');
  });

  test('clear removes the stored entry and resets the in-memory snapshot', () => {
    const { result } = renderHook(() => useSessionState());

    act(() => {
      result.current.save({ source: 'paste', rawJson: 'y' });
    });
    expect(sessionStorage.getItem(SS_KEY)).not.toBeNull();

    act(() => {
      result.current.clear();
    });

    expect(sessionStorage.getItem(SS_KEY)).toBeNull();
    expect(result.current.load()).toBeNull();
  });

  test('drops entries older than the 24h TTL', () => {
    const { result } = renderHook(() => useSessionState());

    // Persist a save at t=0.
    const baseNow = 1_000_000_000;
    vi.useFakeTimers();
    vi.setSystemTime(baseNow);

    act(() => {
      result.current.save({ source: 'dnd', rawJson: 'old' });
    });

    // Jump forward 25h — beyond the TTL.
    vi.setSystemTime(baseNow + 25 * 60 * 60 * 1000);

    const loaded = result.current.load();
    expect(loaded).toBeNull();
    // The reader should also have evicted the stale entry.
    expect(sessionStorage.getItem(SS_KEY)).toBeNull();
  });

  test('successive saves merge into one persisted record', () => {
    const { result } = renderHook(() => useSessionState());

    act(() => {
      result.current.save({ source: 'dnd', rawJson: 'first' });
    });
    act(() => {
      result.current.save({ activeNodeId: 'node-1', scrollLeft: 42 });
    });

    const loaded = result.current.load();
    expect(loaded).not.toBeNull();
    expect(loaded?.source).toBe('dnd');
    expect(loaded?.rawJson).toBe('first');
    expect(loaded?.activeNodeId).toBe('node-1');
    expect(loaded?.scrollLeft).toBe(42);
  });

  test('initial save without a source is a no-op', () => {
    const { result } = renderHook(() => useSessionState());

    act(() => {
      // No `source` in the patch and no prior record — must bail out.
      result.current.save({ rawJson: 'orphan' });
    });

    expect(sessionStorage.getItem(SS_KEY)).toBeNull();
    expect(result.current.load()).toBeNull();
  });

  test('load returns null when the stored payload is not valid JSON', () => {
    sessionStorage.setItem(SS_KEY, '{not json');
    const { result } = renderHook(() => useSessionState());
    expect(result.current.load()).toBeNull();
  });
});
