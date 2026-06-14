// Real end-to-end render test for a typed, stage-driven node map.
//
// This drives the ACTUAL app pipeline: read the JSON fixture ->
// parseSource (the same JSON/YAML parser the viewer uses) -> normalize (the
// same hook normalizer that builds a NormalizedMap) -> render the NodeDrawer.
// It proves that typed nodes (type: "stage") render their objective, the
// "Features" and "States" sections, the inlined feature/state names, and the
// Today/Tomorrow narratives through meta.nodeTypes.stage.layout — i.e. a list
// of module/state objects resolves to Tiles and a narrative string resolves to
// Prose, never to "Unknown" or an unresolved "$binding".
//
// This mirrors the shape of the real (proprietary, out-of-repo) biller
// lifecycle map, which was migrated to this same typed "stage" model. The
// fixture here is generic, checked-in, and self-contained so the test runs
// anywhere (CI, other machines) and exercises the SAME layout shape the biller
// map renders through.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';

import { parseSource } from '@/lib/parseSource';
import { normalize } from '@/hooks/useViewerState';
import type { NormalizedMap } from '@/types/lifecycle-map';

import { NodeDrawer } from './NodeDrawer';

const MAP_PATH = join(__dirname, '__fixtures__', 'typed-stage-map.json');

/** Identity-ish localizer matching the app's L contract. */
const L = (v: unknown): string =>
  typeof v === 'string' ? v : String((v as { en?: string })?.en ?? v ?? '');

function loadMap(): NormalizedMap {
  const text = readFileSync(MAP_PATH, 'utf-8');
  return normalize(parseSource(text));
}

describe('typed stage map renders through the real pipeline', () => {
  it('renders the "revenue" stage: objective, Features + States sections, feature names, and Today/Tomorrow narratives', () => {
    const data = loadMap();

    // Sanity: the typed node type and its layout survived parse + normalize.
    expect(data.meta.nodeTypes?.stage).toBeTruthy();
    const stage = data.nodes.find((n) => n.id === 'revenue');
    expect(stage).toBeTruthy();
    expect(stage?.type).toBe('stage');
    // The revenue stage owns exactly 2 features (modules) and 2 states.
    expect(
      (stage?.context as { modules?: unknown[] })?.modules?.length,
    ).toBe(2);
    expect(
      (stage?.context as { states?: unknown[] })?.states?.length,
    ).toBe(2);

    const walkOrder = data.nodes.map((n) => n.id);
    const { getByText, getAllByText, queryByText } = render(
      <NodeDrawer
        open
        mode="node"
        data={data}
        activeNodeId="revenue"
        activeEdge={null}
        walkOrder={walkOrder}
        onClose={() => {}}
        onNavigate={() => {}}
        L={L}
      />,
    );

    // 1. The objective (Prose, bound to $objective) renders.
    expect(
      getByText(/turns completed work into recognized revenue/),
    ).toBeInTheDocument();
    // ...with the Features section sub binding ($modulesSub) resolved (not literal).
    expect(getByText('what this stage can do')).toBeInTheDocument();
    expect(queryByText('$modulesSub')).toBeNull();

    // 2. The "Features" section title renders, and at least one feature Tile
    //    name from context.modules resolves to real text via $name.
    expect(getByText('Features')).toBeInTheDocument();
    expect(getAllByText('Invoicing engine').length).toBeGreaterThan(0);
    expect(getAllByText('Payment capture').length).toBeGreaterThan(0);
    // The Tile's $tomorrow sub binding resolved to real text, not the literal.
    expect(
      getByText(/issues correct invoices automatically/),
    ).toBeInTheDocument();

    // 3. The "States" section renders with its state Tiles (label via $label,
    //    mode via $mode), plus the "Today" and "Tomorrow" section titles.
    expect(getByText('States')).toBeInTheDocument();
    expect(getAllByText('Draft').length).toBeGreaterThan(0);
    expect(getAllByText('Settled').length).toBeGreaterThan(0);
    expect(getByText('Today')).toBeInTheDocument();
    expect(getByText('Tomorrow')).toBeInTheDocument();

    // 4. The today narrative (Prose, bound to $todayNarrative) renders as real text.
    expect(
      getByText(/runs on spreadsheets and manual chase-ups/),
    ).toBeInTheDocument();
    // ...and so does the tomorrow narrative ($tomorrowNarrative).
    expect(
      getByText(/invoicing and capture run themselves/),
    ).toBeInTheDocument();

    // 5. Nothing leaked as an unresolved binding or "Unknown" placeholder.
    expect(queryByText('Unknown')).toBeNull();
    expect(queryByText('$name')).toBeNull();
    expect(queryByText('$objective')).toBeNull();
    expect(queryByText('$modules')).toBeNull();
    expect(queryByText('$states')).toBeNull();
    expect(queryByText('$todayNarrative')).toBeNull();
    expect(queryByText('$tomorrowNarrative')).toBeNull();
  });
});
