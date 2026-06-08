/// <reference types="vitest/globals" />
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { PrimitiveRenderer } from './PrimitiveRenderer';
import type { PrimitiveNode } from './types';

const L = (v: unknown): string => (typeof v === 'string' ? v : String(v ?? ''));

describe('RenderNode depth guard', () => {
  it('does not stack-overflow on a self-referential Section layout', () => {
    // A Section whose only child is itself — would recurse forever without a cap.
    const cyclic: PrimitiveNode = { type: 'Section', title: 'loop', children: [] };
    cyclic.children = [cyclic];
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Should render (capped) without throwing.
    expect(() =>
      render(<PrimitiveRenderer layout={[cyclic]} context={{}} L={L} />),
    ).not.toThrow();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('nesting exceeded'),
    );
    warn.mockRestore();
  });
});
