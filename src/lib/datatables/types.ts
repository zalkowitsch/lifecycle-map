/** A column marked as a foreign key (or, by convention, a list) in a datatable. */
export interface DatatableSchema {
  [column: string]: { ref: string };
}

/** A parsed datatable: rows keyed by id, plus its name and FK schema. */
export interface Datatable {
  name: string;
  schema: DatatableSchema;
  rows: Record<string, Record<string, unknown>>;
}

/** Resolution context threaded through resolveRefs. */
export interface ResolveCtx {
  schema: DatatableSchema;
  depth: number;
  maxDepth: number;
  seen: Set<string>;
}
