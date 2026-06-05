// Resolve a map's external module/rubric catalog.
//
// A map may keep its module definitions in a separate file, referenced by
// `meta.modules_source` (e.g. "./rubrics.json"). The viewer only reads
// `data.modules`, so before normalizing we fetch that catalog and inject its
// definitions into `data.modules`.
//
// - No `modules_source`, or `modules` already embedded → no-op (no fetch).
// - Catalog may key definitions under `modules` (preferred) or `features`
//   (legacy features.json). String-valued comment markers are dropped.
// - A failed fetch resolves gracefully (modules stay unresolved) rather than
//   failing the whole map load — a missing catalog shouldn't blank the viewer.

import { parseSource } from '@/lib/parseSource';
import type { LifecycleMap } from '@/types/lifecycle-map';

export type FetchText = (url: string) => Promise<string>;

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Pull module definitions out of a catalog object, dropping comment markers. */
function extractModules(catalog: Record<string, unknown>): Record<string, unknown> {
  const raw = (isObject(catalog.modules) ? catalog.modules : catalog.features) as
    | Record<string, unknown>
    | undefined;
  const out: Record<string, unknown> = {};
  if (raw) {
    for (const [id, def] of Object.entries(raw)) {
      if (isObject(def)) out[id] = def; // skip string comment markers
    }
  }
  return out;
}

/**
 * If `data.meta.modules_source` is set and `data.modules` is not already
 * present, fetch the catalog and inject its modules. Returns the same object
 * reference when nothing needs resolving.
 */
export async function resolveExternalModules(
  data: LifecycleMap,
  fetchText: FetchText,
  _baseName: string,
): Promise<LifecycleMap> {
  const src = data.meta?.modules_source;
  if (!src || isObject((data as unknown as Record<string, unknown>).modules)) {
    return data;
  }
  try {
    const text = await fetchText(src);
    const catalog = parseSource(text) as unknown as Record<string, unknown>;
    return { ...data, modules: extractModules(catalog) } as LifecycleMap;
  } catch {
    // Catalog unreachable — load the map anyway with no resolved modules.
    return { ...data, modules: {} } as LifecycleMap;
  }
}
