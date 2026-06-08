import type { PrimitiveProps } from './types';
import { Text } from './Text';
import { Title } from './Title';
import { Prose } from './Prose';
import { KeyValue } from './KeyValue';
import { Pills } from './Pills';
import { Tile } from './Tile';
import { Button } from './Button';
import { Link } from './Link';
import { Section } from './Section';
import { List } from './List';

const REGISTRY: Record<string, (p: PrimitiveProps) => JSX.Element | null> = {
  Text, Title, Prose, KeyValue, Pills, Tile, Button, Link, Section, List,
};

/** Cap on nesting depth — a cyclic/self-referential layout would otherwise
 *  recurse until the stack overflows and white-screens the app. */
const MAX_DEPTH = 32;

/** Dispatch a single primitive node to its registry component. Unknown types
 *  and over-deep nesting are omitted with a warning (defensive: warn + degrade,
 *  never crash — same contract as the Canvas edge filter). */
export function RenderNode(props: PrimitiveProps): JSX.Element | null {
  const depth = props.depth ?? 0;
  if (depth > MAX_DEPTH) {
    console.warn(`[NodeDrawer] layout nesting exceeded ${MAX_DEPTH} levels — possible cyclic node type; stopping.`);
    return null;
  }
  const Comp = REGISTRY[props.node.type];
  if (!Comp) {
    console.warn(`[NodeDrawer] unknown drawer primitive type: "${props.node.type}"`);
    return null;
  }
  return <Comp {...props} />;
}
