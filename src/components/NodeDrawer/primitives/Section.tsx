import { resolveBinding } from './resolveBinding';
import type { PrimitiveProps } from './types';
import styles from './primitives.module.css';
import { RenderNode } from './RenderNode';

export function Section({ node, context, L, onAction, depth }: PrimitiveProps): JSX.Element | null {
  const title = resolveBinding(node.title, context);
  const sub = resolveBinding(node.sub, context);
  const children = node.children ?? [];
  return (
    <div className={styles.section}>
      <div className={styles['section-head']}>
        {title !== undefined && title !== null && title !== '' ? (
          <div className={styles['section-title']}>{L(title)}</div>
        ) : null}
        {sub !== undefined && sub !== null && sub !== '' ? (
          <div className={styles['section-sub']}>{L(sub)}</div>
        ) : null}
      </div>
      {children.map((child, i) => (
        <RenderNode key={i} node={child} context={context} L={L} onAction={onAction} depth={(depth ?? 0) + 1} />
      ))}
    </div>
  );
}
