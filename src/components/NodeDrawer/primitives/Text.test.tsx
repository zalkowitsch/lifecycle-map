/// <reference types="vitest/globals" />
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Text } from './Text';
import { Title } from './Title';

const L = (v: unknown): string => (typeof v === 'string' ? v : String(v ?? ''));

describe('Text primitive', () => {
  it('renders a literal text value', () => {
    const { getByText } = render(
      <Text node={{ type: 'Text', text: 'hello' }} context={{}} L={L} />,
    );
    expect(getByText('hello')).toBeInTheDocument();
  });

  it('renders a bound text value from context', () => {
    const { getByText } = render(
      <Text node={{ type: 'Text', text: '$msg' }} context={{ msg: 'bound' }} L={L} />,
    );
    expect(getByText('bound')).toBeInTheDocument();
  });

  it('renders nothing when the bound value is missing', () => {
    const { container } = render(
      <Text node={{ type: 'Text', text: '$nope' }} context={{}} L={L} />,
    );
    expect(container.firstChild).toBeNull();
  });
});

describe('Title primitive', () => {
  it('renders an eyebrow variant', () => {
    const { getByText } = render(
      <Title node={{ type: 'Title', text: 'RUBRICS', variant: 'eyebrow' }} context={{}} L={L} />,
    );
    expect(getByText('RUBRICS')).toBeInTheDocument();
  });
});
