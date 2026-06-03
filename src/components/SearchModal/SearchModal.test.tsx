/// <reference types="vitest/globals" />
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';

import { I18nProvider } from '@/contexts/I18nContext';
import type { NormalizedMap } from '@/types/lifecycle-map';
import SearchModal from './SearchModal';

// jsdom does not implement scrollIntoView — SearchModal calls it in a
// useLayoutEffect to keep the active row visible. Stub it locally.
beforeAll(() => {
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = function scrollIntoView(): void {
      // no-op
    };
  }
});

function Wrap({ children }: { children: ReactNode }): JSX.Element {
  return <I18nProvider>{children}</I18nProvider>;
}

const data = {
  meta: { title: '', subtitle: '', context: '', modes: [] },
  lanes: [{ id: 'l1', label: 'Engineering' }],
  phases: [{ id: 'p1', label: 'Build' }],
  nodes: [
    { id: 'n1', lane: 'l1', phase: 'p1', title: 'Foo' },
    { id: 'n2', lane: 'l1', phase: 'p1', title: 'Bar baz' },
  ],
  edges: [],
  _modeMap: {},
  _moduleCatalog: {},
} as unknown as NormalizedMap;

const L = (v: unknown): string => (typeof v === 'string' ? v : '');

describe('SearchModal', () => {
  it('open=false → does not show panel content visibly (combobox hidden)', () => {
    render(
      <Wrap>
        <SearchModal open={false} onClose={vi.fn()} data={data} L={L} onSelect={vi.fn()} />
      </Wrap>,
    );
    const dialog = screen.getByRole('dialog', { hidden: true });
    expect(dialog).toHaveAttribute('aria-hidden', 'true');
  });

  it('open=true → renders input and auto-focuses it', async () => {
    render(
      <Wrap>
        <SearchModal open onClose={vi.fn()} data={data} L={L} onSelect={vi.fn()} />
      </Wrap>,
    );
    const input = screen.getByRole('combobox');
    expect(input).toBeInTheDocument();
    await waitFor(() => expect(input).toHaveFocus());
  });

  it('empty query shows all nodes', () => {
    render(
      <Wrap>
        <SearchModal open onClose={vi.fn()} data={data} L={L} onSelect={vi.fn()} />
      </Wrap>,
    );
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(screen.getByText('Foo')).toBeInTheDocument();
    expect(screen.getByText('Bar baz')).toBeInTheDocument();
  });

  it('typing query filters results', async () => {
    const user = userEvent.setup();
    render(
      <Wrap>
        <SearchModal open onClose={vi.fn()} data={data} L={L} onSelect={vi.fn()} />
      </Wrap>,
    );
    const input = screen.getByRole('combobox');
    await user.type(input, 'bar');
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(screen.queryByText('Foo')).not.toBeInTheDocument();
  });

  it('ArrowDown moves active to next item', async () => {
    render(
      <Wrap>
        <SearchModal open onClose={vi.fn()} data={data} L={L} onSelect={vi.fn()} />
      </Wrap>,
    );
    // Initially index 0 is selected
    const optionsBefore = screen.getAllByRole('option');
    expect(optionsBefore[0]).toHaveAttribute('aria-selected', 'true');

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    });

    const optionsAfter = screen.getAllByRole('option');
    expect(optionsAfter[1]).toHaveAttribute('aria-selected', 'true');
    expect(optionsAfter[0]).toHaveAttribute('aria-selected', 'false');
  });

  it('ArrowUp moves active to previous item', () => {
    render(
      <Wrap>
        <SearchModal open onClose={vi.fn()} data={data} L={L} onSelect={vi.fn()} />
      </Wrap>,
    );
    // Move down first
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    });
    let options = screen.getAllByRole('option');
    expect(options[1]).toHaveAttribute('aria-selected', 'true');

    // Then up
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    });
    options = screen.getAllByRole('option');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('Enter calls onSelect with active result id and onClose', () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(
      <Wrap>
        <SearchModal open onClose={onClose} data={data} L={L} onSelect={onSelect} />
      </Wrap>,
    );
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    });
    expect(onSelect).toHaveBeenCalledWith('n1');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Escape calls onClose', () => {
    const onClose = vi.fn();
    render(
      <Wrap>
        <SearchModal open onClose={onClose} data={data} L={L} onSelect={vi.fn()} />
      </Wrap>,
    );
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('click on result calls onSelect and onClose', () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(
      <Wrap>
        <SearchModal open onClose={onClose} data={data} L={L} onSelect={onSelect} />
      </Wrap>,
    );
    const options = screen.getAllByRole('option');
    const target = options[1];
    if (!target) throw new Error('Expected at least 2 results');
    fireEvent.click(target);
    expect(onSelect).toHaveBeenCalledWith('n2');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
