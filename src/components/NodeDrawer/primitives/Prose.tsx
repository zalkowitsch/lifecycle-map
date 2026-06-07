import { resolveBinding } from './resolveBinding';
import type { PrimitiveProps } from './types';
import styles from './primitives.module.css';

export function Prose({ node, context, L }: PrimitiveProps): JSX.Element | null {
  const raw = resolveBinding(node.bind, context);
  if (raw === undefined || raw === null || raw === '') return null;
  // Text may contain a small subset of HTML (<em>) like the legacy drawer.
  return <p className={styles.text} dangerouslySetInnerHTML={{ __html: L(raw) }} />;
}
