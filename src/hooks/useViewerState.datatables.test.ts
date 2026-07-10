import { describe, expect, it } from 'vitest';
import { normalize } from '@/hooks/useViewerState';
import { loadBundle } from '@/lib/datatables/loadBundle';
import { resolveDatatableRefs } from '@/lib/datatables/resolveDatatableRefs';
import { parseSource } from '@/lib/parseSource';

// This mirrors what the DnD seam does: loadBundle -> resolveDatatableRefs -> normalize.
const lifecycle = JSON.stringify({
  meta: {
    modes: [{ id: 'Self-Serve', label: 'Self-Serve', color: '#16a34a' }],
    nodeTypes: { stage: { layout: [], contextRefs: { modules: { ref: 'features' } } } },
    datatables: { features: {} },
  },
  lanes: [{ id: 'l', label: 'L' }],
  phases: [{ id: 'p', label: 'P' }],
  nodes: [{ id: 'n1', lane: 'l', phase: 'p', title: 'N', type: 'stage', context: { modules: ['f1'] } }],
  edges: [],
});
const features = JSON.stringify({ _meta: { name: 'features' }, rows: { f1: { name: 'Rules', tomorrow: 'Self-Serve' } } });

describe('datatables end-to-end through the load pipeline', () => {
  it('resolves refs before normalize so a referenced module renders as an object', () => {
    const bundle = loadBundle([
      { name: 'biller.json', text: lifecycle },
      { name: 'features.json', text: features },
    ]);
    const map = resolveDatatableRefs(parseSource(bundle.lifecycleText), bundle.registry);
    const norm = normalize(map);
    const mods = norm.nodes[0].context!.modules as Array<Record<string, unknown>>;
    expect(mods[0]).toEqual({ name: 'Rules', tomorrow: 'Self-Serve' });
    // normalize discovered the referenced module's mode (from the resolved object)
    expect(norm._modeMap['Self-Serve']).toBeTruthy();
  });
});
