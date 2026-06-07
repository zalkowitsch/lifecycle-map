import { resolveBinding } from './resolveBinding';
import type { PrimitiveProps } from './types';
import styles from './primitives.module.css';

const TITLE_VARIANT: Record<string, string> = {
  h1: styles['title-h1'] ?? '',
  h2: styles['title-h2'] ?? '',
  eyebrow: styles.eyebrow ?? '',
};

export function Title({ node, context, L }: PrimitiveProps): JSX.Element | null {
  const raw = resolveBinding(node.text, context);
  if (raw === undefined || raw === null || raw === '') return null;
  const cls = TITLE_VARIANT[node.variant ?? 'h2'] ?? styles['title-h2'] ?? '';
  return <div className={cls}>{L(raw)}</div>;
}
