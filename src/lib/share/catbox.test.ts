// Tests for src/lib/share/catbox.ts
//
// Mocks the global fetch and verifies upload + share-URL shape.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { shareCatbox, uploadToCatbox } from '@/lib/share/catbox';

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
    text: async () => 'https://files.catbox.moe/abc123.json',
  })) as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('uploadToCatbox', () => {
  it('POSTs to catbox api.php and returns the URL', async () => {
    const blob = new Blob(['{}'], { type: 'application/json' });
    const url = await uploadToCatbox(blob, 'name.json');
    expect(url).toBe('https://files.catbox.moe/abc123.json');

    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, calledOpts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(calledUrl).toBe('https://catbox.moe/user/api.php');
    expect(calledOpts.method).toBe('POST');
    expect(calledOpts.body).toBeInstanceOf(FormData);

    const form = calledOpts.body as FormData;
    expect(form.get('reqtype')).toBe('fileupload');
    const uploaded = form.get('fileToUpload');
    expect(uploaded).toBeInstanceOf(Blob);
    // FormData preserves the supplied filename for File entries.
    if (uploaded instanceof File) {
      expect(uploaded.name).toBe('name.json');
    }
  });

  it('throws with the status code when HTTP response is not ok', async () => {
    mockFetchOnce({
      ok: false,
      status: 503,
      text: async () => '',
    });
    const blob = new Blob(['{}'], { type: 'application/json' });
    await expect(uploadToCatbox(blob, 'name.json')).rejects.toThrow(/HTTP 503/);
  });

  it('throws when the response body is not a URL (catbox error string)', async () => {
    mockFetchOnce({
      ok: true,
      text: async () => 'something went wrong',
    });
    const blob = new Blob(['{}'], { type: 'application/json' });
    await expect(uploadToCatbox(blob, 'name.json')).rejects.toThrow(/catbox\.moe returned/);
  });

  it('trims the returned URL', async () => {
    mockFetchOnce({
      ok: true,
      text: async () => '   https://files.catbox.moe/xyz.json   \n',
    });
    const blob = new Blob(['{}'], { type: 'application/json' });
    await expect(uploadToCatbox(blob, 'name.json')).resolves.toBe(
      'https://files.catbox.moe/xyz.json',
    );
  });
});

describe('shareCatbox', () => {
  it('returns { url, rawUrl } with ?src= encoded raw URL', async () => {
    const result = await shareCatbox('{"a":1}', 'http://viewer.example/');
    expect(result.rawUrl).toBe('https://files.catbox.moe/abc123.json');
    expect(result.url).toBe(
      'http://viewer.example/?src=' +
        encodeURIComponent('https://files.catbox.moe/abc123.json'),
    );
  });

  it('uploads a JSON blob with the lifecycle-map.json filename', async () => {
    await shareCatbox('{"a":1}', 'http://viewer.example/');
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    const form = opts.body as FormData;
    const file = form.get('fileToUpload');
    expect(file).toBeInstanceOf(Blob);
    if (file instanceof File) {
      expect(file.name).toBe('lifecycle-map.json');
      expect(file.type).toBe('application/json');
    }
  });
});
