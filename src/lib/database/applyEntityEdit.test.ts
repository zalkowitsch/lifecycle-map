import { describe, expect, it } from 'vitest';
import { applyEntityEdit, applyNodeNestedEdit, editTargetFor } from '@/lib/database/applyEntityEdit';

describe('editTargetFor', () => {
  it('routes entities to their source', () => {
    expect(editTargetFor('lanes')).toEqual({ source: 'map' });
    expect(editTargetFor('features')).toEqual({ source: 'features' });
    expect(editTargetFor('nodes')).toEqual({ source: 'map' });
  });
});

describe('applyEntityEdit — lanes (map source)', () => {
  const map = () => ({ lanes: [{ id: 'a', label: 'A' }], phases: [], nodes: [], edges: [] });
  it('update sets a field on the matching lane, input not mutated', () => {
    const src = map();
    const out = applyEntityEdit(src, 'lanes', { op: 'update', id: 'a', field: 'label', value: 'AA' });
    expect((out.lanes as any)[0].label).toBe('AA');
    expect((src.lanes as any)[0].label).toBe('A'); // no mutation
  });
  it('add appends a new lane with the id', () => {
    const out = applyEntityEdit(map(), 'lanes', { op: 'add', id: 'b' });
    expect((out.lanes as any).map((l: any) => l.id)).toEqual(['a', 'b']);
  });
  it('delete removes by id', () => {
    const out = applyEntityEdit(map(), 'lanes', { op: 'delete', id: 'a' });
    expect(out.lanes).toEqual([]);
  });
});

describe('applyEntityEdit — preserves localized strings on edit', () => {
  it('updating a lang-map label only overwrites the active language', () => {
    const src = { lanes: [{ id: 'a', label: { en: 'A', pt: 'B' } }], phases: [], nodes: [], edges: [] };
    const out = applyEntityEdit(src, 'lanes', { op: 'update', id: 'a', field: 'label', value: 'X' }, 'en');
    expect((out.lanes as any)[0].label).toEqual({ en: 'X', pt: 'B' });
  });

  it('updating a plain-string label still works (no lang param)', () => {
    const src = { lanes: [{ id: 'a', label: 'A' }], phases: [], nodes: [], edges: [] };
    const out = applyEntityEdit(src, 'lanes', { op: 'update', id: 'a', field: 'label', value: 'AA' });
    expect((out.lanes as any)[0].label).toBe('AA');
  });

  it('updating a lang-map with a different active lang updates that key', () => {
    const src = { lanes: [{ id: 'a', label: { en: 'A', pt: 'B' } }], phases: [], nodes: [], edges: [] };
    const out = applyEntityEdit(src, 'lanes', { op: 'update', id: 'a', field: 'label', value: 'BB' }, 'pt');
    expect((out.lanes as any)[0].label).toEqual({ en: 'A', pt: 'BB' });
  });

  it('applies the same preservation to features datatable rows', () => {
    const dt = { _meta: { name: 'features' }, rows: { f1: { name: { en: 'One', es: 'Uno' } } } };
    const out = applyEntityEdit(dt, 'features', { op: 'update', id: 'f1', field: 'name', value: 'Two' }, 'en');
    expect((out.rows as any).f1.name).toEqual({ en: 'Two', es: 'Uno' });
  });
});

describe('applyEntityEdit — phases coerces subCols to number', () => {
  it('update subCols stores a number', () => {
    const src = { lanes: [], phases: [{ id: 'p' }], nodes: [], edges: [] };
    const out = applyEntityEdit(src, 'phases', { op: 'update', id: 'p', field: 'subCols', value: '3' });
    expect((out.phases as any)[0].subCols).toBe(3);
  });
});

describe('applyEntityEdit — features (datatable source)', () => {
  const dt = () => ({ _meta: { name: 'features' }, rows: { f1: { name: 'One' } } });
  it('update sets a field on the row', () => {
    const out = applyEntityEdit(dt(), 'features', { op: 'update', id: 'f1', field: 'name', value: 'Two' });
    expect((out.rows as any).f1.name).toBe('Two');
  });
  it('tags field splits a comma string into an array', () => {
    const out = applyEntityEdit(dt(), 'features', { op: 'update', id: 'f1', field: 'tags', value: 'a, b ,c' });
    expect((out.rows as any).f1.tags).toEqual(['a', 'b', 'c']);
  });
  it('add creates an empty row; delete removes it', () => {
    const added = applyEntityEdit(dt(), 'features', { op: 'add', id: 'f2' });
    expect((added.rows as any).f2).toEqual({});
    const removed = applyEntityEdit(dt(), 'features', { op: 'delete', id: 'f1' });
    expect((removed.rows as any).f1).toBeUndefined();
  });
  it('supports the legacy `features` rows key', () => {
    const legacy = { features: { f1: { name: 'One' } } };
    const out = applyEntityEdit(legacy, 'features', { op: 'update', id: 'f1', field: 'name', value: 'X' });
    expect((out.features as any).f1.name).toBe('X');
  });
});

describe('applyNodeNestedEdit — modules array of ids', () => {
  const map = () => ({ lanes: [], phases: [], edges: [],
    nodes: [{ id: 'n1', lane: 'l', phase: 'p', title: 'N', context: { modules: ['f1', 'f2'] } }] });
  it('update by index replaces a module id', () => {
    const out = applyNodeNestedEdit(map(), 'n1', 'modules', { op: 'update', id: '0', field: '0', value: 'fX' });
    expect((out.nodes as any)[0].context.modules).toEqual(['fX', 'f2']);
  });
  it('add appends an empty id; delete by index splices', () => {
    const added = applyNodeNestedEdit(map(), 'n1', 'modules', { op: 'add', id: '' });
    expect((added.nodes as any)[0].context.modules).toEqual(['f1', 'f2', '']);
    const removed = applyNodeNestedEdit(map(), 'n1', 'modules', { op: 'delete', id: '1' });
    expect((removed.nodes as any)[0].context.modules).toEqual(['f1']);
  });
});
