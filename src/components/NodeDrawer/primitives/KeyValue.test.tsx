/// <reference types="vitest/globals" />
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Prose } from './Prose';
import { KeyValue } from './KeyValue';

const L = (v: unknown): string => (typeof v === 'string' ? v : String(v ?? ''));

describe('Prose primitive', () => {
  it('renders bound prose text', () => {
    const { getByText } = render(
      <Prose node={{ type: 'Prose', bind: '$body' }} context={{ body: 'narrative' }} L={L} />,
    );
    expect(getByText('narrative')).toBeInTheDocument();
  });

  it('renders <em> emphasis embedded in the text', () => {
    const { container } = render(
      <Prose node={{ type: 'Prose', bind: '$body' }} context={{ body: 'a <em>b</em>' }} L={L} />,
    );
    expect(container.querySelector('em')?.textContent).toBe('b');
  });

  it('omits when the bound value is missing', () => {
    const { container } = render(
      <Prose node={{ type: 'Prose', bind: '$x' }} context={{}} L={L} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('strips dangerous tags but keeps <em>', () => {
    const { container } = render(
      <Prose
        node={{ type: 'Prose', bind: '$body' }}
        context={{ body: 'safe <em>yes</em> <img src=x onerror="alert(1)"> <script>alert(2)</script>' }}
        L={L}
      />,
    );
    expect(container.querySelector('em')?.textContent).toBe('yes');
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
    expect(container.innerHTML).not.toContain('onerror');
  });
});

describe('KeyValue primitive', () => {
  it('renders label/value rows from an array', () => {
    const { getByText } = render(
      <KeyValue
        node={{ type: 'KeyValue', bind: '$meta' }}
        context={{ meta: [{ label: 'Duration', value: '75 min' }] }}
        L={L}
      />,
    );
    expect(getByText('Duration')).toBeInTheDocument();
    expect(getByText('75 min')).toBeInTheDocument();
  });

  it('omits when there are no rows', () => {
    const { container } = render(
      <KeyValue node={{ type: 'KeyValue', bind: '$meta' }} context={{}} L={L} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
