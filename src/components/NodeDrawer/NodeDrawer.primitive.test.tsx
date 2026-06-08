/// <reference types="vitest/globals" />
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { NodeDrawer } from './NodeDrawer';
import type { NormalizedMap } from '@/types/lifecycle-map';

const L = (v: unknown): string =>
  typeof v === 'string' ? v : String((v as { en?: string })?.en ?? v ?? '');

function makeData(): NormalizedMap {
  return {
    meta: {
      title: 'T', subtitle: '', context: '', modes: [],
      nodeTypes: {
        'interview-round': {
          layout: [
            { type: 'Section', title: 'Rubrics', children: [
              { type: 'List', bind: '$rubrics', item: { type: 'Tile', title: '$name', sub: '$id' } },
            ] },
          ],
        },
      },
    },
    lanes: [{ id: 'l', label: 'L' }],
    phases: [{ id: 'p', label: 'P' }],
    nodes: [
      {
        id: 'coding', lane: 'l', phase: 'p', title: 'Coding', type: 'interview-round',
        context: { rubrics: [{ name: 'Code fluency', id: 'rubric:code-fluency' }] },
        states: {},
      },
    ],
    edges: [],
    _modeMap: {},
    _moduleCatalog: {},
  } as unknown as NormalizedMap;
}

describe('NodeDrawer with a typed node', () => {
  it('renders the node type layout (Section + List + Tile) from context', () => {
    const data = makeData();
    const { getByText } = render(
      <NodeDrawer
        open mode="node" data={data} activeNodeId="coding" activeEdge={null}
        walkOrder={['coding']} onClose={() => {}} onNavigate={() => {}} L={L}
      />,
    );
    expect(getByText('Rubrics')).toBeInTheDocument();
    expect(getByText('Code fluency')).toBeInTheDocument();
    expect(getByText('rubric:code-fluency')).toBeInTheDocument();
  });
});
