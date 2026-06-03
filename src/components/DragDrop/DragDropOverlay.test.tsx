/// <reference types="vitest/globals" />
import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import type { ReactNode } from 'react';

import { I18nProvider } from '@/contexts/I18nContext';
import DragDropOverlay from './DragDropOverlay';

function Wrap({ children }: { children: ReactNode }): JSX.Element {
  return <I18nProvider>{children}</I18nProvider>;
}

function fileDragEvent(type: string, files: File[] = []): Event {
  const ev = new Event(type, { bubbles: true }) as Event & {
    dataTransfer: { files: File[]; types: string[]; dropEffect?: string };
  };
  ev.dataTransfer = { files, types: ['Files'] };
  return ev;
}

function nonFileDragEvent(type: string): Event {
  const ev = new Event(type, { bubbles: true }) as Event & {
    dataTransfer: { files: File[]; types: string[] };
  };
  ev.dataTransfer = { files: [], types: ['text/plain'] };
  return ev;
}

describe('DragDropOverlay', () => {
  it('renders overlay hidden initially', () => {
    const { container } = render(
      <Wrap>
        <DragDropOverlay onDrop={vi.fn()} />
      </Wrap>,
    );
    const overlay = container.firstChild as HTMLElement;
    expect(overlay).toBeInTheDocument();
    expect(overlay.getAttribute('aria-hidden')).toBe('true');
  });

  it('dragenter on window with files makes overlay visible', () => {
    const { container } = render(
      <Wrap>
        <DragDropOverlay onDrop={vi.fn()} />
      </Wrap>,
    );
    act(() => {
      window.dispatchEvent(fileDragEvent('dragenter'));
    });
    const overlay = container.firstChild as HTMLElement;
    expect(overlay.getAttribute('aria-hidden')).toBe('false');
  });

  it('dragleave decrements depth and hides overlay when depth=0', () => {
    const { container } = render(
      <Wrap>
        <DragDropOverlay onDrop={vi.fn()} />
      </Wrap>,
    );
    act(() => {
      window.dispatchEvent(fileDragEvent('dragenter'));
    });
    const overlay = container.firstChild as HTMLElement;
    expect(overlay.getAttribute('aria-hidden')).toBe('false');

    act(() => {
      window.dispatchEvent(fileDragEvent('dragleave'));
    });
    expect(overlay.getAttribute('aria-hidden')).toBe('true');
  });

  it('nested dragenters require matching dragleaves to hide overlay', () => {
    const { container } = render(
      <Wrap>
        <DragDropOverlay onDrop={vi.fn()} />
      </Wrap>,
    );
    act(() => {
      window.dispatchEvent(fileDragEvent('dragenter'));
      window.dispatchEvent(fileDragEvent('dragenter'));
    });
    const overlay = container.firstChild as HTMLElement;
    expect(overlay.getAttribute('aria-hidden')).toBe('false');

    act(() => {
      window.dispatchEvent(fileDragEvent('dragleave'));
    });
    // Still depth=1 → still visible
    expect(overlay.getAttribute('aria-hidden')).toBe('false');

    act(() => {
      window.dispatchEvent(fileDragEvent('dragleave'));
    });
    expect(overlay.getAttribute('aria-hidden')).toBe('true');
  });

  it('drop with file calls onDrop with the first file', () => {
    const onDrop = vi.fn();
    render(
      <Wrap>
        <DragDropOverlay onDrop={onDrop} />
      </Wrap>,
    );
    const file = new File(['{}'], 'test.json', { type: 'application/json' });
    act(() => {
      window.dispatchEvent(fileDragEvent('drop', [file]));
    });
    expect(onDrop).toHaveBeenCalledTimes(1);
    expect(onDrop).toHaveBeenCalledWith(file);
  });

  it('drop without files does not call onDrop', () => {
    const onDrop = vi.fn();
    render(
      <Wrap>
        <DragDropOverlay onDrop={onDrop} />
      </Wrap>,
    );
    act(() => {
      window.dispatchEvent(fileDragEvent('drop', []));
    });
    expect(onDrop).not.toHaveBeenCalled();
  });

  it('non-file dragenter is ignored (overlay stays hidden)', () => {
    const { container } = render(
      <Wrap>
        <DragDropOverlay onDrop={vi.fn()} />
      </Wrap>,
    );
    act(() => {
      window.dispatchEvent(nonFileDragEvent('dragenter'));
    });
    const overlay = container.firstChild as HTMLElement;
    expect(overlay.getAttribute('aria-hidden')).toBe('true');
  });
});
