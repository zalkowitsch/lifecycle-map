# Primitive-Driven Node Drawer — Design

**Date:** 2026-06-05
**Status:** Approved, pending implementation

## Problem

The `NodeDrawer` hardcodes a billing vocabulary into the *code*: fixed sections
(`Objective`, `Entities`, `Actors`, `Triggers`, `Next`), a `Modules` section
with the English-only sub-label "features that make this step work", and
`states.today/tomorrow` rendered as "Current state / Future state". These are
domain assumptions baked into React.

For any other map — e.g. an interview/hiring-process map — this vocabulary is
wrong. "Modules / features that make this step work" is meaningless for an
interview round. You cannot fix it by renaming strings, because the *concepts*
are hardcoded.

## Goal

Invert the model: the **node type** defines *how a node renders* (a layout of
generic primitives with data bindings), and the **node** passes only its
**context** (the data). The app provides a fixed, trusted registry of UI
primitives; the JSON composes them per type. Billing uses primitives to build a
"Modules" section; an interview map uses the same primitives to build "Rubrics".
The billing vocabulary leaves the code entirely and becomes data.

## Architecture (hybrid: primitives in app, composition in JSON)

```
JSON map
├── meta.nodeTypes            ← defines TYPES (layout with bindings)
│     "interview-round": { layout: [ Section{ children:[ List{bind:"$rubrics", item:Tile} ] } ] }
└── nodes[]
      └── { id, lane, phase, type: "interview-round", context: { ...data } }

App (fixed primitive registry — React components)
├── Section, KeyValue, List, Tile, Pills, Prose, Title, Text, Button, Link
├── resolveBinding($key, context) → value          (pure)
└── PrimitiveRenderer(layout, context)             (walks tree, resolves binds, dispatches)
```

**Drawer render flow:**
1. Node has `type` → look up `meta.nodeTypes[type]`.
2. The type's `layout` is a tree of primitives; each may carry `bind` / `$`-prefixed values.
3. `PrimitiveRenderer` walks the tree, resolves each binding against `node.context`, renders the registry component.
4. A missing binding makes that primitive omit itself (no crash).

`lane`, `phase`, `id`, `col` stay OUTSIDE `context` — they are grid position, not drawer content.

## Primitive catalog + binding syntax

Common fields per node: `type` (which primitive), optional `bind`/`$`-values,
and constant props. Binding rule: **a string starting with `$` is a binding**
(`"$rubrics"` → `context.rubrics`); otherwise it is a literal. Inside `List`,
the `item` primitive receives each array element as its *local* context, so
`Tile.title: "$name"` reads `item.name`.

**Notation:** in the catalog below, a trailing `?` (e.g. `"$id?"`) is *spec
notation* meaning "optional" — it is NOT part of the binding string. The real
value is `"$id"`. Every binding is optional at render time: a binding that
resolves to `undefined`/missing makes that primitive (or that prop) omit itself.

```jsonc
{ "type": "Section",  "title": "<str|$bind>", "sub": "<str|$bind?>", "children": [ ... ] }
{ "type": "KeyValue", "bind": "$key" }                  // expects [{label, value}]
{ "type": "List",     "bind": "$key", "item": { "type": "Tile", ... } }  // iterates; item gets element as local context
{ "type": "Tile",     "title": "$name", "sub": "$id?", "pills": "$levels?", "tags": "$tags?" }
{ "type": "Pills",    "bind": "$key", "variant": "mode|plain" }   // [{label, color?}]
{ "type": "Prose",    "bind": "$key" }                  // text, supports the existing <em> emphasis
{ "type": "Title",    "text": "<str|$bind>", "variant": "h1|h2|eyebrow" }
{ "type": "Text",     "text": "<str|$bind>", "variant": "body|caption|mono" }
{ "type": "Button",   "text": "<str|$bind>", "action": "navigate|copy", "target": "$bind?" }
{ "type": "Link",     "text": "<str|$bind>", "href": "$bind" }
```

## Concrete JSON schema

```jsonc
{
  "meta": {
    "title": "How We Interview",
    "nodeTypes": {
      "interview-round": {
        "layout": [
          { "type": "Prose", "bind": "$objective" },
          { "type": "KeyValue", "bind": "$meta" },
          { "type": "Section", "title": "Rubrics", "sub": "$rubricsSub",
            "children": [
              { "type": "List", "bind": "$rubrics",
                "item": { "type": "Tile", "title": "$name", "sub": "$id", "pills": "$levels", "tags": "$tags" } }
            ] }
        ]
      }
    }
  },
  "nodes": [
    { "id": "coding", "lane": "interviewers", "phase": "onsite", "type": "interview-round",
      "context": {
        "objective": "A problem that starts simple…",
        "meta": [ {"label":"Duration","value":"75 min"}, {"label":"Level","value":"All"} ],
        "rubricsSub": "signals measured this round",
        "rubrics": [
          {"name":"Code fluency","id":"rubric:code-fluency","levels":[{"label":"L1"},{"label":"L4"}],"tags":["Code fluency"]}
        ]
      }
    }
  ]
}
```

## Code structure

New code under `src/components/NodeDrawer/primitives/`:
- One small, independently-testable React component per primitive (`Section.tsx`, `Tile.tsx`, …).
- `PrimitiveRenderer.tsx` — takes `layout` + `context`, resolves bindings, dispatches to the registry.
- `resolveBinding.ts` — pure (`"$x"` + context → value); easy to TDD. Handles literals, `$`-binds, missing keys.

Registry maps `type` string → component. Unknown `type` → omit with a `console.warn` (defensive, like the existing edge filter).

## Migration (chosen: migrate all now, remove legacy)

1. Rewrite `biller-lifecycle.json` and the hiring example into `nodeTypes` + `context` form.
2. Remove the hardcoded sections from `NodeDrawer.tsx` (`renderMetaRow` fixed labels, the `Modules` section, `stateLabels` today/tomorrow).
3. Update NodeDrawer tests; add unit tests for each primitive + the renderer + `resolveBinding`.

**Risk:** biller is in production. Mitigation: migrate the JSON, run the full
suite + build, and verify on the deploy before considering it done. The existing
`ErrorBoundary` around the Canvas/drawer catches anything that slips through.

## Docs

Add a `docs/` page documenting the 10 primitives + the `$` binding syntax, so
future maps can author types without reading source.

## Testing

- `resolveBinding`: literals, `$`-binds, nested missing keys, non-string passthrough.
- Each primitive: renders its content from props/local context; omits on missing bind.
- `PrimitiveRenderer`: walks a layout tree, resolves binds against context, renders nested `List`→`Tile`, omits unknown types.
- NodeDrawer integration: a node with `type` renders via its `nodeTypes` layout.
- Migrated `biller-lifecycle.json` + hiring example still render (referential + render smoke).

## Out of scope (YAGNI)

- Type inheritance / `extends` (user said not needed now).
- A generic schema for lanes/phases (only the *drawer content* becomes primitive-driven).
- Arbitrary user-authored components — only the fixed registry is renderable.
