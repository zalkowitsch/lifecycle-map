import type { Entity, EntityEdit, EditTarget } from './types';

/** Deep clone via JSON (sources are plain JSON-safe objects). */
function clone<T>(o: T): T {
  return JSON.parse(JSON.stringify(o)) as T;
}

const LANG_KEY_RE = /^[a-z]{2}(-[A-Z]{2})?$/;

/**
 * Whether `value` is a localized-string map (e.g. `{ en: 'A', pt: 'B' }`):
 * a non-array plain object with at least one key, every key a lang code,
 * and every value a string. Mirrors the `discoverLangs` predicate in
 * App.tsx so both agree on what counts as a lang-map.
 */
function isLangMap(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys = Object.keys(value as Record<string, unknown>);
  if (keys.length === 0) return false;
  const obj = value as Record<string, unknown>;
  return keys.every((k) => LANG_KEY_RE.test(k)) && keys.every((k) => typeof obj[k] === 'string');
}

/**
 * Set a field's value, preserving other languages when the existing value
 * is a lang-map: only the active `lang`'s entry is overwritten, and the
 * cloned map (with other langs intact) is written back. Otherwise the
 * field is set to `value` as-is (today's plain-overwrite behavior).
 */
function setFieldPreservingLangs(row: Record<string, unknown>, field: string, value: unknown, lang: string): void {
  const existing = row[field];
  if (isLangMap(existing)) {
    row[field] = { ...existing, [lang]: value };
  } else {
    row[field] = value;
  }
}

export function editTargetFor(entity: Entity): EditTarget {
  return entity === 'features' ? { source: 'features' } : { source: 'map' };
}

function rowsDict(dt: Record<string, unknown>): { key: 'rows' | 'features' | 'modules'; dict: Record<string, unknown> } {
  if (dt.rows && typeof dt.rows === 'object') return { key: 'rows', dict: dt.rows as Record<string, unknown> };
  if (dt.features && typeof dt.features === 'object') return { key: 'features', dict: dt.features as Record<string, unknown> };
  if (dt.modules && typeof dt.modules === 'object') return { key: 'modules', dict: dt.modules as Record<string, unknown> };
  return { key: 'rows', dict: {} };
}

/** Apply an edit for a map-array entity (lanes/phases/nodes). */
function editMapArray(
  map: Record<string, unknown>,
  arrKey: 'lanes' | 'phases' | 'nodes',
  edit: EntityEdit,
  lang: string,
): Record<string, unknown> {
  const out = clone(map);
  const arr = (Array.isArray(out[arrKey]) ? out[arrKey] : []) as Record<string, unknown>[];
  if (edit.op === 'add') {
    const base: Record<string, unknown> =
      arrKey === 'nodes' ? { id: edit.id, lane: '', phase: '', title: edit.id } : { id: edit.id };
    arr.push(base);
  } else if (edit.op === 'delete') {
    out[arrKey] = arr.filter((r) => r.id !== edit.id);
    return out;
  } else {
    const row = arr.find((r) => r.id === edit.id);
    if (row) {
      const value = edit.field === 'subCols' ? Number(edit.value) : edit.value;
      setFieldPreservingLangs(row, edit.field, value, lang);
    }
  }
  out[arrKey] = arr;
  return out;
}

export function applyEntityEdit(
  sourceObj: Record<string, unknown>,
  entity: Entity,
  edit: EntityEdit,
  lang = 'en',
): Record<string, unknown> {
  if (entity === 'lanes' || entity === 'phases' || entity === 'nodes') {
    return editMapArray(sourceObj, entity, edit, lang);
  }
  // features → datatable rows dict
  const out = clone(sourceObj);
  const { key, dict } = rowsDict(out);
  const d = clone(dict);
  if (edit.op === 'add') {
    d[edit.id] = {};
  } else if (edit.op === 'delete') {
    delete d[edit.id];
  } else {
    const row = (d[edit.id] && typeof d[edit.id] === 'object' ? d[edit.id] : {}) as Record<string, unknown>;
    const value = edit.field === 'tags'
      ? String(edit.value).split(',').map((s) => s.trim()).filter(Boolean)
      : edit.value;
    setFieldPreservingLangs(row, edit.field, value, lang);
    d[edit.id] = row;
  }
  out[key] = d;
  return out;
}

export function applyNodeNestedEdit(
  mapObj: Record<string, unknown>,
  nodeId: string,
  field: 'modules' | 'states' | 'meta',
  edit: EntityEdit,
): Record<string, unknown> {
  const out = clone(mapObj);
  const nodes = (Array.isArray(out.nodes) ? out.nodes : []) as Record<string, unknown>[];
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return out;
  const context = (node.context && typeof node.context === 'object' ? node.context : {}) as Record<string, unknown>;
  const arr = (Array.isArray(context[field]) ? context[field] : []) as unknown[];

  if (field === 'modules') {
    if (edit.op === 'add') arr.push('');
    else if (edit.op === 'delete') arr.splice(Number(edit.id), 1);
    else arr[Number(edit.field)] = edit.value;
  } else {
    // states / meta: arrays of objects keyed by index too (v1 scope: modules is the ref case)
    if (edit.op === 'add') arr.push({});
    else if (edit.op === 'delete') arr.splice(Number(edit.id), 1);
    else {
      const item = (arr[Number(edit.id)] && typeof arr[Number(edit.id)] === 'object'
        ? arr[Number(edit.id)] : {}) as Record<string, unknown>;
      item[edit.field] = edit.value;
      arr[Number(edit.id)] = item;
    }
  }
  context[field] = arr;
  node.context = context;
  out.nodes = nodes;
  return out;
}
