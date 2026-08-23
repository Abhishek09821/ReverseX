import {
  ChevronDownIcon,
  DownloadIcon,
  FileTextIcon,
  InfoIcon,
  ShieldAlertIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { DesignDetails } from '@/components/sections/DesignDetails';
import { FindingsTable } from '@/components/sections/FindingsTable';
import { InterpretationCallout } from '@/components/sections/InterpretationCallout';
import { ScoreBar } from '@/components/sections/ScoreRing';
import { SectionStatusBadge } from '@/components/sections/StatusBadge';
import { SecurityDetails } from '@/components/sections/SecurityDetails';
import { TechnologyDetails } from '@/components/sections/TechnologyDetails';
import { TrafficDetails } from '@/components/sections/TrafficDetails';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { downloadText } from '@/features/reports/bundle';
import { renderSectionReport } from '@/features/reports/generate';
import { SECTION_DOCS, evidenceQualityMeaning } from '@/features/reports/report-copy';
import { sectionLabel } from '@/lib/format/labels';
import { formatDuration } from '@/lib/format/values';
import { sectionIsRenderable } from '@/lib/format/status';
import { cn } from '@/lib/utils';
import type { AnalysisResult, EvidenceQuality, SectionKey } from '@/types/analysis';

const QUALITY_TONE: Record<EvidenceQuality, string> = {
  high: 'bg-status-verified',
  medium: 'bg-status-inferred',
  low: 'bg-status-attention',
  failed: 'bg-status-neutral',
};

export function SectionPanel({
  result,
  sectionKey,
}: {
  result: AnalysisResult;
  sectionKey: SectionKey;
}) {
  const section = result.sections[sectionKey];
  const renderable = sectionIsRenderable(section.meta.status);
  const reportFile = renderSectionReport(result, sectionKey);
  const docs = SECTION_DOCS[sectionKey];
  const quality = result.quality?.sections[sectionKey];
  const completedAnalyzers = section.meta.analyzers.filter((a) => a.status === 'completed').length;

  return (
    <div className="space-y-4">
      {/* Chapter header */}
      <header className="rounded-xl border border-border bg-card p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[0.6875rem] font-medium tracking-[0.12em] text-primary uppercase">
              Report
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2.5">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {sectionLabel(sectionKey)}
              </h2>
              <SectionStatusBadge status={section.meta.status} />
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              {docs.tagline}.
            </p>
          </div>

          {reportFile && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadText(reportFile)}
              title={`Download ${reportFile.path}`}
              className="shrink-0 gap-1.5"
            >
              <DownloadIcon className="size-3.5" />
              {reportFile.path}
            </Button>
          )}
        </div>

        {/* Measures */}
        <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-border/60 pt-6 sm:grid-cols-4">
          <Stat label="Findings" value={String(section.findings.length)} />
          <Stat
            label="Analyzers"
            value={`${completedAnalyzers}/${section.meta.analyzers.length}`}
          />
          <Stat
            label="Verified"
            value={String(section.findings.filter((f) => f.status === 'verified').length)}
          />
          <div className="min-w-0">
            <dt className="text-[0.6875rem] tracking-wide text-muted-foreground uppercase">
              Evidence quality
            </dt>
            {quality ? (
              <dd className="mt-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium capitalize">{quality.quality}</span>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {quality.score}
                  </span>
                </div>
                <div className="mt-1.5">
                  <ScoreBar value={quality.score} tone={QUALITY_TONE[quality.quality]} />
                </div>
              </dd>
            ) : (
              <dd className="mt-1.5 font-mono text-lg">—</dd>
            )}
          </div>
        </dl>

        {quality && (
          <p className="mt-5 text-xs leading-5 text-muted-foreground">
            {evidenceQualityMeaning(quality.quality)}
          </p>
        )}
      </header>

      {/* Framing: what this covers, and where it stops. */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Disclosure
          icon={InfoIcon}
          title="What this report covers"
          summary="How these findings were produced"
        >
          <p>{docs.covers}</p>
          <p className="mt-3">{docs.howToRead}</p>
        </Disclosure>

        <Disclosure
          icon={ShieldAlertIcon}
          title="What it cannot establish"
          summary="The boundary of passive observation"
          tone="attention"
        >
          <p>{docs.cannot}</p>
        </Disclosure>
      </div>

      {!renderable && (
        <Alert variant={section.meta.status === 'unavailable' ? 'warning' : 'default'}>
          <TriangleAlertIcon className="size-4" />
          <AlertTitle>
            {section.meta.status === 'not_implemented'
              ? 'Not implemented in this build'
              : 'No findings available'}
          </AlertTitle>
          <AlertDescription>
            {section.meta.unavailable_reason ??
              'This report could not be produced for this scan.'}
            {section.meta.status === 'not_implemented' && (
              <span className="mt-1 block">
                Nothing about the target was inferred in its place.
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {sectionKey === 'security' && renderable && <SecurityDetails section={section} />}
      {sectionKey === 'technology' && renderable && <TechnologyDetails result={result} />}
      {sectionKey === 'design' && renderable && <DesignDetails result={result} />}
      {sectionKey === 'traffic' && renderable && <TrafficDetails section={section} />}

      {renderable && <InterpretationCallout interpretations={section.interpretations} />}

      {renderable && (
        <Disclosure
          icon={FileTextIcon}
          title={`All findings (${section.findings.length})`}
          summary="Complete technical detail, including absent and indeterminate results"
        >
          <FindingsTable findings={section.findings} />
        </Disclosure>
      )}

      {section.meta.analyzers.length > 0 && (
        <Disclosure
          icon={FileTextIcon}
          title={`Analyzers (${completedAnalyzers}/${section.meta.analyzers.length} completed)`}
          summary="Which checks ran, and which did not"
        >
          <p className="mb-4">
            This is the difference between “no signal was found” and “the check never executed”.
          </p>
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full min-w-[34rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th scope="col" className="px-1 py-2 font-medium">Analyzer</th>
                  <th scope="col" className="px-1 py-2 font-medium">Version</th>
                  <th scope="col" className="px-1 py-2 font-medium">Outcome</th>
                  <th scope="col" className="px-1 py-2 font-medium">Duration</th>
                  <th scope="col" className="px-1 py-2 font-medium">Detail</th>
                </tr>
              </thead>
              <tbody>
                {section.meta.analyzers.map((run) => (
                  <tr key={run.id} className="border-b border-border/50 align-top last:border-0">
                    <td className="px-1 py-2 font-mono text-xs">{run.id}</td>
                    <td className="px-1 py-2 font-mono text-xs text-muted-foreground">
                      {run.version}
                    </td>
                    <td className="px-1 py-2 text-xs">
                      <span
                        className={cn(
                          'inline-block size-1.5 rounded-full align-middle',
                          run.status === 'completed' ? 'bg-status-verified' : 'bg-status-neutral',
                        )}
                        aria-hidden="true"
                      />{' '}
                      {run.status.replace(/_/g, ' ')}
                    </td>
                    <td className="px-1 py-2 text-xs text-muted-foreground">
                      {formatDuration(run.duration_ms)}
                    </td>
                    <td className="px-1 py-2 text-xs text-muted-foreground">
                      {run.error_detail ?? run.missing_evidence.join(', ') ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Disclosure>
      )}

      {section.meta.limitations.length > 0 && (
        <section
          className="rounded-xl border border-border bg-card p-5 sm:p-6"
          aria-labelledby={`${sectionKey}-limits`}
        >
          <h3
            id={`${sectionKey}-limits`}
            className="flex items-center gap-2 text-sm font-semibold"
          >
            <TriangleAlertIcon className="size-4 text-status-attention" aria-hidden="true" />
            Limitations
          </h3>
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {section.meta.limitations.map((limitation) => (
              <li
                key={limitation}
                className="flex gap-2.5 text-xs leading-5 text-muted-foreground"
              >
                <span
                  className="mt-1.5 size-1 shrink-0 rounded-full bg-status-attention/60"
                  aria-hidden="true"
                />
                {limitation}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.6875rem] tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-1.5 font-mono text-lg font-semibold tracking-tight tabular-nums">
        {value}
      </dd>
    </div>
  );
}

/** Native disclosure so keyboard and find-in-page behaviour come for free. */
function Disclosure({
  icon: Icon,
  title,
  summary,
  tone = 'primary',
  children,
}: {
  icon: typeof InfoIcon;
  title: string;
  summary: string;
  tone?: 'primary' | 'attention';
  children: ReactNode;
}) {
  return (
    <details className="group rounded-xl border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-start gap-3 p-5 marker:hidden sm:p-6">
        <Icon
          className={cn(
            'mt-0.5 size-4 shrink-0',
            tone === 'attention' ? 'text-status-attention' : 'text-primary',
          )}
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{title}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">{summary}</span>
        </span>
        <ChevronDownIcon
          className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="border-t border-border/60 px-5 py-5 text-sm leading-6 text-muted-foreground sm:px-6">
        {children}
      </div>
    </details>
  );
}
