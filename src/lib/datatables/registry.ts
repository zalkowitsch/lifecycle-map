import type { Datatable } from './types';

/** Indexes parsed datatables by name for O(1) row lookup. */
export class DatatableRegistry {
  private tables = new Map<string, Datatable>();

  constructor(tables: Datatable[] = []) {
    for (const t of tables) this.add(t);
  }

  add(t: Datatable): void {
    this.tables.set(t.name, t);
  }

  has(table: string): boolean {
    return this.tables.has(table);
  }

  getRow(table: string, id: string): Record<string, unknown> | undefined {
    const t = this.tables.get(table);
    if (!t || !Object.prototype.hasOwnProperty.call(t.rows, id)) return undefined;
    return t.rows[id];
  }

  getSchema(table: string): Datatable['schema'] | undefined {
    return this.tables.get(table)?.schema;
  }

  get size(): number {
    return this.tables.size;
  }
}
