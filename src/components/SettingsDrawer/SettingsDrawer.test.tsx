// SettingsDrawer tests — covers theme cards, light/dark toggle, UI language,
// data language visibility, footer, and Escape close.

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';

import { I18nProvider, useI18n } from '@/contexts/I18nContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

import { SettingsDrawer } from './SettingsDrawer';

function Wrap({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <ThemeProvider>
      <I18nProvider>{children}</I18nProvider>
    </ThemeProvider>
  );
}

/** Helper to install available data-langs into the I18n context. */
function AvailableLangsSetter({ langs }: { langs: string[] }): null {
  const { setAvailableLangs } = useI18n();
  useEffect(() => {
    setAvailableLangs(langs);
  }, [langs, setAvailableLangs]);
  return null;
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SettingsDrawer', () => {
  test('open=false still renders the aside but as hidden', () => {
    render(
      <Wrap>
        <SettingsDrawer open={false} onClose={() => {}} />
      </Wrap>,
    );
    const aside = screen.getByRole('complementary', { hidden: true });
    expect(aside).toHaveAttribute('aria-hidden', 'true');
  });

  test('open=true renders Theme group, Appearance toggle, and UI lang group', () => {
    render(
      <Wrap>
        <SettingsDrawer open={true} onClose={() => {}} />
      </Wrap>,
    );
    expect(screen.getByText('Theme')).toBeInTheDocument();
    expect(screen.getByText('Appearance')).toBeInTheDocument();
    expect(screen.getByText('Interface language')).toBeInTheDocument();
    // Light + Dark buttons.
    expect(screen.getByRole('button', { name: /Light/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Dark/ })).toBeInTheDocument();
  });

  test('renders all 8 theme cards', () => {
    render(
      <Wrap>
        <SettingsDrawer open={true} onClose={() => {}} />
      </Wrap>,
    );
    for (const name of [
      'Paper',
      'Mono',
      'Mid-Century',
      'Blueprint',
      'Solarized',
      'Newsprint',
      'Neon',
      'Botanical',
    ]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });

  test('clicking a theme card calls setTheme and persists', async () => {
    const user = userEvent.setup();
    render(
      <Wrap>
        <SettingsDrawer open={true} onClose={() => {}} />
      </Wrap>,
    );
    const monoCard = screen.getByText('Mono').closest('button');
    expect(monoCard).toBeTruthy();
    await user.click(monoCard!);
    expect(localStorage.getItem('lifecycle-map.theme')).toBe('mono');
    expect(document.documentElement.dataset.theme).toBe('mono');
  });

  test('clicking Dark switches mode and persists', async () => {
    const user = userEvent.setup();
    render(
      <Wrap>
        <SettingsDrawer open={true} onClose={() => {}} />
      </Wrap>,
    );
    await user.click(screen.getByRole('button', { name: /Dark/ }));
    expect(localStorage.getItem('lifecycle-map.mode')).toBe('dark');
    expect(document.documentElement.dataset.mode).toBe('dark');
  });

  test('clicking Light switches mode back', async () => {
    const user = userEvent.setup();
    localStorage.setItem('lifecycle-map.mode', 'dark');
    render(
      <Wrap>
        <SettingsDrawer open={true} onClose={() => {}} />
      </Wrap>,
    );
    await user.click(screen.getByRole('button', { name: /Light/ }));
    expect(localStorage.getItem('lifecycle-map.mode')).toBe('light');
  });

  test('clicking a UI language button updates uiLang', async () => {
    const user = userEvent.setup();
    render(
      <Wrap>
        <SettingsDrawer open={true} onClose={() => {}} />
      </Wrap>,
    );
    const ptBtn = screen.getByRole('button', { name: /Português/ });
    await user.click(ptBtn);
    expect(localStorage.getItem('lifecycle-map.uiLang')).toBe('pt');
    // The drawer re-renders the localized title.
    expect(document.documentElement.lang).toBe('pt');
  });

  test('all three UI lang buttons are present (EN/PT/ES)', () => {
    render(
      <Wrap>
        <SettingsDrawer open={true} onClose={() => {}} />
      </Wrap>,
    );
    expect(screen.getByRole('button', { name: /English/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Português/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Español/ })).toBeInTheDocument();
  });

  test('data lang group hidden when availableLangs has 1 or fewer entries', () => {
    render(
      <Wrap>
        <SettingsDrawer open={true} onClose={() => {}} />
      </Wrap>,
    );
    expect(screen.queryByText('Map language')).toBeNull();
  });

  test('data lang group renders when 2+ languages are available', () => {
    render(
      <Wrap>
        <AvailableLangsSetter langs={['en', 'pt']} />
        <SettingsDrawer open={true} onClose={() => {}} />
      </Wrap>,
    );
    expect(screen.getByText('Map language')).toBeInTheDocument();
  });

  test('clicking a data lang button updates dataLang', async () => {
    const user = userEvent.setup();
    render(
      <Wrap>
        <AvailableLangsSetter langs={['en', 'pt']} />
        <SettingsDrawer open={true} onClose={() => {}} />
      </Wrap>,
    );
    const mapGroup = screen.getByText('Map language').parentElement!;
    const ptBtn = within(mapGroup).getByRole('button', { name: /Português/ });
    await user.click(ptBtn);
    expect(localStorage.getItem('lifecycle-map.lang')).toBe('pt');
  });

  test('close button calls onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Wrap>
        <SettingsDrawer open={true} onClose={onClose} />
      </Wrap>,
    );
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('Escape closes the drawer when open', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Wrap>
        <SettingsDrawer open={true} onClose={onClose} />
      </Wrap>,
    );
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  test('Escape does NOT fire onClose when drawer is closed', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Wrap>
        <SettingsDrawer open={false} onClose={onClose} />
      </Wrap>,
    );
    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
  });

  test('footer renders docs / GitHub / MIT links', () => {
    render(
      <Wrap>
        <SettingsDrawer open={true} onClose={() => {}} />
      </Wrap>,
    );
    expect(screen.getByRole('link', { name: /docs/i })).toHaveAttribute('href', './docs/');
    expect(screen.getByRole('link', { name: /GitHub/i })).toHaveAttribute(
      'href',
      'https://github.com/',
    );
    expect(screen.getByText(/MIT/i)).toBeInTheDocument();
  });

  test('theme cards rendered have aria-pressed reflecting active theme', async () => {
    const user = userEvent.setup();
    render(
      <Wrap>
        <SettingsDrawer open={true} onClose={() => {}} />
      </Wrap>,
    );
    const paperCard = screen.getByText('Paper').closest('button')!;
    // Default theme is 'paper'.
    expect(paperCard).toHaveAttribute('aria-pressed', 'true');
    const monoCard = screen.getByText('Mono').closest('button')!;
    expect(monoCard).toHaveAttribute('aria-pressed', 'false');
    await user.click(monoCard);
    expect(monoCard).toHaveAttribute('aria-pressed', 'true');
  });
});
