import { ClockIcon, ExternalLinkIcon, GlobeIcon, LayersIcon, ServerIcon } from 'lucide-react';

import { ExportMenu } from '@/components/reports/ExportMenu';
import { Badge } from '@/components/ui/badge';
import { formatDuration, formatTimestamp, truncateMiddle } from '@/lib/format/values';
import type { AnalysisResult } from '@/types/analysis';

/**
 * Result header.
 *
 * One place that says what was scanned, so the identity of the target is not repeated further
 * down the page.
 */
export function ScanHero({ result }: { result: AnalysisResult }) {
  const { scan, target } = result;
  const url = target.final_url ?? target.normalized_url;
  const degraded = result.errors.length > 0 || scan.status === 'completed_with_errors';

  return (
    <header className="scan-hero relative isolate overflow-hidden border-b border-border/60">
      <div className="section-shell relative z-10 py-9 sm:py-12">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="reveal flex flex-wrap items-center gap-2">
              <Badge variant={degraded ? 'attention' : 'verified'}>
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-current" />
                </span>
                {scan.status.replace(/_/g, ' ')}
              </Badge>
              {target.http_status != null && (
                <Badge variant="muted" className="font-mono">
                  HTTP {target.http_status}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {formatTimestamp(scan.finished_at ?? scan.created_at)}
              </span>
            </div>

            <h1
              className="reveal mt-4 text-3xl font-semibold tracking-[-0.03em] break-words sm:text-4xl lg:text-5xl"
              style={{ animationDelay: '60ms' }}
            >
              {target.host}
            </h1>

            <a
              href={url}
              target="_blank"
              rel="noreferrer noopener"
              className="reveal group mt-3 inline-flex max-w-full items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground sm:text-sm"
              style={{ animationDelay: '120ms' }}
            >
              <span className="truncate">{truncateMiddle(url, 84)}</span>
              <ExternalLinkIcon
                className="size-3.5 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </a>

            <dl
              className="reveal mt-6 flex flex-wrap gap-x-7 gap-y-3"
              style={{ animationDelay: '180ms' }}
            >
              <Meta icon={ClockIcon} label="Duration" value={formatDuration(scan.duration_ms)} />
              <Meta
                icon={ServerIcon}
                label="Collection"
                value={scan.run_context?.collection_mode ?? 'unknown'}
              />
              <Meta icon={LayersIcon} label="Engine" value={scan.engine_version} />
              <Meta icon={GlobeIcon} label="Schema" value={result.schema_version} />
            </dl>
          </div>

          <div className="reveal shrink-0" style={{ animationDelay: '240ms' }}>
            <ExportMenu result={result} />
          </div>
        </div>
      </div>
    </header>
  );
}

function Meta({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ClockIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-[0.6875rem] tracking-wide text-muted-foreground uppercase">
        <Icon className="size-3" aria-hidden="true" />
        {label}
      </dt>
      <dd className="mt-1 truncate font-mono text-sm capitalize">{value}</dd>
    </div>
  );
}
