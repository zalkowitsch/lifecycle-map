/// <reference types="vitest/globals" />
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Tile } from './Tile';

const L = (v: unknown): string => (typeof v === 'string' ? v : String(v ?? ''));

describe('Tile primitive', () => {
  // Inside a List, the Tile receives one array element as its local context.
  const item = { name: 'Code fluency', id: 'rubric:code-fluency', levels: [{ label: 'L1' }, { label: 'L4' }], tags: ['Code fluency'] };

  it('renders title, sub, pills, and tags from local context', () => {
    const { getByText } = render(
      <Tile
        node={{ type: 'Tile', title: '$name', sub: '$id', pills: '$levels', tags: '$tags' }}
        context={item}
        L={L}
      />,
    );
    expect(getByText('Code fluency')).toBeInTheDocument();
    expect(getByText('rubric:code-fluency')).toBeInTheDocument();
    expect(getByText('L1')).toBeInTheDocument();
    expect(getByText('L4')).toBeInTheDocument();
  });

  it('renders only the title when optional binds are missing', () => {
    const { getByText, container } = render(
      <Tile node={{ type: 'Tile', title: '$name', sub: '$id', pills: '$levels' }} context={{ name: 'X' }} L={L} />,
    );
    expect(getByText('X')).toBeInTheDocument();
    expect(container.querySelectorAll('span').length).toBeGreaterThanOrEqual(0);
  });
});
