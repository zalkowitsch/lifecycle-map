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

    { id: 'use-cases', label: 'Casos de uso', render: () => `
      <h2>Casos de uso</h2>
      <p>lifecycle-map encaja con cualquier proceso que tenga <strong>actores</strong>, <strong>etapas ordenadas</strong> y <strong>pasos que cargan detalle estructurado</strong>. Las lanes son quién actúa, las phases cuándo, los nodes qué ocurre, los edges qué dispara qué. El drawer del node se construye a partir de <code>type</code> + <code>context</code> contra <code>meta.nodeTypes</code> — así cada paso puede renderizar su propia rúbrica, lista de señales o división hoy/mañana. Abajo: cinco encajes concretos, y dónde es la herramienta equivocada.</p>

      <h3>1 · Loops de entrevista / contratación</h3>
      <p>Un mapa por loop. Cada ronda (screen de recruiter, coding, system design, behavioral, hiring manager) es un node. El <code>context</code> de la ronda contiene la rúbrica: una <code>List</code> de <strong>señales</strong>, cada una renderizada como un <code>Tile</code> con el nombre de la señal, un id y <code>pills</code> de nivel (L1→L4). Por qué encaja: un loop es exactamente una secuencia de pasos que recogen señales, y el drawer hace la rúbrica caminable en vez de enterrada en un doc por entrevistador.</p>
      <ul>
        <li><strong>Lanes</strong> → candidato, entrevistadores, hiring manager, comité.</li>
        <li><strong>Phases</strong> → screen → onsite → debrief → decisión.</li>
        <li><strong>Nodes</strong> → rondas individuales; <code>nodeType</code> "round".</li>
      </ul>
      <pre><code>"round": { "layout": [
  { "type": "Prose", "bind": "$objective" },
  { "type": "KeyValue", "bind": "$meta" },
  { "type": "Section", "title": "Signals", "sub": "$signalsSub",
    "children": [
      { "type": "List", "bind": "$signals",
        "item": { "type": "Tile", "title": "$name", "sub": "$id",
                  "pills": "$levels", "tags": "$tags" } } ] } ] }</code></pre>

      <h3>2 · Pipeline de contratación / flujo ATS</h3>
      <p>Aleja el zoom de un loop al funnel completo: sourcing → screen → phone → onsite → decisión → oferta → onboard. Cada paso tiene un estado <strong>hoy</strong> y <strong>mañana</strong> (manual vs. aumentado con IA) más una <code>List</code> de módulos de soporte. Por qué encaja: mapea los handoffs entre sourcer, recruiter, hiring manager y aprobador que un Kanban plano esconde, y la división hoy/mañana lo convierte además en un roadmap de automatización. Este es el ejemplo <a href="../#hiring-pipeline">hiring-pipeline</a> incluido.</p>
      <ul>
        <li><strong>Lanes</strong> → candidato, sourcer, recruiter, hiring manager, entrevistador, aprobador.</li>
        <li><strong>Phases</strong> → las seis etapas del funnel.</li>
        <li><strong>Nodes</strong> → pasos con <code>states</code> (Tiles Hoy/Mañana) y <code>modules</code>.</li>
      </ul>

      <h3>3 · Soporte al cliente / triaje</h3>
      <p>Del ticket entrante a la resolución: intake → clasificar → enrutar → resolver → seguimiento. Las lanes reparten el trabajo entre el cliente, la capa de bot/auto-triaje, tier-1 y el equipo de escalación. Por qué encaja: el triaje es un problema de enrutamiento con ownership explícito en cada salto — las lanes hacen visible el límite de escalación, y los edges (incluyendo loops hacia atrás para tickets reabiertos) muestran dónde rebota el trabajo. El drawer por node puede cargar objetivos de SLA en un <code>KeyValue</code> y <code>Pills</code> de canal.</p>
      <ul>
        <li><strong>Lanes</strong> → cliente, auto-triaje, tier-1, tier-2 / escalación.</li>
        <li><strong>Phases</strong> → intake → clasificar → enrutar → resolver → seguimiento.</li>
        <li><strong>Nodes</strong> → pasos de atención; edges hacia atrás para reabrir / reenrutar.</li>
      </ul>

      <h3>4 · Onboarding / activación</h3>
      <p>Del signup al primer valor: creación de cuenta → setup → primera acción clave → hábito. Las lanes separan al usuario nuevo de los nudges automatizados del producto y del equipo de CS / onboarding. Por qué encaja: la activación es un funnel por etapas donde cada paso tiene un drop-off y un owner — modelarlo como nodes te deja adjuntar la métrica de activación y la intervención (email, in-app, toque humano) a cada etapa como <code>Pills</code> o una <code>List</code> de módulos. Hoy/mañana captura "hand-holding manual de CS ahora → self-serve después".</p>
      <ul>
        <li><strong>Lanes</strong> → usuario, producto (automatizado), CS / onboarding.</li>
        <li><strong>Phases</strong> → signup → setup → primera acción → activación → hábito.</li>
        <li><strong>Nodes</strong> → hitos con lane owner + intervención.</li>
      </ul>

      <h3>5 · Roadmaps de capacidad / transformación</h3>
      <p>Menos un flujo de quién-hace-qué, más un mapa de dónde-estamos. Las phases son dominios de capacidad; los nodes son capacidades; el modo <strong>hoy</strong> vs. <strong>mañana</strong> de cada node (manual → asistido → automatizado → IA) es el punto central. Por qué encaja: los dos puntos de modo por node dan una lectura de calor instantánea de qué tan lejos está cada capacidad de su estado objetivo, y <code>meta.modes</code> da una leyenda de color consistente en todo el mapa. Usa las lanes para los value streams o equipos que poseen cada capacidad.</p>
      <ul>
        <li><strong>Lanes</strong> → value streams / equipos dueños.</li>
        <li><strong>Phases</strong> → dominios de capacidad.</li>
        <li><strong>Nodes</strong> → capacidades; <code>today.mode</code> / <code>tomorrow.mode</code> cargan el gap.</li>
      </ul>

      <h3>Cuándo NO usarlo</h3>
      <p>Es la herramienta equivocada cuando la estructura no es lanes × phases:</p>
      <ul>
        <li><strong>Diagramas ad-hoc diminutos</strong> — un flowchart de 5 cajas sin actores ni etapas. Usa <a href="https://mermaid.js.org">Mermaid</a>; es un bloque de código y se renderiza inline en cualquier sitio.</li>
        <li><strong>Colaboración libre</strong> — clustering de sticky-notes, brainstorming en vivo, layouts espaciales sin grid fijo. Usa <a href="https://miro.com">Miro</a> o FigJam.</li>
        <li><strong>Organigramas, mapas mentales, grafos de dependencias</strong> — jerarquías y redes arbitrarias, no flujo dirigido lane-a-lane. Usa una herramienta de grafos.</li>
        <li><strong>Dashboards operativos en vivo</strong> — esto renderiza un modelo estático bajo control de versiones, no un feed de estado en tiempo real. Conecta las métricas en otro sitio.</li>
      </ul>
      <p>Regla práctica: si puedes nombrar las <strong>lanes</strong> y las <strong>phases</strong> antes de empezar, encaja. Si no, recurre a Mermaid o Miro.</p>
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

    { id: 'primitives', label: 'Primitivas del drawer', render: () => `
      <h2>Primitivas del drawer</h2>
      <p>El contenido del drawer del node ya no está hardcodeado. Un node declara un <code>type</code>; el layout del type es un árbol de primitivas de UI genéricas con bindings de datos. El node carga sus datos en <code>context</code>. La app renderiza el layout, resolviendo cada binding contra el context del node.</p>

      <h3>Forma del node &amp; meta.nodeTypes</h3>
      <p>Un node referencia <code>meta.nodeTypes[type].layout</code> — un árbol de primitivas — y carga sus datos en <code>context</code>. La posición en la grilla (<code>id</code>, <code>lane</code>, <code>phase</code>, <code>col</code>) queda fuera de <code>context</code>.</p>
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

      <h3>La regla de binding</h3>
      <p>Un valor string que empieza con <code>$</code> es un binding: lee <code>context.&lt;key&gt;</code> — <code>"$rubrics"</code> resuelve a <code>context.rubrics</code>. Un string sin <code>$</code> inicial es un literal, renderizado tal cual.</p>
      <p>Dentro de una <code>List</code>, la primitiva <code>item</code> recibe cada elemento del array como su context <strong>local</strong>. Así que <code>Tile.title: "$name"</code> lee <code>item.name</code>, no el context a nivel de node.</p>
      <p>Cada binding es opcional al renderizar. Un binding que resuelve a <code>undefined</code> / ausente hace que esa primitiva (o esa prop) se omita — sin crash, sin placeholder.</p>

      <h3>Las 10 primitivas</h3>
      <p>Cada <code>type</code> selecciona un componente fijo provisto por la app. Los campos de abajo son los nombres exactos de las props.</p>

      <h4>Section</h4>
      <p>Un grupo con título. <code>title</code> y <code>sub</code> son str-o-binding; <code>children</code> es un array de primitivas. Las filas de encabezado se omiten cuando están vacías.</p>
      <pre><code>{ "type": "Section", "title": "Rubrics", "sub": "$rubricsSub", "children": [ ... ] }</code></pre>

      <h4>KeyValue</h4>
      <p><code>bind</code> resuelve a un array de filas <code>{ label, value }</code>. Se omite si no es un array o está vacío.</p>
      <pre><code>{ "type": "KeyValue", "bind": "$meta" }</code></pre>

      <h4>List</h4>
      <p><code>bind</code> resuelve a un array; <code>item</code> se renderiza una vez por elemento, cada elemento pasado como el context local del item. Se omite si está vacío o no hay <code>item</code>.</p>
      <pre><code>{ "type": "List", "bind": "$rubrics", "item": { "type": "Tile", "title": "$name" } }</code></pre>

      <h4>Tile</h4>
      <p>Una tarjeta con <code>title</code>, <code>sub</code> opcional y dos filas de pills: <code>pills</code> y <code>tags</code> (cada una un binding a un array). Se omite por completo si <code>title</code> resuelve vacío.</p>
      <pre><code>{ "type": "Tile", "title": "$name", "sub": "$id", "pills": "$levels", "tags": "$tags" }</code></pre>

      <h4>Pills</h4>
      <p><code>bind</code> resuelve a un array de strings o de objetos <code>{ label, color? }</code>. El <code>color</code> por pill tiñe el label. Se omite si el array está vacío o ausente.</p>
      <pre><code>{ "type": "Pills", "bind": "$levels" }</code></pre>

      <h4>Prose</h4>
      <p>Un párrafo. <code>bind</code> resuelve a texto. El HTML se sanitiza a un allowlist de <code>&lt;em&gt;</code>, <code>&lt;strong&gt;</code>, <code>&lt;br&gt;</code> solamente — scripts, atributos y cualquier otra etiqueta se eliminan. Se omite si está vacío.</p>
      <pre><code>{ "type": "Prose", "bind": "$objective" }</code></pre>

      <h4>Title</h4>
      <p>Un encabezado. <code>text</code> es str-o-binding; <code>variant</code> es <code>h1</code>, <code>h2</code> (default) o <code>eyebrow</code>. Se omite si está vacío.</p>
      <pre><code>{ "type": "Title", "text": "How We Interview", "variant": "h1" }</code></pre>

      <h4>Text</h4>
      <p>Una corrida de texto inline. <code>text</code> es str-o-binding; <code>variant</code> es <code>body</code> (default), <code>caption</code> o <code>mono</code>. Se omite si está vacío.</p>
      <pre><code>{ "type": "Text", "text": "$duration", "variant": "caption" }</code></pre>

      <h4>Button</h4>
      <p>Un botón. <code>text</code> es el label; <code>action</code> es <code>navigate</code> (default) o <code>copy</code>; <code>target</code> es un binding pasado al handler de la acción. Se omite si el label está vacío.</p>
      <pre><code>{ "type": "Button", "text": "Open spec", "action": "navigate", "target": "$specUrl" }</code></pre>

      <h4>Link</h4>
      <p>Un enlace externo. <code>text</code> es el label; <code>href</code> es un binding. Solo se permiten hrefs <code>http</code> / <code>https</code> — <code>javascript:</code>, <code>data:</code> y otros esquemas se rechazan y el link se omite a sí mismo.</p>
      <pre><code>{ "type": "Link", "text": "Docs", "href": "$docsUrl" }</code></pre>

      <p>Los objetos localizados (<code>{ en, pt, es, ... }</code>) funcionan en cualquier lugar donde una primitiva renderice texto — las mismas reglas que el resto del documento (ver <a href="?lang=es#multilang">Multi-idioma</a>).</p>
    ` },

    { id: 'customization', label: 'Personalización', render: () => `
      <h2>Personalización</h2>
      <p>Este es el corazón del modelo data-driven: <strong>tú</strong> decides qué muestra el drawer de un node. El drawer ya no está hardcodeado — no hay un layout fijo de Objective / Modules / States. En su lugar, escribes tu propio <code>nodeType</code> a partir de las 10 <a href="?lang=es#primitives">primitivas del drawer</a>, y cada node de ese type lo rellena con datos. Diseña el layout una vez, reúsalo en todo el mapa.</p>

      <h3>El modelo mental</h3>
      <p>Dos mitades, separadas a propósito:</p>
      <ul>
        <li><strong>El type define el layout.</strong> <code>meta.nodeTypes.&lt;type&gt;.layout</code> es un árbol de primitivas — la forma del drawer. Dice <em>qué</em> secciones existen y <em>dónde</em> aterriza cada pieza de datos, pero no contiene datos.</li>
        <li><strong>El node pasa el context.</strong> Cada node fija <code>type</code> para elegir un layout y carga sus propios datos en <code>context</code>. La app recorre el layout y resuelve cada binding contra el context de ese node.</li>
      </ul>
      <p>Así que un layout, muchos nodes: cambia el layout una vez y cada node de ese type se re-renderiza de la nueva forma; cambia el context de un node y solo cambia ese drawer.</p>

      <h3>Un ejemplo completo trabajado</h3>
      <p>Define un type personalizado <code>service</code> con cuatro primitivas apiladas de arriba a abajo: un intro <code>Prose</code>, una tabla de hechos <code>KeyValue</code> y un <code>Section</code> que envuelve una <code>List</code> que renderiza un <code>Tile</code> por elemento.</p>
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
      <p>Ahora un node que selecciona ese type y lo rellena. La posición en la grilla (<code>id</code>, <code>lane</code>, <code>phase</code>, <code>col</code>) queda <strong>fuera</strong> de <code>context</code>; todo lo que el layout bindea vive <strong>dentro</strong> de él.</p>
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
      <p>Lo que se renderiza, de arriba a abajo: un párrafo sanitizado (el <code>&lt;strong&gt;</code> sobrevive, cualquier otra cosa se eliminaría); una tabla label/value de dos filas; un encabezado <strong>Dependencies</strong> con la sub-línea "upstream services this calls"; luego dos tiles — "Ledger / payments-team" con una pill <code>healthy</code>, y "Tax engine / vendor" con una pill <code>degraded</code>.</p>

      <h3>Reglas de binding a tener presentes</h3>
      <ul>
        <li><strong><code>$key</code> vs literal.</strong> Un string que empieza con <code>$</code> lee del context: <code>"$deps"</code> → <code>context.deps</code>. Un string sin <code>$</code> es un literal, renderizado tal cual — por eso <code>"title": "Dependencies"</code> imprime la palabra, mientras <code>"bind": "$deps"</code> busca datos.</li>
        <li><strong>Context local del item de List.</strong> Dentro de una <code>List</code>, cada elemento del array se vuelve el context <em>local</em> de la primitiva <code>item</code>. Así que <code>Tile.title: "$name"</code> lee <code>element.name</code> — no el context a nivel de node. El <code>item</code> no puede ver <code>$summary</code> de arriba; solo ve su propio elemento.</li>
        <li><strong>Ausente → omitir.</strong> Cada binding es opcional. Un binding que resuelve a <code>undefined</code> / ausente hace que esa primitiva (o esa prop) desaparezca — sin crash, sin placeholder. Deja <code>owner</code> fuera de una dependencia y solo ese tile pierde su sub-línea; el resto se renderiza normal.</li>
      </ul>

      <h3>Componiendo un drawer estilo rúbrica</h3>
      <p>La misma columna Section &gt; List &gt; Tile te da un scorecard. Pon el <strong>nombre</strong> de la rúbrica como el <code>title</code> del Tile, los <strong>niveles</strong> de madurez como <code>pills</code>, y los <strong>tags</strong> de categoría como una segunda fila de pills. Un <code>Tile</code> tiene dos filas de pills independientes — <code>pills</code> y <code>tags</code> — cada una un binding a un array de strings o de objetos <code>{ label, color? }</code>.</p>
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
      <p>Cada elemento de <code>rubrics</code> se vuelve un tile: su <code>name</code> es el título, <code>id</code> la sub-línea, <code>levels</code> la fila superior de pills, <code>tags</code> la segunda. Agrega un <code>color</code> a un objeto de nivel (<code>{ "label": "L4", "color": "#047857" }</code>) para teñir esa pill.</p>

      <h3>Reutilizando un nodeType en muchos nodes</h3>
      <p>Un type se define una vez y es referenciado por cualquier número de nodes. Cada node con <code>"type": "service"</code> toma del mismo <code>meta.nodeTypes.service.layout</code> — solo difieren en <code>context</code>. Este es el beneficio: docenas de nodes comparten un diseño de drawer, y editar el layout los actualiza todos a la vez. También puedes definir varios types (<code>service</code>, <code>round</code>, <code>handoff</code>, …) en el mismo mapa y dejar que cada node elija el que encaje.</p>
      <p>Si una key del layout no resuelve a nada para un node dado, esa parte simplemente se omite — así un solo type compartido puede servir tanto a nodes ricos como escasos sin layouts por node. Un node que no tiene <code>deps</code> simplemente no renderiza la sección Dependencies.</p>

      <h3>Layout vs. tema</h3>
      <p>Personalizar un <code>nodeType</code> cambia <strong>qué contenido</strong> muestra el drawer. No toca el <strong>estilo visual</strong> — fuentes, colores, claro/oscuro. Eso viene del tema visual, cambiado en Settings o vía <code>?theme=&amp;mode=</code> en la URL. Los dos son independientes: cualquier layout se renderiza correctamente bajo cualquier tema. Ver <a href="?lang=es#themes">Temas</a> para los temas integrados y el modo oscuro, y <a href="?lang=es#primitives">Primitivas del drawer</a> para los nombres exactos de las props de las 10 primitivas.</p>
    ` },

    { id: 'api', label: 'Referencia de API', render: () => `
      <h1>Referencia de API <em>— el modelo de datos</em></h1>
      <p class="lead">Un mapa de lifecycle es un documento JSON (o YAML). Este es el contrato completo: cada key de nivel superior, el motor de layout de node-type, las 10 primitivas del drawer y la gramática de binding que conecta los datos del node con los drawers renderizados.</p>

      <h2>Forma del documento</h2>
      <p>Un objeto. Solo <code>lanes</code>, <code>phases</code> y <code>nodes</code> son estructuralmente requeridos para renderizar; el resto agrega labels, drawers y flujo.</p>
      <table>
        <thead><tr><th>Key</th><th>Tipo</th><th>¿Req?</th><th>Propósito</th></tr></thead>
        <tbody>
          <tr><td><code>meta</code></td><td>object</td><td>—</td><td>Título, subtítulo, idioma por defecto, modes y el registro de drawers <code>nodeTypes</code>.</td></tr>
          <tr><td><code>lanes</code></td><td>array</td><td>sí</td><td>Filas — los actores / roles / sistemas.</td></tr>
          <tr><td><code>phases</code></td><td>array</td><td>sí</td><td>Columnas — las etapas secuenciales.</td></tr>
          <tr><td><code>nodes</code></td><td>array</td><td>sí</td><td>Pasos colocados en una celda lane × phase.</td></tr>
          <tr><td><code>edges</code></td><td>array</td><td>—</td><td>Flujo dirigido entre nodes.</td></tr>
          <tr><td><code>modules</code></td><td>object</td><td>—</td><td>Catálogo de capacidades de nivel superior opcional (ver <code>meta.modules_source</code>).</td></tr>
        </tbody>
      </table>
      <p>Los strings mostrados abajo como <code>LStr</code> son <strong>strings localizados</strong>: o un string plano, o un objeto <code>{ en, pt, es, ... }</code> (ver <a href="#api">Strings localizados</a> al final).</p>

      <h2><code>meta</code></h2>
      <table>
        <thead><tr><th>Campo</th><th>Tipo</th><th>¿Req?</th><th>Significado</th></tr></thead>
        <tbody>
          <tr><td><code>title</code></td><td>LStr</td><td>—</td><td>Título del mapa, mostrado en el header.</td></tr>
          <tr><td><code>subtitle</code></td><td>LStr</td><td>—</td><td>Sub-línea bajo el título.</td></tr>
          <tr><td><code>context</code></td><td>LStr</td><td>—</td><td>Texto libre que enmarca el mapa completo.</td></tr>
          <tr><td><code>default_lang</code></td><td>string</td><td>—</td><td>Key de idioma elegida primero, p. ej. <code>"en"</code>.</td></tr>
          <tr><td><code>modes</code></td><td>array</td><td>—</td><td>Entradas de leyenda: cada <code>{ id, label: LStr, color }</code>. Referenciadas por valores de estado / pill del node.</td></tr>
          <tr><td><code>nodeTypes</code></td><td>object</td><td>—</td><td>Mapa de <code>typeName → { layout: [...] }</code>. El motor de drawers. Ver abajo.</td></tr>
          <tr><td><code>modules_source</code></td><td>string</td><td>—</td><td>Puntero a de dónde viene el catálogo <code>modules</code> de nivel superior.</td></tr>
        </tbody>
      </table>

      <h2><code>lanes</code></h2>
      <table>
        <thead><tr><th>Campo</th><th>Tipo</th><th>¿Req?</th><th>Significado</th></tr></thead>
        <tbody>
          <tr><td><code>id</code></td><td>string</td><td>sí</td><td>Único. Referenciado por <code>node.lane</code>.</td></tr>
          <tr><td><code>label</code></td><td>LStr</td><td>sí</td><td>Label de la fila.</td></tr>
          <tr><td><code>sub</code></td><td>LStr</td><td>—</td><td>Línea secundaria bajo el label de la lane.</td></tr>
        </tbody>
      </table>

      <h2><code>phases</code></h2>
      <table>
        <thead><tr><th>Campo</th><th>Tipo</th><th>¿Req?</th><th>Significado</th></tr></thead>
        <tbody>
          <tr><td><code>id</code></td><td>string</td><td>sí</td><td>Único. Referenciado por <code>node.phase</code>.</td></tr>
          <tr><td><code>label</code></td><td>LStr</td><td>sí</td><td>Label de la columna.</td></tr>
          <tr><td><code>roman</code></td><td>string</td><td>—</td><td>Ordinal de display, p. ej. <code>"III"</code>.</td></tr>
          <tr><td><code>subCols</code></td><td>number</td><td>—</td><td>Cuántas sub-columnas abarca la phase (el <code>col</code> del node indexa en estas).</td></tr>
        </tbody>
      </table>

      <h2><code>nodes</code></h2>
      <table>
        <thead><tr><th>Campo</th><th>Tipo</th><th>¿Req?</th><th>Significado</th></tr></thead>
        <tbody>
          <tr><td><code>id</code></td><td>string</td><td>sí</td><td>Único. Referenciado por edges.</td></tr>
          <tr><td><code>lane</code></td><td>string</td><td>sí</td><td>Un <code>lanes[].id</code>.</td></tr>
          <tr><td><code>phase</code></td><td>string</td><td>sí</td><td>Un <code>phases[].id</code>.</td></tr>
          <tr><td><code>col</code></td><td>number</td><td>—</td><td>Sub-columna base-0 dentro de la phase. Default <code>0</code>.</td></tr>
          <tr><td><code>title</code></td><td>LStr</td><td>sí</td><td>Título de la tarjeta del node.</td></tr>
          <tr><td><code>sub</code></td><td>LStr</td><td>—</td><td>Línea secundaria en la tarjeta.</td></tr>
          <tr><td><code>type</code></td><td>string</td><td>—</td><td>Selecciona <code>meta.nodeTypes[type]</code> para el drawer. Sin <code>type</code> → sin cuerpo de drawer.</td></tr>
          <tr><td><code>context</code></td><td>object</td><td>—</td><td>Los datos contra los que bindea el layout. Forma libre; las keys son referenciadas por bindings <code>$key</code>.</td></tr>
        </tbody>
      </table>

      <h2><code>edges</code></h2>
      <p>Enlaces dirigidos. Ambas convenciones de nombres se aceptan — usa una consistentemente y revisa el ejemplo que estás copiando.</p>
      <table>
        <thead><tr><th>Campo</th><th>Tipo</th><th>¿Req?</th><th>Significado</th></tr></thead>
        <tbody>
          <tr><td><code>source</code> / <code>from</code></td><td>string</td><td>sí</td><td>Origen <code>node.id</code>.</td></tr>
          <tr><td><code>target</code> / <code>to</code></td><td>string</td><td>sí</td><td>Destino <code>node.id</code>.</td></tr>
        </tbody>
      </table>

      <h2>Node types &amp; el motor de layout</h2>
      <p>El drawer de un node no está hardcodeado. Se computa: el <code>type</code> del node selecciona una entrada en <code>meta.nodeTypes</code>, cuyo <code>layout</code> es un array de <strong>primitivas</strong> que el drawer recorre de arriba a abajo. Cada primitiva resuelve sus bindings contra el <code>context</code> del node y se renderiza a sí misma.</p>
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
      <p>Un node con <code>"type": "step"</code> renderiza ese layout contra su propio <code>context</code>. Dos nodes que comparten un type comparten un layout pero proveen context distinto. Un <code>type</code> sin entrada coincidente en <code>nodeTypes</code>, o un node sin <code>type</code>, no renderiza cuerpo.</p>

      <h2>Catálogo de primitivas</h2>
      <p>Diez primitivas. Cada primitiva carga <code>type</code> (su nombre). Las props que terminan en un binding (<code>$key</code>) leen del context local; los strings literales se renderizan tal cual. Un binding que resuelve a <code>undefined</code> hace que esa primitiva — o esa sola prop — se omita.</p>

      <h3>Prose</h3>
      <p>Un bloque de párrafo. La entrada se sanitiza a un allowlist (<code>em</code>, <code>strong</code>, <code>br</code> solamente); todo lo demás se elimina.</p>
      <table>
        <thead><tr><th>Campo</th><th>Tipo</th><th>¿Req?</th><th>Significado</th></tr></thead>
        <tbody>
          <tr><td><code>type</code></td><td><code>"Prose"</code></td><td>sí</td><td>—</td></tr>
          <tr><td><code>bind</code></td><td>binding</td><td>sí</td><td>Resuelve al texto (sanitizado).</td></tr>
        </tbody>
      </table>
      <pre><code>{ "type": "Prose", "bind": "$objective" }</code></pre>

      <h3>KeyValue</h3>
      <p>Una lista label/value.</p>
      <table>
        <thead><tr><th>Campo</th><th>Tipo</th><th>¿Req?</th><th>Significado</th></tr></thead>
        <tbody>
          <tr><td><code>type</code></td><td><code>"KeyValue"</code></td><td>sí</td><td>—</td></tr>
          <tr><td><code>bind</code></td><td>binding</td><td>sí</td><td>Resuelve a un array de filas <code>{ label, value }</code>.</td></tr>
        </tbody>
      </table>
      <pre><code>{ "type": "KeyValue", "bind": "$meta" }</code></pre>

      <h3>Section</h3>
      <p>Un grupo con título que anida otras primitivas.</p>
      <table>
        <thead><tr><th>Campo</th><th>Tipo</th><th>¿Req?</th><th>Significado</th></tr></thead>
        <tbody>
          <tr><td><code>type</code></td><td><code>"Section"</code></td><td>sí</td><td>—</td></tr>
          <tr><td><code>title</code></td><td>string / binding</td><td>sí</td><td>Encabezado.</td></tr>
          <tr><td><code>sub</code></td><td>string / binding</td><td>—</td><td>Sub-encabezado.</td></tr>
          <tr><td><code>children</code></td><td>primitive[]</td><td>sí</td><td>Primitivas anidadas, recorridas en orden.</td></tr>
        </tbody>
      </table>
      <pre><code>{ "type": "Section", "title": "States", "sub": "$statesSub", "children": [ ... ] }</code></pre>

      <h3>List</h3>
      <p>Repite una primitiva sobre un array. <strong>Cada elemento del array se vuelve el context local</strong> de <code>item</code> — así que dentro de <code>item</code>, <code>$name</code> lee <code>element.name</code>, no el context a nivel de node.</p>
      <table>
        <thead><tr><th>Campo</th><th>Tipo</th><th>¿Req?</th><th>Significado</th></tr></thead>
        <tbody>
          <tr><td><code>type</code></td><td><code>"List"</code></td><td>sí</td><td>—</td></tr>
          <tr><td><code>bind</code></td><td>binding</td><td>sí</td><td>Resuelve al array.</td></tr>
          <tr><td><code>item</code></td><td>primitive</td><td>sí</td><td>Renderizado una vez por elemento, con el elemento como su context.</td></tr>
        </tbody>
      </table>
      <pre><code>{ "type": "List", "bind": "$modules", "item": {
  "type": "Tile", "title": "$feature", "sub": "$id", "pills": "$levels"
} }</code></pre>

      <h3>Tile</h3>
      <p>Una tarjeta compacta, típicamente el <code>item</code> de una List.</p>
      <table>
        <thead><tr><th>Campo</th><th>Tipo</th><th>¿Req?</th><th>Significado</th></tr></thead>
        <tbody>
          <tr><td><code>type</code></td><td><code>"Tile"</code></td><td>sí</td><td>—</td></tr>
          <tr><td><code>title</code></td><td>string / binding</td><td>sí</td><td>Encabezado del tile.</td></tr>
          <tr><td><code>sub</code></td><td>string / binding</td><td>—</td><td>Línea secundaria.</td></tr>
          <tr><td><code>pills</code></td><td>binding</td><td>—</td><td>Array → renderizado como pills (misma forma de valor que Pills).</td></tr>
          <tr><td><code>tags</code></td><td>binding</td><td>—</td><td>Array de strings de tag.</td></tr>
        </tbody>
      </table>
      <pre><code>{ "type": "Tile", "title": "$label", "sub": "$mode", "pills": "$tools" }</code></pre>

      <h3>Pills</h3>
      <p>Una fila de pills. Sin prop variant.</p>
      <table>
        <thead><tr><th>Campo</th><th>Tipo</th><th>¿Req?</th><th>Significado</th></tr></thead>
        <tbody>
          <tr><td><code>type</code></td><td><code>"Pills"</code></td><td>sí</td><td>—</td></tr>
          <tr><td><code>bind</code></td><td>binding</td><td>sí</td><td>Resuelve a un array de strings, o de <code>{ label, color? }</code>.</td></tr>
        </tbody>
      </table>
      <pre><code>{ "type": "Pills", "bind": "$levels" }</code></pre>

      <h3>Title</h3>
      <p>Un encabezado independiente con texto literal.</p>
      <table>
        <thead><tr><th>Campo</th><th>Tipo</th><th>¿Req?</th><th>Significado</th></tr></thead>
        <tbody>
          <tr><td><code>type</code></td><td><code>"Title"</code></td><td>sí</td><td>—</td></tr>
          <tr><td><code>text</code></td><td>string / binding</td><td>sí</td><td>El texto del encabezado.</td></tr>
          <tr><td><code>variant</code></td><td>enum</td><td>—</td><td>Uno de <code>h1</code>, <code>h2</code>, <code>eyebrow</code>.</td></tr>
        </tbody>
      </table>
      <pre><code>{ "type": "Title", "text": "Overview", "variant": "h2" }</code></pre>

      <h3>Text</h3>
      <p>Una línea independiente de texto de cuerpo.</p>
      <table>
        <thead><tr><th>Campo</th><th>Tipo</th><th>¿Req?</th><th>Significado</th></tr></thead>
        <tbody>
          <tr><td><code>type</code></td><td><code>"Text"</code></td><td>sí</td><td>—</td></tr>
          <tr><td><code>text</code></td><td>string / binding</td><td>sí</td><td>El texto.</td></tr>
          <tr><td><code>variant</code></td><td>enum</td><td>—</td><td>Uno de <code>body</code>, <code>caption</code>, <code>mono</code>.</td></tr>
        </tbody>
      </table>
      <pre><code>{ "type": "Text", "text": "$note", "variant": "caption" }</code></pre>

      <h3>Button</h3>
      <p>Un control de acción.</p>
      <table>
        <thead><tr><th>Campo</th><th>Tipo</th><th>¿Req?</th><th>Significado</th></tr></thead>
        <tbody>
          <tr><td><code>type</code></td><td><code>"Button"</code></td><td>sí</td><td>—</td></tr>
          <tr><td><code>text</code></td><td>string / binding</td><td>sí</td><td>Label.</td></tr>
          <tr><td><code>action</code></td><td>enum</td><td>—</td><td><code>navigate</code> o <code>copy</code>.</td></tr>
          <tr><td><code>target</code></td><td>string / binding</td><td>—</td><td>Id del node al que navegar, o texto a copiar.</td></tr>
        </tbody>
      </table>
      <pre><code>{ "type": "Button", "text": "Go to debrief", "action": "navigate", "target": "debrief" }</code></pre>

      <h3>Link</h3>
      <p>Un enlace externo. Los esquemas que no son <code>http</code>/<code>https</code> se rechazan (sin <code>javascript:</code>, <code>data:</code>, etc.).</p>
      <table>
        <thead><tr><th>Campo</th><th>Tipo</th><th>¿Req?</th><th>Significado</th></tr></thead>
        <tbody>
          <tr><td><code>type</code></td><td><code>"Link"</code></td><td>sí</td><td>—</td></tr>
          <tr><td><code>text</code></td><td>string / binding</td><td>sí</td><td>Texto del link.</td></tr>
          <tr><td><code>href</code></td><td>string / binding</td><td>sí</td><td>URL — <code>http</code>/<code>https</code> solamente.</td></tr>
        </tbody>
      </table>
      <pre><code>{ "type": "Link", "text": "Docs", "href": "https://example.com" }</code></pre>

      <h2>Gramática de binding</h2>
      <p>Las reglas que el motor aplica al resolver cualquier valor de prop:</p>
      <ul>
        <li><strong>Prefijo <code>$</code> → binding.</strong> Un string que empieza con <code>$</code> (p. ej. <code>$objective</code>) se busca por key contra el context actual.</li>
        <li><strong>Sin <code>$</code> → literal.</strong> Cualquier otro string se renderiza verbatim (p. ej. <code>"States"</code> como título de Section).</li>
        <li><strong>Context local de List.</strong> Dentro de un <code>List.item</code>, el context actual es el <em>elemento</em> del array, no el node. <code>Tile.title: "$name"</code> lee <code>element.name</code>.</li>
        <li><strong>Undefined omite.</strong> Un binding que resuelve a <code>undefined</code> / ausente causa que esa primitiva (o solo esa prop) desaparezca — sin placeholder vacío.</li>
      </ul>

      <h3>Restricciones de seguridad</h3>
      <ul>
        <li><strong>Prose</strong> sanitiza a un allowlist de <code>em</code>, <code>strong</code>, <code>br</code>. Todas las demás etiquetas/atributos se eliminan.</li>
        <li><strong>Link</strong> acepta solo hrefs <code>http</code> y <code>https</code>; otros esquemas se rechazan.</li>
      </ul>

      <h2>Strings localizados</h2>
      <p>En cualquier lugar donde las tablas de arriba dicen <code>LStr</code>, puedes pasar o un string plano o un objeto por idioma:</p>
      <pre><code>"label": { "en": "Candidate", "pt": "Candidato", "es": "Candidato" }</code></pre>
      <p>El viewer elige <code>meta.default_lang</code> primero, luego recurre a las keys disponibles. Los objetos localizados se honran en <strong>strings de display a nivel de datos</strong> — <code>meta.title</code>/<code>subtitle</code>/<code>context</code>, <code>modes[].label</code>, <code>lanes[].label</code>/<code>sub</code>, <code>phases[].label</code> y <code>nodes[].title</code>/<code>sub</code>. Los valores dentro de <code>node.context</code> son datos planos resueltos por bindings; localízalos dando al valor bindeado la forma <code>{ en, pt, es }</code> donde tu layout lo lee.</p>
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
      <p>Cinco archivos incluidos, cada uno demostrando una combinación de features distinta. Cada snippet de abajo está tomado verbatim del archivo real en <code>examples/</code>.</p>

      <h3>Mínimo</h3>
      <p>El mapa más pequeño posible: dos lanes, dos phases, cuatro nodes, sin contenido de drawer. <code>nodeTypes.step.layout</code> está vacío y cada node carga un <code>context</code> vacío.</p>
      <pre><code>"nodeTypes": { "step": { "layout": [] } }
...
"nodes": [
  { "id": "ask", "lane": "user", "phase": "request",
    "title": { "en": "Ask question", "pt": "Fazer pergunta", "es": "Hacer pregunta" },
    "type": "step", "context": {} }
]</code></pre>
      <p><a href="../#minimal">Abrir en el viewer →</a></p>

      <h3>Pipeline de contratación</h3>
      <p>El mapa de referencia completo: 17 nodes, <code>modes</code> personalizados, títulos localizados y un nodeType <code>step</code> tipado cuyo layout recorre <code>Prose</code> → <code>KeyValue</code> → dos bloques <code>Section</code>/<code>List</code>/<code>Tile</code>. Esta es la forma canónica de <code>nodeTypes</code> tipado + <code>context</code>.</p>
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
      <p>Cada node provee el <code>context</code> coincidente contra el que bindea el layout — <code>$objective</code>, <code>$meta</code>, <code>$modules</code>, <code>$states</code>:</p>
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
      <p><a href="../#hiring-pipeline">Abrir en el viewer →</a></p>

      <h3>Pipeline de contratación (YAML)</h3>
      <p>El mismo mapa escrito en YAML — más terso, y una buena plantilla para edición a mano. Los strings localizados se vuelven mapas anidados y los campos del node se leen inline:</p>
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
      <p><a href="../#hiring-pipeline-yaml">Abrir en el viewer →</a></p>

      <h3>Multi-idioma</h3>
      <p>Un mapa de triaje de soporte al cliente de 6 nodes, completamente traducido EN/PT/ES, con un label <code>meta.context</code> de nivel superior. Demuestra objetos localizados <code>title</code>/<code>subtitle</code>/<code>context</code> manejando el selector de idioma.</p>
      <pre><code>"meta": {
  "title":    { "en": "Customer Support Triage", "pt": "Triagem de Suporte ao Cliente", "es": "Triaje de Soporte al Cliente" },
  "subtitle": { "en": "from ticket to resolution", "pt": "do ticket à resolução", "es": "del ticket a la resolución" },
  "context":  { "en": "support · multi-language demo", "pt": "suporte · demo multi-idioma", "es": "soporte · demo multi-idioma" },
  "default_lang": "en"
}</code></pre>
      <p><a href="../#multi-language">Abrir en el viewer →</a></p>

      <h3>Con módulos compartidos</h3>
      <p>El mismo pipeline de contratación, pero los módulos se extraen de un catálogo compartido vía <code>meta.modules_source</code> y se referencian por id desde el <code>context.modules</code> de cada node. Útil cuando muchos nodes comparten el mismo inventario de features.</p>
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
      <p>El catálogo (<code>modules.json</code>) indexa cada módulo por id, con nombres localizados y niveles <code>today</code>/<code>tomorrow</code>:</p>
      <pre><code>"modules": {
  "ats:resume-parser": {
    "name": { "en": "Resume parser", "pt": "Parser de currículo", "es": "Parser de CV" },
    "today": "automated",
    "tomorrow": "ai",
    "tags": [{ "en": "★ Tablestakes", "pt": "★ Básico", "es": "★ Básico" }]
  }
}</code></pre>
      <p><a href="../#hiring-pipeline-modules">Abrir en el viewer →</a></p>

      <h3>Links directos por tema</h3>
      <ul>
        <li><a href="../?theme=mono&amp;mode=dark#hiring-pipeline">Pipeline de contratación en mono dark</a></li>
        <li><a href="../?theme=blueprint&amp;mode=dark#hiring-pipeline">Pipeline de contratación en blueprint dark</a></li>
        <li><a href="../?theme=midcentury&amp;mode=light#multi-language">Multi-idioma en mid-century light</a></li>
      </ul>

      <p>Los archivos fuente están en <a href="https://github.com/zalkowitsch/lifecycle-map/tree/main/examples">examples/</a>.</p>
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
