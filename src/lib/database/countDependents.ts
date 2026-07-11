import type { Entity } from './types';

function nodesOf(map: Record<string, unknown>): Record<string, unknown>[] {
  return Array.isArray(map.nodes) ? (map.nodes as Record<string, unknown>[]) : [];
}

/** How many nodes reference the given entity row. Nodes → 0 (edges elsewhere). */
export function countDependents(map: Record<string, unknown>, entity: Entity, id: string): number {
  const nodes = nodesOf(map);
  if (entity === 'lanes') return nodes.filter((n) => n.lane === id).length;
  if (entity === 'phases') return nodes.filter((n) => n.phase === id).length;
  if (entity === 'features') {
    return nodes.filter((n) => {
      const ctx = (n.context && typeof n.context === 'object' ? n.context : {}) as Record<string, unknown>;
      const mods = Array.isArray(ctx.modules) ? ctx.modules : [];
      return mods.includes(id);
    }).length;
  }
  return 0; // nodes
}
