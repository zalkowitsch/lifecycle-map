import DOMPurify from 'dompurify';
import { resolveBinding } from './resolveBinding';
import type { PrimitiveProps } from './types';
import styles from './primitives.module.css';

// Map content comes from user-supplied JSON, so sanitize before rendering.
// Allow only light emphasis — never scripts, attributes, or arbitrary tags.
const ALLOWED = { ALLOWED_TAGS: ['em', 'strong', 'br'], ALLOWED_ATTR: [] };

export function Prose({ node, context, L }: PrimitiveProps): JSX.Element | null {
  const raw = resolveBinding(node.bind, context);
  if (raw === undefined || raw === null || raw === '') return null;
  const clean = DOMPurify.sanitize(L(raw), ALLOWED);
  return <p className={styles.text} dangerouslySetInnerHTML={{ __html: clean }} />;
}
