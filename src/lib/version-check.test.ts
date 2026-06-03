// Tests for src/lib/version-check.ts
//
// Covers the exported constants, fetchLatestSha success/failure paths.
// hardRefresh isn't exercised here — it mutates window.location, which is
// brittle/risky in jsdom.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BRANCH,
  INITIAL_DELAY_MS,
  POLL_INTERVAL_MS,
  REPO,
  fetchLatestSha,
} from '@/lib/version-check';

describe('constants', () => {
  it('REPO targets zalkowitsch/lifecycle-map', () => {
    expect(REPO).toBe('zalkowitsch/lifecycle-map');
  });

  it('BRANCH is main', () => {
    expect(BRANCH).toBe('main');
  });

  it('POLL_INTERVAL_MS is 60s', () => {
    expect(POLL_INTERVAL_MS).toBe(60_000);
  });

  it('INITIAL_DELAY_MS is 20s', () => {
    expect(INITIAL_DELAY_MS).toBe(20_000);
  });
});

describe('fetchLatestSha', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('returns sha when fetch resolves with HTTP 200 and { sha } payload', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ sha: 'abc123' }),
    }));
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const sha = await fetchLatestSha();
    expect(sha).toBe('abc123');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('api.github.com/repos/zalkowitsch/lifecycle-map/commits/main');
    expect(init.method).toBe('GET');
    expect(init.cache).toBe('no-store');
  });

  it('returns null on HTTP 404', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 404,
      json: async () => ({}),
    })) as unknown as typeof globalThis.fetch;

    expect(await fetchLatestSha()).toBeNull();
  });

  it('returns null on HTTP 403 (rate-limited)', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 403,
      json: async () => ({}),
    })) as unknown as typeof globalThis.fetch;

    expect(await fetchLatestSha()).toBeNull();
  });

  it('returns null on network error (fetch rejects)', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error('network down');
    }) as unknown as typeof globalThis.fetch;

    expect(await fetchLatestSha()).toBeNull();
  });

  it('returns null when payload has no sha string', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({}),
    })) as unknown as typeof globalThis.fetch;

    expect(await fetchLatestSha()).toBeNull();
  });

  it('returns null when payload sha is not a string', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ sha: 12345 }),
    })) as unknown as typeof globalThis.fetch;

    expect(await fetchLatestSha()).toBeNull();
  });

  it('returns null when json() itself throws', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => {
        throw new Error('not json');
      },
    })) as unknown as typeof globalThis.fetch;

    expect(await fetchLatestSha()).toBeNull();
  });
});
