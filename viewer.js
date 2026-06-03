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
    { id: 'solarized',  name: 'Solarized',   desc: 'developer classic' },
    { id: 'newsprint',  name: 'Newsprint',   desc: '1920s newspaper' },
    { id: 'neon',       name: 'Neon',        desc: 'cyberpunk minimal' },
    { id: 'botanical',  name: 'Botanical',   desc: 'herbarium plate' },
  ];
  const STORAGE_THEME = 'lifecycle-map.theme';
  const STORAGE_MODE  = 'lifecycle-map.mode';
  const STORAGE_LANG  = 'lifecycle-map.lang';

  // Known example slugs → file paths. Slug appears in URL as #slug.
  const EXAMPLE_SLUGS = {
    'hiring-pipeline':         './examples/hiring-pipeline.json',
    'hiring-pipeline-yaml':    './examples/hiring-pipeline.yaml',
    'hiring-pipeline-modules': './examples/with-modules/hiring-pipeline.json',
    'multi-language':          './examples/multi-language.json',
    'minimal':                 './examples/minimal.json',
  };
  function slugify(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/\.(json|ya?ml)$/i, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64) || 'untitled';
  }
  function setHashSlug(slug, replace = false) {
    if (!slug) return;
    const newHash = '#' + slug;
    if (window.location.hash === newHash) return;
    const url = window.location.pathname + window.location.search + newHash;
    try {
      if (replace) history.replaceState(null, '', url);
      else history.pushState(null, '', url);
    } catch (_) {
      window.location.hash = slug;
    }
  }
  const LANG_NAMES = {
    en: 'EN · English',
    pt: 'PT · Português',
    es: 'ES · Español',
    fr: 'FR · Français',
    de: 'DE · Deutsch',
    it: 'IT · Italiano',
    ja: 'JA · 日本語',
    zh: 'ZH · 中文',
    ko: 'KO · 한국어',
  };

  // UI string dictionary. Keys are stable; values are localized per UI lang.
  // The viewer chrome (settings drawer, splash, header captions) reads these
  // via [data-i18n="key"] in the HTML, set on initial load and on lang change.
  const UI_LANGS = ['en', 'pt', 'es'];
  const UI = {
    en: {
      'header.walkHint':         '<kbd>←</kbd> <kbd>→</kbd> walk · drag empty to pan',
      'header.docs':             'docs',
      'header.share.title':      'Share',
      'header.settings.title':   'Settings',
      'header.code.title':       'View source',
      'header.zoom.title':       'Zoom',
      'header.zoom.fit':         'Fit to screen',
      'header.search.title':     'Search (⌘K)',
      'search.placeholder':      'Search nodes…',
      'search.empty':            'No nodes match.',
      'code.eyebrow':            'source',
      'code.title':              'Code <em>· raw source</em>',
      'code.copy':               'Copy',
      'code.download':           'Download',
      'code.empty':              'No source available for this map.',
      'loading':                 'Loading lifecycle data…',
      'splash.title':            'lifecycle-map <em>— viewer</em>',
      'splash.eyebrow':          'interactive swim-lane lifecycle viewer',
      'splash.lead':             'Render any swim-lane lifecycle map from a JSON or YAML source. Five ways to load:',
      'splash.example.h':        'Try an example →',
      'splash.example.p':        'Load the hiring-pipeline example to explore the schema and interactions.',
      'splash.exampleMl.h':      'Try multi-language →',
      'splash.exampleMl.p':      'A smaller example with strings in <code>en</code>, <code>pt</code>, and <code>es</code>. Switch language in <strong>Settings → Language</strong>.',
      'splash.url.h':            'Load from URL → <code>?src=https://…</code>',
      'splash.url.p':            'Pass a JSON or YAML URL as a query param. Works with public Gists, raw GitHub URLs, or any CORS-enabled endpoint.',
      'splash.hash.h':           'Embed in URL → <code>#data=…</code>',
      'splash.hash.p':           'Self-contained URLs with gzip-compressed JSON in the fragment. Great for AI agents — no hosting needed.',
      'splash.dnd.h':            'Or just drag a file in →',
      'splash.dnd.p':            'Drop a <code>.json</code> or <code>.yaml</code> file anywhere on this page.',
      'splash.paste.h':          'Paste JSON or YAML',
      'splash.paste.render':     'Render',
      'splash.paste.cancel':     'Cancel',
      'splash.footer.docs':      'Documentation',
      'splash.footer.github':    'GitHub',
      'splash.footer.license':   'MIT License',
      'settings.eyebrow':        'preferences',
      'settings.title':          'Settings <em>· make it yours</em>',
      'settings.theme':          'Theme',
      'settings.appearance':     'Appearance',
      'settings.language':       'Language',
      'settings.uiLanguage':     'Interface language',
      'settings.dataLanguage':   'Map language',
      'settings.mode.light':     'Light',
      'settings.mode.dark':      'Dark',
      'settings.foot.docs':      'Read the docs',
      'settings.foot.github':    'View on GitHub',
      'settings.foot.license':   'MIT License',
      'dnd.title':               'Drop to load',
      'dnd.sub':                 "Release anywhere — we'll parse JSON or YAML",
    },
    pt: {
      'header.walkHint':         '<kbd>←</kbd> <kbd>→</kbd> caminhar · arraste vazio para pan',
      'header.docs':             'docs',
      'header.share.title':      'Compartilhar',
      'header.settings.title':   'Configurações',
      'header.code.title':       'Ver código-fonte',
      'header.zoom.title':       'Zoom',
      'header.zoom.fit':         'Caber na tela',
      'header.search.title':     'Buscar (⌘K)',
      'search.placeholder':      'Buscar nodes…',
      'search.empty':            'Nenhum node encontrado.',
      'code.eyebrow':            'código',
      'code.title':              'Código <em>· fonte bruta</em>',
      'code.copy':               'Copiar',
      'code.download':           'Baixar',
      'code.empty':              'Nenhum código-fonte disponível para este mapa.',
      'loading':                 'Carregando dados do lifecycle…',
      'splash.title':            'lifecycle-map <em>— viewer</em>',
      'splash.eyebrow':          'visualizador interativo de lifecycle em swim-lane',
      'splash.lead':             'Renderize qualquer mapa de lifecycle a partir de JSON ou YAML. Cinco formas de carregar:',
      'splash.example.h':        'Experimente um exemplo →',
      'splash.example.p':        'Carregue o exemplo do pipeline de contratação para explorar o schema e as interações.',
      'splash.exampleMl.h':      'Experimente multi-idioma →',
      'splash.exampleMl.p':      'Um exemplo menor com strings em <code>en</code>, <code>pt</code>, e <code>es</code>. Troque o idioma em <strong>Configurações → Idioma</strong>.',
      'splash.url.h':            'Carregar por URL → <code>?src=https://…</code>',
      'splash.url.p':            'Passe uma URL de JSON ou YAML como parâmetro. Funciona com Gists públicos, URLs raw do GitHub, ou qualquer endpoint com CORS.',
      'splash.hash.h':           'Embutir na URL → <code>#data=…</code>',
      'splash.hash.p':           'URLs auto-contidas com JSON comprimido em gzip no fragment. Ótimo para agentes de IA — sem hospedagem.',
      'splash.dnd.h':            'Ou só arraste um arquivo →',
      'splash.dnd.p':            'Solte um arquivo <code>.json</code> ou <code>.yaml</code> em qualquer lugar desta página.',
      'splash.paste.h':          'Cole JSON ou YAML',
      'splash.paste.render':     'Renderizar',
      'splash.paste.cancel':     'Cancelar',
      'splash.footer.docs':      'Documentação',
      'splash.footer.github':    'GitHub',
      'splash.footer.license':   'Licença MIT',
      'settings.eyebrow':        'preferências',
      'settings.title':          'Configurações <em>· do seu jeito</em>',
      'settings.theme':          'Tema',
      'settings.appearance':     'Aparência',
      'settings.language':       'Idioma',
      'settings.uiLanguage':     'Idioma da interface',
      'settings.dataLanguage':   'Idioma do mapa',
      'settings.mode.light':     'Claro',
      'settings.mode.dark':      'Escuro',
      'settings.foot.docs':      'Ler os docs',
      'settings.foot.github':    'Ver no GitHub',
      'settings.foot.license':   'Licença MIT',
      'dnd.title':               'Solte para carregar',
      'dnd.sub':                 'Solte em qualquer lugar — vamos parsear JSON ou YAML',
    },
    es: {
      'header.walkHint':         '<kbd>←</kbd> <kbd>→</kbd> caminar · arrastra vacío para pan',
      'header.docs':             'docs',
      'header.share.title':      'Compartir',
      'header.settings.title':   'Configuración',
      'header.code.title':       'Ver código fuente',
      'header.zoom.title':       'Zoom',
      'header.zoom.fit':         'Ajustar a la pantalla',
      'header.search.title':     'Buscar (⌘K)',
      'search.placeholder':      'Buscar nodes…',
      'search.empty':            'Ningún node coincide.',
      'code.eyebrow':            'código',
      'code.title':              'Código <em>· fuente cruda</em>',
      'code.copy':               'Copiar',
      'code.download':           'Descargar',
      'code.empty':              'No hay código fuente disponible para este mapa.',
      'loading':                 'Cargando datos del lifecycle…',
      'splash.title':            'lifecycle-map <em>— viewer</em>',
      'splash.eyebrow':          'visor interactivo de lifecycle en swim-lane',
      'splash.lead':             'Renderiza cualquier mapa de lifecycle desde JSON o YAML. Cinco formas de cargar:',
      'splash.example.h':        'Prueba un ejemplo →',
      'splash.example.p':        'Carga el ejemplo de pipeline de contratación para explorar el schema y las interacciones.',
      'splash.exampleMl.h':      'Prueba multi-idioma →',
      'splash.exampleMl.p':      'Un ejemplo más pequeño con strings en <code>en</code>, <code>pt</code>, y <code>es</code>. Cambia el idioma en <strong>Configuración → Idioma</strong>.',
      'splash.url.h':            'Cargar desde URL → <code>?src=https://…</code>',
      'splash.url.p':            'Pasa una URL de JSON o YAML como parámetro. Funciona con Gists públicos, URLs raw de GitHub, o cualquier endpoint con CORS.',
      'splash.hash.h':           'Embebido en URL → <code>#data=…</code>',
      'splash.hash.p':           'URLs auto-contenidas con JSON comprimido en el fragment. Excelente para agentes IA — sin hospedaje.',
      'splash.dnd.h':            'O simplemente arrastra un archivo →',
      'splash.dnd.p':            'Suelta un archivo <code>.json</code> o <code>.yaml</code> en cualquier lugar de esta página.',
      'splash.paste.h':          'Pega JSON o YAML',
      'splash.paste.render':     'Renderizar',
      'splash.paste.cancel':     'Cancelar',
      'splash.footer.docs':      'Documentación',
      'splash.footer.github':    'GitHub',
      'splash.footer.license':   'Licencia MIT',
      'settings.eyebrow':        'preferencias',
      'settings.title':          'Configuración <em>· a tu manera</em>',
      'settings.theme':          'Tema',
      'settings.appearance':     'Apariencia',
      'settings.language':       'Idioma',
      'settings.uiLanguage':     'Idioma de la interfaz',
      'settings.dataLanguage':   'Idioma del mapa',
      'settings.mode.light':     'Claro',
      'settings.mode.dark':      'Oscuro',
      'settings.foot.docs':      'Leer la documentación',
      'settings.foot.github':    'Ver en GitHub',
      'settings.foot.license':   'Licencia MIT',
      'dnd.title':               'Suelta para cargar',
      'dnd.sub':                 'Suelta en cualquier lugar — parseamos JSON o YAML',
    },
  };
  const STORAGE_UI_LANG = 'lifecycle-map.uiLang';
  let CURRENT_UI_LANG = (function () {
    const stored = localStorage.getItem(STORAGE_UI_LANG);
    if (stored && UI[stored]) return stored;
    const browser = (navigator.language || 'en').slice(0, 2).toLowerCase();
    return UI[browser] ? browser : 'en';
  })();
  function t(key) {
    return (UI[CURRENT_UI_LANG] && UI[CURRENT_UI_LANG][key])
        || (UI.en[key])
        || key;
  }
  function applyUILang(lang, persist = true) {
    if (!UI[lang]) return;
    CURRENT_UI_LANG = lang;
    if (persist) localStorage.setItem(STORAGE_UI_LANG, lang);
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      const val = t(key);
      if (el.dataset.i18nAttr) {
        el.setAttribute(el.dataset.i18nAttr, val.replace(/<[^>]+>/g, ''));
      } else {
        el.innerHTML = val;
      }
    });
    syncSettingsUI();
  }

  // -------- theme + lang state --------
  let CURRENT_LANG = null;     // set after data load; falls back to first key in any localized string
  let AVAILABLE_LANGS = null;  // discovered from the data
  let CURRENT_DATA = null;     // for re-renders on theme change
  let cssCache = null;         // memoized getComputedStyle values
  let __PH_BORDER_DIMS = null; // dimensions captured by render() for the
                               // phase-header bottom border SVG

  // -------- zoom --------
  // CURRENT_ZOOM = 1.0 default (100%). Lower = see more at once (zoom out).
  // Implementation: keep SVG viewBox at logical dimensions, but scale the
  // SVG element's width/height attributes by zoom. That makes all SVG
  // content render smaller at the same vector quality, scrollbars adjust
  // naturally, and edge routing/sticky logic don't need to know about it.
  const STORAGE_ZOOM = 'lifecycle-map.zoom';
  const ZOOM_LEVELS = [0.25, 0.4, 0.6, 0.75, 0.9, 1.0, 1.25, 1.5, 2.0];
  let CURRENT_ZOOM = (function () {
    const stored = parseFloat(localStorage.getItem(STORAGE_ZOOM));
    return (stored && stored > 0.1 && stored <= 4) ? stored : 1.0;
  })();
  function applyZoom(z, persist = true) {
    z = Math.max(0.1, Math.min(4, z));
    CURRENT_ZOOM = z;
    if (persist) localStorage.setItem(STORAGE_ZOOM, String(z));
    // Re-render: SVG widths/heights need to be recomputed against the new zoom
    if (CURRENT_DATA) rerenderForTheme();
    updateZoomLabel();
  }
  function fitToScreen() {
    if (!__PH_BORDER_DIMS) { applyZoom(1.0); return; }
    const wrap = document.getElementById('canvas-wrap');
    if (!wrap) return;
    const { SVG_W } = __PH_BORDER_DIMS;
    // Aim to fit the SVG content width into the viewport, with a tiny margin.
    const viewportW = Math.max(200, wrap.clientWidth - 20);
    const zoom = Math.min(1.0, viewportW / SVG_W);
    applyZoom(zoom);
  }
  function updateZoomLabel() {
    const el = document.getElementById('zoom-label');
    if (el) el.textContent = Math.round(CURRENT_ZOOM * 100) + '%';
    document.querySelectorAll('#zoom-menu [data-zoom]').forEach(b => {
      const val = parseFloat(b.dataset.zoom);
      b.classList.toggle('active', Math.abs(val - CURRENT_ZOOM) < 0.001);
    });
  }

  // (Re)paints the phase-header bottom-border SVG. Width = canvas-wrap
  // scrollWidth so the line covers the full scroll content, including any
  // drawer-pad area or post-SVG_W trailing space. Called from render() and
  // from setDrawerPad() whenever the canvas-wrap width changes.
  function updatePhaseHeaderBorder() {
    if (!__PH_BORDER_DIMS) return;
    const { LANE_LABEL_W, PHASE_LABEL_H } = __PH_BORDER_DIMS;
    const borderSvg = document.getElementById('phase-header-border-svg');
    const wrap = document.getElementById('canvas-wrap');
    if (!borderSvg || !wrap) return;
    // scrollWidth reflects padding-right when drawer is open
    const w = Math.max(wrap.scrollWidth, wrap.clientWidth);
    // Also honor zoom — border y-offset must match the scaled phase header
    const Z = CURRENT_ZOOM;
    borderSvg.setAttribute('width', w);
    borderSvg.setAttribute('height', 1);
    borderSvg.setAttribute('viewBox', `0 0 ${w} 1`);
    borderSvg.style.top = (PHASE_LABEL_H * Z - 1) + 'px';
    borderSvg.innerHTML = '';
    borderSvg.appendChild(svgEl('line', {
      x1: LANE_LABEL_W * Z, y1: 0.5, x2: w, y2: 0.5, class: 'lane-edge'
    }));
  }

  initThemeAndMode();
  initSettingsDrawer();
  initCodeDrawer();
  initZoomControl();
  initSearch();
  initDragAndDrop();
  // Translate the UI to whichever language is saved/detected.
  applyUILang(CURRENT_UI_LANG, false);

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
    syncSettingsUI();
    if (CURRENT_DATA) requestAnimationFrame(rerenderForTheme);
  }
  function applyMode(mode, persist = true) {
    if (mode !== 'dark' && mode !== 'light') mode = 'light';
    document.documentElement.dataset.mode = mode;
    if (persist) localStorage.setItem(STORAGE_MODE, mode);
    cssCache = null;
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
  // -------- settings drawer --------
  function initSettingsDrawer() {
    const settingsDrawer = document.getElementById('settings-drawer');
    const settingsBtn = document.getElementById('settings-btn');

    if (settingsBtn) settingsBtn.addEventListener('click', () => openSettings());
    const settingsCloseBtn = document.getElementById('settings-close');
    if (settingsCloseBtn) settingsCloseBtn.addEventListener('click', () => closeSettings());

    // theme cards — each card sets its own data-theme + data-mode so the
    // CSS variables resolve to that theme's palette, making the card a true
    // mini-preview that follows the current light/dark mode.
    const grid = document.getElementById('theme-grid');
    if (grid) {
      const currentMode = document.documentElement.dataset.mode || 'light';
      grid.innerHTML = THEMES.map(th => `
        <div class="theme-card" data-theme="${th.id}" data-mode="${currentMode}">
          <div class="swatches" id="sw-${th.id}"></div>
          <div class="name">${th.name}</div>
          <div class="desc">${th.desc}</div>
        </div>
      `).join('');
      grid.querySelectorAll('.theme-card').forEach(card => {
        card.addEventListener('click', () => applyTheme(card.dataset.theme));
      });
    }

    // mode toggle is now built by syncSettingsUI (so labels are localized)

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
    // Sample each theme's palette by reading CSS variables off a hidden
    // probe element. Apply the sampled colors as INLINE styles to the card
    // (background, border, name color, desc color) — relying on CSS var
    // inheritance from data attributes on the card itself proved
    // unreliable (the html-level data-theme/data-mode cascades override
    // the card-level ones for var(--bg) inside .theme-card { background:
    // var(--bg) }).
    const currentMode = document.documentElement.dataset.mode || 'light';
    THEMES.forEach(th => {
      const probe = document.createElement('div');
      probe.setAttribute('data-theme', th.id);
      probe.setAttribute('data-mode', currentMode);
      probe.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;visibility:hidden;pointer-events:none;';
      document.body.appendChild(probe);
      void probe.offsetWidth;
      const cs = getComputedStyle(probe);
      const bg     = cs.getPropertyValue('--bg').trim()      || '#fff';
      const bg2    = cs.getPropertyValue('--bg-2').trim()    || bg;
      const ink    = cs.getPropertyValue('--ink').trim()     || '#000';
      const mute   = cs.getPropertyValue('--mute').trim()    || '#888';
      const accent = cs.getPropertyValue('--accent').trim()  || ink;
      const rule   = cs.getPropertyValue('--rule').trim()    || mute;
      const nodeBg = cs.getPropertyValue('--node-bg').trim() || bg;
      probe.remove();
      // paint swatches
      const sw = document.getElementById('sw-' + th.id);
      if (sw) {
        const colors = [bg, ink, accent, nodeBg, mute];
        sw.innerHTML = colors.map(c => `<div class="swatch" style="background:${c}"></div>`).join('');
      }
      // paint card chrome (bg + border + text colors)
      const card = document.querySelector('.theme-card[data-theme="' + th.id + '"]');
      if (card) {
        card.style.backgroundColor = bg;
        card.style.borderColor = card.classList.contains('active') ? accent : rule;
        card.style.color = ink;
        const name = card.querySelector('.name');
        const desc = card.querySelector('.desc');
        if (name) name.style.color = ink;
        if (desc) desc.style.color = mute;
      }
    });
  }
  // -------- zoom control --------
  function initZoomControl() {
    const btn = document.getElementById('zoom-btn');
    const menu = document.getElementById('zoom-menu');
    if (!btn || !menu) return;
    function toggleMenu(open) {
      const willOpen = open != null ? open : menu.hasAttribute('hidden');
      if (willOpen) {
        menu.removeAttribute('hidden');
        btn.classList.add('is-active');
      } else {
        menu.setAttribute('hidden', '');
        btn.classList.remove('is-active');
      }
    }
    btn.addEventListener('click', (e) => { e.stopPropagation(); toggleMenu(); });
    menu.addEventListener('click', (e) => {
      const t = e.target.closest('button');
      if (!t) return;
      if (t.id === 'zoom-fit') {
        fitToScreen();
      } else if (t.dataset.zoom) {
        applyZoom(parseFloat(t.dataset.zoom));
      }
      toggleMenu(false);
    });
    document.addEventListener('click', (e) => {
      if (menu.hasAttribute('hidden')) return;
      if (menu.contains(e.target) || btn.contains(e.target)) return;
      toggleMenu(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !menu.hasAttribute('hidden')) toggleMenu(false);
      // Cmd/Ctrl + 0 / - / + for quick zoom
      if (!e.metaKey && !e.ctrlKey) return;
      if (e.key === '0') { e.preventDefault(); applyZoom(1.0); }
      else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        const lower = [...ZOOM_LEVELS].reverse().find(z => z < CURRENT_ZOOM - 0.001);
        if (lower) applyZoom(lower);
      } else if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        const higher = ZOOM_LEVELS.find(z => z > CURRENT_ZOOM + 0.001);
        if (higher) applyZoom(higher);
      }
    });
    // Cmd/Ctrl + scroll over the canvas = zoom in/out
    const wrap = document.getElementById('canvas-wrap');
    if (wrap) {
      wrap.addEventListener('wheel', (e) => {
        if (!e.metaKey && !e.ctrlKey) return;
        e.preventDefault();
        const dir = e.deltaY < 0 ? 1 : -1;
        const list = dir > 0 ? ZOOM_LEVELS : [...ZOOM_LEVELS].reverse();
        const next = list.find(z => dir > 0 ? z > CURRENT_ZOOM + 0.001 : z < CURRENT_ZOOM - 0.001);
        if (next) applyZoom(next);
      }, { passive: false });
    }
    updateZoomLabel();
  }

  // -------- search (Cmd+K) --------
  let SEARCH_RESULTS = [];
  let SEARCH_ACTIVE_IDX = 0;
  function initSearch() {
    const btn = document.getElementById('search-btn');
    const modal = document.getElementById('search-modal');
    const input = document.getElementById('search-input');
    const scrim = document.getElementById('search-scrim');
    if (!btn || !modal || !input) return;

    input.placeholder = t('search.placeholder');

    btn.addEventListener('click', () => openSearch());
    scrim.addEventListener('click', () => closeSearch());

    document.addEventListener('keydown', (e) => {
      // Cmd/Ctrl + K opens search
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (modal.classList.contains('open')) closeSearch();
        else openSearch();
        return;
      }
      if (!modal.classList.contains('open')) return;
      if (e.key === 'Escape') { e.preventDefault(); closeSearch(); }
      else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (SEARCH_RESULTS.length) {
          SEARCH_ACTIVE_IDX = Math.min(SEARCH_ACTIVE_IDX + 1, SEARCH_RESULTS.length - 1);
          updateSearchActive();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (SEARCH_RESULTS.length) {
          SEARCH_ACTIVE_IDX = Math.max(SEARCH_ACTIVE_IDX - 1, 0);
          updateSearchActive();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const r = SEARCH_RESULTS[SEARCH_ACTIVE_IDX];
        if (r) selectSearchResult(r.id);
      }
    });

    input.addEventListener('input', () => runSearch(input.value));
  }
  function openSearch() {
    const modal = document.getElementById('search-modal');
    const input = document.getElementById('search-input');
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    input.value = '';
    SEARCH_ACTIVE_IDX = 0;
    runSearch('');
    setTimeout(() => input.focus(), 0);
  }
  function closeSearch() {
    const modal = document.getElementById('search-modal');
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }
  function runSearch(query) {
    const list = document.getElementById('search-results');
    if (!list) return;
    if (!CURRENT_DATA || !CURRENT_DATA.nodes) {
      list.innerHTML = `<div class="search-empty">${escapeHtml(t('search.empty'))}</div>`;
      SEARCH_RESULTS = [];
      return;
    }
    const q = (query || '').trim().toLowerCase();
    const all = CURRENT_DATA.nodes.map(n => ({
      id: n.id,
      title: L(n.title) || n.id,
      sub: L(n.sub) || '',
      objective: L(n.objective) || '',
      laneLabel: (CURRENT_DATA.lanes.find(l => l.id === n.lane) ? L(CURRENT_DATA.lanes.find(l => l.id === n.lane).label) : ''),
      phaseLabel: (CURRENT_DATA.phases.find(p => p.id === n.phase) ? L(CURRENT_DATA.phases.find(p => p.id === n.phase).label) : ''),
    }));
    const matches = !q ? all : all.filter(n => {
      const hay = (n.id + ' ' + n.title + ' ' + n.sub + ' ' + n.objective + ' ' + n.laneLabel + ' ' + n.phaseLabel).toLowerCase();
      return hay.includes(q);
    });
    SEARCH_RESULTS = matches.slice(0, 50);
    SEARCH_ACTIVE_IDX = 0;
    if (!SEARCH_RESULTS.length) {
      list.innerHTML = `<div class="search-empty">${escapeHtml(t('search.empty'))}</div>`;
      return;
    }
    list.innerHTML = SEARCH_RESULTS.map((n, i) => `
      <div class="search-result ${i === 0 ? 'active' : ''}" data-id="${escapeHtml(n.id)}" data-idx="${i}" role="option">
        <div class="search-result-title">${highlightMatch(n.title, q)}</div>
        <div class="search-result-meta">
          <span class="id-chip">${escapeHtml(n.id)}</span>
          ${n.laneLabel ? ' · ' + escapeHtml(n.laneLabel) : ''}
          ${n.phaseLabel ? ' · ' + escapeHtml(n.phaseLabel) : ''}
          ${n.sub ? ' · ' + highlightMatch(n.sub, q) : ''}
        </div>
      </div>
    `).join('');
    list.querySelectorAll('.search-result').forEach(el => {
      el.addEventListener('mouseenter', () => {
        SEARCH_ACTIVE_IDX = parseInt(el.dataset.idx, 10);
        updateSearchActive();
      });
      el.addEventListener('click', () => selectSearchResult(el.dataset.id));
    });
  }
  function highlightMatch(text, q) {
    if (!q) return escapeHtml(text);
    const escapedText = escapeHtml(text);
    const idx = text.toLowerCase().indexOf(q);
    if (idx < 0) return escapedText;
    // re-find in escaped text — easier: split original then escape each part
    const before = escapeHtml(text.slice(0, idx));
    const match = escapeHtml(text.slice(idx, idx + q.length));
    const after = escapeHtml(text.slice(idx + q.length));
    return `${before}<mark>${match}</mark>${after}`;
  }
  function updateSearchActive() {
    const items = document.querySelectorAll('.search-result');
    items.forEach((el, i) => el.classList.toggle('active', i === SEARCH_ACTIVE_IDX));
    const activeEl = items[SEARCH_ACTIVE_IDX];
    if (activeEl) activeEl.scrollIntoView({ block: 'nearest' });
  }
  function selectSearchResult(nodeId) {
    closeSearch();
    if (typeof window.__lifecycleSetActive === 'function') {
      window.__lifecycleSetActive(nodeId);
    }
  }

  // -------- code drawer (raw source viewer) --------
  let CURRENT_CODE_TAB = 0;
  function initCodeDrawer() {
    const btn = document.getElementById('code-btn');
    const drawer = document.getElementById('code-drawer');
    const closeBtn = document.getElementById('code-close');
    if (!btn || !drawer) return;
    btn.addEventListener('click', () => openCodeDrawer());
    if (closeBtn) closeBtn.addEventListener('click', () => closeCodeDrawer());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('open')) closeCodeDrawer();
    });
    document.getElementById('code-copy').addEventListener('click', async () => {
      const src = CURRENT_SOURCES[CURRENT_CODE_TAB];
      if (!src) return;
      try {
        await navigator.clipboard.writeText(src.text);
        flashCopyButton();
      } catch (_) {}
    });
    document.getElementById('code-download').addEventListener('click', () => {
      const src = CURRENT_SOURCES[CURRENT_CODE_TAB];
      if (!src) return;
      const blob = new Blob([src.text], { type: src.lang === 'yaml' ? 'application/x-yaml' : 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = src.name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    window.__lifecycleRenderCodeTabs = renderCodeTabs;
  }
  function flashCopyButton() {
    const btn = document.getElementById('code-copy');
    if (!btn) return;
    const orig = btn.textContent;
    btn.textContent = '✓ ' + orig;
    setTimeout(() => { btn.textContent = orig; }, 1400);
  }
  function openCodeDrawer() {
    const drawer = document.getElementById('code-drawer');
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    const btn = document.getElementById('code-btn');
    if (btn) btn.classList.add('is-active');
    renderCodeTabs();
  }
  function closeCodeDrawer() {
    const drawer = document.getElementById('code-drawer');
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    const btn = document.getElementById('code-btn');
    if (btn) btn.classList.remove('is-active');
  }
  function renderCodeTabs() {
    const tabsEl = document.getElementById('code-tabs');
    const content = document.getElementById('code-content');
    const meta = document.getElementById('code-meta');
    if (!tabsEl || !content) return;
    if (!CURRENT_SOURCES.length) {
      tabsEl.innerHTML = '';
      content.textContent = t('code.empty');
      if (meta) meta.textContent = '';
      return;
    }
    if (CURRENT_CODE_TAB >= CURRENT_SOURCES.length) CURRENT_CODE_TAB = 0;
    tabsEl.innerHTML = CURRENT_SOURCES.map((s, i) =>
      `<button class="code-tab ${i === CURRENT_CODE_TAB ? 'active' : ''}" data-idx="${i}" role="tab">
        ${escapeHtml(s.name)}<span class="lang-chip">${escapeHtml(s.lang)}</span>
      </button>`
    ).join('');
    tabsEl.querySelectorAll('.code-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        CURRENT_CODE_TAB = parseInt(tab.dataset.idx, 10);
        renderCodeTabs();
      });
    });
    const src = CURRENT_SOURCES[CURRENT_CODE_TAB];
    content.innerHTML = highlight(src.text, src.lang);
    if (meta) {
      const lines = src.text.split('\n').length;
      const kb = (src.text.length / 1024).toFixed(1);
      meta.textContent = `${lines} lines · ${kb} KB`;
    }
  }
  // very small regex highlighter — enough for editorial-clean look without a lib
  function highlight(text, lang) {
    const esc = escapeHtml(text);
    if (lang === 'yaml') {
      return esc
        .replace(/(^|\n)(\s*#[^\n]*)/g, '$1<span class="tok-yaml-comment">$2</span>')
        .replace(/(^|\n)(\s*-?\s*)([A-Za-z_][\w-]*)(\s*:)/g,
          '$1$2<span class="tok-yaml-key">$3</span><span class="tok-punct">$4</span>');
    }
    // json
    return esc
      .replace(/("(?:\\.|[^"\\])*")(\s*:)/g, '<span class="tok-key">$1</span><span class="tok-punct">$2</span>')
      .replace(/(:\s*)("(?:\\.|[^"\\])*")/g, '$1<span class="tok-str">$2</span>')
      .replace(/\b(true|false)\b/g, '<span class="tok-bool">$1</span>')
      .replace(/\bnull\b/g, '<span class="tok-null">null</span>')
      .replace(/(:\s*)(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g, '$1<span class="tok-num">$2</span>');
  }

  function syncSettingsUI() {
    const theme = document.documentElement.dataset.theme;
    const mode = document.documentElement.dataset.mode;
    document.querySelectorAll('.theme-card').forEach(c => {
      c.classList.toggle('active', c.dataset.theme === theme);
      // keep each card's data-mode in sync with the global mode so the
      // mini-preview uses the right palette for the user's current mode
      c.dataset.mode = mode;
    });
    // re-render swatches so the dots inside also use the mode-correct palette
    if (document.getElementById('settings-drawer').classList.contains('open')) {
      renderThemeSwatches();
    }
    // mode toggle — rebuild labels because they're localized
    const modeToggle = document.getElementById('mode-toggle');
    if (modeToggle && !modeToggle._wired) {
      modeToggle.innerHTML = `
        <button data-mode="light"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg><span data-mode-label="light">${t('settings.mode.light')}</span></button>
        <button data-mode="dark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg><span data-mode-label="dark">${t('settings.mode.dark')}</span></button>
      `;
      modeToggle.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => applyMode(btn.dataset.mode));
      });
      modeToggle._wired = true;
    }
    // re-translate mode labels (they may change with UI lang)
    document.querySelectorAll('#mode-toggle [data-mode-label="light"]').forEach(s => { s.textContent = t('settings.mode.light'); });
    document.querySelectorAll('#mode-toggle [data-mode-label="dark"]').forEach(s => { s.textContent = t('settings.mode.dark'); });
    document.querySelectorAll('#mode-toggle button').forEach(b => {
      b.classList.toggle('active', b.dataset.mode === mode);
    });

    // UI language toggle (always shown — 3 options EN/PT/ES)
    const uiToggle = document.getElementById('ui-lang-toggle');
    if (uiToggle) {
      uiToggle.innerHTML = UI_LANGS.map(lang =>
        `<button data-uilang="${lang}" class="${lang === CURRENT_UI_LANG ? 'active' : ''}">${LANG_NAMES[lang] || lang.toUpperCase()}</button>`
      ).join('');
      uiToggle.querySelectorAll('button').forEach(b => {
        b.addEventListener('click', () => applyUILang(b.dataset.uilang));
      });
    }

    // Data language toggle (only if 2+ languages found in the data)
    const group = document.getElementById('lang-group');
    const toggle = document.getElementById('lang-toggle');
    if (group && toggle) {
      if (AVAILABLE_LANGS && AVAILABLE_LANGS.length > 1) {
        group.style.display = '';
        toggle.innerHTML = AVAILABLE_LANGS.map(lang =>
          `<button data-lang="${lang}" class="${lang === CURRENT_LANG ? 'active' : ''}">${LANG_NAMES[lang] || lang.toUpperCase()}</button>`
        ).join('');
        toggle.querySelectorAll('button').forEach(b => {
          b.addEventListener('click', () => applyLang(b.dataset.lang));
        });
      } else {
        group.style.display = 'none';
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
          <div class="dnd-title" data-i18n="dnd.title">Drop to load</div>
          <div class="dnd-sub" data-i18n="dnd.sub">Release anywhere — we'll parse JSON or YAML</div>
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
      // Apply current UI translations to the freshly-added overlay
      overlay.querySelectorAll('[data-i18n]').forEach(el => {
        const v = t(el.dataset.i18n);
        if (el.dataset.i18nAttr) el.setAttribute(el.dataset.i18nAttr, v.replace(/<[^>]+>/g, ''));
        else el.innerHTML = v;
      });
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
        CURRENT_SOURCE = 'dnd';
        CURRENT_SLUG = slugify(file.name);
        setHashSlug(CURRENT_SLUG);
        setCurrentSources([{ name: file.name, text, lang: detectLang(file.name, text) }]);
        loadDataAndRender(data);
      } catch (err) {
        showError(err);
      }
    });
  }

  // -------- session state (survives refresh, dies with tab) --------
  // Persists in sessionStorage so a Refresh (e.g. from the version-update
  // badge) doesn't wipe an in-memory drag-and-drop or paste. URL-based
  // sources (?src=, #data=, slug, #img=) are reconstructible from the URL
  // itself — we only stash the raw JSON for memory-only sources.
  const SS_KEY = 'lifecycle-map.session';
  const SS_TTL_MS = 24 * 60 * 60 * 1000;  // 24 hours
  let CURRENT_SOURCE = null;
  let CURRENT_SLUG = null;
  function saveSessionState(patch) {
    try {
      const prev = readSessionState() || {};
      const next = Object.assign({}, prev, patch, { ts: Date.now() });
      sessionStorage.setItem(SS_KEY, JSON.stringify(next));
    } catch (_) {}
  }
  function readSessionState() {
    try {
      const raw = sessionStorage.getItem(SS_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || !obj.ts || Date.now() - obj.ts > SS_TTL_MS) {
        sessionStorage.removeItem(SS_KEY);
        return null;
      }
      return obj;
    } catch (_) { return null; }
  }
  function clearSessionState() {
    try { sessionStorage.removeItem(SS_KEY); } catch (_) {}
  }

  // -------- bootstrap --------
  let CURRENT_RAW_JSON = null;  // last raw JSON text — handed to share UI
  // Original source texts shown in the "Code" drawer. Each entry is
  // { name, text, lang } where lang is 'json' or 'yaml'. Today we usually
  // have one entry (the file the user loaded), but multi-file support is
  // already structured here.
  let CURRENT_SOURCES = [];
  function detectLang(name, text) {
    const lower = (name || '').toLowerCase();
    if (lower.endsWith('.yaml') || lower.endsWith('.yml')) return 'yaml';
    if (lower.endsWith('.json')) return 'json';
    // sniff: JSON starts with `{` or `[`
    const t = (text || '').trimStart();
    if (t.startsWith('{') || t.startsWith('[')) return 'json';
    return 'yaml';
  }
  function setCurrentSources(sources) {
    CURRENT_SOURCES = Array.isArray(sources) ? sources : [];
    if (window.__lifecycleRenderCodeTabs) window.__lifecycleRenderCodeTabs();
  }

  const params = new URLSearchParams(window.location.search);
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
  const hashParams = new URLSearchParams(hash);

  const src = params.get('src');
  const dataBlob = hashParams.get('data');
  const imgUrl = hashParams.get('img') || params.get('img');
  const showPaste = params.has('paste');
  // A "slug hash" is a hash that has no `=` (so it's not key=value) and is not 'data' or 'img'.
  const slugHash = (hash && !hash.includes('=') && hash !== 'data' && hash !== 'img') ? hash : null;

  let DATA = null;
  let RESTORED_STATE = null;
  try {
    if (src) {
      CURRENT_SOURCE = 'url';
      DATA = await loadFromUrl(src);
    }
    else if (dataBlob) {
      CURRENT_SOURCE = 'hash';
      DATA = await loadFromHash(dataBlob);
    }
    else if (imgUrl) {
      CURRENT_SOURCE = 'img';
      DATA = await loadFromEncryptedImage(imgUrl);
    }
    else if (slugHash && EXAMPLE_SLUGS[slugHash]) {
      CURRENT_SOURCE = 'slug';
      CURRENT_SLUG = slugHash;
      DATA = await loadFromUrl(EXAMPLE_SLUGS[slugHash]);
    }
    else {
      // No URL hint. Try restoring an in-memory source from the previous tab
      // session — covers refresh after drag-and-drop or paste.
      const restored = readSessionState();
      if (restored && restored.rawJson && (restored.source === 'dnd' || restored.source === 'paste')) {
        try {
          DATA = parseSource(restored.rawJson, restored.slug || 'restored');
          CURRENT_SOURCE = restored.source;
          CURRENT_SLUG = restored.slug || null;
          if (CURRENT_SLUG) setHashSlug(CURRENT_SLUG, true);
          setCurrentSources([{
            name: (CURRENT_SLUG || 'restored') + '.json',
            text: restored.rawJson,
            lang: detectLang('', restored.rawJson),
          }]);
          RESTORED_STATE = restored;
        } catch (_) { /* fall through to splash */ }
      }
      if (!DATA) {
        if (showPaste) DATA = await showPasteUI();
        else DATA = await showSplash();
      }
    }
  } catch (err) {
    showError(err);
    return;
  }
  loadDataAndRender(DATA);
  // Restore drawer/scroll position after first render
  if (RESTORED_STATE) {
    requestAnimationFrame(() => {
      const wrap = document.getElementById('canvas-wrap');
      if (RESTORED_STATE.scrollLeft != null) wrap.scrollLeft = RESTORED_STATE.scrollLeft;
      if (RESTORED_STATE.scrollTop  != null) wrap.scrollTop  = RESTORED_STATE.scrollTop;
      if (RESTORED_STATE.activeNodeId && typeof window.__lifecycleSetActive === 'function') {
        window.__lifecycleSetActive(RESTORED_STATE.activeNodeId);
      }
    });
  }

  // Listen for back/forward navigation between example slugs.
  // Only reloads when the hash points to a known example AND differs from current.
  let LAST_HANDLED_SLUG = slugHash || null;
  window.addEventListener('hashchange', async () => {
    const h = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
    if (h && h.includes('=')) return; // ignore #data= / #img=
    if (h === LAST_HANDLED_SLUG) return;
    if (h && EXAMPLE_SLUGS[h]) {
      LAST_HANDLED_SLUG = h;
      try {
        const data = await loadFromUrl(EXAMPLE_SLUGS[h]);
        loadDataAndRender(data);
      } catch (e) { showError(e); }
    } else if (!h) {
      // user navigated back to root — reload to splash
      window.location.reload();
    }
  });

  function loadDataAndRender(data) {
    document.getElementById('splash').classList.add('hidden');
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('main-header').style.display = '';
    document.getElementById('canvas-wrap').style.display = '';
    const normalized = normalize(data);
    CURRENT_DATA = normalized;
    CURRENT_RAW_JSON = JSON.stringify(data, (k, v) => k.startsWith('_') ? undefined : v, 2);
    discoverLanguages(normalized);
    syncSettingsUI();
    render(normalized);
    if (window.LifecycleShare) {
      window.LifecycleShare.attachShareUI(() => CURRENT_RAW_JSON);
    }
    // Persist memory-only sources so a refresh survives. URL sources are
    // reconstructible from the URL, no need to stash them.
    if (CURRENT_SOURCE === 'dnd' || CURRENT_SOURCE === 'paste') {
      saveSessionState({
        source: CURRENT_SOURCE,
        slug: CURRENT_SLUG,
        rawJson: CURRENT_RAW_JSON,
      });
    } else if (CURRENT_SOURCE) {
      // URL-derived: just track which slug/source so resaves keep scroll position
      saveSessionState({ source: CURRENT_SOURCE, slug: CURRENT_SLUG, rawJson: null });
    }
  }

  async function loadFromEncryptedImage(url) {
    showLoading('Loading encrypted image…');
    if (!window.LifecycleShare) throw new Error('Share module not loaded.');
    return new Promise((resolve, reject) => {
      const prompt = document.getElementById('decrypt-prompt');
      const input = document.getElementById('decrypt-input');
      const err = document.getElementById('decrypt-err');
      const cancel = document.getElementById('decrypt-cancel');
      const go = document.getElementById('decrypt-go');
      document.getElementById('loading').classList.add('hidden');
      prompt.classList.remove('hidden');
      input.value = '';
      err.textContent = '';
      input.focus();

      async function attempt() {
        const pw = input.value;
        if (!pw) { err.textContent = 'Password required.'; return; }
        err.textContent = '';
        go.disabled = true; go.textContent = 'Decrypting…';
        try {
          const jsonText = await window.LifecycleShare.decodeFromImageUrl(url, pw);
          prompt.classList.add('hidden');
          resolve(JSON.parse(jsonText));
        } catch (e) {
          err.textContent = e.message || 'Decryption failed. Wrong password?';
          go.disabled = false; go.textContent = 'Decrypt & load';
        }
      }
      go.onclick = attempt;
      input.onkeydown = (e) => { if (e.key === 'Enter') attempt(); };
      cancel.onclick = () => { prompt.classList.add('hidden'); reject(new Error('Cancelled.')); };
    });
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
    // Stash the raw text for the Code drawer (using the last segment of the
    // URL path as filename).
    try {
      const u = new URL(url, window.location.href);
      const name = (u.pathname.split('/').pop() || 'remote') || 'remote';
      setCurrentSources([{ name, text, lang: detectLang(name, text) }]);
    } catch (_) {
      setCurrentSources([{ name: 'remote', text, lang: detectLang('', text) }]);
    }
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
      // Re-prettify so the Code drawer shows nice indentation even when
      // the original was minified.
      let pretty = inflated;
      try { pretty = JSON.stringify(JSON.parse(inflated), null, 2); } catch (_) {}
      setCurrentSources([{ name: 'embedded.json', text: pretty, lang: 'json' }]);
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
            try {
              setHashSlug('hiring-pipeline', true);
              resolve(await loadFromUrl('./examples/hiring-pipeline.json'));
            }
            catch (err) { reject(err); }
          } else if (way === 'example-ml') {
            try {
              setHashSlug('multi-language', true);
              resolve(await loadFromUrl('./examples/multi-language.json'));
            }
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
      try {
        const text = input.value;
        const data = parseSource(text, 'pasted');
        setCurrentSources([{ name: 'pasted', text, lang: detectLang('', text) }]);
        resolve(data);
      } catch (e) { showSplashError(e.message); }
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

    // Auto-discover modes referenced by nodes/modules but missing from meta.modes.
    // Generates a distinct color per id via golden-ratio HSL distribution so any
    // ad-hoc string used as `mode:` renders with a unique color instead of grey.
    const seen = new Set(Object.keys(modeMap));
    const discovered = [];
    const visitMode = (id) => {
      if (!id || typeof id !== 'string' || seen.has(id)) return;
      seen.add(id);
      discovered.push(id);
    };
    data.nodes.forEach(n => {
      if (n.today)    visitMode(n.today.mode);
      if (n.tomorrow) visitMode(n.tomorrow.mode);
      (n.modules || []).forEach(m => {
        if (m && typeof m === 'object') { visitMode(m.today); visitMode(m.tomorrow); }
      });
    });
    Object.values(data._moduleCatalog || data.modules || {}).forEach(m => {
      if (m && typeof m === 'object') { visitMode(m.today); visitMode(m.tomorrow); }
    });
    discovered.forEach((id, i) => {
      modeMap[id] = { id, label: id, color: autoModeColor(i, discovered.length) };
    });

    data._modeMap = modeMap;
    data._moduleCatalog = data.modules || {};
    return data;
  }

  // Distinct colors via golden-ratio hue rotation. Always saturated and mid-light
  // so they read against any theme background.
  function autoModeColor(i, total) {
    const GOLDEN = 0.61803398875;
    // start hue at 25° (warm) so the first auto color isn't accidentally the
    // same blue-purple every theme tends to use for highlights
    const h = ((25 + i * GOLDEN * 360) % 360);
    // alternate between two saturation/lightness pairs for extra visual gap
    const sat = i % 2 === 0 ? 70 : 56;
    const lig = i % 2 === 0 ? 42 : 50;
    return `hsl(${h.toFixed(0)}, ${sat}%, ${lig}%)`;
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
    // For small maps, make sure the canvas fills the viewport — otherwise
    // lanes terminate halfway across the screen and the right half looks
    // empty/broken. The actual content (nodes, edges, phase columns) is
    // unaffected; we just stretch lane bgs and the bottom border to cover
    // the viewport width.
    const wrapEl = document.getElementById('canvas-wrap');
    const viewportW = (wrapEl && wrapEl.clientWidth) || window.innerWidth || 1024;
    const SVG_W = Math.max(xCursor + 40, viewportW);
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
    // Apply CURRENT_ZOOM by scaling SVG element pixel size; viewBox stays
    // logical so all internal coords (edge routing, sticky math, etc.) are
    // untouched.
    const Z = CURRENT_ZOOM;
    const svg = document.getElementById('svg');
    svg.setAttribute('width', SVG_W * Z);
    svg.setAttribute('height', SVG_H * Z);
    svg.setAttribute('viewBox', `0 0 ${SVG_W} ${SVG_H}`);
    // Allow zebra lane bg + dividers (drawn deliberately past SVG_W to fill
    // the drawer-pad area) to render outside the viewBox.
    svg.setAttribute('overflow', 'visible');
    const lanesG = document.getElementById('lanes');
    const phasesG = document.getElementById('phases');
    const edgesG = document.getElementById('edges');
    const nodesG = document.getElementById('nodes');

    // resolve theme colors for SVG fills (CSS vars don't propagate into <rect fill="...">)
    const bgColor = css('--bg') || '#f5f1e8';
    const bg2Color = css('--bg-2') || '#ede8db';

    // Lane backgrounds (zebra) + dividers. We need to cover the area that
    // becomes visible when the drawer opens (canvas-wrap gets padding-right).
    // To stay reactive without re-rendering, paint extensions as separate
    // elements with class "grid-ext" that JS can toggle on/off based on
    // drawer state. Base paint stops at SVG_W (the natural content edge).
    const DRAWER_EXT_W = Math.max(800, Math.ceil(window.innerWidth * 0.45));
    lanes.forEach((l, i) => {
      const y = LANE_TOP_BY_ID[l.id];
      const h = LANE_HEIGHT_BY_ID[l.id];
      if (i % 2 === 1) {
        // base zebra (always visible) — covers up to SVG_W
        lanesG.appendChild(svgEl('rect', { x: LANE_LABEL_W, y, width: SVG_W - LANE_LABEL_W, height: h, fill: bg2Color, opacity: '0.5' }));
        // extension (hidden by default, shown when drawer opens)
        lanesG.appendChild(svgEl('rect', { x: SVG_W, y, width: DRAWER_EXT_W, height: h, fill: bg2Color, opacity: '0.5', class: 'grid-ext' }));
      }
      if (i < lanes.length - 1) {
        lanesG.appendChild(svgEl('line', { x1: LANE_LABEL_W, y1: y + h, x2: SVG_W, y2: y + h, class: 'lane-divider' }));
        lanesG.appendChild(svgEl('line', { x1: SVG_W, y1: y + h, x2: SVG_W + DRAWER_EXT_W, y2: y + h, class: 'lane-divider grid-ext' }));
      }
    });

    // sticky lane labels svg
    const laneSvg = document.getElementById('lane-labels-svg');
    laneSvg.setAttribute('width', LANE_LABEL_W * Z);
    laneSvg.setAttribute('height', SVG_H * Z);
    laneSvg.setAttribute('viewBox', `0 0 ${LANE_LABEL_W} ${SVG_H}`);
    laneSvg.appendChild(svgEl('rect', { x: 0, y: 0, width: LANE_LABEL_W, height: SVG_H, fill: bgColor }));
    // bottom border below the corner area is drawn by phSvg/cornerSvg — skip here
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
    // lane-labels right border starts at PHASE_LABEL_H; the top segment is owned by cornerSvg
    laneSvg.appendChild(svgEl('line', { x1: LANE_LABEL_W - 1, y1: PHASE_LABEL_H, x2: LANE_LABEL_W - 1, y2: SVG_H, class: 'lane-edge' }));

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
    phSvg.setAttribute('width', SVG_W * Z);
    phSvg.setAttribute('height', PHASE_LABEL_H * Z);
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
    // Phase-header bottom border lives in a dedicated SVG sibling so it can
    // span the FULL canvas-wrap content width — past SVG_W, into the
    // drawer-pad area, all the way to the rightmost scrollable pixel.
    // Stash dimensions so setDrawerPad can re-issue the border on open/close.
    __PH_BORDER_DIMS = { LANE_LABEL_W, PHASE_LABEL_H, SVG_W };
    updatePhaseHeaderBorder();

    // sticky corner
    const cornerSvg = document.getElementById('sticky-corner-svg');
    cornerSvg.setAttribute('width', LANE_LABEL_W * Z);
    cornerSvg.setAttribute('height', PHASE_LABEL_H * Z);
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
    // Width the drawer covers when open (matches .drawer width / max-width).
    function drawerCoverWidth() {
      if (!drawer.classList.contains('open')) return 0;
      const rect = drawer.getBoundingClientRect();
      return Math.max(0, Math.min(rect.width, window.innerWidth * 0.94));
    }
    function centerOnPoint(cx, cy) {
      const wrap = document.getElementById('canvas-wrap');
      const drawerCover = drawerCoverWidth();
      const visibleW = Math.max(200, wrap.clientWidth - drawerCover);
      const desiredLeft = Math.max(0, cx - visibleW / 2);
      const desiredTop = Math.max(0, cy - wrap.clientHeight / 2);
      // Force a synchronous layout read so the browser registers any spacer
      // that was just appended (otherwise scrollTo() clamps to the stale
      // pre-spacer scrollWidth and the rightmost nodes never reach center).
      void wrap.scrollWidth;
      wrap.scrollTo({ left: desiredLeft, top: desiredTop, behavior: 'smooth' });
      // Belt + suspenders: re-issue the scroll on the next two frames in case
      // the spacer mutation is still being batched into layout.
      requestAnimationFrame(() => {
        if (Math.abs(wrap.scrollLeft - desiredLeft) > 2) {
          wrap.scrollTo({ left: desiredLeft, top: desiredTop, behavior: 'smooth' });
        }
        requestAnimationFrame(() => {
          if (Math.abs(wrap.scrollLeft - desiredLeft) > 2) {
            wrap.scrollTo({ left: desiredLeft, top: desiredTop, behavior: 'smooth' });
          }
        });
      });
    }
    // Grow canvas-wrap's scrollable width by directly setting an inline
    // `padding-right` on the wrap. Padding on the scroll container is the
    // simplest, most reliable way to extend scrollWidth — `position:absolute`
    // children don't always contribute on every browser. Sticky layers
    // (position:sticky) still attach to the same scroll container so the
    // sticky headers/columns continue to work normally; padding doesn't move
    // the existing content (sticky elements stay where they were).
    function setDrawerPad(open) {
      const wrap = document.getElementById('canvas-wrap');
      if (open) {
        const cover = drawer.getBoundingClientRect().width || 600;
        const visibleW = Math.max(200, wrap.clientWidth - cover);
        const padW = cover + Math.ceil(visibleW / 2);
        wrap.style.paddingRight = padW + 'px';
        wrap.classList.add('drawer-open');
      } else {
        wrap.style.paddingRight = '';
        wrap.classList.remove('drawer-open');
      }
      // Re-paint the phase-header border to span the new scroll width.
      updatePhaseHeaderBorder();
    }
    function openDrawer() {
      drawer.classList.add('open');
      scrim.classList.add('open');
      drawer.setAttribute('aria-hidden', 'false');
      // Grow the scrollable area synchronously so the subsequent
      // centerOnPoint() can scroll past the original SVG width.
      setDrawerPad(true);
    }
    function closeDrawer() {
      drawer.classList.remove('open');
      scrim.classList.remove('open');
      drawer.setAttribute('aria-hidden', 'true');
      setDrawerPad(false);
      if (activeId || activeEdgeKey) { clearActiveStyles(); activeId = null; activeEdgeKey = null; }
      saveSessionState({ activeNodeId: null });
    }
    // Scrim is click-through now (see CSS); the drawer closes via the X
    // button, Escape, or a click on empty canvas (the pan-end handler
    // below already swallows the first click after a pan, so we only
    // close on a clean click with no drag.)
    document.getElementById('drawer-close').addEventListener('click', closeDrawer);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });
    // Close drawer when user clicks on an empty area of the canvas
    // (i.e. not a node and not an edge).
    const canvasWrap = document.getElementById('canvas-wrap');
    canvasWrap.addEventListener('click', (ev) => {
      if (!drawer.classList.contains('open')) return;
      const t = ev.target;
      if (t && t.closest && (t.closest('.node') || t.closest('path.edge') || t.closest('path.edge-hit'))) return;
      closeDrawer();
    });

    function upstreamOf(id) { return edges.filter(e => e.to === id).map(e => e.from); }
    function downstreamOf(id) { return edges.filter(e => e.from === id).map(e => e.to); }

    function setActive(id) {
      activeId = id; activeEdgeKey = null;
      const node = nodeById[id];
      if (!node) return;
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
      saveSessionState({ activeNodeId: id });
    }
    // expose for the bootstrap restore path
    window.__lifecycleSetActive = setActive;

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
    // persist scroll position so refresh keeps the user where they were
    if (!wrap._scrollWired) {
      wrap._scrollWired = true;
      let scrollSaveHandle = null;
      wrap.addEventListener('scroll', () => {
        if (scrollSaveHandle) clearTimeout(scrollSaveHandle);
        scrollSaveHandle = setTimeout(() => {
          saveSessionState({ scrollLeft: wrap.scrollLeft, scrollTop: wrap.scrollTop });
        }, 200);
      }, { passive: true });
    }
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
