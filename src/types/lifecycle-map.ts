import type { PrimitiveNode } from '@/components/NodeDrawer/primitives/types';
import type { DatatableSchema } from '@/lib/datatables/types';

// Lifecycle map schema — the JSON/YAML shape the viewer accepts.
//
// v2 schema (current):
//   - Edges use `source/target` (universal graph convention; aligns with
//     Mermaid, Cytoscape, D3, JGF)
//   - Nodes have `states: { [id]: State }` for arbitrary state count
//   - Nodes can declare a `shape` (rect, diamond, rounded, etc)
//   - Meta has `direction` for layout hint (LR, TB, etc)
//
// v1 schema (legacy, backward-compatible via normalize):
//   - Edges with `from/to`
//   - Nodes with hardcoded `today` + `tomorrow`
//
// Localized strings: any string field can be a plain string or an object
// keyed by 2-letter language code (e.g., { en: "Foo", pt: "Bar" }). The
// L() resolver picks the current language with fallback.

export type LangCode = string;

/** A string that can be plain or localized per language */
export type I18nString = string | { [lang: LangCode]: string };

export interface Mode {
  id: string;
  label: I18nString;
  color: string;
}

export interface Lane {
  id: string;
  label: I18nString;
  sub?: I18nString;
  color?: string;        // optional bg tint for the lane row
}

export interface Phase {
  id: string;
  label: I18nString;
  roman?: string;
  subCols?: number;
  order?: number;        // explicit order; falls back to array index
}

/** A node may be in 0..N states (today/tomorrow/Q2/target/whatever). */
export interface NodeState {
  /** Display label (e.g. "Today", "Q2 2026"). Falls back to the state id. */
  label?: I18nString;
  /** References a Mode id; drives pill color. Optional. */
  mode?: string;
  narrative?: I18nString;
  tools?: I18nString[];
  teams?: I18nString[];
  tickets?: I18nString[];
  proven_pattern?: I18nString[];
}

export interface Module {
  feature?: I18nString;
  name?: I18nString;
  id?: string;
  today?: string;
  tomorrow?: string;
  tags?: I18nString[];
  pricing?: I18nString;
}

export type ModuleRef = string | Module;

/** Node shapes — map to Mermaid flowchart syntax. */
export type NodeShape =
  | 'rect'         // default — `[label]`
  | 'rounded'     // `(label)`
  | 'diamond'     // `{label}` — decision point
  | 'subroutine' // `[[label]]`
  | 'cylinder'   // `[(label)]` — data store
  | 'circle'      // `((label))` — start/end
  | 'hexagon';   // `{{label}}` — important step

export interface MapNode {
  id: string;
  lane: string;
  phase: string;
  col?: number;
  title: I18nString;
  sub?: I18nString;
  objective?: I18nString;
  entity?: I18nString;
  actors?: I18nString;
  triggers?: I18nString;
  next?: I18nString;

  /** Visual shape. Defaults to 'rect'. */
  shape?: NodeShape;

  /**
   * Arbitrary state map. Replaces the v1 today/tomorrow fields.
   * Common keys: 'today', 'tomorrow'. But you can have 'q2', 'target',
   * 'baseline', etc — drawer renders them in the order declared.
   */
  states?: Record<string, NodeState>;

  /** @deprecated v1 — use states.today */
  today?: NodeState;
  /** @deprecated v1 — use states.tomorrow */
  tomorrow?: NodeState;

  /** Free-form notes shown in the drawer + exportable to Mermaid `note over`. */
  notes?: I18nString[];

  modules?: ModuleRef[];

  /** Node type id — selects a layout from meta.nodeTypes. When set, the
   *  drawer renders via PrimitiveRenderer using `context` for data. */
  type?: string;
  /** Data passed to the node type's primitive layout. */
  context?: Record<string, unknown>;
}

/** Edge style — maps to Mermaid arrow flavors. */
export type EdgeStyle = 'solid' | 'dashed' | 'dotted' | 'thick';

export interface MapEdge {
  /** Source node id (v2). Aliased from v1 `from`. */
  source?: string;
  /** Target node id (v2). Aliased from v1 `to`. */
  target?: string;
  /** @deprecated v1 — use `source` */
  from?: string;
  /** @deprecated v1 — use `target` */
  to?: string;

  label?: I18nString;
  style?: EdgeStyle;
  /** Optional kind hint (e.g. 'conditional', 'parallel', 'error'). */
  kind?: string;
}

/** Layout direction. Mermaid-compatible. */
export type Direction = 'LR' | 'RL' | 'TB' | 'BT';

export interface MapMeta {
  title?: I18nString;
  subtitle?: I18nString;
  context?: I18nString;
  modes?: Mode[];
  default_lang?: LangCode;
  modules_source?: string;
  /** Layout direction. Defaults to LR. */
  direction?: Direction;
  /** Map of node-type id -> layout (primitive tree) + optional context ref decls. */
  nodeTypes?: Record<string, {
    layout: PrimitiveNode[];
    /** Declares which context fields are datatable refs, and into which table. */
    contextRefs?: Record<string, { ref: string }>;
  }>;
  /** Declared datatables: CSV schema and/or a fetchable src. */
  datatables?: Record<string, { schema?: DatatableSchema; src?: string }>;
}

export interface LifecycleMap {
  meta?: MapMeta;
  lanes: Lane[];
  phases: Phase[];
  nodes: MapNode[];
  edges: MapEdge[];
  modules?: { [id: string]: Module };
}

/** Internal — normalized map after running normalize(). All v1 fields
 *  collapsed into v2 shape. */
export interface NormalizedMap extends LifecycleMap {
  meta: Required<Pick<MapMeta, 'title' | 'subtitle' | 'context' | 'modes'>> & MapMeta;
  /**
   * Normalized edges always have source/target set (from/to are aliased).
   */
  edges: (MapEdge & { source: string; target: string })[];
  /**
   * Normalized nodes always have a states map; legacy today/tomorrow
   * promoted into states.today / states.tomorrow.
   */
  nodes: (MapNode & { states: Record<string, NodeState> })[];
  _modeMap: Record<string, Mode>;
  _moduleCatalog: Record<string, Module>;
}
