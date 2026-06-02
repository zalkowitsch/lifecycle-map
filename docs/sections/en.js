/* lifecycle-map · docs/sections/en.js · English content */
(function () {
  'use strict';
  window.LifecycleDocs = window.LifecycleDocs || {};
  window.LifecycleDocs.en = [
    { id: 'what', label: 'What is this?', render: () => `
      <h1>lifecycle-map <em>— docs</em></h1>
      <p class="lead">A single-file viewer for swim-lane lifecycle maps. Render any process — hiring, billing, support, onboarding — from a JSON or YAML source. No build, no server, no install.</p>

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

      <h2>Feature summary</h2>
      <ul>
        <li>JSON or YAML input — same schema, your choice of format</li>
        <li>Multi-language strings inline in the data (<code>{ en, pt, es, ... }</code>)</li>
        <li>4 built-in themes × light/dark modes</li>
        <li>Drag-and-drop file loading</li>
        <li>5 share strategies (download, embedded URL, public hosts, encrypted image)</li>
        <li>Keyboard walk (<kbd>←</kbd>/<kbd>→</kbd>) + click-to-inspect drawer</li>
        <li>Slug-based URLs (<code>#hiring-pipeline</code>) for shareable example links</li>
      </ul>
    ` },

    { id: 'quickstart', label: 'Quickstart', render: () => `
      <h2>Quickstart</h2>
      <p>Open the viewer with any of these URLs:</p>

      <h3>1. Pre-loaded examples</h3>
      <pre><code>https://zalkowitsch.github.io/lifecycle-map/#hiring-pipeline
https://zalkowitsch.github.io/lifecycle-map/#multi-language
https://zalkowitsch.github.io/lifecycle-map/#minimal</code></pre>
      <p>Slug-based hash routes load one of the bundled examples directly.</p>

      <h3>2. Load by URL</h3>
      <pre><code>https://zalkowitsch.github.io/lifecycle-map/?src=https://gist.githubusercontent.com/.../raw/foo.json</code></pre>
      <p>Works with any CORS-enabled JSON or YAML URL — public Gists, raw GitHub URLs, your own server.</p>

      <h3>3. Embed in URL (no hosting)</h3>
      <pre><code>https://zalkowitsch.github.io/lifecycle-map/#data=&lt;base64-gzipped-json&gt;</code></pre>
      <p>The map is encoded in the URL fragment. No external file needed. Best for small maps and AI agents.</p>

      <h3>4. Drag and drop</h3>
      <p>Drop any <code>.json</code> or <code>.yaml</code> file anywhere on the viewer page. A full-screen overlay appears; release to load.</p>

      <h3>5. Paste it</h3>
      <pre><code>https://zalkowitsch.github.io/lifecycle-map/?paste</code></pre>
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

    { id: 'loading', label: 'Loading data', render: () => `
      <h2>Loading data</h2>
      <p>Five ways to load a map. Priority on page load: <code>?src</code> &gt; <code>#data=</code> &gt; <code>?img=</code>/<code>#img=</code> &gt; <code>#&lt;slug&gt;</code> &gt; <code>?paste</code> &gt; splash. Drag-and-drop works at any time.</p>

      <h3><code>?src</code> — external URL</h3>
      <p>Pass a URL pointing to JSON or YAML. The viewer fetches it and renders.</p>
      <pre><code>?src=https://gist.githubusercontent.com/.../raw/map.yaml</code></pre>
      <p>The target URL must allow CORS. Public Gists, raw GitHub, Netlify, GitHub Pages, and S3 all work out of the box. catbox.moe and 0x0.st may not — see the <a href="?lang=en#share">Share</a> section for details.</p>

      <h3><code>#data=</code> — embedded</h3>
      <p>The map is gzipped + base64url-encoded and placed in the URL fragment. The browser decodes it locally — no fetch.</p>
      <pre><code># bash example
echo '{"lanes":[...]}' | gzip -9 | base64 | tr -d '\\n' | tr '+/' '-_' | tr -d '='</code></pre>
      <p>Use the result as <code>#data=&lt;encoded&gt;</code>. URL stays under ~10 KB for most maps.</p>

      <h3><code>#&lt;slug&gt;</code> — bundled example</h3>
      <p>Known slugs (matched case-sensitively):</p>
      <ul>
        <li><code>#hiring-pipeline</code> → full hiring pipeline example</li>
        <li><code>#hiring-pipeline-yaml</code> → same example, YAML format</li>
        <li><code>#hiring-pipeline-modules</code> → with module references</li>
        <li><code>#multi-language</code> → multi-language demo</li>
        <li><code>#minimal</code> → 10-line minimal map</li>
      </ul>
      <p>Drag-and-drop also sets a slug derived from the filename (<code>biller-lifecycle.json</code> → <code>#biller-lifecycle</code>), but the slug only affects the URL display — the dropped file content is in memory only and won't reload if you share the URL.</p>

      <h3><code>?img=</code> / <code>#img=</code> — encrypted image</h3>
      <p>Decrypted client-side from a PNG that hides an AES-GCM ciphertext. See <a href="?lang=en#share">Share → Encrypted image</a> for how to generate one.</p>

      <h3><code>?paste</code> — manual</h3>
      <p>Opens a textarea. Paste JSON or YAML, click Render.</p>

      <h3>Drag and drop</h3>
      <p>Anywhere on the viewer, drop one <code>.json</code> or <code>.yaml</code> file. The overlay accepts only the first file; multi-file drop is ignored. Nothing is uploaded.</p>
    ` },

    { id: 'structure', label: 'Structure', render: () => `
      <h2>Structure</h2>
      <p>The document has 5 top-level keys:</p>
      <pre><code>{
  "meta":    { "title": "...", "modes": [...], "default_lang": "en" },
  "lanes":   [ ... ],
  "phases":  [ ... ],
  "nodes":   [ ... ],
  "edges":   [ ... ],
  "modules": { /* optional shared module catalog */ }
}</code></pre>

      <h3>meta</h3>
      <ul>
        <li><code>title</code> — header text. String or <code>{ en, pt, es, ... }</code>.</li>
        <li><code>subtitle</code> — shown after an em-dash in italic terracotta.</li>
        <li><code>context</code> — small eyebrow line above the title.</li>
        <li><code>modes</code> — ownership taxonomy (see <a href="?lang=en#modes">Modes</a>).</li>
        <li><code>default_lang</code> — initial language when multi-lang strings exist.</li>
      </ul>

      <h3>lanes</h3>
      <p>Horizontal rows. Order = top to bottom.</p>
      <pre><code>[
  { "id": "biller",   "label": "Biller",   "sub": "8h/day" },
  { "id": "approver", "label": "Approver", "sub": "VP+" }
]</code></pre>
      <p>Required: <code>id</code>, <code>label</code>. Optional: <code>sub</code> (small caption under the label).</p>

      <h3>phases</h3>
      <p>Vertical columns. Order = left to right.</p>
      <pre><code>[
  { "id": "intake",  "label": "Intake",  "roman": "I",  "subCols": 1 },
  { "id": "process", "label": "Process", "roman": "II", "subCols": 2 }
]</code></pre>
      <p>Required: <code>id</code>, <code>label</code>. Optional: <code>roman</code> (auto-numbered I, II, III if omitted), <code>subCols</code> (split into sub-columns for parallel flows; defaults to 1).</p>

      <h3>nodes</h3>
      <p>Required fields: <code>id</code>, <code>lane</code>, <code>phase</code>, <code>title</code>.</p>
      <p>Optional positioning: <code>col</code> (sub-column index inside the phase, defaults 0).</p>
      <p>Optional content: <code>sub</code>, <code>objective</code>, <code>entity</code>, <code>actors</code>, <code>triggers</code>, <code>next</code>, <code>today</code>, <code>tomorrow</code>, <code>modules</code>.</p>
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

      <h3>modules</h3>
      <p>Per-node feature list. Either inline objects or string IDs referencing a top-level catalog (see <a href="?lang=en#external">External refs</a>).</p>
    ` },

    { id: 'modes', label: 'Modes', render: () => `
      <h2>Modes &amp; mode colors</h2>
      <p>Each node can declare a <code>today.mode</code> and <code>tomorrow.mode</code>. These render as two colored dots in the top-right corner of the node card and as pill labels inside the drawer.</p>

      <h3>Declaring modes explicitly</h3>
      <pre><code>{
  "meta": {
    "modes": [
      { "id": "manual",    "label": "Manual",    "color": "#b91c1c" },
      { "id": "assisted",  "label": "Assisted",  "color": "#a16207" },
      { "id": "automated", "label": "Automated", "color": "#1e40af" },
      { "id": "ai",        "label": "AI-Augmented", "color": "#047857" }
    ]
  },
  "nodes": [
    {
      "id": "screen", "lane": "r", "phase": "intake", "title": "Screen",
      "today":    { "mode": "manual" },
      "tomorrow": { "mode": "ai" }
    }
  ]
}</code></pre>

      <h3>Default modes</h3>
      <p>If <code>meta.modes</code> is omitted, six defaults are used: <code>self-serve</code>, <code>assisted</code>, <code>automated</code>, <code>manual</code>, <code>n-a</code>, <code>unknown</code>.</p>

      <h3>Auto-generated colors</h3>
      <p>If a node references a mode ID that isn't in <code>meta.modes</code>, the viewer auto-generates a distinct color for it using a golden-ratio hue distribution. This means you can just write descriptive strings as mode values and they'll all render with unique colors:</p>
      <pre><code>{
  "nodes": [
    {
      "id": "n1", "lane": "u", "phase": "p", "title": "Step",
      "today":    { "mode": "Fully customer-managed" },
      "tomorrow": { "mode": "AI-assisted with human review" }
    }
  ]
}</code></pre>
      <p>The auto-colors are stable per mode-name within a session: same name → same color, every render.</p>

      <h3>Localized mode labels</h3>
      <p>Each <code>label</code> can be a localized object:</p>
      <pre><code>{
  "id": "ai",
  "label": { "en": "AI-Augmented", "pt": "Com IA", "es": "Con IA" },
  "color": "#047857"
}</code></pre>
    ` },

    { id: 'multilang', label: 'Multi-language', render: () => `
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

      <h3>Where it works</h3>
      <p>Localized objects are accepted for <code>title</code>, <code>sub</code>, <code>label</code>, <code>objective</code>, <code>entity</code>, <code>actors</code>, <code>triggers</code>, <code>next</code>, <code>narrative</code>, <code>meta.title</code>, <code>meta.subtitle</code>, <code>meta.context</code>, mode labels, module names, and module tags.</p>

      <h3>Detection &amp; switching</h3>
      <p>The viewer scans the document on load and finds every language used. If two or more languages are present, a <strong>Language</strong> picker appears in <strong>Settings</strong>. Otherwise it stays hidden.</p>

      <h3>Default language</h3>
      <p>Resolved in this order:</p>
      <ol>
        <li>User's last selection (localStorage key <code>lifecycle-map.lang</code>)</li>
        <li><code>meta.default_lang</code> in the document</li>
        <li>First available language alphabetically</li>
      </ol>

      <h3>Fallbacks</h3>
      <p>If a string is missing the current language, the viewer falls back to <code>en</code>, then to the first available key. Mixing strings and localized objects in the same document is fine — plain strings render as-is in every language.</p>

      <h3>Detection rule</h3>
      <p>A value is treated as a localized object only if <strong>every</strong> key is a 2-letter language code (optionally with a 2-letter region, e.g. <code>en-US</code>) and <strong>every</strong> value is a string. Otherwise it stays a regular object.</p>

      <p>See <a href="../?src=../examples/multi-language.json">the multi-language example</a> for a complete working file.</p>
    ` },

    { id: 'yaml', label: 'JSON or YAML', render: () => `
      <h2>JSON or YAML</h2>
      <p>Both are accepted with the same schema. The viewer auto-detects by trying JSON first, then YAML.</p>

      <h3>Equivalent example</h3>
      <p>JSON:</p>
      <pre><code>{
  "lanes": [
    { "id": "u", "label": "User" }
  ],
  "phases": [
    { "id": "in", "label": "Intake" }
  ],
  "nodes": [
    { "id": "ask", "lane": "u", "phase": "in", "title": "Ask" }
  ]
}</code></pre>

      <p>YAML:</p>
      <pre><code>lanes:
  - { id: u, label: User }
phases:
  - { id: in, label: Intake }
nodes:
  - { id: ask, lane: u, phase: in, title: Ask }</code></pre>

      <h3>Multi-language in YAML</h3>
      <pre><code>lanes:
  - id: u
    label: { en: User, pt: Usuário, es: Usuario }
nodes:
  - id: ask
    lane: u
    phase: in
    title: { en: Ask, pt: Perguntar, es: Preguntar }</code></pre>

      <h3>Why YAML</h3>
      <ul>
        <li>Comments (<code>#</code>) survive when reviewing in git</li>
        <li>No trailing-comma issues</li>
        <li>Multi-line strings easier to write</li>
        <li>Shorter — no quotes around obvious keys</li>
      </ul>

      <p>See <a href="../?src=../examples/hiring-pipeline.yaml">the YAML hiring-pipeline example</a>.</p>
    ` },

    { id: 'external', label: 'External refs', render: () => `
      <h2>External references</h2>
      <p>Modules can be defined inline or pulled from a shared catalog by ID. Useful when the same feature shows up in multiple steps.</p>

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
      "tomorrow": "automated",
      "tags": ["High-leverage"]
    }
  },
  "nodes": [
    {
      "id": "review",
      "title": "Review",
      "modules": ["shared:bulk-edit"]
    }
  ]
}</code></pre>

      <h3>Hybrid</h3>
      <p>Inline and catalog references can mix in the same node's <code>modules</code> array.</p>

      <p>See <a href="../?src=../examples/with-modules/hiring-pipeline.json">the with-modules example</a>.</p>
    ` },

    { id: 'themes', label: 'Themes', render: () => `
      <h2>Themes</h2>
      <p>Four built-in themes, each with light and dark modes. Open <strong>Settings</strong> (gear icon in the header) to switch.</p>

      <h3>Available themes</h3>
      <ul>
        <li><strong>Paper</strong> — editorial schematic. Fraunces display serif + Inter Tight + JetBrains Mono. Paper, ink, terracotta accent.</li>
        <li><strong>Mono</strong> — brutalist terminal. JetBrains Mono everywhere. Pure black and white.</li>
        <li><strong>Mid-Century</strong> — Wes-Anderson editorial poster. Playfair Display + Inter. Mustard, teal, cream.</li>
        <li><strong>Blueprint</strong> — technical drawing. Special Elite typewriter + Inter. Navy blueprint on cream in light, deep navy + cyan in dark, with a dotted grid backdrop.</li>
      </ul>

      <h3>Light / dark</h3>
      <p>Every theme supports both modes. Toggle inside <strong>Settings</strong>. Initial preference comes from your system (<code>prefers-color-scheme</code>).</p>

      <h3>URL overrides</h3>
      <pre><code>?theme=blueprint&amp;mode=dark</code></pre>
      <p>Useful for shareable links. The selection also persists in <code>localStorage</code> across visits (keys <code>lifecycle-map.theme</code> and <code>lifecycle-map.mode</code>).</p>

      <h3>Live preview</h3>
      <p>Try them now:</p>
      <ul>
        <li><a href="../?theme=paper&amp;mode=light#hiring-pipeline">Paper · light</a></li>
        <li><a href="../?theme=mono&amp;mode=dark#hiring-pipeline">Mono · dark</a></li>
        <li><a href="../?theme=midcentury&amp;mode=light#hiring-pipeline">Mid-Century · light</a></li>
        <li><a href="../?theme=blueprint&amp;mode=dark#hiring-pipeline">Blueprint · dark</a></li>
      </ul>
    ` },

    { id: 'share', label: 'Share', render: () => `
      <h2>Share</h2>
      <p>Click the share icon (three connected dots) in the header to open the share modal. Five strategies are offered, each with different privacy and permanence tradeoffs. <strong>All run client-side</strong> — the viewer page hosts no data of yours.</p>

      <div class="callout">
        Every share option except the first uses a third-party service. We do not control those services and make no privacy or uptime guarantees. You are responsible for the content you share.
      </div>

      <h3>1. Download JSON</h3>
      <p>Saves the current map as <code>lifecycle-map-YYYY-MM-DD.json</code> to your machine. No upload, no URL, no third party. Drop the file back onto the viewer any time to reopen.</p>

      <h3>2. Embedded URL</h3>
      <p>Gzip-compresses the JSON, base64url-encodes it, puts it in the URL fragment. The map travels with the link. Nothing is uploaded. Works offline once opened.</p>
      <p>Caveat: URL length grows with map size. Maps over ~10 KB encoded may hit browser URL limits (typically 32k chars).</p>

      <h3>3. catbox.moe</h3>
      <p>Uploads raw JSON to <a href="https://catbox.moe" target="_blank" rel="noopener noreferrer">catbox.moe</a> — a community-run anonymous file host. No account, no expiration. Files publicly readable by anyone with the URL.</p>
      <p>Returns: a viewer URL (<code>?src=…</code>) <strong>and</strong> the raw file URL.</p>

      <h3>4. 0x0.st</h3>
      <p>Uploads raw JSON to <a href="https://0x0.st" target="_blank" rel="noopener noreferrer">0x0.st</a>. Very short URL, but files expire (30 days for small files, 1 year for tiny).</p>

      <h3>5. Encrypted image</h3>
      <p>The most private public option:</p>
      <ol>
        <li>JSON is gzipped, then encrypted with AES-GCM. The key is derived from your password via PBKDF2-SHA256 (200,000 iterations).</li>
        <li>Ciphertext is embedded in the LSB of a random-noise PNG (steganography).</li>
        <li>PNG is uploaded to catbox.moe. The host sees only an image.</li>
        <li>Share recipient opens <code>#img=&lt;url&gt;</code>, enters the password, viewer decrypts in-browser.</li>
      </ol>
      <p>Password modes:</p>
      <ul>
        <li><strong>Auto-generate</strong> — 8 random digits. Easy to share verbally.</li>
        <li><strong>Custom</strong> — your own string (≥ 6 characters). Stronger if you pick well.</li>
      </ul>
      <p>For real security, share the URL and password through separate channels.</p>

      <h3>What gets shared</h3>
      <p>The shared payload is the current map's JSON. Multi-language strings, modes, and modules are preserved. Internal fields prefixed with <code>_</code> (viewer caches) are stripped.</p>
    ` },

    { id: 'navigation', label: 'Walking the map', render: () => `
      <h2>Walking the map</h2>
      <p>Once a map is loaded, you have several ways to navigate it.</p>

      <h3>Pan + scroll</h3>
      <ul>
        <li>Drag any empty area of the canvas to pan</li>
        <li>Trackpad / wheel to scroll vertically + horizontally</li>
        <li>Phase headers stick to the top; lane labels stick to the left as you scroll</li>
      </ul>

      <h3>Keyboard walk</h3>
      <p>Press <kbd>→</kbd> to advance to the next step in the natural flow order (phase by phase, lane top-down within each phase). <kbd>←</kbd> goes back. The drawer opens automatically to the current step.</p>
      <p>The walk order respects phase order first, then sub-column, then lane top-down, then vertical stack within a cell.</p>

      <h3>Click a node</h3>
      <p>Opens the drawer with details: objective, entities, actors, triggers, today/tomorrow narratives, modules, and links to upstream / downstream nodes. Click an upstream or downstream link to jump.</p>
      <p>The active node is highlighted, and its upstream nodes get a blue tint while downstream nodes get a green tint. Edges feeding the active node turn blue with thicker lines; outgoing edges turn green.</p>

      <h3>Click an edge</h3>
      <p>Opens an edge drawer that explains the connection: from/to nodes, lane and phase context, whether it's a forward or backward flow.</p>

      <h3>Close drawer</h3>
      <p>Click the scrim, press <kbd>Esc</kbd>, or click the × in the drawer corner.</p>
    ` },

    { id: 'agents', label: 'AI agents', render: () => `
      <h2>Use with AI agents</h2>
      <p>An agent (Claude Code, Cursor, ChatGPT with tools) can generate a lifecycle map and hand the user a rendered URL in one shot.</p>

      <h3>Recommended pattern (small maps)</h3>
      <ol>
        <li>Agent generates the JSON.</li>
        <li>Agent compresses + base64-encodes it.</li>
        <li>Agent returns a URL with <code>#data=&lt;encoded&gt;</code>.</li>
      </ol>

      <pre><code># bash
JSON='{"lanes":[...],"phases":[...],"nodes":[...],"edges":[...]}'
ENCODED=$(echo "$JSON" | gzip -9 | base64 | tr -d '\\n' | tr '+/' '-_' | tr -d '=')
echo "https://zalkowitsch.github.io/lifecycle-map/#data=$ENCODED"</code></pre>

      <h3>For larger maps</h3>
      <p>Publish a gist and pass <code>?src=&lt;raw-url&gt;</code>:</p>
      <pre><code>gh gist create map.json --public --filename map.json
# copy the raw URL → ?src=...</code></pre>

      <h3>Agent prompt template</h3>
      <pre><code>You are designing a lifecycle map. Output ONLY valid JSON matching this schema:
- lanes: actors / roles / systems (top-to-bottom rows)
- phases: sequential stages (left-to-right columns)
- nodes: { id, lane, phase, title, objective, today: { mode, narrative }, tomorrow: { mode, narrative } }
- edges: { from, to } directed connections

Then compress and embed it in a URL: https://zalkowitsch.github.io/lifecycle-map/#data=&lt;gzip+base64url&gt;</code></pre>

      <h3>Strict mode</h3>
      <p>For deterministic output, point the agent at the <a href="https://github.com/zalkowitsch/lifecycle-map/blob/main/SCHEMA.md">schema reference</a> and require strict adherence.</p>
    ` },

    { id: 'examples', label: 'Examples', render: () => `
      <h2>Examples</h2>
      <p>Each one demonstrates a different feature combination:</p>
      <ul>
        <li><a href="../#minimal">Minimal</a> · the smallest possible map (10 lines), now with EN/PT/ES strings</li>
        <li><a href="../#hiring-pipeline">Hiring pipeline</a> · full example: 17 nodes, today/tomorrow narratives, modules, custom modes, localized titles</li>
        <li><a href="../#hiring-pipeline-yaml">Hiring pipeline (YAML)</a> · same shape in YAML, including localized narratives</li>
        <li><a href="../#multi-language">Multi-language</a> · 6-node support-triage example, fully translated EN/PT/ES</li>
        <li><a href="../#hiring-pipeline-modules">With shared modules</a> · catalog reference pattern</li>
      </ul>

      <h3>Direct theme links</h3>
      <ul>
        <li><a href="../?theme=mono&amp;mode=dark#hiring-pipeline">Hiring pipeline in mono dark</a></li>
        <li><a href="../?theme=blueprint&amp;mode=dark#hiring-pipeline">Hiring pipeline in blueprint dark</a></li>
        <li><a href="../?theme=midcentury&amp;mode=light#multi-language">Multi-language in mid-century light</a></li>
      </ul>

      <p>Source files are in <a href="https://github.com/zalkowitsch/lifecycle-map/tree/main/examples">examples/</a>.</p>
    ` },

    { id: 'faq', label: 'FAQ', render: () => `
      <h2>FAQ</h2>

      <h3>Can I embed this in my own site?</h3>
      <p>Yes — clone the repo, host <code>index.html</code> + <code>viewer.js</code> + <code>share.js</code> + <code>themes.css</code> on any static host. Or use the GitHub Pages instance and pass your <code>?src</code>.</p>

      <h3>Does it work offline?</h3>
      <p>The viewer needs fonts and YAML parser from CDN on first load. After that, the page is cached and works offline for embedded-URL maps. For fully-offline use, vendor the fonts and <code>js-yaml</code>/<code>pako</code> locally.</p>

      <h3>How big can a map be?</h3>
      <p>The renderer handles 100+ nodes comfortably. Beyond 200 nodes, layout density makes lanes hard to read — split into multiple maps. Encrypted-image share fails on very large maps due to browser canvas size limits.</p>

      <h3>Why are my mode dots all the same grey color?</h3>
      <p>You probably haven't declared <code>meta.modes</code> and your nodes use ad-hoc mode strings. The viewer auto-generates distinct colors for any mode string it sees, but if you previously hit this on an older version, the fix is in the latest release. Define modes explicitly for stable colors across sessions.</p>

      <h3>Can backward edges (loops) be styled differently?</h3>
      <p>Yes — they auto-render as dashed lines routed above or below the swim lanes, never crossing forward flow. Detection is automatic based on phase / column / lane order.</p>

      <h3>What happens if my JSON has a typo?</h3>
      <p>The viewer parses with JSON.parse first, then falls back to YAML. Both throw with a useful error shown on the splash screen.</p>

      <h3>Is there an API for programmatic use?</h3>
      <p>No backend API. The viewer is JS-only. To embed in another app, render an <code>&lt;iframe&gt;</code> pointing at the viewer with a <code>?src=</code> or <code>#data=</code>, or import <code>viewer.js</code> + <code>share.js</code> directly.</p>

      <h3>How do I report a bug?</h3>
      <p>File an issue on <a href="https://github.com/zalkowitsch/lifecycle-map/issues">GitHub</a>.</p>

      <h3>License?</h3>
      <p>MIT.</p>
    ` },
  ];
})();
