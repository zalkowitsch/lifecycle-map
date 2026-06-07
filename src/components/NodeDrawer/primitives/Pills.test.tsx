/// <reference types="vitest/globals" />
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Pills } from './Pills';

const L = (v: unknown): string => (typeof v === 'string' ? v : String(v ?? ''));

describe('Pills primitive', () => {
  it('renders a pill per item', () => {
    const { getByText } = render(
      <Pills
        node={{ type: 'Pills', bind: '$levels' }}
        context={{ levels: [{ label: 'L1' }, { label: 'L4' }] }}
        L={L}
      />,
    );
    expect(getByText('L1')).toBeInTheDocument();
    expect(getByText('L4')).toBeInTheDocument();
  });

  it('accepts plain strings as pills', () => {
    const { getByText } = render(
      <Pills node={{ type: 'Pills', bind: '$tags' }} context={{ tags: ['x'] }} L={L} />,
    );
    expect(getByText('x')).toBeInTheDocument();
  });

  it('omits when empty', () => {
    const { container } = render(
      <Pills node={{ type: 'Pills', bind: '$z' }} context={{}} L={L} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
