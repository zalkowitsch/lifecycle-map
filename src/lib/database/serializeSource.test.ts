import { describe, expect, it } from 'vitest';
import { serializeSource } from '@/lib/database/serializeSource';

describe('serializeSource', () => {
  it('serializes JSON with 2-space indent and trailing newline', () => {
    const out = serializeSource({ a: 1, b: ['x'] }, 'json');
    expect(out).toBe('{\n  "a": 1,\n  "b": [\n    "x"\n  ]\n}\n');
  });

  it('round-trips a JSON object (parse(serialize(x)) deep-equals x)', () => {
    const obj = { meta: { title: 'T' }, nodes: [{ id: 'n1' }], edges: [] };
    expect(JSON.parse(serializeSource(obj, 'json'))).toEqual(obj);
  });

  it('serializes YAML when lang is yaml', () => {
    const out = serializeSource({ a: 1 }, 'yaml');
    expect(out).toContain('a: 1');
    expect(out).not.toContain('{'); // block style, not flow
  });
});
