import { describe, expect, it } from 'vitest';
import { pasteEdits } from '@/lib/database/applyPaste';
import type { GridRows } from '@/lib/database/types';

const grid: GridRows = {
  columns: [
    { id: 'id', title: 'id', kind: 'text', readOnly: true },
    { id: 'label', title: 'label', kind: 'text' },
    { id: 'sub', title: 'sub', kind: 'text' },
  ],
  rows: [
    { id: 'a', label: 'A', sub: 'sa' },
    { id: 'b', label: 'B', sub: 'sb' },
  ],
};

describe('pasteEdits', () => {
  it('maps a 2D paste onto rows/cols starting at target', () => {
    const edits = pasteEdits(grid, [1, 0], [['X', 'Y'], ['Z', 'W']]);
    expect(edits).toEqual([
      { op: 'update', id: 'a', field: 'label', value: 'X' },
      { op: 'update', id: 'a', field: 'sub', value: 'Y' },
      { op: 'update', id: 'b', field: 'label', value: 'Z' },
      { op: 'update', id: 'b', field: 'sub', value: 'W' },
    ]);
  });
  it('skips read-only columns (id)', () => {
    const edits = pasteEdits(grid, [0, 0], [['NEWID', 'NEWLABEL']]);
    expect(edits).toEqual([{ op: 'update', id: 'a', field: 'label', value: 'NEWLABEL' }]);
  });
  it('skips out-of-range rows and columns', () => {
    const edits = pasteEdits(grid, [2, 1], [['only', 'overflow'], ['pastEnd', 'x']]);
    expect(edits).toEqual([{ op: 'update', id: 'b', field: 'sub', value: 'only' }]);
  });
});
