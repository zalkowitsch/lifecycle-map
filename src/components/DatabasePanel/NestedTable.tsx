import { useMemo } from 'react';
import type { EntityEdit } from '@/lib/database/types';

/** Pure: read a node's nested field as a normalized array. */
// eslint-disable-next-line react-refresh/only-export-components -- pure helper, exported for unit tests (see brief)
export function nestedRows(node: Record<string, unknown>, field: 'modules' | 'states' | 'meta'): unknown[] {
  const ctx = (node.context && typeof node.context === 'object' ? node.context : {}) as Record<string, unknown>;
  const v = ctx[field];
  return Array.isArray(v) ? v : [];
}

export interface NestedTableProps {
  node: Record<string, unknown>;
  field: 'modules' | 'states' | 'meta';
  featureIds: string[];
  onFieldChange: (f: 'modules' | 'states' | 'meta') => void;
  onEdit: (edit: EntityEdit) => void;
}

export function NestedTable({ node, field, featureIds, onFieldChange, onEdit }: NestedTableProps) {
  const rows = useMemo(() => nestedRows(node, field), [node, field]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '6px 8px', display: 'flex', gap: 8, alignItems: 'center' }}>
        <strong>{String(node.id)}</strong>
        <select value={field} onChange={(e) => onFieldChange(e.target.value as 'modules' | 'states' | 'meta')}>
          <option value="modules">modules</option>
          <option value="states">states</option>
          <option value="meta">meta</option>
        </select>
        <button style={{ marginLeft: 'auto' }} onClick={() => onEdit({ op: 'add', id: '' })}>+ add</button>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {field === 'modules' ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr><th>#</th><th>feature id (ref)</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>
                    <select
                      value={String(r)}
                      onChange={(e) => onEdit({ op: 'update', id: String(i), field: String(i), value: e.target.value })}
                    >
                      <option value="">—</option>
                      {featureIds.map((fid) => <option key={fid} value={fid}>{fid}</option>)}
                    </select>
                    <button onClick={() => onEdit({ op: 'delete', id: String(i) })}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: 8, fontSize: 12, color: '#6b7280' }}>
            {field} editing (key/value) — {rows.length} item(s)
          </div>
        )}
      </div>
    </div>
  );
}
