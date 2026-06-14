// Real end-to-end render test for a typed, rubric-driven node map.
//
// This drives the ACTUAL app pipeline: read the JSON fixture ->
// parseSource (the same JSON/YAML parser the viewer uses) -> normalize (the
// same hook normalizer that builds a NormalizedMap) -> render the NodeDrawer.
// It proves that typed nodes (type: "round") render their objective, the
// "Rubrics measured" section, and the inlined rubric names through
// meta.nodeTypes.round.layout — i.e. a list of rubric objects resolves to
// Tiles, never to "Unknown" or an unresolved "$binding".
//
// The fixture is generic, checked-in, and self-contained so the test runs
// anywhere (CI, other machines) and exercises the data-driven drawer the same
// way real rubric maps do.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';

import { parseSource } from '@/lib/parseSource';
import { normalize } from '@/hooks/useViewerState';
import type { NormalizedMap } from '@/types/lifecycle-map';

import { NodeDrawer } from './NodeDrawer';

const MAP_PATH = join(__dirname, '__fixtures__', 'typed-rubric-map.json');

/** Identity-ish localizer matching the app's L contract. */
const L = (v: unknown): string =>
  typeof v === 'string' ? v : String((v as { en?: string })?.en ?? v ?? '');

function loadMap(): NormalizedMap {
  const text = readFileSync(MAP_PATH, 'utf-8');
  return normalize(parseSource(text));
}

describe('typed rubric map renders through the real pipeline', () => {
  it('renders the "deepdive" round: objective, Rubrics measured section, and real rubric names', () => {
    const data = loadMap();

    // Sanity: the typed node type and its layout survived parse + normalize.
    expect(data.meta.nodeTypes?.round).toBeTruthy();
    const round = data.nodes.find((n) => n.id === 'deepdive');
    expect(round).toBeTruthy();
    expect(round?.type).toBe('round');
    // The deep-dive round measures exactly 3 rubrics.
    expect(
      (round?.context as { rubrics?: unknown[] })?.rubrics?.length,
    ).toBe(3);

    const walkOrder = data.nodes.map((n) => n.id);
    const { getByText, getAllByText, queryByText } = render(
      <NodeDrawer
        open
        mode="node"
        data={data}
        activeNodeId="deepdive"
        activeEdge={null}
        walkOrder={walkOrder}
        onClose={() => {}}
        onNavigate={() => {}}
        L={L}
      />,
    );

    // 1. The objective (Prose, bound to $objective) renders.
    expect(
      getByText(/A problem that starts simple and gains constraints as you go/),
    ).toBeInTheDocument();

    // 2. The "Rubrics measured" section title renders.
    expect(getByText('Rubrics measured')).toBeInTheDocument();
    // ...with its sub binding ($rubricsSub) resolved (not the literal "$rubricsSub").
    expect(getByText('signals measured this round')).toBeInTheDocument();
    expect(queryByText('$rubricsSub')).toBeNull();

    // 3. Specific rubric NAMES from the round's context.rubrics render as real
    //    text via the List -> Tile binding ($name): Systems thinking, Problem
    //    decomposition, Debugging.
    //
    //    Note: some rubric names equal one of their own tags (e.g. "Problem
    //    decomposition" carries a tag identical to its name), so the same text
    //    also appears in the Tile's tag Pills. getAllByText asserts it rendered
    //    at least once — the point is the name is real text, never blank/Unknown.
    expect(getByText('Systems thinking')).toBeInTheDocument(); // tag is "Tradeoff reasoning", so unique
    expect(getAllByText('Problem decomposition').length).toBeGreaterThan(0); // name == its own tag
    expect(getAllByText('Debugging').length).toBeGreaterThan(0); // name == its own tag

    // The Tile's $tomorrow sub binding resolved to real text, not the literal.
    expect(
      getByText(/reasons API to backend to DB and what breaks under load/),
    ).toBeInTheDocument();

    // 4. Nothing leaked as an unresolved binding or "Unknown" placeholder.
    expect(queryByText('Unknown')).toBeNull();
    expect(queryByText('$name')).toBeNull();
    expect(queryByText('$objective')).toBeNull();
    expect(queryByText('$rubrics')).toBeNull();
  });
});
