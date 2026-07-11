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

      <p><a href="../#interview-loop">Abrir renderizado ↗</a></p>
      <details class="example-src"><summary>Ver código fuente</summary>
      <pre><code>{
  "meta": {
    "title": "Interview Loop",
    "subtitle": "rounds, rubric signals, and how a candidate moves from screen to decision",
    "default_lang": "en",
    "nodeTypes": {
      "round": {
        "layout": [
          {
            "type": "Prose",
            "bind": "$objective"
          },
          {
            "type": "KeyValue",
            "bind": "$meta"
          },
          {
            "type": "Section",
            "title": "Signals",
            "sub": "$signalsSub",
            "children": [
              {
                "type": "List",
                "bind": "$signals",
                "item": {
                  "type": "Tile",
                  "title": "$name",
                  "sub": "$id",
                  "pills": "$levels",
                  "tags": "$tags"
                }
              }
            ]
          }
        ]
      }
    }
  },
  "lanes": [
    {
      "id": "candidate",
      "label": "Candidate",
      "sub": "the person being evaluated"
    },
    {
      "id": "interviewers",
      "label": "Interviewers",
      "sub": "panel · gather signal"
    },
    {
      "id": "hiring-manager",
      "label": "Hiring Manager",
      "sub": "owns the hire"
    },
    {
      "id": "committee",
      "label": "Committee",
      "sub": "calibration · final call"
    }
  ],
  "phases": [
    {
      "id": "screen",
      "label": "Screen",
      "roman": "I"
    },
    {
      "id": "onsite",
      "label": "Onsite",
      "roman": "II"
    },
    {
      "id": "debrief",
      "label": "Debrief",
      "roman": "III"
    },
    {
      "id": "decision",
      "label": "Decision",
      "roman": "IV"
    }
  ],
  "nodes": [
    {
      "id": "recruiterScreen",
      "lane": "interviewers",
      "phase": "screen",
      "col": 0,
      "title": "Recruiter screen",
      "sub": "30 min · fit + motivation",
      "type": "round",
      "context": {
        "objective": "Confirm baseline fit, motivation, and logistics before investing the panel's time. Lightweight signal, high throughput.",
        "meta": [
          {
            "label": "Format",
            "value": "30 min call · structured script"
          },
          {
            "label": "Interviewer",
            "value": "Recruiter or sourcer"
          },
          {
            "label": "Outcome",
            "value": "Advance to onsite · or kind reject"
          }
        ],
        "signalsSub": "what this round is calibrated to detect",
        "signals": [
          {
            "name": "Motivation &amp; fit",
            "id": "sig:motivation",
            "levels": [
              {
                "label": "L1"
              },
              {
                "label": "L3"
              }
            ],
            "tags": [
              "Behavioral"
            ]
          },
          {
            "name": "Communication clarity",
            "id": "sig:comms",
            "levels": [
              {
                "label": "L1"
              },
              {
                "label": "L4"
              }
            ],
            "tags": [
              "Communication"
            ]
          }
        ]
      }
    },
    {
      "id": "codingRound",
      "lane": "interviewers",
      "phase": "onsite",
      "col": 0,
      "title": "Coding round",
      "sub": "60 min · live problem",
      "type": "round",
      "context": {
        "objective": "Probe hands-on problem solving: can the candidate decompose a problem, write working code, and reason about correctness and complexity under time pressure?",
        "meta": [
          {
            "label": "Format",
            "value": "60 min · shared editor"
          },
          {
            "label": "Interviewer",
            "value": "Senior+ engineer"
          },
          {
            "label": "Outcome",
            "value": "Scorecard with hire/no-hire vote"
          }
        ],
        "signalsSub": "rubric dimensions scored in this round",
        "signals": [
          {
            "name": "Problem decomposition",
            "id": "sig:decomp",
            "levels": [
              {
                "label": "L1"
              },
              {
                "label": "L4"
              }
            ],
            "tags": [
              "Analytical"
            ]
          },
          {
            "name": "Code fluency",
            "id": "sig:fluency",
            "levels": [
              {
                "label": "L1"
              },
              {
                "label": "L4"
              }
            ],
            "tags": [
              "Coding"
            ]
          },
          {
            "name": "Complexity reasoning",
            "id": "sig:complexity",
            "levels": [
              {
                "label": "L2"
              },
              {
                "label": "L4"
              }
            ],
            "tags": [
              "Analytical",
              "CS"
            ]
          }
        ]
      }
    },
    {
      "id": "systemDesignRound",
      "lane": "interviewers",
      "phase": "onsite",
      "col": 1,
      "title": "System design round",
      "sub": "60 min · open-ended",
      "type": "round",
      "context": {
        "objective": "Evaluate how the candidate scopes an ambiguous problem, makes trade-offs across components, and defends a design under constraints like scale and failure modes.",
        "meta": [
          {
            "label": "Format",
            "value": "60 min · whiteboard / virtual"
          },
          {
            "label": "Interviewer",
            "value": "Staff+ engineer"
          },
          {
            "label": "Outcome",
            "value": "Scorecard with hire/no-hire vote"
          }
        ],
        "signalsSub": "rubric dimensions scored in this round",
        "signals": [
          {
            "name": "Scoping &amp; requirements",
            "id": "sig:scoping",
            "levels": [
              {
                "label": "L2"
              },
              {
                "label": "L5"
              }
            ],
            "tags": [
              "Design"
            ]
          },
          {
            "name": "Trade-off reasoning",
            "id": "sig:tradeoffs",
            "levels": [
              {
                "label": "L2"
              },
              {
                "label": "L5"
              }
            ],
            "tags": [
              "Design",
              "Analytical"
            ]
          },
          {
            "name": "Failure &amp; scale awareness",
            "id": "sig:scale",
            "levels": [
              {
                "label": "L3"
              },
              {
                "label": "L5"
              }
            ],
            "tags": [
              "Reliability"
            ]
          }
        ]
      }
    },
    {
      "id": "behavioralRound",
      "lane": "interviewers",
      "phase": "onsite",
      "col": 1,
      "title": "Behavioral round",
      "sub": "45 min · past experience",
      "type": "round",
      "context": {
        "objective": "Surface evidence of collaboration, ownership, and how the candidate handles conflict and ambiguity, grounded in concrete past situations rather than hypotheticals.",
        "meta": [
          {
            "label": "Format",
            "value": "45 min · STAR-style prompts"
          },
          {
            "label": "Interviewer",
            "value": "Cross-functional partner"
          },
          {
            "label": "Outcome",
            "value": "Scorecard with hire/no-hire vote"
          }
        ],
        "signalsSub": "rubric dimensions scored in this round",
        "signals": [
          {
            "name": "Ownership &amp; impact",
            "id": "sig:ownership",
            "levels": [
              {
                "label": "L2"
              },
              {
                "label": "L5"
              }
            ],
            "tags": [
              "Behavioral",
              "Leadership"
            ]
          },
          {
            "name": "Collaboration &amp; conflict",
            "id": "sig:collab",
            "levels": [
              {
                "label": "L1"
              },
              {
                "label": "L4"
              }
            ],
            "tags": [
              "Behavioral"
            ]
          }
        ]
      }
    },
    {
      "id": "hmRound",
      "lane": "hiring-manager",
      "phase": "onsite",
      "col": 1,
      "title": "Hiring manager round",
      "sub": "45 min · role &amp; team fit",
      "type": "round",
      "context": {
        "objective": "Hiring manager assesses fit for the specific team and level, depth in the candidate's claimed domain, and whether the role's day-to-day will motivate them.",
        "meta": [
          {
            "label": "Format",
            "value": "45 min · conversational + deep dive"
          },
          {
            "label": "Interviewer",
            "value": "Hiring manager"
          },
          {
            "label": "Outcome",
            "value": "Scorecard + level read"
          }
        ],
        "signalsSub": "rubric dimensions scored in this round",
        "signals": [
          {
            "name": "Domain depth",
            "id": "sig:domain",
            "levels": [
              {
                "label": "L2"
              },
              {
                "label": "L5"
              }
            ],
            "tags": [
              "Technical"
            ]
          },
          {
            "name": "Team &amp; role fit",
            "id": "sig:rolefit",
            "levels": [
              {
                "label": "L1"
              },
              {
                "label": "L4"
              }
            ],
            "tags": [
              "Fit"
            ]
          },
          {
            "name": "Level calibration",
            "id": "sig:level",
            "levels": [
              {
                "label": "L2"
              },
              {
                "label": "L5"
              }
            ],
            "tags": [
              "Calibration"
            ]
          }
        ]
      }
    },
    {
      "id": "debriefRound",
      "lane": "committee",
      "phase": "debrief",
      "col": 0,
      "title": "Debrief",
      "sub": "panel converges on a recommendation",
      "type": "round",
      "context": {
        "objective": "Aggregate every scorecard, surface divergences between interviewers, and converge on a single hire / no-hire recommendation with explicit rationale before it reaches the committee.",
        "meta": [
          {
            "label": "Format",
            "value": "45 min · all scorecards submitted first"
          },
          {
            "label": "Facilitator",
            "value": "Hiring manager · recruiter scribes"
          },
          {
            "label": "Outcome",
            "value": "Recommendation packet to committee"
          }
        ],
        "signalsSub": "what the debrief reconciles across rounds",
        "signals": [
          {
            "name": "Signal coverage",
            "id": "sig:coverage",
            "levels": [
              {
                "label": "L1"
              },
              {
                "label": "L5"
              }
            ],
            "tags": [
              "Process"
            ]
          },
          {
            "name": "Divergence resolution",
            "id": "sig:divergence",
            "levels": [
              {
                "label": "L2"
              },
              {
                "label": "L5"
              }
            ],
            "tags": [
              "Calibration"
            ]
          }
        ]
      }
    }
  ],
  "edges": [
    {
      "source": "recruiterScreen",
      "target": "codingRound"
    },
    {
      "source": "codingRound",
      "target": "systemDesignRound"
    },
    {
      "source": "systemDesignRound",
      "target": "behavioralRound"
    },
    {
      "source": "behavioralRound",
      "target": "hmRound"
    },
    {
      "source": "hmRound",
      "target": "debriefRound"
    },
    {
      "source": "codingRound",
      "target": "debriefRound"
    },
    {
      "source": "systemDesignRound",
      "target": "debriefRound"
    },
    {
      "source": "behavioralRound",
      "target": "debriefRound"
    }
  ]
}</code></pre>
      </details>

      <h3>2 · Pipeline de contratación / flujo ATS</h3>
      <p>Aleja el zoom de un loop al funnel completo: sourcing → screen → phone → onsite → decisión → oferta → onboard. Cada paso tiene un estado <strong>hoy</strong> y <strong>mañana</strong> (manual vs. aumentado con IA) más una <code>List</code> de módulos de soporte. Por qué encaja: mapea los handoffs entre sourcer, recruiter, hiring manager y aprobador que un Kanban plano esconde, y la división hoy/mañana lo convierte además en un roadmap de automatización. Este es el ejemplo <a href="../#hiring-pipeline">hiring-pipeline</a> incluido.</p>
      <ul>
        <li><strong>Lanes</strong> → candidato, sourcer, recruiter, hiring manager, entrevistador, aprobador.</li>
        <li><strong>Phases</strong> → las seis etapas del funnel.</li>
        <li><strong>Nodes</strong> → pasos con <code>states</code> (Tiles Hoy/Mañana) y <code>modules</code>.</li>
      </ul>

      <p><a href="../#hiring-funnel">Abrir renderizado ↗</a></p>
      <details class="example-src"><summary>Ver código fuente</summary>
      <pre><code>{
  "meta": {
    "title": "Hiring Funnel",
    "subtitle": "ATS funnel from sourcing to onboarding · today vs. AI-augmented",
    "default_lang": "en",
    "modes": [
      {
        "id": "manual",
        "label": "Manual",
        "color": "#b91c1c"
      },
      {
        "id": "assisted",
        "label": "Assisted",
        "color": "#a16207"
      },
      {
        "id": "automated",
        "label": "Automated",
        "color": "#1e40af"
      },
      {
        "id": "ai",
        "label": "AI-augmented",
        "color": "#047857"
      }
    ],
    "nodeTypes": {
      "step": {
        "layout": [
          {
            "type": "Prose",
            "bind": "$objective"
          },
          {
            "type": "KeyValue",
            "bind": "$meta"
          },
          {
            "type": "Section",
            "title": "Modules",
            "sub": "$modulesSub",
            "children": [
              {
                "type": "List",
                "bind": "$modules",
                "item": {
                  "type": "Tile",
                  "title": "$name",
                  "sub": "$id",
                  "pills": "$levels"
                }
              }
            ]
          },
          {
            "type": "Section",
            "title": "States",
            "children": [
              {
                "type": "List",
                "bind": "$states",
                "item": {
                  "type": "Tile",
                  "title": "$label",
                  "sub": "$mode",
                  "pills": "$tools"
                }
              }
            ]
          }
        ]
      }
    }
  },
  "lanes": [
    {
      "id": "candidate",
      "label": "Candidate",
      "sub": "the person being hired"
    },
    {
      "id": "sourcer",
      "label": "Sourcer",
      "sub": "top of funnel"
    },
    {
      "id": "recruiter",
      "label": "Recruiter",
      "sub": "owns the process"
    },
    {
      "id": "hiring-manager",
      "label": "Hiring Manager",
      "sub": "owns the hire"
    },
    {
      "id": "interviewer",
      "label": "Interviewer",
      "sub": "gathers signal"
    },
    {
      "id": "approver",
      "label": "Approver",
      "sub": "final sign-off"
    }
  ],
  "phases": [
    {
      "id": "sourcing",
      "label": "Sourcing",
      "roman": "I"
    },
    {
      "id": "screen",
      "label": "Screen",
      "roman": "II"
    },
    {
      "id": "phone",
      "label": "Phone",
      "roman": "III"
    },
    {
      "id": "onsite",
      "label": "Onsite",
      "roman": "IV"
    },
    {
      "id": "decision",
      "label": "Decision",
      "roman": "V"
    },
    {
      "id": "offer",
      "label": "Offer &amp; Onboard",
      "roman": "VI"
    }
  ],
  "nodes": [
    {
      "id": "sourceCandidates",
      "lane": "sourcer",
      "phase": "sourcing",
      "col": 0,
      "title": "Source candidates",
      "sub": "build top of funnel",
      "type": "step",
      "context": {
        "objective": "Build a pipeline of qualified candidates through outbound search, referrals, and inbound applications.",
        "meta": [
          {
            "label": "Entity",
            "value": "Candidate pool · Outreach campaign"
          },
          {
            "label": "Actors",
            "value": "Sourcer drives outbound · Recruiter reviews inbound"
          },
          {
            "label": "Next",
            "value": "Qualified candidates move to resume screen."
          }
        ],
        "modulesSub": "supporting tools",
        "modules": [
          {
            "name": "LinkedIn search",
            "id": "mod-search",
            "levels": [
              "assisted",
              "ai"
            ]
          },
          {
            "name": "Outreach templates",
            "id": "mod-outreach",
            "levels": [
              "manual",
              "ai"
            ]
          }
        ],
        "states": [
          {
            "label": "Today",
            "mode": "Manual",
            "tools": [
              "LinkedIn Recruiter",
              "ATS",
              "Email templates"
            ]
          },
          {
            "label": "Tomorrow",
            "mode": "AI-augmented",
            "tools": [
              "AI sourcing scoring",
              "Personalized outreach"
            ]
          }
        ]
      }
    },
    {
      "id": "apply",
      "lane": "candidate",
      "phase": "sourcing",
      "col": 1,
      "title": "Apply / respond",
      "sub": "enters the funnel",
      "type": "step",
      "context": {
        "objective": "Candidate responds to outbound outreach or applies through a job board.",
        "meta": [
          {
            "label": "Entity",
            "value": "Application · Resume"
          },
          {
            "label": "Actors",
            "value": "Candidate submits · ATS captures"
          },
          {
            "label": "Next",
            "value": "Recruiter screens the application."
          }
        ],
        "modulesSub": "supporting tools",
        "modules": [
          {
            "name": "Application form",
            "id": "mod-apply",
            "levels": [
              "automated"
            ]
          }
        ],
        "states": [
          {
            "label": "Today",
            "mode": "Manual",
            "tools": [
              "ATS form",
              "Resume parser"
            ]
          },
          {
            "label": "Tomorrow",
            "mode": "AI-augmented",
            "tools": [
              "Conversational intake agent"
            ]
          }
        ]
      }
    },
    {
      "id": "resumeScreen",
      "lane": "recruiter",
      "phase": "screen",
      "col": 0,
      "title": "Resume screen",
      "sub": "first signal pass",
      "type": "step",
      "context": {
        "objective": "Filter the candidate pool down to a set worth phone-screening using a rubric.",
        "meta": [
          {
            "label": "Entity",
            "value": "Resume · Screening rubric"
          },
          {
            "label": "Actors",
            "value": "Recruiter reads · HM spot-checks edge cases"
          },
          {
            "label": "Next",
            "value": "Pass to phone screen, or send rejection."
          }
        ],
        "modulesSub": "supporting tools",
        "modules": [
          {
            "name": "Resume scoring",
            "id": "mod-score",
            "levels": [
              "manual",
              "ai"
            ]
          },
          {
            "name": "Rejection email",
            "id": "mod-reject",
            "levels": [
              "assisted",
              "automated"
            ]
          }
        ],
        "states": [
          {
            "label": "Today",
            "mode": "Manual",
            "tools": [
              "ATS",
              "Email templates"
            ]
          },
          {
            "label": "Tomorrow",
            "mode": "AI-augmented",
            "tools": [
              "Rubric-based AI screening",
              "Reject reason capture"
            ]
          }
        ]
      }
    },
    {
      "id": "phoneScreen",
      "lane": "recruiter",
      "phase": "phone",
      "col": 0,
      "title": "Phone screen",
      "sub": "30 min · fit + motivation",
      "type": "step",
      "context": {
        "objective": "Validate motivation, basic fit, and salary expectations on a short call.",
        "meta": [
          {
            "label": "Entity",
            "value": "Screen notes · Scorecard"
          },
          {
            "label": "Actors",
            "value": "Recruiter leads · Candidate answers and asks"
          },
          {
            "label": "Next",
            "value": "Pass to onsite loop, or send rejection."
          }
        ],
        "modulesSub": "supporting tools",
        "modules": [
          {
            "name": "Note-taking",
            "id": "mod-notes",
            "levels": [
              "manual",
              "ai"
            ]
          },
          {
            "name": "Question library",
            "id": "mod-questions",
            "levels": [
              "manual",
              "assisted"
            ]
          }
        ],
        "states": [
          {
            "label": "Today",
            "mode": "Manual",
            "tools": [
              "ATS scorecard",
              "Notepad"
            ]
          },
          {
            "label": "Tomorrow",
            "mode": "AI-augmented",
            "tools": [
              "Ambient transcription",
              "Auto-filled scorecard"
            ]
          }
        ]
      }
    },
    {
      "id": "onsiteLoop",
      "lane": "interviewer",
      "phase": "onsite",
      "col": 0,
      "title": "Run interviews",
      "sub": "coding · design · behavioral",
      "type": "step",
      "context": {
        "objective": "Gather structured signal across coding, system design, and behavioral dimensions.",
        "meta": [
          {
            "label": "Entity",
            "value": "Interview · Scorecard · Hire vote"
          },
          {
            "label": "Actors",
            "value": "Interviewer conducts · debriefs in scorecard"
          },
          {
            "label": "Next",
            "value": "Each interviewer submits a hire/no-hire vote."
          }
        ],
        "modulesSub": "supporting tools",
        "modules": [
          {
            "name": "Question bank",
            "id": "mod-bank",
            "levels": [
              "assisted",
              "ai"
            ]
          },
          {
            "name": "Scorecard draft",
            "id": "mod-card",
            "levels": [
              "manual",
              "ai"
            ]
          },
          {
            "name": "Vote capture",
            "id": "mod-vote",
            "levels": [
              "manual",
              "automated"
            ]
          }
        ],
        "states": [
          {
            "label": "Today",
            "mode": "Manual",
            "tools": [
              "Question bank doc",
              "ATS scorecard",
              "Shared editor"
            ]
          },
          {
            "label": "Tomorrow",
            "mode": "AI-augmented",
            "tools": [
              "Interview transcription",
              "Generated scorecard draft"
            ]
          }
        ]
      }
    },
    {
      "id": "debrief",
      "lane": "hiring-manager",
      "phase": "decision",
      "col": 0,
      "title": "Debrief",
      "sub": "panel converges",
      "type": "step",
      "context": {
        "objective": "Panel reads all scorecards, discusses each interview, and converges on a recommendation.",
        "meta": [
          {
            "label": "Entity",
            "value": "Debrief notes · Recommendation"
          },
          {
            "label": "Actors",
            "value": "HM facilitates · Interviewers present"
          },
          {
            "label": "Next",
            "value": "Recommendation goes to approver."
          }
        ],
        "modulesSub": "supporting tools",
        "modules": [
          {
            "name": "Scorecard aggregation",
            "id": "mod-agg",
            "levels": [
              "manual",
              "ai"
            ]
          },
          {
            "name": "Divergence detection",
            "id": "mod-diverge",
            "levels": [
              "manual",
              "ai"
            ]
          }
        ],
        "states": [
          {
            "label": "Today",
            "mode": "Manual",
            "tools": [
              "Zoom",
              "ATS scorecards"
            ]
          },
          {
            "label": "Tomorrow",
            "mode": "AI-augmented",
            "tools": [
              "Pre-read synthesis brief",
              "Risk flags"
            ]
          }
        ]
      }
    },
    {
      "id": "approve",
      "lane": "approver",
      "phase": "decision",
      "col": 1,
      "title": "Approve / reject",
      "sub": "VP or Director sign-off",
      "type": "step",
      "context": {
        "objective": "Final hiring authority reviews the recommendation, checks comp and level calibration, makes the call.",
        "meta": [
          {
            "label": "Entity",
            "value": "Decision · Comp recommendation"
          },
          {
            "label": "Actors",
            "value": "Approver reviews packet · decides"
          },
          {
            "label": "Next",
            "value": "Approve to prepare offer, or send rejection."
          }
        ],
        "modulesSub": "supporting tools",
        "modules": [
          {
            "name": "Calibration packet",
            "id": "mod-cal",
            "levels": [
              "assisted",
              "ai"
            ]
          }
        ],
        "states": [
          {
            "label": "Today",
            "mode": "Manual",
            "tools": [
              "ATS",
              "Comp sheet"
            ]
          },
          {
            "label": "Tomorrow",
            "mode": "AI-augmented",
            "tools": [
              "Calibration vs past hires",
              "Suggested comp range"
            ]
          }
        ]
      }
    },
    {
      "id": "offerOnboard",
      "lane": "recruiter",
      "phase": "offer",
      "col": 0,
      "title": "Offer &amp; onboard",
      "sub": "extend · accept · day 1",
      "type": "step",
      "context": {
        "objective": "Build and extend the offer, then take the accepted candidate to a productive Day 1.",
        "meta": [
          {
            "label": "Entity",
            "value": "Offer letter · Onboarding checklist"
          },
          {
            "label": "Actors",
            "value": "Recruiter extends · Candidate decides · People Ops onboards"
          },
          {
            "label": "Next",
            "value": "Accepted candidate starts on Day 1."
          }
        ],
        "modulesSub": "supporting tools",
        "modules": [
          {
            "name": "Offer generation",
            "id": "mod-offer",
            "levels": [
              "assisted",
              "automated"
            ]
          },
          {
            "name": "Onboarding pipeline",
            "id": "mod-onboard",
            "levels": [
              "manual",
              "automated"
            ]
          }
        ],
        "states": [
          {
            "label": "Today",
            "mode": "Manual",
            "tools": [
              "DocuSign",
              "Notion checklist",
              "IT tickets"
            ]
          },
          {
            "label": "Tomorrow",
            "mode": "AI-augmented",
            "tools": [
              "Auto-generated offer",
              "Provisioning pipeline"
            ]
          }
        ]
      }
    }
  ],
  "edges": [
    {
      "source": "sourceCandidates",
      "target": "apply"
    },
    {
      "source": "apply",
      "target": "resumeScreen"
    },
    {
      "source": "resumeScreen",
      "target": "phoneScreen"
    },
    {
      "source": "phoneScreen",
      "target": "onsiteLoop"
    },
    {
      "source": "onsiteLoop",
      "target": "debrief"
    },
    {
      "source": "debrief",
      "target": "approve"
    },
    {
      "source": "approve",
      "target": "offerOnboard"
    },
    {
      "source": "resumeScreen",
      "target": "sourceCandidates"
    }
  ]
}</code></pre>
      </details>

      <h3>3 · Soporte al cliente / triaje</h3>
      <p>Del ticket entrante a la resolución: intake → clasificar → enrutar → resolver → seguimiento. Las lanes reparten el trabajo entre el cliente, la capa de bot/auto-triaje, tier-1 y el equipo de escalación. Por qué encaja: el triaje es un problema de enrutamiento con ownership explícito en cada salto — las lanes hacen visible el límite de escalación, y los edges (incluyendo loops hacia atrás para tickets reabiertos) muestran dónde rebota el trabajo. El drawer por node puede cargar objetivos de SLA en un <code>KeyValue</code> y <code>Pills</code> de canal.</p>
      <ul>
        <li><strong>Lanes</strong> → cliente, auto-triaje, tier-1, tier-2 / escalación.</li>
        <li><strong>Phases</strong> → intake → clasificar → enrutar → resolver → seguimiento.</li>
        <li><strong>Nodes</strong> → pasos de atención; edges hacia atrás para reabrir / reenrutar.</li>
      </ul>

      <p><a href="../#support-triage">Abrir renderizado ↗</a></p>
      <details class="example-src"><summary>Ver código fuente</summary>
      <pre><code>{
  "meta": {
    "title": "Support Triage",
    "subtitle": "from inbound contact to resolution and follow-up",
    "default_lang": "en",
    "nodeTypes": {
      "step": {
        "layout": [
          {
            "type": "Prose",
            "bind": "$objective"
          },
          {
            "type": "KeyValue",
            "bind": "$meta"
          },
          {
            "type": "Section",
            "title": "Channels",
            "children": [
              {
                "type": "Pills",
                "bind": "$channels"
              }
            ]
          }
        ]
      }
    }
  },
  "lanes": [
    {
      "id": "customer",
      "label": "Customer"
    },
    {
      "id": "auto-triage",
      "label": "Auto-triage"
    },
    {
      "id": "tier-1",
      "label": "Tier 1"
    },
    {
      "id": "tier-2",
      "label": "Tier 2"
    }
  ],
  "phases": [
    {
      "id": "intake",
      "label": "Intake"
    },
    {
      "id": "classify",
      "label": "Classify"
    },
    {
      "id": "route",
      "label": "Route"
    },
    {
      "id": "resolve",
      "label": "Resolve"
    },
    {
      "id": "follow-up",
      "label": "Follow-up"
    }
  ],
  "nodes": [
    {
      "id": "submitTicket",
      "lane": "customer",
      "phase": "intake",
      "title": "Submit ticket",
      "sub": "customer reaches out",
      "type": "step",
      "context": {
        "objective": "Customer reports an issue or asks a question through any supported channel.",
        "meta": [
          {
            "label": "First response",
            "value": "1h"
          },
          {
            "label": "Resolution",
            "value": "24h"
          }
        ],
        "channels": [
          "Email",
          "Chat",
          "Phone"
        ]
      }
    },
    {
      "id": "classifyTicket",
      "lane": "auto-triage",
      "phase": "classify",
      "title": "Classify &amp; prioritize",
      "sub": "intent + severity",
      "type": "step",
      "context": {
        "objective": "Bot detects intent, tags category, and assigns a priority before a human sees the ticket.",
        "meta": [
          {
            "label": "First response",
            "value": "1h"
          },
          {
            "label": "Auto-classified",
            "value": "instant"
          }
        ],
        "channels": [
          "Email",
          "Chat",
          "Phone"
        ]
      }
    },
    {
      "id": "routeTicket",
      "lane": "auto-triage",
      "phase": "route",
      "title": "Route to queue",
      "sub": "skills-based routing",
      "type": "step",
      "context": {
        "objective": "Route the ticket to the right team based on category, priority, and agent skills.",
        "meta": [
          {
            "label": "Assignment",
            "value": "instant"
          },
          {
            "label": "Resolution",
            "value": "24h"
          }
        ],
        "channels": [
          "Email",
          "Chat"
        ]
      }
    },
    {
      "id": "tier1Resolve",
      "lane": "tier-1",
      "phase": "resolve",
      "title": "Tier 1 handling",
      "sub": "common issues",
      "type": "step",
      "context": {
        "objective": "Front-line agent resolves common issues or escalates anything that needs deeper expertise.",
        "meta": [
          {
            "label": "First response",
            "value": "1h"
          },
          {
            "label": "Resolution",
            "value": "24h"
          }
        ],
        "channels": [
          "Email",
          "Chat",
          "Phone"
        ]
      }
    },
    {
      "id": "tier2Resolve",
      "lane": "tier-2",
      "phase": "resolve",
      "title": "Tier 2 escalation",
      "sub": "complex cases",
      "type": "step",
      "context": {
        "objective": "Specialist investigates complex or technical cases that Tier 1 could not close.",
        "meta": [
          {
            "label": "First response",
            "value": "4h"
          },
          {
            "label": "Resolution",
            "value": "72h"
          }
        ],
        "channels": [
          "Email",
          "Chat"
        ]
      }
    },
    {
      "id": "followUp",
      "lane": "customer",
      "phase": "follow-up",
      "title": "Confirm &amp; follow up",
      "sub": "CSAT + reopen path",
      "type": "step",
      "context": {
        "objective": "Customer confirms the fix and rates the interaction. If unresolved, the ticket reopens.",
        "meta": [
          {
            "label": "Survey window",
            "value": "48h"
          },
          {
            "label": "Reopen window",
            "value": "7d"
          }
        ],
        "channels": [
          "Email",
          "Chat"
        ]
      }
    }
  ],
  "edges": [
    {
      "source": "submitTicket",
      "target": "classifyTicket"
    },
    {
      "source": "classifyTicket",
      "target": "routeTicket"
    },
    {
      "source": "routeTicket",
      "target": "tier1Resolve"
    },
    {
      "source": "tier1Resolve",
      "target": "tier2Resolve"
    },
    {
      "source": "tier1Resolve",
      "target": "followUp"
    },
    {
      "source": "tier2Resolve",
      "target": "followUp"
    },
    {
      "source": "followUp",
      "target": "routeTicket"
    }
  ]
}</code></pre>
      </details>

      <h3>4 · Onboarding / activación</h3>
      <p>Del signup al primer valor: creación de cuenta → setup → primera acción clave → hábito. Las lanes separan al usuario nuevo de los nudges automatizados del producto y del equipo de CS / onboarding. Por qué encaja: la activación es un funnel por etapas donde cada paso tiene un drop-off y un owner — modelarlo como nodes te deja adjuntar la métrica de activación y la intervención (email, in-app, toque humano) a cada etapa como <code>Pills</code> o una <code>List</code> de módulos. Hoy/mañana captura "hand-holding manual de CS ahora → self-serve después".</p>
      <ul>
        <li><strong>Lanes</strong> → usuario, producto (automatizado), CS / onboarding.</li>
        <li><strong>Phases</strong> → signup → setup → primera acción → activación → hábito.</li>
        <li><strong>Nodes</strong> → hitos con lane owner + intervención.</li>
      </ul>

      <p><a href="../#onboarding-activation">Abrir renderizado ↗</a></p>
      <details class="example-src"><summary>Ver código fuente</summary>
      <pre><code>{
  "meta": {
    "title": "Onboarding &amp; Activation",
    "subtitle": "from signup to habit · manual CS now vs. self-serve later",
    "default_lang": "en",
    "modes": [
      {
        "id": "manual",
        "label": "Manual CS",
        "color": "#b91c1c"
      },
      {
        "id": "self-serve",
        "label": "Self-serve",
        "color": "#047857"
      }
    ],
    "nodeTypes": {
      "milestone": {
        "layout": [
          {
            "type": "Prose",
            "bind": "$objective"
          },
          {
            "type": "KeyValue",
            "bind": "$meta"
          },
          {
            "type": "Section",
            "title": "Interventions",
            "children": [
              {
                "type": "Pills",
                "bind": "$interventions"
              }
            ]
          },
          {
            "type": "Section",
            "title": "States",
            "children": [
              {
                "type": "List",
                "bind": "$states",
                "item": {
                  "type": "Tile",
                  "title": "$label",
                  "sub": "$mode"
                }
              }
            ]
          }
        ]
      }
    }
  },
  "lanes": [
    {
      "id": "user",
      "label": "User",
      "sub": "the person activating"
    },
    {
      "id": "product",
      "label": "Product",
      "sub": "automated · in-app"
    },
    {
      "id": "cs-onboarding",
      "label": "CS Onboarding",
      "sub": "human touch · high-touch accounts"
    }
  ],
  "phases": [
    {
      "id": "signup",
      "label": "Signup",
      "roman": "I"
    },
    {
      "id": "setup",
      "label": "Setup",
      "roman": "II"
    },
    {
      "id": "first-action",
      "label": "First Action",
      "roman": "III"
    },
    {
      "id": "activation",
      "label": "Activation",
      "roman": "IV"
    },
    {
      "id": "habit",
      "label": "Habit",
      "roman": "V"
    }
  ],
  "nodes": [
    {
      "id": "createAccount",
      "lane": "user",
      "phase": "signup",
      "title": "Create account",
      "sub": "email or SSO",
      "type": "milestone",
      "context": {
        "objective": "User signs up and lands in the product for the first time, ready to be guided to value.",
        "meta": [
          {
            "label": "Activation metric",
            "value": "Signup completion rate"
          },
          {
            "label": "Owner",
            "value": "Growth PM"
          }
        ],
        "interventions": [
          "Welcome email",
          "In-app product tour",
          "Human touch (high-touch accounts only)"
        ],
        "states": [
          {
            "label": "Today",
            "mode": "manual"
          },
          {
            "label": "Tomorrow",
            "mode": "self-serve"
          }
        ]
      }
    },
    {
      "id": "configureWorkspace",
      "lane": "product",
      "phase": "setup",
      "title": "Configure workspace",
      "sub": "guided checklist",
      "type": "milestone",
      "context": {
        "objective": "User completes core setup steps so the product is usable for their team and use case.",
        "meta": [
          {
            "label": "Activation metric",
            "value": "Setup checklist completion"
          },
          {
            "label": "Owner",
            "value": "Onboarding PM"
          }
        ],
        "interventions": [
          "Setup checklist email",
          "In-app empty states",
          "CS kickoff call"
        ],
        "states": [
          {
            "label": "Today",
            "mode": "manual"
          },
          {
            "label": "Tomorrow",
            "mode": "self-serve"
          }
        ]
      }
    },
    {
      "id": "firstAction",
      "lane": "user",
      "phase": "first-action",
      "title": "First key action",
      "sub": "the 'aha' moment",
      "type": "milestone",
      "context": {
        "objective": "User performs the core action that demonstrates the product's value for the first time.",
        "meta": [
          {
            "label": "Activation metric",
            "value": "Time to first key action"
          },
          {
            "label": "Owner",
            "value": "Growth PM"
          }
        ],
        "interventions": [
          "Nudge email",
          "In-app tooltip",
          "CS check-in"
        ],
        "states": [
          {
            "label": "Today",
            "mode": "manual"
          },
          {
            "label": "Tomorrow",
            "mode": "self-serve"
          }
        ]
      }
    },
    {
      "id": "activated",
      "lane": "product",
      "phase": "activation",
      "title": "Reach activation",
      "sub": "value delivered",
      "type": "milestone",
      "context": {
        "objective": "User crosses the activation threshold that predicts retention and is recognized as activated.",
        "meta": [
          {
            "label": "Activation metric",
            "value": "Activated users / signups"
          },
          {
            "label": "Owner",
            "value": "Onboarding PM"
          }
        ],
        "interventions": [
          "Milestone celebration email",
          "In-app success banner",
          "CS expansion outreach"
        ],
        "states": [
          {
            "label": "Today",
            "mode": "manual"
          },
          {
            "label": "Tomorrow",
            "mode": "self-serve"
          }
        ]
      }
    },
    {
      "id": "buildHabit",
      "lane": "cs-onboarding",
      "phase": "habit",
      "title": "Build the habit",
      "sub": "recurring usage",
      "type": "milestone",
      "context": {
        "objective": "User returns repeatedly and the product becomes part of their weekly workflow.",
        "meta": [
          {
            "label": "Activation metric",
            "value": "Week-4 retention"
          },
          {
            "label": "Owner",
            "value": "CS Lead"
          }
        ],
        "interventions": [
          "Digest email",
          "In-app streaks",
          "CS quarterly review"
        ],
        "states": [
          {
            "label": "Today",
            "mode": "manual"
          },
          {
            "label": "Tomorrow",
            "mode": "self-serve"
          }
        ]
      }
    }
  ],
  "edges": [
    {
      "source": "createAccount",
      "target": "configureWorkspace"
    },
    {
      "source": "configureWorkspace",
      "target": "firstAction"
    },
    {
      "source": "firstAction",
      "target": "activated"
    },
    {
      "source": "activated",
      "target": "buildHabit"
    }
  ]
}</code></pre>
      </details>

      <h3>5 · Roadmaps de capacidad / transformación</h3>
      <p>Menos un flujo de quién-hace-qué, más un mapa de dónde-estamos. Las phases son dominios de capacidad; los nodes son capacidades; el modo <strong>hoy</strong> vs. <strong>mañana</strong> de cada node (manual → asistido → automatizado → IA) es el punto central. Por qué encaja: los dos puntos de modo por node dan una lectura de calor instantánea de qué tan lejos está cada capacidad de su estado objetivo, y <code>meta.modes</code> da una leyenda de color consistente en todo el mapa. Usa las lanes para los value streams o equipos que poseen cada capacidad.</p>
      <ul>
        <li><strong>Lanes</strong> → value streams / equipos dueños.</li>
        <li><strong>Phases</strong> → dominios de capacidad.</li>
        <li><strong>Nodes</strong> → capacidades; <code>today.mode</code> / <code>tomorrow.mode</code> cargan el gap.</li>
      </ul>

      <p><a href="../#capability-roadmap">Abrir renderizado ↗</a></p>
      <details class="example-src"><summary>Ver código fuente</summary>
      <pre><code>{
  "meta": {
    "title": "Capability Roadmap",
    "subtitle": "value streams × capability domains · today vs. tomorrow",
    "default_lang": "en",
    "modes": [
      {
        "id": "manual",
        "label": "Manual",
        "color": "#b91c1c"
      },
      {
        "id": "assisted",
        "label": "Tool-Assisted",
        "color": "#a16207"
      },
      {
        "id": "automated",
        "label": "Automated",
        "color": "#1e40af"
      },
      {
        "id": "ai",
        "label": "AI-Augmented",
        "color": "#047857"
      }
    ],
    "nodeTypes": {
      "capability": {
        "layout": [
          {
            "type": "Prose",
            "bind": "$objective"
          },
          {
            "type": "KeyValue",
            "bind": "$meta"
          },
          {
            "type": "Section",
            "title": "Today vs Tomorrow",
            "children": [
              {
                "type": "List",
                "bind": "$states",
                "item": {
                  "type": "Tile",
                  "title": "$label",
                  "sub": "$mode",
                  "pills": "$notes"
                }
              }
            ]
          }
        ]
      }
    }
  },
  "lanes": [
    {
      "id": "growth",
      "label": "Growth",
      "sub": "acquisition · demand"
    },
    {
      "id": "fulfillment",
      "label": "Fulfillment",
      "sub": "order to delivery"
    },
    {
      "id": "platform",
      "label": "Platform",
      "sub": "shared infra · data"
    },
    {
      "id": "support",
      "label": "Customer Support",
      "sub": "post-sale care"
    }
  ],
  "phases": [
    {
      "id": "data",
      "label": "Data &amp; Insight",
      "roman": "I"
    },
    {
      "id": "decisioning",
      "label": "Decisioning",
      "roman": "II"
    },
    {
      "id": "execution",
      "label": "Execution",
      "roman": "III"
    },
    {
      "id": "experience",
      "label": "Customer Experience",
      "roman": "IV"
    },
    {
      "id": "governance",
      "label": "Governance",
      "roman": "V"
    }
  ],
  "nodes": [
    {
      "id": "demandSensing",
      "lane": "growth",
      "phase": "data",
      "title": "Demand Sensing",
      "sub": "read the market signal",
      "type": "capability",
      "today": {
        "mode": "assisted"
      },
      "tomorrow": {
        "mode": "ai"
      },
      "context": {
        "objective": "Detect shifts in demand early enough to reallocate spend and inventory before competitors react.",
        "meta": [
          {
            "label": "Owner",
            "value": "Growth · Demand Planning"
          },
          {
            "label": "Inputs",
            "value": "Web traffic · search trends · historical sales"
          },
          {
            "label": "Gap",
            "value": "Weekly dashboards today → continuous AI forecasts tomorrow"
          },
          {
            "label": "Enables",
            "value": "Campaign targeting and inventory pre-positioning"
          }
        ],
        "states": [
          {
            "label": "Today",
            "mode": "assisted",
            "notes": [
              "Weekly BI dashboards",
              "Analyst pulls cohorts by hand"
            ]
          },
          {
            "label": "Tomorrow",
            "mode": "ai",
            "notes": [
              "Streaming demand model",
              "Auto-alerts on anomalies"
            ]
          }
        ]
      }
    },
    {
      "id": "campaignTargeting",
      "lane": "growth",
      "phase": "decisioning",
      "title": "Campaign Targeting",
      "sub": "who to reach, when",
      "type": "capability",
      "today": {
        "mode": "manual"
      },
      "tomorrow": {
        "mode": "ai"
      },
      "context": {
        "objective": "Allocate marketing budget to the segments and channels with the highest marginal return.",
        "meta": [
          {
            "label": "Owner",
            "value": "Growth · Performance Marketing"
          },
          {
            "label": "Inputs",
            "value": "Demand signal · segment value · channel cost"
          },
          {
            "label": "Gap",
            "value": "Quarterly rules-of-thumb today → per-impression bidding tomorrow"
          },
          {
            "label": "Enables",
            "value": "Higher ROAS without raising spend"
          }
        ],
        "states": [
          {
            "label": "Today",
            "mode": "manual",
            "notes": [
              "Quarterly planning deck",
              "Fixed channel split"
            ]
          },
          {
            "label": "Tomorrow",
            "mode": "ai",
            "notes": [
              "Model-driven bidding",
              "Budget rebalanced daily"
            ]
          }
        ]
      }
    },
    {
      "id": "orderOrchestration",
      "lane": "fulfillment",
      "phase": "execution",
      "title": "Order Orchestration",
      "sub": "route every order",
      "type": "capability",
      "today": {
        "mode": "automated"
      },
      "tomorrow": {
        "mode": "ai"
      },
      "context": {
        "objective": "Route each order to the optimal fulfillment node to minimize cost and delivery time.",
        "meta": [
          {
            "label": "Owner",
            "value": "Fulfillment · Operations"
          },
          {
            "label": "Inputs",
            "value": "Inventory positions · carrier SLAs · order priority"
          },
          {
            "label": "Gap",
            "value": "Static routing rules today → cost-optimizing solver tomorrow"
          },
          {
            "label": "Enables",
            "value": "Faster delivery at lower shipping cost"
          }
        ],
        "states": [
          {
            "label": "Today",
            "mode": "automated",
            "notes": [
              "Rules engine",
              "Nearest-warehouse heuristic"
            ]
          },
          {
            "label": "Tomorrow",
            "mode": "ai",
            "notes": [
              "Optimization solver",
              "Predictive node selection"
            ]
          }
        ]
      }
    },
    {
      "id": "deliveryPromise",
      "lane": "fulfillment",
      "phase": "experience",
      "title": "Delivery Promise",
      "sub": "the ETA at checkout",
      "type": "capability",
      "today": {
        "mode": "assisted"
      },
      "tomorrow": {
        "mode": "automated"
      },
      "context": {
        "objective": "Show an accurate, trustworthy delivery date at checkout and keep it accurate through delivery.",
        "meta": [
          {
            "label": "Owner",
            "value": "Fulfillment · Customer Experience"
          },
          {
            "label": "Inputs",
            "value": "Routing decision · carrier performance · region"
          },
          {
            "label": "Gap",
            "value": "Padded buffers today → real-time computed promise tomorrow"
          },
          {
            "label": "Enables",
            "value": "Conversion lift and fewer WISMO contacts"
          }
        ],
        "states": [
          {
            "label": "Today",
            "mode": "assisted",
            "notes": [
              "Static buffer by region",
              "Conservative padding"
            ]
          },
          {
            "label": "Tomorrow",
            "mode": "automated",
            "notes": [
              "Live ETA service",
              "Updated on every event"
            ]
          }
        ]
      }
    },
    {
      "id": "dataFoundation",
      "lane": "platform",
      "phase": "data",
      "title": "Data Foundation",
      "sub": "one source of truth",
      "type": "capability",
      "today": {
        "mode": "manual"
      },
      "tomorrow": {
        "mode": "automated"
      },
      "context": {
        "objective": "Provide a governed, reliable data layer that every other capability can build on.",
        "meta": [
          {
            "label": "Owner",
            "value": "Platform · Data Engineering"
          },
          {
            "label": "Inputs",
            "value": "Source systems · event streams · schemas"
          },
          {
            "label": "Gap",
            "value": "Hand-built pipelines today → self-serve contracts tomorrow"
          },
          {
            "label": "Enables",
            "value": "Every downstream model and dashboard"
          }
        ],
        "states": [
          {
            "label": "Today",
            "mode": "manual",
            "notes": [
              "Bespoke ETL scripts",
              "Schemas drift silently"
            ]
          },
          {
            "label": "Tomorrow",
            "mode": "automated",
            "notes": [
              "Declarative pipelines",
              "Enforced data contracts"
            ]
          }
        ]
      }
    },
    {
      "id": "accessGovernance",
      "lane": "platform",
      "phase": "governance",
      "title": "Access Governance",
      "sub": "who can touch what",
      "type": "capability",
      "today": {
        "mode": "manual"
      },
      "tomorrow": {
        "mode": "automated"
      },
      "context": {
        "objective": "Grant least-privilege access quickly while keeping a clean, auditable trail.",
        "meta": [
          {
            "label": "Owner",
            "value": "Platform · Security"
          },
          {
            "label": "Inputs",
            "value": "Roles · data sensitivity · audit policy"
          },
          {
            "label": "Gap",
            "value": "Ticket-and-approve today → policy-as-code tomorrow"
          },
          {
            "label": "Enables",
            "value": "Safe scaling of the data foundation"
          }
        ],
        "states": [
          {
            "label": "Today",
            "mode": "manual",
            "notes": [
              "Access by ticket",
              "Quarterly manual review"
            ]
          },
          {
            "label": "Tomorrow",
            "mode": "automated",
            "notes": [
              "Policy-as-code",
              "Continuous attestation"
            ]
          }
        ]
      }
    },
    {
      "id": "caseDeflection",
      "lane": "support",
      "phase": "experience",
      "title": "Case Deflection",
      "sub": "answer before the ticket",
      "type": "capability",
      "today": {
        "mode": "assisted"
      },
      "tomorrow": {
        "mode": "ai"
      },
      "context": {
        "objective": "Resolve common customer questions in self-serve flows before they become agent tickets.",
        "meta": [
          {
            "label": "Owner",
            "value": "Customer Support · Self-Service"
          },
          {
            "label": "Inputs",
            "value": "Help content · order context · intent signal"
          },
          {
            "label": "Gap",
            "value": "Static FAQ today → grounded AI assistant tomorrow"
          },
          {
            "label": "Enables",
            "value": "Lower cost-to-serve, faster answers"
          }
        ],
        "states": [
          {
            "label": "Today",
            "mode": "assisted",
            "notes": [
              "Keyword FAQ search",
              "Canned macros"
            ]
          },
          {
            "label": "Tomorrow",
            "mode": "ai",
            "notes": [
              "Context-aware assistant",
              "Resolves with order data"
            ]
          }
        ]
      }
    },
    {
      "id": "agentAssist",
      "lane": "support",
      "phase": "decisioning",
      "title": "Agent Assist",
      "sub": "augment the human",
      "type": "capability",
      "today": {
        "mode": "manual"
      },
      "tomorrow": {
        "mode": "ai"
      },
      "context": {
        "objective": "Give agents the next-best-action and a drafted reply so resolution is fast and consistent.",
        "meta": [
          {
            "label": "Owner",
            "value": "Customer Support · Agent Tooling"
          },
          {
            "label": "Inputs",
            "value": "Case history · knowledge base · policy"
          },
          {
            "label": "Gap",
            "value": "Manual lookup today → suggested actions tomorrow"
          },
          {
            "label": "Enables",
            "value": "Shorter handle time, higher CSAT"
          }
        ],
        "states": [
          {
            "label": "Today",
            "mode": "manual",
            "notes": [
              "Agent searches the KB",
              "Writes each reply by hand"
            ]
          },
          {
            "label": "Tomorrow",
            "mode": "ai",
            "notes": [
              "Suggested next action",
              "Drafted reply to edit"
            ]
          }
        ]
      }
    }
  ],
  "edges": [
    {
      "source": "demandSensing",
      "target": "campaignTargeting"
    },
    {
      "source": "dataFoundation",
      "target": "demandSensing"
    },
    {
      "source": "dataFoundation",
      "target": "orderOrchestration"
    },
    {
      "source": "campaignTargeting",
      "target": "orderOrchestration"
    },
    {
      "source": "orderOrchestration",
      "target": "deliveryPromise"
    },
    {
      "source": "accessGovernance",
      "target": "dataFoundation"
    },
    {
      "source": "deliveryPromise",
      "target": "caseDeflection"
    },
    {
      "source": "caseDeflection",
      "target": "agentAssist"
    }
  ]
}</code></pre>
      </details>

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

    { id: 'database', label: 'Editor Database', render: () => `
      <h2>Editor Database</h2>
      <p>Cada campo que puedes definir en JSON también tiene un editor estilo hoja de cálculo. Haz clic en el <strong>ícono DB</strong> del header para abrir un editor Database a pantalla completa sobre el mapa actual — sin herramienta separada, sin ida y vuelta por un editor de texto.</p>

      <h3>Cuatro pestañas, un grid cada una</h3>
      <p>El editor muestra una pestaña por entidad, cada una un grid editable:</p>
      <ul>
        <li><strong>Personas</strong> — las lanes.</li>
        <li><strong>Steps</strong> — las phases.</li>
        <li><strong>Features</strong> — el datatable (ver <a href="?lang=es#datatables">Datatables</a>) que sostiene el mapa, si hay uno cargado.</li>
        <li><strong>Nodes</strong> — las cards mismas, una row por node.</li>
      </ul>
      <p>Haz clic en cualquier celda para editarla en el lugar. Usa <strong>+ Add</strong> para agregar una row, o selecciona rows y usa <strong>Delete selected</strong> para eliminarlas. Cada cambio se aplica al mapa <strong>en vivo</strong> — no hay un paso de guardado separado. Cierra el editor con <strong>← back to map</strong> para volver a la vista renderizada y ver el resultado.</p>

      <h3>Editando nodes: una vista dividida</h3>
      <p>La pestaña Nodes no es un grid plano — es una vista dividida. Selecciona un node a la izquierda, y sus campos anidados se abren a la derecha para editar, incluyendo sus features referenciadas mediante un selector que solo ofrece ids que ya existen en el datatable de features. Esto evita que la edición de un node termine inventando referencias nuevas y no resolubles a mano.</p>

      <h3>Las ediciones de feature son relacionales</h3>
      <p>Editar una row en la pestaña Features muta directamente el datatable de features subyacente, y el cambio se refleja de inmediato en cada node que referencia esa feature — hay exactamente una copia del dato, sin importar cuántos nodes apunten hacia él. Para editar el mapa y sus datos relacionales juntos, suelta el archivo del lifecycle map y sus archivos <code>.datatable.json</code> / <code>.datatable.csv</code> en el viewer al mismo tiempo (ver <a href="?lang=es#datatables">Datatables</a>); el editor entonces sabe qué archivo respalda cada pestaña en realidad.</p>

      <h3>Campos localizados e ids de solo lectura</h3>
      <p>Los campos que llevan varios idiomas (<code>{ en, pt, es, ... }</code>) editan solo el idioma <strong>activo</strong> — cambia el idioma primero, luego edita, y el texto de los otros idiomas queda preservado intacto. Las columnas <code>id</code> siempre son de solo lectura: los ids son la clave de unión entre nodes, lanes, phases y rows de datatable, así que el editor no te deja convertir una en una referencia rota por accidente.</p>
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

    { id: 'datatables', label: 'Datatables', render: () => `
      <h2>Datatables <em>— referencias relacionales</em></h2>
      <p>Las refs externas (arriba) resuelven un problema: reusar un module por ID desde un catálogo que vive en el mismo archivo. Los datatables generalizan esa idea en un pequeño modelo relacional. En lugar de embeber una entidad compartida — una feature, una persona, un module — inline en cada node que la menciona, mantienes la entidad en un archivo de datatable separado y la referencias por id. El viewer une el mapa y sus datatables al cargar, así que el drawer sigue viendo un objeto completamente resuelto.</p>

      <h3>Declarando un datatable y sus refs</h3>
      <p>Dos claves de <code>meta</code> habilitan lookups relacionales en un node type: <code>meta.datatables</code> registra cada tabla por nombre, y <code>meta.nodeTypes.&lt;type&gt;.contextRefs</code> declara qué campos de <code>context</code> de ese node type son referencias, y contra qué tabla se resuelve un id simple.</p>
      <pre><code>{
  "meta": {
    "nodeTypes": {
      "stage": {
        "layout": [ /* … primitivas … */ ],
        "contextRefs": { "modules": { "ref": "features" } }
      }
    },
    "datatables": {
      "features": { "schema": { "owner": { "ref": "people" } } },
      "people":   { "src": "people.datatable.csv" }
    }
  },
  "nodes": [
    { "id": "n1", "type": "stage", "context": { "modules": ["feat-a", "feat-b"] } }
  ]
}</code></pre>
      <p>Solo los campos listados en <code>contextRefs</code> se tratan como referencias — todo otro campo de <code>context</code> queda como dato literal, aunque parezca un id.</p>

      <h3>Formato de datatable en JSON</h3>
      <pre><code>// features.datatable.json
{
  "_meta": { "name": "features" },
  "_schema": { "owner": { "ref": "people" } },
  "rows": {
    "feat-a": { "name": "Alpha feature", "tomorrow": "Auto", "owner": "pat" },
    "feat-b": { "name": "Beta feature", "tomorrow": "Auto" }
  }
}</code></pre>
      <p><code>_meta.name</code> es el nombre registrado de la tabla (recae en el nombre derivado del archivo cuando se omite). <code>_schema</code> declara columnas de foreign-key como <code>{ column: { ref: tableName } }</code> — arriba, el <code>owner</code> de cada row resuelve hacia <code>people</code>. <code>rows</code> es un objeto indexado por id de row; los archivos legacy pueden usar <code>features</code> o <code>modules</code> como la clave de rows en su lugar (ambas aceptadas, por compatibilidad con archivos de catálogo de modules más antiguos). Cualquier entrada de row que sea un <strong>string</strong> simple en vez de un objeto — por ejemplo un marcador <code>"_comment_1": "…"</code> — se descarta silenciosamente, así puedes dejar comentarios en el JSON sin que se interpreten como rows.</p>

      <h3>Formato de datatable en CSV</h3>
      <pre><code>id,name,role,tags
pat,Pat Owner,Engineer,ops;oncall</code></pre>
      <p>La primera columna siempre es <code>id</code>; cada otra columna se vuelve un campo de la row. CSV no puede embeber un schema, así que las columnas de foreign-key/lista deben declararse en <code>meta.datatables.&lt;name&gt;.schema</code> en el propio mapa. Una celda se divide en lista por <code>;</code> solo cuando su columna está declarada en el schema — arriba, <code>tags</code> necesita una entrada <code>meta.datatables.people.schema.tags</code> para que <code>"ops;oncall"</code> se vuelva <code>["ops", "oncall"]</code>; sin ella, la celda queda como el string literal.</p>

      <h3>El infijo de nombre de archivo <code>.datatable</code></h3>
      <p>Cuando varios archivos se cargan juntos, el nombre registrado de cada tabla se deriva de su nombre de archivo: se quita la extensión, luego se quita un infijo <code>.datatable</code> al final. <code>features.datatable.json</code>, <code>features.json</code>, y un archivo JSON cuyo <code>_meta.name</code> sea <code>"features"</code> todos se registran como la misma tabla, <code>features</code>. El infijo es una convención de nombres, no un requisito — solo ayuda a distinguir archivos de datatable de archivos de mapa normales a simple vista.</p>

      <h3>Formas híbridas de referencia</h3>
      <p>Dentro de un campo declarado en <code>contextRefs</code>, un valor puede tomar cualquiera de las dos formas — y ambas pueden mezclarse dentro del mismo array:</p>
      <ul>
        <li><strong>Id como string simple</strong> — resuelto contra la tabla nombrada en <code>contextRefs</code>. <code>"modules": ["feat-a", "feat-b"]</code> resuelve cada id hacia <code>features</code>.</li>
        <li><strong>Objeto explícito <code>{ "table": "...", "id": "..." }</code></strong> — resuelve directo hacia <code>table</code>, ignorando la tabla que <code>contextRefs</code> nombra. Úsalo para apuntar a una tabla distinta a la default del campo: <code>{ "table": "archive", "id": "feat-z" }</code>.</li>
      </ul>
      <p>El texto plano nunca es un ref — un campo sin entrada en <code>contextRefs</code> queda intacto por la resolución, sin importar qué aspecto tenga su valor.</p>

      <h3>Cargando un bundle</h3>
      <p>El drag-and-drop acepta múltiples archivos a la vez: suelta el mapa junto con sus archivos <code>.datatable.json</code> / <code>.datatable.csv</code> en un solo gesto, y el viewer los ensambla en un bundle antes de renderizar. Una referencia rota — un <code>table:id</code> que no existe en el registro — degrada a un marcador no resuelto en el drawer; nunca hace crashear al viewer. La resolución también es recursiva (las columnas de foreign-key de la propia row resuelta también se resuelven), protegida por un límite de profundidad default de <strong>3</strong> y una verificación de ciclos, así que una cadena de referencias mala registra una advertencia y se detiene en vez de entrar en bucle para siempre.</p>

      <h3>Compatible con lo anterior</h3>
      <p>Los datatables son totalmente aditivos. Un node type sin entrada en <code>contextRefs</code> nunca es tocado por la resolución — los mapas inline que embeben todos sus datos directamente siguen funcionando exactamente como antes. Los datatables relacionales son opt-in por node type y por campo.</p>
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
