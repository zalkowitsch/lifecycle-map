/**
 * Storage adapters — a pluggable persistence layer for lifecycle-map documents.
 *
 * A "document" is one lifecycle map plus its datatable bundle, stored as the
 * same `RawSource[]` the viewer already works with (name + text + lang), keyed
 * by a stable `slug`. This mirrors the in-memory model exactly, so an adapter
 * is a thin durable backing for what the viewer already does.
 *
 * ## Where adapters run — read this before writing one
 *
 * Database drivers and OAuth client secrets (Okta, Google Workspace, …) MUST
 * NOT run in the browser: anything shipped to the client is readable in the JS
 * bundle and DevTools, so putting DB credentials or an OAuth client-secret in
 * browser code leaks them to every user. Therefore:
 *
 * - **Server adapters** (e.g. a Postgres adapter) run in Node, on YOUR backend.
 *   You instantiate them with the database connection info. They never ship to
 *   the browser.
 * - **The browser** uses {@link HttpStorageAdapter}, which forwards every call
 *   to an HTTP endpoint on your backend. Your backend authenticates the request
 *   (Okta/Google/etc.) and then delegates to a server adapter. Auth lives on the
 *   server; the browser only carries a short-lived session token.
 *
 * The interface below is identical on both sides, so viewer code is written
 * once against `StorageAdapter` and works with any backing.
 */

/** One persisted source file within a document (mirrors the viewer's model). */
export interface StoredSource {
  name: string;
  text: string;
  lang: 'json' | 'yaml';
}

/** A full persisted document: a slug + its source bundle + light metadata. */
export interface StoredDocument {
  slug: string;
  sources: StoredSource[];
  /** ISO-8601 timestamp of the last save, if the adapter tracks it. */
  updatedAt?: string;
  /** Opaque per-document version for optimistic concurrency (see save). */
  version?: string;
}

/** A lightweight listing entry (no source bodies — cheap to enumerate). */
export interface DocumentSummary {
  slug: string;
  updatedAt?: string;
  version?: string;
}

/** Thrown by `save` when `expectedVersion` no longer matches the stored one. */
export class VersionConflictError extends Error {
  constructor(
    public readonly slug: string,
    public readonly expectedVersion: string | undefined,
    public readonly actualVersion: string | undefined,
  ) {
    super(
      `Version conflict saving "${slug}": expected ${expectedVersion ?? '(none)'}, ` +
      `found ${actualVersion ?? '(none)'}. Reload before saving again.`,
    );
    this.name = 'VersionConflictError';
  }
}

/** Options for a save; `expectedVersion` enables optimistic concurrency. */
export interface SaveOptions {
  /**
   * The version the caller last read. If provided and it no longer matches the
   * stored version, the adapter throws {@link VersionConflictError} instead of
   * overwriting a concurrent change. Omit to force-overwrite (last write wins).
   */
  expectedVersion?: string;
}

/**
 * A pluggable persistence backing for lifecycle-map documents. Implementations
 * are async and side-effect-only; the viewer is written once against this
 * interface. See the module doc for the browser-vs-server split.
 */
export interface StorageAdapter {
  /** Human-readable adapter name (for logs / error messages). */
  readonly name: string;

  /** Load one document by slug, or `null` if it doesn't exist. */
  load(slug: string): Promise<StoredDocument | null>;

  /**
   * Create or update a document. Returns the stored document including the new
   * `version`/`updatedAt` the adapter assigned. Throws {@link VersionConflictError}
   * when `opts.expectedVersion` is stale.
   */
  save(slug: string, sources: StoredSource[], opts?: SaveOptions): Promise<StoredDocument>;

  /** Delete a document. Resolves whether or not it existed (idempotent). */
  remove(slug: string): Promise<void>;

  /** List available documents (summaries only, no bodies). */
  list(): Promise<DocumentSummary[]>;
}
