// Tests for src/lib/mergeDroppedFiles.ts
//
// Covers merging a dropped lifecycle map with a separate features catalogue
// file. The map references modules by id; the features file holds the
// definitions. When both are dropped together, the catalogue is injected into
// the map's `modules` field so the viewer can resolve each module's
// today/tomorrow/tags instead of showing "Unknown".
//
// Catalogue shape:
//   { meta: {...}, features: { "<id>": { name, today, tomorrow, tags, ... },
//                              "_comment_xxx": "===== string marker =====" } }
// Comment markers are string-valued entries interleaved with real object entries.

import { describe, expect, it } from 'vitest';

import { mergeDroppedFiles } from '@/lib/mergeDroppedFiles';

const mapText = JSON.stringify({
  meta: { title: 'M', features_source: './features.json' },
  nodes: [{ id: 'a', lane: 'l', phase: 'p', title: 'A', modules: ['demo:widget:alpha'] }],
  edges: [],
});

// A full definition object with many fields — the merge must preserve all of them.
const fullFeature = {
  name: 'Alpha widget',
  csv_name: 'Alpha widget',
  surface_owner: 'team-a',
  today: 'Mode One',
  tomorrow: 'Mode Two',
  parity: 'On par',
  tags: ['tag-x', 'tag-y'],
  group: '#1',
  pricing: 'Included',
  source: ['src-1', 'src-2'],
};

const featuresText = JSON.stringify({
  meta: { description: 'catalogue', ownership_taxonomy: ['Mode One', 'Mode Two'] },
  features: {
    _comment_section: '============ section ============',
    'demo:widget:alpha': fullFeature,
  },
});

describe('mergeDroppedFiles', () => {
  it('injects the features catalogue into the map as `modules`, preserving every field', () => {
    const result = mergeDroppedFiles([
      { name: 'map.json', text: mapText },
      { name: 'features.json', text: featuresText },
    ]);
    const map = JSON.parse(result.mapText);
    // The whole object flows through — the viewer spreads all fields.
    expect(map.modules['demo:widget:alpha']).toEqual(fullFeature);
    expect(result.mergedCount).toBe(1);
  });

  it('reports which dropped file was the map, regardless of order', () => {
    const result = mergeDroppedFiles([
      { name: 'features.json', text: featuresText },
      { name: 'biller-map.json', text: mapText },
    ]);
    expect(result.mapName).toBe('biller-map.json');
  });

  it('drops string-valued comment markers from the catalogue', () => {
    const result = mergeDroppedFiles([
      { name: 'map.json', text: mapText },
      { name: 'features.json', text: featuresText },
    ]);
    const map = JSON.parse(result.mapText);
    expect(map.modules._comment_section).toBeUndefined();
    // only the real entry remains
    expect(Object.keys(map.modules)).toEqual(['demo:widget:alpha']);
  });

  it('returns the map unchanged when only the map is dropped', () => {
    const result = mergeDroppedFiles([{ name: 'map.json', text: mapText }]);
    expect(result.mapText).toBe(mapText);
    expect(result.mergedCount).toBe(0);
  });

  it('identifies map vs catalogue regardless of drop order', () => {
    const result = mergeDroppedFiles([
      { name: 'features.json', text: featuresText },
      { name: 'map.json', text: mapText },
    ]);
    const map = JSON.parse(result.mapText);
    expect(map.nodes).toHaveLength(1);
    expect(map.modules['demo:widget:alpha']).toBeDefined();
  });

  it('throws when no file containing nodes (a map) is present', () => {
    expect(() => mergeDroppedFiles([{ name: 'features.json', text: featuresText }])).toThrow(
      /no lifecycle map/i,
    );
  });
});
