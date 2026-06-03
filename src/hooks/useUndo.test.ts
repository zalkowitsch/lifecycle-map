import { describe, expect, test } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useUndo } from './useUndo';

describe('useUndo', () => {
  test('exposes the initial value with empty stacks', () => {
    const { result } = renderHook(() => useUndo('initial'));
    expect(result.current.value).toBe('initial');
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  test('set updates value without pushing to the undo stack', () => {
    const { result } = renderHook(() => useUndo('a'));

    act(() => {
      result.current.set('b');
    });

    expect(result.current.value).toBe('b');
    expect(result.current.canUndo).toBe(false);

    // Undo with an empty stack must report false and keep value untouched.
    let undid = true;
    act(() => {
      undid = result.current.undo();
    });
    expect(undid).toBe(false);
    expect(result.current.value).toBe('b');
  });

  test('push pushes current value to undo and clears redo', () => {
    const { result } = renderHook(() => useUndo('a'));

    act(() => {
      result.current.push('b');
    });
    expect(result.current.value).toBe('b');
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);

    act(() => {
      result.current.push('c');
    });
    expect(result.current.value).toBe('c');
    expect(result.current.canUndo).toBe(true);
  });

  test('undo returns true and reverts, false when stack is empty', () => {
    const { result } = renderHook(() => useUndo('a'));

    act(() => {
      result.current.push('b');
    });

    let undid = false;
    act(() => {
      undid = result.current.undo();
    });
    expect(undid).toBe(true);
    expect(result.current.value).toBe('a');
    expect(result.current.canUndo).toBe(false);

    let undidAgain = true;
    act(() => {
      undidAgain = result.current.undo();
    });
    expect(undidAgain).toBe(false);
    expect(result.current.value).toBe('a');
  });

  test('redo replays the last undone change, false when stack is empty', () => {
    const { result } = renderHook(() => useUndo('a'));

    act(() => {
      result.current.push('b');
    });
    act(() => {
      result.current.undo();
    });

    let redid = false;
    act(() => {
      redid = result.current.redo();
    });
    expect(redid).toBe(true);
    expect(result.current.value).toBe('b');
    expect(result.current.canRedo).toBe(false);

    let redidAgain = true;
    act(() => {
      redidAgain = result.current.redo();
    });
    expect(redidAgain).toBe(false);
  });

  test('push after undo clears the redo stack (branching)', () => {
    const { result } = renderHook(() => useUndo('a'));

    act(() => {
      result.current.push('b');
    });
    act(() => {
      result.current.undo();
    });

    act(() => {
      result.current.push('c');
    });
    expect(result.current.value).toBe('c');

    // Redo stack should be empty — calling redo reports false.
    let redid = true;
    act(() => {
      redid = result.current.redo();
    });
    expect(redid).toBe(false);
    expect(result.current.value).toBe('c');
  });

  test('reset clears both stacks and swaps value', () => {
    const { result } = renderHook(() => useUndo('a'));

    act(() => {
      result.current.push('b');
    });
    act(() => {
      result.current.push('c');
    });
    act(() => {
      result.current.undo();
    });
    expect(result.current.canUndo).toBe(true);

    act(() => {
      result.current.reset('fresh');
    });
    expect(result.current.value).toBe('fresh');
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);

    // After reset, undo / redo report nothing to do.
    let undid = true;
    act(() => {
      undid = result.current.undo();
    });
    expect(undid).toBe(false);
    let redid = true;
    act(() => {
      redid = result.current.redo();
    });
    expect(redid).toBe(false);
  });

  test('respects maxSize cap by dropping oldest entries', () => {
    const { result } = renderHook(() => useUndo<number>(0, 2));

    act(() => {
      result.current.push(1);
    });
    act(() => {
      result.current.push(2);
    });
    act(() => {
      result.current.push(3);
    });

    // Stack capped at 2 — value 0 should have been dropped.
    expect(result.current.value).toBe(3);

    act(() => {
      result.current.undo();
    });
    expect(result.current.value).toBe(2);
    act(() => {
      result.current.undo();
    });
    expect(result.current.value).toBe(1);

    let undidAgain = true;
    act(() => {
      undidAgain = result.current.undo();
    });
    // Stack max was 2 — the 0 snapshot is gone, so we can't go any further.
    expect(undidAgain).toBe(false);
    expect(result.current.value).toBe(1);
  });
});
