import { CheckIcon, CircleDashedIcon, LoaderIcon, MinusIcon, XIcon } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDuration } from '@/lib/format/values';
import { cn } from '@/lib/utils';
import type { ScanJobState, StageRun, StageStatus } from '@/types/analysis';

const STAGE_ICONS: Record<StageStatus, typeof CheckIcon> = {
  pending: CircleDashedIcon,
  running: LoaderIcon,
  completed: CheckIcon,
  failed: XIcon,
  skipped: MinusIcon,
};

/**
 * Live reconstruction progress.
 *
 * The bar is driven by the progress_percent the backend reports. There is no
 * time-based animation filling the gap: while a stage is in flight, the elapsed clock keeps
 * moving and the bar does not. That is deliberate — a bar that advances on a timer is a
 * fabricated claim about work that has not happened.
 */
export function ScanProgress({
  job,
  elapsedMs,
  url,
}: {
  job: ScanJobState | null;
  elapsedMs: number;
  url: string;
}) {
  const progress = job?.progress;
  const percent =
    progress && progress.total_weight > 0
      ? Math.round((progress.completed_weight / progress.total_weight) * 100)
      : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LoaderIcon className="size-4 animate-spin" aria-hidden="true" />
          Analyzing{' '}
          <span className="font-mono font-normal text-muted-foreground truncate max-w-xs">
            {url}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div aria-live="polite" className="flex items-baseline justify-between gap-2 text-sm">
          <span>
            {progress?.current_stage_label ?? (job ? 'Processing…' : 'Submitting…')}
          </span>
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {percent > 0 ? `${percent}%` : ''} · {formatDuration(elapsedMs)}
          </span>
        </div>

        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-label="Reconstruction progress"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${Math.max(percent, job ? 5 : 0)}%` }}
          />
        </div>

        {job && job.stages.length > 0 && (
          <ol className="grid gap-1 sm:grid-cols-2">
            {job.stages.map((stage) => (
              <StageRow key={stage.key} stage={stage} />
            ))}
          </ol>
        )}

        <p className="text-xs text-muted-foreground">
          Generating your reconstruction prompt. This takes 10–60 seconds depending on the source.
        </p>
      </CardContent>
    </Card>
  );
}

function StageRow({ stage }: { stage: StageRun }) {
  const Icon = STAGE_ICONS[stage.status];
  return (
    <li className="flex items-center gap-2 text-xs">
      <Icon
        className={cn(
          'size-3.5 shrink-0',
          stage.status === 'completed' && 'text-status-verified',
          stage.status === 'running' && 'animate-spin text-primary',
          stage.status === 'failed' && 'text-destructive',
          (stage.status === 'pending' || stage.status === 'skipped') && 'text-muted-foreground/50',
        )}
        aria-hidden="true"
      />
      <span
        className={cn(
          'flex-1 truncate',
          stage.status === 'pending' || stage.status === 'skipped'
            ? 'text-muted-foreground'
            : undefined,
        )}
        title={stage.skip_reason ?? stage.error_detail ?? stage.label}
      >
        {stage.label}
      </span>
      <span className="font-mono tabular-nums text-muted-foreground/70">
        {stage.duration_ms === null || stage.duration_ms === undefined
          ? ''
          : formatDuration(stage.duration_ms)}
      </span>
    </li>
  );
}
