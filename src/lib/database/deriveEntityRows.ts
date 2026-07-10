import type { LifecycleMap } from '@/types/lifecycle-map';
import type { DatatableRegistry } from '@/lib/datatables/registry';
import type { Entity, GridColumn, GridRows } from './types';

const COLUMNS: Record<Entity, GridColumn[]> = {
  lanes: [
    { id: 'id', title: 'id', kind: 'text', readOnly: true },
    { id: 'label', title: 'label', kind: 'text' },
    { id: 'sub', title: 'sub', kind: 'text' },
  ],
  phases: [
    { id: 'id', title: 'id', kind: 'text', readOnly: true },
    { id: 'label', title: 'label', kind: 'text' },
    { id: 'roman', title: 'roman', kind: 'text' },
    { id: 'subCols', title: 'subCols', kind: 'text' },
  ],
  features: [
    { id: 'id', title: 'id', kind: 'text', readOnly: true },
    { id: 'name', title: 'name', kind: 'text' },
    { id: 'today', title: 'today', kind: 'mode' },
    { id: 'tomorrow', title: 'tomorrow', kind: 'mode' },
    { id: 'tags', title: 'tags', kind: 'text' },
  ],
  nodes: [
    { id: 'id', title: 'id', kind: 'text', readOnly: true },
    { id: 'title', title: 'title', kind: 'text' },
    { id: 'lane', title: 'lane', kind: 'text' },
    { id: 'phase', title: 'phase', kind: 'text' },
    { id: 'sub', title: 'sub', kind: 'text' },
  ],
};

/** Read a possibly-localized string as a plain string (first value if object). */
function asText(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v.map(asText).join(', ');
  if (typeof v === 'object') {
    const vals = Object.values(v as Record<string, unknown>);
    return vals.length ? asText(vals[0]) : '';
  }
  return String(v);
}

export function deriveEntityRows(
  map: LifecycleMap,
  registry: DatatableRegistry | undefined,
  entity: Entity,
): GridRows {
  const columns = COLUMNS[entity];
  let rows: Record<string, unknown>[] = [];

  if (entity === 'lanes') {
    rows = map.lanes.map((l) => ({ id: l.id, label: asText(l.label), sub: asText(l.sub) }));
  } else if (entity === 'phases') {
    rows = map.phases.map((p) => ({
      id: p.id, label: asText(p.label), roman: p.roman ?? '', subCols: p.subCols ?? 1,
    }));
  } else if (entity === 'nodes') {
    rows = map.nodes.map((n) => ({
      id: n.id, title: asText(n.title), lane: n.lane, phase: n.phase, sub: asText(n.sub),
    }));
  } else if (entity === 'features') {
    const ids = registry?.ids('features') ?? [];
    rows = ids.map((id) => {
      const r = registry?.getRow('features', id) ?? {};
      return {
        id,
        name: asText(r.name),
        today: asText(r.today),
        tomorrow: asText(r.tomorrow),
        tags: Array.isArray(r.tags) ? r.tags.map(asText).join(', ') : asText(r.tags),
      };
    });
  }

  return { columns, rows };
}
