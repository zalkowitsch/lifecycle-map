/** A node in a node-type layout tree. `type` selects a primitive; other
 *  fields are either literals or "$"-prefixed bindings resolved against
 *  the node's context. */
export interface PrimitiveNode {
  type: string;
  // common optional fields (not all primitives use all)
  title?: string;
  sub?: string;
  text?: string;
  bind?: string;
  variant?: string;
  href?: string;
  action?: string;
  target?: string;
  pills?: string;
  tags?: string;
  children?: PrimitiveNode[];
  item?: PrimitiveNode;
}

export interface NodeTypeDef {
  layout: PrimitiveNode[];
}

export type DrawerContext = Record<string, unknown>;

/** Props every primitive component receives. */
export interface PrimitiveProps {
  node: PrimitiveNode;
  context: DrawerContext;
  /** i18n resolver passed down from NodeDrawer. */
  L: (v: unknown) => string;
  /** Optional action handler (Button uses it: navigate/copy). */
  onAction?: (action: string, target: unknown) => void;
}
