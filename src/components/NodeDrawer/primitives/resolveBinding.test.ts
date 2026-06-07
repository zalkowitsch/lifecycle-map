import { describe, expect, it } from 'vitest';
import { resolveBinding } from './resolveBinding';

describe('resolveBinding', () => {
  const ctx = { name: 'Alpha', count: 3, tags: ['a', 'b'], nested: { x: 1 } };

  it('returns a literal string unchanged when it has no $ prefix', () => {
    expect(resolveBinding('Rubrics', ctx)).toBe('Rubrics');
  });

  it('resolves a $-prefixed key against the context', () => {
    expect(resolveBinding('$name', ctx)).toBe('Alpha');
  });

  it('resolves non-string context values (arrays, numbers)', () => {
    expect(resolveBinding('$tags', ctx)).toEqual(['a', 'b']);
    expect(resolveBinding('$count', ctx)).toBe(3);
  });

  it('returns undefined for a missing key', () => {
    expect(resolveBinding('$missing', ctx)).toBeUndefined();
  });

  it('passes through non-string inputs unchanged', () => {
    expect(resolveBinding(42, ctx)).toBe(42);
    expect(resolveBinding(undefined, ctx)).toBeUndefined();
  });

  it('treats a literal "$" with nothing after it as a literal', () => {
    expect(resolveBinding('$', ctx)).toBe('$');
  });
});
