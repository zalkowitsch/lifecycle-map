import { describe, expect, it } from 'vitest';
import { discoverLangs } from '@/lib/discoverLangs';

describe('discoverLangs', () => {
  it('finds language codes in localized string objects', () => {
    const data = { meta: { title: { en: 'Hi', pt: 'Oi' } }, nodes: [{ title: { en: 'A', es: 'B' } }] };
    expect(discoverLangs(data)).toEqual(['en', 'es', 'pt']);
  });
  it('returns empty when there are no localized objects', () => {
    expect(discoverLangs({ meta: { title: 'Plain' } })).toEqual([]);
  });
  it('ignores non-lang objects (keys not 2-letter codes)', () => {
    expect(discoverLangs({ a: { foo: 'x', bar: 'y' } })).toEqual([]);
  });
});
