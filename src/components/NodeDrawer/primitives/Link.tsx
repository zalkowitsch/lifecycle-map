import { resolveBinding } from './resolveBinding';
import type { PrimitiveProps } from './types';
import styles from './primitives.module.css';

// Only allow http(s) links — map content is user-supplied, so reject
// javascript:, data:, and other schemes that could execute or smuggle content.
function isSafeHref(href: unknown): href is string {
  return typeof href === 'string' && /^https?:\/\//i.test(href.trim());
}

export function Link({ node, context, L }: PrimitiveProps): JSX.Element | null {
  const label = resolveBinding(node.text, context);
  const href = resolveBinding(node.href, context);
  if (!label || !isSafeHref(href)) return null;
  return (
    <a className={styles.link} href={href} target="_blank" rel="noreferrer">
      {L(label)}
    </a>
  );
}
