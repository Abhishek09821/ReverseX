/** Focused V2 overview: four reports at a glance, plus the evidence gate and AI fallback. */
import { useQueryClient } from '@tanstack/react-query';
import {
  ActivityIcon,
  ArrowRightIcon,
  BrainCircuitIcon,
  CodeIcon,
  GaugeIcon,
  PaletteIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TypeIcon,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

import { ScoreBar, ScoreRing } from '@/components/sections/ScoreRing';
import { FindingStatusBadge } from '@/components/sections/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/client';
import { getRepository } from '@/lib/db/repository';
import { buildDesignPresentation } from '@/lib/presentation/design';
import { buildOverview } from '@/lib/presentation/overview';
import { cn } from '@/lib/utils';
import type { AnalysisResult, EvidenceQuality, SectionKey } from '@/types/analysis';

export function OverviewPanel({
  result,
  onOpenSection,
}: {
  result: AnalysisResult;
  onOpenSection?: (key: SectionKey) => void;
}) {
  const overview = buildOverview(result);
  const design = buildDesignPresentation(result);
  const quality = result.quality;
  const evidence = overview.evidence;
  const totalFindings =
    evidence.verified + evidence.stronglyInferred + evidence.inferred + evidence.aiInferred;

  return (
    <div className="space-y-4">
      {quality && <EvidenceQualityCard quality={quality} scanId={result.scan.scan_id} />}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Security posture */}
        <Panel
          icon={ShieldCheckIcon}
          title="Security posture"
          note="Passive observation, not proof a site is secure"
          onOpen={onOpenSection ? () => onOpenSection('security') : undefined}
          delay={0}
        >
          {overview.security.percentage === null ? (
            <Empty>A posture score was not produced for this scan.</Empty>
          ) : (
            <div className="flex items-center gap-5">
              <ScoreRing percentage={overview.security.percentage} label="posture" size={116} />
              <div className="min-w-0">
                {overview.security.bandPhrase && (
                  <p className="text-sm font-medium">{overview.security.bandPhrase}</p>
                )}
                <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                  Published rules only. Unevaluable rules are excluded from both sides of the
                  ratio.
                </p>
              </div>
            </div>
          )}
        </Panel>

        {/* Evidence mix */}
        <Panel
          icon={GaugeIcon}
          title="Evidence mix"
          note={`${evidence.analyzersCompleted}/${evidence.analyzersTotal} analyzers completed`}
          delay={60}
        >
          {totalFindings === 0 && evidence.unknown === 0 ? (
            <Empty>No findings were produced.</Empty>
          ) : (
            <dl className="space-y-3">
              <Measure
                label="Verified"
                value={evidence.verified}
                max={Math.max(1, totalFindings + evidence.unknown)}
                tone="bg-status-verified"
                delay={120}
              />
              <Measure
                label="Strongly inferred"
                value={evidence.stronglyInferred}
                max={Math.max(1, totalFindings + evidence.unknown)}
                tone="bg-status-strongly-inferred"
                delay={180}
              />
              <Measure
                label="Inferred"
                value={evidence.inferred}
                max={Math.max(1, totalFindings + evidence.unknown)}
                tone="bg-status-inferred"
                delay={240}
              />
              {evidence.aiInferred > 0 && (
                <Measure
                  label="AI hypotheses"
                  value={evidence.aiInferred}
                  max={Math.max(1, totalFindings + evidence.unknown)}
                  tone="bg-status-ai-inferred"
                  delay={300}
                />
              )}
              <Measure
                label="Absent or unknown"
                value={evidence.unknown}
                max={Math.max(1, totalFindings + evidence.unknown)}
                tone="bg-status-neutral"
                delay={360}
              />
            </dl>
          )}
        </Panel>

        {/* Traffic */}
        <Panel
          icon={ActivityIcon}
          title="Traffic & popularity"
          note={`Provider: ${overview.traffic.providerName ?? 'none configured'}`}
          onOpen={onOpenSection ? () => onOpenSection('traffic') : undefined}
          delay={120}
        >
          {overview.traffic.estimates.length > 0 ? (
            <ul className="space-y-2.5">
              {overview.traffic.estimates.map((estimate) => (
                <li key={estimate.name} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 text-sm">
                    <span className="text-muted-foreground">{estimate.name}: </span>
                    <span className="font-medium">{estimate.value}</span>
                  </span>
                  <FindingStatusBadge status={estimate.status} />
                </li>
              ))}
            </ul>
          ) : (
            <Empty>{overview.traffic.unavailableReason}</Empty>
          )}

          {overview.traffic.analyticsServices.length > 0 && (
            <div className="mt-5 border-t border-border/60 pt-4">
              <p className="text-[0.6875rem] tracking-wide text-muted-foreground uppercase">
                Analytics observed
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {overview.traffic.analyticsServices.map((service) => (
                  <Chip key={service}>{service}</Chip>
                ))}
              </div>
            </div>
          )}
        </Panel>

        {/* Tech stack */}
        <Panel
          icon={CodeIcon}
          title="Tech stack"
          note={
            overview.technology.rendering
              ? `Rendering: ${overview.technology.rendering.value}`
              : 'Observable signals only'
          }
          onOpen={onOpenSection ? () => onOpenSection('technology') : undefined}
          delay={180}
          className="lg:col-span-2"
        >
          {overview.technology.unavailable ? (
            <Empty>Technology evidence was unavailable.</Empty>
          ) : overview.technology.items.length === 0 ? (
            <Empty>No technologies were identified from observable signals.</Empty>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {overview.technology.items.map((item) => (
                <li
                  key={`${item.name}-${item.status}`}
                  className="tech-chip flex items-center gap-2 rounded-lg border border-border/70 bg-background/60 px-3 py-2"
                >
                  <span className="text-sm font-medium">{item.name}</span>
                  <FindingStatusBadge status={item.status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Design */}
        <Panel
          icon={PaletteIcon}
          title="Design"
          note="Rendered visual system"
          onOpen={onOpenSection ? () => onOpenSection('design') : undefined}
          delay={240}
        >
          {overview.design.unavailable ? (
            <Empty>Design evidence was unavailable.</Empty>
          ) : (
            <div className="space-y-4">
              {design.colors.backgrounds.length > 0 && (
                <div>
                  <p className="text-[0.6875rem] tracking-wide text-muted-foreground uppercase">
                    Observed colors
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {design.colors.backgrounds.slice(0, 10).map((color, index) => (
                      <span
                        key={`${color.value}-${index}`}
                        title={color.hex ?? color.value}
                        className="swatch size-7 rounded-md border border-border/70 shadow-xs"
                        style={{
                          backgroundColor: color.hex ?? color.value,
                          animationDelay: `${300 + index * 35}ms`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {overview.design.fonts.length > 0 && (
                <div>
                  <p className="flex items-center gap-1.5 text-[0.6875rem] tracking-wide text-muted-foreground uppercase">
                    <TypeIcon className="size-3" aria-hidden="true" />
                    Typography
                  </p>
                  <p className="mt-1.5 truncate text-sm">{overview.design.fonts.join(', ')}</p>
                </div>
              )}

              {overview.design.observations.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {overview.design.observations.map((observation) => (
                    <Chip key={observation}>{observation}</Chip>
                  ))}
                </div>
              )}

              {design.colors.backgrounds.length === 0 &&
                overview.design.fonts.length === 0 &&
                overview.design.observations.length === 0 && (
                  <Empty>No design values were observed.</Empty>
                )}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------------------- */

function Panel({
  icon: Icon,
  title,
  note,
  children,
  onOpen,
  delay = 0,
  className,
}: {
  icon: typeof CodeIcon;
  title: string;
  note?: string;
  children: ReactNode;
  onOpen?: () => void;
  delay?: number;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'reveal group/panel relative flex flex-col rounded-xl border border-border bg-card p-5 transition-[border-color,box-shadow] duration-300 hover:border-border hover:shadow-md sm:p-6',
        className,
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
            {title}
          </h3>
          {note && <p className="mt-1 truncate text-xs text-muted-foreground">{note}</p>}
        </div>
        {onOpen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpen}
            aria-label={`Open ${title} report`}
            className="-mt-1 -mr-1 size-8 shrink-0 opacity-0 transition-opacity group-hover/panel:opacity-100 focus-visible:opacity-100"
          >
            <ArrowRightIcon className="size-4" />
          </Button>
        )}
      </div>
      <div className="mt-5 flex-1">{children}</div>
    </section>
  );
}

function Measure({
  label,
  value,
  max,
  tone,
  delay,
}: {
  label: string;
  value: number;
  max: number;
  tone: string;
  delay: number;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="font-mono text-sm font-medium tabular-nums">{value}</dd>
      </div>
      <div className="mt-1.5">
        <ScoreBar value={value} max={max} tone={tone} delayMs={delay} />
      </div>
    </div>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-secondary/70 px-2.5 py-1 text-xs text-muted-foreground">
      {children}
    </span>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm leading-6 text-muted-foreground">{children}</p>;
}

/* ---------------------------------------------------------------------------------------- */

/** Evidence quality gate with a provider-aware, user-initiated AI fallback. */
function EvidenceQualityCard({
  quality,
  scanId,
}: {
  quality: NonNullable<AnalysisResult['quality']>;
  scanId: string;
}) {
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);
  const [availability, setAvailability] = useState<
    'idle' | 'checking' | 'available' | 'unavailable'
  >(quality.ai_fallback_available ? 'checking' : 'idle');
  const [aiResult, setAiResult] = useState<{ kind: 'success' | 'error'; message: string } | null>(
    null,
  );

  useEffect(() => {
    if (!quality.ai_fallback_available) return;

    let active = true;
    void api
      .intelligenceStatus(scanId)
      .then((status) => {
        if (active) setAvailability(status.available ? 'available' : 'unavailable');
      })
      .catch(() => {
        if (active) setAvailability('unavailable');
      });
    return () => {
      active = false;
    };
  }, [quality.ai_fallback_available, scanId]);

  const handleRunIntelligence = async () => {
    setIsRunning(true);
    setAiResult(null);
    try {
      const response = await api.runIntelligence(scanId, {
        sections: quality.ai_fallback_sections as SectionKey[],
      });
      const enhancedResult = await api.result(scanId);
      const repository = getRepository();
      const screenshots = await repository.getScreenshots(scanId);
      await repository.persist(enhancedResult, screenshots);
      await api.deleteScan(scanId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['scan', scanId, 'result'] }),
        queryClient.invalidateQueries({ queryKey: ['scans'] }),
      ]);
      setAvailability('unavailable');
      setAiResult({
        kind: 'success',
        message: `AI Intelligence completed and saved locally. ${response.findings_added} findings were added to ${response.sections_enhanced.join(', ')}.`,
      });
    } catch {
      setAiResult({
        kind: 'error',
        message:
          'AI Intelligence could not be completed and saved. The normal local scan result is unchanged.',
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <section className="reveal rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-10">
        <div className="flex items-center gap-5">
          <ScoreRing percentage={quality.overall_score} label="evidence" size={104} />
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <BrainCircuitIcon className="size-4 text-primary" aria-hidden="true" />
              Evidence quality
            </h2>
            <div className="mt-2">
              <QualityBadge quality={quality.overall} />
            </div>
          </div>
        </div>

        <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          {Object.values(quality.sections).map((sq, index) => (
            <div key={sq.section}>
              <dt className="flex items-baseline justify-between gap-2">
                <span className="truncate text-xs text-muted-foreground capitalize">
                  {sq.section}
                </span>
                <span className="font-mono text-xs tabular-nums">{sq.score}</span>
              </dt>
              <dd className="mt-1.5">
                <ScoreBar
                  value={sq.score}
                  tone={QUALITY_TONE[sq.quality]}
                  delayMs={120 + index * 70}
                />
                <span className="sr-only">{sq.quality}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {quality.ai_fallback_available && !aiResult && availability !== 'idle' && (
        <div className="mt-6 border-t border-border/60 pt-5">
          {availability === 'checking' && (
            <p className="text-xs text-muted-foreground" role="status">
              Checking whether AI Intelligence is configured for this scan…
            </p>
          )}

          {availability === 'available' && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium">Evidence collection was incomplete.</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  ReverseX can research public information and add labelled hypotheses. Direct
                  observations stay unchanged.
                  {quality.ai_fallback_sections.length > 0 &&
                    ` Recommended for: ${quality.ai_fallback_sections.join(', ')}.`}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={isRunning}
                onClick={handleRunIntelligence}
                className="shrink-0 gap-1.5"
              >
                <SparklesIcon className={cn('size-3.5', isRunning && 'animate-pulse')} aria-hidden="true" />
                {isRunning ? 'Running…' : 'Run AI Intelligence'}
              </Button>
            </div>
          )}

          {availability === 'unavailable' && (
            <p className="text-xs leading-5 text-muted-foreground">
              AI Intelligence is not configured, or this scan’s temporary server window has ended.
              The deterministic local result remains available.
            </p>
          )}
        </div>
      )}

      {aiResult && (
        <div
          className={cn(
            'mt-6 rounded-lg border p-3.5',
            aiResult.kind === 'success'
              ? 'border-status-verified/40 bg-status-verified/10'
              : 'border-destructive/40 bg-destructive/10',
          )}
          role="status"
        >
          <p className="text-sm leading-6">{aiResult.message}</p>
        </div>
      )}
    </section>
  );
}

const QUALITY_TONE: Record<EvidenceQuality, string> = {
  high: 'bg-status-verified',
  medium: 'bg-status-inferred',
  low: 'bg-status-attention',
  failed: 'bg-status-neutral',
};

function QualityBadge({ quality }: { quality: EvidenceQuality }) {
  const variants: Record<EvidenceQuality, 'verified' | 'inferred' | 'attention' | 'muted'> = {
    high: 'verified',
    medium: 'inferred',
    low: 'attention',
    failed: 'muted',
  };
  return <Badge variant={variants[quality]}>{quality.toUpperCase()}</Badge>;
}
