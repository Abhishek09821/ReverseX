import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { makeResult } from '@/test/factories';

import { ScanHero } from './ScanHero';

function renderHero(result = makeResult()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ScanHero result={result} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ScanHero', () => {
  it('identifies the scanned target once, with an outbound link', () => {
    renderHero();

    expect(screen.getByRole('heading', { level: 1, name: 'example.test' })).toBeInTheDocument();

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', expect.stringContaining('example.test'));
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noreferrer'));
  });

  it('shows collection metadata for the run', () => {
    renderHero();

    expect(screen.getByText('Duration')).toBeInTheDocument();
    expect(screen.getByText('Engine')).toBeInTheDocument();
    expect(screen.getByText('Collection')).toBeInTheDocument();
  });
});
