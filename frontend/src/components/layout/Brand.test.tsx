import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Brand } from './Brand';

describe('Brand', () => {
  it('renders the wordmark as text so it stays crisp and translatable', () => {
    render(<Brand />);

    // "ReverseX" is split across two spans for the two-tone treatment.
    expect(screen.getByText('Reverse')).toBeInTheDocument();
    expect(screen.getByText('X')).toBeInTheDocument();
  });

  it('uses the supplied mark and hides it from assistive tech', () => {
    const { container } = render(<Brand />);
    const mark = container.querySelector('img');

    expect(mark).toHaveAttribute('src', '/reversex-mark.png');
    expect(mark).toHaveAttribute('aria-hidden', 'true');
    // The wordmark already carries the name, so the image must not repeat it.
    expect(mark).toHaveAttribute('alt', '');
  });

  it('inverts the black artwork for the dark theme', () => {
    const { container } = render(<Brand />);

    expect(container.querySelector('img')?.className).toContain('dark:invert');
  });

  it('adds the tagline only at the largest size', () => {
    const { rerender } = render(<Brand size="sm" />);
    expect(screen.queryByText(/reverse engineer the web/i)).not.toBeInTheDocument();

    rerender(<Brand size="lg" />);
    expect(screen.getByText(/reverse engineer the web/i)).toBeInTheDocument();
  });

  it('uses the full supplied logo, labelled, for the full variant', () => {
    const { container } = render(<Brand variant="full" />);
    const logo = container.querySelector('img');

    expect(logo).toHaveAttribute('src', '/reversex-wordmark.png');
    // Standing alone it is the only carrier of the name, so it needs a real alt.
    expect(logo).toHaveAttribute('alt', 'ReverseX');
  });
});
