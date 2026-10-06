import { CircleAlertIcon, TriangleAlertIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { AIIntelligenceSection } from '@/components/landing/AIIntelligenceSection';
import { CreatorSection } from '@/components/landing/CreatorSection';
import { FaqSection } from '@/components/landing/FaqSection';
import { LandingHero } from '@/components/landing/LandingHero';
import { ProductStory } from '@/components/landing/ProductStory';
import { ReportsShowcase } from '@/components/landing/ReportsShowcase';
import { UseCases } from '@/components/landing/UseCases';
import { ScanProgress } from '@/components/scan/ScanProgress';
import { UrlForm } from '@/components/scan/UrlForm';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useScanLibrary } from '@/features/history/useScanLibrary';
import { useCapabilities, useHealth, useStats } from '@/features/scan/useHealth';
import { useScanRunner } from '@/features/scan/useScanRunner';
import { isBusy } from '@/features/scan/types';

/**
 * Landing page and the one scan entry point.
 *
 * This route owns the single `useScanRunner` and the single `UrlForm`; every other "Analyze"
 * control on the page is an anchor to `#analyze`. Scan feedback stays directly beneath the form
 * so submitting never looks like nothing happened.
 */
export function AnalyzeRoute() {
  const navigate = useNavigate();
  const runner = useScanRunner((scanId) => navigate(`/scan/${scanId}`));
  const health = useHealth();
  const capabilities = useCapabilities();
  const stats = useStats();
  const library = useScanLibrary();

  const busy = isBusy(runner.phase);
  const implementedCount = capabilities.data?.website_analysis || capabilities.data?.github_analysis
    ? (capabilities.data.website_analysis ? 1 : 0) + (capabilities.data.github_analysis ? 1 : 0)
    : null;
  const collectorStatus = health.isError
    ? 'Backend offline'
    : health.isLoading
      ? 'Connecting…'
      : health.data?.browser.available
        ? 'Browser collector ready'
        : 'HTTP collector ready';

  const hasStatus =
    health.isError ||
    (health.data && !health.data.browser.available) ||
    runner.phase.kind === 'running' ||
    runner.phase.kind === 'submitting' ||
    runner.phase.kind === 'persisting' ||
    runner.phase.kind === 'failed';

  const scanStatus = hasStatus ? (
    <div className="section-shell pt-8" aria-live="polite">
      <div className="space-y-4">
        {health.isError && (
          <Alert variant="destructive">
            <CircleAlertIcon className="size-4" />
            <AlertTitle>The ReverseX backend is not reachable</AlertTitle>
            <AlertDescription>
              Start it with <code className="font-mono">make dev-backend</code> on
              http://127.0.0.1:8000. Stored scans remain readable without it.
            </AlertDescription>
          </Alert>
        )}

        {health.data && !health.data.browser.available && (
          <Alert variant="warning">
            <TriangleAlertIcon className="size-4" />
            <AlertTitle>Browser collection is unavailable</AlertTitle>
            <AlertDescription>
              {health.data.browser.detail ??
                'Playwright has no browser installed, so only HTTP-based evidence can be collected.'}{' '}
              Reports needing a rendered page will say what could not be produced.
            </AlertDescription>
          </Alert>
        )}

        {(runner.phase.kind === 'running' || runner.phase.kind === 'submitting') && (
          <ScanProgress
            job={runner.phase.kind === 'running' ? runner.phase.job : null}
            elapsedMs={runner.elapsedMs}
            url={
              runner.phase.kind === 'submitting'
                ? runner.phase.url
                : (runner.phase.job?.requested_url ?? '')
            }
          />
        )}

        {runner.phase.kind === 'persisting' && (
          <Alert variant="info">
            <AlertTitle>Storing the result in this browser</AlertTitle>
            <AlertDescription>
              The browser remains the system of record. AI-eligible scans may stay in the temporary
              server buffer briefly; other server copies are released immediately after saving.
            </AlertDescription>
          </Alert>
        )}

        {runner.phase.kind === 'failed' && (
          <Alert variant="destructive">
            <CircleAlertIcon className="size-4" />
            <AlertTitle>{runner.phase.title}</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>{runner.phase.detail}</p>
              {runner.phase.problem?.code && (
                <p className="font-mono text-xs">{runner.phase.problem.code}</p>
              )}
              <Button variant="outline" size="sm" onClick={runner.reset}>
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      <LandingHero
        form={
          <UrlForm
            prominent
            onSubmit={(url) => void runner.start(url)}
            disabled={busy}
            {...(runner.phase.kind === 'invalid' ? { externalError: runner.phase.message } : {})}
          />
        }
        status={scanStatus}
        collectorStatus={collectorStatus}
        collectorAvailable={Boolean(health.data)}
        analyzerCount={implementedCount}
        totalAnalyzed={stats.data?.enabled ? stats.data.total_scans : null}
        localAnalyzed={library.data?.length ?? null}
      />

      <ProductStory />
      <AIIntelligenceSection />
      <ReportsShowcase />
      <UseCases />
      <FaqSection />
      <CreatorSection />
    </>
  );
}
