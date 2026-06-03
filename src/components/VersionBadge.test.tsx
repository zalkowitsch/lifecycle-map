/// <reference types="vitest/globals" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// Mutable mock state — each test overrides before mounting.
const mockState = {
  updateAvailable: false,
  dismiss: vi.fn(),
  refresh: vi.fn(),
};

vi.mock('@/hooks/useVersionCheck', () => ({
  useVersionCheck: () => mockState,
}));

import { VersionBadge } from './VersionBadge';

describe('VersionBadge', () => {
  beforeEach(() => {
    mockState.updateAvailable = false;
    mockState.dismiss = vi.fn();
    mockState.refresh = vi.fn();
    // Keep timers real — VersionBadge uses setTimeout for a 4s safety net.
  });

  it('does not render when updateAvailable=false', () => {
    mockState.updateAvailable = false;
    const { container } = render(<VersionBadge />);
    expect(container.firstChild).toBeNull();
  });

  it('renders when updateAvailable=true', () => {
    mockState.updateAvailable = true;
    render(<VersionBadge />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
  });

  it('click Refresh calls refresh()', () => {
    mockState.updateAvailable = true;
    render(<VersionBadge />);
    fireEvent.click(screen.getByRole('button', { name: /refresh/i }));
    expect(mockState.refresh).toHaveBeenCalledTimes(1);
  });

  it('Refresh button is disabled after click (shows loading state)', () => {
    mockState.updateAvailable = true;
    render(<VersionBadge />);
    const btn = screen.getByRole('button', { name: /refresh/i });
    act(() => {
      fireEvent.click(btn);
    });
    expect(btn).toBeDisabled();
    expect(btn.textContent).toBe('…');
  });

  it('click Dismiss calls dismiss()', () => {
    mockState.updateAvailable = true;
    render(<VersionBadge />);
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(mockState.dismiss).toHaveBeenCalledTimes(1);
  });
});
