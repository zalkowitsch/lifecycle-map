import { resolveBinding } from './resolveBinding';
import type { PrimitiveProps } from './types';
import styles from './primitives.module.css';

export function Button({ node, context, L, onAction }: PrimitiveProps): JSX.Element | null {
  const label = resolveBinding(node.text, context);
  if (label === undefined || label === null || label === '') return null;
  const target = resolveBinding(node.target, context);
  return (
    <button
      type="button"
      className={styles.button}
      onClick={() => onAction?.(node.action ?? 'navigate', target)}
    >
      {L(label)}
    </button>
  );
}
