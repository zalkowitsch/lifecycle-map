// Tests for src/lib/share/zerox.ts
//
// Mocks the global fetch and verifies upload + share-URL shape.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { shareZeroXZero, uploadToZeroXZero } from '@/lib/share/zerox';

const originalFetch = globalThis.fetch;

interface FakeResponse {
  ok: boolean;
  status?: number;
  text: () => Promise<string>;
}

function mockFetchOnce(response: FakeResponse): ReturnType<typeof vi.fn> {
  const fn = vi.fn(async () => response);
  globalThis.fetch = fn as unknown as typeof fetch;
  return fn;
}

beforeEach(() => {
  globalThis.fetch = vi.fn(async () => ({
    ok: true,
    status: 200,
    text: async () => 'https://0x0.st/AbC.json',
  })) as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('uploadToZeroXZero', () => {
  it('POSTs to 0x0.st and returns the URL', async () => {
    const blob = new Blob(['{}'], { type: 'application/json' });
    const url = await uploadToZeroXZero(blob, 'name.json');
    expect(url).toBe('https://0x0.st/AbC.json');

    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, calledOpts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(calledUrl).toBe('https://0x0.st');
    expect(calledOpts.method).toBe('POST');
    expect(calledOpts.body).toBeInstanceOf(FormData);

    const form = calledOpts.body as FormData;
    const uploaded = form.get('file');
    expect(uploaded).toBeInstanceOf(Blob);
    if (uploaded instanceof File) {
      expect(uploaded.name).toBe('name.json');
    }
  });

  it('throws with status code on HTTP error', async () => {
    mockFetchOnce({
      ok: false,
      status: 502,
      text: async () => '',
    });
    const blob = new Blob(['{}'], { type: 'application/json' });
    await expect(uploadToZeroXZero(blob, 'name.json')).rejects.toThrow(/HTTP 502/);
  });

  it('throws when response is not a URL', async () => {
    mockFetchOnce({
      ok: true,
      text: async () => 'rate limited',
    });
    const blob = new Blob(['{}'], { type: 'application/json' });
    await expect(uploadToZeroXZero(blob, 'name.json')).rejects.toThrow(/0x0\.st returned/);
  });

  it('trims the returned URL', async () => {
    mockFetchOnce({
      ok: true,
      text: async () => '  https://0x0.st/zzz \n',
    });
    const blob = new Blob(['{}'], { type: 'application/json' });
    await expect(uploadToZeroXZero(blob, 'name.json')).resolves.toBe('https://0x0.st/zzz');
  });
});

describe('shareZeroXZero', () => {
  it('returns { url, rawUrl } with ?src= encoded raw URL', async () => {
    const result = await shareZeroXZero('{"a":1}', 'http://viewer.example/');
    expect(result.rawUrl).toBe('https://0x0.st/AbC.json');
    expect(result.url).toBe(
      'http://viewer.example/?src=' + encodeURIComponent('https://0x0.st/AbC.json'),
    );
  });

  it('uploads a JSON blob with the lifecycle-map.json filename', async () => {
    await shareZeroXZero('{"a":1}', 'http://viewer.example/');
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    const form = opts.body as FormData;
    const file = form.get('file');
    expect(file).toBeInstanceOf(Blob);
    if (file instanceof File) {
      expect(file.name).toBe('lifecycle-map.json');
      expect(file.type).toBe('application/json');
    }
  });
});
