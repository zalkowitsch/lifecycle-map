// NodeDrawer tests — covers node-mode + edge-mode renderings, navigation,
// keyboard close, and the various meta/today/tomorrow/modules/deps branches.

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { NormalizedMap } from '@/types/lifecycle-map';

import { NodeDrawer } from './NodeDrawer';

/** Identity localizer — accepts strings, objects, arrays. */
const L = (v: unknown): string => {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v.map(L).join(', ');
  if (typeof v === 'object') {
    const map = v as Record<string, unknown>;
    if (typeof map.en === 'string') return map.en;
    for (const k of Object.keys(map)) {
      if (typeof map[k] === 'string') return map[k] as string;
    }
  }
  return String(v);
};

function makeData(): NormalizedMap {
  return {
    meta: {
      title: 'Test',
      subtitle: '',
      context: '',
      modes: [
        { id: 'manual', label: 'Manual', color: '#b00' },
        { id: 'ai', label: 'AI', color: '#0b0' },
      ],
    },
    lanes: [
      { id: 'l1', label: 'Lane 1', sub: 'first' },
      { id: 'l2', label: 'Lane 2' },
    ],
    phases: [
      { id: 'p1', label: 'Phase 1', roman: 'I' },
      { id: 'p2', label: 'Phase 2', roman: 'II' },
    ],
    nodes: [
      {
        id: 'n1',
        lane: 'l1',
        phase: 'p1',
        title: 'Node 1',
        sub: 'first node',
        objective: 'Do thing',
        entity: 'User',
        actors: 'Alice',
        triggers: 'Click',
        next: 'Phase 2',
        today: {
          mode: 'manual',
          narrative: 'Today narrative',
          tools: ['Excel'],
          teams: ['Ops'],
          tickets: ['JIRA-1'],
          proven_pattern: ['Pattern A'],
        },
        tomorrow: { mode: 'ai', narrative: 'Tomorrow narrative' },
        modules: [
          {
            feature: 'Mod1',
            today: 'manual',
            tomorrow: 'ai',
            tags: ['tag-a'],
            pricing: 'premium',
          },
        ],
      },
      { id: 'n2', lane: 'l2', phase: 'p2', title: 'Node 2' },
      { id: 'n3', lane: 'l1', phase: 'p1', title: 'Node 3' },
    ],
    edges: [
      { from: 'n1', to: 'n2' },
      { from: 'n3', to: 'n1' },
    ],
    _modeMap: {
      manual: { id: 'manual', label: 'Manual', color: '#b00' },
      ai: { id: 'ai', label: 'AI', color: '#0b0' },
    },
    _moduleCatalog: {},
  };
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('NodeDrawer', () => {
  test('renders nothing when open=false', () => {
    const { container } = render(
      <NodeDrawer
        open={false}
        mode="node"
        data={makeData()}
        activeNodeId="n1"
        activeEdge={null}
        walkOrder={['n1', 'n2']}
        onClose={() => {}}
        onNavigate={() => {}}
        L={L}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  test('renders nothing when mode is null', () => {
    const { container } = render(
      <NodeDrawer
        open={true}
        mode={null}
        data={makeData()}
        activeNodeId="n1"
        activeEdge={null}
        walkOrder={['n1', 'n2']}
        onClose={() => {}}
        onNavigate={() => {}}
        L={L}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  test('node mode: renders title, sub, and meta-grid fields', () => {
    render(
      <NodeDrawer
        open={true}
        mode="node"
        data={makeData()}
        activeNodeId="n1"
        activeEdge={null}
        walkOrder={['n1', 'n2', 'n3']}
        onClose={() => {}}
        onNavigate={() => {}}
        L={L}
      />,
    );
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Node 1');
    expect(screen.getByText('first node')).toBeInTheDocument();
    expect(screen.getByText('Objective')).toBeInTheDocument();
    expect(screen.getByText('Do thing')).toBeInTheDocument();
    expect(screen.getByText('Entities')).toBeInTheDocument();
    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.getByText('Actors')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    // "Triggers" appears twice (meta-row label + deps-section label) — both legit.
    expect(screen.getAllByText('Triggers').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Click')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
    // Step header.
    expect(screen.getByText(/Step 1 \/ 3/)).toBeInTheDocument();
    expect(screen.getByText('I')).toBeInTheDocument();
    expect(screen.getByText('Phase 1')).toBeInTheDocument();
    expect(screen.getByText('Lane 1')).toBeInTheDocument();
  });

  test('node mode: today and tomorrow state sections render with mode pills', () => {
    render(
      <NodeDrawer
        open={true}
        mode="node"
        data={makeData()}
        activeNodeId="n1"
        activeEdge={null}
        walkOrder={['n1', 'n2']}
        onClose={() => {}}
        onNavigate={() => {}}
        L={L}
      />,
    );
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Current state')).toBeInTheDocument();
    expect(screen.getByText('Today narrative')).toBeInTheDocument();
    expect(screen.getByText('Tomorrow')).toBeInTheDocument();
    expect(screen.getByText('Future state')).toBeInTheDocument();
    expect(screen.getByText('Tomorrow narrative')).toBeInTheDocument();
    // Mode pills (Manual appears at the state-section pill AND the module-row
    // today-pill; AI appears at tomorrow + module-row tomorrow-pill).
    const manualPills = screen.getAllByText('Manual');
    expect(manualPills.length).toBeGreaterThan(0);
    // Inline style uses the mode color — JSDOM normalizes to rgb().
    const colored = manualPills.find((el) =>
      /rgb\(187,\s*0,\s*0\)/.test(el.getAttribute('style') ?? ''),
    );
    expect(colored).toBeTruthy();
    // Toolset row labels.
    expect(screen.getByText('Tools')).toBeInTheDocument();
    expect(screen.getByText('Owners')).toBeInTheDocument();
    expect(screen.getByText('Tickets')).toBeInTheDocument();
    expect(screen.getByText('Proven pattern')).toBeInTheDocument();
    expect(screen.getByText('Excel')).toBeInTheDocument();
    expect(screen.getByText('Ops')).toBeInTheDocument();
    expect(screen.getByText('JIRA-1')).toBeInTheDocument();
    expect(screen.getByText('Pattern A')).toBeInTheDocument();
  });

  test('node mode: modules section renders with feature name and tags', () => {
    render(
      <NodeDrawer
        open={true}
        mode="node"
        data={makeData()}
        activeNodeId="n1"
        activeEdge={null}
        walkOrder={['n1', 'n2']}
        onClose={() => {}}
        onNavigate={() => {}}
        L={L}
      />,
    );
    expect(screen.getByText(/Modules/)).toBeInTheDocument();
    expect(screen.getByText(/features that make this step work/)).toBeInTheDocument();
    expect(screen.getByText('Mod1')).toBeInTheDocument();
    expect(screen.getByText('tag-a')).toBeInTheDocument();
    expect(screen.getByText('premium')).toBeInTheDocument();
  });

  test('node mode: deps-section shows upstream + downstream nodes', () => {
    render(
      <NodeDrawer
        open={true}
        mode="node"
        data={makeData()}
        activeNodeId="n1"
        activeEdge={null}
        walkOrder={['n1', 'n2', 'n3']}
        onClose={() => {}}
        onNavigate={() => {}}
        L={L}
      />,
    );
    expect(screen.getByText('Depends on')).toBeInTheDocument();
    // Two "Triggers" labels coexist (meta-row + deps-section).
    expect(screen.getAllByText('Triggers').length).toBeGreaterThanOrEqual(1);
    // Upstream button: from n3 -> n1
    expect(screen.getByRole('button', { name: /← Node 3/ })).toBeInTheDocument();
    // Downstream button: n1 -> n2
    expect(screen.getByRole('button', { name: /→ Node 2/ })).toBeInTheDocument();
  });

  test('clicking upstream/downstream dep buttons calls onNavigate', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(
      <NodeDrawer
        open={true}
        mode="node"
        data={makeData()}
        activeNodeId="n1"
        activeEdge={null}
        walkOrder={['n1', 'n2', 'n3']}
        onClose={() => {}}
        onNavigate={onNavigate}
        L={L}
      />,
    );
    await user.click(screen.getByRole('button', { name: /← Node 3/ }));
    expect(onNavigate).toHaveBeenCalledWith('n3');
    await user.click(screen.getByRole('button', { name: /→ Node 2/ }));
    expect(onNavigate).toHaveBeenCalledWith('n2');
  });

  test('node mode: Prev disabled at start, Next active; clicking Next navigates', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(
      <NodeDrawer
        open={true}
        mode="node"
        data={makeData()}
        activeNodeId="n1"
        activeEdge={null}
        walkOrder={['n1', 'n2', 'n3']}
        onClose={() => {}}
        onNavigate={onNavigate}
        L={L}
      />,
    );
    const prev = screen.getByRole('button', { name: /Prev/ });
    const next = screen.getByRole('button', { name: /Next/ });
    expect(prev).toBeDisabled();
    expect(next).toBeEnabled();
    await user.click(next);
    expect(onNavigate).toHaveBeenCalledWith('n2');
  });

  test('node mode: Prev navigates and Next disabled at end of walk', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(
      <NodeDrawer
        open={true}
        mode="node"
        data={makeData()}
        activeNodeId="n3"
        activeEdge={null}
        walkOrder={['n1', 'n2', 'n3']}
        onClose={() => {}}
        onNavigate={onNavigate}
        L={L}
      />,
    );
    const prev = screen.getByRole('button', { name: /Prev/ });
    const next = screen.getByRole('button', { name: /Next/ });
    expect(next).toBeDisabled();
    expect(prev).toBeEnabled();
    await user.click(prev);
    expect(onNavigate).toHaveBeenCalledWith('n2');
  });

  test('close button calls onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <NodeDrawer
        open={true}
        mode="node"
        data={makeData()}
        activeNodeId="n1"
        activeEdge={null}
        walkOrder={['n1', 'n2']}
        onClose={onClose}
        onNavigate={() => {}}
        L={L}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('Escape closes the drawer', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <NodeDrawer
        open={true}
        mode="node"
        data={makeData()}
        activeNodeId="n1"
        activeEdge={null}
        walkOrder={['n1', 'n2']}
        onClose={onClose}
        onNavigate={() => {}}
        L={L}
      />,
    );
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  test('non-Escape keys do not close the drawer', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <NodeDrawer
        open={true}
        mode="node"
        data={makeData()}
        activeNodeId="n1"
        activeEdge={null}
        walkOrder={['n1', 'n2']}
        onClose={onClose}
        onNavigate={() => {}}
        L={L}
      />,
    );
    await user.keyboard('a');
    expect(onClose).not.toHaveBeenCalled();
  });

  test('node mode: returns null when activeNodeId does not match a node', () => {
    render(
      <NodeDrawer
        open={true}
        mode="node"
        data={makeData()}
        activeNodeId="nope"
        activeEdge={null}
        walkOrder={['n1']}
        onClose={() => {}}
        onNavigate={() => {}}
        L={L}
      />,
    );
    // Aside still renders but no h2.
    expect(screen.queryByRole('heading', { level: 2 })).toBeNull();
  });

  test('node mode: handles terminal node (no downstream) and entry node (no upstream)', () => {
    const data = makeData();
    // n2 has only incoming edge from n1, no outgoing.
    render(
      <NodeDrawer
        open={true}
        mode="node"
        data={data}
        activeNodeId="n2"
        activeEdge={null}
        walkOrder={['n1', 'n2']}
        onClose={() => {}}
        onNavigate={() => {}}
        L={L}
      />,
    );
    expect(screen.getByText('— terminal')).toBeInTheDocument();
    expect(screen.getByText(/← Node 1/)).toBeInTheDocument();
  });

  test('node mode: entry node (no incoming edges) shows "entry point"', () => {
    // Build a node graph where n3 has no incoming edges.
    const data = makeData();
    // Reorder edges so n3 is true entry (no incoming).
    data.edges = [{ from: 'n3', to: 'n1' }];
    render(
      <NodeDrawer
        open={true}
        mode="node"
        data={data}
        activeNodeId="n3"
        activeEdge={null}
        walkOrder={['n3', 'n1']}
        onClose={() => {}}
        onNavigate={() => {}}
        L={L}
      />,
    );
    expect(screen.getByText('— entry point')).toBeInTheDocument();
  });

  test('node mode: meta-grid omitted when node has no meta fields', () => {
    const data = makeData();
    // n2 has no objective/entity/actors/triggers/next.
    render(
      <NodeDrawer
        open={true}
        mode="node"
        data={data}
        activeNodeId="n2"
        activeEdge={null}
        walkOrder={['n1', 'n2']}
        onClose={() => {}}
        onNavigate={() => {}}
        L={L}
      />,
    );
    expect(screen.queryByText('Objective')).toBeNull();
  });

  test('edge mode: renders edge drawer with from/to titles', () => {
    render(
      <NodeDrawer
        open={true}
        mode="edge"
        data={makeData()}
        activeNodeId={null}
        activeEdge={{ from: 'n1', to: 'n2' }}
        walkOrder={['n1', 'n2']}
        onClose={() => {}}
        onNavigate={() => {}}
        L={L}
      />,
    );
    expect(screen.getByText('Connection')).toBeInTheDocument();
    expect(screen.getByText(/forward flow/)).toBeInTheDocument();
    expect(screen.getByText('From')).toBeInTheDocument();
    expect(screen.getByText('To')).toBeInTheDocument();
    expect(screen.getByText(/I → II/)).toBeInTheDocument();
  });

  test('edge mode: clicking "Inspect" navigates to the edge endpoints', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(
      <NodeDrawer
        open={true}
        mode="edge"
        data={makeData()}
        activeNodeId={null}
        activeEdge={{ from: 'n1', to: 'n2' }}
        walkOrder={['n1', 'n2']}
        onClose={() => {}}
        onNavigate={onNavigate}
        L={L}
      />,
    );
    const buttons = screen.getAllByRole('button', { name: /Inspect/ });
    await user.click(buttons[0]);
    expect(onNavigate).toHaveBeenCalledWith('n1');
    await user.click(buttons[1]);
    expect(onNavigate).toHaveBeenCalledWith('n2');
  });

  test('edge mode: backward flow when target phase is earlier', () => {
    const data = makeData();
    render(
      <NodeDrawer
        open={true}
        mode="edge"
        data={data}
        activeNodeId={null}
        activeEdge={{ from: 'n2', to: 'n1' }}
        walkOrder={['n1', 'n2']}
        onClose={() => {}}
        onNavigate={() => {}}
        L={L}
      />,
    );
    expect(screen.getByText(/backward flow/)).toBeInTheDocument();
    expect(screen.getByText(/loops back across phases/)).toBeInTheDocument();
  });

  test('edge mode: same-phase same-lane forward flow', () => {
    const data = makeData();
    // n1 and n3 are both in l1/p1.
    render(
      <NodeDrawer
        open={true}
        mode="edge"
        data={data}
        activeNodeId={null}
        activeEdge={{ from: 'n1', to: 'n3' }}
        walkOrder={['n1', 'n3']}
        onClose={() => {}}
        onNavigate={() => {}}
        L={L}
      />,
    );
    expect(screen.getByText(/continues within the same actor/)).toBeInTheDocument();
  });

  test('edge mode: returns null body when edge endpoints are unknown', () => {
    render(
      <NodeDrawer
        open={true}
        mode="edge"
        data={makeData()}
        activeNodeId={null}
        activeEdge={{ from: 'missing', to: 'n2' }}
        walkOrder={['n1', 'n2']}
        onClose={() => {}}
        onNavigate={() => {}}
        L={L}
      />,
    );
    expect(screen.queryByRole('heading', { level: 2 })).toBeNull();
  });
});
