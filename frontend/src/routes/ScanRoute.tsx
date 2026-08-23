import { CircleAlertIcon, InfoIcon, TriangleAlertIcon } from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import { OverviewPanel } from '@/components/sections/OverviewPanel';
import { ScanHero } from '@/components/sections/ScanHero';
import { SectionPanel } from '@/components/sections/SectionPanel';
import { SectionTabs, type NavKey } from '@/components/sections/SectionTabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useStoredResult } from '@/features/history/useScanLibrary';
import { sectionKeySchema, type SectionKey } from '@/types/analysis';

export function ScanRoute() {
  const { scanId, sectionKey } = useParams<{ scanId: string; sectionKey?: string }>();
  const navigate = useNavigate();
  const stored = useStoredResult(scanId);

  const parsedSection = sectionKey ? sectionKeySchema.safeParse(sectionKey) : null;

  if (sectionKey && !parsedSection?.success) {
    return <Navigate replace to={scanId ? `/scan/${scanId}` : '/'} />;
  }

  const active: NavKey = parsedSection?.success ? parsedSection.data : 'overview';

  if (stored.isLoading) {
    return (
      <div className="section-shell space-y-4 py-12">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-5 w-96" />
        <Skeleton className="mt-8 h-32 w-full" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-52 w-full" />
          <Skeleton className="h-52 w-full" />
          <Skeleton className="h-52 w-full" />
        </div>
      </div>
    );
  }

  if (!stored.data) {
    return (
      <div className="section-shell py-12">
        <Alert variant="warning" className="mx-auto max-w-2xl">
          <TriangleAlertIcon className="size-4" />
          <AlertTitle>This scan is not stored in this browser</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              Scans live only in the browser profile that ran them. If this link came from
              elsewhere, or the scan was deleted, run a new analysis.
            </p>
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>
              Back to analyze
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const result = stored.data;
  const scan = result.scan;
  const degraded = result.errors.length > 0 || scan.status === 'completed_with_errors';

  const goTo = (key: NavKey) =>
    navigate(key === 'overview' ? `/scan/${scan.scan_id}` : `/scan/${scan.scan_id}/${key}`);

  return (
    <div className="pb-20">
      <ScanHero result={result} />

      <SectionTabs sections={result.sections} active={active} onSelect={goTo} />

      {/* `key` restarts the entrance animation on every tab change. */}
      <div key={active} className="section-shell pt-8">
        <div className="space-y-4">
          {degraded && (
            <Alert variant="warning" className="reveal">
              <CircleAlertIcon className="size-4" />
              <AlertTitle>
                Completed with {result.errors.length} issue
                {result.errors.length === 1 ? '' : 's'}
              </AlertTitle>
              <AlertDescription>
                Affected reports state what could not be produced and why. Everything else is
                unaffected.
              </AlertDescription>
            </Alert>
          )}

          {active === 'overview' ? (
            <>
              <OverviewPanel
                result={result}
                onOpenSection={(key: SectionKey) => goTo(key)}
              />

              {result.limitations.length > 0 && (
                <section
                  className="reveal rounded-xl border border-border bg-card p-5 sm:p-6"
                  style={{ animationDelay: '300ms' }}
                  aria-labelledby="scope-title"
                >
                  <h2
                    id="scope-title"
                    className="flex items-center gap-2 text-sm font-semibold"
                  >
                    <InfoIcon className="size-4 text-primary" aria-hidden="true" />
                    Scope of this scan
                  </h2>
                  <ul className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                    {result.limitations.map((limitation) => (
                      <li
                        key={limitation}
                        className="flex gap-2.5 text-xs leading-5 text-muted-foreground"
                      >
                        <span
                          className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground/50"
                          aria-hidden="true"
                        />
                        {limitation}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          ) : (
            <div className="reveal">
              <SectionPanel result={result} sectionKey={active} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
