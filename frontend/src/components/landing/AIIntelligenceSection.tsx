import { SparklesIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { SectionHeading } from './SectionHeading';

const INVESTIGATION_STEPS = [
  {
    title: 'Public-source research',
    detail: 'Review relevant public documentation, disclosures, and technical information.',
  },
  {
    title: 'Correlation',
    detail: 'Compare that research against the evidence and signals already collected.',
  },
  {
    title: 'Competing hypotheses',
    detail: 'Weigh plausible alternatives instead of forcing one confident explanation.',
  },
  {
    title: 'Verdict',
    detail: 'Return a labelled conclusion with confidence, evidence, sources, and limitations.',
  },
] as const;

const INPUTS = ['Observed evidence', 'Public research', 'Technical signals'] as const;

export function AIIntelligenceSection() {
  return (
    <section
      id="ai-intelligence"
      aria-labelledby="ai-intelligence-title"
      className="landing-divider landing-section landing-reveal scroll-mt-20"
    >
      <div className="section-shell">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
          <div className="min-w-0">
            <SectionHeading
              id="ai-intelligence-title"
              eyebrow="AI Intelligence"
              title="When the evidence isn’t enough, ReverseX investigates."
              description="Normal evidence comes first. If it is insufficient, you can choose to run AI Intelligence. It researches public sources, correlates them with observed signals, weighs competing hypotheses, and produces a transparent verdict."
            />

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button variant="outline" size="sm" disabled aria-describedby="ai-control-note">
                <SparklesIcon className="size-3.5" aria-hidden="true" />
                Run AI Intelligence
              </Button>
            </div>
            <p id="ai-control-note" className="mt-3 max-w-md text-xs leading-5 text-muted-foreground">
              Illustrative control. The real action appears inside an eligible completed scan when a
              research or inference provider is configured.
            </p>
          </div>

          <div className="min-w-0">
            {/* Inputs → reasoning → verdict, stacked on phones, stepped on desktop. */}
            <div className="rounded-xl border border-border bg-card p-5 sm:p-7">
              <ul className="grid gap-2 sm:grid-cols-3">
                {INPUTS.map((input) => (
                  <li
                    key={input}
                    className="rounded-lg bg-secondary/50 px-3 py-2.5 text-center text-xs font-medium"
                  >
                    {input}
                  </li>
                ))}
              </ul>

              <div className="my-3 flex items-center gap-3" aria-hidden="true">
                <span className="h-px flex-1 bg-border" />
                <span className="font-mono text-[0.625rem] tracking-[0.14em] text-muted-foreground uppercase">
                  AI reasoning
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>

              <ol className="space-y-3">
                {INVESTIGATION_STEPS.map(({ title, detail }, index) => (
                  <li key={title} className="grid grid-cols-[1.5rem_1fr] gap-3">
                    <span className="font-mono text-[0.625rem] text-primary tabular-nums">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <p className="text-sm font-medium leading-none">{title}</p>
                      <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{detail}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <p className="mt-5 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2.5 text-center text-xs font-medium">
                Verdict, with evidence and limitations attached
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
