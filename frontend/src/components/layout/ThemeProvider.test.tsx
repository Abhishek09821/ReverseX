import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useContext } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { PREFS_KEY } from '@/lib/prefs/prefs';

import { ThemeContext, ThemeProvider } from './ThemeProvider';

function Probe() {
  const { theme, toggleTheme } = useContext(ThemeContext);
  return (
    <button type="button" onClick={toggleTheme}>
      {theme}
    </button>
  );
}

function renderProvider() {
  return render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>,
  );
}

afterEach(() => {
  document.documentElement.classList.remove('dark');
  window.localStorage.clear();
});

describe('ThemeProvider', () => {
  it('starts every visit in the light theme', () => {
    renderProvider();

    expect(screen.getByRole('button')).toHaveTextContent('light');
    expect(document.documentElement).not.toHaveClass('dark');
  });

  it('toggles straight between light and dark', async () => {
    const user = userEvent.setup();
    renderProvider();
    const toggle = screen.getByRole('button');

    await user.click(toggle);
    expect(toggle).toHaveTextContent('dark');
    expect(document.documentElement).toHaveClass('dark');

    await user.click(toggle);
    expect(toggle).toHaveTextContent('light');
    expect(document.documentElement).not.toHaveClass('dark');
  });

  /** The choice is intentionally per-visit, so a reload must come back light. */
  it('does not persist the choice across a reload', async () => {
    const user = userEvent.setup();
    const first = renderProvider();
    await user.click(screen.getByRole('button'));
    expect(document.documentElement).toHaveClass('dark');

    act(() => first.unmount());
    renderProvider();

    expect(screen.getByRole('button')).toHaveTextContent('light');
    expect(window.localStorage.getItem(PREFS_KEY)).toBeNull();
  });

  it('ignores a stale system preference left by an older build', () => {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify({ theme: 'system' }));

    renderProvider();

    expect(screen.getByRole('button')).toHaveTextContent('light');
  });
});
