# lifecycle-map

> Interactive swim-lane viewer for lifecycle maps. Load any JSON or YAML by URL — no build, no server, no install.

[**→ Live demo**](https://zalkowitsch.github.io/lifecycle-map/) · [Docs](https://zalkowitsch.github.io/lifecycle-map/docs/) · [Schema reference](./SCHEMA.md)

## What it does

`lifecycle-map` renders any process that has:

- **Lanes** (who acts — actors, roles, systems)
- **Phases** (when — sequential stages)
- **Nodes** (what happens — steps inside a lane × phase cell)
- **Edges** (what triggers what — directed flow)

It produces a swim-lane diagram you can walk step-by-step, with a side drawer showing detailed info per step.

Each node can optionally describe a **today vs. tomorrow** state — current state vs. target state — useful for transformation roadmaps, capability maps, and self-serve adoption planning.

## Quick start

Three ways to load data:

### 1. URL parameter

```
https://zalkowitsch.github.io/lifecycle-map/?src=https://gist.githubusercontent.com/.../raw/foo.json
```

Works with any CORS-enabled JSON or YAML URL.

### 2. Embedded data (hash)

```
https://zalkowitsch.github.io/lifecycle-map/#data=<base64-gzipped-json>
```

Self-contained URLs that work without external hosting. Useful for AI agents.

### 3. Paste

```
https://zalkowitsch.github.io/lifecycle-map/?paste
```

Opens a textarea for direct JSON/YAML paste.

## Minimal example

```json
{
  "meta": { "title": "Minimal" },
  "lanes": [
    { "id": "user",   "label": "User" },
    { "id": "system", "label": "System" }
  ],
  "phases": [
    { "id": "request",  "label": "Request" },
    { "id": "response", "label": "Response" }
  ],
  "nodes": [
    { "id": "ask",     "lane": "user",   "phase": "request",  "title": "Ask question" },
    { "id": "process", "lane": "system", "phase": "request",  "title": "Process" },
    { "id": "reply",   "lane": "system", "phase": "response", "title": "Reply" },
    { "id": "read",    "lane": "user",   "phase": "response", "title": "Read answer" }
  ],
  "edges": [
    { "from": "ask",     "to": "process" },
    { "from": "process", "to": "reply" },
    { "from": "reply",   "to": "read" }
  ]
}
```

That's it — paste this into the viewer and you get a working map.

See [`examples/hiring-pipeline.json`](./examples/hiring-pipeline.json) for a fuller example with today/tomorrow states, modules, and custom mode colors.

## Use with AI agents

Agents can generate a lifecycle map and link to a rendered view in one shot.

**Recommended pattern** (small maps, <4 KB JSON):

1. Generate the JSON.
2. Compress + base64-encode it.
3. Hand the user a URL with `#data=<encoded>`.

```bash
JSON='{"lanes":[...],"phases":[...],"nodes":[...],"edges":[...]}'
ENCODED=$(echo "$JSON" | gzip -9 | base64 | tr -d '\n' | tr '+/' '-_')
echo "https://zalkowitsch.github.io/lifecycle-map/#data=$ENCODED"
```

**For larger maps:** publish a gist and pass `?src=<raw-url>`:

```bash
gh gist create map.json --public --filename map.json
# copy the raw URL → ?src=...
```

See [docs/](./docs/) for full examples.

## Why

Swim-lane diagrams help teams reason about who-does-what-when across a process. Mermaid is great for small ones; Miro is great for collaboration; neither is great for **structured, walkable, source-controlled lifecycle maps**.

`lifecycle-map` is a single-file viewer that:

- takes data as source of truth (JSON/YAML in git)
- renders it as a navigable map (not just a static image)
- supports today/tomorrow framing (current → future state)
- works with AI agents end-to-end (generate JSON → return shareable URL)

## Repo layout

```
index.html                       ← viewer
viewer.js                        ← rendering logic
docs/                            ← documentation site (en/pt/es)
examples/
  minimal.json                   ← 10-line example
  hiring-pipeline.json           ← full example
  hiring-pipeline.yaml           ← same example in YAML
  with-modules/                  ← shared module catalog pattern
```

## Schema

See [SCHEMA.md](./SCHEMA.md) for full reference.

## License

MIT
