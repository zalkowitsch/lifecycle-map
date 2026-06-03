/// <reference types="vitest/globals" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import type { ReactNode, ComponentType } from 'react';

import type { ShortcutsModalProps } from './ShortcutsModal';

// `CMD` is computed once at module-load from `navigator.platform`. To test
// both platforms we set platform BEFORE the dynamic import, then re-import
// both the modal AND the I18nProvider so they share the same context
// instance (otherwise `useI18n` throws "must be used inside an
// <I18nProvider>" because the imports refer to different module instances).
async function loadWithPlatform(
  platform: string,
): Promise<{ Modal: ComponentType<ShortcutsModalProps>; Wrap: ComponentType<{ children: ReactNode }> }> {
  Object.defineProperty(window.navigator, 'platform', {
    value: platform,
    configurable: true,
    writable: true,
  });
  vi.resetModules();
  const i18n = await import('@/contexts/I18nContext');
  const mod = await import('./ShortcutsModal');
  const I18nProvider = i18n.I18nProvider;
  const Wrap = ({ children }: { children: ReactNode }): JSX.Element => (
    <I18nProvider>{children}</I18nProvider>
  );
  return { Modal: mod.default, Wrap };
}

describe('ShortcutsModal', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('open=false returns null (renders nothing)', async () => {
    const { Modal, Wrap } = await loadWithPlatform('MacIntel');
    const { container } = render(
      <Wrap>
        <Modal open={false} onClose={vi.fn()} />
      </Wrap>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('open=true renders shortcuts dialog with sections', async () => {
    const { Modal, Wrap } = await loadWithPlatform('MacIntel');
    render(
      <Wrap>
        <Modal open onClose={vi.fn()} />
      </Wrap>,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // The shortcuts.* i18n keys are not defined, so `t()` returns the key
    // as fallback — assert that the dialog renders section titles (whatever
    // their text), not exact strings, since the contract is "renders 4
    // sections each with one or more rows".
    const headings = screen.getAllByRole('heading', { level: 3 });
    expect(headings.length).toBe(4);
  });

  it('shows ⌘ on macOS', async () => {
    const { Modal, Wrap } = await loadWithPlatform('MacIntel');
    render(
      <Wrap>
        <Modal open onClose={vi.fn()} />
      </Wrap>,
    );
    const cmdKeys = screen.getAllByText('⌘');
    expect(cmdKeys.length).toBeGreaterThan(0);
    expect(screen.queryByText('Ctrl')).not.toBeInTheDocument();
  });

  it('shows Ctrl on non-mac platforms', async () => {
    const { Modal, Wrap } = await loadWithPlatform('Win32');
    render(
      <Wrap>
        <Modal open onClose={vi.fn()} />
      </Wrap>,
    );
    const ctrlKeys = screen.getAllByText('Ctrl');
    expect(ctrlKeys.length).toBeGreaterThan(0);
    expect(screen.queryByText('⌘')).not.toBeInTheDocument();
  });

  it('click close button calls onClose', async () => {
    const { Modal, Wrap } = await loadWithPlatform('MacIntel');
    const onClose = vi.fn();
    render(
      <Wrap>
        <Modal open onClose={onClose} />
      </Wrap>,
    );
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Escape key calls onClose', async () => {
    const { Modal, Wrap } = await loadWithPlatform('MacIntel');
    const onClose = vi.fn();
    render(
      <Wrap>
        <Modal open onClose={onClose} />
      </Wrap>,
    );
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
