import { describe, expect, test, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { useKeyboard, type KeyboardHandlers } from './useKeyboard';

function press(key: string, init: KeyboardEventInit = {}): void {
  fireEvent.keyDown(document, { key, ...init });
}

describe('useKeyboard', () => {
  test('Cmd+K fires onCmdK', () => {
    const onCmdK = vi.fn();
    renderHook(() => useKeyboard({ onCmdK }));

    press('k', { metaKey: true });
    expect(onCmdK).toHaveBeenCalledTimes(1);

    // Ctrl+K should also fire — Mod = Cmd OR Ctrl.
    press('k', { ctrlKey: true });
    expect(onCmdK).toHaveBeenCalledTimes(2);

    // K without a modifier is ignored.
    press('k');
    expect(onCmdK).toHaveBeenCalledTimes(2);
  });

  test('Cmd+0 / Cmd+- / Cmd+= dispatch zoom handlers', () => {
    const onCmd0 = vi.fn();
    const onCmdMinus = vi.fn();
    const onCmdPlus = vi.fn();
    renderHook(() => useKeyboard({ onCmd0, onCmdMinus, onCmdPlus }));

    press('0', { metaKey: true });
    press('-', { metaKey: true });
    press('=', { metaKey: true });
    press('+', { metaKey: true });
    press('_', { metaKey: true });

    expect(onCmd0).toHaveBeenCalledTimes(1);
    // Both '-' and '_' route to onCmdMinus.
    expect(onCmdMinus).toHaveBeenCalledTimes(2);
    // Both '=' and '+' route to onCmdPlus.
    expect(onCmdPlus).toHaveBeenCalledTimes(2);
  });

  test('Cmd+Z and Cmd+Shift+Z route to undo/redo', () => {
    const onCmdZ = vi.fn();
    const onCmdShiftZ = vi.fn();
    renderHook(() => useKeyboard({ onCmdZ, onCmdShiftZ }));

    press('z', { metaKey: true });
    expect(onCmdZ).toHaveBeenCalledTimes(1);
    expect(onCmdShiftZ).not.toHaveBeenCalled();

    press('z', { metaKey: true, shiftKey: true });
    expect(onCmdShiftZ).toHaveBeenCalledTimes(1);
    expect(onCmdZ).toHaveBeenCalledTimes(1);
  });

  test('Escape fires onEscape', () => {
    const onEscape = vi.fn();
    renderHook(() => useKeyboard({ onEscape }));
    press('Escape');
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  test('Arrow keys fire only without a modifier', () => {
    const onArrowLeft = vi.fn();
    const onArrowRight = vi.fn();
    renderHook(() => useKeyboard({ onArrowLeft, onArrowRight }));

    press('ArrowLeft');
    press('ArrowRight');
    expect(onArrowLeft).toHaveBeenCalledTimes(1);
    expect(onArrowRight).toHaveBeenCalledTimes(1);

    // Modified arrows should NOT fire — Cmd+Arrow is a browser/system shortcut.
    press('ArrowLeft', { metaKey: true });
    expect(onArrowLeft).toHaveBeenCalledTimes(1);
  });

  test('cleanup removes the listener on unmount', () => {
    const onEscape = vi.fn();
    const { unmount } = renderHook(() => useKeyboard({ onEscape }));

    press('Escape');
    expect(onEscape).toHaveBeenCalledTimes(1);

    unmount();
    press('Escape');
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  test('rerender keeps a single listener and uses the latest handlers', () => {
    const firstCmdK = vi.fn();
    const secondCmdK = vi.fn();
    const { rerender } = renderHook(
      (handlers: KeyboardHandlers) => useKeyboard(handlers),
      { initialProps: { onCmdK: firstCmdK } },
    );

    press('k', { metaKey: true });
    expect(firstCmdK).toHaveBeenCalledTimes(1);

    rerender({ onCmdK: secondCmdK });
    press('k', { metaKey: true });

    expect(firstCmdK).toHaveBeenCalledTimes(1);
    expect(secondCmdK).toHaveBeenCalledTimes(1);
  });
});
