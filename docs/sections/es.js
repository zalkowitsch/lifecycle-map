/* lifecycle-map · docs/sections/es.js · Spanish content */
(function () {
  'use strict';
  window.LifecycleDocs = window.LifecycleDocs || {};
  window.LifecycleDocs.es = [
    { id: 'what', label: '¿Qué es?', render: () => `
      <h1>lifecycle-map <em>— docs</em></h1>
      <p class="lead">Un viewer single-file para mapas de lifecycle en swim-lane. Renderiza cualquier proceso — contratación, facturación, soporte, onboarding — desde JSON o YAML. Sin build, sin servidor, sin instalación.</p>

      <h2>Qué hace</h2>
      <ul>
        <li><strong>¿Quién actúa?</strong> — lanes</li>
        <li><strong>¿Cuándo?</strong> — phases</li>
        <li><strong>¿Qué ocurre?</strong> — nodes</li>
        <li><strong>¿Qué dispara qué?</strong> — edges</li>
      </ul>
      <p>Cada paso puede describir un estado <strong>hoy vs. mañana</strong>. Útil para roadmaps de transformación.</p>

      <h2>Resumen de features</h2>
      <ul>
        <li>JSON o YAML — mismo schema</li>
        <li>Strings multi-idioma inline (<code>{ en, pt, es, ... }</code>)</li>
        <li>4 temas × modos claro/oscuro</li>
        <li>Carga por drag-and-drop</li>
        <li>5 estrategias de compartir</li>
        <li>Caminata por teclado (<kbd>←</kbd>/<kbd>→</kbd>)</li>
        <li>URLs por slug (<code>#hiring-pipeline</code>)</li>
      </ul>
    ` },

    { id: 'quickstart', label: 'Inicio rápido', render: () => `
      <h2>Inicio rápido</h2>

      <h3>1. Ejemplos pre-cargados</h3>
      <pre><code>https://zalkowitsch.github.io/lifecycle-map/#hiring-pipeline
https://zalkowitsch.github.io/lifecycle-map/#multi-language</code></pre>

      <h3>2. Cargar por URL</h3>
      <pre><code>?src=https://gist.githubusercontent.com/.../raw/foo.json</code></pre>

      <h3>3. Embebido en URL</h3>
      <pre><code>#data=&lt;base64-gzipped-json&gt;</code></pre>

      <h3>4. Drag and drop</h3>
      <p>Arrastra un archivo <code>.json</code> o <code>.yaml</code>.</p>

      <h3>5. Pegar</h3>
      <pre><code>?paste</code></pre>

      <h3>Entrada mínima válida</h3>
      <pre><code>{
  "lanes":  [{ "id": "u", "label": "User" }, { "id": "s", "label": "System" }],
  "phases": [{ "id": "in", "label": "In" }, { "id": "out", "label": "Out" }],
  "nodes":  [
    { "id": "ask",   "lane": "u", "phase": "in",  "title": "Ask" },
    { "id": "reply", "lane": "s", "phase": "out", "title": "Reply" }
  ],
  "edges":  [{ "from": "ask", "to": "reply" }]
}</code></pre>
    ` },

    { id: 'loading', label: 'Cargando datos', render: () => `
      <h2>Cargando datos</h2>
      <p>Cinco formas. Prioridad: <code>?src</code> &gt; <code>#data=</code> &gt; <code>?img=</code> &gt; <code>#&lt;slug&gt;</code> &gt; <code>?paste</code> &gt; splash. Drag-and-drop funciona en cualquier momento.</p>

      <h3><code>?src</code></h3>
      <pre><code>?src=https://...../map.yaml</code></pre>
      <p>La URL debe permitir CORS.</p>

      <h3><code>#data=</code></h3>
      <pre><code>echo '...' | gzip -9 | base64 | tr -d '\\n' | tr '+/' '-_' | tr -d '='</code></pre>

      <h3><code>#&lt;slug&gt;</code></h3>
      <p>Slugs conocidos: <code>#hiring-pipeline</code>, <code>#multi-language</code>, <code>#minimal</code>, <code>#hiring-pipeline-yaml</code>, <code>#hiring-pipeline-modules</code>.</p>

      <h3><code>?img=</code> / <code>#img=</code></h3>
      <p>Imagen cifrada descifrada del lado del cliente. Ver <a href="?lang=es#share">Share → Imagen cifrada</a>.</p>

      <h3><code>?paste</code></h3>
      <p>Abre un textarea.</p>

      <h3>Drag and drop</h3>
      <p>Arrastra un archivo. Nada se sube.</p>
    ` },

    { id: 'structure', label: 'Estructura', render: () => `
      <h2>Estructura</h2>
      <pre><code>{
  "meta":    { "title": "...", "modes": [...], "default_lang": "en" },
  "lanes":   [ ... ],
  "phases":  [ ... ],
  "nodes":   [ ... ],
  "edges":   [ ... ],
  "modules": { /* catálogo opcional */ }
}</code></pre>

      <h3>meta</h3>
      <ul>
        <li><code>title</code>, <code>subtitle</code>, <code>context</code></li>
        <li><code>modes</code> — taxonomía de ownership</li>
        <li><code>default_lang</code> — idioma inicial</li>
      </ul>

      <h3>lanes</h3>
      <pre><code>[
  { "id": "biller",   "label": "Biller",   "sub": "8h/día" }
]</code></pre>

      <h3>phases</h3>
      <pre><code>[
  { "id": "intake", "label": "Entrada", "roman": "I", "subCols": 1 }
]</code></pre>

      <h3>nodes</h3>
      <p>Requerido: <code>id</code>, <code>lane</code>, <code>phase</code>, <code>title</code>. Opcional: <code>sub</code>, <code>objective</code>, <code>entity</code>, <code>actors</code>, <code>triggers</code>, <code>next</code>, <code>today</code>, <code>tomorrow</code>, <code>modules</code>.</p>

      <h3>edges</h3>
      <pre><code>[
  { "from": "a", "to": "b" }
]</code></pre>
    ` },

    { id: 'modes', label: 'Modes', render: () => `
      <h2>Modes &amp; colores</h2>

      <h3>Declarando explícitamente</h3>
      <pre><code>"modes": [
  { "id": "manual",    "label": "Manual",    "color": "#b91c1c" },
  { "id": "automated", "label": "Automatizado", "color": "#1e40af" }
]</code></pre>

      <h3>Modes por defecto</h3>
      <p>Si <code>meta.modes</code> se omite, se usan 6 defaults.</p>

      <h3>Colores auto-generados</h3>
      <p>Si un node referencia un mode ID que no está en <code>meta.modes</code>, el viewer auto-genera un color distinto vía golden-ratio en HSL:</p>
      <pre><code>"today":    { "mode": "Totalmente self-serve" },
"tomorrow": { "mode": "Con IA + revisión humana" }</code></pre>

      <h3>Labels localizadas</h3>
      <pre><code>{
  "id": "ai",
  "label": { "en": "AI-Augmented", "pt": "Com IA", "es": "Con IA" }
}</code></pre>
    ` },

    { id: 'multilang', label: 'Multi-idioma', render: () => `
      <h2>Multi-idioma</h2>
      <p>Cualquier string puede ser texto plano <strong>o</strong> un objeto con claves por idioma.</p>

      <pre><code>{
  "lanes": [
    { "id": "u", "label": { "en": "User", "pt": "Usuário", "es": "Usuario" } }
  ]
}</code></pre>

      <h3>Idioma por defecto</h3>
      <ol>
        <li>Última selección en localStorage</li>
        <li><code>meta.default_lang</code></li>
        <li>Primer idioma alfabéticamente</li>
      </ol>

      <h3>Fallbacks</h3>
      <p>Si falta el idioma actual, recurre a <code>en</code>, luego a la primera clave disponible.</p>

      <p>Ver <a href="../?src=../examples/multi-language.json">el ejemplo multi-idioma</a>.</p>
    ` },

    { id: 'yaml', label: 'JSON o YAML', render: () => `
      <h2>JSON o YAML</h2>
      <p>Ambos aceptados con el mismo schema.</p>

      <pre><code>lanes:
  - { id: u, label: User }
phases:
  - { id: in, label: Intake }
nodes:
  - { id: ask, lane: u, phase: in, title: Ask }</code></pre>

      <h3>Multi-idioma en YAML</h3>
      <pre><code>label: { en: User, pt: Usuário, es: Usuario }</code></pre>
    ` },

    { id: 'external', label: 'Refs externas', render: () => `
      <h2>Referencias externas</h2>
      <p>Los modules pueden ser inline o desde un catálogo compartido.</p>

      <pre><code>{
  "modules": {
    "shared:bulk-edit": { "name": "Bulk edit", "today": "manual", "tomorrow": "automated" }
  },
  "nodes": [{ "modules": ["shared:bulk-edit"] }]
}</code></pre>
    ` },

    { id: 'themes', label: 'Temas', render: () => `
      <h2>Temas</h2>
      <p>Cuatro temas integrados, cada uno con modo claro y oscuro.</p>

      <h3>Temas</h3>
      <ul>
        <li><strong>Paper</strong> — esquema editorial</li>
        <li><strong>Mono</strong> — terminal brutalista</li>
        <li><strong>Mid-Century</strong> — poster Wes Anderson</li>
        <li><strong>Blueprint</strong> — dibujo técnico</li>
      </ul>

      <h3>URL overrides</h3>
      <pre><code>?theme=blueprint&amp;mode=dark</code></pre>

      <h3>Preview</h3>
      <ul>
        <li><a href="../?theme=paper&amp;mode=light#hiring-pipeline">Paper · claro</a></li>
        <li><a href="../?theme=mono&amp;mode=dark#hiring-pipeline">Mono · oscuro</a></li>
        <li><a href="../?theme=midcentury&amp;mode=light#hiring-pipeline">Mid-Century · claro</a></li>
        <li><a href="../?theme=blueprint&amp;mode=dark#hiring-pipeline">Blueprint · oscuro</a></li>
      </ul>
    ` },

    { id: 'share', label: 'Share', render: () => `
      <h2>Share</h2>
      <p>Clic en el icono de share en el header. Cinco estrategias, todas client-side.</p>

      <div class="callout">
        Toda opción salvo la primera usa un servicio de terceros. Sin garantías de privacidad o uptime. Tú eres responsable del contenido que compartes.
      </div>

      <h3>1. Descargar JSON</h3>
      <p>Guarda como archivo local. Sin upload.</p>

      <h3>2. URL embebida</h3>
      <p>Gzip + base64url en el fragment. Nada se sube.</p>

      <h3>3. catbox.moe</h3>
      <p>Upload anónimo, permanente.</p>

      <h3>4. 0x0.st</h3>
      <p>Upload anónimo, URL corta, expira.</p>

      <h3>5. Imagen cifrada</h3>
      <ol>
        <li>JSON gzipped, AES-GCM (PBKDF2-SHA256 200k iter)</li>
        <li>Ciphertext escondido en PNG (LSB)</li>
        <li>PNG sube a catbox — host solo ve imagen</li>
        <li>Destinatario abre <code>#img=&lt;url&gt;</code>, introduce password</li>
      </ol>
    ` },

    { id: 'navigation', label: 'Navegar', render: () => `
      <h2>Navegando el mapa</h2>

      <h3>Pan + scroll</h3>
      <ul>
        <li>Arrastra área vacía del canvas</li>
        <li>Trackpad / wheel para scroll</li>
      </ul>

      <h3>Caminata por teclado</h3>
      <p><kbd>→</kbd> avanza al siguiente paso, <kbd>←</kbd> retrocede.</p>

      <h3>Click en node</h3>
      <p>Abre drawer con detalles.</p>

      <h3>Click en edge</h3>
      <p>Abre drawer de la conexión.</p>

      <h3>Cerrar</h3>
      <p>Click scrim, <kbd>Esc</kbd>, o ×.</p>
    ` },

    { id: 'agents', label: 'Con agentes IA', render: () => `
      <h2>Con agentes IA</h2>
      <p>Un agente puede generar un map y entregar una URL renderizada de una sola vez.</p>

      <pre><code>JSON='{"lanes":[...]}'
ENCODED=$(echo "$JSON" | gzip -9 | base64 | tr -d '\\n' | tr '+/' '-_' | tr -d '=')
echo "https://zalkowitsch.github.io/lifecycle-map/#data=$ENCODED"</code></pre>
    ` },

    { id: 'examples', label: 'Ejemplos', render: () => `
      <h2>Ejemplos</h2>
      <ul>
        <li><a href="../#minimal">Mínimo</a></li>
        <li><a href="../#hiring-pipeline">Pipeline de contratación</a></li>
        <li><a href="../#hiring-pipeline-yaml">Pipeline (YAML)</a></li>
        <li><a href="../#multi-language">Multi-idioma</a></li>
        <li><a href="../#hiring-pipeline-modules">Con módulos compartidos</a></li>
      </ul>

      <h3>Links por tema</h3>
      <ul>
        <li><a href="../?theme=mono&amp;mode=dark#hiring-pipeline">Pipeline en mono dark</a></li>
        <li><a href="../?theme=blueprint&amp;mode=dark#hiring-pipeline">Pipeline en blueprint dark</a></li>
      </ul>
    ` },

    { id: 'faq', label: 'FAQ', render: () => `
      <h2>FAQ</h2>

      <h3>¿Puedo embeber esto en mi sitio?</h3>
      <p>Sí — clona el repo, hospeda <code>index.html</code> + <code>viewer.js</code> + <code>share.js</code> + <code>themes.css</code>.</p>

      <h3>¿Funciona offline?</h3>
      <p>El viewer necesita fuentes y parser YAML vía CDN en el primer load. Después la página queda cacheada.</p>

      <h3>¿Por qué los puntos de mode están todos del mismo gris?</h3>
      <p>Probablemente no declaraste <code>meta.modes</code>. El viewer auto-genera colores distintos — actualiza si lo viste en una versión antigua.</p>

      <h3>¿Existe API programática?</h3>
      <p>Sin backend. JS-only. Para embeber usa <code>&lt;iframe&gt;</code> con <code>?src=</code> o <code>#data=</code>.</p>

      <h3>¿Cómo reporto bugs?</h3>
      <p>Abre issue en <a href="https://github.com/zalkowitsch/lifecycle-map/issues">GitHub</a>.</p>

      <h3>¿Licencia?</h3>
      <p>MIT.</p>
    ` },
  ];
})();
