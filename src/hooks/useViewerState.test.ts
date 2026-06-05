// Tests for src/hooks/useViewerState.ts
//
// Covers the pure exports (`slugify` + `normalize`) and the `useViewerState`
// hook itself — bootstrap from URL, hash, slug, encrypted-image, paste; plus
// the manual entry points (`loadFromUrl`, `handleFileDrop`, `handlePaste`,
// `decryptImage`, `loadFromText`, `showPasteUI`).

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

import { normalize, slugify, useViewerState } from '@/hooks/useViewerState';
import { encodeHashData } from '@/lib/parseSource';
import type { LifecycleMap } from '@/types/lifecycle-map';

// ---------------------------------------------------------------------------
// Mock the encrypted-image decoder so `decryptImage` is deterministic.
// ---------------------------------------------------------------------------
vi.mock('@/lib/share/encrypted', () => ({
  decodeFromImageUrl: vi.fn(async (_url: string, password: string) => {
    if (password === 'right') {
      return JSON.stringify({
        meta: { title: 'Decrypted' },
        lanes: [],
        phases: [],
        nodes: [],
        edges: [],
      });
    }
    throw new Error('Wrong password');
  }),
}));

// ---------------------------------------------------------------------------
// Helpers — fetch + window.location stubs.
// ---------------------------------------------------------------------------

const SAMPLE_MAP = {
  meta: { title: 'Hiring' },
  lanes: [{ id: 'l1', label: 'Lane 1' }],
  phases: [{ id: 'p1', label: 'Phase 1' }],
  nodes: [{ id: 'n1', lane: 'l1', phase: 'p1', title: 'Node 1' }],
  edges: [],
};

function installFetchMock(): void {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    if (url.includes('hiring-pipeline') || url.includes('examples/')) {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify(SAMPLE_MAP),
      } as Response;
    }
    if (url.includes('good-remote')) {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify(SAMPLE_MAP),
      } as Response;
    }
    if (url.includes('bad-json')) {
      return {
        ok: true,
        status: 200,
        text: async () => '{{{ not parseable',
      } as Response;
    }
    return {
      ok: false,
      status: 404,
      text: async () => 'Not found',
    } as Response;
  }) as unknown as typeof fetch;
}

interface LocationOverrides {
  search?: string;
  hash?: string;
  pathname?: string;
  hostname?: string;
  href?: string;
}

function setLocation(overrides: LocationOverrides): void {
  const current = window.location;
  const next = {
    ...current,
    search: overrides.search ?? '',
    hash: overrides.hash ?? '',
    pathname: overrides.pathname ?? '/',
    hostname: overrides.hostname ?? current.hostname,
    href:
      overrides.href
      ?? `http://localhost${overrides.pathname ?? '/'}${overrides.search ?? ''}${overrides.hash ?? ''}`,
    origin: 'http://localhost',
    protocol: 'http:',
    host: 'localhost',
    replace: vi.fn(),
    reload: vi.fn(),
    assign: vi.fn(),
  };
  Object.defineProperty(window, 'location', {
    value: next,
    writable: true,
    configurable: true,
  });
}

describe('slugify', () => {
  it('lowercases and replaces spaces with dashes', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('strips a .json extension', () => {
    expect(slugify('Report.json')).toBe('report');
  });

  it('strips a .yaml extension', () => {
    expect(slugify('config.yaml')).toBe('config');
  });

  it('strips a .yml extension', () => {
    expect(slugify('config.yml')).toBe('config');
  });

  it('collapses runs of special characters into single dashes', () => {
    expect(slugify('A!!!B___C')).toBe('a-b-c');
  });

  it('trims leading and trailing dashes', () => {
    expect(slugify('---weird---')).toBe('weird');
  });

  it('caps length at 64 characters', () => {
    const long = 'a'.repeat(100);
    const result = slugify(long);
    expect(result.length).toBe(64);
  });

  it('falls back to "untitled" for empty input', () => {
    expect(slugify('')).toBe('untitled');
  });

  it('falls back to "untitled" for input that becomes empty after stripping', () => {
    expect(slugify('!!!')).toBe('untitled');
  });

  it('treats null-ish input as empty (no throw)', () => {
    expect(slugify(null as unknown as string)).toBe('untitled');
    expect(slugify(undefined as unknown as string)).toBe('untitled');
  });

  it('preserves digits', () => {
    expect(slugify('Q3 2026 plan.json')).toBe('q3-2026-plan');
  });
});

describe('normalize', () => {
  function baseMap(): LifecycleMap {
    return { lanes: [], phases: [], nodes: [], edges: [] };
  }

  it('throws on non-object input', () => {
    expect(() => normalize(null as unknown as LifecycleMap)).toThrow(/object/i);
    expect(() => normalize('hi' as unknown as LifecycleMap)).toThrow(/object/i);
  });

  it('fills default meta fields', () => {
    const out = normalize(baseMap());
    expect(out.meta.title).toBe('Untitled');
    expect(out.meta.subtitle).toBe('');
    expect(out.meta.context).toBe('');
    expect(Array.isArray(out.meta.modes)).toBe(true);
    expect(out.meta.modes.length).toBeGreaterThan(0);
  });

  it('preserves provided meta values', () => {
    const out = normalize({
      ...baseMap(),
      meta: { title: 'My Map', subtitle: 'Sub', context: 'Ctx' },
    });
    expect(out.meta.title).toBe('My Map');
    expect(out.meta.subtitle).toBe('Sub');
    expect(out.meta.context).toBe('Ctx');
  });

  it('populates _modeMap from the default modes', () => {
    const out = normalize(baseMap());
    expect(out._modeMap).toBeDefined();
    expect(out._modeMap['self-serve']).toBeDefined();
    expect(out._modeMap['automated']).toBeDefined();
  });

  it('populates _moduleCatalog from modules', () => {
    const out = normalize({
      ...baseMap(),
      modules: {
        crm: { name: 'CRM', today: 'manual' },
        billing: { name: 'Billing', today: 'automated' },
      },
    });
    expect(out._moduleCatalog).toBeDefined();
    expect(out._moduleCatalog.crm).toEqual({ name: 'CRM', today: 'manual' });
    expect(out._moduleCatalog.billing).toEqual({ name: 'Billing', today: 'automated' });
  });

  it('defaults _moduleCatalog to {} when no modules', () => {
    const out = normalize(baseMap());
    expect(out._moduleCatalog).toEqual({});
  });

  it('auto-discovers modes referenced by node.today/tomorrow', () => {
    const out = normalize({
      ...baseMap(),
      nodes: [
        {
          id: 'n1',
          lane: 'l1',
          phase: 'p1',
          title: 'Node',
          today: { mode: 'custom-mode' },
          tomorrow: { mode: 'future-mode' },
        },
      ],
    });
    expect(out._modeMap['custom-mode']).toBeDefined();
    expect(out._modeMap['custom-mode']?.id).toBe('custom-mode');
    expect(out._modeMap['custom-mode']?.label).toBe('custom-mode');
    expect(out._modeMap['future-mode']).toBeDefined();
  });

  it('auto-discovered modes get hsl(...) color strings', () => {
    const out = normalize({
      ...baseMap(),
      nodes: [
        { id: 'n1', lane: 'l1', phase: 'p1', title: 'Node', today: { mode: 'brand-new' } },
      ],
    });
    const color = out._modeMap['brand-new']?.color ?? '';
    expect(color).toMatch(/^hsl\(\d+, \d+%, \d+%\)$/);
  });

  it('auto-discovers modes referenced by node.modules entries', () => {
    const out = normalize({
      ...baseMap(),
      nodes: [
        {
          id: 'n1',
          lane: 'l1',
          phase: 'p1',
          title: 'Node',
          modules: [{ today: 'inline-mode-a', tomorrow: 'inline-mode-b' }],
        },
      ],
    });
    expect(out._modeMap['inline-mode-a']).toBeDefined();
    expect(out._modeMap['inline-mode-b']).toBeDefined();
  });

  it('auto-discovers modes referenced by the modules catalog', () => {
    const out = normalize({
      ...baseMap(),
      modules: { crm: { name: 'CRM', today: 'catalog-mode' } },
    });
    expect(out._modeMap['catalog-mode']).toBeDefined();
  });

  it('does not overwrite a known mode with an auto-discovered one', () => {
    const out = normalize({
      ...baseMap(),
      meta: { modes: [{ id: 'manual', label: 'Manual', color: '#000' }] },
      nodes: [
        { id: 'n1', lane: 'l1', phase: 'p1', title: 'Node', today: { mode: 'manual' } },
      ],
    });
    expect(out._modeMap['manual']?.color).toBe('#000');
    expect(out._modeMap['manual']?.label).toBe('Manual');
  });

  it('assigns roman numerals to phases by index', () => {
    const out = normalize({
      ...baseMap(),
      phases: [
        { id: 'p1', label: 'Phase 1' },
        { id: 'p2', label: 'Phase 2' },
        { id: 'p3', label: 'Phase 3' },
      ],
    });
    expect(out.phases[0]?.roman).toBe('I');
    expect(out.phases[1]?.roman).toBe('II');
    expect(out.phases[2]?.roman).toBe('III');
  });

  it('preserves an explicit roman numeral on a phase', () => {
    const out = normalize({
      ...baseMap(),
      phases: [{ id: 'p1', label: 'Phase 1', roman: 'Z' }],
    });
    expect(out.phases[0]?.roman).toBe('Z');
  });

  it('defaults subCols to 1 when missing', () => {
    const out = normalize({
      ...baseMap(),
      phases: [{ id: 'p1', label: 'Phase 1' }],
    });
    expect(out.phases[0]?.subCols).toBe(1);
  });

  // ----- v2 schema (source/target + states) ---------------------------------

  it('promotes legacy from/to edges into source/target', () => {
    const out = normalize({
      ...baseMap(),
      nodes: [
        { id: 'a', lane: 'l', phase: 'p', title: 'A' },
        { id: 'b', lane: 'l', phase: 'p', title: 'B' },
      ],
      edges: [{ from: 'a', to: 'b' }],
    });
    expect(out.edges[0]?.source).toBe('a');
    expect(out.edges[0]?.target).toBe('b');
  });

  it('promotes legacy today/tomorrow into states map', () => {
    const out = normalize({
      ...baseMap(),
      nodes: [
        {
          id: 'n1',
          lane: 'l1',
          phase: 'p1',
          title: 'Node',
          today: { mode: 'manual', narrative: 'A' },
          tomorrow: { mode: 'ai', narrative: 'B' },
        },
      ],
    });
    const n = out.nodes[0]!;
    expect(n.states['today']?.narrative).toBe('A');
    expect(n.states['tomorrow']?.narrative).toBe('B');
  });

  it('preserves states map alongside legacy today/tomorrow', () => {
    const out = normalize({
      ...baseMap(),
      nodes: [
        {
          id: 'n1',
          lane: 'l1',
          phase: 'p1',
          title: 'Node',
          states: {
            today: { mode: 'manual', narrative: 'from-states' },
            future: { mode: 'ai', narrative: 'C' },
          },
          today: { mode: 'manual', narrative: 'from-legacy' },
        },
      ],
    });
    const n = out.nodes[0]!;
    expect(n.states['today']?.narrative).toBe('from-states');
    expect(n.states['future']?.narrative).toBe('C');
  });

  it('keeps source/target when both v1 and v2 fields are present', () => {
    const out = normalize({
      ...baseMap(),
      nodes: [
        { id: 'x', lane: 'l', phase: 'p', title: 'X' },
        { id: 'y', lane: 'l', phase: 'p', title: 'Y' },
      ],
      edges: [{ source: 'x', target: 'y', from: 'should-be-ignored', to: 'also-ignored' }],
    });
    expect(out.edges[0]?.source).toBe('x');
    expect(out.edges[0]?.target).toBe('y');
  });

  it('throws when an edge points at a node that does not exist', () => {
    expect(() => normalize({
      ...baseMap(),
      nodes: [{ id: 'a', lane: 'l', phase: 'p', title: 'A' }],
      edges: [{ source: 'a', target: 'ghost' }],
    })).toThrow(/unknown node "ghost"/);
  });

  it('throws when an edge has neither source/target nor from/to', () => {
    expect(() => normalize({
      ...baseMap(),
      edges: [{} as never],
    })).toThrow(/source|target/i);
  });

  it('defaults meta.direction to LR', () => {
    const out = normalize(baseMap());
    expect(out.meta.direction).toBe('LR');
  });

  it('preserves explicit meta.direction', () => {
    const out = normalize({
      ...baseMap(),
      meta: { direction: 'TB' },
    });
    expect(out.meta.direction).toBe('TB');
  });

  it('auto-discovers modes from arbitrary states (not just today/tomorrow)', () => {
    const out = normalize({
      ...baseMap(),
      nodes: [
        {
          id: 'n1',
          lane: 'l1',
          phase: 'p1',
          title: 'Node',
          states: {
            future: { mode: 'pilot-mode' },
            legacy: { mode: 'sunset-mode' },
          },
        },
      ],
    });
    expect(out._modeMap['pilot-mode']).toBeDefined();
    expect(out._modeMap['sunset-mode']).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// useViewerState hook
// ---------------------------------------------------------------------------

describe('useViewerState (hook)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    installFetchMock();
    setLocation({ search: '', hash: '', pathname: '/' });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('settles to loading=false with no source (splash)', async () => {
    const { result } = renderHook(() => useViewerState());
    // Note: the bootstrap effect can finish synchronously in test environments
    // when no fetch is needed, so we don't assert loading=true here — just
    // assert the final settled state.
    await waitFor(() => expect(result.current.state.loading).toBe(false));
    expect(result.current.state.data).toBeNull();
    expect(result.current.state.error).toBeNull();
    expect(result.current.state.needsPaste).toBe(false);
    expect(result.current.state.needsPassword).toBeNull();
  });

  it('loads via ?src= and sets source="url"', async () => {
    setLocation({ search: '?src=good-remote.json' });
    const { result } = renderHook(() => useViewerState());
    await waitFor(() => expect(result.current.state.loading).toBe(false));
    expect(result.current.state.error).toBeNull();
    expect(result.current.state.data).not.toBeNull();
    expect(result.current.state.source).toBe('url');
    expect(result.current.state.data?.meta.title).toBe('Hiring');
  });

  it('reports an error when ?src= fetch fails', async () => {
    setLocation({ search: '?src=missing.json' });
    const { result } = renderHook(() => useViewerState());
    await waitFor(() => expect(result.current.state.loading).toBe(false));
    expect(result.current.state.error).toMatch(/HTTP 404/);
    expect(result.current.state.data).toBeNull();
  });

  it('reports a parse error for malformed remote source', async () => {
    setLocation({ search: '?src=bad-json.json' });
    const { result } = renderHook(() => useViewerState());
    await waitFor(() =>
      expect(result.current.state.error).not.toBeNull(),
    );
    expect(result.current.state.error).toMatch(/parse|JSON|YAML/i);
  });

  it('decodes #data= base64 payload into the map (source="hash")', async () => {
    const encoded = await encodeHashData(JSON.stringify(SAMPLE_MAP));
    setLocation({ hash: `#data=${encoded}` });
    const { result } = renderHook(() => useViewerState());
    await waitFor(() => expect(result.current.state.loading).toBe(false));
    expect(result.current.state.error).toBeNull();
    expect(result.current.state.source).toBe('hash');
    expect(result.current.state.data?.meta.title).toBe('Hiring');
  });

  it('reports an error when #data= is malformed', async () => {
    setLocation({ hash: '#data=not-a-valid-blob!!!' });
    const { result } = renderHook(() => useViewerState());
    await waitFor(() => expect(result.current.state.loading).toBe(false));
    expect(result.current.state.error).toMatch(/decode|#data/i);
  });

  it('loads an example map from a known slug hash', async () => {
    setLocation({ hash: '#hiring-pipeline' });
    const { result } = renderHook(() => useViewerState());
    await waitFor(() => expect(result.current.state.loading).toBe(false));
    expect(result.current.state.error).toBeNull();
    expect(result.current.state.source).toBe('slug');
    expect(result.current.state.slug).toBe('hiring-pipeline');
  });

  it('ignores an unknown slug hash and falls through to splash', async () => {
    setLocation({ hash: '#totally-unknown-slug' });
    const { result } = renderHook(() => useViewerState());
    await waitFor(() => expect(result.current.state.loading).toBe(false));
    expect(result.current.state.data).toBeNull();
    expect(result.current.state.error).toBeNull();
  });

  it('?paste sets needsPaste=true', async () => {
    setLocation({ search: '?paste' });
    const { result } = renderHook(() => useViewerState());
    await waitFor(() => expect(result.current.state.loading).toBe(false));
    expect(result.current.state.needsPaste).toBe(true);
  });

  it('#img= sets needsPassword with the image URL', async () => {
    setLocation({ hash: '#img=https://files.example/blob.png' });
    const { result } = renderHook(() => useViewerState());
    await waitFor(() => expect(result.current.state.loading).toBe(false));
    expect(result.current.state.needsPassword).toEqual({
      url: 'https://files.example/blob.png',
    });
  });

  it('loadFromUrl() can be called manually after mount', async () => {
    const { result } = renderHook(() => useViewerState());
    await waitFor(() => expect(result.current.state.loading).toBe(false));

    await act(async () => {
      await result.current.loadFromUrl('good-remote.json');
    });

    expect(result.current.state.error).toBeNull();
    expect(result.current.state.source).toBe('url');
    expect(result.current.state.data?.meta.title).toBe('Hiring');
  });

  it('loadFromUrl() surfaces fetch errors', async () => {
    const { result } = renderHook(() => useViewerState());
    await waitFor(() => expect(result.current.state.loading).toBe(false));

    await act(async () => {
      await result.current.loadFromUrl('missing.json');
    });

    expect(result.current.state.error).toMatch(/HTTP 404/);
  });

  it('handleFileDrop() loads the file text and sets source="dnd" + slug from filename', async () => {
    const { result } = renderHook(() => useViewerState());
    await waitFor(() => expect(result.current.state.loading).toBe(false));

    const file = new File([JSON.stringify(SAMPLE_MAP)], 'My Plan.json', {
      type: 'application/json',
    });

    await act(async () => {
      await result.current.handleFileDrop([file]);
    });

    expect(result.current.state.source).toBe('dnd');
    expect(result.current.state.slug).toBe('my-plan');
    expect(result.current.state.data?.meta.title).toBe('Hiring');
    // Source persisted to session storage for restore-after-reload.
    expect(sessionStorage.getItem('lifecycle-map.session')).not.toBeNull();
  });

  it('handleFileDrop() merges a map dropped together with a module catalog', async () => {
    const { result } = renderHook(() => useViewerState());
    await waitFor(() => expect(result.current.state.loading).toBe(false));

    const mapWithRefs = {
      meta: { title: 'Interview', modules_source: './rubrics.json' },
      nodes: [{ id: 'n', lane: 'l', phase: 'p', title: 'N', modules: ['rubric:alpha'] }],
      edges: [],
      lanes: [{ id: 'l', label: 'L' }],
      phases: [{ id: 'p', label: 'P' }],
    };
    const catalog = {
      modules: { 'rubric:alpha': { name: 'Alpha', today: 'L1', tomorrow: 'L4' } },
    };
    const mapFile = new File([JSON.stringify(mapWithRefs)], 'interview.json', {
      type: 'application/json',
    });
    const catalogFile = new File([JSON.stringify(catalog)], 'rubrics.json', {
      type: 'application/json',
    });

    await act(async () => {
      await result.current.handleFileDrop([catalogFile, mapFile]);
    });

    // The map loads (named from the map file, not the catalog) and the module
    // resolves from the dropped catalog instead of showing "Unknown".
    expect(result.current.state.source).toBe('dnd');
    expect(result.current.state.data?.meta.title).toBe('Interview');
    expect(result.current.state.data?._moduleCatalog?.['rubric:alpha']).toBeDefined();
  });

  it('handlePaste() loads pasted text and sets source="paste"', async () => {
    const { result } = renderHook(() => useViewerState());
    await waitFor(() => expect(result.current.state.loading).toBe(false));

    await act(async () => {
      await result.current.handlePaste(JSON.stringify(SAMPLE_MAP));
    });

    expect(result.current.state.source).toBe('paste');
    expect(result.current.state.data?.meta.title).toBe('Hiring');
  });

  it('loadFromText surfaces parse errors without unsetting loading', async () => {
    const { result } = renderHook(() => useViewerState());
    await waitFor(() => expect(result.current.state.loading).toBe(false));

    await act(async () => {
      await result.current.loadFromText('{{ not parseable', 'broken', 'paste');
    });

    expect(result.current.state.error).toMatch(/parse|JSON|YAML/i);
  });

  it('loadFromText preserves an explicit slug when passed', async () => {
    const { result } = renderHook(() => useViewerState());
    await waitFor(() => expect(result.current.state.loading).toBe(false));

    await act(async () => {
      await result.current.loadFromText(
        JSON.stringify(SAMPLE_MAP),
        'whatever.json',
        'restored',
        'preserved-slug',
      );
    });

    expect(result.current.state.slug).toBe('preserved-slug');
    expect(result.current.state.source).toBe('restored');
  });

  it('decryptImage() success: sets data + source="img"', async () => {
    setLocation({ hash: '#img=https://files.example/blob.png' });
    const { result } = renderHook(() => useViewerState());
    await waitFor(() => expect(result.current.state.loading).toBe(false));
    expect(result.current.state.needsPassword).not.toBeNull();

    await act(async () => {
      await result.current.decryptImage('https://files.example/blob.png', 'right');
    });

    expect(result.current.state.error).toBeNull();
    expect(result.current.state.source).toBe('img');
    expect(result.current.state.needsPassword).toBeNull();
    expect(result.current.state.data?.meta.title).toBe('Decrypted');
  });

  it('decryptImage() failure: sets error + clears loading', async () => {
    const { result } = renderHook(() => useViewerState());
    await waitFor(() => expect(result.current.state.loading).toBe(false));

    await act(async () => {
      await result.current.decryptImage('https://files.example/blob.png', 'wrong');
    });

    expect(result.current.state.error).toMatch(/Wrong password|Decryption failed/i);
    expect(result.current.state.loading).toBe(false);
  });

  it('showPasteUI() flips needsPaste=true', async () => {
    const { result } = renderHook(() => useViewerState());
    await waitFor(() => expect(result.current.state.loading).toBe(false));
    expect(result.current.state.needsPaste).toBe(false);

    act(() => {
      result.current.showPasteUI();
    });

    expect(result.current.state.needsPaste).toBe(true);
  });

  it('loadFromExample with an unknown slug sets an error', async () => {
    const { result } = renderHook(() => useViewerState());
    await waitFor(() => expect(result.current.state.loading).toBe(false));

    await act(async () => {
      await result.current.loadFromExample('bogus-slug');
    });

    expect(result.current.state.error).toMatch(/Unknown example/i);
  });

  it('hashchange listener loads a different example when slug hash changes', async () => {
    setLocation({ hash: '#hiring-pipeline' });
    const { result } = renderHook(() => useViewerState());
    await waitFor(() => expect(result.current.state.slug).toBe('hiring-pipeline'));

    // Now flip the hash to another known slug and fire the event.
    setLocation({ hash: '#minimal' });
    await act(async () => {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.state.slug).toBe('minimal'));
  });

  it('hashchange listener ignores hashes that already match the current slug', async () => {
    setLocation({ hash: '#hiring-pipeline' });
    const { result } = renderHook(() => useViewerState());
    await waitFor(() => expect(result.current.state.slug).toBe('hiring-pipeline'));

    const fetchCalls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length;

    await act(async () => {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      await Promise.resolve();
    });

    // No new fetch — listener should have early-returned on the same slug.
    expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(fetchCalls);
  });

  it('hashchange listener ignores #data= / #img= style hashes', async () => {
    const { result } = renderHook(() => useViewerState());
    await waitFor(() => expect(result.current.state.loading).toBe(false));

    setLocation({ hash: '#data=blob' });
    await act(async () => {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      await Promise.resolve();
    });

    // We never tried to load it as a slug, so still on splash.
    expect(result.current.state.data).toBeNull();
    expect(result.current.state.error).toBeNull();
  });

  it('restores a previous dnd session when no URL signal is present', async () => {
    sessionStorage.setItem(
      'lifecycle-map.session',
      JSON.stringify({
        source: 'dnd',
        slug: 'my-restored',
        rawJson: JSON.stringify(SAMPLE_MAP),
        ts: Date.now(),
      }),
    );

    const { result } = renderHook(() => useViewerState());
    await waitFor(() => expect(result.current.state.loading).toBe(false));

    expect(result.current.state.source).toBe('restored');
    expect(result.current.state.slug).toBe('my-restored');
    expect(result.current.state.data?.meta.title).toBe('Hiring');
  });
});
