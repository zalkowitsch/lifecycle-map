import { describe, expect, it } from 'vitest';
import { parseDatatable } from '@/lib/datatables/parseDatatable';

describe('parseDatatable — JSON', () => {
  it('reads _meta.name, _schema, and rows', () => {
    const text = JSON.stringify({
      _meta: { name: 'features' },
      _schema: { owner: { ref: 'people' } },
      rows: { f1: { name: 'Rules', owner: 'jake' } },
    });
    const dt = parseDatatable(text, { format: 'json' });
    expect(dt.name).toBe('features');
    expect(dt.schema).toEqual({ owner: { ref: 'people' } });
    expect(dt.rows.f1).toEqual({ name: 'Rules', owner: 'jake' });
  });

  it('accepts the legacy `features` key as rows and drops string comment markers', () => {
    const text = JSON.stringify({
      features: {
        _comment_x: '==== marker ====',
        f1: { name: 'Rules' },
      },
    });
    const dt = parseDatatable(text, { format: 'json', name: 'features' });
    expect(dt.rows.f1).toEqual({ name: 'Rules' });
    expect(dt.rows._comment_x).toBeUndefined();
  });

  it('falls back to the opts.name when _meta.name is absent', () => {
    const dt = parseDatatable(JSON.stringify({ rows: {} }), { format: 'json', name: 'wedges' });
    expect(dt.name).toBe('wedges');
  });
});

describe('parseDatatable — CSV', () => {
  it('uses first column `id` as row key, other columns as fields', () => {
    const text = 'id,name,today\nf1,Rules,Manual\nf2,Posting,Auto';
    const dt = parseDatatable(text, { format: 'csv', name: 'features' });
    expect(dt.rows.f1).toEqual({ name: 'Rules', today: 'Manual' });
    expect(dt.rows.f2).toEqual({ name: 'Posting', today: 'Auto' });
  });

  it('splits a cell into an array only for schema-declared list columns', () => {
    const text = 'id,name,tags\nf1,Rules,a;b;c';
    const listSchema = { tags: { ref: '__list__' } };
    const dt = parseDatatable(text, { format: 'csv', name: 'features', schema: listSchema });
    // tags declared a list -> split; name not -> kept as string even if it had ';'
    expect(dt.rows.f1.tags).toEqual(['a', 'b', 'c']);
    expect(dt.rows.f1.name).toBe('Rules');
  });

  it('does NOT split a non-list column containing a semicolon', () => {
    const text = 'id,note\nf1,see: a; then b';
    const dt = parseDatatable(text, { format: 'csv', name: 't' });
    expect(dt.rows.f1.note).toBe('see: a; then b');
  });
});
