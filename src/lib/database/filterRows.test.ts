import { describe, expect, it } from 'vitest';
import { filterRows } from './filterRows';
import type { GridRows } from './types';

const grid: GridRows = {
  columns: [
    { id: 'id', title: 'id', kind: 'text', readOnly: true },
    { id: 'name', title: 'name', kind: 'text' },
    { id: 'today', title: 'today', kind: 'mode' },
  ],
  rows: [
    { id: 'air-billing:rules:dry-run', name: 'Dry-run rules before saving', today: 'Air Ops' },
    { id: 'air-clinical:online-sched', name: 'Online scheduling', today: 'Self-Serve & Delightful' },
    { id: 'air-foh:text-blasts', name: 'Bulk SMS blasts', today: 'Customer Ops w/ Support' },
  ],
};

describe('filterRows', () => {
  it('returns all rows unchanged for an empty or whitespace query', () => {
    expect(filterRows(grid, '').rows).toHaveLength(3);
    expect(filterRows(grid, '   ').rows).toHaveLength(3);
    // same columns, identity of rows preserved
    expect(filterRows(grid, '').rows[0]).toBe(grid.rows[0]);
    expect(filterRows(grid, '').columns).toBe(grid.columns);
  });

  it('matches case-insensitively across any column value', () => {
    expect(filterRows(grid, 'dry').rows.map((r) => r.id)).toEqual(['air-billing:rules:dry-run']);
    expect(filterRows(grid, 'ONLINE').rows.map((r) => r.id)).toEqual(['air-clinical:online-sched']);
    // matches a value in the `today` column, not just id/name
    expect(filterRows(grid, 'air ops').rows.map((r) => r.id)).toEqual(['air-billing:rules:dry-run']);
  });

  it('matches on the id column too', () => {
    expect(filterRows(grid, 'foh').rows.map((r) => r.id)).toEqual(['air-foh:text-blasts']);
  });

  it('returns an empty row set when nothing matches (columns preserved)', () => {
    const out = filterRows(grid, 'zzzz-nomatch');
    expect(out.rows).toHaveLength(0);
    expect(out.columns).toBe(grid.columns);
  });

  it('trims the query and ignores surrounding whitespace', () => {
    expect(filterRows(grid, '  online  ').rows.map((r) => r.id)).toEqual(['air-clinical:online-sched']);
  });

  it('treats null/undefined cell values as empty (no crash)', () => {
    const g: GridRows = {
      columns: grid.columns,
      rows: [{ id: 'x', name: null, today: undefined }],
    };
    expect(filterRows(g, 'x').rows).toHaveLength(1);
    expect(filterRows(g, 'anything').rows).toHaveLength(0);
  });
});
