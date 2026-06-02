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
      <ul>
        <li><a href="../#minimal">Mínimo</a> · o menor mapa possível, agora com EN/PT/ES</li>
        <li><a href="../#hiring-pipeline">Pipeline de contratação</a> · exemplo completo: 17 nodes, today/tomorrow, modules, modes custom, títulos localizados</li>
        <li><a href="../#hiring-pipeline-yaml">Pipeline de contratação (YAML)</a> · mesmo mapa em YAML, incluindo narrativas localizadas</li>
        <li><a href="../#multi-language">Multi-idioma</a> · exemplo de triagem de suporte, totalmente traduzido EN/PT/ES</li>
        <li><a href="../#hiring-pipeline-modules">Com modules compartilhados</a> · padrão de referência por catálogo</li>
      </ul>

      <h3>Links diretos por tema</h3>
      <ul>
        <li><a href="../?theme=mono&amp;mode=dark#hiring-pipeline">Pipeline em mono dark</a></li>
        <li><a href="../?theme=blueprint&amp;mode=dark#hiring-pipeline">Pipeline em blueprint dark</a></li>
        <li><a href="../?theme=midcentury&amp;mode=light#multi-language">Multi-idioma em mid-century light</a></li>
      </ul>
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
