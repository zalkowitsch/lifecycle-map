import { resolveBinding } from './resolveBinding';
import type { PrimitiveProps } from './types';
import styles from './primitives.module.css';

export function Link({ node, context, L }: PrimitiveProps): JSX.Element | null {
  const label = resolveBinding(node.text, context);
  const href = resolveBinding(node.href, context);
  if (!label || typeof href !== 'string' || href === '') return null;
  return (
    <a className={styles.link} href={href} target="_blank" rel="noreferrer">
      {L(label)}
    </a>
  );
}
