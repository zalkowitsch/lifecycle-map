import { useCallback, useRef, useState } from 'react';

interface Snapshot { index: number; text: string; }

/**
 * Panel-scoped undo/redo over source-text commits. Call `record(index, prevText)`
 * immediately before committing new text for that source. `undo` re-commits the
 * recorded previous text (and stashes the current text for redo).
 */
export function useSourceHistory(
  commit: (index: number, text: string) => void,
  getText: (index: number) => string | undefined,
  maxSize = 50,
) {
  const undoStack = useRef<Snapshot[]>([]);
  const redoStack = useRef<Snapshot[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const sync = useCallback(() => {
    setCanUndo(undoStack.current.length > 0);
    setCanRedo(redoStack.current.length > 0);
  }, []);

  const record = useCallback((index: number, prevText: string) => {
    const s = undoStack.current;
    s.push({ index, text: prevText });
    if (s.length > maxSize) s.splice(0, s.length - maxSize);
    redoStack.current = [];
    sync();
  }, [maxSize, sync]);

  const undo = useCallback(() => {
    const snap = undoStack.current.pop();
    if (!snap) return;
    const current = getText(snap.index);
    if (current !== undefined) redoStack.current.push({ index: snap.index, text: current });
    commit(snap.index, snap.text);
    sync();
  }, [commit, getText, sync]);

  const redo = useCallback(() => {
    const snap = redoStack.current.pop();
    if (!snap) return;
    const current = getText(snap.index);
    if (current !== undefined) undoStack.current.push({ index: snap.index, text: current });
    commit(snap.index, snap.text);
    sync();
  }, [commit, getText, sync]);

  const reset = useCallback(() => {
    undoStack.current = [];
    redoStack.current = [];
    sync();
  }, [sync]);

  return { record, undo, redo, canUndo, canRedo, reset };
}
