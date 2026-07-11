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

It also supports two structural features beyond the basic diagram:

- **Relational datatables** — instead of duplicating shared data inline on every node, keep entities (e.g. features) in a separate datatable file and reference them by id from the map. The viewer joins them on load. See [Datatables in SCHEMA.md](./SCHEMA.md#datatables-relational-references).
- **Database editor** — a full-screen, spreadsheet-style editor (opened from the database icon in the header) for CRUD on lanes, phases, features, and nodes. Edits apply to the map live. See [below](#editing-the-map-database-editor).

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

## Editing the map (Database editor)

Beyond viewing, you can edit a loaded map as tables. Click the **database icon** in
the header to open a full-screen editor with four tabs:

- **Personas** (lanes), **Steps** (phases), **Features** (a datatable), **Nodes** (cards)

Each tab is a spreadsheet grid. Click a cell to edit; use **+ Add** / **Delete selected**
to add or remove rows. Edits apply to the map **live** — close the editor (← back to map)
and the diagram reflects them. The **Nodes** tab opens a split view: pick a node on the
left, edit its nested fields (like its referenced features) on the right.

Editing localized (`{en,pt,es}`) fields updates the active language only, preserving the
others. `id` columns are read-only (renaming an id would break edges/references).

## Relational datatables

A map can reference shared entities by id instead of embedding them on every node.
Keep them in a datatable file and drop it alongside the map:

```
biller-lifecycle.json    ← the map; nodes reference feature ids
features.json            ← a datatable: { "_meta": {"name":"features"}, "rows": { "<id>": {…} } }
```

**Drag both files onto the viewer together** (multi-file drop) — the viewer builds the
datatable registry, resolves each node's referenced ids into full rows, and renders. A
missing reference degrades gracefully (shown as unresolved) rather than crashing. Feature
edits in the Database editor mutate the datatable and reflect in every referencing node.

Full reference: [Datatables in SCHEMA.md](./SCHEMA.md#datatables-relational-references).

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
