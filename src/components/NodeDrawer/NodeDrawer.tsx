// NodeDrawer — right-side details drawer for a node or an edge.
//
// Mirrors viewer.js `renderDrawer` (~line 2233) and `renderEdgeDrawer`
// (~line 2295). Receives the normalized map plus the current selection
// from the parent, looks up lane/phase/upstream/downstream locally, and
// emits navigation events for the parent to handle (so this component
// stays presentational).
//
// Escape closes the drawer. Click on a dep entry or a prev/next button
// fires `onNavigate(nodeId)`.

import { useEffect, useMemo } from 'react';

import type {
  MapNode,
  Module,
  ModuleRef,
  NormalizedMap,
  NodeState,
  I18nString,
} from '@/types/lifecycle-map';

import styles from './NodeDrawer.module.css';

export interface NodeDrawerProps {
  open: boolean;
  mode: 'node' | 'edge' | null;
  data: NormalizedMap;
  activeNodeId: string | null;
  activeEdge: { from: string; to: string } | null;
  walkOrder: string[];
  onClose: () => void;
  onNavigate: (nodeId: string) => void;
  L: (v: unknown) => string;
}

interface ResolvedModule extends Module {
  id?: string;
}

export function NodeDrawer(props: NodeDrawerProps): JSX.Element | null {
  const {
    open, mode, data, activeNodeId, activeEdge, walkOrder,
    onClose, onNavigate, L,
  } = props;

  // Escape closes — only while open, only at the drawer level (parent may
  // also bind Escape; the harmless double-close is intentional).
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Build node/lane/phase lookup once per data ref.
  const lookups = useMemo(() => {
    const nodeById: Record<string, MapNode> = {};
    for (const n of data.nodes) nodeById[n.id] = n;
    const laneById: Record<string, NormalizedMap['lanes'][number]> = {};
    for (const l of data.lanes) laneById[l.id] = l;
    const phaseById: Record<string, NormalizedMap['phases'][number]> = {};
    for (const p of data.phases) phaseById[p.id] = p;
    return { nodeById, laneById, phaseById };
  }, [data]);

  if (!open || mode === null) return null;

  const className = open ? `${styles.drawer} ${styles.open}` : styles.drawer;

  return (
    <aside
      className={className}
      aria-hidden={open ? 'false' : 'true'}
      role="complementary"
    >
      <button
        type="button"
        className={styles.close}
        onClick={onClose}
        aria-label="Close"
      >
        ×
      </button>
      <div className={styles.inner}>
        {mode === 'node' && activeNodeId
          ? renderNode(activeNodeId, lookups, walkOrder, data, L, onNavigate)
          : null}
        {mode === 'edge' && activeEdge
          ? renderEdge(activeEdge, lookups, L, onNavigate)
          : null}
      </div>
    </aside>
  );
}

// ----- node body ------------------------------------------------------------

function renderNode(
  nodeId: string,
  lookups: NodeLookups,
  walkOrder: string[],
  data: NormalizedMap,
  L: (v: unknown) => string,
  onNavigate: (id: string) => void,
): JSX.Element | null {
  const node = lookups.nodeById[nodeId];
  if (!node) return null;
  const lane = lookups.laneById[node.lane];
  const phase = lookups.phaseById[node.phase];
  if (!lane || !phase) return null;

  const up = data.edges.filter((e) => e.target === nodeId).map((e) => e.source);
  const down = data.edges.filter((e) => e.source === nodeId).map((e) => e.target);

  const walkIdx = walkOrder.indexOf(nodeId);
  const prevId = walkIdx > 0 ? walkOrder[walkIdx - 1] : null;
  const nextId = walkIdx >= 0 && walkIdx < walkOrder.length - 1
    ? walkOrder[walkIdx + 1]
    : null;

  const subText = L(node.sub);
  const hasMeta = !!(node.objective || node.entity || node.actors || node.triggers || node.next);

  return (
    <>
      <div className={styles.stepTag}>
        <span className={styles.roman}>{phase.roman ?? ''}</span>
        <span className={styles.sep}>·</span>
        <span>{`Step ${walkIdx + 1} / ${walkOrder.length}`}</span>
        <span className={styles.sep}>·</span>
        <span>{L(phase.label)}</span>
        <span className={styles.sep}>·</span>
        <span>{L(lane.label)}</span>
      </div>

      <h2 className={styles.title}>{L(node.title)}</h2>
      {subText ? <p className={styles.subTitle}>{subText}</p> : null}

      {hasMeta ? (
        <div className={styles.metaGrid}>
          {renderMetaRow('Objective', node.objective, L)}
          {renderMetaRow('Entities', node.entity, L)}
          {renderMetaRow('Actors', node.actors, L)}
          {renderMetaRow('Triggers', node.triggers, L)}
          {renderMetaRow('Next', node.next, L)}
        </div>
      ) : null}

      {renderStates(node, data, L)}

      {node.modules && node.modules.length > 0 ? (
        <div className={styles.modulesSection}>
          <h3 className={styles.modulesHeader}>
            {'Modules '}
            <em>{`· ${node.modules.length}`}</em>
          </h3>
          <div className={styles.modulesSub}>features that make this step work</div>
          {node.modules.map((m, i) => (
            <ModuleRow key={i} mRef={m} catalog={data._moduleCatalog} modes={data._modeMap} L={L} />
          ))}
        </div>
      ) : null}

      <div className={styles.depsSection}>
        <div className={styles.depCol}>
          <div className={styles.depLbl}>Depends on</div>
          {up.length === 0 ? (
            <span className={styles.depEmpty}>— entry point</span>
          ) : (
            up.map((uid) => {
              const upNode = lookups.nodeById[uid];
              if (!upNode) return null;
              return (
                <button
                  key={uid}
                  type="button"
                  className={styles.dep}
                  onClick={() => onNavigate(uid)}
                >
                  {`← ${L(upNode.title)}`}
                </button>
              );
            })
          )}
        </div>
        <div className={styles.depCol}>
          <div className={styles.depLbl}>Triggers</div>
          {down.length === 0 ? (
            <span className={styles.depEmpty}>— terminal</span>
          ) : (
            down.map((did) => {
              const dNode = lookups.nodeById[did];
              if (!dNode) return null;
              return (
                <button
                  key={did}
                  type="button"
                  className={styles.dep}
                  onClick={() => onNavigate(did)}
                >
                  {`→ ${L(dNode.title)}`}
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className={styles.nav}>
        <button
          type="button"
          className={styles.navBtn}
          disabled={!prevId}
          onClick={() => { if (prevId) onNavigate(prevId); }}
        >
          ← Prev
        </button>
        <button
          type="button"
          className={styles.navBtn}
          disabled={!nextId}
          onClick={() => { if (nextId) onNavigate(nextId); }}
        >
          Next →
        </button>
      </div>
    </>
  );
}

function renderMetaRow(
  label: string,
  value: I18nString | undefined,
  L: (v: unknown) => string,
): JSX.Element | null {
  if (!value) return null;
  return (
    <>
      <div className={styles.metaLbl}>{label}</div>
      <div className={styles.metaVal}>{L(value)}</div>
    </>
  );
}

// ----- state sections -------------------------------------------------------
//
// Renders every entry under node.states as its own section. The known keys
// "today" / "tomorrow" preserve the original eyebrow/title styling and the
// tomorrow accent; arbitrary state ids fall back to titleizing the key.

function renderStates(
  node: MapNode,
  data: NormalizedMap,
  L: (v: unknown) => string,
): JSX.Element[] {
  const states = node.states ?? {};
  const ids = orderStateIds(Object.keys(states));
  return ids.map((id) => {
    const state = states[id];
    if (!state) return null as unknown as JSX.Element;
    return (
      <StateSection
        key={id}
        stateId={id}
        state={state}
        data={data}
        L={L}
      />
    );
  }).filter(Boolean);
}

function orderStateIds(ids: string[]): string[] {
  // Keep the canonical today → tomorrow order when present, then append
  // the rest in declaration order (preserves author intent for custom ids).
  const preferred = ['today', 'tomorrow'];
  const known = preferred.filter((k) => ids.includes(k));
  const rest = ids.filter((k) => !preferred.includes(k));
  return [...known, ...rest];
}

function StateSection(props: {
  stateId: string;
  state: NodeState;
  data: NormalizedMap;
  L: (v: unknown) => string;
}): JSX.Element {
  const { stateId, state, data, L } = props;
  const narrative = L(state.narrative);
  const tools = state.tools ?? [];
  const teams = state.teams ?? [];
  const tickets = state.tickets ?? [];
  const pattern = state.proven_pattern ?? [];
  const hasTools = tools.length || teams.length || tickets.length || pattern.length;

  const isTomorrow = stateId === 'tomorrow';
  const className = isTomorrow
    ? `${styles.stateSection} ${styles.tomorrow}`
    : styles.stateSection;

  const { eyebrow, title } = stateLabels(stateId, state, L);

  return (
    <div className={className}>
      <div className={styles.stateHead}>
        <div className={styles.stateHeadLabel}>
          <span className={styles.eyebrow}>{eyebrow}</span>
          <span className={styles.stateTitle}>{title}</span>
        </div>
        <ModePill modeId={state.mode} modes={data._modeMap} L={L} />
      </div>
      <div className={styles.stateBody}>
        {narrative}
        {hasTools ? (
          <div className={styles.toolset}>
            <ToolsetRow label="Tools" items={tools} L={L} />
            <ToolsetRow label="Owners" items={teams} L={L} />
            <ToolsetRow label="Tickets" items={tickets} L={L} />
            <ToolsetRow label="Proven pattern" items={pattern} L={L} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function stateLabels(
  stateId: string,
  state: NodeState,
  L: (v: unknown) => string,
): { eyebrow: string; title: JSX.Element | string } {
  if (stateId === 'today') {
    return { eyebrow: 'Today', title: 'Current state' };
  }
  if (stateId === 'tomorrow') {
    return { eyebrow: 'Tomorrow', title: <em>Future state</em> };
  }
  const customLabel = L(state.label);
  return {
    eyebrow: titleize(stateId),
    title: customLabel || titleize(stateId),
  };
}

function titleize(id: string): string {
  return id
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function ToolsetRow(props: {
  label: string;
  items: I18nString[];
  L: (v: unknown) => string;
}): JSX.Element | null {
  if (!props.items.length) return null;
  return (
    <div>
      <span className={styles.toolsetTag}>{props.label}</span>
      {props.items.map((it, i) => (
        <span key={i} className={styles.toolsetItem}>{props.L(it)}</span>
      ))}
    </div>
  );
}

// ----- mode pill ------------------------------------------------------------

function ModePill(props: {
  modeId: string | undefined;
  modes: Record<string, { id: string; label: I18nString; color: string }>;
  L: (v: unknown) => string;
}): JSX.Element | null {
  const { modeId, modes, L } = props;
  if (!modeId) return null;
  const m = modes[modeId];
  const color = m?.color ?? '#6b6557';
  const label = m ? L(m.label) : modeId;
  // Color overrides (tinted background, tinted text, tinted border) come
  // from the node's `mode` color — keep them inline since they're data-driven.
  const style = {
    background: `${color}22`,
    color,
    borderColor: color,
  } as const;
  return (
    <span className={styles.modePill} style={style}>{label}</span>
  );
}

// ----- module row -----------------------------------------------------------

function resolveModule(
  ref: ModuleRef,
  catalog: Record<string, Module>,
): ResolvedModule {
  if (typeof ref === 'string') {
    const entry = catalog[ref];
    if (entry) {
      return { id: ref, feature: entry.name ?? ref, ...entry };
    }
    return { id: ref, feature: ref, today: 'unknown', tomorrow: 'unknown', tags: [] };
  }
  return ref;
}

function ModuleRow(props: {
  mRef: ModuleRef;
  catalog: Record<string, Module>;
  modes: Record<string, { id: string; label: I18nString; color: string }>;
  L: (v: unknown) => string;
}): JSX.Element {
  const m = resolveModule(props.mRef, props.catalog);
  const tags = m.tags ?? [];
  return (
    <div className={styles.moduleRow}>
      <div>
        <div className={styles.moduleName}>{props.L(m.feature ?? m.name ?? '')}</div>
        {m.id ? <div className={styles.moduleId}>{m.id}</div> : null}
        <div className={styles.moduleMeta}>
          {tags.map((t, i) => (
            <span key={i} className={styles.tagChip}>{props.L(t)}</span>
          ))}
          {m.pricing ? (
            <span className={`${styles.tagChip} ${styles.pricing}`}>{props.L(m.pricing)}</span>
          ) : null}
        </div>
      </div>
      <div className={styles.moduleModes}>
        <ModePill modeId={m.today} modes={props.modes} L={props.L} />
        <span className={styles.moduleArrow}>→</span>
        <ModePill modeId={m.tomorrow} modes={props.modes} L={props.L} />
      </div>
    </div>
  );
}

// ----- edge body ------------------------------------------------------------

interface NodeLookups {
  nodeById: Record<string, MapNode>;
  laneById: Record<string, NormalizedMap['lanes'][number]>;
  phaseById: Record<string, NormalizedMap['phases'][number]>;
}

function renderEdge(
  edge: { from: string; to: string },
  lookups: NodeLookups,
  L: (v: unknown) => string,
  onNavigate: (id: string) => void,
): JSX.Element | null {
  const from = lookups.nodeById[edge.from];
  const to = lookups.nodeById[edge.to];
  if (!from || !to) return null;
  const fromLane = lookups.laneById[from.lane];
  const fromPhase = lookups.phaseById[from.phase];
  const toLane = lookups.laneById[to.lane];
  const toPhase = lookups.phaseById[to.phase];
  if (!fromLane || !fromPhase || !toLane || !toPhase) return null;

  const samePhase = from.phase === to.phase;
  const sameLane = from.lane === to.lane;
  const backward = isBackward(from, to, lookups.phaseById);
  const flowKind = backward
    ? (samePhase ? 'loops back within the same phase' : 'loops back across phases')
    : (samePhase
      ? (sameLane ? 'continues within the same actor' : 'hands off to another actor')
      : 'advances to the next phase');

  return (
    <>
      <div className={styles.stepTag}>
        <span className={styles.roman}>{`${fromPhase.roman ?? ''} → ${toPhase.roman ?? ''}`}</span>
        <span className={styles.sep}>·</span>
        <span>Connection</span>
        <span className={styles.sep}>·</span>
        <span>{backward ? 'backward' : 'forward'} flow</span>
      </div>
      <h2 className={styles.title}>
        {L(from.title)} <em>→</em> {L(to.title)}
      </h2>
      <p className={styles.subTitle}>{flowKind}</p>
      <div className={styles.metaGrid}>
        <div className={styles.metaLbl}>From</div>
        <div className={styles.metaVal}>
          <strong>{L(from.title)}</strong>{' · '}{L(fromLane.label)}{' · '}{L(fromPhase.label)}
        </div>
        <div className={styles.metaLbl}>To</div>
        <div className={styles.metaVal}>
          <strong>{L(to.title)}</strong>{' · '}{L(toLane.label)}{' · '}{L(toPhase.label)}
        </div>
        {renderMetaRow('Trigger', from.next, L)}
        {renderMetaRow('Becomes', to.objective, L)}
      </div>
      <div className={styles.nav}>
        <button
          type="button"
          className={styles.navBtn}
          onClick={() => onNavigate(from.id)}
        >
          {`Inspect ${L(from.title)} →`}
        </button>
        <button
          type="button"
          className={styles.navBtn}
          onClick={() => onNavigate(to.id)}
        >
          {`Inspect ${L(to.title)} →`}
        </button>
      </div>
    </>
  );
}

/** Phase order check — `from.phase` strictly after `to.phase` is backward.
 *  Mirrors viewer.js `isBackward`. Uses index in `data.phases`. */
function isBackward(
  from: MapNode,
  to: MapNode,
  phaseById: Record<string, NormalizedMap['phases'][number]>,
): boolean {
  // No reliable phase array here; use insertion order via Object.keys.
  const keys = Object.keys(phaseById);
  const fi = keys.indexOf(from.phase);
  const ti = keys.indexOf(to.phase);
  if (fi < 0 || ti < 0) return false;
  return fi > ti;
}

export default NodeDrawer;
