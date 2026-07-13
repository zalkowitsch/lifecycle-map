import { useCallback, useEffect, useRef, useState } from 'react';
import type { LifecycleMap, NormalizedMap, Mode, Phase, Lane, NodeState } from '@/types/lifecycle-map';
import { parseSource, decodeHashData } from '@/lib/parseSource';
import { decodeFromImageUrl } from '@/lib/share/encrypted';
import { resolveExternalModules } from '@/lib/resolveModules';
import { mergeDroppedFiles } from '@/lib/mergeDroppedFiles';
import { loadBundle } from '@/lib/datatables/loadBundle';
import { resolveDatatableRefs } from '@/lib/datatables/resolveDatatableRefs';
import type { DatatableRegistry } from '@/lib/datatables/registry';
import { useSessionState } from './useSessionState';

// Fetch a (possibly relative) catalog URL, resolved against the map's location.
async function fetchRelativeText(url: string, baseUrl: string): Promise<string> {
  const resolved = new URL(url, new URL(baseUrl, window.location.href)).href;
  const resp = await fetch(resolved, { redirect: 'follow' });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} fetching ${resolved}`);
  return resp.text();
}

const EXAMPLE_SLUGS: Record<string, string> = {
  'hiring-pipeline': './examples/hiring-pipeline.json',
  'hiring-pipeline-yaml': './examples/hiring-pipeline.yaml',
  'hiring-pipeline-modules': './examples/with-modules/hiring-pipeline.json',
  'multi-language': './examples/multi-language.json',
  'minimal': './examples/minimal.json',
  'interview-loop': './examples/use-cases/interview-loop.json',
  'hiring-funnel': './examples/use-cases/hiring-funnel.json',
  'support-triage': './examples/use-cases/support-triage.json',
  'onboarding-activation': './examples/use-cases/onboarding-activation.json',
  'capability-roadmap': './examples/use-cases/capability-roadmap.json',
};

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];

const DEFAULT_MODES: Mode[] = [
  { id: 'self-serve', label: 'Self-Serve',  color: '#047857' },
  { id: 'assisted',   label: 'Assisted',    color: '#a16207' },
  { id: 'automated',  label: 'Automated',   color: '#1e40af' },
  { id: 'manual',     label: 'Manual',      color: '#b91c1c' },
  { id: 'n-a',        label: 'Not Applicable', color: '#6b6557' },
  { id: 'unknown',    label: 'Unknown',     color: '#6b6557' },
];

export function slugify(s: string): string {
  return String(s ?? '')
    .toLowerCase()
    .replace(/\.(json|ya?ml)$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'untitled';
}

function autoModeColor(i: number): string {
  const GOLDEN = 0.61803398875;
  const h = (25 + i * GOLDEN * 360) % 360;
  const sat = i % 2 === 0 ? 70 : 56;
  const lig = i % 2 === 0 ? 42 : 50;
  return `hsl(${h.toFixed(0)}, ${sat}%, ${lig}%)`;
}

export function normalize(data: LifecycleMap): NormalizedMap {
  if (!data || typeof data !== 'object') throw new Error('Top-level must be an object');
  const out = data as NormalizedMap;
  out.meta = out.meta ?? {};
  out.meta.title = out.meta.title ?? 'Untitled';
  out.meta.subtitle = out.meta.subtitle ?? '';
  out.meta.context = out.meta.context ?? '';
  out.meta.modes = out.meta.modes && out.meta.modes.length ? out.meta.modes : DEFAULT_MODES;
  out.meta.direction = out.meta.direction ?? 'LR';
  out.lanes = (out.lanes ?? []) as Lane[];
  out.phases = (out.phases ?? []).map((p: Phase, i: number) => ({
    ...p,
    roman: p.roman ?? ROMAN[i] ?? String(i + 1),
    subCols: p.subCols ?? 1,
  })) as Phase[];

  // Normalize nodes: collapse legacy today/tomorrow into states map.
  out.nodes = (out.nodes ?? []).map((n) => {
    const states: Record<string, NodeState> = { ...(n.states ?? {}) };
    if (n.today && !states['today']) states['today'] = n.today;
    if (n.tomorrow && !states['tomorrow']) states['tomorrow'] = n.tomorrow;
    return { ...n, states };
  }) as NormalizedMap['nodes'];

  // Normalize edges: collapse legacy from/to into source/target.
  out.edges = (out.edges ?? []).map((e, i) => {
    const source = e.source ?? e.from ?? '';
    const target = e.target ?? e.to ?? '';
    if (!source || !target) {
      throw new Error(
        `Edge #${i} missing source/target (or legacy from/to): ${JSON.stringify(e)}`,
      );
    }
    return { ...e, source, target };
  }) as NormalizedMap['edges'];

  // Validate every edge references a known node — otherwise the canvas
  // crashes when the router tries to position a phantom endpoint.
  const nodeIds = new Set(out.nodes.map((n) => n.id));
  out.edges.forEach((e, i) => {
    if (!nodeIds.has(e.source)) {
      throw new Error(`Edge #${i} (${e.source}→${e.target}) references unknown node "${e.source}"`);
    }
    if (!nodeIds.has(e.target)) {
      throw new Error(`Edge #${i} (${e.source}→${e.target}) references unknown node "${e.target}"`);
    }
  });

  const modeMap: Record<string, Mode> = {};
  out.meta.modes.forEach((m) => { modeMap[m.id] = m; });

  // auto-discover modes referenced by nodes/modules
  const seen = new Set(Object.keys(modeMap));
  const discovered: string[] = [];
  const visitMode = (id: unknown): void => {
    if (!id || typeof id !== 'string' || seen.has(id)) return;
    seen.add(id);
    discovered.push(id);
  };
  out.nodes.forEach((n) => {
    Object.values(n.states).forEach((s) => visitMode(s.mode));
    (n.modules ?? []).forEach((m) => {
      if (m && typeof m === 'object') { visitMode(m.today); visitMode(m.tomorrow); }
    });
  });
  Object.values(out.modules ?? {}).forEach((m) => {
    if (m && typeof m === 'object') { visitMode(m.today); visitMode(m.tomorrow); }
  });
  discovered.forEach((id, i) => {
    modeMap[id] = { id, label: id, color: autoModeColor(i) };
  });

  out._modeMap = modeMap;
  out._moduleCatalog = out.modules ?? {};
  return out;
}

async function fetchSource(url: string): Promise<{ data: LifecycleMap; text: string; name: string }> {
  const resp = await fetch(url, { redirect: 'follow' });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} fetching ${url}`);
  const text = await resp.text();
  const data = parseSource(text);
  const u = new URL(url, window.location.href);
  const name = u.pathname.split('/').pop() || 'remote';
  return { data, text, name };
}

export type ViewerSource = 'url' | 'hash' | 'img' | 'slug' | 'dnd' | 'paste' | 'restored' | 'storage';

export interface RawSource {
  name: string;
  text: string;
  lang: 'json' | 'yaml';
}

export interface ViewerState {
  data: NormalizedMap | null;
  source: ViewerSource | null;
  slug: string | null;
  rawSources: RawSource[];
  loading: boolean;
  error: string | null;
  needsPassword: { url: string } | null;
  needsPaste: boolean;
  datatables?: DatatableRegistry;
}

function detectLang(name: string, text: string): 'json' | 'yaml' {
  const lower = name.toLowerCase();
  if (lower.endsWith('.yaml') || lower.endsWith('.yml')) return 'yaml';
  if (lower.endsWith('.json')) return 'json';
  const t = text.trimStart();
  return t.startsWith('{') || t.startsWith('[') ? 'json' : 'yaml';
}

export function useViewerState() {
  const [state, setState] = useState<ViewerState>({
    data: null, source: null, slug: null,
    rawSources: [], loading: true, error: null,
    needsPassword: null, needsPaste: false,
    datatables: undefined,
  });
  const session = useSessionState();
  const lastHandledSlug = useRef<string | null>(null);

  const loadFromExample = useCallback(async (slug: string) => {
    const url = EXAMPLE_SLUGS[slug];
    if (!url) {
      setState((s) => ({ ...s, loading: false, error: `Unknown example: ${slug}` }));
      return;
    }
    try {
      setState((s) => ({ ...s, loading: true, error: null }));
      const { data, text, name } = await fetchSource(url);
      const resolved = await resolveExternalModules(data, (u) => fetchRelativeText(u, url), name);
      const normalized = normalize(resolved);
      setState({
        data: normalized,
        source: 'slug',
        slug,
        rawSources: [{ name, text, lang: detectLang(name, text) }],
        loading: false,
        error: null,
        needsPassword: null,
        needsPaste: false,
      });
      lastHandledSlug.current = slug;
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e instanceof Error ? e.message : String(e) }));
    }
  }, []);

  const loadFromText = useCallback(async (
    text: string,
    name: string,
    source: ViewerSource,
    slug?: string,
    baseUrl?: string,
    registry?: DatatableRegistry,
    datatableSources?: RawSource[],
  ) => {
    try {
      const data = parseSource(text);
      // If the map points at an external module/rubric catalog and we have a
      // URL to resolve it against (example/url loads), fetch and inject it.
      // Drag-and-drop has no fetchable base, so the catalog must be embedded
      // or dropped alongside the map (handled before this call).
      const resolved = baseUrl
        ? await resolveExternalModules(data, (u) => fetchRelativeText(u, baseUrl), name)
        : data;
      // Substitute datatable refs (if any) before normalize, so mode discovery
      // and the drawer see resolved row objects (not raw ids).
      const withRefs = registry ? resolveDatatableRefs(resolved, registry) : resolved;
      const normalized = normalize(withRefs);
      const finalSlug = slug ?? (source === 'dnd' ? slugify(name) : null);
      if (finalSlug) {
        const newHash = '#' + finalSlug;
        if (window.location.hash !== newHash) {
          history.replaceState(null, '', window.location.pathname + window.location.search + newHash);
        }
        lastHandledSlug.current = finalSlug;
      }
      setState({
        data: normalized,
        source,
        slug: finalSlug,
        rawSources: [{ name, text, lang: detectLang(name, text) }, ...(datatableSources ?? [])],
        loading: false,
        error: null,
        needsPassword: null,
        needsPaste: false,
        datatables: registry,
      });
      if (source === 'dnd' || source === 'paste') {
        session.save({ source: source === 'dnd' ? 'dnd' : 'paste', slug: finalSlug ?? undefined, rawJson: text });
      }
    } catch (e) {
      setState((s) => ({ ...s, error: e instanceof Error ? e.message : String(e) }));
    }
  }, [session]);

  const loadFromUrl = useCallback(async (url: string) => {
    try {
      setState((s) => ({ ...s, loading: true, error: null }));
      const { text, name } = await fetchSource(url);
      await loadFromText(text, name, 'url', undefined, url);
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e instanceof Error ? e.message : String(e) }));
    }
  }, [loadFromText]);

  const handleFileDrop = useCallback(async (files: File[]) => {
    // A map may be dropped alongside a legacy module/rubric catalog and/or
    // separate datatables (JSON/CSV). mergeDroppedFiles handles the legacy
    // catalog (embedding `modules` into the map so `_moduleCatalog` resolves
    // it); loadBundle then splits any remaining datatables into a registry
    // so `resolveDatatableRefs` can substitute them before normalize.
    const dropped = await Promise.all(
      files.map(async (f) => ({ name: f.name, text: await f.text() })),
    );
    try {
      const { mapText, mapName } = mergeDroppedFiles(dropped);
      const bundleInput = dropped.map((f) => (f.name === mapName ? { name: mapName, text: mapText } : f));
      const bundle = loadBundle(bundleInput);
      // Datatable sources = every dropped file that isn't the map.
      const datatableSources = bundleInput
        .filter((f) => f.name !== bundle.lifecycleName)
        .map((f) => ({ name: f.name, text: f.text, lang: detectLang(f.name, f.text) }));
      await loadFromText(
        bundle.lifecycleText, bundle.lifecycleName, 'dnd',
        undefined, undefined, bundle.registry, datatableSources,
      );
    } catch (e) {
      setState((s) => ({ ...s, error: e instanceof Error ? e.message : String(e) }));
    }
  }, [loadFromText]);

  const handlePaste = useCallback(async (text: string) => {
    await loadFromText(text, 'pasted', 'paste');
  }, [loadFromText]);

  /**
   * Load a document that came from a storage adapter: `sources[0]` is the map,
   * the rest are datatables. Reuses the same bundle → resolve → normalize path
   * as drag-and-drop, tagging the load with the given `slug` so autosave writes
   * back to the same document. The datatable registry is rebuilt from the
   * sources exactly as commitSource/handleFileDrop do.
   */
  const loadFromSources = useCallback(async (sources: RawSource[], slug: string) => {
    const first = sources[0];
    if (!first) {
      setState((s) => ({ ...s, error: 'Empty document (no sources).' }));
      return;
    }
    try {
      const bundleInput = sources.map((s) => ({ name: s.name, text: s.text }));
      const bundle = loadBundle(bundleInput);
      const datatableSources = bundleInput
        .filter((f) => f.name !== bundle.lifecycleName)
        .map((f) => ({ name: f.name, text: f.text, lang: detectLang(f.name, f.text) }));
      await loadFromText(
        bundle.lifecycleText, bundle.lifecycleName, 'storage',
        slug, undefined, bundle.registry, datatableSources,
      );
    } catch (e) {
      setState((s) => ({ ...s, error: e instanceof Error ? e.message : String(e) }));
    }
  }, [loadFromText]);

  const decryptImage = useCallback(async (url: string, password: string) => {
    try {
      setState((s) => ({ ...s, loading: true, error: null }));
      const jsonText = await decodeFromImageUrl(url, password);
      const data = parseSource(jsonText);
      const normalized = normalize(data);
      setState({
        data: normalized,
        source: 'img',
        slug: null,
        rawSources: [{ name: 'decrypted.json', text: jsonText, lang: 'json' }],
        loading: false,
        error: null,
        needsPassword: null,
        needsPaste: false,
      });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e instanceof Error ? e.message : 'Decryption failed' }));
    }
  }, []);

  const showPasteUI = useCallback(() => {
    setState((s) => ({ ...s, loading: false, needsPaste: true }));
  }, []);

  const commitSource = useCallback((index: number, newText: string) => {
    setState((s) => {
      const sources = s.rawSources.slice();
      const target = sources[index];
      if (!target) return s;
      sources[index] = { ...target, text: newText };
      try {
        // Source 0 is the map; the rest are datatables. Rebuild registry from them.
        const mapSource = sources[0];
        if (!mapSource) return s;
        const mapData = parseSource(mapSource.text);
        const dtFiles = sources.slice(1).map((src) => ({ name: src.name, text: src.text }));
        const bundle = loadBundle([{ name: mapSource.name, text: mapSource.text }, ...dtFiles]);
        const withRefs = resolveDatatableRefs(mapData, bundle.registry);
        const normalized = normalize(withRefs);
        return { ...s, rawSources: sources, data: normalized, datatables: bundle.registry, error: null };
      } catch (e) {
        // Keep last good data; surface the error.
        return { ...s, rawSources: sources, error: e instanceof Error ? e.message : String(e) };
      }
    });
  }, []);

  // Initial bootstrap — runs once
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
    const hashParams = new URLSearchParams(hash);
    const src = params.get('src');
    const dataBlob = hashParams.get('data');
    const imgUrl = hashParams.get('img') ?? params.get('img');
    const showPaste = params.has('paste');
    const slugHash = (hash && !hash.includes('=') && hash !== 'data' && hash !== 'img') ? hash : null;

    (async () => {
      if (src) { await loadFromUrl(src); return; }
      if (dataBlob) {
        try {
          const data = await decodeHashData(dataBlob);
          const normalized = normalize(data);
          const text = JSON.stringify(data, null, 2);
          setState({
            data: normalized, source: 'hash', slug: null,
            rawSources: [{ name: 'embedded.json', text, lang: 'json' }],
            loading: false, error: null, needsPassword: null, needsPaste: false,
          });
        } catch (e) {
          setState((s) => ({ ...s, loading: false, error: e instanceof Error ? e.message : String(e) }));
        }
        return;
      }
      if (imgUrl) {
        setState((s) => ({ ...s, loading: false, needsPassword: { url: imgUrl } }));
        return;
      }
      // An explicit slug hash is an explicit intent and WINS over a saved
      // session: restoring a previously-uploaded map under someone's #typo URL
      // (and rewriting the URL to its slug) is surprising. A known slug loads
      // its example; an unknown slug falls through to the splash rather than
      // silently restoring an unrelated saved map.
      if (slugHash) {
        if (EXAMPLE_SLUGS[slugHash]) {
          await loadFromExample(slugHash);
          return;
        }
        setState((s) => ({ ...s, loading: false }));
        return;
      }
      // No slug intent — try session restore for DnD/paste sources.
      const restored = session.load();
      if (restored && restored.rawJson && (restored.source === 'dnd' || restored.source === 'paste')) {
        try {
          await loadFromText(restored.rawJson, restored.slug ? restored.slug + '.json' : 'restored', 'restored', restored.slug);
          return;
        } catch { /* fall through */ }
      }
      if (showPaste) { showPasteUI(); return; }
      // No source — show splash
      setState((s) => ({ ...s, loading: false }));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // hashchange listener (back/forward between examples)
  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
      if (h && h.includes('=')) return; // skip #data= / #img=
      if (h === lastHandledSlug.current) return;
      if (h && EXAMPLE_SLUGS[h]) {
        loadFromExample(h);
      }
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [loadFromExample]);

  return {
    state,
    loadFromExample,
    loadFromText,
    loadFromUrl,
    handleFileDrop,
    handlePaste,
    loadFromSources,
    commitSource,
    decryptImage,
    showPasteUI,
    EXAMPLE_SLUGS,
  };
}
