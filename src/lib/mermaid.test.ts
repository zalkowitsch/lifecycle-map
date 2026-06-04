// Tests for src/lib/mermaid.ts — toMermaid + fromMermaid.

import { describe, it, expect } from 'vitest';

import { fromMermaid, toMermaid } from './mermaid';
import type { LifecycleMap } from '@/types/lifecycle-map';

function sample(): LifecycleMap {
  return {
    meta: {
      title: 'Hiring',
      direction: 'LR',
    },
    lanes: [
      { id: 'sourcer', label: 'Sourcer' },
      { id: 'recruiter', label: 'Recruiter' },
    ],
    phases: [
      { id: 'sourcing', label: 'Sourcing' },
      { id: 'screen', label: 'Screen' },
    ],
    nodes: [
      { id: 'src', lane: 'sourcer', phase: 'sourcing', title: 'Source candidates' },
      {
        id: 'apply',
        lane: 'sourcer',
        phase: 'sourcing',
        title: 'Application',
        shape: 'rounded',
      },
      {
        id: 'gate',
        lane: 'recruiter',
        phase: 'screen',
        title: 'Decision',
        shape: 'diamond',
      },
      { id: 'resume', lane: 'recruiter', phase: 'screen', title: 'Resume screen' },
    ],
    edges: [
      { source: 'src', target: 'apply' },
      { source: 'apply', target: 'gate', label: 'submitted' },
      { source: 'gate', target: 'resume', style: 'dashed' },
    ],
  };
}

describe('toMermaid', () => {
  it('emits a flowchart directive with the requested direction', () => {
    const out = toMermaid(sample());
    expect(out).toMatch(/^---[\s\S]*?title: Hiring[\s\S]*?---\nflowchart LR/);
  });

  it('emits subgraphs for phases with node ids inside', () => {
    const out = toMermaid(sample());
    expect(out).toMatch(/subgraph sourcing\[Sourcing\][\s\S]*src\["Source candidates"\][\s\S]*end/);
    expect(out).toMatch(/subgraph screen\[Screen\][\s\S]*gate\{"Decision"\}[\s\S]*end/);
  });

  it('uses shape brackets for each node type', () => {
    const out = toMermaid(sample());
    expect(out).toContain('apply("Application")');
    expect(out).toContain('gate{"Decision"}');
    // default rect
    expect(out).toContain('src["Source candidates"]');
  });

  it('emits edges with labels and styles', () => {
    const out = toMermaid(sample());
    expect(out).toContain('src --> apply');
    expect(out).toContain('apply -->|submitted| gate');
    expect(out).toContain('gate -.-> resume');
  });

  it('emits classDef + class lines per lane', () => {
    const out = toMermaid(sample());
    expect(out).toMatch(/classDef lane-sourcer fill:/);
    expect(out).toMatch(/classDef lane-recruiter fill:/);
    expect(out).toMatch(/class src,apply lane-sourcer/);
    expect(out).toMatch(/class gate,resume lane-recruiter/);
  });

  it('stashes rich fields in a comment for roundtrip', () => {
    const map = sample();
    map.nodes[0]!.objective = 'Build the funnel';
    map.nodes[0]!.states = { today: { mode: 'manual', narrative: 'manual outreach' } };
    const out = toMermaid(map);
    expect(out).toContain('%% lifecycle-map:nodes ');
    expect(out).toContain('"objective":"Build the funnel"');
    expect(out).toContain('"states"');
  });
});

describe('fromMermaid', () => {
  it('parses direction from flowchart directive', () => {
    const map = fromMermaid('flowchart TB\nA[Start] --> B[End]\n');
    expect(map.meta?.direction).toBe('TB');
  });

  it('treats TD as TB', () => {
    const map = fromMermaid('flowchart TD\nA --> B\n');
    expect(map.meta?.direction).toBe('TB');
  });

  it('parses nodes with shapes when declared on their own line', () => {
    const text = [
      'flowchart LR',
      'A[Square]',
      'B(Round)',
      'C{Diamond}',
      'A --> B',
      'B --> C',
    ].join('\n');
    const map = fromMermaid(text);
    const ids = map.nodes.map((n) => n.id);
    expect(ids).toEqual(expect.arrayContaining(['A', 'B', 'C']));
    const byId = Object.fromEntries(map.nodes.map((n) => [n.id, n]));
    expect(byId.A?.shape).toBe('rect');
    expect(byId.B?.shape).toBe('rounded');
    expect(byId.C?.shape).toBe('diamond');
  });

  it('parses subgraphs as phases', () => {
    const map = fromMermaid(
      'flowchart LR\nsubgraph s1[Sourcing]\nA[Apply]\nend\nsubgraph s2[Screen]\nB[Review]\nend\nA --> B\n',
    );
    expect(map.phases.map((p) => p.id)).toEqual(['s1', 's2']);
    const byId = Object.fromEntries(map.nodes.map((n) => [n.id, n]));
    expect(byId.A?.phase).toBe('s1');
    expect(byId.B?.phase).toBe('s2');
  });

  it('parses edges with labels', () => {
    const map = fromMermaid('flowchart LR\nA --> B\nA -->|submitted| C\n');
    const labeled = map.edges.find((e) => e.target === 'C');
    expect(labeled?.label).toBe('submitted');
  });

  it('parses dashed and thick edges', () => {
    const map = fromMermaid('flowchart LR\nA -.-> B\nC ==> D\n');
    const dashed = map.edges.find((e) => e.source === 'A');
    const thick = map.edges.find((e) => e.source === 'C');
    expect(dashed?.style).toBe('dashed');
    expect(thick?.style).toBe('thick');
  });

  it('infers lane from class assignment', () => {
    const text = [
      'flowchart LR',
      'A[X]',
      'B[Y]',
      'classDef lane-team1 fill:#fff',
      'class A,B lane-team1',
    ].join('\n');
    const map = fromMermaid(text);
    const byId = Object.fromEntries(map.nodes.map((n) => [n.id, n]));
    expect(byId.A?.lane).toBe('team1');
    expect(byId.B?.lane).toBe('team1');
    expect(map.lanes.find((l) => l.id === 'team1')).toBeDefined();
  });

  it('recovers stashed node fields via comment', () => {
    const map = sample();
    map.nodes[0]!.objective = 'Build the funnel';
    map.nodes[0]!.states = { today: { mode: 'manual', narrative: 'manual outreach' } };
    const mmd = toMermaid(map);
    const back = fromMermaid(mmd);
    const src = back.nodes.find((n) => n.id === 'src');
    expect(src?.objective).toBe('Build the funnel');
    expect(src?.states?.today?.narrative).toBe('manual outreach');
  });
});

describe('mermaid roundtrip', () => {
  it('preserves nodes, edges, lanes, phases, direction, shape', () => {
    const map = sample();
    const text = toMermaid(map);
    const back = fromMermaid(text);

    expect(back.meta?.direction).toBe('LR');
    expect(back.phases.map((p) => p.id).sort()).toEqual(['screen', 'sourcing']);

    const nodeIds = back.nodes.map((n) => n.id).sort();
    expect(nodeIds).toEqual(['apply', 'gate', 'resume', 'src']);

    const byId = Object.fromEntries(back.nodes.map((n) => [n.id, n]));
    expect(byId.gate?.shape).toBe('diamond');
    expect(byId.apply?.shape).toBe('rounded');

    expect(byId.src?.lane).toBe('sourcer');
    expect(byId.gate?.lane).toBe('recruiter');

    const labeled = back.edges.find((e) => e.source === 'apply' && e.target === 'gate');
    expect(labeled?.label).toBe('submitted');

    const dashed = back.edges.find((e) => e.source === 'gate' && e.target === 'resume');
    expect(dashed?.style).toBe('dashed');
  });
});
