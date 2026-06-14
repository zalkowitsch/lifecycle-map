/* lifecycle-map · docs/sections/pt.js · Portuguese content */
(function () {
  'use strict';
  window.LifecycleDocs = window.LifecycleDocs || {};
  window.LifecycleDocs.pt = [
    { id: 'what', label: 'O que é?', render: () => `
      <h1>lifecycle-map <em>— docs</em></h1>
      <p class="lead">Um viewer single-file para mapas de lifecycle em swim-lane. Renderiza qualquer processo — contratação, faturamento, suporte, onboarding — a partir de JSON ou YAML. Sem build, sem servidor, sem instalação.</p>

      <h2>O que ele faz</h2>
      <p>Um lifecycle map responde 4 perguntas sobre um processo:</p>
      <ul>
        <li><strong>Quem age?</strong> — lanes (atores, papéis, sistemas)</li>
        <li><strong>Quando?</strong> — phases (estágios sequenciais)</li>
        <li><strong>O que acontece?</strong> — nodes (passos dentro de uma célula lane × phase)</li>
        <li><strong>O que dispara o quê?</strong> — edges (fluxo direcionado)</li>
      </ul>
      <p>Cada passo pode opcionalmente descrever um estado <strong>hoje vs. amanhã</strong>. Útil para roadmaps de transformação, mapeamento de capabilities, e planejamento de adoção self-serve.</p>

      <h2>Por que usar</h2>
      <p>Mermaid é ótimo pra diagramas pequenos. Miro é ótimo pra colaboração. Nenhum é bom pra lifecycle maps estruturados, navegáveis, source-controlled que você renderiza a partir de JSON.</p>
      <p>Essa ferramenta preenche essa lacuna. O mapa é dado. O viewer é um único arquivo HTML.</p>

      <h2>Resumo de features</h2>
      <ul>
        <li>JSON ou YAML como entrada — mesmo schema, escolha do formato</li>
        <li>Strings multi-idioma inline nos dados (<code>{ en, pt, es, ... }</code>)</li>
        <li>4 temas embutidos × modos claro/escuro</li>
        <li>Carregamento por drag-and-drop</li>
        <li>5 estratégias de compartilhamento</li>
        <li>Caminhada por teclado (<kbd>←</kbd>/<kbd>→</kbd>) + drawer ao clicar</li>
        <li>URLs por slug (<code>#hiring-pipeline</code>) para links de exemplo compartilháveis</li>
      </ul>
    ` },

    { id: 'use-cases', label: 'Casos de uso', render: () => `
      <h2>Casos de uso</h2>
      <p>lifecycle-map serve para qualquer processo com <strong>atores</strong>, <strong>estágios ordenados</strong> e <strong>passos que carregam detalhe estruturado</strong>. Lanes são quem age, phases são quando, nodes são o que acontece, edges são o que dispara o quê. O drawer do node é dirigido por <code>type</code> + <code>context</code> contra <code>meta.nodeTypes</code> — então cada passo pode renderizar sua própria rubrica, lista de sinais ou divisão hoje/amanhã. Abaixo: cinco encaixes concretos, depois onde é a ferramenta errada.</p>

      <h3>1 · Loops de entrevista / contratação</h3>
      <p>Um mapa por loop. Cada rodada (recruiter screen, coding, system design, comportamental, hiring-manager) é um node. O <code>context</code> da rodada guarda a rubrica: uma <code>List</code> de <strong>sinais</strong>, cada um renderizado como um <code>Tile</code> com o nome do sinal, um id e <code>pills</code> de nível (L1→L4). Por que encaixa: um loop é exatamente uma sequência de passos de coleta de sinal, e o drawer torna a rubrica navegável em vez de enterrada num doc por entrevistador.</p>
      <ul>
        <li><strong>Lanes</strong> → candidato, entrevistadores, hiring manager, comitê.</li>
        <li><strong>Phases</strong> → screen → onsite → debrief → decisão.</li>
        <li><strong>Nodes</strong> → rodadas individuais; <code>nodeType</code> "round".</li>
      </ul>
      <pre><code>"round": { "layout": [
  { "type": "Prose", "bind": "$objective" },
  { "type": "KeyValue", "bind": "$meta" },
  { "type": "Section", "title": "Signals", "sub": "$signalsSub",
    "children": [
      { "type": "List", "bind": "$signals",
        "item": { "type": "Tile", "title": "$name", "sub": "$id",
                  "pills": "$levels", "tags": "$tags" } } ] } ] }</code></pre>

      <h3>2 · Pipeline de contratação / fluxo de ATS</h3>
      <p>Dê zoom out de um loop para o funil inteiro: sourcing → screen → phone → onsite → decisão → oferta → onboard. Cada passo recebe um estado <strong>hoje</strong> e <strong>amanhã</strong> (manual vs. aumentado por IA) mais uma <code>List</code> de modules de apoio. Por que encaixa: ele mapeia os handoffs entre sourcer, recruiter, hiring manager e aprovador que um quadro Kanban plano esconde, e a divisão hoje/amanhã o transforma também num roadmap de automação. Este é o exemplo <a href="../#hiring-pipeline">hiring-pipeline</a> incluído.</p>
      <ul>
        <li><strong>Lanes</strong> → candidato, sourcer, recruiter, hiring manager, entrevistador, aprovador.</li>
        <li><strong>Phases</strong> → os seis estágios do funil.</li>
        <li><strong>Nodes</strong> → passos com <code>states</code> (Tiles Today/Tomorrow) e <code>modules</code>.</li>
      </ul>

      <h3>3 · Suporte ao cliente / triagem</h3>
      <p>Do ticket de entrada à resolução: intake → classify → route → resolve → follow-up. Lanes dividem o trabalho entre o cliente, a camada de bot/auto-triagem, tier-1 e o time de escalação. Por que encaixa: triagem é um problema de roteamento com ownership explícito a cada salto — lanes tornam a fronteira de escalação visível, e edges (incluindo loops para trás de tickets reabertos) mostram onde o trabalho quica. O drawer por node pode carregar metas de SLA num <code>KeyValue</code> e <code>Pills</code> de canal.</p>
      <ul>
        <li><strong>Lanes</strong> → cliente, auto-triagem, tier-1, tier-2 / escalação.</li>
        <li><strong>Phases</strong> → intake → classify → route → resolve → follow-up.</li>
        <li><strong>Nodes</strong> → passos de atendimento; edges para trás para reabertura / re-roteamento.</li>
      </ul>

      <h3>4 · Onboarding / ativação</h3>
      <p>Do cadastro ao primeiro valor: criação de conta → setup → primeira ação-chave → hábito. Lanes separam o novo usuário dos nudges automatizados do produto e do time de CS / onboarding. Por que encaixa: ativação é um funil em estágios onde cada passo tem um drop-off e um dono — modelá-lo como nodes permite anexar a métrica de ativação e a intervenção (email, in-app, toque humano) a cada estágio como <code>Pills</code> ou uma <code>List</code> de modules. Hoje/amanhã captura "hand-holding manual de CS agora → self-serve depois".</p>
      <ul>
        <li><strong>Lanes</strong> → usuário, produto (automatizado), CS / onboarding.</li>
        <li><strong>Phases</strong> → cadastro → setup → primeira ação → ativação → hábito.</li>
        <li><strong>Nodes</strong> → marcos com lane dona + intervenção.</li>
      </ul>

      <h3>5 · Roadmaps de capability / transformação</h3>
      <p>Menos um fluxo de quem-faz-o-quê, mais um mapa de onde-estamos. Phases são domínios de capability; nodes são capabilities; o modo <strong>hoje</strong> vs. <strong>amanhã</strong> de cada node (manual → assistido → automatizado → IA) é o ponto inteiro. Por que encaixa: os dois pontinhos de modo por node dão uma leitura de calor instantânea de quão longe cada capability está do seu estado-alvo, e <code>meta.modes</code> dá uma legenda de cor consistente por todo o mapa. Use lanes para times ou value streams que possuem cada capability.</p>
      <ul>
        <li><strong>Lanes</strong> → value streams / times donos.</li>
        <li><strong>Phases</strong> → domínios de capability.</li>
        <li><strong>Nodes</strong> → capabilities; <code>today.mode</code> / <code>tomorrow.mode</code> carregam o gap.</li>
      </ul>

      <h3>Quando NÃO usar</h3>
      <p>É a ferramenta errada quando a estrutura não é lanes × phases:</p>
      <ul>
        <li><strong>Diagramas ad-hoc minúsculos</strong> — um flowchart de 5 caixas sem atores ou estágios. Use <a href="https://mermaid.js.org">Mermaid</a>; é um bloco de código fenced e renderiza inline em qualquer lugar.</li>
        <li><strong>Colaboração freeform</strong> — clusterização de post-its, brainstorming ao vivo, layouts espaciais sem grade fixa. Use <a href="https://miro.com">Miro</a> ou FigJam.</li>
        <li><strong>Org charts, mind maps, grafos de dependência</strong> — hierarquias e redes arbitrárias, não fluxo direcionado lane-a-lane. Use uma ferramenta de grafo.</li>
        <li><strong>Dashboards operacionais ao vivo</strong> — isto renderiza um modelo estático source-controlled, não um feed de estado em tempo real. Conecte métricas em outro lugar.</li>
      </ul>
      <p>Regra de bolso: se você consegue nomear as <strong>lanes</strong> e as <strong>phases</strong> antes de começar, encaixa. Se não consegue, recorra a Mermaid ou Miro.</p>
    ` },

    { id: 'quickstart', label: 'Início rápido', render: () => `
      <h2>Início rápido</h2>
      <p>Abra o viewer com qualquer uma destas URLs:</p>

      <h3>1. Exemplos pré-carregados</h3>
      <pre><code>https://zalkowitsch.github.io/lifecycle-map/#hiring-pipeline
https://zalkowitsch.github.io/lifecycle-map/#multi-language
https://zalkowitsch.github.io/lifecycle-map/#minimal</code></pre>

      <h3>2. Carregar por URL</h3>
      <pre><code>https://zalkowitsch.github.io/lifecycle-map/?src=https://gist.githubusercontent.com/.../raw/foo.json</code></pre>

      <h3>3. Embutir na URL (sem hospedagem)</h3>
      <pre><code>https://zalkowitsch.github.io/lifecycle-map/#data=&lt;base64-gzipped-json&gt;</code></pre>

      <h3>4. Drag and drop</h3>
      <p>Arraste um arquivo <code>.json</code> ou <code>.yaml</code> em qualquer lugar do viewer.</p>

      <h3>5. Colar</h3>
      <pre><code>https://zalkowitsch.github.io/lifecycle-map/?paste</code></pre>

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

    { id: 'loading', label: 'Carregando dados', render: () => `
      <h2>Carregando dados</h2>
      <p>Cinco formas de carregar. Prioridade: <code>?src</code> &gt; <code>#data=</code> &gt; <code>?img=</code>/<code>#img=</code> &gt; <code>#&lt;slug&gt;</code> &gt; <code>?paste</code> &gt; splash. Drag-and-drop funciona a qualquer momento.</p>

      <h3><code>?src</code> — URL externa</h3>
      <pre><code>?src=https://gist.githubusercontent.com/.../raw/map.yaml</code></pre>
      <p>A URL precisa permitir CORS.</p>

      <h3><code>#data=</code> — embutido</h3>
      <pre><code>echo '{"lanes":[...]}' | gzip -9 | base64 | tr -d '\\n' | tr '+/' '-_' | tr -d '='</code></pre>

      <h3><code>#&lt;slug&gt;</code> — exemplo embutido</h3>
      <p>Slugs conhecidos: <code>#hiring-pipeline</code>, <code>#hiring-pipeline-yaml</code>, <code>#hiring-pipeline-modules</code>, <code>#multi-language</code>, <code>#minimal</code>.</p>
      <p>Drag-and-drop também define um slug derivado do nome do arquivo — mas o conteúdo fica só em memória.</p>

      <h3><code>?img=</code> / <code>#img=</code> — imagem criptografada</h3>
      <p>Descriptografado client-side. Veja <a href="?lang=pt#share">Share → Imagem criptografada</a>.</p>

      <h3><code>?paste</code> — manual</h3>
      <p>Abre um textarea.</p>

      <h3>Drag and drop</h3>
      <p>Arraste um arquivo <code>.json</code> ou <code>.yaml</code>. Nada é enviado a lugar nenhum.</p>
    ` },

    { id: 'structure', label: 'Estrutura', render: () => `
      <h2>Estrutura</h2>
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
        <li><code>title</code> — texto do header. String ou <code>{ en, pt, es, ... }</code>.</li>
        <li><code>subtitle</code> — aparece em itálico terracota depois do em-dash.</li>
        <li><code>context</code> — pequena linha "eyebrow" acima do título.</li>
        <li><code>modes</code> — taxonomia de ownership (veja <a href="?lang=pt#modes">Modes</a>).</li>
        <li><code>default_lang</code> — idioma inicial.</li>
      </ul>

      <h3>lanes</h3>
      <pre><code>[
  { "id": "biller",   "label": "Biller",   "sub": "8h/dia" },
  { "id": "approver", "label": "Aprovador", "sub": "VP+" }
]</code></pre>

      <h3>phases</h3>
      <pre><code>[
  { "id": "intake",  "label": "Entrada",   "roman": "I",  "subCols": 1 },
  { "id": "process", "label": "Processar", "roman": "II", "subCols": 2 }
]</code></pre>

      <h3>nodes</h3>
      <p>Obrigatório: <code>id</code>, <code>lane</code>, <code>phase</code>, <code>title</code>. Opcional: <code>sub</code>, <code>objective</code>, <code>entity</code>, <code>actors</code>, <code>triggers</code>, <code>next</code>, <code>today</code>, <code>tomorrow</code>, <code>modules</code>.</p>

      <h3>edges</h3>
      <pre><code>[
  { "from": "a", "to": "b" },
  { "from": "b", "to": "a" }   // backward (detectado auto)
]</code></pre>
    ` },

    { id: 'primitives', label: 'Primitivas do drawer', render: () => `
      <h2>Primitivas do drawer</h2>
      <p>O conteúdo do drawer do node não é mais hardcoded. Um node declara um <code>type</code>; o layout do tipo é uma árvore de primitivas de UI genéricas com bindings de dados. O node carrega seus dados em <code>context</code>. O app renderiza o layout, resolvendo cada binding contra o context do node.</p>

      <h3>Formato do node &amp; meta.nodeTypes</h3>
      <p>Um node referencia <code>meta.nodeTypes[type].layout</code> — uma árvore de primitivas — e carrega seus dados em <code>context</code>. A posição na grade (<code>id</code>, <code>lane</code>, <code>phase</code>, <code>col</code>) fica fora de <code>context</code>.</p>
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

      <h3>A regra de binding</h3>
      <p>Um valor de string começando com <code>$</code> é um binding: lê <code>context.&lt;key&gt;</code> — <code>"$rubrics"</code> resolve para <code>context.rubrics</code>. Uma string sem <code>$</code> à frente é um literal, renderizado como está.</p>
      <p>Dentro de uma <code>List</code>, a primitiva <code>item</code> recebe cada elemento do array como seu context <strong>local</strong>. Então <code>Tile.title: "$name"</code> lê <code>item.name</code>, não o context de nível do node.</p>
      <p>Todo binding é opcional no momento da renderização. Um binding que resolve para <code>undefined</code> / ausente faz aquela primitiva (ou aquela prop) se omitir — sem crash, sem placeholder.</p>

      <h3>As 10 primitivas</h3>
      <p>Cada <code>type</code> seleciona um componente fixo provido pelo app. Os campos abaixo são os nomes exatos das props.</p>

      <h4>Section</h4>
      <p>Um grupo com título. <code>title</code> e <code>sub</code> são str-ou-binding; <code>children</code> é um array de primitivas. Linhas de cabeçalho se omitem quando vazias.</p>
      <pre><code>{ "type": "Section", "title": "Rubrics", "sub": "$rubricsSub", "children": [ ... ] }</code></pre>

      <h4>KeyValue</h4>
      <p><code>bind</code> resolve para um array de linhas <code>{ label, value }</code>. Omite se não for um array ou estiver vazio.</p>
      <pre><code>{ "type": "KeyValue", "bind": "$meta" }</code></pre>

      <h4>List</h4>
      <p><code>bind</code> resolve para um array; <code>item</code> é renderizado uma vez por elemento, cada elemento passado como o context local do item. Omite se vazio ou sem <code>item</code>.</p>
      <pre><code>{ "type": "List", "bind": "$rubrics", "item": { "type": "Tile", "title": "$name" } }</code></pre>

      <h4>Tile</h4>
      <p>Um card com <code>title</code>, <code>sub</code> opcional, e duas linhas de pills: <code>pills</code> e <code>tags</code> (cada uma um binding para um array). Omite inteiramente se <code>title</code> resolver vazio.</p>
      <pre><code>{ "type": "Tile", "title": "$name", "sub": "$id", "pills": "$levels", "tags": "$tags" }</code></pre>

      <h4>Pills</h4>
      <p><code>bind</code> resolve para um array de strings ou objetos <code>{ label, color? }</code>. O <code>color</code> por pill tinge o label. Omite se o array estiver vazio ou ausente.</p>
      <pre><code>{ "type": "Pills", "bind": "$levels" }</code></pre>

      <h4>Prose</h4>
      <p>Um parágrafo. <code>bind</code> resolve para texto. O HTML é sanitizado para um allowlist de apenas <code>&lt;em&gt;</code>, <code>&lt;strong&gt;</code>, <code>&lt;br&gt;</code> — scripts, atributos e quaisquer outras tags são removidos. Omite se vazio.</p>
      <pre><code>{ "type": "Prose", "bind": "$objective" }</code></pre>

      <h4>Title</h4>
      <p>Um cabeçalho. <code>text</code> é str-ou-binding; <code>variant</code> é <code>h1</code>, <code>h2</code> (padrão), ou <code>eyebrow</code>. Omite se vazio.</p>
      <pre><code>{ "type": "Title", "text": "How We Interview", "variant": "h1" }</code></pre>

      <h4>Text</h4>
      <p>Uma sequência inline de texto. <code>text</code> é str-ou-binding; <code>variant</code> é <code>body</code> (padrão), <code>caption</code>, ou <code>mono</code>. Omite se vazio.</p>
      <pre><code>{ "type": "Text", "text": "$duration", "variant": "caption" }</code></pre>

      <h4>Button</h4>
      <p>Um botão. <code>text</code> é o label; <code>action</code> é <code>navigate</code> (padrão) ou <code>copy</code>; <code>target</code> é um binding passado ao handler da ação. Omite se o label estiver vazio.</p>
      <pre><code>{ "type": "Button", "text": "Open spec", "action": "navigate", "target": "$specUrl" }</code></pre>

      <h4>Link</h4>
      <p>Um link externo. <code>text</code> é o label; <code>href</code> é um binding. Apenas hrefs <code>http</code> / <code>https</code> são permitidos — <code>javascript:</code>, <code>data:</code> e outros esquemas são rejeitados e o link se omite.</p>
      <pre><code>{ "type": "Link", "text": "Docs", "href": "$docsUrl" }</code></pre>

      <p>Objetos localizados (<code>{ en, pt, es, ... }</code>) funcionam em qualquer lugar onde uma primitiva renderiza texto — mesmas regras do resto do documento (veja <a href="?lang=pt#multilang">Multi-idioma</a>).</p>
    ` },

    { id: 'customization', label: 'Customização', render: () => `
      <h2>Customização</h2>
      <p>Este é o coração do modelo data-driven: <strong>você</strong> decide o que o drawer de um node mostra. O drawer não é mais hardcoded — não há layout fixo de Objective / Modules / States. Em vez disso você cria seu próprio <code>nodeType</code> a partir das 10 <a href="?lang=pt#primitives">primitivas do drawer</a>, e todo node desse tipo o preenche com dados. Desenhe o layout uma vez, reutilize por todo o mapa.</p>

      <h3>O modelo mental</h3>
      <p>Duas metades, mantidas separadas de propósito:</p>
      <ul>
        <li><strong>O tipo define o layout.</strong> <code>meta.nodeTypes.&lt;type&gt;.layout</code> é uma árvore de primitivas — o formato do drawer. Ele diz <em>quais</em> seções existem e <em>onde</em> cada pedaço de dado cai, mas não guarda dado nenhum.</li>
        <li><strong>O node passa o context.</strong> Cada node define <code>type</code> para escolher um layout e carrega seus próprios dados em <code>context</code>. O app percorre o layout e resolve cada binding contra o context daquele node.</li>
      </ul>
      <p>Então um layout, muitos nodes: mude o layout uma vez e todo node desse tipo re-renderiza do jeito novo; mude o context de um node e só aquele drawer muda.</p>

      <h3>Um exemplo completo trabalhado</h3>
      <p>Defina um tipo custom <code>service</code> com quatro primitivas empilhadas de cima para baixo: um <code>Prose</code> de intro, uma tabela de fatos <code>KeyValue</code>, e uma <code>Section</code> envolvendo uma <code>List</code> que renderiza um <code>Tile</code> por elemento.</p>
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
      <p>Agora um node que seleciona esse tipo e o preenche. A posição na grade (<code>id</code>, <code>lane</code>, <code>phase</code>, <code>col</code>) fica <strong>fora</strong> de <code>context</code>; tudo a que o layout faz binding vive <strong>dentro</strong> dele.</p>
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
      <p>O que renderiza, de cima para baixo: um parágrafo sanitizado (o <code>&lt;strong&gt;</code> sobrevive, qualquer outra coisa seria removida); uma tabela label/value de duas linhas; um cabeçalho <strong>Dependencies</strong> com a sub-linha "upstream services this calls"; depois dois tiles — "Ledger / payments-team" com um pill <code>healthy</code>, e "Tax engine / vendor" com um pill <code>degraded</code>.</p>

      <h3>Regras de binding para ter em mente</h3>
      <ul>
        <li><strong><code>$key</code> vs literal.</strong> Uma string começando com <code>$</code> lê do context: <code>"$deps"</code> → <code>context.deps</code>. Uma string sem <code>$</code> é um literal, renderizado como está — é por isso que <code>"title": "Dependencies"</code> imprime a palavra, enquanto <code>"bind": "$deps"</code> busca dado.</li>
        <li><strong>Context local do item da List.</strong> Dentro de uma <code>List</code>, cada elemento do array vira o context <em>local</em> da primitiva <code>item</code>. Então <code>Tile.title: "$name"</code> lê <code>element.name</code> — não o context de nível do node. O <code>item</code> não enxerga <code>$summary</code> lá de cima; só enxerga o próprio elemento.</li>
        <li><strong>Ausente → omite.</strong> Todo binding é opcional. Um binding que resolve para <code>undefined</code> / ausente faz aquela primitiva (ou aquela prop) cair fora — sem crash, sem placeholder. Deixe o <code>owner</code> de fora de uma dependência e só aquele tile perde sua sub-linha; o resto renderiza normalmente.</li>
      </ul>

      <h3>Compondo um drawer estilo rubrica</h3>
      <p>A mesma espinha Section &gt; List &gt; Tile te dá um scorecard. Coloque o <strong>nome</strong> da rubrica como <code>title</code> do Tile, os <strong>níveis</strong> de maturidade como <code>pills</code>, e <strong>tags</strong> de categoria como uma segunda linha de pills. Um <code>Tile</code> tem duas linhas de pills independentes — <code>pills</code> e <code>tags</code> — cada uma um binding para um array de strings ou objetos <code>{ label, color? }</code>.</p>
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
      <p>Cada elemento de <code>rubrics</code> vira um tile: seu <code>name</code> é o título, <code>id</code> a sub-linha, <code>levels</code> a linha de pills de cima, <code>tags</code> a segunda. Adicione um <code>color</code> a um objeto de level (<code>{ "label": "L4", "color": "#047857" }</code>) para tingir aquele pill.</p>

      <h3>Reutilizando um nodeType por muitos nodes</h3>
      <p>Um tipo é definido uma vez e referenciado por qualquer número de nodes. Todo node com <code>"type": "service"</code> deriva do mesmo <code>meta.nodeTypes.service.layout</code> — diferem apenas no <code>context</code>. Esse é o payoff: dúzias de nodes compartilham um design de drawer, e editar o layout atualiza todos de uma vez. Você também pode definir vários tipos (<code>service</code>, <code>round</code>, <code>handoff</code>, …) no mesmo mapa e deixar cada node escolher o que encaixa.</p>
      <p>Se uma chave do layout resolver para nada num dado node, aquela parte simplesmente se omite — então um único tipo compartilhado pode servir nodes ricos e esparsos sem layouts por node. Um node que não tem <code>deps</code> só não renderiza a seção Dependencies.</p>

      <h3>Layout vs. tema</h3>
      <p>Customizar um <code>nodeType</code> muda <strong>qual conteúdo</strong> o drawer mostra. Não toca no <strong>estilo visual</strong> — fontes, cores, claro/escuro. Esses vêm do tema visual, trocado em Settings ou via <code>?theme=&amp;mode=</code> na URL. Os dois são independentes: qualquer layout renderiza corretamente sob qualquer tema. Veja <a href="?lang=pt#themes">Temas</a> para os temas built-in e o modo escuro, e <a href="?lang=pt#primitives">Primitivas do drawer</a> para os nomes exatos das props de todas as 10 primitivas.</p>
    ` },

    { id: 'api', label: 'Referência da API', render: () => `
      <h1>Referência da API <em>— o modelo de dados</em></h1>
      <p class="lead">Um lifecycle map é um documento JSON (ou YAML). Este é o contrato completo: cada chave de nível superior, o engine de layout de node-type, as 10 primitivas do drawer e a gramática de binding que liga os dados do node aos drawers renderizados.</p>

      <h2>Formato do documento</h2>
      <p>Um objeto. Apenas <code>lanes</code>, <code>phases</code> e <code>nodes</code> são estruturalmente obrigatórios para renderizar; o resto adiciona labels, drawers e fluxo.</p>
      <table>
        <thead><tr><th>Chave</th><th>Tipo</th><th>Obr.?</th><th>Propósito</th></tr></thead>
        <tbody>
          <tr><td><code>meta</code></td><td>object</td><td>—</td><td>Título, subtítulo, idioma padrão, modes, e o registro de drawers <code>nodeTypes</code>.</td></tr>
          <tr><td><code>lanes</code></td><td>array</td><td>sim</td><td>Linhas — os atores / papéis / sistemas.</td></tr>
          <tr><td><code>phases</code></td><td>array</td><td>sim</td><td>Colunas — os estágios sequenciais.</td></tr>
          <tr><td><code>nodes</code></td><td>array</td><td>sim</td><td>Passos posicionados numa célula lane × phase.</td></tr>
          <tr><td><code>edges</code></td><td>array</td><td>—</td><td>Fluxo direcionado entre nodes.</td></tr>
          <tr><td><code>modules</code></td><td>object</td><td>—</td><td>Catálogo de capabilities opcional de nível superior (veja <code>meta.modules_source</code>).</td></tr>
        </tbody>
      </table>
      <p>Strings mostradas abaixo como <code>LStr</code> são <strong>strings localizadas</strong>: ou uma string simples, ou um objeto <code>{ en, pt, es, ... }</code> (veja <a href="#api">Strings localizadas</a> no final).</p>

      <h2><code>meta</code></h2>
      <table>
        <thead><tr><th>Campo</th><th>Tipo</th><th>Obr.?</th><th>Significado</th></tr></thead>
        <tbody>
          <tr><td><code>title</code></td><td>LStr</td><td>—</td><td>Título do mapa, mostrado no header.</td></tr>
          <tr><td><code>subtitle</code></td><td>LStr</td><td>—</td><td>Sub-linha abaixo do título.</td></tr>
          <tr><td><code>context</code></td><td>LStr</td><td>—</td><td>Texto livre de enquadramento do mapa inteiro.</td></tr>
          <tr><td><code>default_lang</code></td><td>string</td><td>—</td><td>Chave de idioma escolhida primeiro, ex. <code>"en"</code>.</td></tr>
          <tr><td><code>modes</code></td><td>array</td><td>—</td><td>Entradas de legenda: cada <code>{ id, label: LStr, color }</code>. Referenciada por valores de state / pill do node.</td></tr>
          <tr><td><code>nodeTypes</code></td><td>object</td><td>—</td><td>Mapa de <code>typeName → { layout: [...] }</code>. O engine de drawer. Veja abaixo.</td></tr>
          <tr><td><code>modules_source</code></td><td>string</td><td>—</td><td>Ponteiro para de onde o catálogo <code>modules</code> de nível superior vem.</td></tr>
        </tbody>
      </table>

      <h2><code>lanes</code></h2>
      <table>
        <thead><tr><th>Campo</th><th>Tipo</th><th>Obr.?</th><th>Significado</th></tr></thead>
        <tbody>
          <tr><td><code>id</code></td><td>string</td><td>sim</td><td>Único. Referenciado por <code>node.lane</code>.</td></tr>
          <tr><td><code>label</code></td><td>LStr</td><td>sim</td><td>Label da linha.</td></tr>
          <tr><td><code>sub</code></td><td>LStr</td><td>—</td><td>Linha secundária sob o label da lane.</td></tr>
        </tbody>
      </table>

      <h2><code>phases</code></h2>
      <table>
        <thead><tr><th>Campo</th><th>Tipo</th><th>Obr.?</th><th>Significado</th></tr></thead>
        <tbody>
          <tr><td><code>id</code></td><td>string</td><td>sim</td><td>Único. Referenciado por <code>node.phase</code>.</td></tr>
          <tr><td><code>label</code></td><td>LStr</td><td>sim</td><td>Label da coluna.</td></tr>
          <tr><td><code>roman</code></td><td>string</td><td>—</td><td>Ordinal de exibição, ex. <code>"III"</code>.</td></tr>
          <tr><td><code>subCols</code></td><td>number</td><td>—</td><td>Quantas sub-colunas a phase ocupa (o <code>col</code> do node indexa nelas).</td></tr>
        </tbody>
      </table>

      <h2><code>nodes</code></h2>
      <table>
        <thead><tr><th>Campo</th><th>Tipo</th><th>Obr.?</th><th>Significado</th></tr></thead>
        <tbody>
          <tr><td><code>id</code></td><td>string</td><td>sim</td><td>Único. Referenciado por edges.</td></tr>
          <tr><td><code>lane</code></td><td>string</td><td>sim</td><td>Um <code>lanes[].id</code>.</td></tr>
          <tr><td><code>phase</code></td><td>string</td><td>sim</td><td>Um <code>phases[].id</code>.</td></tr>
          <tr><td><code>col</code></td><td>number</td><td>—</td><td>Sub-coluna 0-based dentro da phase. Padrão <code>0</code>.</td></tr>
          <tr><td><code>title</code></td><td>LStr</td><td>sim</td><td>Título do card do node.</td></tr>
          <tr><td><code>sub</code></td><td>LStr</td><td>—</td><td>Linha secundária no card.</td></tr>
          <tr><td><code>type</code></td><td>string</td><td>—</td><td>Seleciona <code>meta.nodeTypes[type]</code> para o drawer. Sem <code>type</code> → sem corpo de drawer.</td></tr>
          <tr><td><code>context</code></td><td>object</td><td>—</td><td>Os dados a que o layout faz binding. Livre; as chaves são referenciadas por bindings <code>$key</code>.</td></tr>
        </tbody>
      </table>

      <h2><code>edges</code></h2>
      <p>Links direcionados. Ambas as convenções de nome são aceitas — use uma consistentemente e cheque o exemplo que você está copiando.</p>
      <table>
        <thead><tr><th>Campo</th><th>Tipo</th><th>Obr.?</th><th>Significado</th></tr></thead>
        <tbody>
          <tr><td><code>source</code> / <code>from</code></td><td>string</td><td>sim</td><td><code>node.id</code> de origem.</td></tr>
          <tr><td><code>target</code> / <code>to</code></td><td>string</td><td>sim</td><td><code>node.id</code> de destino.</td></tr>
        </tbody>
      </table>

      <h2>Node types &amp; o engine de layout</h2>
      <p>O drawer de um node não é hardcoded. É computado: o <code>type</code> do node seleciona uma entrada em <code>meta.nodeTypes</code>, cujo <code>layout</code> é um array de <strong>primitivas</strong> que o drawer percorre de cima para baixo. Cada primitiva resolve seus bindings contra o <code>context</code> do node e se renderiza.</p>
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
      <p>Um node com <code>"type": "step"</code> renderiza esse layout contra seu próprio <code>context</code>. Dois nodes compartilhando um tipo compartilham um layout mas fornecem context diferente. Um <code>type</code> sem entrada correspondente em <code>nodeTypes</code>, ou um node sem <code>type</code>, não renderiza corpo.</p>

      <h2>Catálogo de primitivas</h2>
      <p>Dez primitivas. Toda primitiva carrega <code>type</code> (seu nome). Props terminando num binding (<code>$key</code>) leem do context local; strings literais renderizam como estão. Um binding que resolve para <code>undefined</code> faz aquela primitiva — ou aquela prop única — se omitir.</p>

      <h3>Prose</h3>
      <p>Um bloco de parágrafo. A entrada é sanitizada para um allowlist (<code>em</code>, <code>strong</code>, <code>br</code> apenas); todo o resto é removido.</p>
      <table>
        <thead><tr><th>Campo</th><th>Tipo</th><th>Obr.?</th><th>Significado</th></tr></thead>
        <tbody>
          <tr><td><code>type</code></td><td><code>"Prose"</code></td><td>sim</td><td>—</td></tr>
          <tr><td><code>bind</code></td><td>binding</td><td>sim</td><td>Resolve para o texto (sanitizado).</td></tr>
        </tbody>
      </table>
      <pre><code>{ "type": "Prose", "bind": "$objective" }</code></pre>

      <h3>KeyValue</h3>
      <p>Uma lista label/value.</p>
      <table>
        <thead><tr><th>Campo</th><th>Tipo</th><th>Obr.?</th><th>Significado</th></tr></thead>
        <tbody>
          <tr><td><code>type</code></td><td><code>"KeyValue"</code></td><td>sim</td><td>—</td></tr>
          <tr><td><code>bind</code></td><td>binding</td><td>sim</td><td>Resolve para um array de linhas <code>{ label, value }</code>.</td></tr>
        </tbody>
      </table>
      <pre><code>{ "type": "KeyValue", "bind": "$meta" }</code></pre>

      <h3>Section</h3>
      <p>Um grupo com título que aninha outras primitivas.</p>
      <table>
        <thead><tr><th>Campo</th><th>Tipo</th><th>Obr.?</th><th>Significado</th></tr></thead>
        <tbody>
          <tr><td><code>type</code></td><td><code>"Section"</code></td><td>sim</td><td>—</td></tr>
          <tr><td><code>title</code></td><td>string / binding</td><td>sim</td><td>Cabeçalho.</td></tr>
          <tr><td><code>sub</code></td><td>string / binding</td><td>—</td><td>Sub-cabeçalho.</td></tr>
          <tr><td><code>children</code></td><td>primitive[]</td><td>sim</td><td>Primitivas aninhadas, percorridas em ordem.</td></tr>
        </tbody>
      </table>
      <pre><code>{ "type": "Section", "title": "States", "sub": "$statesSub", "children": [ ... ] }</code></pre>

      <h3>List</h3>
      <p>Repete uma primitiva sobre um array. <strong>Cada elemento do array vira o context local</strong> do <code>item</code> — então dentro do <code>item</code>, <code>$name</code> lê <code>element.name</code>, não o context de nível do node.</p>
      <table>
        <thead><tr><th>Campo</th><th>Tipo</th><th>Obr.?</th><th>Significado</th></tr></thead>
        <tbody>
          <tr><td><code>type</code></td><td><code>"List"</code></td><td>sim</td><td>—</td></tr>
          <tr><td><code>bind</code></td><td>binding</td><td>sim</td><td>Resolve para o array.</td></tr>
          <tr><td><code>item</code></td><td>primitive</td><td>sim</td><td>Renderizado uma vez por elemento, com o elemento como seu context.</td></tr>
        </tbody>
      </table>
      <pre><code>{ "type": "List", "bind": "$modules", "item": {
  "type": "Tile", "title": "$feature", "sub": "$id", "pills": "$levels"
} }</code></pre>

      <h3>Tile</h3>
      <p>Um card compacto, tipicamente o <code>item</code> de uma List.</p>
      <table>
        <thead><tr><th>Campo</th><th>Tipo</th><th>Obr.?</th><th>Significado</th></tr></thead>
        <tbody>
          <tr><td><code>type</code></td><td><code>"Tile"</code></td><td>sim</td><td>—</td></tr>
          <tr><td><code>title</code></td><td>string / binding</td><td>sim</td><td>Cabeçalho do tile.</td></tr>
          <tr><td><code>sub</code></td><td>string / binding</td><td>—</td><td>Linha secundária.</td></tr>
          <tr><td><code>pills</code></td><td>binding</td><td>—</td><td>Array → renderizado como pills (mesmo formato de valor que Pills).</td></tr>
          <tr><td><code>tags</code></td><td>binding</td><td>—</td><td>Array de strings de tag.</td></tr>
        </tbody>
      </table>
      <pre><code>{ "type": "Tile", "title": "$label", "sub": "$mode", "pills": "$tools" }</code></pre>

      <h3>Pills</h3>
      <p>Uma linha de pills. Sem prop variant.</p>
      <table>
        <thead><tr><th>Campo</th><th>Tipo</th><th>Obr.?</th><th>Significado</th></tr></thead>
        <tbody>
          <tr><td><code>type</code></td><td><code>"Pills"</code></td><td>sim</td><td>—</td></tr>
          <tr><td><code>bind</code></td><td>binding</td><td>sim</td><td>Resolve para um array de strings, ou de <code>{ label, color? }</code>.</td></tr>
        </tbody>
      </table>
      <pre><code>{ "type": "Pills", "bind": "$levels" }</code></pre>

      <h3>Title</h3>
      <p>Um cabeçalho standalone com texto literal.</p>
      <table>
        <thead><tr><th>Campo</th><th>Tipo</th><th>Obr.?</th><th>Significado</th></tr></thead>
        <tbody>
          <tr><td><code>type</code></td><td><code>"Title"</code></td><td>sim</td><td>—</td></tr>
          <tr><td><code>text</code></td><td>string / binding</td><td>sim</td><td>O texto do cabeçalho.</td></tr>
          <tr><td><code>variant</code></td><td>enum</td><td>—</td><td>Um de <code>h1</code>, <code>h2</code>, <code>eyebrow</code>.</td></tr>
        </tbody>
      </table>
      <pre><code>{ "type": "Title", "text": "Overview", "variant": "h2" }</code></pre>

      <h3>Text</h3>
      <p>Uma linha standalone de texto de corpo.</p>
      <table>
        <thead><tr><th>Campo</th><th>Tipo</th><th>Obr.?</th><th>Significado</th></tr></thead>
        <tbody>
          <tr><td><code>type</code></td><td><code>"Text"</code></td><td>sim</td><td>—</td></tr>
          <tr><td><code>text</code></td><td>string / binding</td><td>sim</td><td>O texto.</td></tr>
          <tr><td><code>variant</code></td><td>enum</td><td>—</td><td>Um de <code>body</code>, <code>caption</code>, <code>mono</code>.</td></tr>
        </tbody>
      </table>
      <pre><code>{ "type": "Text", "text": "$note", "variant": "caption" }</code></pre>

      <h3>Button</h3>
      <p>Um controle de ação.</p>
      <table>
        <thead><tr><th>Campo</th><th>Tipo</th><th>Obr.?</th><th>Significado</th></tr></thead>
        <tbody>
          <tr><td><code>type</code></td><td><code>"Button"</code></td><td>sim</td><td>—</td></tr>
          <tr><td><code>text</code></td><td>string / binding</td><td>sim</td><td>Label.</td></tr>
          <tr><td><code>action</code></td><td>enum</td><td>—</td><td><code>navigate</code> ou <code>copy</code>.</td></tr>
          <tr><td><code>target</code></td><td>string / binding</td><td>—</td><td>Id do node para navegar, ou texto para copiar.</td></tr>
        </tbody>
      </table>
      <pre><code>{ "type": "Button", "text": "Go to debrief", "action": "navigate", "target": "debrief" }</code></pre>

      <h3>Link</h3>
      <p>Um link externo. Esquemas não-<code>http</code>/<code>https</code> são rejeitados (sem <code>javascript:</code>, <code>data:</code>, etc.).</p>
      <table>
        <thead><tr><th>Campo</th><th>Tipo</th><th>Obr.?</th><th>Significado</th></tr></thead>
        <tbody>
          <tr><td><code>type</code></td><td><code>"Link"</code></td><td>sim</td><td>—</td></tr>
          <tr><td><code>text</code></td><td>string / binding</td><td>sim</td><td>Texto do link.</td></tr>
          <tr><td><code>href</code></td><td>string / binding</td><td>sim</td><td>URL — <code>http</code>/<code>https</code> apenas.</td></tr>
        </tbody>
      </table>
      <pre><code>{ "type": "Link", "text": "Docs", "href": "https://example.com" }</code></pre>

      <h2>Gramática de binding</h2>
      <p>As regras que o engine aplica ao resolver qualquer valor de prop:</p>
      <ul>
        <li><strong>Prefixo <code>$</code> → binding.</strong> Uma string começando com <code>$</code> (ex. <code>$objective</code>) é buscada por chave contra o context atual.</li>
        <li><strong>Sem <code>$</code> → literal.</strong> Qualquer outra string renderiza verbatim (ex. <code>"States"</code> como título de Section).</li>
        <li><strong>Context local da List.</strong> Dentro de um <code>List.item</code>, o context atual é o <em>elemento</em> do array, não o node. <code>Tile.title: "$name"</code> lê <code>element.name</code>.</li>
        <li><strong>Undefined omite.</strong> Um binding que resolve para <code>undefined</code> / ausente faz aquela primitiva (ou só aquela prop) cair fora — sem placeholder vazio.</li>
      </ul>

      <h3>Restrições de segurança</h3>
      <ul>
        <li><strong>Prose</strong> sanitiza para um allowlist de <code>em</code>, <code>strong</code>, <code>br</code>. Todas as outras tags/atributos são removidos.</li>
        <li><strong>Link</strong> aceita apenas hrefs <code>http</code> e <code>https</code>; outros esquemas são rejeitados.</li>
      </ul>

      <h2>Strings localizadas</h2>
      <p>Em qualquer lugar onde as tabelas acima dizem <code>LStr</code>, você pode passar ou uma string simples ou um objeto por idioma:</p>
      <pre><code>"label": { "en": "Candidate", "pt": "Candidato", "es": "Candidato" }</code></pre>
      <p>O viewer escolhe <code>meta.default_lang</code> primeiro, depois cai pelas chaves disponíveis. Objetos localizados são honrados em <strong>strings de exibição de nível de dado</strong> — <code>meta.title</code>/<code>subtitle</code>/<code>context</code>, <code>modes[].label</code>, <code>lanes[].label</code>/<code>sub</code>, <code>phases[].label</code>, e <code>nodes[].title</code>/<code>sub</code>. Valores dentro de <code>node.context</code> são dados simples resolvidos por bindings; localize-os dando ao valor bound o formato <code>{ en, pt, es }</code> onde seu layout o lê.</p>
    ` },

    { id: 'modes', label: 'Modes', render: () => `
      <h2>Modes &amp; cores</h2>
      <p>Cada node pode declarar <code>today.mode</code> e <code>tomorrow.mode</code>. Esses renderizam como dois pontinhos coloridos no canto superior direito do card.</p>

      <h3>Declarando modes explicitamente</h3>
      <pre><code>{
  "meta": {
    "modes": [
      { "id": "manual",    "label": "Manual",    "color": "#b91c1c" },
      { "id": "automated", "label": "Automatizado", "color": "#1e40af" }
    ]
  }
}</code></pre>

      <h3>Modes padrão</h3>
      <p>Se <code>meta.modes</code> for omitido, seis defaults são usados: <code>self-serve</code>, <code>assisted</code>, <code>automated</code>, <code>manual</code>, <code>n-a</code>, <code>unknown</code>.</p>

      <h3>Cores auto-geradas</h3>
      <p>Se um node referencia um mode ID que não está em <code>meta.modes</code>, o viewer auto-gera uma cor distinta para ele via distribuição golden-ratio em HSL. Você pode simplesmente escrever strings descritivas como valores de mode e elas vão renderizar com cores únicas:</p>
      <pre><code>"today":    { "mode": "Totalmente gerenciado pelo cliente" },
"tomorrow": { "mode": "Com IA + revisão humana" }</code></pre>
      <p>As cores auto-geradas são estáveis por nome de mode dentro de uma sessão.</p>

      <h3>Labels de modes localizadas</h3>
      <pre><code>{
  "id": "ai",
  "label": { "en": "AI-Augmented", "pt": "Com IA", "es": "Con IA" },
  "color": "#047857"
}</code></pre>
    ` },

    { id: 'multilang', label: 'Multi-idioma', render: () => `
      <h2>Multi-idioma</h2>
      <p>Qualquer string no documento pode ser texto simples <strong>ou</strong> um objeto com chaves por código de idioma.</p>

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

      <h3>Onde funciona</h3>
      <p>Funciona para <code>title</code>, <code>sub</code>, <code>label</code>, <code>objective</code>, <code>entity</code>, <code>actors</code>, <code>triggers</code>, <code>next</code>, <code>narrative</code>, <code>meta.title</code>, <code>meta.subtitle</code>, <code>meta.context</code>, labels de modes, e tags / nomes de modules.</p>

      <h3>Detecção &amp; troca</h3>
      <p>O viewer escaneia o documento ao carregar. Se 2+ idiomas presentes, seletor de <strong>Idioma</strong> aparece em <strong>Settings</strong>.</p>

      <h3>Idioma padrão</h3>
      <ol>
        <li>Última escolha do usuário em localStorage</li>
        <li><code>meta.default_lang</code> no documento</li>
        <li>Primeiro idioma alfabético</li>
      </ol>

      <h3>Fallbacks</h3>
      <p>Se uma string não tem o idioma atual, cai para <code>en</code>, depois para a primeira chave disponível. Misturar strings simples e objetos localizados no mesmo documento é OK.</p>

      <p>Veja <a href="../?src=../examples/multi-language.json">o exemplo multi-idioma</a>.</p>
    ` },

    { id: 'yaml', label: 'JSON ou YAML', render: () => `
      <h2>JSON ou YAML</h2>
      <p>Ambos aceitos, mesmo schema. Auto-detect: tenta JSON primeiro, fallback pra YAML.</p>

      <pre><code>lanes:
  - { id: u, label: User }
phases:
  - { id: in, label: Intake }
nodes:
  - { id: ask, lane: u, phase: in, title: Ask }</code></pre>

      <h3>Multi-idioma em YAML</h3>
      <pre><code>lanes:
  - id: u
    label: { en: User, pt: Usuário, es: Usuario }</code></pre>

      <h3>Por que YAML</h3>
      <ul>
        <li>Comentários (<code>#</code>) sobrevivem em git review</li>
        <li>Sem problema de vírgula final</li>
        <li>Strings multi-linha mais fáceis</li>
        <li>Mais curto — sem aspas em chaves óbvias</li>
      </ul>
    ` },

    { id: 'external', label: 'Refs externas', render: () => `
      <h2>Referências externas</h2>
      <p>Modules podem ser inline ou puxados de um catálogo compartilhado por ID.</p>

      <h3>Inline (padrão)</h3>
      <pre><code>"modules": [
  { "feature": "Bulk edit", "today": "manual", "tomorrow": "automated" }
]</code></pre>

      <h3>Referência por catálogo</h3>
      <pre><code>{
  "modules": {
    "shared:bulk-edit": {
      "name": "Bulk edit",
      "today": "manual",
      "tomorrow": "automated"
    }
  },
  "nodes": [{ "modules": ["shared:bulk-edit"] }]
}</code></pre>

      <p>Veja <a href="../?src=../examples/with-modules/hiring-pipeline.json">o exemplo with-modules</a>.</p>
    ` },

    { id: 'themes', label: 'Temas', render: () => `
      <h2>Temas</h2>
      <p>Quatro temas built-in, cada um com modo claro e escuro. Abra <strong>Settings</strong> (ícone de engrenagem no header) para trocar.</p>

      <h3>Temas disponíveis</h3>
      <ul>
        <li><strong>Paper</strong> — esquema editorial. Fraunces (serifa) + Inter Tight + JetBrains Mono. Papel, tinta, accent terracota.</li>
        <li><strong>Mono</strong> — terminal brutalista. JetBrains Mono em tudo. Preto e branco puros.</li>
        <li><strong>Mid-Century</strong> — poster editorial Wes Anderson. Playfair Display + Inter. Mostarda, verde-azulado, creme.</li>
        <li><strong>Blueprint</strong> — desenho técnico. Special Elite (typewriter) + Inter. Azul-marinho sobre creme no claro, navy + ciano no escuro, com grade pontilhada.</li>
      </ul>

      <h3>URL overrides</h3>
      <pre><code>?theme=blueprint&amp;mode=dark</code></pre>

      <h3>Preview ao vivo</h3>
      <ul>
        <li><a href="../?theme=paper&amp;mode=light#hiring-pipeline">Paper · claro</a></li>
        <li><a href="../?theme=mono&amp;mode=dark#hiring-pipeline">Mono · escuro</a></li>
        <li><a href="../?theme=midcentury&amp;mode=light#hiring-pipeline">Mid-Century · claro</a></li>
        <li><a href="../?theme=blueprint&amp;mode=dark#hiring-pipeline">Blueprint · escuro</a></li>
      </ul>
    ` },

    { id: 'share', label: 'Share', render: () => `
      <h2>Share</h2>
      <p>Clique no ícone de share (três pontos conectados) no header pra abrir o modal. Cinco estratégias. <strong>Todas rodam client-side</strong> — o viewer não hospeda dados seus.</p>

      <div class="callout">
        Toda opção de share, exceto a primeira, usa um serviço de terceiros. Não controlamos esses serviços e não damos garantia de privacidade ou uptime. Você é responsável pelo conteúdo que compartilha.
      </div>

      <h3>1. Download JSON</h3>
      <p>Salva o mapa como <code>lifecycle-map-YYYY-MM-DD.json</code> no seu disco. Sem upload, sem URL.</p>

      <h3>2. URL embutida</h3>
      <p>Gzip + base64url do JSON no fragment da URL. Nada é enviado. Funciona offline depois de aberto.</p>

      <h3>3. catbox.moe</h3>
      <p>Upload anônimo, permanente, JSON publicamente legível.</p>

      <h3>4. 0x0.st</h3>
      <p>Upload anônimo, URL curtíssima, mas expira (30d–1ano).</p>

      <h3>5. Imagem criptografada</h3>
      <ol>
        <li>JSON é gzipado, criptografado com AES-GCM (chave derivada da senha via PBKDF2-SHA256 200k iterações)</li>
        <li>Ciphertext escondido no LSB de uma PNG de ruído aleatório</li>
        <li>PNG enviado pro catbox.moe — o host só vê uma imagem</li>
        <li>Destinatário abre <code>#img=&lt;url&gt;</code>, digita a senha, viewer descriptografa no browser</li>
      </ol>
      <p>Senha: auto-gerada (8 dígitos) ou custom (≥ 6 chars). Para segurança real, compartilhe URL e senha por canais separados.</p>
    ` },

    { id: 'navigation', label: 'Navegar no mapa', render: () => `
      <h2>Navegando no mapa</h2>

      <h3>Pan + scroll</h3>
      <ul>
        <li>Arraste qualquer área vazia do canvas pra pan</li>
        <li>Trackpad / wheel pra scroll vertical e horizontal</li>
        <li>Phase headers ficam fixos no topo; lane labels fixos à esquerda</li>
      </ul>

      <h3>Caminhada por teclado</h3>
      <p>Pressione <kbd>→</kbd> pra avançar pro próximo passo no fluxo natural. <kbd>←</kbd> volta.</p>

      <h3>Clicar num node</h3>
      <p>Abre o drawer com detalhes: objective, entities, actors, triggers, narrativas today/tomorrow, modules, e links para nodes upstream/downstream.</p>

      <h3>Clicar numa edge</h3>
      <p>Abre o drawer da edge: from/to, contexto de lane e phase, se é forward ou backward.</p>

      <h3>Fechar drawer</h3>
      <p>Clique no scrim, pressione <kbd>Esc</kbd>, ou clique no × no canto.</p>
    ` },

    { id: 'agents', label: 'Com agentes AI', render: () => `
      <h2>Com agentes AI</h2>
      <p>Um agente (Claude Code, Cursor, ChatGPT com tools) pode gerar um lifecycle map e entregar ao usuário uma URL renderizada de uma vez.</p>

      <h3>Padrão recomendado (mapas pequenos)</h3>
      <pre><code>JSON='{"lanes":[...],"phases":[...],"nodes":[...],"edges":[...]}'
ENCODED=$(echo "$JSON" | gzip -9 | base64 | tr -d '\\n' | tr '+/' '-_' | tr -d '=')
echo "https://zalkowitsch.github.io/lifecycle-map/#data=$ENCODED"</code></pre>

      <h3>Para mapas maiores</h3>
      <p>Publique um gist e use <code>?src=&lt;raw-url&gt;</code>.</p>

      <h3>Template de prompt</h3>
      <blockquote>
        Você está desenhando um lifecycle map. Output apenas JSON válido seguindo este schema:
        lanes (atores), phases (estágios), nodes ({ id, lane, phase, title, objective, today: { mode, narrative }, tomorrow: { mode, narrative } }), edges ({ from, to }).
        Depois comprima e embuta numa URL.
      </blockquote>
    ` },

    { id: 'examples', label: 'Exemplos', render: () => `
      <h2>Exemplos</h2>
      <p>Cinco arquivos incluídos, cada um demonstrando uma combinação de features diferente. Cada trecho abaixo é tirado verbatim do arquivo real em <code>examples/</code>.</p>

      <h3>Mínimo</h3>
      <p>O menor mapa possível: duas lanes, duas phases, quatro nodes, sem conteúdo de drawer. <code>nodeTypes.step.layout</code> é vazio e todo node carrega um <code>context</code> vazio.</p>
      <pre><code>"nodeTypes": { "step": { "layout": [] } }
...
"nodes": [
  { "id": "ask", "lane": "user", "phase": "request",
    "title": { "en": "Ask question", "pt": "Fazer pergunta", "es": "Hacer pregunta" },
    "type": "step", "context": {} }
]</code></pre>
      <p><a href="../#minimal">Abrir no viewer →</a></p>

      <h3>Pipeline de contratação</h3>
      <p>O mapa de referência completo: 17 nodes, <code>modes</code> custom, títulos localizados, e um nodeType <code>step</code> tipado cujo layout percorre <code>Prose</code> → <code>KeyValue</code> → dois blocos <code>Section</code>/<code>List</code>/<code>Tile</code>. Este é o formato canônico de <code>nodeTypes</code> tipado + <code>context</code>.</p>
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
      <p>Cada node fornece o <code>context</code> correspondente a que o layout faz binding — <code>$objective</code>, <code>$meta</code>, <code>$modules</code>, <code>$states</code>:</p>
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
      <p><a href="../#hiring-pipeline">Abrir no viewer →</a></p>

      <h3>Pipeline de contratação (YAML)</h3>
      <p>O mesmo mapa escrito em YAML — mais enxuto, e um bom template para edição à mão. Strings localizadas viram mapas aninhados e os campos do node são lidos inline:</p>
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
      <p><a href="../#hiring-pipeline-yaml">Abrir no viewer →</a></p>

      <h3>Multi-idioma</h3>
      <p>Um mapa de triagem de suporte ao cliente com 6 nodes, totalmente traduzido EN/PT/ES, com um label <code>meta.context</code> de nível superior. Demonstra objetos <code>title</code>/<code>subtitle</code>/<code>context</code> localizados dirigindo o seletor de idioma.</p>
      <pre><code>"meta": {
  "title":    { "en": "Customer Support Triage", "pt": "Triagem de Suporte ao Cliente", "es": "Triaje de Soporte al Cliente" },
  "subtitle": { "en": "from ticket to resolution", "pt": "do ticket à resolução", "es": "del ticket a la resolución" },
  "context":  { "en": "support · multi-language demo", "pt": "suporte · demo multi-idioma", "es": "soporte · demo multi-idioma" },
  "default_lang": "en"
}</code></pre>
      <p><a href="../#multi-language">Abrir no viewer →</a></p>

      <h3>Com modules compartilhados</h3>
      <p>Mesmo pipeline de contratação, mas os modules são puxados de um catálogo compartilhado via <code>meta.modules_source</code> e referenciados por id a partir do <code>context.modules</code> de cada node. Útil quando muitos nodes compartilham o mesmo inventário de features.</p>
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
      <p>O catálogo (<code>modules.json</code>) indexa cada module por id, com nomes localizados e levels <code>today</code>/<code>tomorrow</code>:</p>
      <pre><code>"modules": {
  "ats:resume-parser": {
    "name": { "en": "Resume parser", "pt": "Parser de currículo", "es": "Parser de CV" },
    "today": "automated",
    "tomorrow": "ai",
    "tags": [{ "en": "★ Tablestakes", "pt": "★ Básico", "es": "★ Básico" }]
  }
}</code></pre>
      <p><a href="../#hiring-pipeline-modules">Abrir no viewer →</a></p>

      <h3>Links diretos por tema</h3>
      <ul>
        <li><a href="../?theme=mono&amp;mode=dark#hiring-pipeline">Pipeline de contratação em mono dark</a></li>
        <li><a href="../?theme=blueprint&amp;mode=dark#hiring-pipeline">Pipeline de contratação em blueprint dark</a></li>
        <li><a href="../?theme=midcentury&amp;mode=light#multi-language">Multi-idioma em mid-century light</a></li>
      </ul>

      <p>Os arquivos-fonte estão em <a href="https://github.com/zalkowitsch/lifecycle-map/tree/main/examples">examples/</a>.</p>
    ` },

    { id: 'faq', label: 'FAQ', render: () => `
      <h2>FAQ</h2>

      <h3>Posso embutir isso no meu site?</h3>
      <p>Sim — clone o repo, hospede <code>index.html</code> + <code>viewer.js</code> + <code>share.js</code> + <code>themes.css</code> em qualquer host estático.</p>

      <h3>Funciona offline?</h3>
      <p>O viewer precisa de fontes e parser YAML via CDN no primeiro load. Depois disso, a página fica em cache.</p>

      <h3>Quão grande pode ser um mapa?</h3>
      <p>O renderer aguenta 100+ nodes tranquilo. Acima de 200 fica denso — divida em múltiplos mapas.</p>

      <h3>Por que os pontinhos de mode estão todos da mesma cor cinza?</h3>
      <p>Você provavelmente não declarou <code>meta.modes</code> e seus nodes usam strings ad-hoc. O viewer auto-gera cores distintas para qualquer string de mode que vê — se você viu isso numa versão antiga, atualize.</p>

      <h3>Edges backward (loops) podem ser estilizadas diferente?</h3>
      <p>Já são — auto-renderizam como linhas tracejadas roteadas acima ou abaixo das swim lanes. Detecção é automática.</p>

      <h3>Existe API pra uso programático?</h3>
      <p>Sem backend. O viewer é JS-only. Pra embutir em outro app, renderize <code>&lt;iframe&gt;</code> apontando pro viewer com <code>?src=</code> ou <code>#data=</code>.</p>

      <h3>Como reporto um bug?</h3>
      <p>Abra uma issue no <a href="https://github.com/zalkowitsch/lifecycle-map/issues">GitHub</a>.</p>

      <h3>Licença?</h3>
      <p>MIT.</p>
    ` },
  ];
})();
