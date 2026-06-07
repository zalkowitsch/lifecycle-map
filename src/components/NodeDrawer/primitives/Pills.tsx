import { resolveBinding } from './resolveBinding';
import type { PrimitiveProps } from './types';
import styles from './primitives.module.css';

interface PillItem { label?: unknown; color?: string }

function toPill(item: unknown): PillItem {
  if (typeof item === 'string') return { label: item };
  if (item && typeof item === 'object') return item as PillItem;
  return { label: String(item) };
}

export function Pills({ node, context, L }: PrimitiveProps): JSX.Element | null {
  const raw = resolveBinding(node.bind, context);
  const items = Array.isArray(raw) ? raw.map(toPill) : [];
  if (items.length === 0) return null;
  return (
    <div className={styles.pills}>
      {items.map((p, i) => (
        <span key={i} className={styles.pill} style={p.color ? { color: p.color } : undefined}>
          {L(p.label)}
        </span>
      ))}
    </div>
  );
}
