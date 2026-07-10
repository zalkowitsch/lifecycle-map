import { parseSource } from '@/lib/parseSource';
import type { Datatable, DatatableSchema } from './types';

export interface ParseDatatableOpts {
  name?: string;
  format?: 'json' | 'csv';
  /** For CSV (which can't embed _schema): declares list/ref columns. */
  schema?: DatatableSchema;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function parseJson(text: string, opts: ParseDatatableOpts): Datatable {
  const raw = parseSource(text) as unknown as Record<string, unknown>;
  const meta = isObject(raw._meta) ? raw._meta : {};
  const name = (typeof meta.name === 'string' && meta.name) || opts.name || 'table';
  const schema = (isObject(raw._schema) ? raw._schema : opts.schema ?? {}) as DatatableSchema;
  // rows may live under `rows` (canonical) or a legacy `features`/`modules` key.
  const rowsSrc =
    (isObject(raw.rows) && raw.rows) ||
    (isObject(raw.features) && raw.features) ||
    (isObject(raw.modules) && raw.modules) ||
    {};
  const rows: Record<string, Record<string, unknown>> = {};
  for (const [id, def] of Object.entries(rowsSrc)) {
    if (isObject(def)) rows[id] = def; // drop string comment markers
  }
  return { name, schema, rows };
}

/** Split a single CSV line into cells, honoring double-quote quoting. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

function parseCsv(text: string, opts: ParseDatatableOpts): Datatable {
  const schema = opts.schema ?? {};
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter((l) => l.trim() !== '');
  const rows: Record<string, Record<string, unknown>> = {};
  if (lines.length === 0) return { name: opts.name || 'table', schema, rows };
  const header = lines[0];
  if (header === undefined) return { name: opts.name || 'table', schema, rows };
  const headers = splitCsvLine(header);
  for (let r = 1; r < lines.length; r++) {
    const line = lines[r];
    if (line === undefined) continue;
    const cells = splitCsvLine(line);
    const id = cells[0];
    if (!id) continue;
    const row: Record<string, unknown> = {};
    for (let c = 1; c < headers.length; c++) {
      const col = headers[c];
      if (col === undefined) continue;
      const val = cells[c] ?? '';
      // split into a list ONLY when the column is schema-declared.
      row[col] = schema[col] ? val.split(';').map((s) => s.trim()) : val;
    }
    rows[id] = row;
  }
  return { name: opts.name || 'table', schema, rows };
}

export function parseDatatable(text: string, opts: ParseDatatableOpts = {}): Datatable {
  return opts.format === 'csv' ? parseCsv(text, opts) : parseJson(text, opts);
}
