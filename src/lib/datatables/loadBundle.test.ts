import { describe, expect, it } from 'vitest';
import { loadBundle } from '@/lib/datatables/loadBundle';

const lifecycle = JSON.stringify({
  meta: { datatables: { people: { schema: { skills: { ref: '__list__' } } } } },
  nodes: [{ id: 'n1', lane: 'l', phase: 'p', title: 'N' }],
  edges: [],
  lanes: [], phases: [],
});
const featuresDt = JSON.stringify({ _meta: { name: 'features' }, rows: { f1: { name: 'Rules' } } });
const peopleCsv = 'id,role,skills\njake,Eng,ts;react';

describe('loadBundle', () => {
  it('identifies the lifecycle file and builds a registry from the rest', () => {
    const b = loadBundle([
      { name: 'features.json', text: featuresDt },
      { name: 'biller.json', text: lifecycle },
      { name: 'people.csv', text: peopleCsv },
    ]);
    expect(b.lifecycleName).toBe('biller.json');
    expect(b.mergedCount).toBe(2);
    expect(b.registry.getRow('features', 'f1')).toEqual({ name: 'Rules' });
    // CSV schema (skills as list) came from meta.datatables.people.schema
    expect(b.registry.getRow('people', 'jake')).toEqual({ role: 'Eng', skills: ['ts', 'react'] });
  });

  it('single file (just the lifecycle) yields an empty registry', () => {
    const b = loadBundle([{ name: 'biller.json', text: lifecycle }]);
    expect(b.lifecycleName).toBe('biller.json');
    expect(b.mergedCount).toBe(0);
    expect(b.registry.size).toBe(0);
  });

  it('throws when no file has `nodes`', () => {
    expect(() => loadBundle([{ name: 'a.json', text: featuresDt }])).toThrow(/no lifecycle map/i);
  });
});
