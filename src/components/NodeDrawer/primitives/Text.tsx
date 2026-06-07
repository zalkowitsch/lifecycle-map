import { resolveBinding } from './resolveBinding';
import type { PrimitiveProps } from './types';
import styles from './primitives.module.css';

const TEXT_VARIANT: Record<string, string> = {
  body: styles.text ?? '',
  caption: styles.caption ?? '',
  mono: styles.mono ?? '',
};

export function Text({ node, context, L }: PrimitiveProps): JSX.Element | null {
  const raw = resolveBinding(node.text, context);
  if (raw === undefined || raw === null || raw === '') return null;
  const cls = TEXT_VARIANT[node.variant ?? 'body'] ?? styles.text ?? '';
  return <div className={cls}>{L(raw)}</div>;
}
