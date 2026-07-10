import { parseSource } from '@/lib/parseSource';
import type { LifecycleMap } from '@/types/lifecycle-map';
import { parseDatatable } from './parseDatatable';
import { DatatableRegistry } from './registry';
import type { Datatable } from './types';

export interface BundleFile {
  name: string;
  text: string;
}

export interface Bundle {
  lifecycleText: string;
  lifecycleName: string;
  registry: DatatableRegistry;
  mergedCount: number;
}

function baseName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '');
}

/**
 * Split dropped files into the lifecycle map (the one with an array `nodes`) and
 * datatables (everything else), building a registry. CSV schemas come from the
 * lifecycle's meta.datatables[name].schema.
 */
export function loadBundle(files: BundleFile[]): Bundle {
  const parsed = files.map((f) => {
    let data: unknown;
    try {
      data = parseSource(f.text);
    } catch {
      data = undefined; // CSV isn't JSON/YAML; that's fine — it's a datatable
    }
    return { ...f, data };
  });

  const mapFile = parsed.find(
    (f) => f.data && typeof f.data === 'object' && Array.isArray((f.data as LifecycleMap).nodes),
  );
  if (!mapFile) {
    throw new Error('Bundle contains no lifecycle map (a file with `nodes`).');
  }

  const map = mapFile.data as LifecycleMap;
  const declared = map.meta?.datatables ?? {};

  const registry = new DatatableRegistry();
  let mergedCount = 0;
  for (const f of parsed) {
    if (f === mapFile) continue;
    const isCsv = f.name.toLowerCase().endsWith('.csv');
    const name = baseName(f.name);
    const schema = declared[name]?.schema;
    const dt: Datatable = parseDatatable(f.text, {
      format: isCsv ? 'csv' : 'json',
      name,
      schema,
    });
    registry.add(dt);
    mergedCount++;
  }

  return {
    lifecycleText: mapFile.text,
    lifecycleName: mapFile.name,
    registry,
    mergedCount,
  };
}
