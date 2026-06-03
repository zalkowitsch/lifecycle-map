/// <reference types="vitest/globals" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/lib/share', () => ({
  shareStrategies: {
    download: vi.fn(),
    embedded: vi.fn(async () => ({ url: 'http://x/#data=abc', size: 100 })),
    catbox: vi.fn(async () => ({
      url: 'http://x/?src=catbox',
      rawUrl: 'https://catbox.moe/abc',
    })),
    zerox: vi.fn(async () => ({
      url: 'http://x/?src=0x0',
      rawUrl: 'https://0x0.st/abc',
    })),
    encryptedImage: vi.fn(async () => ({
      url: 'http://x/#img=enc',
      password: '12345678',
      pngSize: 1024,
    })),
  },
  makeViewerBaseUrl: () => 'http://x/',
}));

// Imported AFTER vi.mock so the mocks are in effect.
import ShareModal from './ShareModal';
import { shareStrategies } from '@/lib/share';

interface RenderOpts {
  open?: boolean;
  getJsonText?: () => string;
  onClose?: () => void;
}

function renderModal(opts: RenderOpts = {}) {
  const getJsonText = opts.getJsonText ?? vi.fn(() => '{"foo": "bar"}');
  const onClose = opts.onClose ?? vi.fn();
  const utils = render(
    <ShareModal
      open={opts.open ?? true}
      onClose={onClose}
      getJsonText={getJsonText}
    />,
  );
  return { ...utils, getJsonText, onClose };
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn(async () => {}) },
    configurable: true,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ShareModal', () => {
  it('open=false still renders DOM (scrim + dialog) but aria-hidden=true', () => {
    // The component always returns the scrim + dialog; "closed" is a CSS-only
    // state. We assert the aria-hidden attribute flips.
    renderModal({ open: false });
    const dialog = screen.getByRole('dialog', { hidden: true });
    expect(dialog).toHaveAttribute('aria-hidden', 'true');
  });

  it('open=true renders dialog with 5 cards', () => {
    renderModal({ open: true });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // Card names share words with the disclaimer; restrict to action buttons,
    // which are 1:1 with cards.
    expect(screen.getByRole('button', { name: /download \.json/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate url/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^upload & share$/i }).length).toBe(2);
    expect(
      screen.getByRole('button', { name: /encrypt, upload & share/i }),
    ).toBeInTheDocument();
    // 5 distinct cards
    expect(screen.getByText('Download JSON')).toBeInTheDocument();
  });

  it('disclaimer about open-source third-party services is present', () => {
    renderModal({ open: true });
    expect(
      screen.getByText(/open-source third-party services/i),
    ).toBeInTheDocument();
  });

  it('Download .json calls shareStrategies.download(json, filename) and shows result', async () => {
    const getJsonText = vi.fn(() => '{"foo": "bar"}');
    renderModal({ open: true, getJsonText });
    const btn = screen.getByRole('button', { name: /download \.json/i });
    fireEvent.click(btn);
    expect(getJsonText).toHaveBeenCalled();
    expect(shareStrategies.download).toHaveBeenCalledTimes(1);
    const [json, filename] = (shareStrategies.download as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(json).toBe('{"foo": "bar"}');
    expect(filename).toMatch(/^lifecycle-map-\d{4}-\d{2}-\d{2}\.json$/);
    // synchronous strategy, result rendered immediately
    await waitFor(() =>
      expect(screen.getByText(/Drop this file back onto the viewer/i)).toBeInTheDocument(),
    );
  });

  it('Generate URL calls embedded() and renders the URL link row', async () => {
    renderModal({ open: true });
    const btn = screen.getByRole('button', { name: /generate url/i });
    fireEvent.click(btn);
    await waitFor(() => expect(shareStrategies.embedded).toHaveBeenCalled());
    const input = await screen.findByDisplayValue('http://x/#data=abc');
    expect(input).toBeInTheDocument();
  });

  it('catbox card calls catbox() and shows BOTH viewer URL and raw JSON', async () => {
    renderModal({ open: true });
    // both catbox + zerox have the same actionLabel; resolve via card name + nearest button.
    const buttons = screen.getAllByRole('button', { name: /^upload & share$/i });
    // catbox is declared before zerox in CARDS so it's the first match.
    fireEvent.click(buttons[0]);
    await waitFor(() => expect(shareStrategies.catbox).toHaveBeenCalled());
    await screen.findByDisplayValue('http://x/?src=catbox');
    expect(screen.getByDisplayValue('https://catbox.moe/abc')).toBeInTheDocument();
  });

  it('0x0 card calls zerox() and shows BOTH viewer URL and raw JSON', async () => {
    renderModal({ open: true });
    const buttons = screen.getAllByRole('button', { name: /^upload & share$/i });
    // zerox is the second card with this action label
    fireEvent.click(buttons[1]);
    await waitFor(() => expect(shareStrategies.zerox).toHaveBeenCalled());
    await screen.findByDisplayValue('http://x/?src=0x0');
    expect(screen.getByDisplayValue('https://0x0.st/abc')).toBeInTheDocument();
  });

  it('Encrypted card auto-mode generates 8-digit password and calls encryptedImage', async () => {
    renderModal({ open: true });
    const btn = screen.getByRole('button', { name: /encrypt, upload & share/i });
    fireEvent.click(btn);
    await waitFor(() => expect(shareStrategies.encryptedImage).toHaveBeenCalled());
    const [json, password] = (shareStrategies.encryptedImage as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(json).toBe('{"foo": "bar"}');
    expect(typeof password).toBe('string');
    expect((password as string).length).toBe(8);
    expect(/^\d{8}$/.test(password as string)).toBe(true);
    // Result UI: share url + password rows
    await screen.findByDisplayValue('http://x/#img=enc');
  });

  it('Encrypted card custom-mode uses the typed password and rejects short ones', async () => {
    const user = userEvent.setup();
    renderModal({ open: true });
    // Switch to custom
    const customRadio = screen.getByLabelText(/choose my own password/i);
    await user.click(customRadio);
    const input = screen.getByPlaceholderText(/min 6 characters/i) as HTMLInputElement;
    expect(input).not.toBeDisabled();

    // Too-short → renders error, does NOT call encryptedImage.
    await user.type(input, 'abc');
    const btn = screen.getByRole('button', { name: /encrypt, upload & share/i });
    fireEvent.click(btn);
    await waitFor(() =>
      expect(screen.getByText(/at least 6 characters/i)).toBeInTheDocument(),
    );
    expect(shareStrategies.encryptedImage).not.toHaveBeenCalled();

    // Now type enough; strategy should be invoked with the typed password.
    await user.type(input, 'defghi');
    fireEvent.click(btn);
    await waitFor(() => expect(shareStrategies.encryptedImage).toHaveBeenCalled());
    const [, password] = (shareStrategies.encryptedImage as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(password).toBe('abcdefghi');
  });

  it('Result link row has a Copy button that writes to clipboard', async () => {
    renderModal({ open: true });
    fireEvent.click(screen.getByRole('button', { name: /generate url/i }));
    await screen.findByDisplayValue('http://x/#data=abc');
    const copyBtn = screen.getByRole('button', { name: /^copy$/i });
    fireEvent.click(copyBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('http://x/#data=abc');
    await waitFor(() => expect(screen.getByText('Copied!')).toBeInTheDocument());
  });

  it('Result link row has an Open ↗ link with target=_blank', async () => {
    renderModal({ open: true });
    fireEvent.click(screen.getByRole('button', { name: /generate url/i }));
    await screen.findByDisplayValue('http://x/#data=abc');
    const openLinks = screen.getAllByRole('link', { name: /open/i });
    expect(openLinks.length).toBeGreaterThanOrEqual(1);
    expect(openLinks[0]).toHaveAttribute('target', '_blank');
    expect(openLinks[0]).toHaveAttribute('href', 'http://x/#data=abc');
  });

  it('close X button calls onClose', () => {
    const onClose = vi.fn();
    renderModal({ open: true, onClose });
    fireEvent.click(screen.getByRole('button', { name: /close share dialog/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Escape key calls onClose when open', () => {
    const onClose = vi.fn();
    renderModal({ open: true, onClose });
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Escape key is ignored when closed', () => {
    const onClose = vi.fn();
    renderModal({ open: false, onClose });
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('scrim click calls onClose', () => {
    const onClose = vi.fn();
    const { container } = renderModal({ open: true, onClose });
    // the scrim is the first child div with aria-hidden + no role
    const scrim = container.querySelector('div[aria-hidden]') as HTMLElement;
    expect(scrim).toBeTruthy();
    fireEvent.click(scrim);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows "No map loaded yet." when getJsonText returns empty', async () => {
    const getJsonText = vi.fn(() => '');
    renderModal({ open: true, getJsonText });
    fireEvent.click(screen.getByRole('button', { name: /download \.json/i }));
    await waitFor(() =>
      expect(screen.getByText(/no map loaded yet/i)).toBeInTheDocument(),
    );
    expect(shareStrategies.download).not.toHaveBeenCalled();
  });

  it('renders strategy error from rejected promise', async () => {
    (shareStrategies.embedded as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('boom'),
    );
    renderModal({ open: true });
    fireEvent.click(screen.getByRole('button', { name: /generate url/i }));
    await waitFor(() => expect(screen.getByText('boom')).toBeInTheDocument());
  });

  it('renders non-Error rejection as string', async () => {
    (shareStrategies.embedded as ReturnType<typeof vi.fn>).mockRejectedValueOnce('weird');
    renderModal({ open: true });
    fireEvent.click(screen.getByRole('button', { name: /generate url/i }));
    await waitFor(() => expect(screen.getByText('weird')).toBeInTheDocument());
  });

  it('shows badges for each card', () => {
    renderModal({ open: true });
    // 4 of 5 badges read "private" / "public" / "encrypted"
    expect(screen.getAllByText(/private/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/public/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/encrypted/i).length).toBeGreaterThanOrEqual(1);
  });
});
