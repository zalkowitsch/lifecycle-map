// Tests for src/lib/resolveModules.ts
//
// A map may keep its module/rubric definitions in a separate catalog file,
// referenced by `meta.modules_source`. The viewer reads `data.modules`, so
// before normalizing we fetch that catalog and inject its `modules` into the
// map. Fetching is injected (fetchText) so tests stay offline.

import { describe, expect, it, vi } from 'vitest';

import { resolveExternalModules } from '@/lib/resolveModules';

const catalogJson = JSON.stringify({
  meta: { description: 'catalog' },
  modules: {
    _comment_section: '===== marker, not a module =====',
    'rubric:alpha': { name: 'Alpha', today: 'L1', tomorrow: 'L4', tags: ['Sig'] },
  },
});

function mapWith(meta: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  return { meta, nodes: [], edges: [], ...extra };
}

describe('resolveExternalModules', () => {
  it('fetches modules_source and injects its modules into the map', async () => {
    const fetchText = vi.fn().mockResolvedValue(catalogJson);
    const out = await resolveExternalModules(
      mapWith({ modules_source: './rubrics.json' }),
      fetchText,
      'map.json',
    );
    expect(out.modules['rubric:alpha']).toEqual({
      name: 'Alpha',
      today: 'L1',
      tomorrow: 'L4',
      tags: ['Sig'],
    });
    // resolves the catalog URL relative to the map's name/location
    expect(fetchText).toHaveBeenCalledWith('./rubrics.json');
  });

  it('strips string-valued comment markers from the fetched catalog', async () => {
    const fetchText = vi.fn().mockResolvedValue(catalogJson);
    const out = await resolveExternalModules(
      mapWith({ modules_source: './rubrics.json' }),
      fetchText,
      'map.json',
    );
    expect(out.modules._comment_section).toBeUndefined();
    expect(Object.keys(out.modules)).toEqual(['rubric:alpha']);
  });

  it('does not fetch when the map already has embedded modules', async () => {
    const fetchText = vi.fn();
    const embedded = { 'rubric:x': { name: 'X' } };
    const out = await resolveExternalModules(
      mapWith({ modules_source: './rubrics.json' }, { modules: embedded }),
      fetchText,
      'map.json',
    );
    expect(fetchText).not.toHaveBeenCalled();
    expect(out.modules).toEqual(embedded);
  });

  it('is a no-op when there is no modules_source', async () => {
    const fetchText = vi.fn();
    const input = mapWith({ title: 'no catalog' });
    const out = await resolveExternalModules(input, fetchText, 'map.json');
    expect(fetchText).not.toHaveBeenCalled();
    expect(out).toBe(input);
  });

  it('also accepts a catalog keyed under `features` (legacy features.json)', async () => {
    const legacy = JSON.stringify({ features: { 'rubric:y': { name: 'Y' } } });
    const fetchText = vi.fn().mockResolvedValue(legacy);
    const out = await resolveExternalModules(
      mapWith({ modules_source: './features.json' }),
      fetchText,
      'map.json',
    );
    expect(out.modules['rubric:y']).toEqual({ name: 'Y' });
  });

  it('leaves the map unchanged if the catalog fetch fails (resolves gracefully)', async () => {
    const fetchText = vi.fn().mockRejectedValue(new Error('404'));
    const input = mapWith({ modules_source: './missing.json' });
    const out = await resolveExternalModules(input, fetchText, 'map.json');
    // map still loads; modules just stay unresolved rather than throwing
    expect(out.modules ?? {}).toEqual({});
  });
});
