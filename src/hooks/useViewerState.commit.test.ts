import { describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useViewerState } from '@/hooks/useViewerState';

const mapText = JSON.stringify({
  meta: { modes: [{ id: 'Auto', label: 'Auto', color: '#16a34a' }],
    nodeTypes: { stage: { layout: [], contextRefs: { modules: { ref: 'features' } } } },
    datatables: { features: {} } },
  lanes: [{ id: 'l', label: 'L' }], phases: [{ id: 'p', label: 'P' }],
  nodes: [{ id: 'n1', lane: 'l', phase: 'p', title: 'N', type: 'stage', context: { modules: ['f1'] } }],
  edges: [],
});
const featText = JSON.stringify({ _meta: { name: 'features' }, rows: { f1: { name: 'Orig', tomorrow: 'Auto' } } });

function dropFiles(map: string, feat: string): File[] {
  return [
    new File([map], 'map.json', { type: 'application/json' }),
    new File([feat], 'features.json', { type: 'application/json' }),
  ];
}

describe('multi-source rawSources + commitSource', () => {
  it('DnD keeps both source texts; commitSource on the datatable re-resolves into the node', async () => {
    const { result } = renderHook(() => useViewerState());
    await act(async () => { await result.current.handleFileDrop(dropFiles(mapText, featText)); });
    await waitFor(() => expect(result.current.state.data).toBeTruthy());

    // both sources retained
    expect(result.current.state.rawSources.length).toBe(2);
    const featIdx = result.current.state.rawSources.findIndex((s) => s.name === 'features.json');
    expect(featIdx).toBeGreaterThanOrEqual(0);

    // node initially resolves feature name 'Orig'
    const before = result.current.state.data!.nodes[0].context!.modules as any[];
    expect(before[0].name).toBe('Orig');

    // edit the features source text and commit
    const edited = JSON.stringify({ _meta: { name: 'features' }, rows: { f1: { name: 'Edited', tomorrow: 'Auto' } } });
    await act(async () => { result.current.commitSource(featIdx, edited); });
    await waitFor(() => {
      const after = result.current.state.data!.nodes[0].context!.modules as any[];
      expect(after[0].name).toBe('Edited');
    });
  });

  it('commitSource on parse failure keeps last-good data and surfaces an error', async () => {
    const { result } = renderHook(() => useViewerState());
    await act(async () => { await result.current.handleFileDrop(dropFiles(mapText, featText)); });
    await waitFor(() => expect(result.current.state.data).toBeTruthy());

    const featIdx = result.current.state.rawSources.findIndex((s) => s.name === 'features.json');
    expect(featIdx).toBeGreaterThanOrEqual(0);

    const goodData = result.current.state.data;

    await act(async () => { result.current.commitSource(featIdx, '{ this is not valid json ]'); });

    expect(result.current.state.data).toBe(goodData);
    expect(result.current.state.data).not.toBeNull();
    expect(result.current.state.error).toBeTruthy();
    expect(typeof result.current.state.error).toBe('string');
  });
});
