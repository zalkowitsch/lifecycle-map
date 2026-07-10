# workspace/air-billing

Local, git-ignored workspace for the **2026 Air Billing — Practice Management Map**.

Map data files (`*.json` / `*.yaml`) dropped in here are **ignored by git** (see the
root `.gitignore`), so proprietary maps stay on your machine. This README is the only
tracked file, so the folder exists for anyone who clones the repo.

## Files you keep here

- `biller-lifecycle.json` — the map. Typed `stage` nodes; the drawer layout lives in
  `meta.nodeTypes.stage.layout`, and `meta.modes` defines the ownership taxonomy
  (`Doesn't Exist` … `Self-Serve & Delightful`) that colors the status dots/pills.
  Each node's `context.modules` is now a list of **feature ids** (e.g.
  `"air-clinical:online-sched"`), not inline objects — `meta.nodeTypes.stage.contextRefs`
  (`{ "modules": { "ref": "features" } }`) tells the viewer to resolve those ids against
  the `features` datatable. This map is a **relational bundle**: it does not render its
  module tiles standalone anymore, it needs `features.json` alongside it.
- `features.json` — the feature catalogue (source of truth for ownership/parity/tags/
  pricing), now declared as a datatable via top-level `_meta.name: "features"`. It's
  referenced from the map via `meta.datatables.features` and
  `meta.nodeTypes.stage.contextRefs.modules.ref`.
- `biller-lifecycle-2.json` — legacy flat format, kept for reference. Does **not** render
  in the current viewer (the hardcoded drawer it relied on was removed). Use
  `biller-lifecycle.json`.

## How to open

1. Run the viewer: `npm run dev` (from the repo root).
2. Drag **`biller-lifecycle.json`** and **`features.json`** onto the window **together**
   (multi-file drag-drop). The map's `context.modules` are feature ids, so the viewer
   needs the `features` datatable to resolve them into full module tiles — dropping the
   map alone will leave those refs unresolved.
