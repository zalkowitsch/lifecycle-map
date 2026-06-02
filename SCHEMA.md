# Schema reference

The viewer accepts a single JSON or YAML document with this shape:

```jsonc
{
  "meta":   { /* title, modes */ },
  "lanes":  [ /* who acts */ ],
  "phases": [ /* when */ ],
  "nodes":  [ /* what happens */ ],
  "edges":  [ /* what triggers what */ ],
  "modules": { /* optional: shared module catalog */ }
}
```

Only `lanes`, `phases`, `nodes`, `edges` are required. Everything else has sensible defaults.

---

## `meta`

```jsonc
{
  "title":    "Hiring Pipeline",       // shown in header
  "subtitle": "today vs. tomorrow",    // optional, shown after em-dash
  "context":  "Acme · 2026",           // optional eyebrow text
  "modes": [                           // optional ownership taxonomy
    { "id": "manual",   "label": "Manual",   "color": "#b91c1c" },
    { "id": "auto",     "label": "Automated","color": "#1e40af" }
  ]
}
```

If `modes` is omitted, defaults are: `self-serve`, `assisted`, `automated`, `manual`, `n-a`, `unknown`.

---

## `lanes`

Horizontal swim lanes. Top to bottom.

```jsonc
[
  { "id": "biller",    "label": "Biller",    "sub": "8h/day" },
  { "id": "approver",  "label": "Approver",  "sub": "VP+" }
]
```

- `id` — referenced by `node.lane`. Stable string.
- `label` — display name.
- `sub` — optional one-line description.

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
- `label` — display name.
- `roman` — optional. Defaults to `I, II, III, ...` based on order.
- `subCols` — optional. Number of sub-columns within this phase (for parallel flows). Default `1`.

---

## `nodes`

```jsonc
[
  {
    "id":        "review",
    "lane":      "biller",
    "phase":     "process",
    "col":       0,                         // sub-column index, default 0
    "title":     "Review claim",
    "sub":       "second pass",             // optional one-liner under title

    "objective": "Catch errors before submission.",
    "entity":    "Claim · Payer rules",
    "actors":    "Biller leads → coder may re-check",
    "triggers":  "First pass complete.",
    "next":      "Approve or send back for fix.",

    "today": {                              // current state (optional)
      "mode":      "manual",                // references meta.modes[].id
      "narrative": "Biller reviews each line by hand.",
      "tools":     ["Spreadsheet", "Email"],
      "teams":     ["@billing-team"]
    },
    "tomorrow": {                           // target state (optional)
      "mode":      "automated",
      "narrative": "AI flags exceptions; biller reviews edge cases only.",
      "tickets":   ["TICKET-123"],
      "proven_pattern": ["Already shipped on smaller surfaces"]
    },

    "modules": [                            // optional sub-features (inline or by ref)
      { "feature": "Rule library", "today": "manual", "tomorrow": "automated", "tags": ["★"] },
      "shared:duplicate-check"              // string = lookup in top-level `modules` catalog
    ]
  }
]
```

### Required

- `id`, `lane`, `phase`, `title`

### Optional fields

| Field           | Purpose                                                                 |
| --------------- | ----------------------------------------------------------------------- |
| `col`           | Sub-column within the phase (for parallel paths). Default `0`.          |
| `sub`           | One-line subtitle shown on the node card.                               |
| `objective`     | What the step is for.                                                   |
| `entity`        | What data/entities it touches.                                          |
| `actors`        | Who acts and in what order.                                             |
| `triggers`      | What needs to be true for this step to fire.                            |
| `next`          | What happens after this step.                                           |
| `today`         | Object describing current state — see below.                            |
| `tomorrow`      | Object describing target state — same shape as `today`.                 |
| `modules`       | Array of sub-features. Each is either inline or a string ID reference. |

### `today` / `tomorrow` shape

```jsonc
{
  "mode":      "manual",            // must match meta.modes[].id
  "narrative": "Free text...",
  "tools":     ["A", "B"],          // optional
  "teams":     ["@x", "@y"],        // optional
  "tickets":   ["JIRA-1"],          // optional, usually only on tomorrow
  "proven_pattern": ["..."]         // optional, usually only on tomorrow
}
```

The two colored dots on each node card show `today.mode` (left) and `tomorrow.mode` (right).

### `modules`

Two forms:

1. **Inline** — full object:
   ```json
   { "feature": "Bulk edit", "today": "manual", "tomorrow": "automated", "tags": ["Wedge"] }
   ```
2. **Reference** — string ID looked up in top-level `modules` catalog:
   ```json
   "shared:bulk-edit"
   ```

Module fields: `feature` (or `name`), `today`, `tomorrow`, `tags[]`, `pricing` (string), `wedge` (string).

---

## `edges`

Directed connections between nodes.

```jsonc
[
  { "from": "intakeForm",  "to": "review" },
  { "from": "review",      "to": "approve" },
  { "from": "approve",     "to": "submit" },
  { "from": "submit",      "to": "review" }    // backward — auto-detected, rendered dashed
]
```

The router classifies each edge automatically:

- **Forward (same phase, same lane)**: short vertical drop.
- **Forward (lateral)**: Manhattan horizontal with rounded corner.
- **Forward (cross-phase)**: routes through the gap between phases.
- **Backward (any kind)**: dashed line, routed over the top "backward bus" or under the bottom rail to avoid crossing forward flows.

---

## `modules` (top-level catalog)

Optional. Shared module definitions referenced by string IDs from `node.modules`.

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

---

## Complete minimal example

```json
{
  "lanes":  [{ "id": "u", "label": "User" }, { "id": "s", "label": "System" }],
  "phases": [{ "id": "in", "label": "In" }, { "id": "out", "label": "Out" }],
  "nodes": [
    { "id": "ask",   "lane": "u", "phase": "in",  "title": "Ask" },
    { "id": "reply", "lane": "s", "phase": "out", "title": "Reply" }
  ],
  "edges": [{ "from": "ask", "to": "reply" }]
}
```

This is the smallest valid document. Defaults fill in `meta`, modes, roman numerals, and sub-cols.
