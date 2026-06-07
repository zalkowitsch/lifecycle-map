import { resolveBinding } from './resolveBinding';
import type { PrimitiveProps } from './types';
import styles from './primitives.module.css';

interface Row { label: unknown; value: unknown }

export function KeyValue({ node, context, L }: PrimitiveProps): JSX.Element | null {
  const raw = resolveBinding(node.bind, context);
  const rows = Array.isArray(raw) ? (raw as Row[]) : [];
  if (rows.length === 0) return null;
  return (
    <div className={styles.kv}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'contents' }}>
          <span className={styles['kv-label']}>{L(r.label)}</span>
          <span className={styles['kv-value']}>{L(r.value)}</span>
        </div>
      ))}
    </div>
  );
}
