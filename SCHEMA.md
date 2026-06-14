# Schema reference

The viewer accepts a single JSON or YAML document with this shape:

```jsonc
{
  "meta":    { /* title, modes, nodeTypes */ },
  "lanes":   [ /* who acts */ ],
  "phases":  [ /* when */ ],
  "nodes":   [ /* what happens — typed: type + context */ ],
  "edges":   [ /* what triggers what */ ],
  "modules": { /* optional: shared module catalog */ }
}
```

Only `lanes`, `phases`, `nodes`, `edges` are required. Everything else has sensible defaults.

Node **drawer content** (what you see when you open a node) is produced entirely from
`meta.nodeTypes` + `node.context`. There is no hardcoded drawer layout anymore.

> **Localized strings.** Anywhere a human-readable string appears (`title`, `subtitle`,
> `label`, `sub`, mode labels, …) you may pass either a plain string or a
> `{ "en": …, "pt": …, "es": … }` object keyed by language. The viewer resolves the
> object against the active language, falling back to `meta.default_lang`. The minimal
> example below uses plain strings; the `examples/` files use localized objects.

---

## Table of contents

- [`meta`](#meta)
- [`lanes`](#lanes)
- [`phases`](#phases)
- [Node types & primitives](#node-types--primitives)
  - [`meta.nodeTypes`](#metanodetypes)
  - [Binding grammar](#binding-grammar)
  - [Primitive reference](#primitive-reference)
  - [Security & sanitization](#security--sanitization)
- [`nodes`](#nodes)
- [`edges`](#edges)
- [`modules` (top-level catalog)](#modules-top-level-catalog)
- [Complete minimal typed example](#complete-minimal-typed-example)
- [Worked examples](#worked-examples)

---

## `meta`

```jsonc
{
  "title":        "Hiring Pipeline",      // shown in header (string or {en,pt,es})
  "subtitle":     "today vs. tomorrow",   // optional, shown after em-dash
  "context":      "Acme · 2026",          // optional eyebrow text
  "default_lang": "en",                   // optional, default language for localized strings
  "modes": [                              // optional ownership / automation taxonomy
    { "id": "manual",    "label": "Manual",    "color": "#b91c1c" },
    { "id": "automated", "label": "Automated", "color": "#1e40af" }
  ],
  "nodeTypes": {                          // optional: drawer layouts per node type
    "step": { "layout": [ /* primitives — see below */ ] }
  },
  "modules_source": "modules"             // optional: where the modules catalog lives
}
```

| Field          | Type                   | Purpose                                                                 |
| -------------- | ---------------------- | ----------------------------------------------------------------------- |
| `title`        | string \| `{lang}`     | Header title.                                                           |
| `subtitle`     | string \| `{lang}`     | Optional sub-title, shown after an em-dash.                             |
| `context`      | string \| `{lang}`     | Optional eyebrow text above the title.                                  |
| `default_lang` | string                 | Language used to resolve localized strings when the active one is missing. |
| `modes`        | array                  | Ownership / automation taxonomy. See below.                            |
| `nodeTypes`    | object                 | Map of `type` → `{ layout }`. Drives node drawers. See [Node types & primitives](#node-types--primitives). |
| `modules_source` | string               | Optional pointer to the top-level modules catalog key.                 |

### `modes`

```jsonc
[
  { "id": "manual", "label": "Manual", "color": "#b91c1c" }
]
```

- `id` — stable string, referenced by state/module `mode` fields and `Pills` labels.
- `label` — string or `{en,pt,es}`.
- `color` — hex color used for the dot / pill.

If `modes` is omitted, defaults are: `self-serve`, `assisted`, `automated`, `manual`, `n-a`, `unknown`.

---

## `lanes`

Horizontal swim lanes. Top to bottom.

```jsonc
[
  { "id": "biller",   "label": "Biller",   "sub": "8h/day" },
  { "id": "approver", "label": "Approver", "sub": "VP+" }
]
```

- `id` — referenced by `node.lane`. Stable string.
- `label` — display name (string or `{en,pt,es}`).
- `sub` — optional one-line description (string or `{en,pt,es}`).

---

## `phases`

Vertical columns (left to right).

```jsonc
[
  { "id": "intake",  "label": "Intake",  "roman": "I",  "subCols": 1 },
  { "id": "process", "label": "Process", "roman": "II", "subCols": 2 }
]
```

- `id` — referenced by `node.phase`.
- `label` — display name (string or `{en,pt,es}`).
- `roman` — optional. Defaults to `I, II, III, …` based on order.
- `subCols` — optional. Number of sub-columns within this phase (for parallel flows). Default `1`. A node's `col` indexes into these (0-based).

---

## Node types & primitives

A node carries a **`type`** (a key into `meta.nodeTypes`) and a **`context`** (an
arbitrary data bag). When the node's drawer opens, the viewer takes
`meta.nodeTypes[node.type].layout` — a tree of **primitives** — and *walks* it, resolving
every `"$key"` binding against `node.context`. The layout is the template; the context is
the data. Two nodes of the same `type` share one layout but render different content.

### `meta.nodeTypes`

```jsonc
"nodeTypes": {
  "step": {
    "layout": [
      { "type": "Prose",    "bind": "$objective" },
      { "type": "KeyValue", "bind": "$meta" },
      { "type": "Section", "title": "Modules", "sub": "$modulesSub", "children": [
        { "type": "List", "bind": "$modules", "item": {
          "type": "Tile", "title": "$feature", "sub": "$id", "pills": "$levels"
        }}
      ]},
      { "type": "Section", "title": "States", "children": [
        { "type": "List", "bind": "$states", "item": {
          "type": "Tile", "title": "$label", "sub": "$mode", "pills": "$tools"
        }}
      ]}
    ]
  }
}
```

- Each key (`"step"`) is a node type. Its value is an object with a `layout` array.
- `layout` is an ordered list of **primitives**, rendered top to bottom.
- Primitives may nest (`Section.children`, `List.item`).

### Binding grammar

Every primitive prop is resolved against the current **context** with these rules:

1. **`"$key"`** — a string that starts with `$` is a *binding*. It reads `context.key`.
   `"$objective"` → `context.objective`. (Only a leading-`$` single key is supported;
   there is no dotted-path or `${…}` interpolation.)
2. **Literal** — a string *without* a leading `$` is used verbatim. `"title": "Modules"`
   renders the literal word "Modules".
3. **List-local context** — `List.bind` must resolve to an **array**. For each element,
   the `List.item` primitive is rendered with that element as its **local context**. So
   inside `item`, `"$name"` reads `element.name`, `"$mode"` reads `element.mode`, etc. The
   array element *replaces* the context for that subtree.
4. **Undefined omits** — if a binding resolves to `undefined`/missing (or an empty
   value), that prop is dropped, and a primitive whose primary `bind` resolves to nothing
   renders nothing. This lets you reuse one layout across nodes that only fill in some
   fields — absent data simply disappears instead of erroring.

> Literal vs binding is decided **only** by the leading `$`. To emit a literal string that
> begins with `$`, you currently cannot — avoid leading `$` in literal copy.

### Primitive reference

There are **10** primitives. `type` is always required and selects the primitive.

| Primitive  | Fields (type)                                                                 | Notes |
| ---------- | ----------------------------------------------------------------------------- | ----- |
| **Prose**    | `type`; `bind` (→ string)                                                    | Renders a block of prose text resolved from `bind`. HTML is **sanitized** to an allowlist (`em`, `strong`, `br`). |
| **KeyValue** | `type`; `bind` (→ `[{label,value}]`)                                         | A label/value list. Accepts **only** an array of `{label,value}` objects. |
| **Section**  | `type`; `title` (string/binding); `sub?` (string/binding); `children` (primitive[]) | A titled group. `children` is a layout array, walked in the **same** context as the Section. |
| **List**     | `type`; `bind` (→ array); `item` (primitive)                                 | Iterates the array from `bind`; renders `item` once per element with that element as local context. See rule 3 above. |
| **Tile**     | `type`; `title` (string/binding); `sub?`; `pills?` (→ pill array); `tags?` (→ array) | A card. `pills`/`tags` resolve to arrays (see Pills value shape). Typically the `item` of a `List`. |
| **Pills**    | `type`; `bind` (→ array of strings **or** `{label, color?}`)                 | A row of pills. Each entry is a string or `{label, color?}`. **No `variant` prop.** |
| **Title**    | `type`; `text` (string/binding); `variant` (`h1` \| `h2` \| `eyebrow`)       | A heading. `variant` selects size/role. |
| **Text**     | `type`; `text` (string/binding); `variant` (`body` \| `caption` \| `mono`)   | A run of plain text. `variant` selects style. |
| **Button**   | `type`; `text` (string/binding); `action` (`navigate` \| `copy`); `target?`  | A button. `navigate` routes to `target` (a node id / hash); `copy` copies `target` (or text) to clipboard. |
| **Link**     | `type`; `text` (string/binding); `href` (string, **http/https only**)        | An anchor. Non-`http(s)` schemes are rejected. |

**Pill value shape.** `Pills.bind`, `Tile.pills`, and `Tile.tags` resolve to an array
whose entries are either:

- a plain string (`"manual"`), or
- an object `{ "label": "manual", "color": "#b91c1c" }` (`color` optional).

In the worked example, `Tile.pills: "$levels"` binds to
`[{ "label": "manual" }, { "label": "automated" }]` — an array of `{label}` objects.

### Security & sanitization

- **Prose** sanitizes its HTML to a strict allowlist: only `em`, `strong`, and `br` survive.
  Everything else (script, links, arbitrary tags/attributes) is stripped.
- **Link** accepts only `http:` and `https:` hrefs. `javascript:`, `data:`, `mailto:`,
  relative, and all other schemes are rejected (the link is dropped/inert).
- **Pills** has **no** `variant` prop — color comes from the per-entry `color` field only.

---

## `nodes`

A node places a card on the grid (`lane` × `phase`/`col`) and supplies the data its drawer
renders via `type` + `context`.

```jsonc
[
  {
    "id":    "review",          // required, unique
    "lane":  "biller",          // required, references lanes[].id
    "phase": "process",         // required, references phases[].id
    "col":   0,                 // optional, sub-column index within the phase (default 0)
    "title": "Review claim",    // required, card title (string or {en,pt,es})
    "sub":   "second pass",     // optional one-liner under the title

    "type":    "step",          // key into meta.nodeTypes — selects the drawer layout
    "context": {                // arbitrary data bag; layout bindings read from here
      "objective": "Catch errors before submission.",
      "meta": [
        { "label": "Entity",   "value": "Claim · Payer rules" },
        { "label": "Actors",   "value": "Biller leads → coder re-checks" },
        { "label": "Triggers", "value": "First pass complete." },
        { "label": "Next",     "value": "Approve or send back." }
      ],
      "modules": [
        { "feature": "Rule library", "levels": [ { "label": "manual" }, { "label": "automated" } ] }
      ],
      "states": [
        { "label": "Today",    "mode": "manual",    "narrative": "By hand.", "tools": ["Spreadsheet"] },
        { "label": "Tomorrow", "mode": "automated", "narrative": "AI flags exceptions.", "tools": ["ATS"] }
      ]
    }
  }
]
```

### Required

- `id`, `lane`, `phase`, `title`

### Content path

| Field     | Type               | Purpose                                                                              |
| --------- | ------------------ | ------------------------------------------------------------------------------------ |
| `col`     | number             | Sub-column within the phase (for parallel paths). Default `0`.                       |
| `title`   | string \| `{lang}` | Card title. Required.                                                                |
| `sub`     | string \| `{lang}` | Optional one-line subtitle on the card.                                              |
| `type`    | string             | Key into `meta.nodeTypes`. Selects the drawer **layout**. Omit → no typed drawer.   |
| `context` | object             | The data bag the layout's `"$…"` bindings resolve against. Shape is **yours** — it is whatever your layout reads. |

The structure of `context` is **not fixed by the schema**: it is a free-form object, and the
only contract is that the keys your `nodeTypes[type].layout` binds to (`$objective`,
`$meta`, `$modules`, `$states`, …) exist on it. Different node types can use entirely
different context shapes.

> **Legacy note.** Earlier versions rendered the drawer from fixed per-node fields
> (`objective`, `entity`, `actors`, `triggers`, `next`, `today`, `tomorrow`, `modules`)
> via a hardcoded layout (Objective / Modules / today-tomorrow sections). **That hardcoded
> drawer was removed.** Drawer content is now 100% `meta.nodeTypes` + `node.context`.
>
> The data those fields described still exists — you just put it **inside `context`** and
> surface it through primitives. In particular, `today`/`tomorrow` (current vs. target
> state) remain a perfectly valid data shape; the worked example carries them as a
> `states` array (`[{label,mode,narrative,tools}, …]`) and renders them with a `List` of
> `Tile`s. The two colored dots on a card derive from the node's state modes (e.g.
> `today.mode` / `tomorrow.mode`, or the first/last entries of a `states` array).

---

## `edges`

Directed connections between nodes.

```jsonc
[
  { "source": "intakeForm", "target": "review" },
  { "source": "review",     "target": "approve" },
  { "source": "approve",    "target": "submit" },
  { "source": "submit",     "target": "review" }   // backward — auto-detected, rendered dashed
]
```

- Each edge needs a **source** and a **target**, both node ids.
- Accepted key pairs: **`source`/`target`** (used by the `examples/` files) or the legacy
  **`from`/`to`**. Pick one form per edge.

The router classifies each edge automatically:

- **Forward (same phase, same lane)** — short vertical drop.
- **Forward (lateral)** — Manhattan horizontal with a rounded corner.
- **Forward (cross-phase)** — routes through the gap between phases.
- **Backward (any kind)** — dashed line, routed over the top "backward bus" or under the
  bottom rail to avoid crossing forward flows.

---

## `modules` (top-level catalog)

Optional. Shared module definitions you can reference by string id from a node's context
(e.g. a `context.modules` entry that is a string id rather than an inline object).
`meta.modules_source` may point at the catalog key.

```jsonc
{
  "modules": {
    "shared:bulk-edit": {
      "name":     "Bulk edit",
      "today":    "manual",
      "tomorrow": "automated",
      "tags":     ["★ Tablestakes"]
    }
  }
}
```

Module fields: `feature` (or `name`), `today`, `tomorrow`, `tags[]`, `pricing` (string),
`wedge` (string). How a module renders is up to the `Tile`/`List` primitives in your
layout — the catalog only supplies the data.

---

## Complete minimal typed example

The smallest valid document that exercises a typed drawer: one node type with a layout, and
a node whose `context` fills its bindings.

```json
{
  "meta": {
    "title": "Tiny flow",
    "default_lang": "en",
    "modes": [
      { "id": "manual",    "label": "Manual",    "color": "#b91c1c" },
      { "id": "automated", "label": "Automated", "color": "#1e40af" }
    ],
    "nodeTypes": {
      "step": {
        "layout": [
          { "type": "Prose", "bind": "$objective" },
          { "type": "KeyValue", "bind": "$meta" },
          { "type": "Section", "title": "States", "children": [
            { "type": "List", "bind": "$states", "item": {
              "type": "Tile", "title": "$label", "sub": "$mode", "pills": "$tools"
            }}
          ]}
        ]
      }
    }
  },
  "lanes":  [ { "id": "u", "label": "User" }, { "id": "s", "label": "System" } ],
  "phases": [ { "id": "in", "label": "In" }, { "id": "out", "label": "Out" } ],
  "nodes": [
    {
      "id": "ask", "lane": "u", "phase": "in", "title": "Ask",
      "type": "step",
      "context": {
        "objective": "User asks a question.",
        "meta": [
          { "label": "Entity",   "value": "Question" },
          { "label": "Triggers", "value": "User has a need." }
        ],
        "states": [
          { "label": "Today",    "mode": "manual",    "tools": ["Chat"] },
          { "label": "Tomorrow", "mode": "automated", "tools": ["Agent"] }
        ]
      }
    },
    { "id": "reply", "lane": "s", "phase": "out", "title": "Reply", "type": "step",
      "context": { "objective": "System replies." } }
  ],
  "edges": [ { "source": "ask", "target": "reply" } ]
}
```

Notes on this example:

- `ask` fills `objective`, `meta`, and `states`, so its drawer shows Prose → KeyValue →
  a "States" Section listing two tiles.
- `reply` fills only `objective`; the `KeyValue` and `States` primitives bind to missing
  keys and **omit themselves** (rule 4) — same layout, less content, no error.
- Drop `type`/`context` entirely and the node still renders as a card with no typed drawer.

You can also omit `meta` wholly (and `type`/`context` on every node) for a pure
diagram-only document — defaults fill `meta`, `modes`, roman numerals, and sub-cols.

---

## Worked examples

See [`examples/`](./examples) for full, valid documents. In particular:

- [`examples/hiring-pipeline.json`](./examples/hiring-pipeline.json) — a complete migrated
  document. It defines one node type, `"step"`, whose layout is
  **Prose(`$objective`) → KeyValue(`$meta`) → Section "Modules" [ List(`$modules`) →
  Tile(title `$feature`, sub `$id`, pills `$levels`) ] → Section "States" [ List(`$states`)
  → Tile(title `$label`, sub `$mode`, pills `$tools`) ]**. Every node carries that `type`
  plus its own `context`, all strings are localized `{en,pt,es}` objects, and `edges` use
  the `source`/`target` form.
