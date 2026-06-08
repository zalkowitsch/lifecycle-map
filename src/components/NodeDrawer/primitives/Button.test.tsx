/// <reference types="vitest/globals" />
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Button } from './Button';
import { Link } from './Link';

const L = (v: unknown): string => (typeof v === 'string' ? v : String(v ?? ''));

describe('Button primitive', () => {
  it('renders text and fires onAction with the resolved target on click', () => {
    const onAction = vi.fn();
    const { getByText } = render(
      <Button
        node={{ type: 'Button', text: 'Go', action: 'navigate', target: '$dest' }}
        context={{ dest: 'coding' }}
        L={L}
        onAction={onAction}
      />,
    );
    fireEvent.click(getByText('Go'));
    expect(onAction).toHaveBeenCalledWith('navigate', 'coding');
  });
});

describe('Link primitive', () => {
  it('renders an anchor with the bound href', () => {
    const { getByText } = render(
      <Link node={{ type: 'Link', text: 'Docs', href: '$url' }} context={{ url: 'https://x.dev' }} L={L} />,
    );
    expect((getByText('Docs') as HTMLAnchorElement).href).toContain('https://x.dev');
  });

  it('renders an https href', () => {
    const { getByText } = render(
      <Link node={{ type: 'Link', text: 'Secure', href: '$url' }} context={{ url: 'https://ok.dev' }} L={L} />,
    );
    expect((getByText('Secure') as HTMLAnchorElement).href).toContain('https://ok.dev');
  });

  it('refuses a javascript: URL (renders nothing)', () => {
    const { container } = render(
      <Link node={{ type: 'Link', text: 'Evil', href: '$url' }} context={{ url: 'javascript:alert(1)' }} L={L} />,
    );
    expect(container.querySelector('a')).toBeNull();
  });

  it('refuses a non-http(s) scheme like data:', () => {
    const { container } = render(
      <Link node={{ type: 'Link', text: 'X', href: '$url' }} context={{ url: 'data:text/html,<script>1</script>' }} L={L} />,
    );
    expect(container.querySelector('a')).toBeNull();
  });
});
