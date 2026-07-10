import { describe, expect, it, vi } from 'vitest';
import { DatatableRegistry } from '@/lib/datatables/registry';
import { resolveFieldValue, DEFAULT_MAX_DEPTH } from '@/lib/datatables/resolveRefs';
import type { Datatable } from '@/lib/datatables/types';

function reg(...tables: Datatable[]) {
  return new DatatableRegistry(tables);
}
const ctx = () => ({ depth: 0, maxDepth: DEFAULT_MAX_DEPTH, seen: new Set<string>(), schema: {} });

describe('resolveFieldValue', () => {
  it('resolves a string id against the given target table', () => {
    const r = reg({ name: 'features', schema: {}, rows: { f1: { name: 'Rules' } } });
    expect(resolveFieldValue('f1', 'features', r, ctx())).toEqual({ name: 'Rules' });
  });

  it('resolves an array of string ids per element', () => {
    const r = reg({ name: 'features', schema: {}, rows: { f1: { name: 'A' }, f2: { name: 'B' } } });
    expect(resolveFieldValue(['f1', 'f2'], 'features', r, ctx())).toEqual([{ name: 'A' }, { name: 'B' }]);
  });

  it('resolves an explicit {table,id} object ignoring the target table', () => {
    const r = reg({ name: 'people', schema: {}, rows: { jake: { role: 'Eng' } } });
    expect(resolveFieldValue({ table: 'people', id: 'jake' }, 'features', r, ctx())).toEqual({ role: 'Eng' });
  });

  it('resolves an explicit {table,id} object even with extra keys', () => {
    const r = reg({ name: 'people', schema: {}, rows: { jake: { role: 'Eng' } } });
    expect(resolveFieldValue({ table: 'people', id: 'jake', note: 'x' }, undefined, r, ctx())).toEqual({ role: 'Eng' });
  });

  it('recurses into a resolved row\'s own ref columns via its schema', () => {
    const r = reg(
      { name: 'features', schema: { owner: { ref: 'people' } }, rows: { f1: { name: 'Rules', owner: 'jake' } } },
      { name: 'people', schema: {}, rows: { jake: { role: 'Eng' } } },
    );
    expect(resolveFieldValue('f1', 'features', r, ctx())).toEqual({
      name: 'Rules',
      owner: { role: 'Eng' },
    });
  });

  it('flags a broken ref and warns, without throwing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const r = reg({ name: 'features', schema: {}, rows: {} });
    expect(resolveFieldValue('missing', 'features', r, ctx())).toEqual({
      _unresolved: true, table: 'features', id: 'missing',
    });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('truncates a cycle: feature -> owner -> team -> feature', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const r = reg(
      { name: 'features', schema: { owner: { ref: 'people' } }, rows: { f1: { owner: 'jake' } } },
      { name: 'people', schema: { team: { ref: 'teams' } }, rows: { jake: { team: 't1' } } },
      { name: 'teams', schema: { lead: { ref: 'features' } }, rows: { t1: { lead: 'f1' } } },
    );
    const out = resolveFieldValue('f1', 'features', r, ctx()) as any;
    // f1 -> owner(jake) -> team(t1) -> lead(f1) : f1 already seen -> left as raw ref
    expect(out.owner.team.lead).toEqual({ table: 'features', id: 'f1' });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('respects the depth cap', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const r = reg(
      { name: 'a', schema: { next: { ref: 'a' } }, rows: {
        x1: { next: 'x2' }, x2: { next: 'x3' }, x3: { next: 'x4' }, x4: { name: 'deep' },
      } },
    );
    const shallow = { depth: 0, maxDepth: 1, seen: new Set<string>(), schema: {} };
    const out = resolveFieldValue('x1', 'a', r, shallow) as any;
    // depth 1 resolves x1; x2 is at the cap -> left raw
    expect(out.next).toEqual({ table: 'a', id: 'x2' });
    warn.mockRestore();
  });

  it('leaves a plain non-ref value (no target table) as a literal', () => {
    const r = reg();
    expect(resolveFieldValue('just text', undefined, r, ctx())).toBe('just text');
  });

  it('flags a reserved-word id as a broken ref, not prototype', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const r = reg({ name: 'features', schema: {}, rows: {} });
    expect(resolveFieldValue('__proto__', 'features', r, ctx())).toEqual({
      _unresolved: true, table: 'features', id: '__proto__',
    });
    warn.mockRestore();
  });
});
