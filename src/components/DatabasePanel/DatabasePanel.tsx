import { useEffect, useState } from 'react';
import type { NormalizedMap, Mode } from '@/types/lifecycle-map';
import type { RawSource } from '@/hooks/useViewerState';
import type { DatatableRegistry } from '@/lib/datatables/registry';
import type { Entity, EntityEdit } from '@/lib/database/types';
import { deriveEntityRows } from '@/lib/database/deriveEntityRows';
import { applyEntityEdit, applyNodeNestedEdit } from '@/lib/database/applyEntityEdit';
import { serializeSource } from '@/lib/database/serializeSource';
import { parseSource } from '@/lib/parseSource';
import { EntityGrid, GRID_HEADER_H, GRID_ROW_H, GRID_TOOLBAR_H } from './EntityGrid';
import { NestedTable } from './NestedTable';
import styles from './DatabasePanel.module.css';

const TABS: { id: Entity; label: string }[] = [
  { id: 'lanes', label: 'Personas' },
  { id: 'phases', label: 'Steps' },
  { id: 'features', label: 'Features' },
  { id: 'nodes', label: 'Nodes' },
];

/** Pure: which rawSource index backs an entity (map=0; features=the features datatable). */
// eslint-disable-next-line react-refresh/only-export-components -- pure helper, exported for unit tests (see brief)
export function sourceIndexForEntity(rawSources: RawSource[], entity: Entity): number {
  if (entity !== 'features') return 0;
  const idx = rawSources.findIndex((s, i) => i > 0 && /(^|\/)features(\.datatable)?\.(json|csv)$/i.test(s.name));
  return idx;
}

export interface DatabasePanelProps {
  open: boolean;
  onClose: () => void;
  data: NormalizedMap;
  rawSources: RawSource[];
  registry?: DatatableRegistry;
  onCommit: (sourceIndex: number, newText: string) => void;
  /** Active data language for localized fields (label/title/sub). Defaults to 'en'. */
  lang?: string;
}

export function DatabasePanel({ open, onClose, data, rawSources, registry, onCommit, lang = 'en' }: DatabasePanelProps) {
  const [tab, setTab] = useState<Entity>('lanes');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nestedField, setNestedField] = useState<'modules' | 'states' | 'meta'>('modules');

  // Glide Data Grid renders its overlay cell editor into `#portal`, which MUST
  // be a direct child of <body> (not inside this fixed panel's stacking
  // context). Without it, editing silently fails ("portal not found"). Create
  // it on mount, give it a z-index above the panel, and remove it on unmount.
  useEffect(() => {
    if (!open) return;
    let portal = document.getElementById('portal');
    const created = !portal;
    if (!portal) {
      portal = document.createElement('div');
      portal.id = 'portal';
      document.body.appendChild(portal);
    }
    portal.style.position = 'fixed';
    portal.style.left = '0';
    portal.style.top = '0';
    portal.style.zIndex = '100';
    return () => { if (created) portal?.remove(); };
  }, [open]);

  if (!open) return null;

  const modes: Mode[] = (data.meta.modes ?? []) as Mode[];
  const featureIds = registry?.ids('features') ?? [];
  const grid = deriveEntityRows(data, registry, tab);

  const counts: Record<Entity, number> = {
    lanes: data.lanes.length,
    phases: data.phases.length,
    features: featureIds.length,
    nodes: data.nodes.length,
  };
  // Features live in a separate datatable; if none was loaded there's nothing to edit.
  const featuresMissing = tab === 'features' && sourceIndexForEntity(rawSources, 'features') < 0;

  // Vertical center of the selected node's row, so the `<` connector aligns to
  // it. Geometry is fixed (see EntityGrid constants): toolbar + header + rows.
  // Falls back to the top of the grid when the selection isn't in the derived
  // rows (shouldn't happen, but keeps the marker on-screen).
  const selectedRowIdx = selectedNodeId ? grid.rows.findIndex((r) => String(r.id) === selectedNodeId) : -1;
  const markerTop = selectedRowIdx >= 0
    ? GRID_TOOLBAR_H + GRID_HEADER_H + selectedRowIdx * GRID_ROW_H + GRID_ROW_H / 2 - 10
    : GRID_TOOLBAR_H + GRID_HEADER_H + GRID_ROW_H / 2 - 10;

  const commitEntity = (edit: EntityEdit): void => {
    const idx = sourceIndexForEntity(rawSources, tab);
    const src = rawSources[idx];
    if (!src) return;
    const obj = parseSource(src.text) as unknown as Record<string, unknown>;
    const next = applyEntityEdit(obj, tab, edit, lang);
    onCommit(idx, serializeSource(next, src.lang));
  };

  const commitNodeNested = (edit: EntityEdit): void => {
    if (!selectedNodeId) return;
    const src = rawSources[0];
    if (!src) return;
    const obj = parseSource(src.text) as unknown as Record<string, unknown>;
    const next = applyNodeNestedEdit(obj, selectedNodeId, nestedField, edit);
    onCommit(0, serializeSource(next, src.lang));
  };

  // The nested editor must read the RAW node from the map source, not the
  // resolved `data` node: the datatable resolver has already replaced each
  // `context.modules` id string with its resolved row object, so `data` no
  // longer carries the ids the ref picker needs to write back. Parse the map
  // source and find the node there.
  const selectedNode = (() => {
    if (!selectedNodeId) return undefined;
    const mapSrc = rawSources[0];
    if (!mapSrc) return undefined;
    try {
      const obj = parseSource(mapSrc.text) as unknown as { nodes?: Record<string, unknown>[] };
      return (obj.nodes ?? []).find((n) => n.id === selectedNodeId);
    } catch {
      return undefined;
    }
  })();

  return (
    <div className={styles.overlay} role="dialog" aria-label="Database editor">
      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            <span className={styles.tabCount}>{counts[t.id]}</span>
          </button>
        ))}
        <button className={styles.back} onClick={onClose}>← back to map</button>
      </div>

      <div className={styles.body}>
        {featuresMissing ? (
          <div className={styles.empty}>
            No features datatable loaded. Drop the map together with its<br />
            <code>features.json</code> datatable to view and edit features here.
          </div>
        ) : tab === 'nodes' ? (
          <div className={styles.split}>
            <div className={styles.splitLeft}>
              <EntityGrid
                grid={grid}
                modes={modes}
                onEdit={(id, field, value) => commitEntity({ op: 'update', id, field, value })}
                onAdd={() => commitEntity({ op: 'add', id: `node-${Date.now()}` })}
                onDelete={(id) => commitEntity({ op: 'delete', id })}
                selectedRowId={selectedNodeId ?? undefined}
                onSelectRow={setSelectedNodeId}
              />
            </div>
            {selectedNode && (
              <div
                className={styles.marker}
                aria-hidden="true"
                style={{ top: markerTop }}
              >&lt;</div>
            )}
            <div className={styles.splitRight}>
              {selectedNode
                ? <NestedTable node={selectedNode} field={nestedField} featureIds={featureIds}
                    onFieldChange={setNestedField} onEdit={commitNodeNested} />
                : <div className={styles.placeholder}>Select a node on the left to edit its features and nested fields.</div>}
            </div>
          </div>
        ) : (
          <div className={styles.gridWrap}>
            <EntityGrid
              grid={grid}
              modes={modes}
              featureIds={tab === 'features' ? featureIds : undefined}
              onEdit={(id, field, value) => commitEntity({ op: 'update', id, field, value })}
              onAdd={() => commitEntity({ op: 'add', id: `${tab}-${Date.now()}` })}
              onDelete={(id) => commitEntity({ op: 'delete', id })}
            />
          </div>
        )}
      </div>
    </div>
  );
}
