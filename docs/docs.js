/* lifecycle-map · docs.js
 * Multi-language documentation renderer with sidebar nav.
 * Languages: en, pt, es. Default: browser preference, fallback en.
 */
(function () {
  'use strict';

  // -------- content per language --------

  const SECTIONS = {
    en: [
      { id: 'what',      label: 'What is this?',     render: () => `
        <h1>lifecycle-map <em>— docs</em></h1>
        <p class="lead">A single-file viewer for swim-lane lifecycle maps. Render any process — hiring, billing, support, onboarding — from a JSON or YAML source.</p>

        <h2>What it does</h2>
        <p>A lifecycle map answers four questions about a process:</p>
        <ul>
          <li><strong>Who acts?</strong> — lanes (actors, roles, systems)</li>
          <li><strong>When?</strong> — phases (sequential stages)</li>
          <li><strong>What happens?</strong> — nodes (steps inside a lane × phase cell)</li>
          <li><strong>What triggers what?</strong> — edges (directed flow)</li>
        </ul>
        <p>Each step can optionally describe a <strong>today vs. tomorrow</strong> state. Useful for transformation roadmaps, capability mapping, and self-serve adoption planning.</p>

        <h2>Why use it</h2>
        <p>Mermaid is great for small diagrams. Miro is great for collaboration. Neither is great for structured, walkable, source-controlled lifecycle maps that you can render from JSON.</p>
        <p>This tool fills that gap. The map is data. The viewer is a single HTML file. Anything that can produce JSON can produce a map.</p>
      ` },

      { id: 'quickstart', label: 'Quickstart',       render: () => `
        <h2>Quickstart</h2>
        <p>Open the viewer with any of these three URLs:</p>
        <h3>1. Load by URL</h3>
        <pre><code>https://arkadyzalko.github.io/lifecycle-map/?src=https://gist.githubusercontent.com/.../raw/foo.json</code></pre>
        <p>Works with any CORS-enabled JSON or YAML URL — public Gists, raw GitHub URLs, your own server.</p>

        <h3>2. Embed in URL (no hosting)</h3>
        <pre><code>https://arkadyzalko.github.io/lifecycle-map/#data=&lt;base64-gzipped-json&gt;</code></pre>
        <p>The map is encoded in the URL fragment. No external file needed. Best for small maps and AI agents.</p>

        <h3>3. Paste it</h3>
        <pre><code>https://arkadyzalko.github.io/lifecycle-map/?paste</code></pre>
        <p>Opens a textarea for direct JSON or YAML paste.</p>

        <h3>The minimal valid input</h3>
        <pre><code>{
  "lanes": [
    { "id": "u", "label": "User" },
    { "id": "s", "label": "System" }
  ],
  "phases": [
    { "id": "in",  "label": "In" },
    { "id": "out", "label": "Out" }
  ],
  "nodes": [
    { "id": "ask",   "lane": "u", "phase": "in",  "title": "Ask" },
    { "id": "reply", "lane": "s", "phase": "out", "title": "Reply" }
  ],
  "edges": [
    { "from": "ask", "to": "reply" }
  ]
}</code></pre>
        <p>That's it. Paste it in, get a working map.</p>
      ` },

      { id: 'loading',    label: 'Loading data',     render: () => `
        <h2>Loading data</h2>
        <p>Three loaders. Priority is left to right: <code>?src</code> beats <code>#data</code> beats <code>?paste</code>.</p>

        <h3>?src — external URL</h3>
        <p>Pass a URL pointing to JSON or YAML. The viewer fetches it and renders.</p>
        <pre><code>?src=https://gist.githubusercontent.com/.../raw/map.yaml</code></pre>
        <p>The target URL must allow CORS. Public Gists, raw GitHub, Netlify, GitHub Pages, and S3 all work out of the box.</p>

        <h3>#data — embedded</h3>
        <p>The map is gzipped + base64-encoded and placed in the URL fragment. The browser decodes it locally — no fetch.</p>
        <pre><code># bash example
echo '{"lanes":[...]}' | gzip -9 | base64 | tr -d '\\n' | tr '+/' '-_'</code></pre>
        <p>Use the result as <code>#data=&lt;encoded&gt;</code>. URL stays under ~10 KB for most maps.</p>

        <h3>?paste — manual</h3>
        <p>Opens a textarea. Paste JSON or YAML, click Render.</p>
      ` },

      { id: 'structure',  label: 'Structure',        render: () => `
        <h2>Structure</h2>
        <p>The document has 5 top-level keys:</p>
        <pre><code>{
  "meta":   { "title": "...", "modes": [...] },
  "lanes":  [ ... ],
  "phases": [ ... ],
  "nodes":  [ ... ],
  "edges":  [ ... ]
}</code></pre>

        <h3>meta</h3>
        <ul>
          <li><code>title</code> — header text</li>
          <li><code>subtitle</code> — shown after an em-dash in italic terracotta</li>
          <li><code>context</code> — small eyebrow above the title</li>
          <li><code>modes</code> — array of ownership states (see below)</li>
        </ul>

        <h3>lanes</h3>
        <p>Horizontal rows. Order = top to bottom.</p>
        <pre><code>[
  { "id": "biller",   "label": "Biller",   "sub": "8h/day" },
  { "id": "approver", "label": "Approver", "sub": "VP+" }
]</code></pre>

        <h3>phases</h3>
        <p>Vertical columns. Order = left to right.</p>
        <pre><code>[
  { "id": "intake",  "label": "Intake",  "roman": "I",  "subCols": 1 },
  { "id": "process", "label": "Process", "roman": "II", "subCols": 2 }
]</code></pre>
        <p><code>subCols</code> lets you split a phase into multiple sub-columns for parallel flows. Defaults to 1.</p>

        <h3>nodes</h3>
        <p>Required fields: <code>id</code>, <code>lane</code>, <code>phase</code>, <code>title</code>.</p>
        <p>Optional: <code>col</code>, <code>sub</code>, <code>objective</code>, <code>entity</code>, <code>actors</code>, <code>triggers</code>, <code>next</code>, <code>today</code>, <code>tomorrow</code>, <code>modules</code>.</p>
        <p><code>today</code> and <code>tomorrow</code> have the same shape:</p>
        <pre><code>{
  "mode":      "manual",
  "narrative": "How it works in this state",
  "tools":     ["Tool A", "Tool B"],
  "teams":     ["@team-name"],
  "tickets":   ["JIRA-123"],
  "proven_pattern": ["Existing implementation referenced"]
}</code></pre>

        <h3>edges</h3>
        <p>Directional connections.</p>
        <pre><code>[
  { "from": "node-a", "to": "node-b" },
  { "from": "node-b", "to": "node-a" }   // backward, auto-detected
]</code></pre>
        <p>Backward edges (destination earlier in the flow) are rendered as dashed lines routed over the top "backward bus" or under the bottom rail, never crossing the forward flow.</p>

        <h3>modes</h3>
        <p>Define your own ownership taxonomy:</p>
        <pre><code>"modes": [
  { "id": "manual",    "label": "Manual",    "color": "#b91c1c" },
  { "id": "automated", "label": "Automated", "color": "#1e40af" }
]</code></pre>
        <p>Each <code>node.today.mode</code> and <code>node.tomorrow.mode</code> references one of these IDs.</p>
        <p>If you omit <code>meta.modes</code>, defaults are used: <code>self-serve</code>, <code>assisted</code>, <code>automated</code>, <code>manual</code>, <code>n-a</code>, <code>unknown</code>.</p>
      ` },

      { id: 'external',   label: 'External refs',    render: () => `
        <h2>External references</h2>
        <p>Modules can be defined inline or pulled from a shared catalog by ID.</p>

        <h3>Inline (default)</h3>
        <pre><code>{
  "id": "review",
  "title": "Review",
  "modules": [
    { "feature": "Bulk edit", "today": "manual", "tomorrow": "automated" }
  ]
}</code></pre>

        <h3>Catalog reference</h3>
        <p>Add a top-level <code>modules</code> map, then reference by string ID:</p>
        <pre><code>{
  "modules": {
    "shared:bulk-edit": {
      "name": "Bulk edit",
      "today": "manual",
      "tomorrow": "automated"
    }
  },
  "nodes": [
    { "id": "review", "modules": ["shared:bulk-edit"] }
  ]
}</code></pre>
        <p>Useful when many nodes share the same modules — keeps the file DRY.</p>

        <p><em>Note: cross-file <code>$ref</code> loading is on the roadmap. Today, the catalog must live in the same document.</em></p>
      ` },

      { id: 'yaml',       label: 'JSON or YAML',     render: () => `
        <h2>JSON or YAML</h2>
        <p>The viewer accepts either format. The schema is identical.</p>

        <h3>When to pick JSON</h3>
        <ul>
          <li>Generating programmatically (most languages have a JSON serializer built in)</li>
          <li>Embedding in URLs (<code>#data</code> mode)</li>
          <li>Working with AI agents (most agents output JSON cleanly)</li>
        </ul>

        <h3>When to pick YAML</h3>
        <ul>
          <li>Hand-authored maps where you'll edit a lot of text</li>
          <li>Multi-line narratives in <code>today</code> / <code>tomorrow</code> sections</li>
          <li>You prefer comments (YAML supports <code>#</code> comments; JSON doesn't)</li>
        </ul>

        <h3>YAML example</h3>
        <pre><code>meta:
  title: Hiring Pipeline
lanes:
  - { id: candidate, label: Candidate }
  - { id: recruiter, label: Recruiter }
phases:
  - { id: screen, label: Screen }
nodes:
  - id: apply
    lane: candidate
    phase: screen
    title: Apply
    today:
      mode: manual
      narrative: |
        Multi-line narrative is easy in YAML.
        Each line preserved verbatim.</code></pre>
      ` },

      { id: 'modes',      label: 'Customizing modes', render: () => `
        <h2>Customizing modes</h2>
        <p>The default modes are tuned for software self-serve maturity. Customize them for your domain.</p>

        <h3>Default modes</h3>
        <pre><code>"modes": [
  { "id": "self-serve", "label": "Self-Serve",     "color": "#047857" },
  { "id": "assisted",   "label": "Assisted",       "color": "#a16207" },
  { "id": "automated",  "label": "Automated",      "color": "#1e40af" },
  { "id": "manual",     "label": "Manual",         "color": "#b91c1c" },
  { "id": "n-a",        "label": "Not Applicable", "color": "#6b6557" }
]</code></pre>

        <h3>Sales pipeline example</h3>
        <pre><code>"modes": [
  { "id": "cold",   "label": "Cold",      "color": "#1e40af" },
  { "id": "warm",   "label": "Warm",      "color": "#a16207" },
  { "id": "hot",    "label": "Hot",       "color": "#b91c1c" },
  { "id": "closed", "label": "Closed Won","color": "#047857" }
]</code></pre>

        <h3>Maturity model example</h3>
        <pre><code>"modes": [
  { "id": "0", "label": "Level 0 · None",        "color": "#6b6557" },
  { "id": "1", "label": "Level 1 · Initial",    "color": "#b91c1c" },
  { "id": "2", "label": "Level 2 · Managed",    "color": "#a16207" },
  { "id": "3", "label": "Level 3 · Defined",    "color": "#1e40af" },
  { "id": "4", "label": "Level 4 · Quantified", "color": "#7c3aed" },
  { "id": "5", "label": "Level 5 · Optimizing", "color": "#047857" }
]</code></pre>

        <p>The two dots on each node card show <code>today.mode</code> (left) and <code>tomorrow.mode</code> (right). Colors come from the mode definition.</p>
      ` },

      { id: 'agents',     label: 'Use with AI agents', render: () => `
        <h2>Use with AI agents</h2>
        <p>An agent (Claude Code, Cursor, ChatGPT with tools) can generate a lifecycle map and hand the user a rendered URL in one shot.</p>

        <h3>Pattern A — embedded data (small maps)</h3>
        <p>Best for maps under ~4 KB compressed. Self-contained URL, no hosting needed.</p>
        <pre><code># bash
JSON='{"lanes":[...],"phases":[...],"nodes":[...],"edges":[...]}'
ENCODED=$(echo "$JSON" | gzip -9 | base64 | tr -d '\\n' | tr '+/' '-_')
echo "https://arkadyzalko.github.io/lifecycle-map/#data=$ENCODED"</code></pre>

        <h3>Pattern B — public gist (larger maps)</h3>
        <pre><code># bash + gh CLI
echo "$JSON" > /tmp/map.json
URL=$(gh gist create /tmp/map.json --public --filename map.json | tail -1)
RAW=$(echo "$URL" | sed 's|gist.github.com|gist.githubusercontent.com|; s|$|/raw|')
echo "https://arkadyzalko.github.io/lifecycle-map/?src=$RAW"</code></pre>

        <h3>Prompt template for agents</h3>
        <blockquote>
          Generate a lifecycle map for [process X] following the schema at
          https://github.com/arkadyzalko/lifecycle-map/blob/main/SCHEMA.md.
          Use 4-6 lanes and 4-6 phases. Include today/tomorrow narratives
          for each node. Return only valid JSON.
        </blockquote>

        <p>After generation, encode and return a single clickable URL.</p>
      ` },

      { id: 'themes',     label: 'Themes',           render: () => `
        <h2>Themes</h2>
        <p>Four built-in themes, each with light and dark modes. Open <strong>Settings</strong> (gear icon in the header) to switch.</p>

        <h3>Available themes</h3>
        <ul>
          <li><strong>Paper</strong> — editorial schematic. Fraunces display serif + Inter Tight + JetBrains Mono. Paper, ink, terracotta accent.</li>
          <li><strong>Mono</strong> — brutalist terminal. JetBrains Mono everywhere. Pure black and white.</li>
          <li><strong>Mid-Century</strong> — Wes-Anderson editorial poster. Playfair Display + Inter. Mustard, teal, cream.</li>
          <li><strong>Blueprint</strong> — technical drawing. Special Elite typewriter + Inter. Navy blueprint + cream in light, deep navy + cyan in dark, with a dotted grid backdrop.</li>
        </ul>

        <h3>Light / dark</h3>
        <p>Every theme supports both modes. The header sun/moon icon toggles instantly. Initial preference comes from your system (<code>prefers-color-scheme</code>).</p>

        <h3>URL overrides</h3>
        <pre><code>?theme=blueprint&amp;mode=dark</code></pre>
        <p>Useful for shareable links — &ldquo;here&rsquo;s the map in blueprint dark&rdquo;. The selection also persists in <code>localStorage</code> across visits.</p>
      ` },

      { id: 'multilang',  label: 'Multi-language',   render: () => `
        <h2>Multi-language</h2>
        <p>Any string in the document can be either a plain string <strong>or</strong> an object keyed by language code:</p>

        <pre><code>{
  "lanes": [
    { "id": "u", "label": { "en": "User", "pt": "Usuário", "es": "Usuario" } }
  ],
  "nodes": [
    {
      "id": "ask", "lane": "u", "phase": "in",
      "title": { "en": "Ask question", "pt": "Perguntar", "es": "Preguntar" }
    }
  ]
}</code></pre>

        <p>This works for <code>title</code>, <code>sub</code>, <code>label</code>, <code>objective</code>, <code>entity</code>, <code>actors</code>, <code>triggers</code>, <code>next</code>, <code>narrative</code>, <code>meta.title</code>, <code>meta.subtitle</code>, <code>meta.context</code>, mode labels, and module tags / names.</p>

        <h3>Detection &amp; switching</h3>
        <p>The viewer scans the document on load and finds every language used. If two or more languages are present, a <strong>Language</strong> picker appears in <strong>Settings</strong>. Otherwise it&rsquo;s hidden.</p>

        <h3>Default language</h3>
        <p>Resolved in this order:</p>
        <ol>
          <li>User&rsquo;s last selection in localStorage</li>
          <li><code>meta.default_lang</code> in the document</li>
          <li>First available language alphabetically</li>
        </ol>

        <h3>Fallbacks</h3>
        <p>If a string is missing the current language, the viewer falls back to <code>en</code>, then to the first available key. Mixing strings and localized objects in the same document is fine — plain strings render as-is in every language.</p>

        <p>See <a href="../?src=../examples/multi-language.json">the multi-language example</a> for a complete working file.</p>
      ` },

      { id: 'examples',   label: 'Examples',         render: () => `
        <h2>Examples</h2>
        <ul>
          <li><a href="../?src=../examples/minimal.json">Minimal</a> · the smallest possible map (10 lines)</li>
          <li><a href="../?src=../examples/hiring-pipeline.json">Hiring pipeline</a> · full example with today/tomorrow, modules, custom modes</li>
          <li><a href="../?src=../examples/hiring-pipeline.yaml">Hiring pipeline (YAML)</a> · same map, YAML format</li>
          <li><a href="../?src=../examples/multi-language.json">Multi-language</a> · strings localized in <code>en</code>, <code>pt</code>, <code>es</code></li>
          <li><a href="../?src=../examples/with-modules/hiring-pipeline.json">With shared modules</a> · catalog reference pattern</li>
        </ul>

        <p>Source files are in <a href="https://github.com/arkadyzalko/lifecycle-map/tree/main/examples">examples/</a>.</p>
      ` },

      { id: 'faq',        label: 'FAQ',              render: () => `
        <h2>FAQ</h2>

        <h3>Can I embed this in my own site?</h3>
        <p>Yes — clone the repo, host <code>index.html</code> + <code>viewer.js</code> on any static host. Or use the GitHub Pages instance and pass your <code>?src</code>.</p>

        <h3>Does it work offline?</h3>
        <p>Yes — once loaded, the viewer needs no server. Fonts and YAML parser come from CDN; for fully-offline use, vendor them locally.</p>

        <h3>What if my JSON breaks the schema?</h3>
        <p>The viewer fails loudly. Missing required fields produce an error message on the splash screen. Optional fields silently use defaults.</p>

        <h3>Can I customize the colors?</h3>
        <p>Modes have user-defined colors. Other colors (paper, ink, accent) live in CSS variables at the top of <code>index.html</code> — fork to customize.</p>

        <h3>Is there a node limit?</h3>
        <p>Tested with up to ~50 nodes and ~80 edges. Performance is good. Beyond that, expect routing artifacts that might need manual layout hints.</p>

        <h3>Why no build step?</h3>
        <p>Because the tool should be embarrassingly easy to fork, modify, and host. One HTML file + one JS file is the simplest unit of deployment.</p>

        <h3>License?</h3>
        <p>MIT. Use it however you want.</p>
      ` },
    ],

    pt: [
      { id: 'what',      label: 'O que é?',          render: () => `
        <h1>lifecycle-map <em>— docs</em></h1>
        <p class="lead">Visualizador single-file para mapas de lifecycle em swim-lanes. Renderiza qualquer processo — contratação, billing, suporte, onboarding — a partir de JSON ou YAML.</p>

        <h2>O que faz</h2>
        <p>Um lifecycle map responde quatro perguntas sobre um processo:</p>
        <ul>
          <li><strong>Quem age?</strong> — lanes (atores, papéis, sistemas)</li>
          <li><strong>Quando?</strong> — phases (estágios sequenciais)</li>
          <li><strong>O que acontece?</strong> — nodes (passos dentro de uma célula lane × phase)</li>
          <li><strong>O que dispara o quê?</strong> — edges (fluxo direcionado)</li>
        </ul>
        <p>Cada step pode opcionalmente descrever um estado <strong>hoje vs. amanhã</strong>. Útil pra roadmaps de transformação, capability maps e planejamento de adoção self-serve.</p>

        <h2>Por que usar</h2>
        <p>Mermaid é ótimo pra diagramas pequenos. Miro é ótimo pra colaboração. Nenhum dos dois é bom pra mapas de lifecycle estruturados, navegáveis e versionados em git.</p>
        <p>Essa ferramenta preenche essa lacuna. O mapa é dados. O viewer é um arquivo HTML. Qualquer coisa que produz JSON produz um mapa.</p>
      ` },

      { id: 'quickstart', label: 'Início rápido',    render: () => `
        <h2>Início rápido</h2>
        <p>Abra o viewer com qualquer uma destas três URLs:</p>
        <h3>1. Carregar por URL</h3>
        <pre><code>https://arkadyzalko.github.io/lifecycle-map/?src=https://gist.githubusercontent.com/.../raw/foo.json</code></pre>
        <p>Funciona com qualquer URL JSON ou YAML que aceite CORS — Gists públicos, URLs raw do GitHub, servidor próprio.</p>

        <h3>2. Embed na URL (sem hosting)</h3>
        <pre><code>https://arkadyzalko.github.io/lifecycle-map/#data=&lt;base64-gzipped-json&gt;</code></pre>
        <p>O mapa fica encoded no fragment da URL. Não precisa de arquivo externo. Melhor pra mapas pequenos e agentes de AI.</p>

        <h3>3. Colar direto</h3>
        <pre><code>https://arkadyzalko.github.io/lifecycle-map/?paste</code></pre>
        <p>Abre um textarea pra colar JSON ou YAML.</p>

        <h3>Input mínimo válido</h3>
        <pre><code>{
  "lanes": [
    { "id": "u", "label": "Usuário" },
    { "id": "s", "label": "Sistema" }
  ],
  "phases": [
    { "id": "in",  "label": "Entrada" },
    { "id": "out", "label": "Saída" }
  ],
  "nodes": [
    { "id": "ask",   "lane": "u", "phase": "in",  "title": "Perguntar" },
    { "id": "reply", "lane": "s", "phase": "out", "title": "Responder" }
  ],
  "edges": [
    { "from": "ask", "to": "reply" }
  ]
}</code></pre>
        <p>É isso. Cole e tenha um mapa funcionando.</p>
      ` },

      { id: 'loading',    label: 'Carregando dados', render: () => `
        <h2>Carregando dados</h2>
        <p>Três loaders. Prioridade da esquerda pra direita: <code>?src</code> ganha de <code>#data</code> ganha de <code>?paste</code>.</p>

        <h3>?src — URL externa</h3>
        <p>Passe uma URL apontando pra JSON ou YAML. O viewer faz fetch e renderiza.</p>
        <pre><code>?src=https://gist.githubusercontent.com/.../raw/map.yaml</code></pre>
        <p>A URL alvo precisa permitir CORS. Gists públicos, raw GitHub, Netlify, GitHub Pages e S3 funcionam direto.</p>

        <h3>#data — embedded</h3>
        <p>O mapa é comprimido com gzip + base64-encoded e colocado no fragment da URL. O browser decodifica localmente — sem fetch.</p>
        <pre><code># exemplo bash
echo '{"lanes":[...]}' | gzip -9 | base64 | tr -d '\\n' | tr '+/' '-_'</code></pre>
        <p>Use o resultado como <code>#data=&lt;encoded&gt;</code>. URL fica abaixo de ~10 KB pra maioria dos mapas.</p>

        <h3>?paste — manual</h3>
        <p>Abre um textarea. Cole JSON ou YAML, clique Render.</p>
      ` },

      { id: 'structure',  label: 'Estrutura',        render: () => `
        <h2>Estrutura</h2>
        <p>O documento tem 5 chaves principais:</p>
        <pre><code>{
  "meta":   { "title": "...", "modes": [...] },
  "lanes":  [ ... ],
  "phases": [ ... ],
  "nodes":  [ ... ],
  "edges":  [ ... ]
}</code></pre>

        <h3>meta</h3>
        <ul>
          <li><code>title</code> — texto do header</li>
          <li><code>subtitle</code> — mostrado após em-dash em itálico terracota</li>
          <li><code>context</code> — eyebrow pequeno acima do título</li>
          <li><code>modes</code> — array de estados de ownership (veja abaixo)</li>
        </ul>

        <h3>lanes</h3>
        <p>Linhas horizontais. Ordem = de cima pra baixo.</p>
        <pre><code>[
  { "id": "biller",   "label": "Faturamento", "sub": "8h/dia" },
  { "id": "approver", "label": "Aprovador",   "sub": "VP+" }
]</code></pre>

        <h3>phases</h3>
        <p>Colunas verticais. Ordem = da esquerda pra direita.</p>
        <pre><code>[
  { "id": "intake",  "label": "Entrada", "roman": "I",  "subCols": 1 },
  { "id": "process", "label": "Processo","roman": "II", "subCols": 2 }
]</code></pre>
        <p><code>subCols</code> permite dividir uma phase em múltiplas sub-colunas pra fluxos paralelos. Default 1.</p>

        <h3>nodes</h3>
        <p>Campos obrigatórios: <code>id</code>, <code>lane</code>, <code>phase</code>, <code>title</code>.</p>
        <p>Opcionais: <code>col</code>, <code>sub</code>, <code>objective</code>, <code>entity</code>, <code>actors</code>, <code>triggers</code>, <code>next</code>, <code>today</code>, <code>tomorrow</code>, <code>modules</code>.</p>
        <p><code>today</code> e <code>tomorrow</code> têm a mesma estrutura — veja abaixo.</p>

        <h3>edges</h3>
        <p>Conexões direcionadas.</p>
        <pre><code>[
  { "from": "node-a", "to": "node-b" },
  { "from": "node-b", "to": "node-a" }   // backward, detectado automaticamente
]</code></pre>
        <p>Edges backward (destino anterior no fluxo) são renderizadas como linhas tracejadas, roteadas pelo "backward bus" acima ou pelo rail abaixo, nunca cruzando o fluxo forward.</p>

        <h3>modes</h3>
        <p>Defina sua própria taxonomia de ownership:</p>
        <pre><code>"modes": [
  { "id": "manual",    "label": "Manual",     "color": "#b91c1c" },
  { "id": "automated", "label": "Automatizado","color": "#1e40af" }
]</code></pre>
        <p>Cada <code>node.today.mode</code> e <code>node.tomorrow.mode</code> referencia um destes IDs.</p>
      ` },

      { id: 'external',   label: 'Refs externas',    render: () => `
        <h2>Referências externas</h2>
        <p>Modules podem ser definidos inline ou puxados de um catálogo compartilhado por ID.</p>

        <h3>Inline (default)</h3>
        <pre><code>{
  "id": "review",
  "title": "Revisar",
  "modules": [
    { "feature": "Edição em lote", "today": "manual", "tomorrow": "automated" }
  ]
}</code></pre>

        <h3>Referência por catálogo</h3>
        <p>Adicione um <code>modules</code> top-level, depois referencie por ID:</p>
        <pre><code>{
  "modules": {
    "shared:bulk-edit": {
      "name": "Edição em lote",
      "today": "manual",
      "tomorrow": "automated"
    }
  },
  "nodes": [
    { "id": "review", "modules": ["shared:bulk-edit"] }
  ]
}</code></pre>
        <p>Útil quando vários nodes compartilham os mesmos modules — mantém o arquivo DRY.</p>
      ` },

      { id: 'yaml',       label: 'JSON ou YAML',     render: () => `
        <h2>JSON ou YAML</h2>
        <p>O viewer aceita os dois formatos. O schema é idêntico.</p>

        <h3>Quando escolher JSON</h3>
        <ul>
          <li>Gerando programaticamente (maioria das linguagens tem serializer JSON nativo)</li>
          <li>Embedding em URLs (modo <code>#data</code>)</li>
          <li>Trabalhando com agentes de AI (a maioria dos agents produz JSON limpo)</li>
        </ul>

        <h3>Quando escolher YAML</h3>
        <ul>
          <li>Mapas editados à mão onde você vai escrever muito texto</li>
          <li>Narrativas multi-linha em <code>today</code> / <code>tomorrow</code></li>
          <li>Você prefere comentários (YAML suporta <code>#</code>; JSON não)</li>
        </ul>
      ` },

      { id: 'modes',      label: 'Customizar modos', render: () => `
        <h2>Customizando modes</h2>
        <p>Os modes default são tunados pra maturidade self-serve de software. Customize pro seu domínio.</p>

        <h3>Modes default</h3>
        <pre><code>"modes": [
  { "id": "self-serve", "label": "Self-Serve",        "color": "#047857" },
  { "id": "assisted",   "label": "Assistido",          "color": "#a16207" },
  { "id": "automated",  "label": "Automatizado",       "color": "#1e40af" },
  { "id": "manual",     "label": "Manual",             "color": "#b91c1c" },
  { "id": "n-a",        "label": "Não Aplicável",      "color": "#6b6557" }
]</code></pre>

        <h3>Exemplo: pipeline de vendas</h3>
        <pre><code>"modes": [
  { "id": "cold",   "label": "Frio",      "color": "#1e40af" },
  { "id": "warm",   "label": "Morno",     "color": "#a16207" },
  { "id": "hot",    "label": "Quente",    "color": "#b91c1c" },
  { "id": "closed", "label": "Fechado",   "color": "#047857" }
]</code></pre>

        <p>Os dois pontos em cada node card mostram <code>today.mode</code> (esquerda) e <code>tomorrow.mode</code> (direita). Cores vêm da definição do mode.</p>
      ` },

      { id: 'agents',     label: 'Com agentes AI',   render: () => `
        <h2>Uso com agentes de AI</h2>
        <p>Um agente (Claude Code, Cursor, ChatGPT com tools) pode gerar um lifecycle map e entregar ao usuário uma URL renderizada de uma vez só.</p>

        <h3>Padrão A — dados embedded (mapas pequenos)</h3>
        <p>Melhor pra mapas abaixo de ~4 KB comprimido. URL self-contained, sem hosting.</p>
        <pre><code># bash
JSON='{"lanes":[...],"phases":[...],"nodes":[...],"edges":[...]}'
ENCODED=$(echo "$JSON" | gzip -9 | base64 | tr -d '\\n' | tr '+/' '-_')
echo "https://arkadyzalko.github.io/lifecycle-map/#data=$ENCODED"</code></pre>

        <h3>Padrão B — gist público (mapas maiores)</h3>
        <pre><code># bash + gh CLI
echo "$JSON" > /tmp/map.json
URL=$(gh gist create /tmp/map.json --public --filename map.json | tail -1)
RAW=$(echo "$URL" | sed 's|gist.github.com|gist.githubusercontent.com|; s|$|/raw|')
echo "https://arkadyzalko.github.io/lifecycle-map/?src=$RAW"</code></pre>

        <h3>Template de prompt pra agentes</h3>
        <blockquote>
          Gere um lifecycle map pra [processo X] seguindo o schema em
          https://github.com/arkadyzalko/lifecycle-map/blob/main/SCHEMA.md.
          Use 4-6 lanes e 4-6 phases. Inclua narrativas today/tomorrow
          pra cada node. Retorne apenas JSON válido.
        </blockquote>
      ` },

      { id: 'themes',     label: 'Temas',            render: () => `
        <h2>Temas</h2>
        <p>Quatro temas built-in, cada um com modo claro e escuro. Abra <strong>Settings</strong> (ícone de engrenagem no header) para trocar.</p>

        <h3>Temas disponíveis</h3>
        <ul>
          <li><strong>Paper</strong> — esquema editorial. Fraunces (serifa) + Inter Tight + JetBrains Mono. Papel, tinta, accent terracota.</li>
          <li><strong>Mono</strong> — terminal brutalista. JetBrains Mono em tudo. Preto e branco puros.</li>
          <li><strong>Mid-Century</strong> — poster editorial Wes Anderson. Playfair Display + Inter. Mostarda, verde-azulado, creme.</li>
          <li><strong>Blueprint</strong> — desenho técnico. Special Elite (typewriter) + Inter. Azul-marinho sobre creme no modo claro, navy + ciano no escuro, com grade pontilhada de fundo.</li>
        </ul>

        <h3>Claro / escuro</h3>
        <p>Todo tema suporta os dois modos. O ícone sol/lua no header alterna instantaneamente. Preferência inicial vem do sistema (<code>prefers-color-scheme</code>).</p>

        <h3>URL overrides</h3>
        <pre><code>?theme=blueprint&amp;mode=dark</code></pre>
        <p>Útil para links compartilháveis — &ldquo;aqui o mapa em blueprint escuro&rdquo;. A escolha também persiste em <code>localStorage</code>.</p>
      ` },

      { id: 'multilang',  label: 'Multi-idioma',     render: () => `
        <h2>Multi-idioma</h2>
        <p>Qualquer string no documento pode ser texto simples <strong>ou</strong> um objeto com chaves por código de idioma:</p>

        <pre><code>{
  "lanes": [
    { "id": "u", "label": { "en": "User", "pt": "Usuário", "es": "Usuario" } }
  ],
  "nodes": [
    {
      "id": "ask", "lane": "u", "phase": "in",
      "title": { "en": "Ask question", "pt": "Perguntar", "es": "Preguntar" }
    }
  ]
}</code></pre>

        <p>Funciona para <code>title</code>, <code>sub</code>, <code>label</code>, <code>objective</code>, <code>entity</code>, <code>actors</code>, <code>triggers</code>, <code>next</code>, <code>narrative</code>, <code>meta.title</code>, <code>meta.subtitle</code>, <code>meta.context</code>, labels de modes, e tags / nomes de modules.</p>

        <h3>Detecção &amp; troca</h3>
        <p>O viewer escaneia o documento ao carregar e encontra todos os idiomas usados. Se dois ou mais estão presentes, um seletor de <strong>Idioma</strong> aparece em <strong>Settings</strong>. Senão fica escondido.</p>

        <h3>Idioma padrão</h3>
        <p>Resolvido nesta ordem:</p>
        <ol>
          <li>Última escolha do usuário no localStorage</li>
          <li><code>meta.default_lang</code> no documento</li>
          <li>Primeiro idioma disponível em ordem alfabética</li>
        </ol>

        <h3>Fallbacks</h3>
        <p>Se uma string não tem o idioma atual, o viewer cai para <code>en</code>, e depois para a primeira chave disponível. Misturar strings simples e objetos localizados no mesmo documento é OK — strings simples renderizam iguais em todos os idiomas.</p>

        <p>Veja <a href="../?src=../examples/multi-language.json">o exemplo multi-idioma</a> para um arquivo completo.</p>
      ` },

      { id: 'examples',   label: 'Exemplos',         render: () => `
        <h2>Exemplos</h2>
        <ul>
          <li><a href="../?src=../examples/minimal.json">Mínimo</a> · o menor mapa possível (10 linhas)</li>
          <li><a href="../?src=../examples/hiring-pipeline.json">Pipeline de contratação</a> · exemplo completo com today/tomorrow, modules, modes custom</li>
          <li><a href="../?src=../examples/hiring-pipeline.yaml">Pipeline de contratação (YAML)</a> · mesmo mapa, formato YAML</li>
          <li><a href="../?src=../examples/multi-language.json">Multi-idioma</a> · strings localizadas em <code>en</code>, <code>pt</code>, <code>es</code></li>
          <li><a href="../?src=../examples/with-modules/hiring-pipeline.json">Com modules compartilhados</a> · padrão de referência por catálogo</li>
        </ul>
      ` },

      { id: 'faq',        label: 'FAQ',              render: () => `
        <h2>FAQ</h2>

        <h3>Posso embedar isso no meu site?</h3>
        <p>Sim — clone o repo, hospede <code>index.html</code> + <code>viewer.js</code> em qualquer host estático. Ou use o GitHub Pages e passe seu <code>?src</code>.</p>

        <h3>Funciona offline?</h3>
        <p>Sim — uma vez carregado, o viewer não precisa de servidor. Fontes e parser YAML vêm de CDN; pra uso totalmente offline, vendoreie localmente.</p>

        <h3>E se meu JSON quebrar o schema?</h3>
        <p>O viewer falha alto. Campos obrigatórios faltando produzem mensagem de erro na splash. Campos opcionais usam defaults silenciosamente.</p>

        <h3>Posso customizar as cores?</h3>
        <p>Modes têm cores definidas pelo usuário. Outras cores (paper, ink, accent) ficam em CSS variables no topo do <code>index.html</code> — forke pra customizar.</p>

        <h3>Tem limite de nodes?</h3>
        <p>Testado com até ~50 nodes e ~80 edges. Performance boa. Acima disso, espere artifacts de roteamento que podem precisar de hints manuais de layout.</p>

        <h3>Por que sem build step?</h3>
        <p>Porque a ferramenta deve ser embarazosamente fácil de forkear, modificar e hospedar. Um arquivo HTML + um JS é a unidade mais simples de deploy.</p>

        <h3>Licença?</h3>
        <p>MIT. Use como quiser.</p>
      ` },
    ],

    es: [
      { id: 'what',      label: '¿Qué es?',          render: () => `
        <h1>lifecycle-map <em>— docs</em></h1>
        <p class="lead">Visor single-file para mapas de ciclo de vida en swim-lanes. Renderiza cualquier proceso — contratación, facturación, soporte, onboarding — desde JSON o YAML.</p>

        <h2>Qué hace</h2>
        <p>Un lifecycle map responde cuatro preguntas sobre un proceso:</p>
        <ul>
          <li><strong>¿Quién actúa?</strong> — lanes (actores, roles, sistemas)</li>
          <li><strong>¿Cuándo?</strong> — phases (etapas secuenciales)</li>
          <li><strong>¿Qué pasa?</strong> — nodes (pasos dentro de una celda lane × phase)</li>
          <li><strong>¿Qué dispara qué?</strong> — edges (flujo dirigido)</li>
        </ul>
        <p>Cada paso puede describir opcionalmente un estado <strong>hoy vs. mañana</strong>. Útil para roadmaps de transformación y planificación de adopción self-serve.</p>

        <h2>Por qué usarlo</h2>
        <p>Mermaid es bueno para diagramas pequeños. Miro es bueno para colaboración. Ninguno es bueno para mapas de ciclo de vida estructurados, navegables y versionados en git.</p>
        <p>Esta herramienta llena ese hueco. El mapa son datos. El visor es un archivo HTML. Cualquier cosa que produzca JSON produce un mapa.</p>
      ` },

      { id: 'quickstart', label: 'Inicio rápido',    render: () => `
        <h2>Inicio rápido</h2>
        <p>Abre el visor con cualquiera de estas tres URLs:</p>
        <h3>1. Cargar por URL</h3>
        <pre><code>https://arkadyzalko.github.io/lifecycle-map/?src=https://gist.githubusercontent.com/.../raw/foo.json</code></pre>

        <h3>2. Embed en URL (sin hosting)</h3>
        <pre><code>https://arkadyzalko.github.io/lifecycle-map/#data=&lt;base64-gzipped-json&gt;</code></pre>

        <h3>3. Pegar directamente</h3>
        <pre><code>https://arkadyzalko.github.io/lifecycle-map/?paste</code></pre>

        <h3>Input mínimo válido</h3>
        <pre><code>{
  "lanes": [
    { "id": "u", "label": "Usuario" },
    { "id": "s", "label": "Sistema" }
  ],
  "phases": [
    { "id": "in",  "label": "Entrada" },
    { "id": "out", "label": "Salida" }
  ],
  "nodes": [
    { "id": "ask",   "lane": "u", "phase": "in",  "title": "Preguntar" },
    { "id": "reply", "lane": "s", "phase": "out", "title": "Responder" }
  ],
  "edges": [
    { "from": "ask", "to": "reply" }
  ]
}</code></pre>
      ` },

      { id: 'loading',    label: 'Cargando datos',   render: () => `
        <h2>Cargando datos</h2>
        <p>Tres cargadores. Prioridad de izquierda a derecha: <code>?src</code> gana a <code>#data</code> gana a <code>?paste</code>.</p>

        <h3>?src — URL externa</h3>
        <p>Pasa una URL apuntando a JSON o YAML. El visor hace fetch y renderiza.</p>

        <h3>#data — embedded</h3>
        <p>El mapa se comprime con gzip + base64 y se coloca en el fragment de URL. El navegador decodifica localmente — sin fetch.</p>

        <h3>?paste — manual</h3>
        <p>Abre un textarea. Pega JSON o YAML, click Render.</p>
      ` },

      { id: 'structure',  label: 'Estructura',       render: () => `
        <h2>Estructura</h2>
        <p>El documento tiene 5 claves principales: <code>meta</code>, <code>lanes</code>, <code>phases</code>, <code>nodes</code>, <code>edges</code>.</p>
        <p>Solo <code>lanes</code>, <code>phases</code>, <code>nodes</code> y <code>edges</code> son obligatorios. El resto tiene defaults razonables.</p>
        <p>Consulta la <a href="https://github.com/arkadyzalko/lifecycle-map/blob/main/SCHEMA.md">referencia completa de schema</a> para todos los campos.</p>
      ` },

      { id: 'external',   label: 'Refs externas',    render: () => `
        <h2>Referencias externas</h2>
        <p>Los modules pueden definirse inline o referenciarse por ID desde un catálogo compartido en la clave <code>modules</code> top-level.</p>
      ` },

      { id: 'yaml',       label: 'JSON o YAML',      render: () => `
        <h2>JSON o YAML</h2>
        <p>El visor acepta ambos formatos. El schema es idéntico.</p>
        <p>Usa YAML para mapas escritos a mano con narrativas largas. Usa JSON para mapas generados programáticamente o embedding en URLs.</p>
      ` },

      { id: 'modes',      label: 'Modos personalizados', render: () => `
        <h2>Personalizando modes</h2>
        <p>Define tu propia taxonomía de ownership en <code>meta.modes</code>. Cada mode tiene <code>id</code>, <code>label</code> y <code>color</code>.</p>
      ` },

      { id: 'agents',     label: 'Con agentes IA',   render: () => `
        <h2>Uso con agentes de IA</h2>
        <p>Un agente (Claude Code, Cursor, ChatGPT con tools) puede generar un lifecycle map y entregar al usuario una URL renderizada de una sola vez.</p>
        <p>Para mapas pequeños, usa <code>#data</code> con compresión gzip + base64. Para mapas más grandes, publica un gist y pasa <code>?src</code>.</p>
      ` },

      { id: 'themes',     label: 'Temas',            render: () => `
        <h2>Temas</h2>
        <p>Cuatro temas integrados, cada uno con modo claro y oscuro. Abre <strong>Settings</strong> (icono de engranaje en el header) para cambiar.</p>

        <h3>Temas disponibles</h3>
        <ul>
          <li><strong>Paper</strong> — esquema editorial. Fraunces (serif) + Inter Tight + JetBrains Mono. Papel, tinta, acento terracota.</li>
          <li><strong>Mono</strong> — terminal brutalista. JetBrains Mono en todo. Blanco y negro puros.</li>
          <li><strong>Mid-Century</strong> — poster editorial Wes Anderson. Playfair Display + Inter. Mostaza, verde-azulado, crema.</li>
          <li><strong>Blueprint</strong> — dibujo técnico. Special Elite (typewriter) + Inter. Azul marino sobre crema en claro, navy + cian en oscuro, con cuadrícula punteada de fondo.</li>
        </ul>

        <h3>Claro / oscuro</h3>
        <p>Todos los temas soportan ambos modos. El icono sol/luna en el header alterna al instante. La preferencia inicial viene del sistema (<code>prefers-color-scheme</code>).</p>

        <h3>URL overrides</h3>
        <pre><code>?theme=blueprint&amp;mode=dark</code></pre>
        <p>Útil para enlaces compartibles. La selección también persiste en <code>localStorage</code>.</p>
      ` },

      { id: 'multilang',  label: 'Multi-idioma',     render: () => `
        <h2>Multi-idioma</h2>
        <p>Cualquier string en el documento puede ser texto plano <strong>o</strong> un objeto con claves por código de idioma:</p>

        <pre><code>{
  "lanes": [
    { "id": "u", "label": { "en": "User", "pt": "Usuário", "es": "Usuario" } }
  ],
  "nodes": [
    {
      "id": "ask", "lane": "u", "phase": "in",
      "title": { "en": "Ask question", "pt": "Perguntar", "es": "Preguntar" }
    }
  ]
}</code></pre>

        <p>Funciona para <code>title</code>, <code>sub</code>, <code>label</code>, <code>objective</code>, <code>entity</code>, <code>actors</code>, <code>triggers</code>, <code>next</code>, <code>narrative</code>, <code>meta.title</code>, <code>meta.subtitle</code>, <code>meta.context</code>, labels de modes, y tags / nombres de modules.</p>

        <h3>Detección y cambio</h3>
        <p>El viewer escanea el documento al cargar y encuentra todos los idiomas usados. Si hay dos o más, un selector de <strong>Idioma</strong> aparece en <strong>Settings</strong>. Si no, queda oculto.</p>

        <h3>Idioma por defecto</h3>
        <p>Resuelto en este orden:</p>
        <ol>
          <li>Última selección del usuario en localStorage</li>
          <li><code>meta.default_lang</code> en el documento</li>
          <li>Primer idioma disponible alfabéticamente</li>
        </ol>

        <h3>Fallbacks</h3>
        <p>Si falta el idioma actual en un string, el viewer recurre a <code>en</code>, y luego a la primera clave disponible. Mezclar strings simples y objetos localizados en el mismo documento es válido.</p>

        <p>Ver <a href="../?src=../examples/multi-language.json">el ejemplo multi-idioma</a> para un archivo completo.</p>
      ` },

      { id: 'examples',   label: 'Ejemplos',         render: () => `
        <h2>Ejemplos</h2>
        <ul>
          <li><a href="../?src=../examples/minimal.json">Mínimo</a></li>
          <li><a href="../?src=../examples/hiring-pipeline.json">Pipeline de contratación</a></li>
          <li><a href="../?src=../examples/hiring-pipeline.yaml">Pipeline de contratación (YAML)</a></li>
          <li><a href="../?src=../examples/multi-language.json">Multi-idioma</a> · strings en <code>en</code>, <code>pt</code>, <code>es</code></li>
        </ul>
      ` },

      { id: 'faq',        label: 'FAQ',              render: () => `
        <h2>FAQ</h2>
        <p>Consulta la versión en inglés o portugués para preguntas frecuentes detalladas.</p>
      ` },
    ],
  };

  // -------- routing --------

  const params = new URLSearchParams(window.location.search);
  const langParam = params.get('lang');
  const browserLang = (navigator.language || 'en').slice(0, 2);
  const lang = SECTIONS[langParam] ? langParam : (SECTIONS[browserLang] ? browserLang : 'en');

  const sectionId = window.location.hash.slice(1) || 'what';

  // -------- render --------

  // sidebar
  const nav = document.getElementById('sidebar-nav');
  const ul = document.createElement('ul');
  SECTIONS[lang].forEach(s => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#' + s.id;
    a.textContent = s.label;
    a.dataset.section = s.id;
    if (s.id === sectionId) a.classList.add('active');
    li.appendChild(a);
    ul.appendChild(li);
  });
  nav.appendChild(ul);

  // lang switch
  document.querySelectorAll('#lang-switch a').forEach(a => {
    if (a.dataset.lang === lang) a.classList.add('active');
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const newLang = a.dataset.lang;
      const newUrl = `?lang=${newLang}${window.location.hash}`;
      window.location.href = newUrl;
    });
  });

  // main content
  const main = document.getElementById('main');
  function renderSection(id) {
    const section = SECTIONS[lang].find(s => s.id === id) || SECTIONS[lang][0];
    main.innerHTML = section.render();
    document.querySelectorAll('#sidebar-nav a').forEach(a => {
      a.classList.toggle('active', a.dataset.section === section.id);
    });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  renderSection(sectionId);

  // intercept nav clicks
  document.getElementById('sidebar-nav').addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    e.preventDefault();
    const id = a.dataset.section;
    history.replaceState(null, '', `?lang=${lang}#${id}`);
    renderSection(id);
  });

  window.addEventListener('hashchange', () => {
    renderSection(window.location.hash.slice(1) || 'what');
  });
})();
