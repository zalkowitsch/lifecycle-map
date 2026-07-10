import { describe, expect, it } from 'vitest';
import { cellForColumn, modeOptions, isValidRef } from '@/components/DatabasePanel/EntityGrid';
import type { GridColumn } from '@/lib/database/types';

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
});
