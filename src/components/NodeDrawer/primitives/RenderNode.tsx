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

/** Dispatch a single primitive node to its registry component. Unknown types
 *  are omitted with a warning (defensive, like the edge filter). */
export function RenderNode(props: PrimitiveProps): JSX.Element | null {
  const Comp = REGISTRY[props.node.type];
  if (!Comp) {
    console.warn(`Unknown drawer primitive type: "${props.node.type}"`);
    return null;
  }
  return <Comp {...props} />;
}
