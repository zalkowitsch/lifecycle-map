import { useMemo } from 'react';
import type { Mode } from '@/types/lifecycle-map';
import type { EntityEdit } from '@/lib/database/types';
import styles from './DatabasePanel.module.css';

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
  modes: Mode[];
  onFieldChange: (f: 'modules' | 'states' | 'meta') => void;
  onEdit: (edit: EntityEdit) => void;
}

export function NestedTable({ node, field, featureIds, modes, onFieldChange, onEdit }: NestedTableProps) {
  const rows = useMemo(() => nestedRows(node, field), [node, field]);
  return (
    <>
      <div className={styles.nestedHead}>
        <span className={styles.nestedTitle}>{String(node.id)}</span>
        <select
          className={styles.select}
          value={field}
          onChange={(e) => onFieldChange(e.target.value as 'modules' | 'states' | 'meta')}
          aria-label="Nested field"
        >
          <option value="modules">modules</option>
          <option value="states">states</option>
          <option value="meta">meta</option>
        </select>
        {['modules', 'states', 'meta'].includes(field) && (
          <button className={styles.btn} style={{ marginLeft: 'auto' }} onClick={() => onEdit({ op: 'add', id: '' })}>
            {field === 'modules' ? '+ add ref' : '+ add'}
          </button>
        )}
      </div>
      <div className={styles.nestedBody}>
        {field === 'modules' ? (
          <table className={styles.nestedTable}>
            <thead>
              <tr>
                <th className={styles.rowNum}>#</th>
                <th>feature reference</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className={styles.rowNum}>{i + 1}</td>
                  <td>
                    <div className={styles.refRow}>
                      <select
                        className={`${styles.select} ${styles.refSelect}`}
                        value={String(r)}
                        onChange={(e) => onEdit({ op: 'update', id: String(i), field: String(i), value: e.target.value })}
                        aria-label={`Feature reference ${i + 1}`}
                      >
                        <option value="">—</option>
                        {featureIds.map((fid) => <option key={fid} value={fid}>{fid}</option>)}
                      </select>
                      <button
                        className={styles.iconBtn}
                        onClick={() => onEdit({ op: 'delete', id: String(i) })}
                        aria-label={`Remove reference ${i + 1}`}
                      >✕</button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td className={styles.rowNum}></td><td className={styles.nestedEmpty}>No references yet.</td></tr>
              )}
            </tbody>
          </table>
        ) : field === 'states' ? (
          <table className={styles.nestedTable}>
            <thead><tr><th className={styles.rowNum}>#</th><th>label</th><th>mode</th><th>narrative</th><th></th></tr></thead>
            <tbody>
              {rows.map((r, i) => {
                const row = (r && typeof r === 'object' ? r : {}) as Record<string, unknown>;
                return (
                  <tr key={i}>
                    <td className={styles.rowNum}>{i + 1}</td>
                    <td><input className={styles.select} value={String(row.label ?? '')}
                      onChange={(e) => onEdit({ op: 'update', id: String(i), field: 'label', value: e.target.value })} /></td>
                    <td>
                      <select className={styles.select} value={String(row.mode ?? '')}
                        onChange={(e) => onEdit({ op: 'update', id: String(i), field: 'mode', value: e.target.value })}>
                        <option value="">—</option>
                        {modes.map((m) => <option key={m.id} value={m.id}>{m.id}</option>)}
                      </select>
                    </td>
                    <td><input className={`${styles.select} ${styles.refSelect}`} value={String(row.narrative ?? '')}
                      onChange={(e) => onEdit({ op: 'update', id: String(i), field: 'narrative', value: e.target.value })} /></td>
                    <td><button className={styles.iconBtn} onClick={() => onEdit({ op: 'delete', id: String(i) })} aria-label={`Remove state ${i + 1}`}>✕</button></td>
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td className={styles.rowNum}></td><td className={styles.nestedEmpty} colSpan={4}>No states yet.</td></tr>}
            </tbody>
          </table>
        ) : (
          <table className={styles.nestedTable}>
            <thead><tr><th className={styles.rowNum}>#</th><th>label</th><th>value</th><th></th></tr></thead>
            <tbody>
              {rows.map((r, i) => {
                const row = (r && typeof r === 'object' ? r : {}) as Record<string, unknown>;
                return (
                  <tr key={i}>
                    <td className={styles.rowNum}>{i + 1}</td>
                    <td><input className={styles.select} value={String(row.label ?? '')}
                      onChange={(e) => onEdit({ op: 'update', id: String(i), field: 'label', value: e.target.value })} /></td>
                    <td><input className={`${styles.select} ${styles.refSelect}`} value={String(row.value ?? '')}
                      onChange={(e) => onEdit({ op: 'update', id: String(i), field: 'value', value: e.target.value })} /></td>
                    <td><button className={styles.iconBtn} onClick={() => onEdit({ op: 'delete', id: String(i) })} aria-label={`Remove pair ${i + 1}`}>✕</button></td>
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td className={styles.rowNum}></td><td className={styles.nestedEmpty} colSpan={3}>No entries yet.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
