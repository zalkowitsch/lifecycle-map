// Unit tests for the reference PostgresStorageAdapter, driven by a fake `pg`
// Pool so no real database is needed. Validates the optimistic-concurrency
// logic (the subtle part): a conditional UPDATE that matches zero rows must
// surface a VersionConflictError with the current version.
//
// Run from the repo root: npx vitest run examples/storage-server/postgresAdapter.test.mjs

import { describe, expect, it, vi } from 'vitest';
import { PostgresStorageAdapter, VersionConflictError } from './postgresAdapter.mjs';

const NOW = new Date('2026-07-13T00:00:00.000Z');
const sources = [{ name: 'map.json', text: '{}', lang: 'json' }];

/** A fake pg Pool: `query(sql, params)` is routed by a matcher list. */
function fakePool(handlers) {
  return {
    query: vi.fn(async (sql, params) => {
      for (const [re, fn] of handlers) {
        if (re.test(sql)) return fn(params, sql);
      }
      throw new Error(`Unhandled SQL in test: ${sql}`);
    }),
  };
}

describe('PostgresStorageAdapter', () => {
  it('load returns null when the row is absent', async () => {
    const pool = fakePool([[/SELECT/, () => ({ rows: [] })]]);
    const a = new PostgresStorageAdapter(pool);
    expect(await a.load('missing')).toBeNull();
  });

  it('load maps a row to a StoredDocument (version as string, ISO updatedAt)', async () => {
    const pool = fakePool([
      [/SELECT/, () => ({ rows: [{ slug: 'm', sources, version: 3, updated_at: NOW }] })],
    ]);
    const a = new PostgresStorageAdapter(pool);
    const doc = await a.load('m');
    expect(doc).toEqual({ slug: 'm', sources, version: '3', updatedAt: NOW.toISOString() });
  });

  it('save without expectedVersion upserts (last write wins)', async () => {
    const pool = fakePool([
      [/INSERT INTO documents/, () => ({ rows: [{ slug: 'm', sources, version: 1, updated_at: NOW }] })],
    ]);
    const a = new PostgresStorageAdapter(pool);
    const doc = await a.save('m', sources);
    expect(doc.version).toBe('1');
    // used the upsert path, not the conditional UPDATE
    expect(pool.query.mock.calls[0][0]).toMatch(/ON CONFLICT/);
  });

  it('save with matching expectedVersion updates and bumps version', async () => {
    const pool = fakePool([
      [/UPDATE documents/, () => ({ rows: [{ slug: 'm', sources, version: 5, updated_at: NOW }] })],
    ]);
    const a = new PostgresStorageAdapter(pool);
    const doc = await a.save('m', sources, { expectedVersion: '4' });
    expect(doc.version).toBe('5');
    // conditional update carried the expected version as a param
    expect(pool.query.mock.calls[0][1]).toContain('4');
  });

  it('save with a stale expectedVersion throws VersionConflictError carrying the current version', async () => {
    const pool = fakePool([
      // conditional UPDATE matches nothing...
      [/UPDATE documents/, () => ({ rows: [] })],
      // ...then load() reports the actual current version
      [/SELECT/, () => ({ rows: [{ slug: 'm', sources, version: 9, updated_at: NOW }] })],
    ]);
    const a = new PostgresStorageAdapter(pool);
    await expect(a.save('m', sources, { expectedVersion: '4' }))
      .rejects.toMatchObject({ name: 'VersionConflictError', actualVersion: '9' });
  });

  it('save conflict on a deleted row reports actualVersion undefined', async () => {
    const pool = fakePool([
      [/UPDATE documents/, () => ({ rows: [] })],
      [/SELECT/, () => ({ rows: [] })], // row is gone
    ]);
    const a = new PostgresStorageAdapter(pool);
    await expect(a.save('m', sources, { expectedVersion: '4' }))
      .rejects.toBeInstanceOf(VersionConflictError);
  });

  it('remove issues a DELETE', async () => {
    const pool = fakePool([[/DELETE FROM documents/, () => ({ rows: [] })]]);
    const a = new PostgresStorageAdapter(pool);
    await a.remove('m');
    expect(pool.query.mock.calls[0][0]).toMatch(/DELETE FROM documents/);
    expect(pool.query.mock.calls[0][1]).toEqual(['m']);
  });

  it('list returns summaries with string versions and ISO timestamps', async () => {
    const pool = fakePool([
      [/SELECT slug, version/, () => ({ rows: [
        { slug: 'a', version: 1, updated_at: NOW },
        { slug: 'b', version: 7, updated_at: NOW },
      ] })],
    ]);
    const a = new PostgresStorageAdapter(pool);
    const list = await a.list();
    expect(list).toEqual([
      { slug: 'a', version: '1', updatedAt: NOW.toISOString() },
      { slug: 'b', version: '7', updatedAt: NOW.toISOString() },
    ]);
  });
});
