import { describe, expect, it } from 'vitest';
import { countDependents } from '@/lib/database/countDependents';

const map = {
  lanes: [{ id: 'patient' }, { id: 'biller' }],
  phases: [{ id: 'preVisit' }],
  nodes: [
    { id: 'n1', lane: 'patient', phase: 'preVisit', context: { modules: ['f1', 'f2'] } },
    { id: 'n2', lane: 'biller', phase: 'preVisit', context: { modules: ['f1'] } },
    { id: 'n3', lane: 'patient', phase: 'preVisit', context: {} },
  ],
};

describe('countDependents', () => {
  it('features: counts nodes whose modules include the id', () => {
    expect(countDependents(map, 'features', 'f1')).toBe(2);
    expect(countDependents(map, 'features', 'f2')).toBe(1);
    expect(countDependents(map, 'features', 'nope')).toBe(0);
  });
  it('lanes: counts nodes on the lane', () => {
    expect(countDependents(map, 'lanes', 'patient')).toBe(2);
    expect(countDependents(map, 'lanes', 'biller')).toBe(1);
  });
  it('phases: counts nodes in the phase', () => {
    expect(countDependents(map, 'phases', 'preVisit')).toBe(3);
  });
  it('nodes: always 0 (edges handled elsewhere)', () => {
    expect(countDependents(map, 'nodes', 'n1')).toBe(0);
  });
});
