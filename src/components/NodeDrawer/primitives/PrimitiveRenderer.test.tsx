/// <reference types="vitest/globals" />
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { PrimitiveRenderer } from './PrimitiveRenderer';
import type { PrimitiveNode } from './types';

const L = (v: unknown): string => (typeof v === 'string' ? v : String(v ?? ''));

describe('PrimitiveRenderer', () => {
  it('renders a flat layout of primitives', () => {
    const layout: PrimitiveNode[] = [
      { type: 'Title', text: 'Rubrics', variant: 'eyebrow' },
      { type: 'Prose', bind: '$intro' },
    ];
    const { getByText } = render(
      <PrimitiveRenderer layout={layout} context={{ intro: 'measured signals' }} L={L} />,
    );
    expect(getByText('Rubrics')).toBeInTheDocument();
    expect(getByText('measured signals')).toBeInTheDocument();
  });

  it('renders a Section with nested children', () => {
    const layout: PrimitiveNode[] = [
      { type: 'Section', title: 'Rubrics', sub: '$sub', children: [{ type: 'Prose', bind: '$body' }] },
    ];
    const { getByText } = render(
      <PrimitiveRenderer layout={layout} context={{ sub: 'this round', body: 'text' }} L={L} />,
    );
    expect(getByText('Rubrics')).toBeInTheDocument();
    expect(getByText('this round')).toBeInTheDocument();
    expect(getByText('text')).toBeInTheDocument();
  });

  it('renders a List, giving each item to its item-primitive as local context', () => {
    const layout: PrimitiveNode[] = [
      {
        type: 'List',
        bind: '$rubrics',
        item: { type: 'Tile', title: '$name', sub: '$id' },
      },
    ];
    const ctx = { rubrics: [{ name: 'A', id: 'r:a' }, { name: 'B', id: 'r:b' }] };
    const { getByText } = render(<PrimitiveRenderer layout={layout} context={ctx} L={L} />);
    expect(getByText('A')).toBeInTheDocument();
    expect(getByText('B')).toBeInTheDocument();
    expect(getByText('r:a')).toBeInTheDocument();
  });

  it('omits an unknown primitive type without crashing', () => {
    const layout = [{ type: 'Bogus', text: 'x' }] as PrimitiveNode[];
    const { container } = render(<PrimitiveRenderer layout={layout} context={{}} L={L} />);
    expect(container.textContent).toBe('');
  });
});
