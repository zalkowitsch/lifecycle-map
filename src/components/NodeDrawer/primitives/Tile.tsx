import { resolveBinding } from './resolveBinding';
import { Pills } from './Pills';
import type { PrimitiveProps } from './types';
import styles from './primitives.module.css';

export function Tile({ node, context, L }: PrimitiveProps): JSX.Element | null {
  const name = resolveBinding(node.title, context);
  const sub = resolveBinding(node.sub, context);
  const tags = resolveBinding(node.tags, context);
  if (name === undefined || name === null || name === '') return null;
  return (
    <div className={styles.tile}>
      <div className={styles['tile-name']}>{L(name)}</div>
      {sub !== undefined && sub !== null && sub !== '' ? (
        <div className={styles['tile-sub']}>{L(sub)}</div>
      ) : null}
      <div className={styles['tile-row']}>
        {node.pills ? <Pills node={{ type: 'Pills', bind: node.pills }} context={context} L={L} /> : null}
        {Array.isArray(tags) ? <Pills node={{ type: 'Pills', bind: '$__tags' }} context={{ __tags: tags }} L={L} /> : null}
      </div>
    </div>
  );
}
