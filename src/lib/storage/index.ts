/**
 * Pluggable storage for lifecycle-map documents.
 *
 * Instantiate an adapter and hand it to the viewer to persist maps + datatables
 * to a real backing instead of only in-memory / file / URL.
 *
 * Browser (safe): point at your backend.
 * ```ts
 * import { HttpStorageAdapter } from '@/lib/storage';
 * const storage = new HttpStorageAdapter({
 *   baseUrl: 'https://api.example.com/maps',
 *   getToken: () => auth.getAccessToken(), // Okta / Google Workspace session token
 * });
 * ```
 *
 * Server (Node, your backend — where DB creds & OAuth secrets live): implement
 * the same {@link StorageAdapter} interface backed by your database, and expose
 * it over the HTTP API the browser adapter above calls.
 */
export type {
  StorageAdapter,
  StoredSource,
  StoredDocument,
  DocumentSummary,
  SaveOptions,
} from './types';
export { VersionConflictError } from './types';
export { MemoryStorageAdapter, type MemoryAdapterOptions } from './memoryAdapter';
export { HttpStorageAdapter, type HttpAdapterOptions } from './httpAdapter';
