import { useCallback, useEffect, useRef, useState } from 'react';
import type { LifecycleMap, NormalizedMap, Mode, MapNode, Phase, Lane } from '@/types/lifecycle-map';
import { parseSource, decodeHashData } from '@/lib/parseSource';
import { decodeFromImageUrl } from '@/lib/share/encrypted';
import { useSessionState } from './useSessionState';

const EXAMPLE_SLUGS: Record<string, string> = {
  'hiring-pipeline': './examples/hiring-pipeline.json',
  'hiring-pipeline-yaml': './examples/hiring-pipeline.yaml',
  'hiring-pipeline-modules': './examples/with-modules/hiring-pipeline.json',
  'multi-language': './examples/multi-language.json',
  'minimal': './examples/minimal.json',
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
  out.lanes = (out.lanes ?? []) as Lane[];
  out.phases = (out.phases ?? []).map((p: Phase, i: number) => ({
    ...p,
    roman: p.roman ?? ROMAN[i] ?? String(i + 1),
    subCols: p.subCols ?? 1,
  })) as Phase[];
  out.nodes = (out.nodes ?? []) as MapNode[];
  out.edges = out.edges ?? [];

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
    if (n.today) visitMode(n.today.mode);
    if (n.tomorrow) visitMode(n.tomorrow.mode);
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

export type ViewerSource = 'url' | 'hash' | 'img' | 'slug' | 'dnd' | 'paste' | 'restored';

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
      const normalized = normalize(data);
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

  const loadFromText = useCallback(async (text: string, name: string, source: ViewerSource, slug?: string) => {
    try {
      const data = parseSource(text);
      const normalized = normalize(data);
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
        rawSources: [{ name, text, lang: detectLang(name, text) }],
        loading: false,
        error: null,
        needsPassword: null,
        needsPaste: false,
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
      await loadFromText(text, name, 'url');
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e instanceof Error ? e.message : String(e) }));
    }
  }, [loadFromText]);

  const handleFileDrop = useCallback(async (file: File) => {
    const text = await file.text();
    await loadFromText(text, file.name, 'dnd');
  }, [loadFromText]);

  const handlePaste = useCallback(async (text: string) => {
    await loadFromText(text, 'pasted', 'paste');
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
      if (slugHash && EXAMPLE_SLUGS[slugHash]) {
        await loadFromExample(slugHash);
        return;
      }
      // Try session restore for DnD/paste sources
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
    loadFromUrl,
    handleFileDrop,
    handlePaste,
    decryptImage,
    showPasteUI,
    EXAMPLE_SLUGS,
  };
}
