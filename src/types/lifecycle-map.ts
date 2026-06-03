// Lifecycle map schema — the JSON/YAML shape the viewer accepts.
//
// Strings can either be plain `string` or a `LocalizedString` (object keyed
// by 2-letter language code). The L() helper resolves them at render time.

export type LangCode = string; // 'en' | 'pt' | 'es' | ...

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
}

export interface Phase {
  id: string;
  label: I18nString;
  roman?: string;
  subCols?: number;
}

export interface NodeState {
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
  today?: NodeState;
  tomorrow?: NodeState;
  modules?: ModuleRef[];
}

export interface MapEdge {
  from: string;
  to: string;
}

export interface MapMeta {
  title?: I18nString;
  subtitle?: I18nString;
  context?: I18nString;
  modes?: Mode[];
  default_lang?: LangCode;
  modules_source?: string;
}

export interface LifecycleMap {
  meta?: MapMeta;
  lanes: Lane[];
  phases: Phase[];
  nodes: MapNode[];
  edges: MapEdge[];
  modules?: { [id: string]: Module };
}

/** Internal — normalized map with caches added during render-prep */
export interface NormalizedMap extends LifecycleMap {
  meta: Required<Pick<MapMeta, 'title' | 'subtitle' | 'context' | 'modes'>> & MapMeta;
  _modeMap: Record<string, Mode>;
  _moduleCatalog: Record<string, Module>;
}
