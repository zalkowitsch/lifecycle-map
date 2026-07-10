import type { DatatableRegistry } from './registry';
import type { ResolveCtx } from './types';

export const DEFAULT_MAX_DEPTH = 3;

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isExplicitRef(v: unknown): v is { table: string; id: string } {
  return isObject(v) && typeof v.table === 'string' && typeof v.id === 'string';
}

/**
 * Resolve one field value that MAY be a reference into `refTable`.
 * - `{table,id}` object → resolve directly (ignores refTable).
 * - string + refTable given → resolve as a row id in refTable.
 * - array → per element.
 * - otherwise → literal (returned as-is).
 * Degrades (raw marker + warn) on broken ref, cycle, or depth cap; never throws.
 */
export function resolveFieldValue(
  value: unknown,
  refTable: string | undefined,
  registry: DatatableRegistry,
  ctx: ResolveCtx,
): unknown {
  if (Array.isArray(value)) {
    return value.map((el) => resolveFieldValue(el, refTable, registry, ctx));
  }

  let table: string | undefined;
  let id: string | undefined;
  if (isExplicitRef(value)) {
    table = value.table;
    id = value.id;
  } else if (typeof value === 'string' && refTable) {
    table = refTable;
    id = value;
  } else {
    return value; // literal
  }

  const key = `${table}:${id}`;

  if (ctx.depth >= ctx.maxDepth) {
    console.warn(`[datatables] depth cap (${ctx.maxDepth}) reached at ${key}; leaving raw ref`);
    return { table, id };
  }
  if (ctx.seen.has(key)) {
    console.warn(`[datatables] cycle at ${key}; leaving raw ref`);
    return { table, id };
  }

  const row = registry.getRow(table, id);
  if (!row) {
    console.warn(`[datatables] broken ref ${key}; no such row`);
    return { _unresolved: true, table, id };
  }

  // Resolve the row's OWN outgoing refs, per its table schema.
  const rowSchema = registry.getSchema(table) ?? {};
  const childCtx: ResolveCtx = {
    schema: rowSchema,
    depth: ctx.depth + 1,
    maxDepth: ctx.maxDepth,
    seen: new Set(ctx.seen).add(key),
  };

  const resolved: Record<string, unknown> = {};
  for (const [col, colVal] of Object.entries(row)) {
    const childRef = rowSchema[col]?.ref;
    resolved[col] = childRef
      ? resolveFieldValue(colVal, childRef, registry, childCtx)
      : colVal;
  }
  return resolved;
}
