// PostgresStorageAdapter — the server-side implementation of lifecycle-map's
// StorageAdapter contract, backed by a `documents` table (see schema.sql).
//
// This runs on YOUR backend (Node), instantiated with a `pg` Pool built from
// your DATABASE_URL. It is the same interface the browser's HttpStorageAdapter
// speaks — the server just delegates HTTP calls to an instance of this class.
//
// Versioning: a monotonic BIGINT bumped on every save. `save(slug, sources,
// { expectedVersion })` performs a conditional UPDATE; if the row's version no
// longer matches, it throws VersionConflictError (surfaced to the browser as a
// 409, which the browser adapter turns back into a VersionConflictError).

export class VersionConflictError extends Error {
  constructor(slug, expectedVersion, actualVersion) {
    super(`Version conflict saving "${slug}": expected ${expectedVersion}, found ${actualVersion}.`);
    this.name = 'VersionConflictError';
    this.slug = slug;
    this.expectedVersion = expectedVersion;
    this.actualVersion = actualVersion;
  }
}

export class PostgresStorageAdapter {
  /** @param {import('pg').Pool} pool */
  constructor(pool) {
    this.name = 'postgres';
    this.pool = pool;
  }

  async load(slug) {
    const { rows } = await this.pool.query(
      'SELECT slug, sources, version, updated_at FROM documents WHERE slug = $1',
      [slug],
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      slug: r.slug,
      sources: r.sources,
      version: String(r.version),
      updatedAt: r.updated_at.toISOString(),
    };
  }

  async save(slug, sources, opts = {}) {
    const sourcesJson = JSON.stringify(sources);
    const expected = opts.expectedVersion;

    // No expectedVersion → upsert (last write wins), bumping version.
    if (expected === undefined) {
      const { rows } = await this.pool.query(
        `INSERT INTO documents (slug, sources, version, updated_at)
         VALUES ($1, $2::jsonb, 1, now())
         ON CONFLICT (slug) DO UPDATE
           SET sources = EXCLUDED.sources,
               version = documents.version + 1,
               updated_at = now()
         RETURNING slug, sources, version, updated_at`,
        [slug, sourcesJson],
      );
      return this.#toDoc(rows[0]);
    }

    // With expectedVersion → conditional update (optimistic concurrency).
    const { rows } = await this.pool.query(
      `UPDATE documents
          SET sources = $2::jsonb, version = version + 1, updated_at = now()
        WHERE slug = $1 AND version = $3
        RETURNING slug, sources, version, updated_at`,
      [slug, sourcesJson, expected],
    );
    if (rows.length === 1) return this.#toDoc(rows[0]);

    // The conditional update matched nothing: either the row is gone or its
    // version moved on. Read the current version to report the conflict.
    const current = await this.load(slug);
    throw new VersionConflictError(slug, expected, current?.version);
  }

  async remove(slug) {
    await this.pool.query('DELETE FROM documents WHERE slug = $1', [slug]);
  }

  async list() {
    const { rows } = await this.pool.query(
      'SELECT slug, version, updated_at FROM documents ORDER BY updated_at DESC',
    );
    return rows.map((r) => ({
      slug: r.slug,
      version: String(r.version),
      updatedAt: r.updated_at.toISOString(),
    }));
  }

  #toDoc(r) {
    return {
      slug: r.slug,
      sources: r.sources,
      version: String(r.version),
      updatedAt: r.updated_at.toISOString(),
    };
  }
}
