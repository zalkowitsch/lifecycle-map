// Merge a dropped lifecycle map with a separate features.json catalogue.
//
// The viewer resolves each node's `modules` (id refs) against the map's
// `modules` field. A map authored with `meta.features_source` keeps its module
// definitions in a separate features.json instead. When both files are dropped
// together, this merges the catalogue into the map so modules resolve to their
// today/tomorrow/tags instead of "Unknown".
//
// features.json shape: { features: { "<id>": {...def}, "_comment_x": "marker" } }
// Comment markers are string-valued and are dropped; only object entries become
// module definitions. The whole definition object is preserved — the NodeDrawer
// spreads every field (today, tomorrow, tags, pricing, ...).

import { parseSource } from '@/lib/parseSource';

export interface DroppedFile {
  name: string;
  text: string;
}

export interface MergeResult {
  /** The map's source text, with the features catalogue injected as `modules`. */
  mapText: string;
  /** The name of the dropped file identified as the map. */
  mapName: string;
  /** How many module definitions were merged in (0 when no catalogue was dropped). */
  mergedCount: number;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Given the dropped files, find the lifecycle map (the file with `nodes`) and,
 * if present, a features catalogue (a file with a `features` object), and inject
 * the catalogue into the map's `modules`.
 *
 * Returns the map's text unchanged when no catalogue is present, so the existing
 * single-file drop path is unaffected.
 */
export function mergeDroppedFiles(files: DroppedFile[]): MergeResult {
  const parsed = files.map((f) => ({ ...f, data: parseSource(f.text) as unknown as Record<string, unknown> }));

  const mapFile = parsed.find((f) => Array.isArray(f.data.nodes));
  if (!mapFile) {
    throw new Error('Dropped files contain no lifecycle map (a file with `nodes`).');
  }

  // A catalogue keys its definitions under `modules` (preferred) or `features`
  // (legacy features.json). Either marks a file as the catalogue.
  const catalogueFile = parsed.find(
    (f) => f !== mapFile && (isObject(f.data.modules) || isObject(f.data.features)),
  );
  if (!catalogueFile) {
    return { mapText: mapFile.text, mapName: mapFile.name, mergedCount: 0 };
  }

  const rawDefs = (isObject(catalogueFile.data.modules)
    ? catalogueFile.data.modules
    : catalogueFile.data.features) as Record<string, unknown>;
  const modules: Record<string, unknown> = {};
  for (const [id, def] of Object.entries(rawDefs)) {
    // Skip string-valued comment markers (e.g. "_comment_x": "==== ... ====").
    if (isObject(def)) modules[id] = def;
  }

  const mergedMap = { ...mapFile.data, modules };
  return {
    mapText: JSON.stringify(mergedMap),
    mapName: mapFile.name,
    mergedCount: Object.keys(modules).length,
  };
}
