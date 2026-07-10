/** The four editable entity kinds in the Database panel. */
export type Entity = 'lanes' | 'phases' | 'features' | 'nodes';

/** A grid column descriptor. `kind` selects the cell editor. */
export interface GridColumn {
  id: string;
  title: string;
  kind: 'text' | 'mode' | 'ref';
  /** For kind 'ref': the datatable the cell references (e.g. 'features'). */
  refTable?: string;
  readOnly?: boolean;
}

/** A derived grid: columns + row objects (each row carries an `id`). */
export interface GridRows {
  columns: GridColumn[];
  rows: Record<string, unknown>[];
}

/** A single structured edit against an entity. */
export type EntityEdit =
  | { op: 'update'; id: string; field: string; value: unknown }
  | { op: 'add'; id: string }
  | { op: 'delete'; id: string };

/** Which source a given edit targets, and (for nodes) the nested path. */
export interface EditTarget {
  /** 'map' → the lifecycle map source; otherwise a datatable name (e.g. 'features'). */
  source: 'map' | string;
}
