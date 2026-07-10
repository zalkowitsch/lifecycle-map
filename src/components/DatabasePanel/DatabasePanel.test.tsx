import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DatabasePanel, sourceIndexForEntity } from '@/components/DatabasePanel';
import type { NormalizedMap } from '@/types/lifecycle-map';
import type { RawSource } from '@/hooks/useViewerState';

const data = {
  meta: { modes: [{ id: 'Auto', label: 'Auto', color: '#16a34a' }] },
  lanes: [{ id: 'l', label: 'L' }], phases: [{ id: 'p', label: 'P' }],
  nodes: [{ id: 'n1', lane: 'l', phase: 'p', title: 'N', states: {} }],
  edges: [], _modeMap: {}, _moduleCatalog: {},
} as unknown as NormalizedMap;

const sources: RawSource[] = [
  { name: 'map.json', text: '{}', lang: 'json' },
  { name: 'features.json', text: '{"_meta":{"name":"features"},"rows":{}}', lang: 'json' },
];

describe('sourceIndexForEntity', () => {
  it('maps map entities to 0 and features to the features source', () => {
    expect(sourceIndexForEntity(sources, 'lanes')).toBe(0);
    expect(sourceIndexForEntity(sources, 'nodes')).toBe(0);
    expect(sourceIndexForEntity(sources, 'features')).toBe(1);
  });
});

describe('DatabasePanel', () => {
  it('renders tabs and a back control when open', () => {
    render(<DatabasePanel open data={data} rawSources={sources} onClose={vi.fn()} onCommit={vi.fn()} />);
    expect(screen.getByRole('button', { name: /personas/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /steps/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /features/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /nodes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to map/i })).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    const { container } = render(<DatabasePanel open={false} data={data} rawSources={sources} onClose={vi.fn()} onCommit={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('back control calls onClose', () => {
    const onClose = vi.fn();
    render(<DatabasePanel open data={data} rawSources={sources} onClose={onClose} onCommit={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /back to map/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
