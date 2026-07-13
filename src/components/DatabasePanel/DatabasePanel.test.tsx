import { useState } from 'react';
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

describe('DatabasePanel undo history survives live commits', () => {
  const histData = {
    meta: { modes: [] },
    lanes: [{ id: 'l', label: 'L' }], phases: [{ id: 'p', label: 'P' }],
    nodes: [{ id: 'n1', lane: 'l', phase: 'p', title: 'N', states: {} }],
    edges: [], _modeMap: {}, _moduleCatalog: {},
  } as unknown as NormalizedMap;

  // Mirrors useViewerState.commitSource: every commit replaces the rawSources
  // ARRAY IDENTITY (same names/count, new text). The panel must NOT wipe its
  // undo history on such an edit — otherwise Cmd+Z can never revert a live edit.
  function Harness(): JSX.Element {
    const [srcs, setSrcs] = useState<RawSource[]>([
      { name: 'map.json', text: JSON.stringify({ lanes: [{ id: 'l', label: 'L' }] }), lang: 'json' },
    ]);
    return (
      <DatabasePanel
        open
        data={histData}
        rawSources={srcs}
        onClose={vi.fn()}
        onCommit={(index, newText) => {
          setSrcs((prev) => {
            const next = prev.slice(); // new array identity, exactly like commitSource
            const t = next[index];
            if (t) next[index] = { ...t, text: newText };
            return next;
          });
        }}
      />
    );
  }

  it('keeps Undo enabled after an edit commits (rawSources identity change must not reset history)', () => {
    render(<Harness />);
    const undoBtn = screen.getByRole('button', { name: /undo/i });
    expect(undoBtn).toBeDisabled();
    // "+ Add row" routes through commitEntity → commitWithHistory → record + onCommit.
    fireEvent.click(screen.getByRole('button', { name: /add row/i }));
    // After the commit re-renders with a new rawSources array, Undo must still be
    // available — the just-recorded history entry must survive.
    expect(screen.getByRole('button', { name: /undo/i })).toBeEnabled();
  });
});

describe('DatabasePanel grid search', () => {
  const searchData = {
    meta: { modes: [] },
    lanes: [
      { id: 'patient', label: 'Patient' },
      { id: 'frontdesk', label: 'Front Desk' },
      { id: 'biller', label: 'Biller' },
    ],
    phases: [{ id: 'p', label: 'P' }],
    nodes: [{ id: 'n1', lane: 'patient', phase: 'p', title: 'N', states: {} }],
    edges: [], _modeMap: {}, _moduleCatalog: {},
  } as unknown as NormalizedMap;
  const searchSources: RawSource[] = [{ name: 'map.json', text: JSON.stringify(searchData), lang: 'json' }];

  it('filters the grid and shows an "N of M" count (Personas tab)', () => {
    render(<DatabasePanel open data={searchData} rawSources={searchSources} onClose={vi.fn()} onCommit={vi.fn()} />);
    // starts unfiltered: "3 rows · live"
    expect(screen.getByText(/3 rows · live/)).toBeInTheDocument();
    const box = screen.getByRole('textbox', { name: /search rows/i });
    fireEvent.change(box, { target: { value: 'front' } });
    // one lane matches → "1 of 3 · live"
    expect(screen.getByText(/1 of 3 · live/)).toBeInTheDocument();
  });

  it('resets the search when switching tabs', () => {
    render(<DatabasePanel open data={searchData} rawSources={searchSources} onClose={vi.fn()} onCommit={vi.fn()} />);
    const box = screen.getByRole('textbox', { name: /search rows/i });
    fireEvent.change(box, { target: { value: 'front' } });
    expect(screen.getByText(/1 of 3 · live/)).toBeInTheDocument();
    // switch to Steps, then back to Personas — the query must have cleared
    fireEvent.click(screen.getByRole('button', { name: /steps/i }));
    fireEvent.click(screen.getByRole('button', { name: /personas/i }));
    expect((screen.getByRole('textbox', { name: /search rows/i }) as HTMLInputElement).value).toBe('');
    expect(screen.getByText(/3 rows · live/)).toBeInTheDocument();
  });

  it('hides the search box on the Nodes tab (unfiltered split)', () => {
    render(<DatabasePanel open data={searchData} rawSources={searchSources} onClose={vi.fn()} onCommit={vi.fn()} />);
    expect(screen.getByRole('textbox', { name: /search rows/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /nodes/i }));
    expect(screen.queryByRole('textbox', { name: /search rows/i })).toBeNull();
  });

  it('shows a source chip naming the file each tab edits (map vs features)', () => {
    const multiSources: RawSource[] = [
      { name: 'my-map.json', text: JSON.stringify(searchData), lang: 'json' },
      { name: 'features.json', text: '{"_meta":{"name":"features"},"rows":{}}', lang: 'json' },
    ];
    render(<DatabasePanel open data={searchData} rawSources={multiSources} onClose={vi.fn()} onCommit={vi.fn()} />);
    // Personas (a map entity) → the map file
    expect(screen.getByTitle(/written to my-map\.json/i)).toBeInTheDocument();
    // Features → the features datatable
    fireEvent.click(screen.getByRole('button', { name: /features/i }));
    expect(screen.getByTitle(/written to features\.json/i)).toBeInTheDocument();
  });
});

describe('DatabasePanel delete confirm + lang hint', () => {
  const data = {
    meta: { modes: [], default_lang: 'en' },
    lanes: [{ id: 'l', label: { en: 'L', pt: 'Le' } }], phases: [{ id: 'p', label: 'P' }],
    nodes: [{ id: 'n1', lane: 'l', phase: 'p', title: 'N', states: {} }], edges: [], _modeMap: {}, _moduleCatalog: {},
  } as any;
  const sources = [{ name: 'map.json', text: JSON.stringify(data), lang: 'json' as const }];

  it('shows a language hint when localized fields exist', () => {
    render(<DatabasePanel open data={data} rawSources={sources} onClose={() => {}} onCommit={() => {}} lang="en" />);
    expect(screen.getByText(/editing:/i)).toBeInTheDocument();
  });
});
