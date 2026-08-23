import { useCountUp } from '@/lib/hooks/useCountUp';
import { cn } from '@/lib/utils';

/**
 * Circular score readout.
 *
 * The sweep is animated purely in CSS from two custom properties, so there is no state to keep in
 * sync and `prefers-reduced-motion` can switch it off in one rule.
 */
export function ScoreRing({
  percentage,
  label,
  size = 132,
  className,
}: {
  percentage: number;
  label?: string;
  size?: number;
  className?: string;
}) {
  const stroke = size >= 120 ? 9 : 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percentage));
  const offset = circumference * (1 - clamped / 100);
  const shown = useCountUp(clamped);

  return (
    <div className={cn('relative shrink-0', className)} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        role="img"
        aria-label={`${clamped}% ${label ?? 'score'}`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-border/70"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          className="score-ring-arc stroke-primary"
          style={
            {
              '--ring-circumference': circumference,
              '--ring-offset': offset,
            } as React.CSSProperties
          }
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-2xl font-semibold tracking-tight tabular-nums">
          {shown}
          <span className="text-base text-muted-foreground">%</span>
        </span>
        {label && (
          <span className="mt-0.5 text-[0.625rem] tracking-wide text-muted-foreground uppercase">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

/** Horizontal equivalent, for stacking several measures in a small space. */
export function ScoreBar({
  value,
  max = 100,
  tone = 'bg-primary',
  delayMs = 0,
}: {
  value: number;
  max?: number;
  tone?: string;
  delayMs?: number;
}) {
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/60">
      <div
        className={cn('score-bar-fill h-full rounded-full', tone)}
        style={{ '--bar-width': `${pct}%`, animationDelay: `${delayMs}ms` } as React.CSSProperties}
      />
    </div>
  );
}
