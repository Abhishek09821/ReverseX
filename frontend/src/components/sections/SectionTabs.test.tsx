import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { makeResult } from '@/test/factories';

import { SectionTabs } from './SectionTabs';

describe('SectionTabs', () => {
  it('exposes only overview and the four V2 reports in canonical order', () => {
    const onSelect = vi.fn();
    render(<SectionTabs sections={makeResult().sections} active="overview" onSelect={onSelect} />);

    const tabs = screen.getAllByRole('button');
    expect(tabs.map((tab) => tab.querySelector('span.font-medium')?.textContent)).toEqual([
      'Overview',
      'Design',
      'Tech Stack',
      'Security',
      'Traffic',
    ]);

    // The V1 eight-section taxonomy must not reappear.
    expect(screen.queryByText('Performance')).not.toBeInTheDocument();
    expect(screen.queryByText('Accessibility')).not.toBeInTheDocument();
    expect(screen.queryByText('SEO')).not.toBeInTheDocument();
    expect(screen.queryByText('Architecture')).not.toBeInTheDocument();
    expect(screen.queryByText('Network')).not.toBeInTheDocument();
  });

  it('reports the selected report to the caller', () => {
    const onSelect = vi.fn();
    render(<SectionTabs sections={makeResult().sections} active="overview" onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: /traffic/i }));

    expect(onSelect).toHaveBeenCalledWith('traffic');
  });

  it('marks the active report for assistive technology', () => {
    render(
      <SectionTabs sections={makeResult().sections} active="security" onSelect={vi.fn()} />,
    );

    expect(screen.getByRole('button', { name: /security/i })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
