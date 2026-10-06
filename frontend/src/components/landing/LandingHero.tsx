import { CheckIcon, Globe2Icon } from 'lucide-react';
import type { ReactNode } from 'react';

const PIPELINE = [
  { step: 'Input', detail: 'Website URL or GitHub repo' },
  { step: 'Collect', detail: 'Gather evidence & analyze' },
  { step: 'Analyze', detail: 'Detect technologies & patterns' },
  { step: 'Synthesize', detail: 'Understand architecture' },
  { step: 'Generate', detail: 'Create reconstruction prompt' },
] as const;

export function LandingHero({
  form,
  status,
  collectorStatus,
  collectorAvailable,
  analyzerCount,
  totalAnalyzed,
  localAnalyzed,
}: {
  form: ReactNode;
  status: ReactNode;
  collectorStatus: string;
  collectorAvailable: boolean;
  analyzerCount: number | null;
  /** Server-side total for this deployment, or null when unavailable. */
  totalAnalyzed: number | null;
  localAnalyzed: number | null;
}) {
  return (
    <section id="product" aria-labelledby="hero-title" className="scroll-mt-20">
      <div className="landing-hero relative isolate overflow-hidden border-b border-border/60">
        <div className="section-shell relative z-10 grid items-center gap-14 py-16 sm:py-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16 lg:py-24">
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-[0.12em] text-primary uppercase">
              AI-powered reconstruction prompts
            </p>

            <h1
              id="hero-title"
              className="mt-5 text-[2.5rem] leading-[1.05] font-semibold tracking-[-0.03em] text-balance sm:text-5xl lg:text-6xl"
            >
              Turn any website or repo into a rebuild prompt.
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              ReverseX analyzes websites and GitHub repositories to generate comprehensive
              reconstruction prompts that tell AI coding agents exactly how to rebuild them.
            </p>

            <div id="analyze" className="mt-9 max-w-xl scroll-mt-24">
              {form}
            </div>

            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2.5 text-xs text-muted-foreground">
              {['Websites & GitHub repos', 'Single prompt output', 'Stored in your browser'].map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <CheckIcon className="size-3.5 text-primary" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="min-w-0">
            <div className="rounded-2xl border border-border/70 bg-card/70 shadow-sm backdrop-blur-sm">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-b border-border/60 px-5 py-4 sm:px-6">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={`size-2 shrink-0 rounded-full ${
                      collectorAvailable ? 'bg-status-verified' : 'bg-status-attention'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="truncate text-sm font-medium">{collectorStatus}</span>
                </div>
                <span className="font-mono text-[0.625rem] tracking-[0.14em] text-muted-foreground uppercase">
                  Live capability
                </span>
              </div>

              <div className="px-5 py-6 sm:px-6">
                <ol className="space-y-0">
                  {PIPELINE.map(({ step, detail }, index) => (
                    <li key={step} className="grid grid-cols-[1.75rem_1fr] gap-x-3.5">
                      <div className="flex flex-col items-center">
                        <span className="font-mono text-[0.625rem] text-primary tabular-nums">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        {index < PIPELINE.length - 1 && (
                          <span
                            className="mt-1 w-px flex-1 bg-border/70"
                            aria-hidden="true"
                          />
                        )}
                      </div>
                      <div className={index < PIPELINE.length - 1 ? 'pb-5' : ''}>
                        <p className="text-sm font-medium leading-none">{step}</p>
                        <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{detail}</p>
                      </div>
                    </li>
                  ))}
                </ol>

                <dl className="mt-6 grid grid-cols-3 gap-x-4 gap-y-4 border-t border-border/60 pt-5">
                  <Stat
                    label="Total analyzed"
                    value={totalAnalyzed === null ? '—' : formatCount(totalAnalyzed)}
                    note="All time"
                  />
                  <Stat
                    label="Your prompts"
                    value={localAnalyzed === null ? '—' : formatCount(localAnalyzed)}
                    note="This browser"
                  />
                  <Stat
                    label="Source types"
                    value={analyzerCount === null ? '—' : String(analyzerCount)}
                    note="Live"
                  />
                </dl>

                <p className="mt-5 flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2.5 text-xs text-muted-foreground">
                  <Globe2Icon className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                  Public websites & GitHub repos
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {status}
    </section>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-mono text-xl font-semibold tracking-tight tabular-nums sm:text-2xl">
        {value}
      </dd>
      <p className="mt-0.5 text-[0.6875rem] text-muted-foreground">{note}</p>
    </div>
  );
}

/** Compact above a thousand so the stat row never wraps on a narrow card. */
function formatCount(value: number): string {
  if (value < 1000) return String(value);
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(
    value,
  );
}
