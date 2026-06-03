// useUndo — minimal undo/redo container for a single value.
//
// Two stacks of previous/next snapshots. `set` replaces the current value
// without pushing history; `push` pushes the current value to the undo stack
// before swapping in the new one and clearing the redo stack — that's the
// standard "branch on new edit" semantics.
//
// Stack size is capped so a long editing session can't unbound memory.

import { useCallback, useRef, useState } from 'react';

interface UseUndoResult<T> {
  value: T;
  set: (v: T) => void;
  /** Push current value to undo stack, swap in `v`, clear redo stack. */
  push: (v: T) => void;
  undo: () => boolean;
  redo: () => boolean;
  canUndo: boolean;
  canRedo: boolean;
  /** Replace value AND clear both stacks (e.g. on "load new document"). */
  reset: (v: T) => void;
}

export function useUndo<T>(initial: T, maxSize = 50): UseUndoResult<T> {
  const [value, setValue] = useState<T>(initial);
  // History lives in refs — pushing to a stack should not, by itself, force
  // a re-render. The `canUndo`/`canRedo` state mirrors stack length so
  // consumers re-render when those flip.
  const undoStackRef = useRef<T[]>([]);
  const redoStackRef = useRef<T[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const syncFlags = useCallback(() => {
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(redoStackRef.current.length > 0);
  }, []);

  const set = useCallback((next: T) => {
    setValue(next);
  }, []);

  const push = useCallback(
    (next: T) => {
      // Read latest committed value via state setter callback to avoid stale
      // closures — push is often wired to keyboard handlers that may capture
      // an earlier `value`.
      setValue((current) => {
        const stack = undoStackRef.current;
        stack.push(current);
        if (stack.length > maxSize) {
          // Drop oldest entries to stay within budget.
          stack.splice(0, stack.length - maxSize);
        }
        redoStackRef.current = [];
        return next;
      });
      syncFlags();
    },
    [maxSize, syncFlags],
  );

  const undo = useCallback((): boolean => {
    const undoStack = undoStackRef.current;
    if (undoStack.length === 0) return false;
    const prev = undoStack.pop();
    if (prev === undefined) return false;
    setValue((current) => {
      redoStackRef.current.push(current);
      return prev;
    });
    syncFlags();
    return true;
  }, [syncFlags]);

  const redo = useCallback((): boolean => {
    const redoStack = redoStackRef.current;
    if (redoStack.length === 0) return false;
    const next = redoStack.pop();
    if (next === undefined) return false;
    setValue((current) => {
      undoStackRef.current.push(current);
      return next;
    });
    syncFlags();
    return true;
  }, [syncFlags]);

  const reset = useCallback(
    (next: T) => {
      undoStackRef.current = [];
      redoStackRef.current = [];
      setValue(next);
      syncFlags();
    },
    [syncFlags],
  );

  return { value, set, push, undo, redo, canUndo, canRedo, reset };
}
