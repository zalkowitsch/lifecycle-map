/* lifecycle-map · viewer.js
 * Renders a swim-lane lifecycle map from JSON or YAML.
 *
 * Loading priority (first match wins):
 *   1. ?src=<url>      → fetch + parse
 *   2. #data=<base64>  → decode + gunzip + parse
 *   3. ?paste          → show paste UI
 *   4. drag-and-drop   → file dropped anywhere
 *   5. default         → splash screen with options
 *
 * Multi-language: any string in the data can be either a string or an
 * object keyed by language code, e.g. { "en": "User", "pt": "Usuário" }.
 * The L() helper resolves the current language with fallback to the first
 * available key. Language is persisted in localStorage.
 *
 * Themes: paper · mono · midcentury · blueprint. Each with light/dark mode.
 * Persisted in localStorage. URL params: ?theme=mono&mode=dark.
 *
 * MIT License · https://github.com/zalkowitsch/lifecycle-map
 */
(async function () {
  'use strict';

  // -------- constants --------
  const DEFAULT_MODES = [
    { id: 'self-serve', label: 'Self-Serve',     color: '#047857' },
    { id: 'assisted',   label: 'Assisted',       color: '#a16207' },
    { id: 'automated',  label: 'Automated',      color: '#1e40af' },
    { id: 'manual',     label: 'Manual',         color: '#b91c1c' },
    { id: 'n-a',        label: 'Not Applicable', color: '#6b6557' },
    { id: 'unknown',    label: 'Unknown',        color: '#6b6557' },
  ];
  const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV'];
  const THEMES = [
    { id: 'paper',      name: 'Paper',       desc: 'editorial schematic' },
    { id: 'mono',       name: 'Mono',        desc: 'brutalist terminal' },
    { id: 'midcentury', name: 'Mid-Century', desc: 'wes-anderson poster' },
    { id: 'blueprint',  name: 'Blueprint',   desc: 'technical drawing' },
  ];
  const STORAGE_THEME = 'lifecycle-map.theme';
  const STORAGE_MODE  = 'lifecycle-map.mode';
  const STORAGE_LANG  = 'lifecycle-map.lang';

  // -------- theme + lang state --------
  let CURRENT_LANG = null;     // set after data load; falls back to first key in any localized string
  let AVAILABLE_LANGS = null;  // discovered from the data
  let CURRENT_DATA = null;     // for re-renders on theme change
  let cssCache = null;         // memoized getComputedStyle values

  initThemeAndMode();
  initSettingsDrawer();
  initDragAndDrop();

  function initThemeAndMode() {
    const params = new URLSearchParams(window.location.search);
    const queryTheme = params.get('theme');
    const queryMode = params.get('mode');
    const storedTheme = localStorage.getItem(STORAGE_THEME);
    const storedMode = localStorage.getItem(STORAGE_MODE);
    const theme = queryTheme || storedTheme || 'paper';
    const mode = queryMode || storedMode || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(theme, false);
    applyMode(mode, false);
  }

  function applyTheme(theme, persist = true) {
    if (!THEMES.find(t => t.id === theme)) theme = 'paper';
    document.documentElement.dataset.theme = theme;
    if (persist) localStorage.setItem(STORAGE_THEME, theme);
    cssCache = null;
    updateModeIcon();
    syncSettingsUI();
    if (CURRENT_DATA) requestAnimationFrame(rerenderForTheme);
  }
  function applyMode(mode, persist = true) {
    if (mode !== 'dark' && mode !== 'light') mode = 'light';
    document.documentElement.dataset.mode = mode;
    if (persist) localStorage.setItem(STORAGE_MODE, mode);
    cssCache = null;
    updateModeIcon();
    syncSettingsUI();
    if (CURRENT_DATA) requestAnimationFrame(rerenderForTheme);
  }
  function applyLang(lang, persist = true) {
    if (!AVAILABLE_LANGS || !AVAILABLE_LANGS.includes(lang)) return;
    CURRENT_LANG = lang;
    if (persist) localStorage.setItem(STORAGE_LANG, lang);
    syncSettingsUI();
    if (CURRENT_DATA) requestAnimationFrame(rerenderForTheme);
  }
  function rerenderForTheme() {
    if (!CURRENT_DATA) return;
    document.getElementById('lanes').innerHTML = '';
    document.getElementById('phases').innerHTML = '';
    document.getElementById('edges').innerHTML = '';
    document.getElementById('nodes').innerHTML = '';
    document.getElementById('phase-header-svg').innerHTML = '';
    document.getElementById('lane-labels-svg').innerHTML = '';
    document.getElementById('sticky-corner-svg').innerHTML = '';
    render(CURRENT_DATA);
  }
  function css(varName) {
    if (!cssCache) cssCache = getComputedStyle(document.documentElement);
    return cssCache.getPropertyValue(varName).trim();
  }
  function updateModeIcon() {
    const icon = document.getElementById('mode-icon');
    if (!icon) return;
    const isDark = document.documentElement.dataset.mode === 'dark';
    if (isDark) {
      icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
    } else {
      icon.innerHTML = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>';
    }
  }

  // -------- settings drawer --------
  function initSettingsDrawer() {
    const settingsDrawer = document.getElementById('settings-drawer');
    const settingsBtn = document.getElementById('settings-btn');
    const modeBtn = document.getElementById('mode-toggle-btn');

    if (settingsBtn) settingsBtn.addEventListener('click', () => openSettings());
    if (modeBtn) modeBtn.addEventListener('click', () => {
      const cur = document.documentElement.dataset.mode;
      applyMode(cur === 'dark' ? 'light' : 'dark');
    });

    // theme cards
    const grid = document.getElementById('theme-grid');
    if (grid) {
      grid.innerHTML = THEMES.map(t => `
        <div class="theme-card" data-theme="${t.id}">
          <div class="swatches" id="sw-${t.id}"></div>
          <div class="name">${t.name}</div>
          <div class="desc">${t.desc}</div>
        </div>
      `).join('');
      grid.querySelectorAll('.theme-card').forEach(card => {
        card.addEventListener('click', () => applyTheme(card.dataset.theme));
      });
    }

    // mode toggle
    const modeToggle = document.getElementById('mode-toggle');
    if (modeToggle) {
      modeToggle.innerHTML = `
        <button data-mode="light"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>Light</button>
        <button data-mode="dark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>Dark</button>
      `;
      modeToggle.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => applyMode(btn.dataset.mode));
      });
    }

    // close on scrim click (overlay scrim from drawer logic, but settings doesn't open scrim — close on outside)
    document.addEventListener('click', (e) => {
      if (!settingsDrawer.classList.contains('open')) return;
      if (settingsDrawer.contains(e.target)) return;
      if (settingsBtn && settingsBtn.contains(e.target)) return;
      closeSettings();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && settingsDrawer.classList.contains('open')) closeSettings();
    });
  }
  function openSettings() {
    const d = document.getElementById('settings-drawer');
    d.classList.add('open');
    d.setAttribute('aria-hidden', 'false');
    const btn = document.getElementById('settings-btn');
    if (btn) btn.classList.add('is-active');
    renderThemeSwatches();
    syncSettingsUI();
  }
  function closeSettings() {
    const d = document.getElementById('settings-drawer');
    d.classList.remove('open');
    d.setAttribute('aria-hidden', 'true');
    const btn = document.getElementById('settings-btn');
    if (btn) btn.classList.remove('is-active');
  }
  function renderThemeSwatches() {
    // sample each theme's palette by temporarily swapping data-theme on a hidden probe
    const probe = document.createElement('div');
    probe.style.position = 'absolute'; probe.style.opacity = '0'; probe.style.pointerEvents = 'none';
    document.body.appendChild(probe);
    const currentMode = document.documentElement.dataset.mode;
    THEMES.forEach(t => {
      probe.dataset.theme = t.id;
      probe.dataset.mode = currentMode;
      const cs = getComputedStyle(probe);
      const colors = ['--bg', '--ink', '--accent', '--node-bg', '--mute'].map(v => cs.getPropertyValue(v).trim() || '#fff');
      const el = document.getElementById('sw-' + t.id);
      if (el) {
        el.innerHTML = colors.map(c => `<div class="swatch" style="background:${c}"></div>`).join('');
      }
    });
    probe.remove();
  }
  function syncSettingsUI() {
    const theme = document.documentElement.dataset.theme;
    const mode = document.documentElement.dataset.mode;
    document.querySelectorAll('.theme-card').forEach(c => {
      c.classList.toggle('active', c.dataset.theme === theme);
    });
    document.querySelectorAll('#mode-toggle button').forEach(b => {
      b.classList.toggle('active', b.dataset.mode === mode);
    });
    if (AVAILABLE_LANGS && AVAILABLE_LANGS.length > 1) {
      const group = document.getElementById('lang-group');
      const toggle = document.getElementById('lang-toggle');
      if (group && toggle) {
        group.style.display = '';
        toggle.innerHTML = AVAILABLE_LANGS.map(lang =>
          `<button data-lang="${lang}" class="${lang === CURRENT_LANG ? 'active' : ''}">${lang}</button>`
        ).join('');
        toggle.querySelectorAll('button').forEach(b => {
          b.addEventListener('click', () => applyLang(b.dataset.lang));
        });
      }
    }
  }

  // -------- drag and drop --------
  function initDragAndDrop() {
    let depth = 0;
    let overlay = null;

    function ensureOverlay() {
      if (overlay) return overlay;
      overlay = document.createElement('div');
      overlay.id = 'dnd-overlay';
      overlay.innerHTML = `
        <div class="dnd-inner">
          <div class="dnd-icon">
            <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M32 8 L32 40 M22 30 L32 40 L42 30"/>
              <path d="M12 44 L12 52 L52 52 L52 44" stroke-dasharray="2 3"/>
            </svg>
          </div>
          <div class="dnd-title">Drop to load</div>
          <div class="dnd-sub">Release anywhere — we'll parse JSON or YAML</div>
        </div>
      `;
      const style = document.createElement('style');
      style.textContent = `
        #dnd-overlay {
          position: fixed; inset: 16px; z-index: 999;
          background: var(--bg); opacity: 0; pointer-events: none;
          border: 2px dashed var(--accent);
          display: flex; align-items: center; justify-content: center;
          transition: opacity 160ms ease;
          backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
        }
        #dnd-overlay.show { opacity: 0.96; pointer-events: auto; }
        #dnd-overlay .dnd-inner {
          text-align: center; padding: 60px 40px;
          border: 1px solid var(--ink); background: var(--bg-2);
          max-width: 540px;
        }
        #dnd-overlay .dnd-icon { color: var(--accent); margin: 0 auto 24px; width: 64px; height: 64px; }
        #dnd-overlay .dnd-icon svg { width: 100%; height: 100%; }
        #dnd-overlay .dnd-title {
          font-family: var(--font-display);
          font-variation-settings: 'opsz' 96;
          font-size: 38px; font-weight: 400; color: var(--ink);
          letter-spacing: var(--display-tracking);
          line-height: 1.05; margin-bottom: 12px;
        }
        #dnd-overlay .dnd-sub {
          font-family: var(--font-mono); font-size: 11px;
          letter-spacing: 0.18em; text-transform: uppercase; color: var(--mute);
        }
      `;
      document.head.appendChild(style);
      document.body.appendChild(overlay);
      return overlay;
    }

    function isFileDrag(e) {
      if (!e.dataTransfer) return false;
      const types = e.dataTransfer.types;
      if (!types) return false;
      for (let i = 0; i < types.length; i++) {
        if (types[i] === 'Files' || types[i] === 'application/x-moz-file') return true;
      }
      return false;
    }

    window.addEventListener('dragenter', (e) => {
      if (!isFileDrag(e)) return;
      depth++;
      ensureOverlay().classList.add('show');
      e.preventDefault();
    });
    window.addEventListener('dragover', (e) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    });
    window.addEventListener('dragleave', (e) => {
      if (!isFileDrag(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0 && overlay) overlay.classList.remove('show');
    });
    window.addEventListener('drop', async (e) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      depth = 0;
      if (overlay) overlay.classList.remove('show');
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = parseSource(text, file.name);
        loadDataAndRender(data);
      } catch (err) {
        showError(err);
      }
    });
  }

  // -------- bootstrap --------
  const params = new URLSearchParams(window.location.search);
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
  const hashParams = new URLSearchParams(hash);

  const src = params.get('src');
  const dataBlob = hashParams.get('data');
  const showPaste = params.has('paste');

  let DATA = null;
  try {
    if (src) DATA = await loadFromUrl(src);
    else if (dataBlob) DATA = await loadFromHash(dataBlob);
    else if (showPaste) DATA = await showPasteUI();
    else DATA = await showSplash();
  } catch (err) {
    showError(err);
    return;
  }
  loadDataAndRender(DATA);

  function loadDataAndRender(data) {
    document.getElementById('splash').classList.add('hidden');
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('main-header').style.display = '';
    document.getElementById('canvas-wrap').style.display = '';
    const normalized = normalize(data);
    CURRENT_DATA = normalized;
    discoverLanguages(normalized);
    syncSettingsUI();
    render(normalized);
  }

  function discoverLanguages(data) {
    const langs = new Set();
    const visit = (val) => {
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        const keys = Object.keys(val);
        if (keys.length > 0 && keys.every(k => /^[a-z]{2}(-[A-Z]{2})?$/.test(k)) && keys.every(k => typeof val[k] === 'string')) {
          keys.forEach(k => langs.add(k));
        } else {
          Object.values(val).forEach(visit);
        }
      } else if (Array.isArray(val)) {
        val.forEach(visit);
      }
    };
    visit(data);
    AVAILABLE_LANGS = Array.from(langs).sort();
    if (AVAILABLE_LANGS.length === 0) {
      AVAILABLE_LANGS = ['en']; // sentinel — no multi-lang data found
      CURRENT_LANG = 'en';
      return;
    }
    const stored = localStorage.getItem(STORAGE_LANG);
    const fromMeta = data.meta && data.meta.default_lang;
    CURRENT_LANG = (stored && AVAILABLE_LANGS.includes(stored)) ? stored
                 : (fromMeta && AVAILABLE_LANGS.includes(fromMeta)) ? fromMeta
                 : AVAILABLE_LANGS[0];
  }

  // -------- loaders --------

  async function loadFromUrl(url) {
    showLoading('Fetching ' + url);
    const resp = await fetch(url, { redirect: 'follow' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status} fetching ${url}`);
    const text = await resp.text();
    return parseSource(text, url);
  }

  async function loadFromHash(blob) {
    showLoading('Decoding embedded data…');
    try {
      const b64 = blob.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(blob.length / 4) * 4, '=');
      const binStr = atob(b64);
      const bytes = new Uint8Array(binStr.length);
      for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
      const inflated = window.pako ? window.pako.ungzip(bytes, { to: 'string' }) : new TextDecoder().decode(bytes);
      return JSON.parse(inflated);
    } catch (e) {
      throw new Error('Failed to decode #data: ' + e.message);
    }
  }

  function parseSource(text, sourceHint) {
    try { return JSON.parse(text); } catch (_) {}
    if (window.jsyaml) {
      try { return window.jsyaml.load(text); }
      catch (e) { throw new Error('Failed to parse as JSON or YAML: ' + e.message); }
    }
    throw new Error('Source is not valid JSON, and YAML parser is unavailable.');
  }

  async function showSplash() {
    return new Promise((resolve, reject) => {
      const splash = document.getElementById('splash');
      splash.classList.remove('hidden');
      splash.querySelectorAll('.way').forEach(w => {
        w.addEventListener('click', async () => {
          const way = w.dataset.way;
          if (way === 'example') {
            try { resolve(await loadFromUrl('./examples/hiring-pipeline.json')); }
            catch (err) { reject(err); }
          } else if (way === 'example-ml') {
            try { resolve(await loadFromUrl('./examples/multi-language.json')); }
            catch (err) { reject(err); }
          } else if (way === 'dnd-hint') {
            // no-op — text-only hint
          } else if (way === 'url') {
            const url = prompt('Enter the JSON or YAML URL:');
            if (!url) return;
            window.location.search = '?src=' + encodeURIComponent(url);
          } else if (way === 'hash') {
            document.getElementById('paste-area').style.display = '';
            document.getElementById('paste-input').focus();
            wireUpPaste(resolve, reject);
          }
        });
      });
    });
  }

  async function showPasteUI() {
    return new Promise((resolve, reject) => {
      const splash = document.getElementById('splash');
      splash.classList.remove('hidden');
      document.getElementById('paste-area').style.display = '';
      document.getElementById('paste-input').focus();
      wireUpPaste(resolve, reject);
    });
  }

  function wireUpPaste(resolve, reject) {
    const btn = document.getElementById('paste-render');
    const cancel = document.getElementById('paste-cancel');
    const input = document.getElementById('paste-input');
    btn.onclick = () => {
      try { resolve(parseSource(input.value, 'pasted')); }
      catch (e) { showSplashError(e.message); }
    };
    cancel.onclick = () => { document.getElementById('paste-area').style.display = 'none'; };
  }

  function showLoading(msg) {
    const el = document.getElementById('loading');
    el.textContent = msg || 'Loading…';
    el.classList.remove('hidden');
  }

  function showError(err) {
    document.getElementById('loading').classList.add('hidden');
    showSplashError(err.message || String(err));
    document.getElementById('splash').classList.remove('hidden');
  }

  function showSplashError(msg) {
    const el = document.getElementById('splash-err');
    el.innerHTML = `<div class="err">${escapeHtml(msg)}</div>`;
  }

  // -------- localized string helper --------
  // Resolves a value that may be a string, a {lang: string} map, or null.
  function L(value) {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (typeof value !== 'object') return String(value);
    if (Array.isArray(value)) return value.map(L).join(', ');
    // try current lang, fall back to en, then first available
    if (CURRENT_LANG && typeof value[CURRENT_LANG] === 'string') return value[CURRENT_LANG];
    if (typeof value.en === 'string') return value.en;
    const firstKey = Object.keys(value).find(k => typeof value[k] === 'string');
    return firstKey ? value[firstKey] : '';
  }

  // -------- normalize --------

  function normalize(data) {
    if (!data || typeof data !== 'object') throw new Error('Top-level must be an object');
    data.meta = data.meta || {};
    data.meta.title = data.meta.title || 'Untitled';
    data.meta.subtitle = data.meta.subtitle || '';
    data.meta.context = data.meta.context || '';
    data.meta.modes = data.meta.modes && data.meta.modes.length ? data.meta.modes : DEFAULT_MODES;
    data.lanes = data.lanes || [];
    data.phases = (data.phases || []).map((p, i) => ({
      ...p,
      roman: p.roman || ROMAN[i] || String(i + 1),
      subCols: p.subCols || 1,
    }));
    data.nodes = data.nodes || [];
    data.edges = data.edges || [];

    const modeMap = {};
    data.meta.modes.forEach(m => { modeMap[m.id] = m; });
    data._modeMap = modeMap;
    data._moduleCatalog = data.modules || {};
    return data;
  }

  // -------- render --------

  function render(DATA) {
    cssCache = null; // refresh palette on every render

    // header
    const eyebrow = document.getElementById('h-eyebrow');
    const contextStr = L(DATA.meta.context);
    if (contextStr && contextStr.trim()) {
      eyebrow.style.display = '';
      eyebrow.innerHTML = contextStr.replace(/·/g, '<span class="dot">·</span>');
    } else {
      eyebrow.style.display = 'none';
    }
    const titleStr = L(DATA.meta.title);
    const subStr = L(DATA.meta.subtitle);
    document.getElementById('h-title').innerHTML = subStr
      ? `${escapeHtml(titleStr)} <em>— ${escapeHtml(subStr)}</em>`
      : escapeHtml(titleStr);
    const reload = document.getElementById('reload-link');
    if (reload && !reload._wired) {
      reload._wired = true;
      reload.addEventListener('click', (e) => {
        e.preventDefault();
        window.location = window.location.pathname;
      });
    }
    document.title = `${titleStr} · lifecycle-map`;

    const lanes = DATA.lanes;
    const phases = DATA.phases;
    const nodes = DATA.nodes;
    const edges = DATA.edges;

    // layout constants
    const LANE_LABEL_W = 130;
    const SUBCOL_W = 220;
    const PHASE_LABEL_H = 52;
    const BACKWARD_BUS_H = 52;
    const BOTTOM_RAIL_H = 40;
    const NODE_W = 200;
    const NODE_H = 64;
    const LANE_PAD_V = 16;
    const BASE_PHASE_PAD_X = 12;
    const BASE_NODE_GAP_V = 28;
    const SLOT_SPACING = 14;

    // congestion sizing
    const edgesPerPhaseGap = {};
    const edgesPerCell = {};
    edges.forEach(e => {
      const from = nodes.find(n => n.id === e.from);
      const to = nodes.find(n => n.id === e.to);
      if (!from || !to) return;
      if (from.phase !== to.phase) {
        const k = `${from.phase}>${to.phase}`;
        edgesPerPhaseGap[k] = (edgesPerPhaseGap[k] || 0) + 1;
      }
      edgesPerCell[`${to.lane}|${to.phase}`] = (edgesPerCell[`${to.lane}|${to.phase}`] || 0) + 1;
    });
    function phasePadX(phaseId) {
      let inbound = 0, outbound = 0;
      Object.entries(edgesPerPhaseGap).forEach(([k, c]) => {
        const [s, d] = k.split('>');
        if (d === phaseId) inbound += c;
        if (s === phaseId) outbound += c;
      });
      const congestion = Math.max(inbound, outbound);
      return BASE_PHASE_PAD_X + Math.min(40, Math.max(0, (congestion - 2) * 6));
    }
    function cellNodeGapV(laneId, phaseId) {
      const c = edgesPerCell[`${laneId}|${phaseId}`] || 0;
      return BASE_NODE_GAP_V + Math.min(24, Math.max(0, (c - 2) * 4));
    }

    const laneById = Object.fromEntries(lanes.map((l, i) => [l.id, { ...l, idx: i }]));
    const laneMaxStack = {};
    lanes.forEach(l => { laneMaxStack[l.id] = 1; });
    const cellCount = {};
    nodes.forEach(n => {
      const k = `${n.lane}|${n.phase}|${n.col || 0}`;
      cellCount[k] = (cellCount[k] || 0) + 1;
    });
    Object.entries(cellCount).forEach(([k, c]) => {
      const laneId = k.split('|')[0];
      if (c > laneMaxStack[laneId]) laneMaxStack[laneId] = c;
    });
    const LANE_GAP_V_BY_ID = {};
    lanes.forEach(l => {
      let maxGap = BASE_NODE_GAP_V;
      phases.forEach(p => {
        const g = cellNodeGapV(l.id, p.id);
        if (g > maxGap) maxGap = g;
      });
      LANE_GAP_V_BY_ID[l.id] = maxGap;
    });
    const LANE_HEIGHT_BY_ID = {};
    lanes.forEach(l => {
      const s = laneMaxStack[l.id];
      const gap = LANE_GAP_V_BY_ID[l.id];
      LANE_HEIGHT_BY_ID[l.id] = s * NODE_H + (s - 1) * gap + LANE_PAD_V * 2;
    });
    const LANE_TOP_BY_ID = {};
    let yCursor = PHASE_LABEL_H + BACKWARD_BUS_H;
    lanes.forEach(l => { LANE_TOP_BY_ID[l.id] = yCursor; yCursor += LANE_HEIGHT_BY_ID[l.id]; });

    let xCursor = LANE_LABEL_W;
    const phaseById = {};
    phases.forEach((p, i) => {
      const pad = phasePadX(p.id);
      const width = p.subCols * SUBCOL_W + pad * 2;
      phaseById[p.id] = { ...p, idx: i, x: xCursor, width, padX: pad };
      xCursor += width;
    });
    const SVG_W = xCursor + 40;
    const TOTAL_LANES_H = lanes.reduce((acc, l) => acc + LANE_HEIGHT_BY_ID[l.id], 0);
    const SVG_H = PHASE_LABEL_H + BACKWARD_BUS_H + TOTAL_LANES_H + BOTTOM_RAIL_H + 20;

    const cellNodes = {};
    nodes.forEach(n => {
      const k = `${n.lane}|${n.phase}|${n.col || 0}`;
      (cellNodes[k] ||= []).push(n);
    });

    const nodeById = {};
    nodes.forEach(n => {
      const colIdx = n.col || 0;
      const cellArr = cellNodes[`${n.lane}|${n.phase}|${colIdx}`];
      const stackIdx = cellArr.indexOf(n);
      const stackCount = cellArr.length;
      const phase = phaseById[n.phase];
      const gapV = LANE_GAP_V_BY_ID[n.lane];
      const xCenter = phase.x + phase.padX + colIdx * SUBCOL_W + SUBCOL_W / 2;
      const cellTop = LANE_TOP_BY_ID[n.lane];
      const cellH = LANE_HEIGHT_BY_ID[n.lane];
      const totalStackH = stackCount * NODE_H + (stackCount - 1) * gapV;
      const yCenter = cellTop + (cellH - totalStackH) / 2 + stackIdx * (NODE_H + gapV) + NODE_H / 2;
      n.x = xCenter - NODE_W / 2;
      n.y = yCenter - NODE_H / 2;
      n.cx = xCenter;
      n.cy = yCenter;
      nodeById[n.id] = n;
    });

    function stableHash(s) {
      let h = 0;
      for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
      return h;
    }
    function classifyEdge(from, to) {
      const dPhase = phaseById[to.phase].idx - phaseById[from.phase].idx;
      const dCol   = (to.col || 0) - (from.col || 0);
      if (dPhase > 0) return 'forward-phase';
      if (dPhase < 0) return 'back-phase';
      if (dCol > 0) return 'forward-col';
      if (dCol < 0) return 'back-col';
      if (to.cy > from.cy) return 'forward-stack';
      if (to.cy < from.cy) return 'back-stack';
      return 'self';
    }
    function isBackward(from, to) {
      const k = classifyEdge(from, to);
      return k === 'back-phase' || k === 'back-col' || k === 'back-stack';
    }
    const nodeBBoxCache = new Map();
    function bboxesExcluding(srcId, dstId) {
      const k = srcId + '|' + dstId;
      if (!nodeBBoxCache.has(k)) {
        const set = new Set([srcId, dstId]);
        nodeBBoxCache.set(k, nodes.filter(n => !set.has(n.id)).map(n => ({
          id: n.id, x1: n.x - 2, y1: n.y - 2, x2: n.x + NODE_W + 2, y2: n.y + NODE_H + 2,
        })));
      }
      return nodeBBoxCache.get(k);
    }
    function vertCrosses(X, Y1, Y2, boxes) {
      const yMin = Math.min(Y1, Y2), yMax = Math.max(Y1, Y2);
      return boxes.some(b => X > b.x1 && X < b.x2 && yMax > b.y1 && yMin < b.y2);
    }
    function safeMidX(initial, gapStart, gapEnd, y1, y2, boxes) {
      if (!vertCrosses(initial, y1, y2, boxes)) return initial;
      const lo = Math.min(gapStart, gapEnd), hi = Math.max(gapStart, gapEnd);
      for (let dx = 4; dx <= (hi - lo); dx += 4) {
        const left = initial - dx, right = initial + dx;
        if (left >= lo && !vertCrosses(left, y1, y2, boxes)) return left;
        if (right <= hi && !vertCrosses(right, y1, y2, boxes)) return right;
      }
      return initial;
    }

    const inletYByEdge = new Map(), outletYByEdge = new Map(), midXSlotByEdge = new Map();
    {
      const incoming = {}, outgoing = {};
      edges.forEach(e => { (incoming[e.to] ||= []).push(e); (outgoing[e.from] ||= []).push(e); });
      Object.entries(incoming).forEach(([_, list]) => {
        if (list.length <= 1) return;
        list.sort((a, b) => stableHash(a.from) - stableHash(b.from));
        list.forEach((e, i) => {
          const spread = NODE_H - 16;
          const step = spread / (list.length + 1);
          inletYByEdge.set(e.from + '>' + e.to, step * (i + 1) - spread / 2);
        });
      });
      Object.entries(outgoing).forEach(([_, list]) => {
        if (list.length <= 1) return;
        list.sort((a, b) => stableHash(a.to) - stableHash(b.to));
        list.forEach((e, i) => {
          const spread = NODE_H - 16;
          const step = spread / (list.length + 1);
          outletYByEdge.set(e.from + '>' + e.to, step * (i + 1) - spread / 2);
        });
      });
      const groupByGap = {};
      edges.forEach(e => {
        const from = nodeById[e.from], to = nodeById[e.to];
        if (!from || !to) return;
        const dPhase = phaseById[to.phase].idx - phaseById[from.phase].idx;
        const dCol = (to.col || 0) - (from.col || 0);
        let gk = null;
        if (dPhase > 0) gk = `phase:${from.phase}>${to.phase}`;
        else if (dPhase === 0 && dCol > 0) gk = `col:${from.phase}:${from.col || 0}>${to.col || 0}`;
        if (!gk) return;
        (groupByGap[gk] ||= []).push(e);
      });
      Object.values(groupByGap).forEach(list => {
        if (list.length <= 1) return;
        list.sort((a, b) => {
          const aY = (nodeById[a.from].cy + nodeById[a.to].cy) / 2;
          const bY = (nodeById[b.from].cy + nodeById[b.to].cy) / 2;
          return aY === bY ? stableHash(a.from + a.to) - stableHash(b.from + b.to) : aY - bY;
        });
        list.forEach((e, i) => {
          midXSlotByEdge.set(e.from + '>' + e.to, i - (list.length - 1) / 2);
        });
      });
    }

    function edgePath(from, to) {
      const key = from.id + '>' + to.id;
      const inletOff = inletYByEdge.get(key) || 0;
      const outletOff = outletYByEdge.get(key) || 0;
      const slot = midXSlotByEdge.get(key) || 0;
      const kind = classifyEdge(from, to);
      const r = 8;
      const MIN_RUN_IN = 22;
      const srcRight = { x: from.x + NODE_W, y: from.cy + outletOff };
      const srcLeft  = { x: from.x,          y: from.cy + outletOff };
      const srcTop   = { x: from.cx,         y: from.y };
      const srcBot   = { x: from.cx,         y: from.y + NODE_H };
      const dstLeft  = { x: to.x,            y: to.cy + inletOff };
      const dstTop   = { x: to.cx,           y: to.y };
      const dstBot   = { x: to.cx,           y: to.y + NODE_H };

      if (kind === 'forward-phase') {
        const srcPhase = phaseById[from.phase], dstPhase = phaseById[to.phase];
        const gapStart = srcPhase.x + srcPhase.width, gapEnd = dstPhase.x;
        let midX = gapEnd - gapStart > 4 ? (gapStart + gapEnd) / 2 : (srcRight.x + dstLeft.x) / 2;
        midX += slot * SLOT_SPACING;
        if (slot === 0) midX += ((stableHash(key) % 9) - 4);
        if (Math.abs(srcRight.y - dstLeft.y) < 3) return `M ${srcRight.x} ${srcRight.y} L ${dstLeft.x} ${dstLeft.y}`;
        midX = safeMidX(midX, gapStart, gapEnd, srcRight.y, dstLeft.y, bboxesExcluding(from.id, to.id));
        if (dstLeft.x - midX < MIN_RUN_IN + r) midX = dstLeft.x - MIN_RUN_IN - r;
        const dirV = Math.sign(dstLeft.y - srcRight.y);
        return `M ${srcRight.x} ${srcRight.y} L ${midX - r} ${srcRight.y} Q ${midX} ${srcRight.y} ${midX} ${srcRight.y + r * dirV} L ${midX} ${dstLeft.y - r * dirV} Q ${midX} ${dstLeft.y} ${midX + r} ${dstLeft.y} L ${dstLeft.x} ${dstLeft.y}`;
      }
      if (kind === 'forward-col') {
        if (Math.abs(srcRight.y - dstLeft.y) < 3) return `M ${srcRight.x} ${srcRight.y} L ${dstLeft.x} ${dstLeft.y}`;
        let midX = (srcRight.x + dstLeft.x) / 2 + slot * SLOT_SPACING;
        midX = safeMidX(midX, srcRight.x + 4, dstLeft.x - 4, srcRight.y, dstLeft.y, bboxesExcluding(from.id, to.id));
        const available = dstLeft.x - srcRight.x;
        const runIn = Math.min(MIN_RUN_IN, available / 2 - r);
        if (dstLeft.x - midX < runIn + r) midX = dstLeft.x - runIn - r;
        const dirV = Math.sign(dstLeft.y - srcRight.y);
        return `M ${srcRight.x} ${srcRight.y} L ${midX - r} ${srcRight.y} Q ${midX} ${srcRight.y} ${midX} ${srcRight.y + r * dirV} L ${midX} ${dstLeft.y - r * dirV} Q ${midX} ${dstLeft.y} ${midX + r} ${dstLeft.y} L ${dstLeft.x} ${dstLeft.y}`;
      }
      if (kind === 'forward-stack') {
        return `M ${srcBot.x} ${srcBot.y + 2} L ${dstTop.x} ${dstTop.y - 4}`;
      }
      if (kind === 'back-stack') {
        const loopX = from.x - 14;
        return `M ${srcLeft.x} ${srcLeft.y} L ${loopX + r} ${srcLeft.y} Q ${loopX} ${srcLeft.y} ${loopX} ${srcLeft.y - r} L ${loopX} ${dstLeft.y + r} Q ${loopX} ${dstLeft.y} ${loopX + r} ${dstLeft.y} L ${dstLeft.x} ${dstLeft.y}`;
      }
      if (kind === 'back-col') {
        const lanesBottom = PHASE_LABEL_H + BACKWARD_BUS_H + TOTAL_LANES_H;
        const dCol = Math.abs((to.col || 0) - (from.col || 0));
        const railY = lanesBottom + 8 + Math.min(dCol, 3) * 6 + (stableHash(key) % 8);
        return `M ${srcBot.x} ${srcBot.y} L ${srcBot.x} ${railY - r} Q ${srcBot.x} ${railY} ${srcBot.x - r} ${railY} L ${dstBot.x + r} ${railY} Q ${dstBot.x} ${railY} ${dstBot.x} ${railY - r} L ${dstBot.x} ${dstBot.y}`;
      }
      if (kind === 'back-phase') {
        const dist = Math.abs(phaseById[from.phase].idx - phaseById[to.phase].idx);
        const busY = PHASE_LABEL_H + 6 + (4 - Math.min(dist, 4)) * 7 + ((stableHash(key) % 8) - 4);
        return `M ${srcTop.x} ${srcTop.y} L ${srcTop.x} ${busY + r} Q ${srcTop.x} ${busY} ${srcTop.x + r * Math.sign(dstTop.x - srcTop.x)} ${busY} L ${dstTop.x - r * Math.sign(dstTop.x - srcTop.x)} ${busY} Q ${dstTop.x} ${busY} ${dstTop.x} ${busY + r} L ${dstTop.x} ${dstTop.y}`;
      }
      return `M ${srcRight.x} ${srcRight.y} L ${dstLeft.x} ${dstLeft.y}`;
    }

    // ---- DOM rendering ----
    const svg = document.getElementById('svg');
    svg.setAttribute('width', SVG_W);
    svg.setAttribute('height', SVG_H);
    svg.setAttribute('viewBox', `0 0 ${SVG_W} ${SVG_H}`);
    const lanesG = document.getElementById('lanes');
    const phasesG = document.getElementById('phases');
    const edgesG = document.getElementById('edges');
    const nodesG = document.getElementById('nodes');

    // resolve theme colors for SVG fills (CSS vars don't propagate into <rect fill="...">)
    const bgColor = css('--bg') || '#f5f1e8';
    const bg2Color = css('--bg-2') || '#ede8db';

    // lane bgs + dividers
    lanes.forEach((l, i) => {
      const y = LANE_TOP_BY_ID[l.id];
      const h = LANE_HEIGHT_BY_ID[l.id];
      if (i % 2 === 1) {
        const rect = svgEl('rect', { x: LANE_LABEL_W, y, width: SVG_W - LANE_LABEL_W, height: h, fill: bg2Color, opacity: '0.5' });
        lanesG.appendChild(rect);
      }
      if (i < lanes.length - 1) {
        lanesG.appendChild(svgEl('line', { x1: LANE_LABEL_W, y1: y + h, x2: SVG_W, y2: y + h, class: 'lane-divider' }));
      }
    });

    // sticky lane labels svg
    const laneSvg = document.getElementById('lane-labels-svg');
    laneSvg.setAttribute('width', LANE_LABEL_W);
    laneSvg.setAttribute('height', SVG_H);
    laneSvg.setAttribute('viewBox', `0 0 ${LANE_LABEL_W} ${SVG_H}`);
    laneSvg.appendChild(svgEl('rect', { x: 0, y: 0, width: LANE_LABEL_W, height: SVG_H, fill: bgColor }));
    laneSvg.appendChild(svgEl('line', { x1: 0, y1: PHASE_LABEL_H, x2: LANE_LABEL_W, y2: PHASE_LABEL_H, class: 'lane-edge' }));
    lanes.forEach((l, i) => {
      const y = LANE_TOP_BY_ID[l.id];
      const h = LANE_HEIGHT_BY_ID[l.id];
      laneSvg.appendChild(svgText('lane-sub', 14, y + 16, String(i + 1).padStart(2, '0')));
      laneSvg.appendChild(svgText('lane-label', 14, y + h / 2 + 2, L(l.label)));
      if (l.sub) laneSvg.appendChild(svgText('lane-sub', 14, y + h / 2 + 16, L(l.sub)));
      if (i < lanes.length - 1) {
        laneSvg.appendChild(svgEl('line', { x1: 0, y1: y + h, x2: LANE_LABEL_W, y2: y + h, class: 'lane-divider' }));
      }
    });
    laneSvg.appendChild(svgEl('line', { x1: LANE_LABEL_W - 1, y1: 0, x2: LANE_LABEL_W - 1, y2: SVG_H, class: 'lane-edge' }));

    // phase dividers in main svg
    const ROMAN_LABEL_GAP = 10;
    phases.forEach((p, i) => {
      const phase = phaseById[p.id];
      if (i > 0) {
        phasesG.appendChild(svgEl('line', { x1: phase.x, y1: PHASE_LABEL_H, x2: phase.x, y2: SVG_H - 30, class: 'phase-divider' }));
      }
      for (let c = 1; c < p.subCols; c++) {
        const x = phase.x + phase.padX + c * SUBCOL_W;
        phasesG.appendChild(svgEl('line', { x1: x, y1: PHASE_LABEL_H + BACKWARD_BUS_H, x2: x, y2: SVG_H - 30, class: 'subphase-divider' }));
      }
    });

    // sticky phase header
    const phSvg = document.getElementById('phase-header-svg');
    phSvg.setAttribute('width', SVG_W);
    phSvg.setAttribute('height', PHASE_LABEL_H);
    phSvg.setAttribute('viewBox', `0 0 ${SVG_W} ${PHASE_LABEL_H}`);
    phSvg.appendChild(svgEl('rect', { x: 0, y: 0, width: SVG_W, height: PHASE_LABEL_H, fill: bgColor }));
    phases.forEach((p) => {
      const phase = phaseById[p.id];
      const roman = svgText('phase-roman', phase.x + phase.padX, 30, p.roman);
      phSvg.appendChild(roman);
      const romanWidth = roman.getBBox().width;
      const labelX = phase.x + phase.padX + romanWidth + ROMAN_LABEL_GAP;
      phSvg.appendChild(svgText('phase-label', labelX, 22, L(p.label)));
      phSvg.appendChild(svgText('phase-sub', labelX, 36, `${p.subCols} ${p.subCols === 1 ? 'lane' : 'lanes'}`));
    });
    phSvg.appendChild(svgEl('line', { x1: 0, y1: PHASE_LABEL_H - 0.5, x2: SVG_W, y2: PHASE_LABEL_H - 0.5, class: 'lane-edge' }));

    // sticky corner
    const cornerSvg = document.getElementById('sticky-corner-svg');
    cornerSvg.setAttribute('width', LANE_LABEL_W);
    cornerSvg.setAttribute('height', PHASE_LABEL_H);
    cornerSvg.setAttribute('viewBox', `0 0 ${LANE_LABEL_W} ${PHASE_LABEL_H}`);
    cornerSvg.appendChild(svgEl('rect', { x: 0, y: 0, width: LANE_LABEL_W, height: PHASE_LABEL_H, fill: bgColor }));
    cornerSvg.appendChild(svgEl('line', { x1: LANE_LABEL_W - 1, y1: 0, x2: LANE_LABEL_W - 1, y2: PHASE_LABEL_H, class: 'lane-edge' }));
    cornerSvg.appendChild(svgEl('line', { x1: 0, y1: PHASE_LABEL_H - 0.5, x2: LANE_LABEL_W, y2: PHASE_LABEL_H - 0.5, class: 'lane-edge' }));

    // edges
    const edgeEls = [];
    edges.forEach((e) => {
      const from = nodeById[e.from], to = nodeById[e.to];
      if (!from || !to) return;
      const d = edgePath(from, to);
      const hit = svgEl('path', { d, class: 'edge-hit' });
      hit.addEventListener('click', (ev) => { ev.stopPropagation(); setActiveEdge(e.from, e.to); });
      edgesG.appendChild(hit);
      const path = svgEl('path', { d, 'marker-end': 'url(#arrow)' });
      const backward = isBackward(from, to);
      path.setAttribute('class', backward ? 'edge backward' : 'edge');
      path.addEventListener('click', (ev) => { ev.stopPropagation(); setActiveEdge(e.from, e.to); });
      edgesG.appendChild(path);
      edgeEls.push({ el: path, hit, from: e.from, to: e.to, backward });
    });

    function modeColor(id) {
      const m = DATA._modeMap[id];
      return m ? m.color : '#6b6557';
    }
    const inkColor = css('--ink') || '#0d0d0d';

    // nodes
    const nodeEls = {};
    nodes.forEach(n => {
      const g = svgEl('g', { class: 'node', transform: `translate(${n.x}, ${n.y})` });
      g.dataset.id = n.id;
      g.appendChild(svgEl('rect', { width: NODE_W, height: NODE_H, class: 'node-rect' }));
      if (n.today && n.today.mode) {
        g.appendChild(svgEl('circle', { cx: NODE_W - 18, cy: 11, r: 4, fill: modeColor(n.today.mode), stroke: inkColor, 'stroke-width': '1' }));
      }
      if (n.tomorrow && n.tomorrow.mode) {
        g.appendChild(svgEl('circle', { cx: NODE_W - 8, cy: 11, r: 4, fill: modeColor(n.tomorrow.mode), stroke: inkColor, 'stroke-width': '1' }));
      }
      g.appendChild(svgText('node-id', 12, 14, n.id));
      g.appendChild(svgText('node-title', 12, 36, L(n.title)));
      const subTxt = L(n.sub);
      if (subTxt) g.appendChild(svgText('node-sub', 12, 52, subTxt.length > 30 ? subTxt.slice(0, 30) + '…' : subTxt));
      g.addEventListener('click', (ev) => { ev.stopPropagation(); setActive(n.id); });
      nodesG.appendChild(g);
      nodeEls[n.id] = g;
    });

    // ---- interaction ----
    const walkOrder = [...nodes].sort((a, b) => {
      const pa = phaseById[a.phase].idx, pb = phaseById[b.phase].idx;
      if (pa !== pb) return pa - pb;
      if ((a.col || 0) !== (b.col || 0)) return (a.col || 0) - (b.col || 0);
      const la = laneById[a.lane].idx, lb = laneById[b.lane].idx;
      if (la !== lb) return la - lb;
      return a.y - b.y;
    }).map(n => n.id);

    let activeId = null, activeEdgeKey = null;
    const drawer = document.getElementById('drawer');
    const scrim = document.getElementById('scrim');
    const drawerInner = document.getElementById('drawer-inner');

    function clearActiveStyles() {
      Object.values(nodeEls).forEach(el => el.classList.remove('active', 'upstream', 'downstream'));
      edgeEls.forEach(({ el, backward }) => {
        el.classList.remove('upstream', 'downstream', 'active');
        el.setAttribute('marker-end', 'url(#arrow)');
        el.setAttribute('class', backward ? 'edge backward' : 'edge');
      });
    }
    function centerOnPoint(cx, cy) {
      const wrap = document.getElementById('canvas-wrap');
      wrap.scrollTo({
        left: Math.max(0, cx - wrap.clientWidth / 2),
        top: Math.max(0, cy - wrap.clientHeight / 2),
        behavior: 'smooth',
      });
    }
    function openDrawer() {
      drawer.classList.add('open');
      scrim.classList.add('open');
      drawer.setAttribute('aria-hidden', 'false');
    }
    function closeDrawer() {
      drawer.classList.remove('open');
      scrim.classList.remove('open');
      drawer.setAttribute('aria-hidden', 'true');
      if (activeId || activeEdgeKey) { clearActiveStyles(); activeId = null; activeEdgeKey = null; }
    }
    scrim.addEventListener('click', closeDrawer);
    document.getElementById('drawer-close').addEventListener('click', closeDrawer);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });

    function upstreamOf(id) { return edges.filter(e => e.to === id).map(e => e.from); }
    function downstreamOf(id) { return edges.filter(e => e.from === id).map(e => e.to); }

    function setActive(id) {
      activeId = id; activeEdgeKey = null;
      const node = nodeById[id];
      clearActiveStyles();
      const up = upstreamOf(id), down = downstreamOf(id);
      up.forEach(uid => nodeEls[uid] && nodeEls[uid].classList.add('upstream'));
      down.forEach(did => nodeEls[did] && nodeEls[did].classList.add('downstream'));
      edgeEls.forEach(({ el, from, to }) => {
        if (to === id) { el.classList.add('upstream'); el.setAttribute('marker-end', 'url(#arrow-upstream)'); }
        else if (from === id) { el.classList.add('downstream'); el.setAttribute('marker-end', 'url(#arrow-downstream)'); }
      });
      nodeEls[id].classList.add('active');
      renderDrawer(node, up, down);
      openDrawer();
      centerOnPoint(node.cx, node.cy);
    }

    function setActiveEdge(fromId, toId) {
      activeId = null;
      activeEdgeKey = fromId + '>' + toId;
      const from = nodeById[fromId], to = nodeById[toId];
      if (!from || !to) return;
      clearActiveStyles();
      nodeEls[fromId].classList.add('downstream');
      nodeEls[toId].classList.add('upstream');
      edgeEls.forEach(({ el, from: ef, to: et }) => {
        if (ef === fromId && et === toId) { el.classList.add('active'); el.setAttribute('marker-end', 'url(#arrow)'); }
      });
      renderEdgeDrawer(from, to);
      openDrawer();
      centerOnPoint((from.cx + to.cx) / 2, (from.cy + to.cy) / 2);
    }

    function modePill(modeId) {
      if (!modeId) return '';
      const m = DATA._modeMap[modeId] || { id: modeId, label: modeId, color: '#6b6557' };
      return `<span class="mode-pill" style="background:${m.color}22; color:${m.color}; border-color:${m.color}">${escapeHtml(L(m.label))}</span>`;
    }
    function toolsBlock(state) {
      const tools = state.tools || [], teams = state.teams || [];
      const tickets = state.tickets || [], pattern = state.proven_pattern || [];
      if (!tools.length && !teams.length && !tickets.length && !pattern.length) return '';
      const li = (lbl, arr) => arr.length ? `<div><span class="tag">${lbl}</span>${arr.map(t => `<span class="item">${escapeHtml(L(t))}</span>`).join('')}</div>` : '';
      return `<div class="toolset">${li('Tools', tools)}${li('Owners', teams)}${li('Tickets', tickets)}${li('Proven pattern', pattern)}</div>`;
    }
    function resolveModule(idOrObj) {
      if (typeof idOrObj === 'string') {
        const cat = DATA._moduleCatalog;
        if (cat[idOrObj]) return { id: idOrObj, feature: cat[idOrObj].name || idOrObj, ...cat[idOrObj] };
        return { id: idOrObj, feature: idOrObj, today: 'unknown', tomorrow: 'unknown', tags: [] };
      }
      return idOrObj;
    }
    function moduleRow(mRef) {
      const m = resolveModule(mRef);
      const tags = (m.tags || []).map(t => `<span class="tag-chip">${escapeHtml(L(t))}</span>`).join('');
      const pricing = m.pricing ? `<span class="tag-chip pricing">${escapeHtml(L(m.pricing))}</span>` : '';
      const idDisplay = m.id ? `<div class="module-id">${escapeHtml(m.id)}</div>` : '';
      return `<div class="module-row">
        <div>
          <div class="name">${escapeHtml(L(m.feature || m.name || ''))}</div>
          ${idDisplay}
          <div class="meta">${tags}${pricing}</div>
        </div>
        <div class="modes">
          ${modePill(m.today)}
          <span class="arrow">→</span>
          ${modePill(m.tomorrow)}
        </div>
      </div>`;
    }
    function renderDrawer(node, up, down) {
      const lane = laneById[node.lane], phase = phaseById[node.phase];
      const upHtml = up.length
        ? up.map(uid => `<span class="dep" data-id="${escapeHtml(uid)}">← ${escapeHtml(L(nodeById[uid].title))}</span>`).join('')
        : '<span style="color:var(--mute);font-size:12px">— entry point</span>';
      const downHtml = down.length
        ? down.map(did => `<span class="dep" data-id="${escapeHtml(did)}">→ ${escapeHtml(L(nodeById[did].title))}</span>`).join('')
        : '<span style="color:var(--mute);font-size:12px">— terminal</span>';
      const walkIdx = walkOrder.indexOf(node.id);
      const prevId = walkIdx > 0 ? walkOrder[walkIdx - 1] : null;
      const nextId = walkIdx < walkOrder.length - 1 ? walkOrder[walkIdx + 1] : null;
      const modulesHtml = (node.modules && node.modules.length)
        ? `<div class="modules-section">
            <h3>Modules <em>· ${node.modules.length}</em></h3>
            <div class="sub">features that make this step work</div>
            ${node.modules.map(moduleRow).join('')}
          </div>` : '';
      const todayStr = node.today ? L(node.today.narrative) : '';
      const tomorrowStr = node.tomorrow ? L(node.tomorrow.narrative) : '';
      drawerInner.innerHTML = `
        <div class="step-tag">
          <span class="roman">${phase.roman}</span>
          <span class="sep">·</span>
          <span>Step ${walkIdx + 1} / ${walkOrder.length}</span>
          <span class="sep">·</span>
          <span>${escapeHtml(L(phase.label))}</span>
          <span class="sep">·</span>
          <span>${escapeHtml(L(lane.label))}</span>
        </div>
        <h2>${escapeHtml(L(node.title))}</h2>
        ${L(node.sub) ? `<p class="sub-title">${escapeHtml(L(node.sub))}</p>` : ''}
        ${(node.objective || node.entity || node.actors || node.triggers || node.next) ? `
        <div class="meta-grid">
          ${node.objective ? `<div class="lbl">Objective</div><div class="val">${escapeHtml(L(node.objective))}</div>` : ''}
          ${node.entity ? `<div class="lbl">Entities</div><div class="val">${escapeHtml(L(node.entity))}</div>` : ''}
          ${node.actors ? `<div class="lbl">Actors</div><div class="val">${escapeHtml(L(node.actors))}</div>` : ''}
          ${node.triggers ? `<div class="lbl">Triggers</div><div class="val">${escapeHtml(L(node.triggers))}</div>` : ''}
          ${node.next ? `<div class="lbl">Next</div><div class="val">${escapeHtml(L(node.next))}</div>` : ''}
        </div>` : ''}
        ${node.today ? `<div class="state-section today">
          <div class="head"><div class="label"><span class="eyebrow">Today</span><span class="title">Current state</span></div>${modePill(node.today.mode)}</div>
          <div class="body">${escapeHtml(todayStr)}${toolsBlock(node.today)}</div>
        </div>` : ''}
        ${node.tomorrow ? `<div class="state-section tomorrow">
          <div class="head"><div class="label"><span class="eyebrow">Tomorrow</span><span class="title"><em>Future state</em></span></div>${modePill(node.tomorrow.mode)}</div>
          <div class="body">${escapeHtml(tomorrowStr)}${toolsBlock(node.tomorrow)}</div>
        </div>` : ''}
        ${modulesHtml}
        <div class="deps-section">
          <div class="col"><div class="lbl">Depends on</div>${upHtml}</div>
          <div class="col"><div class="lbl">Triggers</div>${downHtml}</div>
        </div>
        <div class="drawer-nav">
          <button ${prevId ? `data-prev="${escapeHtml(prevId)}"` : 'disabled'}>← Prev</button>
          <button ${nextId ? `data-next="${escapeHtml(nextId)}"` : 'disabled'}>Next →</button>
        </div>
      `;
      drawerInner.querySelectorAll('.dep').forEach(el => el.addEventListener('click', () => setActive(el.dataset.id)));
      const pb = drawerInner.querySelector('button[data-prev]'), nb = drawerInner.querySelector('button[data-next]');
      if (pb) pb.addEventListener('click', () => setActive(pb.dataset.prev));
      if (nb) nb.addEventListener('click', () => setActive(nb.dataset.next));
    }
    function renderEdgeDrawer(from, to) {
      const fromLane = laneById[from.lane], fromPhase = phaseById[from.phase];
      const toLane = laneById[to.lane], toPhase = phaseById[to.phase];
      const samePhase = from.phase === to.phase;
      const sameLane = from.lane === to.lane;
      const backward = isBackward(from, to);
      const flowKind = backward
        ? (samePhase ? 'loops back within the same phase' : 'loops back across phases')
        : (samePhase ? (sameLane ? 'continues within the same actor' : 'hands off to another actor') : 'advances to the next phase');
      drawerInner.innerHTML = `
        <div class="step-tag">
          <span class="roman">${fromPhase.roman} → ${toPhase.roman}</span>
          <span class="sep">·</span>
          <span>Connection</span>
          <span class="sep">·</span>
          <span>${backward ? 'backward' : 'forward'} flow</span>
        </div>
        <h2>${escapeHtml(L(from.title))} <em>→</em> ${escapeHtml(L(to.title))}</h2>
        <p class="sub-title">${flowKind}</p>
        <div class="meta-grid">
          <div class="lbl">From</div><div class="val"><strong>${escapeHtml(L(from.title))}</strong> · ${escapeHtml(L(fromLane.label))} · ${escapeHtml(L(fromPhase.label))}</div>
          <div class="lbl">To</div><div class="val"><strong>${escapeHtml(L(to.title))}</strong> · ${escapeHtml(L(toLane.label))} · ${escapeHtml(L(toPhase.label))}</div>
          ${from.next ? `<div class="lbl">Trigger</div><div class="val">${escapeHtml(L(from.next))}</div>` : ''}
          ${to.objective ? `<div class="lbl">Becomes</div><div class="val">${escapeHtml(L(to.objective))}</div>` : ''}
        </div>
        <div class="drawer-nav">
          <button data-jump="${escapeHtml(from.id)}">Inspect ${escapeHtml(L(from.title))} →</button>
          <button data-jump="${escapeHtml(to.id)}">Inspect ${escapeHtml(L(to.title))} →</button>
        </div>
      `;
      drawerInner.querySelectorAll('button[data-jump]').forEach(b => b.addEventListener('click', () => setActive(b.dataset.jump)));
    }

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
      e.preventDefault();
      if (!activeId) { setActive(walkOrder[0]); return; }
      const idx = walkOrder.indexOf(activeId);
      if (e.key === 'ArrowRight' && idx < walkOrder.length - 1) setActive(walkOrder[idx + 1]);
      if (e.key === 'ArrowLeft' && idx > 0) setActive(walkOrder[idx - 1]);
    });

    // pan on drag (single-bind; safe across rerenders)
    const wrap = document.getElementById('canvas-wrap');
    if (!wrap._panWired) {
      wrap._panWired = true;
      let panning = false, startX = 0, startY = 0, startScrollLeft = 0, startScrollTop = 0;
      let movedEnough = false;
      function isInteractive(target) {
        return !!(target && target.closest && (target.closest('.node') || target.closest('path.edge') || target.closest('path.edge-hit')));
      }
      wrap.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 && e.button !== 1) return;
        if (isInteractive(e.target)) return;
        panning = true; movedEnough = false;
        startX = e.clientX; startY = e.clientY;
        startScrollLeft = wrap.scrollLeft; startScrollTop = wrap.scrollTop;
        wrap.classList.add('panning');
        wrap.setPointerCapture(e.pointerId);
        e.preventDefault();
      });
      wrap.addEventListener('pointermove', (e) => {
        if (!panning) return;
        const dx = e.clientX - startX, dy = e.clientY - startY;
        if (!movedEnough && Math.abs(dx) + Math.abs(dy) > 4) movedEnough = true;
        wrap.scrollLeft = startScrollLeft - dx;
        wrap.scrollTop = startScrollTop - dy;
      });
      function endPan(e) {
        if (!panning) return;
        panning = false;
        wrap.classList.remove('panning');
        try { wrap.releasePointerCapture(e.pointerId); } catch (_) {}
        if (movedEnough) {
          const swallow = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
          wrap.addEventListener('click', swallow, { once: true, capture: true });
        }
      }
      wrap.addEventListener('pointerup', endPan);
      wrap.addEventListener('pointercancel', endPan);
      wrap.addEventListener('pointerleave', (e) => { if (panning) endPan(e); });
    }
  }

  // -------- helpers --------

  function svgEl(tag, attrs) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  }
  function svgText(cls, x, y, text) {
    const el = svgEl('text', { x, y, class: cls });
    el.textContent = text;
    return el;
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }
})();
