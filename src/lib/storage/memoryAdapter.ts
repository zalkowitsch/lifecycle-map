import {
  VersionConflictError,
  type DocumentSummary,
  type SaveOptions,
  type StorageAdapter,
  type StoredDocument,
  type StoredSource,
} from './types';

/** Options for the in-memory adapter. */
export interface MemoryAdapterOptions {
  /**
   * Optional initial map text stored under the slug `seed` as `seed.json`.
   * Handy for demos/tests so the store isn't empty on first load.
   */
  seed?: string;
}

interface Entry {
  sources: StoredSource[];
  updatedAt: string;
  version: string;
}

function clone(sources: StoredSource[]): StoredSource[] {
  return sources.map((s) => ({ ...s }));
}

/**
 * In-memory {@link StorageAdapter}. The reference implementation and the base
 * every other adapter's tests are modelled on. Not durable — resets on reload —
 * but exercises the full contract (versioning, optimistic concurrency, listing)
 * so the viewer wiring can be developed and tested without a real backend.
 *
 * Versions are a monotonic counter (deterministic, unlike a timestamp), and
 * every stored value is deep-copied on the way in and out so callers can never
 * mutate the store by holding a reference.
 */
export class MemoryStorageAdapter implements StorageAdapter {
  readonly name = 'memory';
  private readonly store = new Map<string, Entry>();
  private counter = 0;

  constructor(opts: MemoryAdapterOptions = {}) {
    if (opts.seed !== undefined) {
      this.putEntry('seed', [{ name: 'seed.json', text: opts.seed, lang: 'json' }]);
    }
  }

  private nextVersion(): string {
    this.counter += 1;
    return `v${this.counter}`;
  }

  private stamp(): string {
    // A stable, monotonic pseudo-timestamp derived from the counter, so tests
    // don't depend on the wall clock. Real adapters use a true timestamp.
    return new Date(0).toISOString().replace('1970', `1970-${String(this.counter).padStart(3, '0')}`);
  }

  private putEntry(slug: string, sources: StoredSource[]): Entry {
    const entry: Entry = { sources: clone(sources), updatedAt: this.stamp(), version: this.nextVersion() };
    this.store.set(slug, entry);
    return entry;
  }

  async load(slug: string): Promise<StoredDocument | null> {
    const entry = this.store.get(slug);
    if (!entry) return null;
    return { slug, sources: clone(entry.sources), updatedAt: entry.updatedAt, version: entry.version };
  }

  async save(slug: string, sources: StoredSource[], opts: SaveOptions = {}): Promise<StoredDocument> {
    const existing = this.store.get(slug);
    if (opts.expectedVersion !== undefined && opts.expectedVersion !== existing?.version) {
      throw new VersionConflictError(slug, opts.expectedVersion, existing?.version);
    }
    const entry = this.putEntry(slug, sources);
    return { slug, sources: clone(entry.sources), updatedAt: entry.updatedAt, version: entry.version };
  }

  async remove(slug: string): Promise<void> {
    this.store.delete(slug);
  }

  async list(): Promise<DocumentSummary[]> {
    return [...this.store.entries()].map(([slug, e]) => ({
      slug,
      updatedAt: e.updatedAt,
      version: e.version,
    }));
  }
}
