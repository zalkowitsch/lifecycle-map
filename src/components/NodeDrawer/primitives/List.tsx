import { resolveBinding } from './resolveBinding';
import type { PrimitiveProps, DrawerContext } from './types';
import { RenderNode } from './RenderNode';

export function List({ node, context, L, onAction }: PrimitiveProps): JSX.Element | null {
  const raw = resolveBinding(node.bind, context);
  const items = Array.isArray(raw) ? raw : [];
  const item = node.item;
  if (items.length === 0 || !item) return null;
  return (
    <>
      {items.map((entry, i) => (
        <RenderNode
          key={i}
          node={item}
          context={entry as DrawerContext}
          L={L}
          onAction={onAction}
        />
      ))}
    </>
  );
}
