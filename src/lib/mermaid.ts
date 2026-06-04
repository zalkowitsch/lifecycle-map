/**
 * Mermaid flowchart converters — interop with the wider Mermaid ecosystem.
 *
 *   toMermaid(map)  → string  (mermaid flowchart text)
 *   fromMermaid(text) → LifecycleMap
 *
 * Mapping decisions:
 *   - Lanes become Mermaid `classDef` + `class` assignments (a tag per lane).
 *   - Phases become Mermaid `subgraph` blocks (visual grouping).
 *   - Nodes use shape syntax: rect = `[]`, rounded = `()`, diamond = `{}`,
 *     subroutine = `[[]]`, cylinder = `[()]`, circle = `(())`, hexagon = `{{}}`.
 *   - Edges use `-->`, `-.->` (dashed), `==>` (thick), with optional `|label|`.
 *   - Direction comes from `meta.direction` (LR default).
 *
 * Roundtrip caveats:
 *   - Mermaid has no first-class `states` concept. toMermaid keeps states
 *     in a multi-line Mermaid `%% note` comment per node; fromMermaid
 *     re-imports them if present.
 *   - Mermaid doesn't have `objective`, `actors`, etc. Those get
 *     serialized as `%% meta:` comments and recovered on parse.
 *   - Localized strings collapse to a single language (en by default) on
 *     export. Import preserves whatever single string was in the source.
 */

import type {
  LifecycleMap,
  MapNode,
  MapEdge,
  MapMeta,
  Lane,
  Phase,
  NodeShape,
  EdgeStyle,
  Direction,
  I18nString,
} from '@/types/lifecycle-map';

// ----- helpers -----

/** Pull an English-or-first-available string from an I18n value. */
function plain(v: I18nString | undefined): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v !== 'object') return String(v);
  if (typeof v.en === 'string') return v.en;
  for (const key of Object.keys(v)) {
    const s = (v as Record<string, unknown>)[key];
    if (typeof s === 'string') return s;
  }
  return '';
}

/** Escape a string so it survives as a Mermaid node label. */
function escapeLabel(s: string): string {
  // Mermaid node text inside [] or () can't contain bare " or [ ]
  return s.replace(/"/g, '&quot;').replace(/[\[\]{}]/g, (m) => `&#${m.charCodeAt(0)};`);
}

/** Wrap node text in the shape brackets. */
function shapeBrackets(shape: NodeShape | undefined, label: string): string {
  const safe = escapeLabel(label);
  switch (shape) {
    case 'rounded':    return `("${safe}")`;
    case 'diamond':    return `{"${safe}"}`;
    case 'subroutine': return `[["${safe}"]]`;
    case 'cylinder':   return `[("${safe}")]`;
    case 'circle':     return `(("${safe}"))`;
    case 'hexagon':    return `{{"${safe}"}}`;
    case 'rect':
    default:           return `["${safe}"]`;
  }
}

/** Edge arrow syntax based on style. */
function edgeArrow(style: EdgeStyle | undefined, label?: string): string {
  const safe = label ? escapeLabel(label) : '';
  switch (style) {
    case 'dashed':
    case 'dotted':
      return safe ? `-. ${safe} .->` : `-.->`;
    case 'thick':
      return safe ? `== ${safe} ==>` : `==>`;
    case 'solid':
    default:
      return safe ? `-->|${safe}|` : '-->';
  }
}

// ----- toMermaid -----

export function toMermaid(map: LifecycleMap): string {
  const dir: Direction = (map.meta?.direction as Direction | undefined) ?? 'LR';
  const lines: string[] = [];

  // Title via Mermaid frontmatter
  const title = plain(map.meta?.title as I18nString | undefined);
  if (title) {
    lines.push('---');
    lines.push(`title: ${title}`);
    lines.push('---');
  }

  lines.push(`flowchart ${dir}`);

  // Group nodes by phase
  const nodesByPhase: Record<string, MapNode[]> = {};
  for (const n of map.nodes) {
    (nodesByPhase[n.phase] ??= []).push(n);
  }

  // Render subgraphs per phase
  for (const phase of map.phases) {
    const phaseNodes = nodesByPhase[phase.id] ?? [];
    if (phaseNodes.length === 0) continue;
    const phaseLabel = plain(phase.label);
    lines.push(`  subgraph ${phase.id}[${escapeLabel(phaseLabel)}]`);
    for (const n of phaseNodes) {
      const label = plain(n.title);
      lines.push(`    ${n.id}${shapeBrackets(n.shape, label)}`);
    }
    lines.push('  end');
  }

  // Render edges
  for (const e of map.edges) {
    const src = e.source ?? e.from;
    const tgt = e.target ?? e.to;
    if (!src || !tgt) continue;
    const arrow = edgeArrow(e.style, plain(e.label));
    lines.push(`  ${src} ${arrow} ${tgt}`);
  }

  // Lane classDef (one class per lane) + class assignments
  if (map.lanes.length > 0) {
    lines.push('');
    for (const lane of map.lanes) {
      const color = lane.color ?? laneColor(lane, map.lanes);
      lines.push(`  classDef lane-${lane.id} fill:${color},stroke:#333`);
    }
    const byLane: Record<string, string[]> = {};
    for (const n of map.nodes) {
      (byLane[n.lane] ??= []).push(n.id);
    }
    for (const [laneId, ids] of Object.entries(byLane)) {
      if (ids.length > 0) lines.push(`  class ${ids.join(',')} lane-${laneId}`);
    }
  }

  // Meta-preserving comments — let fromMermaid recover non-Mermaid fields
  const stash: Record<string, unknown> = {};
  for (const n of map.nodes) {
    const extra: Record<string, unknown> = {};
    if (n.lane) extra.lane = n.lane;
    if (n.sub) extra.sub = n.sub;
    if (n.objective) extra.objective = n.objective;
    if (n.actors) extra.actors = n.actors;
    if (n.triggers) extra.triggers = n.triggers;
    if (n.next) extra.next = n.next;
    if (n.states && Object.keys(n.states).length > 0) extra.states = n.states;
    if (n.modules?.length) extra.modules = n.modules;
    if (n.notes?.length) extra.notes = n.notes;
    if (Object.keys(extra).length > 0) stash[n.id] = extra;
  }
  if (Object.keys(stash).length > 0) {
    lines.push('');
    lines.push('%% lifecycle-map:nodes ' + JSON.stringify(stash));
  }
  // Lanes + modes + meta extras
  const metaStash: Record<string, unknown> = {};
  if (map.meta?.modes?.length) metaStash.modes = map.meta.modes;
  if (map.meta?.subtitle) metaStash.subtitle = map.meta.subtitle;
  if (map.meta?.context) metaStash.context = map.meta.context;
  if (map.meta?.default_lang) metaStash.default_lang = map.meta.default_lang;
  if (Object.keys(metaStash).length > 0) {
    lines.push('%% lifecycle-map:meta ' + JSON.stringify(metaStash));
  }
  if (map.lanes.length > 0) {
    lines.push('%% lifecycle-map:lanes ' + JSON.stringify(map.lanes));
  }

  return lines.join('\n') + '\n';
}

function laneColor(lane: Lane, lanes: Lane[]): string {
  // Stable palette fallback when lane.color absent.
  const palette = ['#e3f2fd', '#fff3e0', '#f3e5f5', '#e8f5e9', '#fce4ec', '#fff9c4', '#e0f7fa', '#f1f8e9'];
  const idx = lanes.findIndex((l) => l.id === lane.id);
  return palette[idx % palette.length] ?? '#eeeeee';
}

// ----- fromMermaid -----

interface ParsedNode {
  id: string;
  shape?: NodeShape;
  label: string;
  phase?: string;
}

interface ParsedEdge {
  source: string;
  target: string;
  label?: string;
  style?: EdgeStyle;
}

export function fromMermaid(text: string): LifecycleMap {
  const lines = text.split(/\r?\n/);
  let dir: Direction = 'LR';
  let title = '';
  const nodes: ParsedNode[] = [];
  const nodeById: Record<string, ParsedNode> = {};
  const edges: ParsedEdge[] = [];
  let currentPhase: string | undefined;
  const phasesById: Record<string, { id: string; label: string }> = {};
  const classOf: Record<string, string> = {}; // nodeId → lane class
  let stashedNodes: Record<string, Record<string, unknown>> = {};
  let stashedMeta: Record<string, unknown> = {};
  let stashedLanes: Lane[] = [];

  // Frontmatter title block
  let i = 0;
  if (lines[0]?.trim() === '---') {
    for (i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line == null) break;
      const t = line.trim();
      if (t === '---') { i++; break; }
      const m = /^title:\s*(.+)$/.exec(t);
      if (m && m[1]) title = m[1];
    }
  }

  for (; i < lines.length; i++) {
    const raw = lines[i];
    if (raw == null) continue;
    const line = raw.trim();
    if (!line) continue;

    // Mermaid-only comments we look for our own
    const stashNodes = /^%%\s*lifecycle-map:nodes\s+(.+)$/.exec(line);
    if (stashNodes && stashNodes[1]) {
      try { stashedNodes = JSON.parse(stashNodes[1]); } catch { /* ignore */ }
      continue;
    }
    const stashMeta = /^%%\s*lifecycle-map:meta\s+(.+)$/.exec(line);
    if (stashMeta && stashMeta[1]) {
      try { stashedMeta = JSON.parse(stashMeta[1]); } catch { /* ignore */ }
      continue;
    }
    const stashLanes = /^%%\s*lifecycle-map:lanes\s+(.+)$/.exec(line);
    if (stashLanes && stashLanes[1]) {
      try { stashedLanes = JSON.parse(stashLanes[1]); } catch { /* ignore */ }
      continue;
    }
    if (line.startsWith('%%')) continue;

    const flow = /^flowchart\s+(LR|RL|TB|BT|TD)\s*$/.exec(line);
    if (flow && flow[1]) { dir = (flow[1] === 'TD' ? 'TB' : flow[1]) as Direction; continue; }

    const sub = /^subgraph\s+(\w[\w-]*)\s*(?:\[(.+)\])?$/.exec(line);
    if (sub && sub[1]) {
      currentPhase = sub[1];
      phasesById[currentPhase] = { id: currentPhase, label: sub[2] ?? currentPhase };
      continue;
    }
    if (line === 'end') { currentPhase = undefined; continue; }

    // classDef lane-XYZ
    if (line.startsWith('classDef')) continue;
    const classLine = /^class\s+([\w,]+)\s+(lane-\w[\w-]*)$/.exec(line);
    if (classLine && classLine[1] && classLine[2]) {
      const ids = classLine[1].split(',');
      const cls = classLine[2];
      for (const id of ids) classOf[id] = cls.replace(/^lane-/, '');
      continue;
    }

    // Node + shape — declared inside subgraph or standalone.
    // Match shapes: id[label], id(label), id{label}, id[[label]], id[(label)], id((label)), id{{label}}
    const nodeMatch = parseNodeLine(line);
    if (nodeMatch) {
      if (!nodeById[nodeMatch.id]) {
        if (currentPhase) nodeMatch.phase = currentPhase;
        nodes.push(nodeMatch);
        nodeById[nodeMatch.id] = nodeMatch;
      } else if (nodeMatch.phase) {
        nodeById[nodeMatch.id]!.phase = nodeMatch.phase;
      }
      continue;
    }

    // Edge: id1 --> id2  /  id1 -->|label| id2  /  id1 -. lbl .-> id2  /  id1 == lbl ==> id2
    const edge = parseEdgeLine(line);
    if (edge) {
      // also pick up nodes declared inline in the edge line
      for (const refId of [edge.source, edge.target]) {
        if (!nodeById[refId]) {
          const n: ParsedNode = { id: refId, label: refId };
          nodes.push(n);
          nodeById[refId] = n;
        }
      }
      edges.push(edge);
      continue;
    }
  }

  // Compose LifecycleMap
  const lanesMap = new Map<string, Lane>();
  for (const lane of stashedLanes) lanesMap.set(lane.id, lane);
  for (const cls of Object.values(classOf)) {
    if (!lanesMap.has(cls)) lanesMap.set(cls, { id: cls, label: cls });
  }
  if (lanesMap.size === 0) {
    lanesMap.set('default', { id: 'default', label: 'Default' });
  }
  const lanes: Lane[] = Array.from(lanesMap.values());

  const phaseList: Phase[] = Object.values(phasesById).map((p) => ({ id: p.id, label: p.label }));
  if (phaseList.length === 0) {
    phaseList.push({ id: 'default', label: 'Default' });
  }

  const mappedNodes: MapNode[] = nodes.map((n) => {
    const stash = stashedNodes[n.id] ?? {};
    const lane = (stash.lane as string | undefined) ?? classOf[n.id] ?? (lanes[0]?.id ?? 'default');
    const phase = n.phase ?? (phaseList[0]?.id ?? 'default');
    const base: MapNode = {
      id: n.id,
      lane,
      phase,
      title: (stash.title as I18nString | undefined) ?? n.label,
      ...(n.shape ? { shape: n.shape } : {}),
    };
    if (stash.sub) base.sub = stash.sub as I18nString;
    if (stash.objective) base.objective = stash.objective as I18nString;
    if (stash.actors) base.actors = stash.actors as I18nString;
    if (stash.triggers) base.triggers = stash.triggers as I18nString;
    if (stash.next) base.next = stash.next as I18nString;
    if (stash.states) base.states = stash.states as MapNode['states'];
    if (stash.modules) base.modules = stash.modules as MapNode['modules'];
    if (stash.notes) base.notes = stash.notes as I18nString[];
    return base;
  });

  const mappedEdges: MapEdge[] = edges.map((e) => ({
    source: e.source,
    target: e.target,
    ...(e.label ? { label: e.label } : {}),
    ...(e.style ? { style: e.style } : {}),
  }));

  return {
    meta: {
      title: title || (stashedMeta.subtitle ? '' : 'Imported from Mermaid'),
      ...(stashedMeta.subtitle ? { subtitle: stashedMeta.subtitle as I18nString } : {}),
      ...(stashedMeta.context ? { context: stashedMeta.context as I18nString } : {}),
      ...(stashedMeta.modes ? { modes: stashedMeta.modes as MapMeta['modes'] } : {}),
      ...(stashedMeta.default_lang ? { default_lang: stashedMeta.default_lang as string } : {}),
      direction: dir,
    },
    lanes,
    phases: phaseList,
    nodes: mappedNodes,
    edges: mappedEdges,
  };
}

function parseNodeLine(line: string): ParsedNode | null {
  const shapes: Array<{ re: RegExp; shape: NodeShape }> = [
    { re: /^(\w[\w-]*)\(\((.+?)\)\)$/, shape: 'circle' },
    { re: /^(\w[\w-]*)\[\[(.+?)\]\]$/, shape: 'subroutine' },
    { re: /^(\w[\w-]*)\[\((.+?)\)\]$/, shape: 'cylinder' },
    { re: /^(\w[\w-]*)\{\{(.+?)\}\}$/, shape: 'hexagon' },
    { re: /^(\w[\w-]*)\{(.+?)\}$/, shape: 'diamond' },
    { re: /^(\w[\w-]*)\((.+?)\)$/, shape: 'rounded' },
    { re: /^(\w[\w-]*)\[(.+?)\]$/, shape: 'rect' },
  ];
  for (const s of shapes) {
    const m = s.re.exec(line);
    if (m && m[1] && m[2] !== undefined) {
      return { id: m[1], shape: s.shape, label: stripQuotes(m[2]) };
    }
  }
  return null;
}

function parseEdgeLine(line: string): ParsedEdge | null {
  // dashed: A -. label .-> B   or  A -.-> B
  const dashed = /^(\w[\w-]*)\s+-\.\s*(.+?)\s*\.->\s*(\w[\w-]*)$/.exec(line)
              ?? /^(\w[\w-]*)\s+-\.->\s*(\w[\w-]*)$/.exec(line);
  if (dashed) {
    if (dashed.length === 4 && dashed[1] && dashed[3]) {
      const label = dashed[2] && dashed[2].trim() ? dashed[2].trim() : undefined;
      const result: ParsedEdge = { source: dashed[1], target: dashed[3], style: 'dashed' };
      if (label) result.label = label;
      return result;
    }
    if (dashed.length === 3 && dashed[1] && dashed[2]) {
      return { source: dashed[1], target: dashed[2], style: 'dashed' };
    }
  }

  // thick: A == lbl ==> B   or  A ==> B
  const thick = /^(\w[\w-]*)\s+==\s*(.+?)\s*==>\s*(\w[\w-]*)$/.exec(line)
             ?? /^(\w[\w-]*)\s+==>\s*(\w[\w-]*)$/.exec(line);
  if (thick) {
    if (thick.length === 4 && thick[1] && thick[3]) {
      const label = thick[2] && thick[2].trim() ? thick[2].trim() : undefined;
      const result: ParsedEdge = { source: thick[1], target: thick[3], style: 'thick' };
      if (label) result.label = label;
      return result;
    }
    if (thick.length === 3 && thick[1] && thick[2]) {
      return { source: thick[1], target: thick[2], style: 'thick' };
    }
  }

  // solid: A -->|label| B  or  A --> B
  const solid = /^(\w[\w-]*)\s+-->\|(.+?)\|\s*(\w[\w-]*)$/.exec(line)
             ?? /^(\w[\w-]*)\s+-->\s*(\w[\w-]*)$/.exec(line);
  if (solid) {
    if (solid.length === 4 && solid[1] && solid[3]) {
      const result: ParsedEdge = { source: solid[1], target: solid[3] };
      if (solid[2]) result.label = solid[2];
      return result;
    }
    if (solid.length === 3 && solid[1] && solid[2]) {
      return { source: solid[1], target: solid[2] };
    }
  }
  return null;
}

function stripQuotes(s: string): string {
  return s.replace(/^"(.*)"$/, '$1').trim();
}
