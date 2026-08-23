import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { makeResult } from '@/test/factories';

import { OverviewPanel } from './OverviewPanel';

function renderPanel() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <OverviewPanel result={makeResult()} />
    </QueryClientProvider>,
  );
}

describe('OverviewPanel V2 taxonomy', () => {
  it('presents the four reports and the evidence gate', async () => {
    renderPanel();

    expect(screen.getByText('Tech stack')).toBeInTheDocument();
    expect(screen.getByText('Design')).toBeInTheDocument();
    expect(screen.getByText('Security posture')).toBeInTheDocument();
    expect(screen.getByText('Traffic & popularity')).toBeInTheDocument();
    expect(screen.getByText('Evidence quality')).toBeInTheDocument();
    expect(screen.getByText(/No traffic data provider is configured/i)).toBeInTheDocument();
    expect(await screen.findByText(/AI Intelligence is not configured/i)).toBeInTheDocument();
  });

  it('does not reintroduce the retired V1 sections', () => {
    renderPanel();

    expect(screen.queryByText('Performance')).not.toBeInTheDocument();
    expect(screen.queryByText('Accessibility')).not.toBeInTheDocument();
    expect(screen.queryByText('SEO')).not.toBeInTheDocument();
    expect(screen.queryByText('AI Summary')).not.toBeInTheDocument();
  });

  /** The target identity belongs to the page header; repeating it here was noise. */
  it('leaves target identity to the result header', () => {
    renderPanel();

    expect(screen.queryByText('example.test')).not.toBeInTheDocument();
  });
});
