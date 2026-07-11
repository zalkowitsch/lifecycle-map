import type { GridRows, EntityEdit } from './types';

/**
 * Map a clipboard grid (2D string array) onto edits, starting at `target`
 * ([colIndex, rowIndex]). Skips out-of-range cells and read-only columns.
 */
export function pasteEdits(
  grid: GridRows,
  target: [number, number],
  values: readonly (readonly string[])[],
): EntityEdit[] {
  const [targetCol, targetRow] = target;
  const edits: EntityEdit[] = [];
  for (let r = 0; r < values.length; r++) {
    const rowVals = values[r];
    if (!rowVals) continue;
    const row = grid.rows[targetRow + r];
    if (!row) continue;
    for (let c = 0; c < rowVals.length; c++) {
      const col = grid.columns[targetCol + c];
      if (!col || col.readOnly) continue;
      const value = rowVals[c];
      if (value == null) continue;
      edits.push({ op: 'update', id: String(row.id), field: col.id, value });
    }
  }
  return edits;
}
