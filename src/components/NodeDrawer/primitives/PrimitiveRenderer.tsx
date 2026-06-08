import type { PrimitiveNode, DrawerContext } from './types';
import { RenderNode } from './RenderNode';

export interface PrimitiveRendererProps {
  layout: PrimitiveNode[];
  context: DrawerContext;
  L: (v: unknown) => string;
  onAction?: (action: string, target: unknown) => void;
}

export function PrimitiveRenderer({ layout, context, L, onAction }: PrimitiveRendererProps): JSX.Element {
  return (
    <>
      {layout.map((node, i) => (
        <RenderNode key={i} node={node} context={context} L={L} onAction={onAction} />
      ))}
    </>
  );
}
