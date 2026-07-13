import { useCallback, useRef, useState } from 'react';
import {
  VersionConflictError,
  type DocumentSummary,
  type StorageAdapter,
  type StoredSource,
} from '@/lib/storage';

export type StorageStatus = 'idle' | 'saving' | 'saved' | 'conflict' | 'error';

export interface UseStorage {
  /** Whether an adapter is wired (false → all ops are inert no-ops). */
  enabled: boolean;
  status: StorageStatus;
  error: string | null;
  /** The slug currently tracked (last loaded/saved), or null. */
  slug: string | null;
  /** Load a document's sources; also records its version for later saves. */
  load: (slug: string) => Promise<StoredSource[] | null>;
  /** Save sources; carries the tracked version for optimistic concurrency. */
  save: (slug: string, sources: StoredSource[]) => Promise<StoredSource[] | null>;
  /** List available documents. */
  list: () => Promise<DocumentSummary[]>;
  /** Clear a conflict/error back to idle (e.g. after the user reloads). */
  reset: () => void;
}

/**
 * React coordinator around a {@link StorageAdapter}. Tracks the current slug and
 * its version so successive saves use optimistic concurrency, and reduces adapter
 * outcomes to a small `status` state the UI can render. When `adapter` is
 * undefined the hook is inert (every op resolves to null) — storage is opt-in,
 * so the app works unchanged without one.
 */
export function useStorage(adapter: StorageAdapter | undefined): UseStorage {
  const [status, setStatus] = useState<StorageStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  // Version per slug — the last version the adapter reported. Kept in a ref so
  // it's read at call time (not captured stale) and doesn't trigger re-renders.
  const versions = useRef<Map<string, string | undefined>>(new Map());

  const load = useCallback(async (docSlug: string): Promise<StoredSource[] | null> => {
    if (!adapter) return null;
    setStatus('saving');
    setError(null);
    try {
      const doc = await adapter.load(docSlug);
      if (!doc) { setStatus('idle'); return null; }
      versions.current.set(docSlug, doc.version);
      setSlug(docSlug);
      setStatus('saved');
      return doc.sources;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
      return null;
    }
  }, [adapter]);

  const save = useCallback(async (docSlug: string, sources: StoredSource[]): Promise<StoredSource[] | null> => {
    if (!adapter) return null;
    setStatus('saving');
    setError(null);
    try {
      const expectedVersion = versions.current.get(docSlug);
      const doc = await adapter.save(docSlug, sources, expectedVersion !== undefined ? { expectedVersion } : undefined);
      versions.current.set(docSlug, doc.version);
      setSlug(docSlug);
      setStatus('saved');
      return doc.sources;
    } catch (e) {
      if (e instanceof VersionConflictError) {
        // Record the server's version so a subsequent (post-reload) save can succeed.
        versions.current.set(docSlug, e.actualVersion);
        setError(e.message);
        setStatus('conflict');
        return null;
      }
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
      return null;
    }
  }, [adapter]);

  const list = useCallback(async (): Promise<DocumentSummary[]> => {
    if (!adapter) return [];
    return adapter.list();
  }, [adapter]);

  const reset = useCallback(() => { setStatus('idle'); setError(null); }, []);

  return { enabled: !!adapter, status, error, slug, load, save, list, reset };
}
