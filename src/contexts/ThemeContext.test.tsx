import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeContext';

function Probe(): JSX.Element {
  const { theme, mode, setTheme, setMode } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="mode">{mode}</span>
      <button data-testid="set-mono" onClick={() => setTheme('mono')}>set mono</button>
      <button data-testid="set-dark" onClick={() => setMode('dark')}>set dark</button>
    </div>
  );
}

function mockMatchMedia(prefersDark: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: query.includes('dark') ? prefersDark : false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => true,
    }),
  });
}

function setLocation(search: string): void {
  // jsdom doesn't allow replacing `window.location` wholesale, but writing to
  // `.search` works and updates URLSearchParams reads.
  window.history.replaceState({}, '', `/${search}`);
}

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    delete document.documentElement.dataset.mode;
    setLocation('');
    mockMatchMedia(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('useTheme outside a provider throws', () => {
    // Silence the React error boundary log.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/ThemeProvider/);
    spy.mockRestore();
  });

  test('defaults to paper theme', () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('theme')).toHaveTextContent('paper');
    expect(document.documentElement.dataset.theme).toBe('paper');
  });

  test('initial mode follows prefers-color-scheme', () => {
    mockMatchMedia(true);
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
  });

  test('initial theme/mode are read from localStorage', () => {
    localStorage.setItem('lifecycle-map.theme', 'mono');
    localStorage.setItem('lifecycle-map.mode', 'dark');

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('theme')).toHaveTextContent('mono');
    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
  });

  test('URL params override localStorage', () => {
    localStorage.setItem('lifecycle-map.theme', 'mono');
    localStorage.setItem('lifecycle-map.mode', 'light');
    setLocation('?theme=blueprint&mode=dark');

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('theme')).toHaveTextContent('blueprint');
    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
  });

  test('invalid stored theme falls back to default', () => {
    localStorage.setItem('lifecycle-map.theme', 'not-a-theme');

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('theme')).toHaveTextContent('paper');
  });

  test('setTheme updates state, persists, and writes data-theme', () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByTestId('set-mono'));

    expect(screen.getByTestId('theme')).toHaveTextContent('mono');
    expect(localStorage.getItem('lifecycle-map.theme')).toBe('mono');
    expect(document.documentElement.dataset.theme).toBe('mono');
  });

  test('setMode updates state, persists, and writes data-mode', () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByTestId('set-dark'));

    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
    expect(localStorage.getItem('lifecycle-map.mode')).toBe('dark');
    expect(document.documentElement.dataset.mode).toBe('dark');
  });
});
