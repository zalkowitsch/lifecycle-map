import { describe, expect, it } from 'vitest';
import { MemoryStorageAdapter } from './memoryAdapter';
import { VersionConflictError, type StoredSource } from './types';

const sources: StoredSource[] = [
  { name: 'map.json', text: '{"nodes":[]}', lang: 'json' },
  { name: 'features.json', text: '{"rows":{}}', lang: 'json' },
];

describe('MemoryStorageAdapter', () => {
  it('returns null for a missing document', async () => {
    const a = new MemoryStorageAdapter();
    expect(await a.load('nope')).toBeNull();
  });

  it('saves then loads a document with both sources', async () => {
    const a = new MemoryStorageAdapter();
    const saved = await a.save('my-map', sources);
    expect(saved.slug).toBe('my-map');
    expect(saved.sources).toEqual(sources);
    expect(saved.version).toBeTruthy();

    const loaded = await a.load('my-map');
    expect(loaded?.sources).toEqual(sources);
    expect(loaded?.version).toBe(saved.version);
  });

  it('deep-copies on save and load (no shared references leak)', async () => {
    const a = new MemoryStorageAdapter();
    await a.save('m', sources);
    const loaded = await a.load('m');
    // Mutating what we loaded must not corrupt the store.
    loaded!.sources[0]!.text = 'MUTATED';
    const reloaded = await a.load('m');
    expect(reloaded!.sources[0]!.text).toBe('{"nodes":[]}');
  });

  it('bumps the version on each save', async () => {
    const a = new MemoryStorageAdapter();
    const v1 = (await a.save('m', sources)).version;
    const v2 = (await a.save('m', sources)).version;
    expect(v1).not.toBe(v2);
  });

  it('force-overwrites when no expectedVersion is given (last write wins)', async () => {
    const a = new MemoryStorageAdapter();
    await a.save('m', sources);
    const next = [{ name: 'map.json', text: '{"nodes":[1]}', lang: 'json' as const }];
    await a.save('m', next); // no expectedVersion → overwrite
    expect((await a.load('m'))!.sources).toEqual(next);
  });

  it('throws VersionConflictError when expectedVersion is stale', async () => {
    const a = new MemoryStorageAdapter();
    const first = await a.save('m', sources);
    await a.save('m', sources); // someone else saved; version moved on
    await expect(
      a.save('m', sources, { expectedVersion: first.version }),
    ).rejects.toBeInstanceOf(VersionConflictError);
  });

  it('accepts a save when expectedVersion matches', async () => {
    const a = new MemoryStorageAdapter();
    const first = await a.save('m', sources);
    const next = [{ name: 'map.json', text: '{}', lang: 'json' as const }];
    const saved = await a.save('m', next, { expectedVersion: first.version });
    expect(saved.sources).toEqual(next);
    expect(saved.version).not.toBe(first.version);
  });

  it('treats a first save with expectedVersion against a missing doc as a conflict', async () => {
    const a = new MemoryStorageAdapter();
    await expect(
      a.save('ghost', sources, { expectedVersion: 'v-anything' }),
    ).rejects.toBeInstanceOf(VersionConflictError);
  });

  it('removes a document (idempotently)', async () => {
    const a = new MemoryStorageAdapter();
    await a.save('m', sources);
    await a.remove('m');
    expect(await a.load('m')).toBeNull();
    await a.remove('m'); // no throw on a second remove
    await a.remove('never-existed'); // no throw
  });

  it('lists summaries without source bodies', async () => {
    const a = new MemoryStorageAdapter();
    await a.save('alpha', sources);
    await a.save('beta', sources);
    const list = await a.list();
    expect(list.map((d) => d.slug).sort()).toEqual(['alpha', 'beta']);
    // summaries carry version/updatedAt but no `sources` field
    expect(list.every((d) => !('sources' in d))).toBe(true);
    expect(list.every((d) => typeof d.version === 'string')).toBe(true);
  });

  it('seeds initial documents from the constructor', async () => {
    const a = new MemoryStorageAdapter({ seed: '{"nodes":[]}' });
    const loaded = await a.load('seed');
    expect(loaded?.sources[0]?.text).toBe('{"nodes":[]}');
    expect(loaded?.sources[0]?.name).toBe('seed.json');
  });
});
