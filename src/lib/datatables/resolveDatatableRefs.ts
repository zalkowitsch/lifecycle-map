import type { LifecycleMap } from '@/types/lifecycle-map';
import type { DatatableRegistry } from './registry';
import { resolveFieldValue, DEFAULT_MAX_DEPTH } from './resolveRefs';
import type { ResolveCtx } from './types';

/**
 * Walk each node's context fields declared as refs (meta.nodeTypes[type].contextRefs)
 * and substitute resolved datatable rows in place. Returns a new map; the input is
 * not mutated. Nodes without a type / contextRefs are left untouched (inline maps).
 */
export function resolveDatatableRefs(map: LifecycleMap, registry: DatatableRegistry): LifecycleMap {
  const nodeTypes = map.meta?.nodeTypes ?? {};
  const nodes = map.nodes.map((node) => {
    if (!node.type || !node.context) return node;
    const refs = nodeTypes[node.type]?.contextRefs;
    if (!refs) return node;

    const context = { ...node.context };
    for (const [field, { ref }] of Object.entries(refs)) {
      if (!(field in context)) continue;
      const ctx: ResolveCtx = { schema: {}, depth: 0, maxDepth: DEFAULT_MAX_DEPTH, seen: new Set() };
      context[field] = resolveFieldValue(context[field], ref, registry, ctx);
    }
    return { ...node, context };
  });
  return { ...map, nodes };
}
