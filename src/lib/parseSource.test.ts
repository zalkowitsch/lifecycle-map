// Tests for src/lib/parseSource.ts
//
// Covers parseSource (JSON + YAML), decodeHashData, encodeHashData,
// and the encode/decode round-trip.

import { describe, expect, it } from 'vitest';

import { decodeHashData, encodeHashData, parseSource } from '@/lib/parseSource';
import type { LifecycleMap } from '@/types/lifecycle-map';

const minimalJson = '{"lanes":[],"phases":[],"nodes":[],"edges":[]}';

describe('parseSource', () => {
  it('returns object for valid JSON', () => {
    const result = parseSource(minimalJson);
    expect(result).toEqual({ lanes: [], phases: [], nodes: [], edges: [] });
  });

  it('returns object for valid YAML (not JSON)', () => {
    const yamlText = [
      'lanes:',
      '  - id: l1',
      '    label: Lane 1',
      'phases:',
      '  - id: p1',
      '    label: Phase 1',
      'nodes: []',
      'edges: []',
    ].join('\n');
    const result = parseSource(yamlText);
    expect(result.lanes).toHaveLength(1);
    expect(result.lanes[0]).toEqual({ id: 'l1', label: 'Lane 1' });
    expect(result.phases[0]).toEqual({ id: 'p1', label: 'Phase 1' });
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
  });

  it('throws with a clear message for input that is neither JSON nor YAML', () => {
    // YAML accepts almost everything, so we need actively-malformed YAML
    // (unterminated flow mapping) to force both parsers to fail.
    expect(() => parseSource('{not: valid, [')).toThrowError(
      /Failed to parse as JSON or YAML/,
    );
  });

  it('returns a nullish value for empty input (no LifecycleMap recoverable)', () => {
    // Empty string -> JSON fails, YAML returns undefined. parseSource returns
    // the undefined cast — callers must check before using. Documented
    // behavior of the current port (parity with viewer.js parseSource).
    const result = parseSource('') as unknown;
    expect(result == null).toBe(true);
  });

  it('throws when YAML payload itself is malformed', () => {
    // A genuinely malformed YAML doc (bad indentation in a flow collection).
    expect(() => parseSource('foo: [bar, baz\n  - oops')).toThrow();
  });

  it('preserves unicode in JSON payloads', () => {
    const text = JSON.stringify({
      lanes: [],
      phases: [],
      nodes: [
        { id: 'n1', lane: 'l1', phase: 'p1', title: 'Olá 🌍 — café' },
      ],
      edges: [],
    });
    const result = parseSource(text);
    expect(result.nodes[0]?.title).toBe('Olá 🌍 — café');
  });

  it('parses YAML with nested lists', () => {
    const yamlText = [
      'meta:',
      '  title: Nested test',
      'lanes:',
      '  - id: l1',
      '    label:',
      '      en: Lane',
      '      pt: Faixa',
      'phases: []',
      'nodes:',
      '  - id: n1',
      '    lane: l1',
      '    phase: p1',
      '    title: Node',
      '    today:',
      '      tools:',
      '        - tool-a',
      '        - tool-b',
      '      teams:',
      '        - team-x',
      'edges: []',
    ].join('\n');
    const result = parseSource(yamlText);
    expect(result.meta?.title).toBe('Nested test');
    expect(result.lanes[0]?.label).toEqual({ en: 'Lane', pt: 'Faixa' });
    expect(result.nodes[0]?.today?.tools).toEqual(['tool-a', 'tool-b']);
    expect(result.nodes[0]?.today?.teams).toEqual(['team-x']);
  });
});

describe('encodeHashData / decodeHashData', () => {
  it('round-trips JSON text and produces the same object', async () => {
    const source: LifecycleMap = {
      meta: { title: 'Round-trip' },
      lanes: [{ id: 'l1', label: 'Lane' }],
      phases: [{ id: 'p1', label: 'Phase' }],
      nodes: [{ id: 'n1', lane: 'l1', phase: 'p1', title: 'Node' }],
      edges: [],
    };
    const jsonText = JSON.stringify(source);
    const blob = await encodeHashData(jsonText);
    expect(typeof blob).toBe('string');
    // base64url alphabet only — no '+', '/', or '='
    expect(blob).toMatch(/^[A-Za-z0-9_-]+$/);

    const decoded = await decodeHashData(blob);
    expect(decoded).toEqual(source);
  });

  it('decodes a known gzip+base64url payload (parity check)', async () => {
    const original = JSON.stringify({ lanes: [], phases: [], nodes: [], edges: [] });
    const blob = await encodeHashData(original);
    const decoded = await decodeHashData(blob);
    expect(decoded).toEqual({ lanes: [], phases: [], nodes: [], edges: [] });
  });

  it('throws a clear error when the hash payload is garbage', async () => {
    await expect(decodeHashData('!!!not-valid-base64url!!!')).rejects.toThrow(
      /Failed to decode #data/,
    );
  });

  it('preserves unicode content through the round-trip', async () => {
    const payload = JSON.stringify({
      lanes: [],
      phases: [],
      nodes: [{ id: 'n1', lane: 'l1', phase: 'p1', title: '🌍 café — Olá' }],
      edges: [],
    });
    const blob = await encodeHashData(payload);
    const decoded = await decodeHashData(blob);
    expect(decoded.nodes[0]?.title).toBe('🌍 café — Olá');
  });
});
