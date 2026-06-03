// CodeDrawer tests — covers tabs, debounced commit, undo/redo, copy/download,
// status indicator, and Escape close.
//
// Timer strategy: real timers by default. The two tests that rely on the
// 600ms parse-debounce mock the global `setTimeout` so the debounced commit
// fires synchronously when we ask it to.

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { I18nProvider } from '@/contexts/I18nContext';

import { CodeDrawer, type CodeSource } from './CodeDrawer';

function Wrap({ children }: { children: React.ReactNode }): JSX.Element {
  return <I18nProvider>{children}</I18nProvider>;
}

function makeSources(): CodeSource[] {
  return [
    { name: 'a.json', text: '{"a":1}', lang: 'json' },
    { name: 'b.yaml', text: 'b: 2\n', lang: 'yaml' },
  ];
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  // user-event v14 auto-installs a clipboard stub during `setup()`; tests
  // that exercise Copy spy on `navigator.clipboard.writeText` after setup.
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('CodeDrawer', () => {
  test('renders tabs, toolbar, and textarea with active source contents', () => {
    render(
      <Wrap>
        <CodeDrawer
          open={true}
          onClose={() => {}}
          sources={makeSources()}
          onEdit={() => {}}
        />
      </Wrap>,
    );
    expect(screen.getByRole('tab', { name: /a\.json/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /b\.yaml/ })).toBeInTheDocument();
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toBe('{"a":1}');
    expect(screen.getByRole('button', { name: /Undo/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Redo/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Copy/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Download/ })).toBeEnabled();
  });

  test('switching tabs updates the editor contents', async () => {
    const user = userEvent.setup();
    render(
      <Wrap>
        <CodeDrawer
          open={true}
          onClose={() => {}}
          sources={makeSources()}
          onEdit={() => {}}
        />
      </Wrap>,
    );
    const yamlTab = screen.getByRole('tab', { name: /b\.yaml/ });
    await user.click(yamlTab);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toBe('b: 2\n');
  });

  test('typing valid JSON calls onEdit after the debounce window', async () => {
    const user = userEvent.setup({ delay: null });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const onEdit = vi.fn();
    render(
      <Wrap>
        <CodeDrawer
          open={true}
          onClose={() => {}}
          sources={makeSources()}
          onEdit={onEdit}
        />
      </Wrap>,
    );
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    await user.clear(textarea);
    await user.type(textarea, '{{"new":true}');
    expect(onEdit).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(onEdit).toHaveBeenCalledWith(0, '{"new":true}');
  });

  test('typing invalid JSON shows the error strip and does not call onEdit', async () => {
    const user = userEvent.setup({ delay: null });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const onEdit = vi.fn();
    render(
      <Wrap>
        <CodeDrawer
          open={true}
          onClose={() => {}}
          sources={makeSources()}
          onEdit={onEdit}
        />
      </Wrap>,
    );
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    await user.clear(textarea);
    // Bare scalar — parseSource returns number (not an object), so the
    // "top-level must be an object" guard fires.
    await user.type(textarea, '42');
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(onEdit).not.toHaveBeenCalled();
    expect(screen.getByText(/Top-level must be an object/)).toBeInTheDocument();
    expect(screen.getByText(/invalid/)).toBeInTheDocument();
  });

  test('typing JSON that parses to top-level object commits', async () => {
    const user = userEvent.setup({ delay: null });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const onEdit = vi.fn();
    render(
      <Wrap>
        <CodeDrawer
          open={true}
          onClose={() => {}}
          sources={makeSources()}
          onEdit={onEdit}
        />
      </Wrap>,
    );
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    await user.clear(textarea);
    await user.type(textarea, '{{"x":1}');
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith(0, '{"x":1}');
  });

  test('undo reverts to the previous accepted text', async () => {
    const user = userEvent.setup({ delay: null });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const onEdit = vi.fn();
    let sources = makeSources();
    const { rerender } = render(
      <Wrap>
        <CodeDrawer
          open={true}
          onClose={() => {}}
          sources={sources}
          onEdit={(idx, newText) => {
            onEdit(idx, newText);
            sources = sources.map((s, i) => (i === idx ? { ...s, text: newText } : s));
            rerender(
              <Wrap>
                <CodeDrawer
                  open={true}
                  onClose={() => {}}
                  sources={sources}
                  onEdit={onEdit}
                />
              </Wrap>,
            );
          }}
        />
      </Wrap>,
    );
    const textarea = (): HTMLTextAreaElement =>
      screen.getByRole('textbox') as HTMLTextAreaElement;
    await user.clear(textarea());
    await user.type(textarea(), '{{"x":1}');
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(onEdit).toHaveBeenCalledWith(0, '{"x":1}');
    const undoBtn = screen.getByRole('button', { name: /Undo/ });
    expect(undoBtn).toBeEnabled();
    await user.click(undoBtn);
    expect(onEdit).toHaveBeenLastCalledWith(0, '{"a":1}');
  });

  test('redo re-applies an undone edit', async () => {
    const user = userEvent.setup({ delay: null });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let sources = makeSources();
    const onEdit = vi.fn();
    const { rerender } = render(
      <Wrap>
        <CodeDrawer
          open={true}
          onClose={() => {}}
          sources={sources}
          onEdit={(idx, newText) => {
            onEdit(idx, newText);
            sources = sources.map((s, i) => (i === idx ? { ...s, text: newText } : s));
            rerender(
              <Wrap>
                <CodeDrawer
                  open={true}
                  onClose={() => {}}
                  sources={sources}
                  onEdit={onEdit}
                />
              </Wrap>,
            );
          }}
        />
      </Wrap>,
    );
    const textarea = (): HTMLTextAreaElement =>
      screen.getByRole('textbox') as HTMLTextAreaElement;
    await user.clear(textarea());
    await user.type(textarea(), '{{"x":1}');
    act(() => {
      vi.advanceTimersByTime(700);
    });
    await user.click(screen.getByRole('button', { name: /Undo/ }));
    const redoBtn = screen.getByRole('button', { name: /Redo/ });
    expect(redoBtn).toBeEnabled();
    await user.click(redoBtn);
    expect(onEdit).toHaveBeenLastCalledWith(0, '{"x":1}');
  });

  test('close button calls onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Wrap>
        <CodeDrawer
          open={true}
          onClose={onClose}
          sources={makeSources()}
          onEdit={() => {}}
        />
      </Wrap>,
    );
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('Escape closes the drawer', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Wrap>
        <CodeDrawer
          open={true}
          onClose={onClose}
          sources={makeSources()}
          onEdit={() => {}}
        />
      </Wrap>,
    );
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  test('Copy writes the live buffer to the clipboard', async () => {
    // user-event.setup() installs its own clipboard stub; spy on the one
    // it leaves on navigator.clipboard so we observe the call.
    const user = userEvent.setup();
    const writeSpy = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue(undefined);
    render(
      <Wrap>
        <CodeDrawer
          open={true}
          onClose={() => {}}
          sources={makeSources()}
          onEdit={() => {}}
        />
      </Wrap>,
    );
    await user.click(screen.getByRole('button', { name: /Copy/ }));
    expect(writeSpy).toHaveBeenCalledWith('{"a":1}');
  });

  test('Copy swallows clipboard errors gracefully', async () => {
    const user = userEvent.setup();
    const writeSpy = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockRejectedValue(new Error('denied'));
    render(
      <Wrap>
        <CodeDrawer
          open={true}
          onClose={() => {}}
          sources={makeSources()}
          onEdit={() => {}}
        />
      </Wrap>,
    );
    // Should not throw.
    await user.click(screen.getByRole('button', { name: /Copy/ }));
    expect(writeSpy).toHaveBeenCalled();
  });

  test('Download creates a blob URL and triggers an anchor click', async () => {
    const user = userEvent.setup({ delay: null });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const createURL = vi.fn(() => 'blob:mock-url');
    const revokeURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: createURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: revokeURL,
    });
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    render(
      <Wrap>
        <CodeDrawer
          open={true}
          onClose={() => {}}
          sources={makeSources()}
          onEdit={() => {}}
        />
      </Wrap>,
    );
    await user.click(screen.getByRole('button', { name: /Download/ }));
    expect(createURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(revokeURL).toHaveBeenCalledWith('blob:mock-url');
  });

  test('status indicator transitions from editing to applied on successful commit', async () => {
    const user = userEvent.setup({ delay: null });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(
      <Wrap>
        <CodeDrawer
          open={true}
          onClose={() => {}}
          sources={makeSources()}
          onEdit={() => {}}
        />
      </Wrap>,
    );
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    await user.clear(textarea);
    await user.type(textarea, '{{"x":1}');
    // While debouncing — status should show "editing".
    expect(screen.getByText(/editing/)).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(700);
    });
    // After successful commit — status flips to applied.
    expect(screen.getByText(/applied/)).toBeInTheDocument();
  });

  test('typing a no-op (same text) keeps saved status without calling onEdit', async () => {
    const user = userEvent.setup({ delay: null });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const onEdit = vi.fn();
    render(
      <Wrap>
        <CodeDrawer
          open={true}
          onClose={() => {}}
          sources={makeSources()}
          onEdit={onEdit}
        />
      </Wrap>,
    );
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    // Append then delete to land on the same text.
    await user.type(textarea, ' ');
    await user.keyboard('{Backspace}');
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(onEdit).not.toHaveBeenCalled();
    expect(screen.getByText(/applied/)).toBeInTheDocument();
  });

  test('renders empty placeholder when sources is an empty list', () => {
    render(
      <Wrap>
        <CodeDrawer
          open={true}
          onClose={() => {}}
          sources={[]}
          onEdit={() => {}}
        />
      </Wrap>,
    );
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.placeholder).toMatch(/No source available/);
    expect(screen.getByRole('button', { name: /Copy/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Download/ })).toBeDisabled();
  });

  test('open=false sets aria-hidden true', () => {
    render(
      <Wrap>
        <CodeDrawer
          open={false}
          onClose={() => {}}
          sources={makeSources()}
          onEdit={() => {}}
        />
      </Wrap>,
    );
    const aside = screen.getByRole('complementary', { hidden: true });
    expect(aside).toHaveAttribute('aria-hidden', 'true');
  });
});
