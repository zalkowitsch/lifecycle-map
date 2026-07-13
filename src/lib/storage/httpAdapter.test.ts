import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpStorageAdapter } from './httpAdapter';
import { VersionConflictError, type StoredSource } from './types';

const sources: StoredSource[] = [{ name: 'map.json', text: '{}', lang: 'json' }];

function mockFetch(handler: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
    handler(String(input), init ?? {}),
  );
  vi.stubGlobal('fetch', fn);
  return fn;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

afterEach(() => vi.unstubAllGlobals());

describe('HttpStorageAdapter', () => {
  it('load GETs {baseUrl}/{slug} and returns the document', async () => {
    const fetchFn = mockFetch(() => json({ slug: 'm', sources, version: 'v1' }));
    const a = new HttpStorageAdapter({ baseUrl: 'https://api.example.com/maps' });
    const doc = await a.load('m');
    expect(doc?.sources).toEqual(sources);
    expect(fetchFn).toHaveBeenCalledWith(
      'https://api.example.com/maps/m',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('load returns null on 404', async () => {
    mockFetch(() => new Response('', { status: 404 }));
    const a = new HttpStorageAdapter({ baseUrl: 'https://api.example.com/maps' });
    expect(await a.load('missing')).toBeNull();
  });

  it('attaches a bearer token from getToken() on every request', async () => {
    const fetchFn = mockFetch(() => json({ slug: 'm', sources, version: 'v1' }));
    const a = new HttpStorageAdapter({
      baseUrl: 'https://api.example.com/maps',
      getToken: async () => 'okta-session-token',
    });
    await a.load('m');
    const init = fetchFn.mock.calls[0]![1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.get('authorization')).toBe('Bearer okta-session-token');
  });

  it('omits the Authorization header when getToken returns null/undefined', async () => {
    const fetchFn = mockFetch(() => json({ slug: 'm', sources, version: 'v1' }));
    const a = new HttpStorageAdapter({
      baseUrl: 'https://api.example.com/maps',
      getToken: async () => null,
    });
    await a.load('m');
    const init = fetchFn.mock.calls[0]![1] as RequestInit;
    expect(new Headers(init.headers).has('authorization')).toBe(false);
  });

  it('save PUTs the sources and sends If-Match when expectedVersion is set', async () => {
    const fetchFn = mockFetch(() => json({ slug: 'm', sources, version: 'v2' }));
    const a = new HttpStorageAdapter({ baseUrl: 'https://api.example.com/maps' });
    const saved = await a.save('m', sources, { expectedVersion: 'v1' });
    expect(saved.version).toBe('v2');
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe('https://api.example.com/maps/m');
    expect((init as RequestInit).method).toBe('PUT');
    expect(new Headers((init as RequestInit).headers).get('if-match')).toBe('v1');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ sources });
  });

  it('save maps a 409 response to VersionConflictError', async () => {
    mockFetch(() => json({ actualVersion: 'v5' }, 409));
    const a = new HttpStorageAdapter({ baseUrl: 'https://api.example.com/maps' });
    await expect(a.save('m', sources, { expectedVersion: 'v1' }))
      .rejects.toBeInstanceOf(VersionConflictError);
  });

  it('remove DELETEs the slug', async () => {
    const fetchFn = mockFetch(() => new Response(null, { status: 204 }));
    const a = new HttpStorageAdapter({ baseUrl: 'https://api.example.com/maps' });
    await a.remove('m');
    expect(fetchFn).toHaveBeenCalledWith(
      'https://api.example.com/maps/m',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('list GETs the base and returns summaries', async () => {
    mockFetch(() => json([{ slug: 'a', version: 'v1' }, { slug: 'b', version: 'v3' }]));
    const a = new HttpStorageAdapter({ baseUrl: 'https://api.example.com/maps' });
    const list = await a.list();
    expect(list.map((d) => d.slug)).toEqual(['a', 'b']);
  });

  it('throws a descriptive error on a non-ok, non-404/409 response', async () => {
    mockFetch(() => new Response('boom', { status: 500 }));
    const a = new HttpStorageAdapter({ baseUrl: 'https://api.example.com/maps' });
    await expect(a.load('m')).rejects.toThrow(/500/);
  });

  it('normalizes a baseUrl with a trailing slash', async () => {
    const fetchFn = mockFetch(() => json({ slug: 'm', sources, version: 'v1' }));
    const a = new HttpStorageAdapter({ baseUrl: 'https://api.example.com/maps/' });
    await a.load('m');
    expect(fetchFn.mock.calls[0]![0]).toBe('https://api.example.com/maps/m');
  });
});
