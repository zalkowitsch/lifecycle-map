import { describe, expect, it } from 'vitest';
import { DatatableRegistry } from '@/lib/datatables/registry';
import type { Datatable } from '@/lib/datatables/types';

const features: Datatable = {
  name: 'features',
  schema: {},
  rows: { f1: { name: 'Rules' } },
};

describe('DatatableRegistry', () => {
  it('indexes tables by name and looks rows up by id', () => {
    const reg = new DatatableRegistry([features]);
    expect(reg.getRow('features', 'f1')).toEqual({ name: 'Rules' });
    expect(reg.has('features')).toBe(true);
    expect(reg.size).toBe(1);
  });

  it('returns undefined for a missing table or id', () => {
    const reg = new DatatableRegistry([features]);
    expect(reg.getRow('people', 'x')).toBeUndefined();
    expect(reg.getRow('features', 'nope')).toBeUndefined();
  });

  it('add() registers a table after construction', () => {
    const reg = new DatatableRegistry();
    reg.add(features);
    expect(reg.getRow('features', 'f1')).toEqual({ name: 'Rules' });
  });

  it('returns undefined for inherited/reserved-word ids (no prototype leakage)', () => {
    const reg = new DatatableRegistry([features]);
    expect(reg.getRow('features', '__proto__')).toBeUndefined();
    expect(reg.getRow('features', 'constructor')).toBeUndefined();
    expect(reg.getRow('features', 'toString')).toBeUndefined();
  });
});
