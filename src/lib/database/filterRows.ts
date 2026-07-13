import type { GridRows } from './types';

/**
 * Case-insensitive substring filter over a derived grid. A row matches when the
 * query (trimmed, lowercased) is a substring of ANY of its cell values across
 * all columns. An empty/whitespace query returns the grid unchanged (same
 * `columns` and `rows` identities, so React can skip re-renders).
 *
 * Row `id`s are preserved, so id-based edits/deletes in the panel still resolve
 * against the full underlying source — filtering only affects what's displayed.
 */
export function filterRows(grid: GridRows, query: string): GridRows {
  const q = query.trim().toLowerCase();
  if (q === '') return grid;
  const rows = grid.rows.filter((row) =>
    grid.columns.some((col) => {
      const v = row[col.id];
      if (v == null) return false;
      return String(v).toLowerCase().includes(q);
    }),
  );
  return { columns: grid.columns, rows };
}
