import { useState } from 'react';
import type { NormalizedMap, Mode } from '@/types/lifecycle-map';
import type { RawSource } from '@/hooks/useViewerState';
import type { DatatableRegistry } from '@/lib/datatables/registry';
import type { Entity, EntityEdit } from '@/lib/database/types';
import { deriveEntityRows } from '@/lib/database/deriveEntityRows';
import { applyEntityEdit, applyNodeNestedEdit } from '@/lib/database/applyEntityEdit';
import { serializeSource } from '@/lib/database/serializeSource';
import { parseSource } from '@/lib/parseSource';
import { EntityGrid } from './EntityGrid';
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
  if (!open) return null;

  const modes: Mode[] = (data.meta.modes ?? []) as Mode[];
  const featureIds = registry?.ids('features') ?? [];
  const grid = deriveEntityRows(data, registry, tab);

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

  const selectedNode = selectedNodeId
    ? (data.nodes.find((n) => n.id === selectedNodeId) as unknown as Record<string, unknown> | undefined)
    : undefined;

  return (
    <div className={styles.overlay} role="dialog" aria-label="Database editor">
      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
            onClick={() => setTab(t.id)}
          >{t.label}</button>
        ))}
        <button className={styles.back} onClick={onClose}>← back to map</button>
      </div>

      <div className={styles.body}>
        {tab === 'nodes' ? (
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
            {selectedNode && <div className={styles.marker}>&lt;</div>}
            <div className={styles.splitRight}>
              {selectedNode
                ? <NestedTable node={selectedNode} field={nestedField} featureIds={featureIds}
                    onFieldChange={setNestedField} onEdit={commitNodeNested} />
                : <div style={{ padding: 12, color: '#6b7280' }}>Select a node row to edit its nested fields.</div>}
            </div>
          </div>
        ) : (
          <EntityGrid
            grid={grid}
            modes={modes}
            featureIds={tab === 'features' ? featureIds : undefined}
            onEdit={(id, field, value) => commitEntity({ op: 'update', id, field, value })}
            onAdd={() => commitEntity({ op: 'add', id: `${tab}-${Date.now()}` })}
            onDelete={(id) => commitEntity({ op: 'delete', id })}
          />
        )}
      </div>
    </div>
  );
}
