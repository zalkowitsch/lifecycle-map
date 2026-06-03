// Tests for src/lib/share/embed.ts
//
// Covers gzipBase64Url alphabet, shareEmbedded URL shape, and the
// encode/decode round-trip via parseSource.decodeHashData.

import { describe, expect, it } from 'vitest';

import { gzipBase64Url, shareEmbedded } from '@/lib/share/embed';
import { decodeHashData } from '@/lib/parseSource';

describe('gzipBase64Url', () => {
  it('returns a base64url string with no padding or unsafe chars', async () => {
    const encoded = await gzipBase64Url('hello world');
    expect(typeof encoded).toBe('string');
    expect(encoded.length).toBeGreaterThan(0);
    expect(encoded).not.toContain('=');
    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('produces stable output for empty input', async () => {
    const a = await gzipBase64Url('');
    const b = await gzipBase64Url('');
    expect(a).toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('handles large inputs without blowing the stack (chunked fromCharCode)', async () => {
    const big = 'A'.repeat(200_000);
    const encoded = await gzipBase64Url(big);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    // gzip should compress repetitive data significantly
    expect(encoded.length).toBeLessThan(big.length);
  });
});

describe('shareEmbedded', () => {
  it('returns { url, size } with #data= fragment appended to baseUrl', async () => {
    const json = '{"lanes":[],"phases":[],"nodes":[],"edges":[]}';
    const baseUrl = 'https://x.com/';
    const result = await shareEmbedded(json, baseUrl);
    expect(result.url.startsWith('https://x.com/#data=')).toBe(true);
    expect(typeof result.size).toBe('number');
    expect(result.size).toBeGreaterThan(0);

    const fragment = result.url.split('#data=')[1]!;
    expect(fragment.length).toBe(result.size);
    expect(fragment).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('preserves the supplied baseUrl exactly (no rewriting)', async () => {
    const result = await shareEmbedded('"x"', 'https://example.com/sub/path/');
    expect(result.url.startsWith('https://example.com/sub/path/#data=')).toBe(true);
  });
});

describe('shareEmbedded round-trip via decodeHashData', () => {
  it('encodes then decodes back to the same object', async () => {
    const source = {
      meta: { title: 'Round-trip' },
      lanes: [{ id: 'l1', label: 'Lane' }],
      phases: [{ id: 'p1', label: 'Phase' }],
      nodes: [{ id: 'n1', lane: 'l1', phase: 'p1', title: 'Node' }],
      edges: [],
    };
    const jsonText = JSON.stringify(source);
    const { url } = await shareEmbedded(jsonText, 'https://x.com/');
    const fragment = url.split('#data=')[1]!;
    const decoded = await decodeHashData(fragment);
    expect(decoded).toEqual(source);
  });

  it('preserves unicode through the round-trip', async () => {
    const source = {
      lanes: [],
      phases: [],
      nodes: [{ id: 'n1', lane: 'l1', phase: 'p1', title: 'Olá 🌍 — café' }],
      edges: [],
    };
    const { url } = await shareEmbedded(JSON.stringify(source), 'https://x.com/');
    const fragment = url.split('#data=')[1]!;
    const decoded = await decodeHashData(fragment);
    expect(decoded.nodes[0]?.title).toBe('Olá 🌍 — café');
  });
});
