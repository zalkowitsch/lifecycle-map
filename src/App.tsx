import { useCallback, useEffect, useState } from 'react';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { I18nProvider, useI18n } from '@/contexts/I18nContext';
import { useViewerState } from '@/hooks/useViewerState';
import { useKeyboard } from '@/hooks/useKeyboard';
import { useSessionState } from '@/hooks/useSessionState';
import Canvas from '@/components/Canvas';
import Splash from '@/components/Splash';
import DragDropOverlay from '@/components/DragDrop';
import { NodeDrawer } from '@/components/NodeDrawer';
import { SettingsDrawer } from '@/components/SettingsDrawer';
import { CodeDrawer } from '@/components/CodeDrawer';
import ShareModal from '@/components/ShareModal';
import SearchModal from '@/components/SearchModal';
import { VersionBadge } from '@/components/VersionBadge';
import { ZoomControl } from '@/components/ZoomControl';
import ShortcutsModal from '@/components/ShortcutsModal';
import './App.css';

function AppShell() {
  const { L, t, availableLangs, setAvailableLangs, setDataLang } = useI18n();
  const { mode } = useTheme();
  const viewer = useViewerState();
  const session = useSessionState();
  // Canvas applies the zoom internally via prop — we just track the value
  // here for the header label and keyboard shortcuts.
  const [zoomValue, setZoomValue] = useState<number>(() => {
    const stored = parseFloat(localStorage.getItem('lifecycle-map.zoom') ?? '1');
    return Number.isFinite(stored) && stored > 0 ? stored : 1;
  });
  // Imperative setter used by the ZoomControl dropdown and Canvas pinch zoom.
  // Clamps to the same [0.1, 3] range as zoomIn/zoomOut and persists to LS.
  const setZoom = useCallback((z: number) => {
    if (!Number.isFinite(z)) return;
    const next = Math.max(0.1, Math.min(3, z));
    setZoomValue(next);
    localStorage.setItem('lifecycle-map.zoom', String(next));
  }, []);
  const zoom = {
    zoom: zoomValue,
    reset: () => { setZoomValue(1); localStorage.setItem('lifecycle-map.zoom', '1'); },
    zoomIn: () => setZoomValue((z) => {
      const next = Math.min(3, z * 1.25);
      localStorage.setItem('lifecycle-map.zoom', String(next));
      return next;
    }),
    zoomOut: () => setZoomValue((z) => {
      const next = Math.max(0.1, z / 1.25);
      localStorage.setItem('lifecycle-map.zoom', String(next));
      return next;
    }),
    fitToScreen: () => {
      const next = computeFitZoom();
      if (next == null) return;
      setZoomValue(next);
      localStorage.setItem('lifecycle-map.zoom', String(next));
    },
  };

  // Computes the zoom value that would fit the entire SVG into the viewport.
  // Returns null if Canvas isn't mounted yet. Used both for the
  // "Fit to screen" button and as the floor for pinch zoom-out.
  function computeFitZoom(): number | null {
    const wrap = document.querySelector('[data-canvas-wrap]') as HTMLElement | null;
    if (!wrap) return null;
    const svg = wrap.querySelector('svg') as SVGSVGElement | null;
    if (!svg) return null;
    const viewBox = svg.viewBox.baseVal;
    const w = viewBox.width || 1, h = viewBox.height || 1;
    return Math.max(0.1, Math.min(1, Math.min((wrap.clientWidth - 20) / w, (wrap.clientHeight - 20) / h)));
  }

  // Re-evaluated when the viewport size changes so pinch zoom-out always
  // bottoms out at the current fit-to-screen value.
  const [fitZoom, setFitZoom] = useState<number | null>(null);
  useEffect(() => {
    const update = (): void => setFitZoom(computeFitZoom());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [viewer.state.data]);

  // Active node
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [activeEdge, setActiveEdge] = useState<{ from: string; to: string } | null>(null);

  // Modals / drawers open state
  const [searchOpen, setSearchOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Decrypt prompt state
  const [decryptPassword, setDecryptPassword] = useState('');
  const [decryptError, setDecryptError] = useState<string | null>(null);

  // Sync html lang attribute with detected data langs
  useEffect(() => {
    if (!viewer.state.data) return;
    const langs = discoverLangs(viewer.state.data);
    setAvailableLangs(langs);
    const meta = viewer.state.data.meta as { default_lang?: string };
    if (meta?.default_lang && langs.includes(meta.default_lang)) {
      setDataLang(meta.default_lang);
    } else if (langs[0]) {
      setDataLang(langs[0]);
    }
  }, [viewer.state.data, setAvailableLangs, setDataLang]);

  // Update document title
  useEffect(() => {
    const title = viewer.state.data?.meta ? L(viewer.state.data.meta.title) : null;
    document.title = title ? `${title} · lifecycle-map` : 'lifecycle-map';
  }, [viewer.state.data, L]);

  // Walk order = phase, col, lane top-down, stack
  const walkOrder = (() => {
    const d = viewer.state.data;
    if (!d) return [];
    const phaseIdx: Record<string, number> = {};
    d.phases.forEach((p, i) => { phaseIdx[p.id] = i; });
    const laneIdx: Record<string, number> = {};
    d.lanes.forEach((l, i) => { laneIdx[l.id] = i; });
    return [...d.nodes].sort((a, b) => {
      const pa = phaseIdx[a.phase] ?? 0, pb = phaseIdx[b.phase] ?? 0;
      if (pa !== pb) return pa - pb;
      if ((a.col ?? 0) !== (b.col ?? 0)) return (a.col ?? 0) - (b.col ?? 0);
      const la = laneIdx[a.lane] ?? 0, lb = laneIdx[b.lane] ?? 0;
      return la - lb;
    }).map((n) => n.id);
  })();

  const handleNodeClick = useCallback((id: string) => {
    setActiveNodeId(id);
    setActiveEdge(null);
    session.save({ activeNodeId: id });
  }, [session]);

  const handleEdgeClick = useCallback((from: string, to: string) => {
    setActiveNodeId(null);
    setActiveEdge({ from, to });
  }, []);

  const handleCloseNodeDrawer = useCallback(() => {
    setActiveNodeId(null);
    setActiveEdge(null);
    session.save({ activeNodeId: null });
  }, [session]);

  const walkPrev = useCallback(() => {
    if (!activeNodeId) {
      const first = walkOrder[0];
      if (first) setActiveNodeId(first);
      return;
    }
    const idx = walkOrder.indexOf(activeNodeId);
    if (idx > 0) {
      const prev = walkOrder[idx - 1];
      if (prev) setActiveNodeId(prev);
    }
  }, [activeNodeId, walkOrder]);

  const walkNext = useCallback(() => {
    if (!activeNodeId) {
      const first = walkOrder[0];
      if (first) setActiveNodeId(first);
      return;
    }
    const idx = walkOrder.indexOf(activeNodeId);
    if (idx >= 0 && idx < walkOrder.length - 1) {
      const next = walkOrder[idx + 1];
      if (next) setActiveNodeId(next);
    }
  }, [activeNodeId, walkOrder]);

  useKeyboard({
    onCmdK: () => setSearchOpen((o) => !o),
    onCmd0: () => zoom.reset(),
    onCmdMinus: () => zoom.zoomOut(),
    onCmdPlus: () => zoom.zoomIn(),
    onEscape: () => {
      setSearchOpen(false);
      setShareOpen(false);
      setCodeOpen(false);
      setSettingsOpen(false);
      setShortcutsOpen(false);
      if (activeNodeId || activeEdge) handleCloseNodeDrawer();
    },
    onArrowLeft: walkPrev,
    onArrowRight: walkNext,
  });

  // "?" key opens shortcuts modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === '?' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setShortcutsOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const handleCodeEdit = useCallback((idx: number, newText: string) => {
    if (idx !== 0) return;
    const existing = viewer.state.rawSources[0];
    const existingSource = viewer.state.source;
    if (!existing) return;
    // Re-parse + re-render, preserving source identity (don't switch to 'paste').
    viewer.loadFromText(
      newText,
      existing.name,
      existingSource ?? 'paste',
      viewer.state.slug ?? undefined,
    ).catch(() => { /* parseSource already surfaces errors via state.error */ });
  }, [viewer]);

  const getJsonText = useCallback((): string => {
    const src = viewer.state.rawSources[0];
    return src?.text ?? '';
  }, [viewer.state.rawSources]);

  // Decrypt prompt for #img= URLs
  const decryptPrompt = viewer.state.needsPassword;
  const handleDecryptSubmit = useCallback(async () => {
    if (!decryptPrompt) return;
    if (!decryptPassword) { setDecryptError('Password required.'); return; }
    setDecryptError(null);
    try {
      await viewer.decryptImage(decryptPrompt.url, decryptPassword);
    } catch (e) {
      setDecryptError(e instanceof Error ? e.message : 'Decryption failed');
    }
  }, [decryptPrompt, decryptPassword, viewer]);

  // Splash if no data
  if (!viewer.state.data && !viewer.state.loading && !decryptPrompt) {
    return (
      <>
        <Splash
          onLoadExample={() => { window.location.hash = '#hiring-pipeline'; }}
          onLoadMultiLang={() => { window.location.hash = '#multi-language'; }}
          onLoadFromUrl={(url) => { window.location.search = '?src=' + encodeURIComponent(url); }}
          onLoadHashHint={viewer.showPasteUI}
          pasteMode={viewer.state.needsPaste}
          onPaste={viewer.handlePaste}
          onCancelPaste={() => { /* no-op */ }}
          error={viewer.state.error}
        />
        <DragDropOverlay onDrop={viewer.handleFileDrop} />
      </>
    );
  }

  // Decrypt prompt
  if (decryptPrompt) {
    return (
      <div className="decrypt-prompt-overlay">
        <div className="decrypt-prompt">
          <h3>Encrypted map · <em>enter password</em></h3>
          <p>This share link is an encrypted PNG. Enter the password the sender gave you.</p>
          <input
            type="password"
            autoFocus
            value={decryptPassword}
            onChange={(e) => setDecryptPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleDecryptSubmit(); }}
            placeholder="password"
          />
          {decryptError && <div className="err">{decryptError}</div>}
          <div className="actions">
            <button onClick={() => { window.location.hash = ''; window.location.reload(); }}>Cancel</button>
            <button className="primary" onClick={handleDecryptSubmit}>Decrypt &amp; load</button>
          </div>
        </div>
      </div>
    );
  }

  // Loading
  if (viewer.state.loading) {
    return <div className="loading">{t('loading')}</div>;
  }

  const data = viewer.state.data;
  if (!data) return null;

  const meta = data.meta as { title?: unknown; subtitle?: unknown; context?: unknown };
  const titleStr = L(meta.title);
  const subStr = L(meta.subtitle);
  const contextStr = L(meta.context);

  const activeNode = activeNodeId ? data.nodes.find((n) => n.id === activeNodeId) ?? null : null;
  const nodeDrawerOpen = !!(activeNode || activeEdge);

  return (
    <div className="app-shell">
      <header className="main-header">
        <div className="h-row">
          <div className="h-left">
            {contextStr && (
              <div className="h-eyebrow">{contextStr.replace(/·/g, ' · ')}</div>
            )}
            <h1>
              {titleStr}
              {subStr && <em> — {subStr}</em>}
            </h1>
          </div>
          <div className="h-meta">
            <a href="./docs/">{t('header.docs')}</a>
            <div className="h-actions">
              <button className="h-icon-btn" title={(t('header.shortcuts.title') || 'Shortcuts') + ' (?)'} onClick={() => setShortcutsOpen(true)} aria-label="Shortcuts">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="6" width="20" height="13" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M18 14h.01M8 14h8"/></svg>
              </button>
              <button className="h-icon-btn" title={t('header.search.title')} onClick={() => setSearchOpen(true)} aria-label="Search">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="7"/><line x1="20" y1="20" x2="16.65" y2="16.65"/></svg>
              </button>
              <ZoomControl zoom={zoom.zoom} onSetZoom={setZoom} onFitToScreen={zoom.fitToScreen} />
              <button className="h-icon-btn" title={t('header.code.title')} onClick={() => setCodeOpen(true)} aria-label="View source">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
              </button>
              <button className="h-icon-btn" title={t('header.share.title')} onClick={() => setShareOpen(true)} aria-label="Share">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              </button>
              <button className="h-icon-btn" title={t('header.settings.title')} onClick={() => setSettingsOpen(true)} aria-label="Settings">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <Canvas
        data={data}
        activeNodeId={activeNodeId}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onEmptyClick={handleCloseNodeDrawer}
        zoom={zoom.zoom}
        onZoom={setZoom}
        minZoom={fitZoom ?? undefined}
        L={L}
      />

      <DragDropOverlay onDrop={viewer.handleFileDrop} />

      <NodeDrawer
        open={nodeDrawerOpen}
        mode={activeNode ? 'node' : activeEdge ? 'edge' : null}
        data={data}
        activeNodeId={activeNodeId}
        activeEdge={activeEdge}
        walkOrder={walkOrder}
        onClose={handleCloseNodeDrawer}
        onNavigate={handleNodeClick}
        L={L}
      />

      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      <CodeDrawer
        open={codeOpen}
        onClose={() => setCodeOpen(false)}
        sources={viewer.state.rawSources}
        onEdit={handleCodeEdit}
      />

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        getJsonText={getJsonText}
      />

      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        data={data}
        L={L}
        onSelect={(id) => { handleNodeClick(id); setSearchOpen(false); }}
      />

      <ShortcutsModal
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />

      <VersionBadge />

      {/* mode is referenced so prefers-color-scheme + system updates re-render */}
      <span style={{ display: 'none' }} data-mode={mode} data-langs={availableLangs.join(',')} />
    </div>
  );
}

/** Discover language codes used in localized strings inside the data. */
function discoverLangs(data: unknown): string[] {
  const set = new Set<string>();
  const visit = (val: unknown) => {
    if (!val || typeof val !== 'object') return;
    if (Array.isArray(val)) { val.forEach(visit); return; }
    const obj = val as Record<string, unknown>;
    const keys = Object.keys(obj);
    if (keys.length > 0 && keys.every((k) => /^[a-z]{2}(-[A-Z]{2})?$/.test(k)) && keys.every((k) => typeof obj[k] === 'string')) {
      keys.forEach((k) => set.add(k));
      return;
    }
    Object.values(obj).forEach(visit);
  };
  visit(data);
  return Array.from(set).sort();
}

export function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AppShell />
      </I18nProvider>
    </ThemeProvider>
  );
}
