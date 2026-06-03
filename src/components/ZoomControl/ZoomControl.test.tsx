/// <reference types="vitest/globals" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

import ZoomControl from './ZoomControl';

// The trigger button has aria-haspopup="menu" — we use that to target it
// without colliding with menu-item buttons that share text like "100%".
function getTriggerEither(): HTMLElement {
  const buttons = screen.getAllByRole('button');
  const trigger = buttons.find((b) => b.getAttribute('aria-haspopup') === 'menu');
  if (!trigger) throw new Error('Trigger button not found');
  return trigger;
}

describe('ZoomControl', () => {
  it('shows initial value as percentage', () => {
    render(
      <ZoomControl zoom={0.5} onSetZoom={vi.fn()} onFitToScreen={vi.fn()} />,
    );
    expect(getTriggerEither()).toHaveTextContent('50%');
  });

  it('rounds zoom value to nearest percent', () => {
    render(
      <ZoomControl zoom={1} onSetZoom={vi.fn()} onFitToScreen={vi.fn()} />,
    );
    expect(getTriggerEither()).toHaveTextContent('100%');
  });

  it('click trigger opens menu', () => {
    render(
      <ZoomControl zoom={1} onSetZoom={vi.fn()} onFitToScreen={vi.fn()} />,
    );
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    fireEvent.click(getTriggerEither());
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('click item 25% calls onSetZoom(0.25) and closes menu', () => {
    const onSetZoom = vi.fn();
    render(
      <ZoomControl zoom={1} onSetZoom={onSetZoom} onFitToScreen={vi.fn()} />,
    );
    fireEvent.click(getTriggerEither());
    fireEvent.click(screen.getByRole('menuitem', { name: '25%' }));
    expect(onSetZoom).toHaveBeenCalledWith(0.25);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('click "Fit to screen" calls onFitToScreen', () => {
    const onFitToScreen = vi.fn();
    render(
      <ZoomControl zoom={1} onSetZoom={vi.fn()} onFitToScreen={onFitToScreen} />,
    );
    fireEvent.click(getTriggerEither());
    fireEvent.click(screen.getByRole('menuitem', { name: /fit to screen/i }));
    expect(onFitToScreen).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('active preset has "active" class', () => {
    render(
      <ZoomControl zoom={0.5} onSetZoom={vi.fn()} onFitToScreen={vi.fn()} />,
    );
    fireEvent.click(getTriggerEither());
    const fifty = screen.getByRole('menuitem', { name: '50%' });
    const hundred = screen.getByRole('menuitem', { name: '100%' });
    expect(fifty.className).toMatch(/active/);
    expect(hundred.className).not.toMatch(/active/);
  });

  it('Escape closes menu', () => {
    render(
      <ZoomControl zoom={1} onSetZoom={vi.fn()} onFitToScreen={vi.fn()} />,
    );
    fireEvent.click(getTriggerEither());
    expect(screen.getByRole('menu')).toBeInTheDocument();
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('click outside closes menu', () => {
    render(
      <div>
        <button data-testid="outside">outside</button>
        <ZoomControl zoom={1} onSetZoom={vi.fn()} onFitToScreen={vi.fn()} />
      </div>,
    );
    fireEvent.click(getTriggerEither());
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
