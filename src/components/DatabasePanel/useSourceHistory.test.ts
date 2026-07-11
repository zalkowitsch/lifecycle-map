import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSourceHistory } from '@/components/DatabasePanel/useSourceHistory';

function setup() {
  const texts: Record<number, string> = { 0: 'v0' };
  const commit = vi.fn((i: number, t: string) => { texts[i] = t; });
  const getText = (i: number) => texts[i];
  const hook = renderHook(() => useSourceHistory(commit, getText));
  return { hook, commit, texts };
}

describe('useSourceHistory', () => {
  it('undo re-commits the recorded previous text', () => {
    const { hook, commit, texts } = setup();
    // Simulate: record prev "v0", then the app commits "v1".
    act(() => { hook.result.current.record(0, 'v0'); });
    texts[0] = 'v1'; commit.mockClear();
    expect(hook.result.current.canUndo).toBe(true);
    act(() => { hook.result.current.undo(); });
    expect(commit).toHaveBeenCalledWith(0, 'v0');
    expect(hook.result.current.canRedo).toBe(true);
  });
  it('redo re-applies the undone text', () => {
    const { hook, commit, texts } = setup();
    act(() => { hook.result.current.record(0, 'v0'); });
    texts[0] = 'v1';
    act(() => { hook.result.current.undo(); });   // commits v0; redo stack has v1
    texts[0] = 'v0'; commit.mockClear();
    act(() => { hook.result.current.redo(); });
    expect(commit).toHaveBeenCalledWith(0, 'v1');
  });
  it('reset clears both stacks', () => {
    const { hook } = setup();
    act(() => { hook.result.current.record(0, 'v0'); });
    act(() => { hook.result.current.reset(); });
    expect(hook.result.current.canUndo).toBe(false);
    expect(hook.result.current.canRedo).toBe(false);
  });
});
