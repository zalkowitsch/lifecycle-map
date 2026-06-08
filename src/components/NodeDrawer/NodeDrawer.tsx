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
  NormalizedMap,
} from '@/types/lifecycle-map';

import { PrimitiveRenderer } from './primitives/PrimitiveRenderer';

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

  // Typed nodes render their drawer body via the primitive layout declared in
  // meta.nodeTypes. Legacy nodes (no `type`) fall through to the sections below.
  const typeDef = node.type ? data.meta.nodeTypes?.[node.type] : undefined;
  const typedBody =
    typeDef && node.context ? (
      <PrimitiveRenderer
        layout={typeDef.layout}
        context={node.context}
        L={L}
        onAction={(action, target) => {
          if (action === 'navigate' && typeof target === 'string') { onNavigate(target); return; }
          console.warn(`[NodeDrawer] unhandled primitive action: "${action}"`);
        }}
      />
    ) : null;

  const walkIdx = walkOrder.indexOf(nodeId);
  const prevId = walkIdx > 0 ? walkOrder[walkIdx - 1] : null;
  const nextId = walkIdx >= 0 && walkIdx < walkOrder.length - 1
    ? walkOrder[walkIdx + 1]
    : null;

  const subText = L(node.sub);

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

      {typedBody}

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
        {from.next ? (
          <>
            <div className={styles.metaLbl}>Trigger</div>
            <div className={styles.metaVal}>{L(from.next)}</div>
          </>
        ) : null}
        {to.objective ? (
          <>
            <div className={styles.metaLbl}>Becomes</div>
            <div className={styles.metaVal}>{L(to.objective)}</div>
          </>
        ) : null}
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
