// Tests for src/hooks/useViewerState.ts
//
// Focuses on the pure exports — `slugify` and `normalize`. The hook itself
// touches fetch, window.location, hashchange listeners, and session storage,
// which makes it a poor fit for a unit test; integration coverage lives
// elsewhere.

import { describe, expect, it } from 'vitest';

import { normalize, slugify } from '@/hooks/useViewerState';
import type { LifecycleMap } from '@/types/lifecycle-map';

describe('slugify', () => {
  it('lowercases and replaces spaces with dashes', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('strips a .json extension', () => {
    expect(slugify('Report.json')).toBe('report');
  });

  it('strips a .yaml extension', () => {
    expect(slugify('config.yaml')).toBe('config');
  });

  it('strips a .yml extension', () => {
    expect(slugify('config.yml')).toBe('config');
  });

  it('collapses runs of special characters into single dashes', () => {
    expect(slugify('A!!!B___C')).toBe('a-b-c');
  });

  it('trims leading and trailing dashes', () => {
    expect(slugify('---weird---')).toBe('weird');
  });

  it('caps length at 64 characters', () => {
    const long = 'a'.repeat(100);
    const result = slugify(long);
    expect(result.length).toBe(64);
  });

  it('falls back to "untitled" for empty input', () => {
    expect(slugify('')).toBe('untitled');
  });

  it('falls back to "untitled" for input that becomes empty after stripping', () => {
    expect(slugify('!!!')).toBe('untitled');
  });

  it('treats null-ish input as empty (no throw)', () => {
    // slugify uses String(s ?? '') so null/undefined are safe.
    expect(slugify(null as unknown as string)).toBe('untitled');
    expect(slugify(undefined as unknown as string)).toBe('untitled');
  });

  it('preserves digits', () => {
    expect(slugify('Q3 2026 plan.json')).toBe('q3-2026-plan');
  });
});

describe('normalize', () => {
  function baseMap(): LifecycleMap {
    return { lanes: [], phases: [], nodes: [], edges: [] };
  }

  it('throws on non-object input', () => {
    expect(() => normalize(null as unknown as LifecycleMap)).toThrow(/object/i);
    expect(() => normalize('hi' as unknown as LifecycleMap)).toThrow(/object/i);
  });

  it('fills default meta fields', () => {
    const out = normalize(baseMap());
    expect(out.meta.title).toBe('Untitled');
    expect(out.meta.subtitle).toBe('');
    expect(out.meta.context).toBe('');
    expect(Array.isArray(out.meta.modes)).toBe(true);
    expect(out.meta.modes.length).toBeGreaterThan(0);
  });

  it('preserves provided meta values', () => {
    const out = normalize({
      ...baseMap(),
      meta: { title: 'My Map', subtitle: 'Sub', context: 'Ctx' },
    });
    expect(out.meta.title).toBe('My Map');
    expect(out.meta.subtitle).toBe('Sub');
    expect(out.meta.context).toBe('Ctx');
  });

  it('populates _modeMap from the default modes', () => {
    const out = normalize(baseMap());
    expect(out._modeMap).toBeDefined();
    expect(out._modeMap['self-serve']).toBeDefined();
    expect(out._modeMap['automated']).toBeDefined();
  });

  it('populates _moduleCatalog from modules', () => {
    const out = normalize({
      ...baseMap(),
      modules: {
        crm: { name: 'CRM', today: 'manual' },
        billing: { name: 'Billing', today: 'automated' },
      },
    });
    expect(out._moduleCatalog).toBeDefined();
    expect(out._moduleCatalog.crm).toEqual({ name: 'CRM', today: 'manual' });
    expect(out._moduleCatalog.billing).toEqual({ name: 'Billing', today: 'automated' });
  });

  it('defaults _moduleCatalog to {} when no modules', () => {
    const out = normalize(baseMap());
    expect(out._moduleCatalog).toEqual({});
  });

  it('auto-discovers modes referenced by node.today/tomorrow', () => {
    const out = normalize({
      ...baseMap(),
      nodes: [
        {
          id: 'n1',
          lane: 'l1',
          phase: 'p1',
          title: 'Node',
          today: { mode: 'custom-mode' },
          tomorrow: { mode: 'future-mode' },
        },
      ],
    });
    expect(out._modeMap['custom-mode']).toBeDefined();
    expect(out._modeMap['custom-mode']?.id).toBe('custom-mode');
    expect(out._modeMap['custom-mode']?.label).toBe('custom-mode');
    expect(out._modeMap['future-mode']).toBeDefined();
  });

  it('auto-discovered modes get hsl(...) color strings', () => {
    const out = normalize({
      ...baseMap(),
      nodes: [
        { id: 'n1', lane: 'l1', phase: 'p1', title: 'Node', today: { mode: 'brand-new' } },
      ],
    });
    const color = out._modeMap['brand-new']?.color ?? '';
    expect(color).toMatch(/^hsl\(\d+, \d+%, \d+%\)$/);
  });

  it('auto-discovers modes referenced by node.modules entries', () => {
    const out = normalize({
      ...baseMap(),
      nodes: [
        {
          id: 'n1',
          lane: 'l1',
          phase: 'p1',
          title: 'Node',
          modules: [{ today: 'inline-mode-a', tomorrow: 'inline-mode-b' }],
        },
      ],
    });
    expect(out._modeMap['inline-mode-a']).toBeDefined();
    expect(out._modeMap['inline-mode-b']).toBeDefined();
  });

  it('auto-discovers modes referenced by the modules catalog', () => {
    const out = normalize({
      ...baseMap(),
      modules: { crm: { name: 'CRM', today: 'catalog-mode' } },
    });
    expect(out._modeMap['catalog-mode']).toBeDefined();
  });

  it('does not overwrite a known mode with an auto-discovered one', () => {
    const out = normalize({
      ...baseMap(),
      meta: { modes: [{ id: 'manual', label: 'Manual', color: '#000' }] },
      nodes: [
        { id: 'n1', lane: 'l1', phase: 'p1', title: 'Node', today: { mode: 'manual' } },
      ],
    });
    expect(out._modeMap['manual']?.color).toBe('#000');
    expect(out._modeMap['manual']?.label).toBe('Manual');
  });

  it('assigns roman numerals to phases by index', () => {
    const out = normalize({
      ...baseMap(),
      phases: [
        { id: 'p1', label: 'Phase 1' },
        { id: 'p2', label: 'Phase 2' },
        { id: 'p3', label: 'Phase 3' },
      ],
    });
    expect(out.phases[0]?.roman).toBe('I');
    expect(out.phases[1]?.roman).toBe('II');
    expect(out.phases[2]?.roman).toBe('III');
  });

  it('preserves an explicit roman numeral on a phase', () => {
    const out = normalize({
      ...baseMap(),
      phases: [{ id: 'p1', label: 'Phase 1', roman: 'Z' }],
    });
    expect(out.phases[0]?.roman).toBe('Z');
  });

  it('defaults subCols to 1 when missing', () => {
    const out = normalize({
      ...baseMap(),
      phases: [{ id: 'p1', label: 'Phase 1' }],
    });
    expect(out.phases[0]?.subCols).toBe(1);
  });
});
