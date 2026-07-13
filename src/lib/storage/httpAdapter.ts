import {
  VersionConflictError,
  type DocumentSummary,
  type SaveOptions,
  type StorageAdapter,
  type StoredDocument,
  type StoredSource,
} from './types';

/** Options for the HTTP adapter (the browser-side adapter). */
export interface HttpAdapterOptions {
  /**
   * Base URL of your backend's document API, e.g. `https://api.example.com/maps`.
   * The adapter calls `GET {baseUrl}`, `GET/PUT/DELETE {baseUrl}/{slug}`.
   */
  baseUrl: string;
  /**
   * Returns the current session token to send as `Authorization: Bearer <token>`.
   * This is where Okta / Google Workspace / any OAuth session plugs in: your
   * app authenticates the user (on the server or via a provider SDK) and hands
   * this adapter a short-lived token. The DB credentials and OAuth client-secret
   * stay on your backend — only the session token ever reaches the browser.
   * Return null/undefined to send no Authorization header.
   */
  getToken?: () => Promise<string | null | undefined> | string | null | undefined;
  /** Extra headers merged into every request (e.g. a tenant id). */
  headers?: Record<string, string>;
}

/**
 * Browser-side {@link StorageAdapter} that forwards every operation to an HTTP
 * endpoint on YOUR backend. The backend authenticates the request and delegates
 * to a server adapter (e.g. Postgres). See {@link StorageAdapter}'s module doc
 * for why DB/OAuth secrets must live on the server, not here.
 */
export class HttpStorageAdapter implements StorageAdapter {
  readonly name = 'http';
  private readonly base: string;

  constructor(private readonly opts: HttpAdapterOptions) {
    // Normalize away a single trailing slash so `${base}/${slug}` is clean.
    this.base = opts.baseUrl.replace(/\/+$/, '');
  }

  private async buildHeaders(extra?: Record<string, string>): Promise<Headers> {
    const headers = new Headers({ 'content-type': 'application/json', ...this.opts.headers, ...extra });
    const token = typeof this.opts.getToken === 'function'
      ? await this.opts.getToken()
      : this.opts.getToken;
    if (token) headers.set('authorization', `Bearer ${token}`);
    return headers;
  }

  private async request(path: string, init: RequestInit & { extraHeaders?: Record<string, string> }): Promise<Response> {
    const { extraHeaders, ...rest } = init;
    const headers = await this.buildHeaders(extraHeaders);
    return fetch(`${this.base}${path}`, { ...rest, headers });
  }

  async load(slug: string): Promise<StoredDocument | null> {
    const res = await this.request(`/${encodeURIComponent(slug)}`, { method: 'GET' });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Storage load failed (${res.status}) for "${slug}"`);
    return (await res.json()) as StoredDocument;
  }

  async save(slug: string, sources: StoredSource[], opts: SaveOptions = {}): Promise<StoredDocument> {
    const extraHeaders = opts.expectedVersion !== undefined ? { 'if-match': opts.expectedVersion } : undefined;
    const res = await this.request(`/${encodeURIComponent(slug)}`, {
      method: 'PUT',
      body: JSON.stringify({ sources }),
      extraHeaders,
    });
    if (res.status === 409) {
      let actual: string | undefined;
      try { actual = ((await res.json()) as { actualVersion?: string }).actualVersion; } catch { /* body optional */ }
      throw new VersionConflictError(slug, opts.expectedVersion, actual);
    }
    if (!res.ok) throw new Error(`Storage save failed (${res.status}) for "${slug}"`);
    return (await res.json()) as StoredDocument;
  }

  async remove(slug: string): Promise<void> {
    const res = await this.request(`/${encodeURIComponent(slug)}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 404) throw new Error(`Storage remove failed (${res.status}) for "${slug}"`);
  }

  async list(): Promise<DocumentSummary[]> {
    const res = await this.request('', { method: 'GET' });
    if (!res.ok) throw new Error(`Storage list failed (${res.status})`);
    return (await res.json()) as DocumentSummary[];
  }
}
