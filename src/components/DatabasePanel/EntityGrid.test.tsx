import { describe, expect, it } from 'vitest';
import { GridCellKind } from '@glideapps/glide-data-grid';
import {
  cellForColumn,
  glideCellFor,
  modeOptions,
  isValidRef,
  selectedRowIndex,
  canDeleteSelected,
  pasteEditsFromClipboard,
} from '@/components/DatabasePanel/EntityGrid';
import type { GridColumn, GridRows } from '@/lib/database/types';

const modes = [
  { id: 'Auto', label: 'Auto', color: '#16a34a' },
  { id: 'Manual', label: 'Manual', color: '#b91c1c' },
];

describe('EntityGrid helpers', () => {
  it('modeOptions lists mode ids for a dropdown', () => {
    expect(modeOptions(modes)).toEqual(['Auto', 'Manual']);
  });

  it('cellForColumn marks a mode column as a dropdown cell', () => {
    const col: GridColumn = { id: 'today', title: 'today', kind: 'mode' };
    const cell = cellForColumn(col, 'Auto', modes, []);
    expect(cell.kind).toBe('dropdown');
    expect(cell.allowedValues).toEqual(['Auto', 'Manual']);
    expect(cell.value).toBe('Auto');
  });

  it('cellForColumn marks a ref column as a dropdown of feature ids', () => {
    const col: GridColumn = { id: 'ref', title: 'feature', kind: 'ref', refTable: 'features' };
    const cell = cellForColumn(col, 'f1', modes, ['f1', 'f2']);
    expect(cell.kind).toBe('dropdown');
    expect(cell.allowedValues).toEqual(['f1', 'f2']);
  });

  it('cellForColumn returns a plain text cell for text columns', () => {
    const col: GridColumn = { id: 'name', title: 'name', kind: 'text' };
    expect(cellForColumn(col, 'hi', modes, []).kind).toBe('text');
  });

  it('isValidRef flags whether a ref exists among feature ids', () => {
    expect(isValidRef('f1', ['f1', 'f2'])).toBe(true);
    expect(isValidRef('nope', ['f1', 'f2'])).toBe(false);
  });

  it('glideCellFor renders a mode column (via cellForColumn) as an editable Text cell', () => {
    const col: GridColumn = { id: 'today', title: 'today', kind: 'mode' };
    const desc = cellForColumn(col, 'Auto', modes, []);
    const glideCell = glideCellFor(desc);
    // The grid's render path uses a built-in Text cell (Glide 6.0.3 ships no
    // custom dropdown-cell renderer), so mode/ref columns must render/edit
    // as text, not as a GridCellKind.Custom cell.
    expect(glideCell.kind).toBe(GridCellKind.Text);
    expect(glideCell.data).toBe('Auto');
    expect(glideCell.displayData).toBe('Auto');
    expect(glideCell.allowOverlay).toBe(true);
    expect(glideCell.readonly).toBe(false);
  });

  it('glideCellFor renders a ref column (via cellForColumn) as an editable Text cell', () => {
    const col: GridColumn = { id: 'ref', title: 'feature', kind: 'ref', refTable: 'features' };
    const desc = cellForColumn(col, 'f1', modes, ['f1', 'f2']);
    const glideCell = glideCellFor(desc);
    expect(glideCell.kind).toBe(GridCellKind.Text);
    expect(glideCell.data).toBe('f1');
  });

  it('glideCellFor marks a readonly column as non-overlaying', () => {
    const col: GridColumn = { id: 'today', title: 'today', kind: 'mode', readOnly: true };
    const desc = cellForColumn(col, 'Auto', modes, []);
    const glideCell = glideCellFor(desc);
    expect(glideCell.allowOverlay).toBe(false);
    expect(glideCell.readonly).toBe(true);
  });
});

describe('selectedRowIndex', () => {
  const grid: GridRows = {
    columns: [{ id: 'id', title: 'id', kind: 'text' }],
    rows: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
  };

  it('finds the index of the row matching the selected id', () => {
    expect(selectedRowIndex(grid, 'b')).toBe(1);
  });

  it('returns -1 when no row matches', () => {
    expect(selectedRowIndex(grid, 'nope')).toBe(-1);
  });

  it('returns -1 when no id is selected', () => {
    expect(selectedRowIndex(grid, undefined)).toBe(-1);
    expect(selectedRowIndex(grid, null)).toBe(-1);
  });
});

describe('canDeleteSelected', () => {
  it('is false with no selection', () => {
    expect(canDeleteSelected(undefined)).toBe(false);
    expect(canDeleteSelected(null)).toBe(false);
    expect(canDeleteSelected('')).toBe(false);
  });

  it('is true with a selected row id', () => {
    expect(canDeleteSelected('row-1')).toBe(true);
  });
});

describe('EntityGrid paste helper', () => {
  const grid: GridRows = {
    columns: [
      { id: 'id', title: 'id', kind: 'text', readOnly: true },
      { id: 'label', title: 'label', kind: 'text' },
    ],
    rows: [{ id: 'a', label: 'A' }],
  };
  it('builds batch edits from a paste at a target', () => {
    const edits = pasteEditsFromClipboard(grid, [1, 0], [['X']]);
    expect(edits).toEqual([{ op: 'update', id: 'a', field: 'label', value: 'X' }]);
  });
});
