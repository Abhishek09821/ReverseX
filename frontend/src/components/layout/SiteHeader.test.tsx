import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ThemeProvider } from '@/components/layout/ThemeProvider';

import { SiteHeader } from './SiteHeader';

/** jsdom has no layout, so hover capability has to be stated explicitly per test. */
function setPointerHover(canHover: boolean) {
  vi.stubGlobal(
    'matchMedia',
    (query: string) =>
      ({
        matches: query.includes('hover: hover') ? canHover : false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }) as unknown as MediaQueryList,
  );
}

function renderHeader() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <SiteHeader />
      </ThemeProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('SiteHeader', () => {
  it('opens a mega-menu panel on tap where hover is unavailable', async () => {
    setPointerHover(false);
    const user = userEvent.setup();
    renderHeader();

    const trigger = screen.getByRole('button', { name: /^Features/ });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: /Website analysis/ })).toBeVisible();
  });

  it('closes an open panel with Escape', async () => {
    setPointerHover(false);
    const user = userEvent.setup();
    renderHeader();

    const trigger = screen.getByRole('button', { name: /^Features/ });
    await user.click(trigger);
    await user.keyboard('{Escape}');

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  /**
   * fireEvent rather than userEvent: these two assert timer behaviour, and userEvent's own
   * internal delays fight fake timers.
   */
  it('requires deliberate dwell before hover opens a panel', () => {
    setPointerHover(true);
    vi.useFakeTimers();
    renderHeader();

    const trigger = screen.getByRole('button', { name: /^Product/ });
    fireEvent.mouseEnter(trigger);

    // A cursor merely crossing the bar must not yank the panel open.
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('cancels a pending hover when the cursor leaves before the dwell elapses', () => {
    setPointerHover(true);
    vi.useFakeTimers();
    renderHeader();

    const trigger = screen.getByRole('button', { name: /^Product/ });
    fireEvent.mouseEnter(trigger);
    fireEvent.mouseLeave(trigger);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('switches instantly between panels once one is open', () => {
    setPointerHover(true);
    vi.useFakeTimers();
    renderHeader();

    const product = screen.getByRole('button', { name: /^Product/ });
    const features = screen.getByRole('button', { name: /^Features/ });

    fireEvent.mouseEnter(product);
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(product).toHaveAttribute('aria-expanded', 'true');

    // No second dwell: browsing the open nav should feel immediate.
    fireEvent.mouseEnter(features);
    expect(features).toHaveAttribute('aria-expanded', 'true');
    expect(product).toHaveAttribute('aria-expanded', 'false');
  });

  it('exposes reconstruction history and the analyze action without opening a panel', () => {
    setPointerHover(false);
    renderHeader();

    expect(screen.getByRole('link', { name: 'Reconstruction history' })).toHaveAttribute('href', '/history');
    expect(screen.getByRole('link', { name: 'Analyze' })).toHaveAttribute('href', '/#analyze');
  });

  it('reveals navigation groups in the mobile drawer', async () => {
    setPointerHover(false);
    const user = userEvent.setup();
    renderHeader();

    await user.click(screen.getByRole('button', { name: 'Open menu' }));

    expect(screen.getByRole('navigation', { name: 'Mobile' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Analyze a Website or Repo' })).toHaveAttribute(
      'href',
      '/#analyze',
    );
  });
});
