import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CompactSelection,
  DataEditor,
  GridCellKind,
  type GridCell,
  type GridColumn as GlideColumn,
  type GridSelection,
  type Item,
  type EditableGridCell,
} from '@glideapps/glide-data-grid';
import '@glideapps/glide-data-grid/dist/index.css';
import { pasteEdits } from '@/lib/database/applyPaste';
import type { GridColumn, GridRows, EntityEdit } from '@/lib/database/types';
import type { Mode } from '@/types/lifecycle-map';
import { useGlideTheme } from './useGlideTheme';
import styles from './DatabasePanel.module.css';

/** Fixed grid geometry, shared so the nodes-split `<` marker can align to a row. */
export const GRID_HEADER_H = 36;
export const GRID_ROW_H = 34;
/** Height of the toolbar row above the grid (Add/Delete + note). */
export const GRID_TOOLBAR_H = 41;

/** Pure: mode ids for a dropdown cell. */
// eslint-disable-next-line react-refresh/only-export-components -- pure helper, exported for unit tests (see brief)
export function modeOptions(modes: Mode[]): string[] {
  return modes.map((m) => m.id);
}

/** Pure: whether a ref id exists in the target id list. */
// eslint-disable-next-line react-refresh/only-export-components -- pure helper, exported for unit tests (see brief)
export function isValidRef(id: string, ids: string[]): boolean {
  return ids.includes(id);
}

/** Pure: the row index whose `id` matches `selectedRowId`, or -1 if none/absent. */
// eslint-disable-next-line react-refresh/only-export-components -- pure helper, exported for unit tests (see brief)
export function selectedRowIndex(grid: GridRows, selectedRowId: string | null | undefined): number {
  if (selectedRowId == null) return -1;
  return grid.rows.findIndex((r) => String(r.id) === selectedRowId);
}

/** Pure: whether the delete-selected control should be enabled. */
// eslint-disable-next-line react-refresh/only-export-components -- pure helper, exported for unit tests (see brief)
export function canDeleteSelected(selectedRowId: string | null | undefined): boolean {
  return selectedRowId != null && selectedRowId !== '';
}

/** Pure: a lightweight cell descriptor (decouples tests from Glide's runtime). */
export interface CellDesc {
  kind: 'text' | 'dropdown';
  value: string;
  allowedValues?: string[];
  readonly?: boolean;
}

// eslint-disable-next-line react-refresh/only-export-components -- pure helper, exported for unit tests (see brief)
export function cellForColumn(col: GridColumn, value: string, modes: Mode[], featureIds: string[]): CellDesc {
  if (col.kind === 'mode') {
    return { kind: 'dropdown', value, allowedValues: modeOptions(modes), readonly: !!col.readOnly };
  }
  if (col.kind === 'ref') {
    return { kind: 'dropdown', value, allowedValues: featureIds, readonly: !!col.readOnly };
  }
  return { kind: 'text', value, readonly: !!col.readOnly };
}

/**
 * Pure: maps a CellDesc to a Glide Text cell. Glide 6.0.3's core ships no
 * built-in dropdown cell renderer/editor, so 'dropdown' cells are rendered
 * as editable text too — the 'kind' distinction on CellDesc is preserved
 * for a future richer editor, but the render path always uses Text so it
 * actually works in the browser.
 */
// eslint-disable-next-line react-refresh/only-export-components -- pure helper, exported for unit tests (see brief)
export function glideCellFor(desc: CellDesc): {
  kind: typeof GridCellKind.Text;
  data: string;
  displayData: string;
  allowOverlay: boolean;
  readonly: boolean;
} {
  return {
    kind: GridCellKind.Text,
    data: desc.value,
    displayData: desc.value,
    allowOverlay: !desc.readonly,
    readonly: !!desc.readonly,
  };
}

/** Pure: maps a clipboard paste at `target` to structured entity edits. */
// eslint-disable-next-line react-refresh/only-export-components -- pure helper, exported for unit tests (see brief)
export function pasteEditsFromClipboard(
  grid: GridRows,
  target: [number, number],
  values: readonly (readonly string[])[],
): EntityEdit[] {
  return pasteEdits(grid, target, values);
}

export interface EntityGridProps {
  grid: GridRows;
  modes: Mode[];
  featureIds?: string[];
  onEdit: (rowId: string, field: string, value: string) => void;
  onEditBatch?: (edits: EntityEdit[]) => void;
  onAdd: () => void;
  onDelete: (rowId: string) => void;
  selectedRowId?: string;
  onSelectRow?: (rowId: string) => void;
}

const EMPTY_SELECTION: GridSelection = {
  current: undefined,
  columns: CompactSelection.empty(),
  rows: CompactSelection.empty(),
};

export function EntityGrid({
  grid,
  modes,
  featureIds = [],
  onEdit,
  onEditBatch,
  onAdd,
  onDelete,
  selectedRowId,
  onSelectRow,
}: EntityGridProps) {
  // Store Glide's FULL selection (cell cursor + rows). Keeping `current` (the
  // active cell) is what makes the overlay editor open on type/double-click —
  // a row-only controlled selection suppresses cell editing entirely.
  const [selection, setSelection] = useState<GridSelection>(EMPTY_SELECTION);

  // When the parent drives selection by row id (nodes-split), reflect it as a
  // row-cursor so the right pane and the row highlight stay in sync.
  useEffect(() => {
    const rowIdx = selectedRowIndex(grid, selectedRowId);
    if (rowIdx < 0) return;
    setSelection((prev) => {
      if (prev.current?.cell?.[1] === rowIdx) return prev;
      return {
        current: { cell: [0, rowIdx], range: { x: 0, y: rowIdx, width: 1, height: 1 }, rangeStack: [] },
        columns: CompactSelection.empty(),
        rows: CompactSelection.fromSingleSelection(rowIdx),
      };
    });
  }, [grid, selectedRowId]);

  const glideCols: GlideColumn[] = useMemo(
    // `grow` lets columns share the pane width so the table fills its container
    // edge-to-edge instead of leaving a bare ruled area to the right. The last
    // column grows a bit more so any leftover space reads as intentional.
    () => grid.columns.map((c, i) => ({
      title: c.title,
      id: c.id,
      width: 180,
      grow: i === grid.columns.length - 1 ? 2 : 1,
    })),
    [grid.columns],
  );

  const getCellContent = useCallback((cell: Item): GridCell => {
    const [colIdx, rowIdx] = cell;
    const col = grid.columns[colIdx];
    const row = grid.rows[rowIdx];
    const raw = col && row ? row[col.id] : '';
    const value = raw == null ? '' : String(raw);
    if (!col) {
      return { kind: GridCellKind.Text, data: value, displayData: value, allowOverlay: true, readonly: false };
    }
    const desc = cellForColumn(col, value, modes, featureIds);
    return glideCellFor(desc);
  }, [grid, modes, featureIds]);

  const onCellEdited = useCallback((cell: Item, newVal: EditableGridCell): void => {
    const [colIdx, rowIdx] = cell;
    const col = grid.columns[colIdx];
    const row = grid.rows[rowIdx];
    if (!col || !row) return;
    const id = String(row.id);
    const v = 'data' in newVal ? String((newVal as { data: unknown }).data ?? '') : '';
    onEdit(id, col.id, v);
  }, [grid, onEdit]);

  const onPaste = useCallback((target: Item, values: readonly (readonly string[])[]): boolean => {
    const edits = pasteEdits(grid, target as [number, number], values);
    if (edits.length > 0) {
      if (onEditBatch) onEditBatch(edits);
      else edits.forEach((e) => { if (e.op === 'update') onEdit(e.id, e.field, String(e.value)); });
    }
    return false; // we applied them; don't let Glide also apply
  }, [grid, onEditBatch, onEdit]);

  const onSelectionChange = useCallback((sel: GridSelection) => {
    setSelection(sel);
    // Notify the parent which row is active (drives the nodes-split right pane).
    // Only fires on an actual cell cursor — i.e. the user clicked a cell.
    const rowIdx = sel.current?.cell?.[1];
    if (rowIdx == null) { onSelectRow?.(''); return; }
    const row = grid.rows[rowIdx];
    if (row) onSelectRow?.(String(row.id));
  }, [grid, onSelectRow]);

  const selectedRowId2 = (() => {
    const rowIdx = selection.current?.cell?.[1];
    if (rowIdx == null) return undefined;
    return grid.rows[rowIdx] ? String(grid.rows[rowIdx]!.id) : undefined;
  })();

  const handleDeleteSelected = useCallback(() => {
    if (selectedRowId2 != null) onDelete(selectedRowId2);
  }, [selectedRowId2, onDelete]);

  const glideTheme = useGlideTheme();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }}>
      <div className={styles.toolbar}>
        <button className={styles.btn} onClick={onAdd}>+ Add row</button>
        <button
          className={`${styles.btn} ${styles.btnGhost}`}
          onClick={handleDeleteSelected}
          disabled={!canDeleteSelected(selectedRowId2)}
        >
          Delete selected
        </button>
        <span className={styles.toolbarNote}>
          {grid.rows.length} row{grid.rows.length === 1 ? '' : 's'} · live
        </span>
      </div>
      <div className={styles.gridWrap}>
        <DataEditor
          theme={glideTheme}
          columns={glideCols}
          rows={grid.rows.length}
          getCellContent={getCellContent}
          onCellEdited={onCellEdited}
          getCellsForSelection={true}
          onPaste={onPaste}
          gridSelection={selection}
          onGridSelectionChange={onSelectionChange}
          rowMarkers="number"
          rowSelect="none"
          headerHeight={GRID_HEADER_H}
          rowHeight={GRID_ROW_H}
          smoothScrollX
          smoothScrollY
          width="100%"
          height="100%"
        />
      </div>
    </div>
  );
}
