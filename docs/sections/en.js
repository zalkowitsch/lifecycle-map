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

    { id: 'use-cases', label: 'Use cases', render: () => `
      <h2>Use cases</h2>
      <p>lifecycle-map fits any process with <strong>actors</strong>, <strong>ordered stages</strong>, and <strong>steps that carry structured detail</strong>. Lanes are who acts, phases are when, nodes are what happens, edges are what triggers what. The node drawer is driven by <code>type</code> + <code>context</code> against <code>meta.nodeTypes</code> — so each step can render its own rubric, signal list, or today/tomorrow split. Below: five concrete fits, then where it's the wrong tool.</p>

      <h3>1 · Interview / hiring loops</h3>
      <p>One map per loop. Each round (recruiter screen, coding, system design, behavioral, hiring-manager) is a node. The round's <code>context</code> holds the rubric: a <code>List</code> of <strong>signals</strong>, each rendered as a <code>Tile</code> with the signal name, an id, and level <code>pills</code> (L1→L4). Why it fits: a loop is exactly a sequence of signal-gathering steps, and the drawer makes the rubric walkable instead of buried in a doc per interviewer.</p>
      <ul>
        <li><strong>Lanes</strong> → candidate, interviewers, hiring manager, committee.</li>
        <li><strong>Phases</strong> → screen → onsite → debrief → decision.</li>
        <li><strong>Nodes</strong> → individual rounds; <code>nodeType</code> "round".</li>
      </ul>
      <pre><code>"round": { "layout": [
  { "type": "Prose", "bind": "$objective" },
  { "type": "KeyValue", "bind": "$meta" },
  { "type": "Section", "title": "Signals", "sub": "$signalsSub",
    "children": [
      { "type": "List", "bind": "$signals",
        "item": { "type": "Tile", "title": "$name", "sub": "$id",
                  "pills": "$levels", "tags": "$tags" } } ] } ] }</code></pre>

      <h3>2 · Hiring pipeline / ATS flow</h3>
      <p>Zoom out from one loop to the whole funnel: sourcing → screen → phone → onsite → decision → offer → onboard. Each step gets a <strong>today</strong> and <strong>tomorrow</strong> state (manual vs. AI-augmented) plus a <code>List</code> of supporting modules. Why it fits: it maps the handoffs between sourcer, recruiter, hiring manager, and approver that a flat Kanban board hides, and the today/tomorrow split doubles it as an automation roadmap. This is the bundled <a href="../#hiring-pipeline">hiring-pipeline</a> example.</p>
      <ul>
        <li><strong>Lanes</strong> → candidate, sourcer, recruiter, hiring manager, interviewer, approver.</li>
        <li><strong>Phases</strong> → the six funnel stages.</li>
        <li><strong>Nodes</strong> → steps with <code>states</code> (Today/Tomorrow Tiles) and <code>modules</code>.</li>
      </ul>

      <h3>3 · Customer support / triage</h3>
      <p>Inbound ticket to resolution: intake → classify → route → resolve → follow-up. Lanes split the work across the customer, the bot/auto-triage layer, tier-1, and the escalation team. Why it fits: triage is a routing problem with explicit ownership at each hop — lanes make the escalation boundary visible, and edges (including backward loops for reopened tickets) show where work bounces. The drawer per node can carry SLA targets in a <code>KeyValue</code> and channel <code>Pills</code>.</p>
      <ul>
        <li><strong>Lanes</strong> → customer, auto-triage, tier-1, tier-2 / escalation.</li>
        <li><strong>Phases</strong> → intake → classify → route → resolve → follow-up.</li>
        <li><strong>Nodes</strong> → handling steps; backward edges for reopen / re-route.</li>
      </ul>

      <h3>4 · Onboarding / activation</h3>
      <p>From signup to first value: account creation → setup → first key action → habit. Lanes separate the new user from the product's automated nudges and the CS / onboarding team. Why it fits: activation is a staged funnel where each step has a drop-off and an owner — modeling it as nodes lets you attach the activation metric and the intervention (email, in-app, human touch) to each stage as <code>Pills</code> or a module <code>List</code>. Today/tomorrow captures "manual CS hand-holding now → self-serve later".</p>
      <ul>
        <li><strong>Lanes</strong> → user, product (automated), CS / onboarding.</li>
        <li><strong>Phases</strong> → signup → setup → first action → activation → habit.</li>
        <li><strong>Nodes</strong> → milestones with owner lane + intervention.</li>
      </ul>

      <h3>5 · Capability / transformation roadmaps</h3>
      <p>Less a who-does-what flow, more a where-are-we map. Phases are capability domains; nodes are capabilities; each node's <strong>today</strong> vs. <strong>tomorrow</strong> mode (manual → assisted → automated → AI) is the whole point. Why it fits: the two mode dots per node give an at-a-glance heat-read of how far each capability is from its target state, and <code>meta.modes</code> gives a consistent color legend across the map. Use lanes for teams or value streams that own each capability.</p>
      <ul>
        <li><strong>Lanes</strong> → value streams / owning teams.</li>
        <li><strong>Phases</strong> → capability domains.</li>
        <li><strong>Nodes</strong> → capabilities; <code>today.mode</code> / <code>tomorrow.mode</code> carry the gap.</li>
      </ul>

      <h3>When NOT to use it</h3>
      <p>It's the wrong tool when the structure isn't lanes × phases:</p>
      <ul>
        <li><strong>Tiny ad-hoc diagrams</strong> — a 5-box flowchart with no actors or stages. Use <a href="https://mermaid.js.org">Mermaid</a>; it's one fenced code block and renders inline anywhere.</li>
        <li><strong>Freeform collaboration</strong> — sticky-note clustering, live brainstorming, spatial layouts with no fixed grid. Use <a href="https://miro.com">Miro</a> or FigJam.</li>
        <li><strong>Org charts, mind maps, dependency graphs</strong> — hierarchies and arbitrary networks, not directed lane-to-lane flow. Use a graph tool.</li>
        <li><strong>Live operational dashboards</strong> — this renders a static source-controlled model, not a feed of real-time state. Wire metrics elsewhere.</li>
      </ul>
      <p>Rule of thumb: if you can name the <strong>lanes</strong> and the <strong>phases</strong> before you start, it fits. If you can't, reach for Mermaid or Miro.</p>
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
      <p>Note: the node <strong>drawer</strong> content is now driven by a node's <code>type</code> + <code>context</code> resolved against <code>meta.nodeTypes</code> (see <a href="?lang=en#primitives">Drawer primitives</a>). The data-level model — lanes, phases, edges, and <code>today</code>/<code>tomorrow</code> — is unchanged.</p>
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

    { id: 'primitives', label: 'Drawer primitives', render: () => `
      <h2>Drawer primitives</h2>
      <p>The node drawer content is no longer hardcoded. A node declares a <code>type</code>; the type's layout is a tree of generic UI primitives with data bindings. The node carries its data in <code>context</code>. The app renders the layout, resolving each binding against the node's context.</p>

      <h3>Node shape &amp; meta.nodeTypes</h3>
      <p>A node references <code>meta.nodeTypes[type].layout</code> — a tree of primitives — and carries its data in <code>context</code>. Grid position (<code>id</code>, <code>lane</code>, <code>phase</code>, <code>col</code>) stays outside <code>context</code>.</p>
      <pre><code>{
  "meta": {
    "nodeTypes": {
      "interview-round": {
        "layout": [
          { "type": "Prose", "bind": "$objective" },
          { "type": "KeyValue", "bind": "$meta" },
          { "type": "Section", "title": "Rubrics", "sub": "$rubricsSub",
            "children": [
              { "type": "List", "bind": "$rubrics",
                "item": { "type": "Tile", "title": "$name", "sub": "$id",
                          "pills": "$levels", "tags": "$tags" } }
            ] }
        ]
      }
    }
  },
  "nodes": [
    { "id": "coding", "lane": "interviewers", "phase": "onsite",
      "type": "interview-round",
      "context": {
        "objective": "A problem that starts simple...",
        "meta": [ { "label": "Duration", "value": "75 min" } ],
        "rubricsSub": "signals measured this round",
        "rubrics": [
          { "name": "Code fluency", "id": "rubric:code-fluency",
            "levels": [ { "label": "L1" }, { "label": "L4" } ],
            "tags": ["Code fluency"] }
        ]
      } }
  ]
}</code></pre>

      <h3>The binding rule</h3>
      <p>A string value starting with <code>$</code> is a binding: it reads <code>context.&lt;key&gt;</code> — <code>"$rubrics"</code> resolves to <code>context.rubrics</code>. A string without a leading <code>$</code> is a literal, rendered as-is.</p>
      <p>Inside a <code>List</code>, the <code>item</code> primitive receives each array element as its <strong>local</strong> context. So <code>Tile.title: "$name"</code> reads <code>item.name</code>, not the node-level context.</p>
      <p>Every binding is optional at render time. A binding that resolves to <code>undefined</code> / missing makes that primitive (or that one prop) omit itself — no crash, no placeholder.</p>

      <h3>The 10 primitives</h3>
      <p>Each <code>type</code> selects a fixed, app-provided component. Fields below are the exact prop names.</p>

      <h4>Section</h4>
      <p>A titled group. <code>title</code> and <code>sub</code> are str-or-binding; <code>children</code> is an array of primitives. Heading rows omit when empty.</p>
      <pre><code>{ "type": "Section", "title": "Rubrics", "sub": "$rubricsSub", "children": [ ... ] }</code></pre>

      <h4>KeyValue</h4>
      <p><code>bind</code> resolves to an array of <code>{ label, value }</code> rows. Omits if not an array or empty.</p>
      <pre><code>{ "type": "KeyValue", "bind": "$meta" }</code></pre>

      <h4>List</h4>
      <p><code>bind</code> resolves to an array; <code>item</code> is rendered once per element, each element passed as the item's local context. Omits if empty or no <code>item</code>.</p>
      <pre><code>{ "type": "List", "bind": "$rubrics", "item": { "type": "Tile", "title": "$name" } }</code></pre>

      <h4>Tile</h4>
      <p>A card with <code>title</code>, optional <code>sub</code>, and two pill rows: <code>pills</code> and <code>tags</code> (each a binding to an array). Omits entirely if <code>title</code> resolves empty.</p>
      <pre><code>{ "type": "Tile", "title": "$name", "sub": "$id", "pills": "$levels", "tags": "$tags" }</code></pre>

      <h4>Pills</h4>
      <p><code>bind</code> resolves to an array of strings or <code>{ label, color? }</code> objects. Per-pill <code>color</code> tints the label. Omits if the array is empty or missing.</p>
      <pre><code>{ "type": "Pills", "bind": "$levels" }</code></pre>

      <h4>Prose</h4>
      <p>A paragraph. <code>bind</code> resolves to text. The HTML is sanitized to an allowlist of <code>&lt;em&gt;</code>, <code>&lt;strong&gt;</code>, <code>&lt;br&gt;</code> only — scripts, attributes, and any other tags are stripped. Omits if empty.</p>
      <pre><code>{ "type": "Prose", "bind": "$objective" }</code></pre>

      <h4>Title</h4>
      <p>A heading. <code>text</code> is str-or-binding; <code>variant</code> is <code>h1</code>, <code>h2</code> (default), or <code>eyebrow</code>. Omits if empty.</p>
      <pre><code>{ "type": "Title", "text": "How We Interview", "variant": "h1" }</code></pre>

      <h4>Text</h4>
      <p>An inline run of text. <code>text</code> is str-or-binding; <code>variant</code> is <code>body</code> (default), <code>caption</code>, or <code>mono</code>. Omits if empty.</p>
      <pre><code>{ "type": "Text", "text": "$duration", "variant": "caption" }</code></pre>

      <h4>Button</h4>
      <p>A button. <code>text</code> is the label; <code>action</code> is <code>navigate</code> (default) or <code>copy</code>; <code>target</code> is a binding passed to the action handler. Omits if label empty.</p>
      <pre><code>{ "type": "Button", "text": "Open spec", "action": "navigate", "target": "$specUrl" }</code></pre>

      <h4>Link</h4>
      <p>An external link. <code>text</code> is the label; <code>href</code> is a binding. Only <code>http</code> / <code>https</code> hrefs are allowed — <code>javascript:</code>, <code>data:</code>, and other schemes are rejected and the link omits itself.</p>
      <pre><code>{ "type": "Link", "text": "Docs", "href": "$docsUrl" }</code></pre>

      <p>Localized objects (<code>{ en, pt, es, ... }</code>) work anywhere a primitive renders text — same rules as the rest of the document (see <a href="?lang=en#multilang">Multi-language</a>).</p>
    ` },

    { id: 'customization', label: 'Customization', render: () => `
      <h2>Customization</h2>
      <p>This is the heart of the data-driven model: <strong>you</strong> decide what a node drawer shows. The drawer is no longer hardcoded — there is no fixed Objective / Modules / States layout. Instead you author your own <code>nodeType</code> out of the 10 <a href="?lang=en#primitives">drawer primitives</a>, and every node of that type fills it with data. Design the layout once, reuse it across the whole map.</p>

      <h3>The mental model</h3>
      <p>Two halves, kept apart on purpose:</p>
      <ul>
        <li><strong>The type defines the layout.</strong> <code>meta.nodeTypes.&lt;type&gt;.layout</code> is a tree of primitives — the shape of the drawer. It says <em>what</em> sections exist and <em>where</em> each piece of data lands, but holds no data itself.</li>
        <li><strong>The node passes the context.</strong> Each node sets <code>type</code> to pick a layout and carries its own data in <code>context</code>. The app walks the layout and resolves every binding against that node's context.</li>
      </ul>
      <p>So one layout, many nodes: change the layout once and every node of that type re-renders the new way; change a node's context and only that drawer changes.</p>

      <h3>A complete worked example</h3>
      <p>Define a custom type <code>service</code> with four primitives stacked top to bottom: a <code>Prose</code> intro, a <code>KeyValue</code> fact table, and a <code>Section</code> wrapping a <code>List</code> that renders one <code>Tile</code> per element.</p>
      <pre><code>{
  "meta": {
    "nodeTypes": {
      "service": {
        "layout": [
          { "type": "Prose", "bind": "$summary" },
          { "type": "KeyValue", "bind": "$facts" },
          { "type": "Section", "title": "Dependencies", "sub": "$depsSub",
            "children": [
              { "type": "List", "bind": "$deps",
                "item": { "type": "Tile", "title": "$name", "sub": "$owner",
                          "pills": "$status" } }
            ] }
        ]
      }
    }
  }
}</code></pre>
      <p>Now a node that selects that type and fills it. Grid position (<code>id</code>, <code>lane</code>, <code>phase</code>, <code>col</code>) stays <strong>outside</strong> <code>context</code>; everything the layout binds to lives <strong>inside</strong> it.</p>
      <pre><code>{
  "nodes": [
    { "id": "billing-api", "lane": "platform", "phase": "run", "col": 0,
      "title": "Billing API",
      "type": "service",
      "context": {
        "summary": "Owns invoices and charge state. &lt;strong&gt;Tier-1&lt;/strong&gt; service.",
        "facts": [
          { "label": "Runtime", "value": "Go 1.22" },
          { "label": "SLO", "value": "99.95%" }
        ],
        "depsSub": "upstream services this calls",
        "deps": [
          { "name": "Ledger", "owner": "payments-team", "status": ["healthy"] },
          { "name": "Tax engine", "owner": "vendor", "status": ["degraded"] }
        ]
      } }
  ]
}</code></pre>
      <p>What renders, top to bottom: a sanitized paragraph (the <code>&lt;strong&gt;</code> survives, anything else would be stripped); a two-row label/value table; a <strong>Dependencies</strong> heading with the sub-line "upstream services this calls"; then two tiles — "Ledger / payments-team" with a <code>healthy</code> pill, and "Tax engine / vendor" with a <code>degraded</code> pill.</p>

      <h3>Binding rules to keep in mind</h3>
      <ul>
        <li><strong><code>$key</code> vs literal.</strong> A string starting with <code>$</code> reads from context: <code>"$deps"</code> → <code>context.deps</code>. A string without <code>$</code> is a literal, rendered as-is — that's why <code>"title": "Dependencies"</code> prints the word, while <code>"bind": "$deps"</code> looks up data.</li>
        <li><strong>List item local context.</strong> Inside a <code>List</code>, each array element becomes the <em>local</em> context for the <code>item</code> primitive. So <code>Tile.title: "$name"</code> reads <code>element.name</code> — not the node-level context. The <code>item</code> can't see <code>$summary</code> from above; it only sees its own element.</li>
        <li><strong>Missing → omit.</strong> Every binding is optional. A binding that resolves to <code>undefined</code> / missing makes that primitive (or that one prop) drop out — no crash, no placeholder. Leave <code>owner</code> off one dependency and only that tile loses its sub-line; the rest render normally.</li>
      </ul>

      <h3>Composing a rubric-style drawer</h3>
      <p>The same Section &gt; List &gt; Tile spine gives you a scorecard. Put the rubric <strong>name</strong> as the Tile <code>title</code>, the maturity <strong>levels</strong> as <code>pills</code>, and category <strong>tags</strong> as a second pill row. A <code>Tile</code> has two independent pill rows — <code>pills</code> and <code>tags</code> — each a binding to an array of strings or <code>{ label, color? }</code> objects.</p>
      <pre><code>{
  "meta": {
    "nodeTypes": {
      "round": {
        "layout": [
          { "type": "Section", "title": "Rubrics", "sub": "$rubricsSub",
            "children": [
              { "type": "List", "bind": "$rubrics",
                "item": { "type": "Tile", "title": "$name", "sub": "$id",
                          "pills": "$levels", "tags": "$tags" } }
            ] }
        ]
      }
    }
  },
  "nodes": [
    { "id": "coding", "lane": "panel", "phase": "onsite", "col": 0,
      "title": "Coding round",
      "type": "round",
      "context": {
        "rubricsSub": "signals measured this round",
        "rubrics": [
          { "name": "Code fluency", "id": "r:fluency",
            "levels": [ { "label": "L1" }, { "label": "L4" } ],
            "tags": ["core"] },
          { "name": "Problem decomposition", "id": "r:decomp",
            "levels": [ { "label": "L2" }, { "label": "L5" } ],
            "tags": ["core", "design"] }
        ]
      } }
  ]
}</code></pre>
      <p>Each element of <code>rubrics</code> becomes one tile: its <code>name</code> is the title, <code>id</code> the sub-line, <code>levels</code> the top pill row, <code>tags</code> the second. Add a <code>color</code> to a level object (<code>{ "label": "L4", "color": "#047857" }</code>) to tint that pill.</p>

      <h3>Reusing a nodeType across many nodes</h3>
      <p>A type is defined once and referenced by any number of nodes. Every node with <code>"type": "service"</code> draws from the same <code>meta.nodeTypes.service.layout</code> — they differ only in <code>context</code>. This is the payoff: dozens of nodes share one drawer design, and editing the layout updates all of them at once. You can also define several types (<code>service</code>, <code>round</code>, <code>handoff</code>, …) in the same map and let each node pick the one that fits.</p>
      <p>If a layout key resolves to nothing for a given node, that part simply omits — so a single shared type can serve both rich and sparse nodes without per-node layouts. A node that has no <code>deps</code> just won't render the Dependencies section.</p>

      <h3>Layout vs. theme</h3>
      <p>Customizing a <code>nodeType</code> changes <strong>what content</strong> the drawer shows. It does not touch <strong>visual styling</strong> — fonts, colors, light/dark. Those come from the visual theme, switched in Settings or via <code>?theme=&amp;mode=</code> in the URL. The two are independent: any layout renders correctly under any theme. See <a href="?lang=en#themes">Themes</a> for the built-in themes and dark mode, and <a href="?lang=en#primitives">Drawer primitives</a> for the exact prop names of all 10 primitives.</p>
    ` },

    { id: 'api', label: 'API reference', render: () => `
      <h1>API reference <em>— the data model</em></h1>
      <p class="lead">A lifecycle map is one JSON (or YAML) document. This is the complete contract: every top-level key, the node-type layout engine, the 10 drawer primitives, and the binding grammar that wires node data into rendered drawers.</p>

      <h2>Document shape</h2>
      <p>One object. Only <code>lanes</code>, <code>phases</code>, and <code>nodes</code> are structurally required to render; the rest add labels, drawers, and flow.</p>
      <table>
        <thead><tr><th>Key</th><th>Type</th><th>Req?</th><th>Purpose</th></tr></thead>
        <tbody>
          <tr><td><code>meta</code></td><td>object</td><td>—</td><td>Title, subtitle, default language, modes, and the <code>nodeTypes</code> drawer registry.</td></tr>
          <tr><td><code>lanes</code></td><td>array</td><td>yes</td><td>Rows — the actors / roles / systems.</td></tr>
          <tr><td><code>phases</code></td><td>array</td><td>yes</td><td>Columns — the sequential stages.</td></tr>
          <tr><td><code>nodes</code></td><td>array</td><td>yes</td><td>Steps placed in a lane × phase cell.</td></tr>
          <tr><td><code>edges</code></td><td>array</td><td>—</td><td>Directed flow between nodes.</td></tr>
          <tr><td><code>modules</code></td><td>object</td><td>—</td><td>Optional top-level capability catalog (see <code>meta.modules_source</code>).</td></tr>
        </tbody>
      </table>
      <p>Strings shown below as <code>LStr</code> are <strong>localized strings</strong>: either a plain string, or an object <code>{ en, pt, es, ... }</code> (see <a href="#api">Localized strings</a> at the end).</p>

      <h2><code>meta</code></h2>
      <table>
        <thead><tr><th>Field</th><th>Type</th><th>Req?</th><th>Meaning</th></tr></thead>
        <tbody>
          <tr><td><code>title</code></td><td>LStr</td><td>—</td><td>Map title, shown in the header.</td></tr>
          <tr><td><code>subtitle</code></td><td>LStr</td><td>—</td><td>Sub-line under the title.</td></tr>
          <tr><td><code>context</code></td><td>LStr</td><td>—</td><td>Free-text framing for the whole map.</td></tr>
          <tr><td><code>default_lang</code></td><td>string</td><td>—</td><td>Language key picked first, e.g. <code>"en"</code>.</td></tr>
          <tr><td><code>modes</code></td><td>array</td><td>—</td><td>Legend entries: each <code>{ id, label: LStr, color }</code>. Referenced by node state / pill values.</td></tr>
          <tr><td><code>nodeTypes</code></td><td>object</td><td>—</td><td>Map of <code>typeName → { layout: [...] }</code>. The drawer engine. See below.</td></tr>
          <tr><td><code>modules_source</code></td><td>string</td><td>—</td><td>Pointer to where the top-level <code>modules</code> catalog comes from.</td></tr>
        </tbody>
      </table>

      <h2><code>lanes</code></h2>
      <table>
        <thead><tr><th>Field</th><th>Type</th><th>Req?</th><th>Meaning</th></tr></thead>
        <tbody>
          <tr><td><code>id</code></td><td>string</td><td>yes</td><td>Unique. Referenced by <code>node.lane</code>.</td></tr>
          <tr><td><code>label</code></td><td>LStr</td><td>yes</td><td>Row label.</td></tr>
          <tr><td><code>sub</code></td><td>LStr</td><td>—</td><td>Secondary line under the lane label.</td></tr>
        </tbody>
      </table>

      <h2><code>phases</code></h2>
      <table>
        <thead><tr><th>Field</th><th>Type</th><th>Req?</th><th>Meaning</th></tr></thead>
        <tbody>
          <tr><td><code>id</code></td><td>string</td><td>yes</td><td>Unique. Referenced by <code>node.phase</code>.</td></tr>
          <tr><td><code>label</code></td><td>LStr</td><td>yes</td><td>Column label.</td></tr>
          <tr><td><code>roman</code></td><td>string</td><td>—</td><td>Display ordinal, e.g. <code>"III"</code>.</td></tr>
          <tr><td><code>subCols</code></td><td>number</td><td>—</td><td>How many sub-columns the phase spans (node <code>col</code> indexes into these).</td></tr>
        </tbody>
      </table>

      <h2><code>nodes</code></h2>
      <table>
        <thead><tr><th>Field</th><th>Type</th><th>Req?</th><th>Meaning</th></tr></thead>
        <tbody>
          <tr><td><code>id</code></td><td>string</td><td>yes</td><td>Unique. Referenced by edges.</td></tr>
          <tr><td><code>lane</code></td><td>string</td><td>yes</td><td>A <code>lanes[].id</code>.</td></tr>
          <tr><td><code>phase</code></td><td>string</td><td>yes</td><td>A <code>phases[].id</code>.</td></tr>
          <tr><td><code>col</code></td><td>number</td><td>—</td><td>0-based sub-column within the phase. Default <code>0</code>.</td></tr>
          <tr><td><code>title</code></td><td>LStr</td><td>yes</td><td>Node card title.</td></tr>
          <tr><td><code>sub</code></td><td>LStr</td><td>—</td><td>Secondary line on the card.</td></tr>
          <tr><td><code>type</code></td><td>string</td><td>—</td><td>Selects <code>meta.nodeTypes[type]</code> for the drawer. No <code>type</code> → no drawer body.</td></tr>
          <tr><td><code>context</code></td><td>object</td><td>—</td><td>The data the layout binds against. Free-form; keys are referenced by <code>$key</code> bindings.</td></tr>
        </tbody>
      </table>

      <h2><code>edges</code></h2>
      <p>Directed links. Both naming conventions are accepted — use one consistently and check the example you're copying.</p>
      <table>
        <thead><tr><th>Field</th><th>Type</th><th>Req?</th><th>Meaning</th></tr></thead>
        <tbody>
          <tr><td><code>source</code> / <code>from</code></td><td>string</td><td>yes</td><td>Origin <code>node.id</code>.</td></tr>
          <tr><td><code>target</code> / <code>to</code></td><td>string</td><td>yes</td><td>Destination <code>node.id</code>.</td></tr>
        </tbody>
      </table>

      <h2>Node types &amp; the layout engine</h2>
      <p>A node's drawer is not hardcoded. It is computed: the node's <code>type</code> selects an entry in <code>meta.nodeTypes</code>, whose <code>layout</code> is an array of <strong>primitives</strong> the drawer walks top-to-bottom. Each primitive resolves its bindings against the node's <code>context</code> and renders itself.</p>
      <pre><code>"meta": {
  "nodeTypes": {
    "step": {
      "layout": [
        { "type": "Prose",   "bind": "$objective" },
        { "type": "KeyValue","bind": "$meta" },
        { "type": "Section", "title": "States", "children": [
          { "type": "List", "bind": "$states", "item": {
            "type": "Tile", "title": "$label", "sub": "$mode", "pills": "$tools"
          } }
        ] }
      ]
    }
  }
}</code></pre>
      <p>A node with <code>"type": "step"</code> renders that layout against its own <code>context</code>. Two nodes sharing a type share a layout but supply different context. A <code>type</code> with no matching <code>nodeTypes</code> entry, or a node with no <code>type</code>, renders no body.</p>

      <h2>Primitive catalog</h2>
      <p>Ten primitives. Every primitive carries <code>type</code> (its name). Props ending in a binding (<code>$key</code>) read from the local context; literal strings render as-is. A binding that resolves to <code>undefined</code> makes that primitive — or that single prop — omit itself.</p>

      <h3>Prose</h3>
      <p>A paragraph block. Input is sanitized to an allowlist (<code>em</code>, <code>strong</code>, <code>br</code> only); everything else is stripped.</p>
      <table>
        <thead><tr><th>Field</th><th>Type</th><th>Req?</th><th>Meaning</th></tr></thead>
        <tbody>
          <tr><td><code>type</code></td><td><code>"Prose"</code></td><td>yes</td><td>—</td></tr>
          <tr><td><code>bind</code></td><td>binding</td><td>yes</td><td>Resolves to the (sanitized) text.</td></tr>
        </tbody>
      </table>
      <pre><code>{ "type": "Prose", "bind": "$objective" }</code></pre>

      <h3>KeyValue</h3>
      <p>A label/value list.</p>
      <table>
        <thead><tr><th>Field</th><th>Type</th><th>Req?</th><th>Meaning</th></tr></thead>
        <tbody>
          <tr><td><code>type</code></td><td><code>"KeyValue"</code></td><td>yes</td><td>—</td></tr>
          <tr><td><code>bind</code></td><td>binding</td><td>yes</td><td>Resolves to an array of <code>{ label, value }</code> rows.</td></tr>
        </tbody>
      </table>
      <pre><code>{ "type": "KeyValue", "bind": "$meta" }</code></pre>

      <h3>Section</h3>
      <p>A titled group that nests other primitives.</p>
      <table>
        <thead><tr><th>Field</th><th>Type</th><th>Req?</th><th>Meaning</th></tr></thead>
        <tbody>
          <tr><td><code>type</code></td><td><code>"Section"</code></td><td>yes</td><td>—</td></tr>
          <tr><td><code>title</code></td><td>string / binding</td><td>yes</td><td>Heading.</td></tr>
          <tr><td><code>sub</code></td><td>string / binding</td><td>—</td><td>Sub-heading.</td></tr>
          <tr><td><code>children</code></td><td>primitive[]</td><td>yes</td><td>Nested primitives, walked in order.</td></tr>
        </tbody>
      </table>
      <pre><code>{ "type": "Section", "title": "States", "sub": "$statesSub", "children": [ ... ] }</code></pre>

      <h3>List</h3>
      <p>Repeats one primitive over an array. <strong>Each array element becomes the local context</strong> for <code>item</code> — so inside <code>item</code>, <code>$name</code> reads <code>element.name</code>, not the node-level context.</p>
      <table>
        <thead><tr><th>Field</th><th>Type</th><th>Req?</th><th>Meaning</th></tr></thead>
        <tbody>
          <tr><td><code>type</code></td><td><code>"List"</code></td><td>yes</td><td>—</td></tr>
          <tr><td><code>bind</code></td><td>binding</td><td>yes</td><td>Resolves to the array.</td></tr>
          <tr><td><code>item</code></td><td>primitive</td><td>yes</td><td>Rendered once per element, with the element as its context.</td></tr>
        </tbody>
      </table>
      <pre><code>{ "type": "List", "bind": "$modules", "item": {
  "type": "Tile", "title": "$feature", "sub": "$id", "pills": "$levels"
} }</code></pre>

      <h3>Tile</h3>
      <p>A compact card, typically the <code>item</code> of a List.</p>
      <table>
        <thead><tr><th>Field</th><th>Type</th><th>Req?</th><th>Meaning</th></tr></thead>
        <tbody>
          <tr><td><code>type</code></td><td><code>"Tile"</code></td><td>yes</td><td>—</td></tr>
          <tr><td><code>title</code></td><td>string / binding</td><td>yes</td><td>Tile heading.</td></tr>
          <tr><td><code>sub</code></td><td>string / binding</td><td>—</td><td>Secondary line.</td></tr>
          <tr><td><code>pills</code></td><td>binding</td><td>—</td><td>Array → rendered as pills (same value shape as Pills).</td></tr>
          <tr><td><code>tags</code></td><td>binding</td><td>—</td><td>Array of tag strings.</td></tr>
        </tbody>
      </table>
      <pre><code>{ "type": "Tile", "title": "$label", "sub": "$mode", "pills": "$tools" }</code></pre>

      <h3>Pills</h3>
      <p>A row of pills. No variant prop.</p>
      <table>
        <thead><tr><th>Field</th><th>Type</th><th>Req?</th><th>Meaning</th></tr></thead>
        <tbody>
          <tr><td><code>type</code></td><td><code>"Pills"</code></td><td>yes</td><td>—</td></tr>
          <tr><td><code>bind</code></td><td>binding</td><td>yes</td><td>Resolves to an array of strings, or of <code>{ label, color? }</code>.</td></tr>
        </tbody>
      </table>
      <pre><code>{ "type": "Pills", "bind": "$levels" }</code></pre>

      <h3>Title</h3>
      <p>A standalone heading with literal text.</p>
      <table>
        <thead><tr><th>Field</th><th>Type</th><th>Req?</th><th>Meaning</th></tr></thead>
        <tbody>
          <tr><td><code>type</code></td><td><code>"Title"</code></td><td>yes</td><td>—</td></tr>
          <tr><td><code>text</code></td><td>string / binding</td><td>yes</td><td>The heading text.</td></tr>
          <tr><td><code>variant</code></td><td>enum</td><td>—</td><td>One of <code>h1</code>, <code>h2</code>, <code>eyebrow</code>.</td></tr>
        </tbody>
      </table>
      <pre><code>{ "type": "Title", "text": "Overview", "variant": "h2" }</code></pre>

      <h3>Text</h3>
      <p>A standalone line of body text.</p>
      <table>
        <thead><tr><th>Field</th><th>Type</th><th>Req?</th><th>Meaning</th></tr></thead>
        <tbody>
          <tr><td><code>type</code></td><td><code>"Text"</code></td><td>yes</td><td>—</td></tr>
          <tr><td><code>text</code></td><td>string / binding</td><td>yes</td><td>The text.</td></tr>
          <tr><td><code>variant</code></td><td>enum</td><td>—</td><td>One of <code>body</code>, <code>caption</code>, <code>mono</code>.</td></tr>
        </tbody>
      </table>
      <pre><code>{ "type": "Text", "text": "$note", "variant": "caption" }</code></pre>

      <h3>Button</h3>
      <p>An action control.</p>
      <table>
        <thead><tr><th>Field</th><th>Type</th><th>Req?</th><th>Meaning</th></tr></thead>
        <tbody>
          <tr><td><code>type</code></td><td><code>"Button"</code></td><td>yes</td><td>—</td></tr>
          <tr><td><code>text</code></td><td>string / binding</td><td>yes</td><td>Label.</td></tr>
          <tr><td><code>action</code></td><td>enum</td><td>—</td><td><code>navigate</code> or <code>copy</code>.</td></tr>
          <tr><td><code>target</code></td><td>string / binding</td><td>—</td><td>Node id to navigate to, or text to copy.</td></tr>
        </tbody>
      </table>
      <pre><code>{ "type": "Button", "text": "Go to debrief", "action": "navigate", "target": "debrief" }</code></pre>

      <h3>Link</h3>
      <p>An external link. Non-<code>http</code>/<code>https</code> schemes are rejected (no <code>javascript:</code>, <code>data:</code>, etc.).</p>
      <table>
        <thead><tr><th>Field</th><th>Type</th><th>Req?</th><th>Meaning</th></tr></thead>
        <tbody>
          <tr><td><code>type</code></td><td><code>"Link"</code></td><td>yes</td><td>—</td></tr>
          <tr><td><code>text</code></td><td>string / binding</td><td>yes</td><td>Link text.</td></tr>
          <tr><td><code>href</code></td><td>string / binding</td><td>yes</td><td>URL — <code>http</code>/<code>https</code> only.</td></tr>
        </tbody>
      </table>
      <pre><code>{ "type": "Link", "text": "Docs", "href": "https://example.com" }</code></pre>

      <h2>Binding grammar</h2>
      <p>The rules the engine applies when resolving any prop value:</p>
      <ul>
        <li><strong><code>$</code>-prefix → binding.</strong> A string starting with <code>$</code> (e.g. <code>$objective</code>) is looked up by key against the current context.</li>
        <li><strong>No <code>$</code> → literal.</strong> Any other string renders verbatim (e.g. <code>"States"</code> as a Section title).</li>
        <li><strong>List local context.</strong> Inside a <code>List.item</code>, the current context is the array <em>element</em>, not the node. <code>Tile.title: "$name"</code> reads <code>element.name</code>.</li>
        <li><strong>Undefined omits.</strong> A binding that resolves to <code>undefined</code> / missing causes that primitive (or just that prop) to drop out — no empty placeholder.</li>
      </ul>

      <h3>Security constraints</h3>
      <ul>
        <li><strong>Prose</strong> sanitizes to an allowlist of <code>em</code>, <code>strong</code>, <code>br</code>. All other tags/attributes are stripped.</li>
        <li><strong>Link</strong> accepts only <code>http</code> and <code>https</code> hrefs; other schemes are rejected.</li>
      </ul>

      <h2>Localized strings</h2>
      <p>Anywhere the tables above say <code>LStr</code>, you may pass either a plain string or a per-language object:</p>
      <pre><code>"label": { "en": "Candidate", "pt": "Candidato", "es": "Candidato" }</code></pre>
      <p>The viewer picks <code>meta.default_lang</code> first, then falls back across available keys. Localized objects are honored on <strong>data-level display strings</strong> — <code>meta.title</code>/<code>subtitle</code>/<code>context</code>, <code>modes[].label</code>, <code>lanes[].label</code>/<code>sub</code>, <code>phases[].label</code>, and <code>nodes[].title</code>/<code>sub</code>. Values inside <code>node.context</code> are plain data resolved by bindings; localize them by giving the bound value the <code>{ en, pt, es }</code> shape where your layout reads it.</p>
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
      <p>Five bundled files, each demonstrating a different feature combination. Every snippet below is drawn verbatim from the actual file in <code>examples/</code>.</p>

      <h3>Minimal</h3>
      <p>The smallest possible map: two lanes, two phases, four nodes, no drawer content. <code>nodeTypes.step.layout</code> is empty and every node carries an empty <code>context</code>.</p>
      <pre><code>"nodeTypes": { "step": { "layout": [] } }
...
"nodes": [
  { "id": "ask", "lane": "user", "phase": "request",
    "title": { "en": "Ask question", "pt": "Fazer pergunta", "es": "Hacer pregunta" },
    "type": "step", "context": {} }
]</code></pre>
      <p><a href="../#minimal">Open in viewer →</a></p>

      <h3>Hiring pipeline</h3>
      <p>The full reference map: 17 nodes, custom <code>modes</code>, localized titles, and a typed <code>step</code> nodeType whose layout walks <code>Prose</code> → <code>KeyValue</code> → two <code>Section</code>/<code>List</code>/<code>Tile</code> blocks. This is the canonical typed <code>nodeTypes</code> + <code>context</code> shape.</p>
      <pre><code>"nodeTypes": {
  "step": {
    "layout": [
      { "type": "Prose", "bind": "$objective" },
      { "type": "KeyValue", "bind": "$meta" },
      { "type": "Section", "title": "Modules", "sub": "$modulesSub",
        "children": [
          { "type": "List", "bind": "$modules",
            "item": { "type": "Tile", "title": "$feature", "sub": "$id", "pills": "$levels" } }
        ] },
      { "type": "Section", "title": "States",
        "children": [
          { "type": "List", "bind": "$states",
            "item": { "type": "Tile", "title": "$label", "sub": "$mode", "pills": "$tools" } }
        ] }
    ]
  }
}</code></pre>
      <p>Each node supplies the matching <code>context</code> the layout binds against — <code>$objective</code>, <code>$meta</code>, <code>$modules</code>, <code>$states</code>:</p>
      <pre><code>"type": "step",
"context": {
  "objective": "Hiring manager defines the role, level, target start date, and gets sign-off on headcount.",
  "meta": [
    { "label": "Entity", "value": "Job requisition · Job description · Comp band" },
    { "label": "Actors", "value": "HM drafts → Recruiter reviews → Approver signs off" }
  ],
  "states": [
    { "label": "Today", "mode": "manual", "narrative": "HM writes the JD from scratch...",
      "tools": ["Google Docs", "Comp spreadsheet", "Email"] }
  ]
}</code></pre>
      <p><a href="../#hiring-pipeline">Open in viewer →</a></p>

      <h3>Hiring pipeline (YAML)</h3>
      <p>The same map authored in YAML — terser, and a good template for hand-editing. Localized strings become nested maps and node fields read inline:</p>
      <pre><code>nodes:
  - id: openReq
    lane: hm
    phase: sourcing
    col: 0
    title:
      en: Open requisition
      pt: Abrir requisição
      es: Abrir requisición
    objective: Hiring manager defines the role, level, and gets sign-off on headcount.
    states:
      today:
        mode: manual
        tools:
          - Google Docs
          - Comp spreadsheet</code></pre>
      <p><a href="../#hiring-pipeline-yaml">Open in viewer →</a></p>

      <h3>Multi-language</h3>
      <p>A 6-node customer-support-triage map, fully translated EN/PT/ES, with a top-level <code>meta.context</code> label. Demonstrates localized <code>title</code>/<code>subtitle</code>/<code>context</code> objects driving the language switcher.</p>
      <pre><code>"meta": {
  "title":    { "en": "Customer Support Triage", "pt": "Triagem de Suporte ao Cliente", "es": "Triaje de Soporte al Cliente" },
  "subtitle": { "en": "from ticket to resolution", "pt": "do ticket à resolução", "es": "del ticket a la resolución" },
  "context":  { "en": "support · multi-language demo", "pt": "suporte · demo multi-idioma", "es": "soporte · demo multi-idioma" },
  "default_lang": "en"
}</code></pre>
      <p><a href="../#multi-language">Open in viewer →</a></p>

      <h3>With shared modules</h3>
      <p>Same hiring pipeline, but modules are pulled from a shared catalog via <code>meta.modules_source</code> and referenced by id from each node's <code>context.modules</code>. Useful when many nodes share the same feature inventory.</p>
      <pre><code>"meta": {
  "modules_source": "./modules.json",
  ...
}
...
"context": {
  "modules": [
    { "feature": "outreach:templates", "id": "outreach:templates", "levels": [] },
    { "feature": "ats:duplicate-detection", "id": "ats:duplicate-detection", "levels": [] }
  ],
  "modulesSub": "features that make this step work"
}</code></pre>
      <p>The catalog (<code>modules.json</code>) keys each module by id, with localized names and <code>today</code>/<code>tomorrow</code> levels:</p>
      <pre><code>"modules": {
  "ats:resume-parser": {
    "name": { "en": "Resume parser", "pt": "Parser de currículo", "es": "Parser de CV" },
    "today": "automated",
    "tomorrow": "ai",
    "tags": [{ "en": "★ Tablestakes", "pt": "★ Básico", "es": "★ Básico" }]
  }
}</code></pre>
      <p><a href="../#hiring-pipeline-modules">Open in viewer →</a></p>

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
