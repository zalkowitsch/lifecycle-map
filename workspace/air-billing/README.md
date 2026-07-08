# workspace/air-billing

Local, git-ignored workspace for the **2026 Air Billing — Practice Management Map**.

Map data files (`*.json` / `*.yaml`) dropped in here are **ignored by git** (see the
root `.gitignore`), so proprietary maps stay on your machine. This README is the only
tracked file, so the folder exists for anyone who clones the repo.

## Files you keep here

- `biller-lifecycle.json` — the map. Typed `stage` nodes; the drawer layout lives in
  `meta.nodeTypes.stage.layout`, and `meta.modes` defines the ownership taxonomy
  (`Doesn't Exist` … `Self-Serve & Delightful`) that colors the status dots/pills.
  **Renders standalone** — the modules are inlined in each node's `context.modules`,
  so it does not need `features.json` to display.
- `features.json` — the feature catalogue (source of truth for ownership/parity/tags/
  pricing). Optional for rendering this map; useful as reference and for drag-dropping
  alongside the map.
- `biller-lifecycle-2.json` — legacy flat format, kept for reference. Does **not** render
  in the current viewer (the hardcoded drawer it relied on was removed). Use
  `biller-lifecycle.json`.

## How to open

1. Run the viewer: `npm run dev` (from the repo root).
2. Drag **`biller-lifecycle.json`** onto the window. It renders on its own.
3. Optional: drag `biller-lifecycle.json` **and** `features.json` together — the viewer
   merges the catalogue into the map's `modules`. (This map inlines its modules, so the
   merge is a no-op for display, but multi-file drop is supported.)
