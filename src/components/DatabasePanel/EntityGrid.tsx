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
import type { GridColumn, GridRows } from '@/lib/database/types';
import type { Mode } from '@/types/lifecycle-map';

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

export interface EntityGridProps {
  grid: GridRows;
  modes: Mode[];
  featureIds?: string[];
  onEdit: (rowId: string, field: string, value: string) => void;
  onAdd: () => void;
  onDelete: (rowId: string) => void;
  selectedRowId?: string;
  onSelectRow?: (rowId: string) => void;
}

export function EntityGrid({
  grid,
  modes,
  featureIds = [],
  onEdit,
  onAdd,
  onDelete,
  selectedRowId,
  onSelectRow,
}: EntityGridProps) {
  const [internalSelectedRowId, setInternalSelectedRowId] = useState<string | undefined>(selectedRowId);

  // Keep internal selection in sync with the `selectedRowId` prop (e.g. the
  // nodes tab drives selection externally via the nested-table split view).
  useEffect(() => {
    setInternalSelectedRowId(selectedRowId);
  }, [selectedRowId]);

  const glideCols: GlideColumn[] = useMemo(
    () => grid.columns.map((c) => ({ title: c.title, id: c.id, width: 180 })),
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

  const onRowSelected = useCallback((sel: GridSelection) => {
    const rowIdx = sel.current?.cell?.[1];
    if (rowIdx == null) return;
    const row = grid.rows[rowIdx];
    if (!row) return;
    const id = String(row.id);
    setInternalSelectedRowId(id);
    if (onSelectRow) onSelectRow(id);
  }, [grid, onSelectRow]);

  const gridSelection: GridSelection = useMemo(() => {
    const rowIdx = selectedRowIndex(grid, internalSelectedRowId);
    return {
      current: undefined,
      columns: CompactSelection.empty(),
      rows: rowIdx >= 0 ? CompactSelection.fromSingleSelection(rowIdx) : CompactSelection.empty(),
    };
  }, [grid, internalSelectedRowId]);

  const handleDeleteSelected = useCallback(() => {
    if (internalSelectedRowId != null) onDelete(internalSelectedRowId);
  }, [internalSelectedRowId, onDelete]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '6px 8px', display: 'flex', gap: 8 }}>
        <button onClick={onAdd}>+ Add</button>
        <button onClick={handleDeleteSelected} disabled={!canDeleteSelected(internalSelectedRowId)}>
          Delete selected
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <DataEditor
          columns={glideCols}
          rows={grid.rows.length}
          getCellContent={getCellContent}
          onCellEdited={onCellEdited}
          gridSelection={gridSelection}
          onGridSelectionChange={onRowSelected}
          rowMarkers="number"
          smoothScrollX
          smoothScrollY
        />
      </div>
    </div>
  );
}
