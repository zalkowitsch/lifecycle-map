import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import { loadBundle } from '@/lib/datatables/loadBundle';
import { resolveDatatableRefs } from '@/lib/datatables/resolveDatatableRefs';
import { normalize } from '@/hooks/useViewerState';
import { parseSource } from '@/lib/parseSource';
import { NodeDrawer } from '@/components/NodeDrawer';

const F = (n: string) => readFileSync(join(__dirname, '__fixtures__', n), 'utf-8');
const L = (v: unknown): string => (typeof v === 'string' ? v : String((v as { en?: string })?.en ?? v ?? ''));

describe('datatables integration — bundle → resolve → render', () => {
  it('renders resolved feature rows in the node drawer, with a datatable→datatable ref', () => {
    const bundle = loadBundle([
      { name: 'lifecycle.json', text: F('lifecycle.json') },
      { name: 'features.datatable.json', text: F('features.datatable.json') },
      { name: 'people.datatable.csv', text: F('people.datatable.csv') },
    ]);
    const map = normalize(resolveDatatableRefs(parseSource(bundle.lifecycleText), bundle.registry));

    // feature rows resolved into context.modules, and feat-a.owner resolved to a people row
    const mods = map.nodes[0].context!.modules as Array<Record<string, unknown>>;
    expect(mods[0].name).toBe('Alpha feature');
    expect(mods[0].owner).toEqual({ name: 'Pat Owner', role: 'Engineer' });

    const { getByText, getAllByText } = render(
      <NodeDrawer open mode="node" data={map}
        activeNodeId="n1" activeEdge={null} walkOrder={['n1']}
        onClose={() => {}} onNavigate={() => {}} L={L} />,
    );
    expect(getByText(/Fixture objective text/)).toBeInTheDocument();
    expect(getAllByText('Alpha feature').length).toBeGreaterThan(0);
    expect(getAllByText('Beta feature').length).toBeGreaterThan(0);
  });

  it('degrades a broken ref without crashing', () => {
    const badLifecycle = F('lifecycle.json').replace('"feat-b"', '"does-not-exist"');
    const bundle = loadBundle([
      { name: 'lifecycle.json', text: badLifecycle },
      { name: 'features.datatable.json', text: F('features.datatable.json') },
    ]);
    const map = normalize(resolveDatatableRefs(parseSource(bundle.lifecycleText), bundle.registry));
    const mods = map.nodes[0].context!.modules as Array<Record<string, unknown>>;
    expect(mods[1]).toEqual({ _unresolved: true, table: 'features', id: 'does-not-exist' });
  });
});
