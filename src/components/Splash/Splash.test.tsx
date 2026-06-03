/// <reference types="vitest/globals" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';

import { I18nProvider } from '@/contexts/I18nContext';
import Splash, { type SplashProps } from './Splash';

function Wrap({ children }: { children: ReactNode }): JSX.Element {
  return <I18nProvider>{children}</I18nProvider>;
}

function makeProps(overrides: Partial<SplashProps> = {}): SplashProps {
  return {
    onLoadExample: vi.fn(),
    onLoadMultiLang: vi.fn(),
    onLoadFromUrl: vi.fn(),
    onLoadHashHint: vi.fn(),
    pasteMode: false,
    onPaste: vi.fn(),
    onCancelPaste: vi.fn(),
    error: null,
    ...overrides,
  };
}

describe('Splash', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders h1 containing "lifecycle-map"', () => {
    render(
      <Wrap>
        <Splash {...makeProps()} />
      </Wrap>,
    );
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toBeInTheDocument();
    expect(h1.textContent).toContain('lifecycle-map');
  });

  it('renders 5 way cards (example, multi-lang, url, hash, dnd-hint)', () => {
    render(
      <Wrap>
        <Splash {...makeProps()} />
      </Wrap>,
    );
    // 4 interactive buttons (example, multi-lang, url, hash)
    const buttons = screen
      .getAllByRole('button')
      .filter((b) => b.className.includes('way'));
    expect(buttons).toHaveLength(4);
    // 1 non-interactive note (drag-drop hint)
    const dndHint = screen.getByRole('note', { name: /drag-and-drop hint/i });
    expect(dndHint).toBeInTheDocument();
  });

  it('click on example card calls onLoadExample', () => {
    const onLoadExample = vi.fn();
    render(
      <Wrap>
        <Splash {...makeProps({ onLoadExample })} />
      </Wrap>,
    );
    const card = screen.getByRole('button', { name: /try an example/i });
    fireEvent.click(card);
    expect(onLoadExample).toHaveBeenCalledTimes(1);
  });

  it('click on multi-lang card calls onLoadMultiLang', () => {
    const onLoadMultiLang = vi.fn();
    render(
      <Wrap>
        <Splash {...makeProps({ onLoadMultiLang })} />
      </Wrap>,
    );
    const card = screen.getByRole('button', { name: /try multi-language/i });
    fireEvent.click(card);
    expect(onLoadMultiLang).toHaveBeenCalledTimes(1);
  });

  it('click on URL card prompts and calls onLoadFromUrl when URL provided', () => {
    const onLoadFromUrl = vi.fn();
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('https://example.com/m.json');
    render(
      <Wrap>
        <Splash {...makeProps({ onLoadFromUrl })} />
      </Wrap>,
    );
    const card = screen.getByRole('button', { name: /load from url/i });
    fireEvent.click(card);
    expect(promptSpy).toHaveBeenCalledTimes(1);
    expect(onLoadFromUrl).toHaveBeenCalledWith('https://example.com/m.json');
  });

  it('click on URL card with cancelled prompt does not call onLoadFromUrl', () => {
    const onLoadFromUrl = vi.fn();
    vi.spyOn(window, 'prompt').mockReturnValue(null);
    render(
      <Wrap>
        <Splash {...makeProps({ onLoadFromUrl })} />
      </Wrap>,
    );
    const card = screen.getByRole('button', { name: /load from url/i });
    fireEvent.click(card);
    expect(onLoadFromUrl).not.toHaveBeenCalled();
  });

  it('pasteMode=true shows textarea', () => {
    render(
      <Wrap>
        <Splash {...makeProps({ pasteMode: true })} />
      </Wrap>,
    );
    const textarea = screen.getByPlaceholderText(/lanes/);
    expect(textarea).toBeInTheDocument();
    expect(textarea.tagName).toBe('TEXTAREA');
  });

  it('pasteMode=false does not show textarea', () => {
    render(
      <Wrap>
        <Splash {...makeProps({ pasteMode: false })} />
      </Wrap>,
    );
    expect(screen.queryByPlaceholderText(/lanes/)).not.toBeInTheDocument();
  });

  it('typing in paste textarea + clicking Render calls onPaste with content', () => {
    const onPaste = vi.fn();
    render(
      <Wrap>
        <Splash {...makeProps({ pasteMode: true, onPaste })} />
      </Wrap>,
    );
    const textarea = screen.getByPlaceholderText(/lanes/) as HTMLTextAreaElement;
    // user-event's `.type` interprets `{` as a special token, so we use
    // fireEvent.change to set the value directly.
    fireEvent.change(textarea, { target: { value: '{"lanes":[]}' } });
    const renderBtn = screen.getAllByRole('button').find((b) => b.textContent === 'Render');
    expect(renderBtn).toBeDefined();
    fireEvent.click(renderBtn!);
    expect(onPaste).toHaveBeenCalledWith('{"lanes":[]}');
  });

  it('click Cancel in paste mode calls onCancelPaste', () => {
    const onCancelPaste = vi.fn();
    render(
      <Wrap>
        <Splash {...makeProps({ pasteMode: true, onCancelPaste })} />
      </Wrap>,
    );
    const cancelBtn = screen.getAllByRole('button').find((b) => b.textContent === 'Cancel');
    expect(cancelBtn).toBeDefined();
    fireEvent.click(cancelBtn!);
    expect(onCancelPaste).toHaveBeenCalledTimes(1);
  });

  it('error prop renders error message', () => {
    render(
      <Wrap>
        <Splash {...makeProps({ error: 'Boom — invalid JSON' })} />
      </Wrap>,
    );
    expect(screen.getByText('Boom — invalid JSON')).toBeInTheDocument();
  });

  it('does not render error when error is null', () => {
    render(
      <Wrap>
        <Splash {...makeProps({ error: null })} />
      </Wrap>,
    );
    expect(screen.queryByText(/Boom/)).not.toBeInTheDocument();
  });
});
