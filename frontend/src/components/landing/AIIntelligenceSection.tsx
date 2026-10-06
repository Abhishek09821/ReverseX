import { BrainCircuitIcon, FileCodeIcon, FolderGitIcon, GlobeIcon, SparklesIcon } from 'lucide-react';

import { SectionHeading } from './SectionHeading';

const SYNTHESIS_STEPS = [
  {
    title: 'Gather evidence',
    detail: 'Collect all observable signals from the website or GitHub repository.',
  },
  {
    title: 'Detect technology',
    detail: 'Identify frameworks, libraries, and architecture patterns from the evidence.',
  },
  {
    title: 'Map structure',
    detail: 'Understand component hierarchy, file organization, and design patterns.',
  },
  {
    title: 'Generate prompt',
    detail: 'Synthesize all findings into one natural-language reconstruction prompt.',
  },
] as const;

const SOURCE_TYPES = [
  { icon: GlobeIcon, label: 'Website URL', detail: 'example.com or https://…' },
  { icon: FolderGitIcon, label: 'GitHub Repository', detail: 'owner/repo or github.com/…' },
] as const;

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
              eyebrow="Prompt Generation"
              title="One input. One polished prompt. Ready for any AI agent."
              description="Enter a website URL or a GitHub repository. ReverseX analyzes the public structure and generates a comprehensive reconstruction prompt you can paste directly into Claude, GPT-4, or any other AI coding agent."
            />

            <div className="mt-8 rounded-xl border border-border bg-card p-5">
              <p className="text-xs font-medium tracking-[0.1em] text-muted-foreground uppercase">
                Accepted inputs
              </p>
              <ul className="mt-4 space-y-3">
                {SOURCE_TYPES.map(({ icon: Icon, label, detail }) => (
                  <li key={label} className="flex items-center gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-secondary/50 text-primary">
                      <Icon className="size-3.5" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="font-mono text-xs text-muted-foreground">{detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="min-w-0">
            <div className="rounded-xl border border-border bg-card p-5 sm:p-7">
              <div className="flex items-center gap-2">
                <BrainCircuitIcon className="size-4 text-primary" aria-hidden="true" />
                <span className="text-sm font-medium">Synthesis pipeline</span>
              </div>

              <ol className="mt-5 space-y-3">
                {SYNTHESIS_STEPS.map(({ title, detail }, index) => (
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

              <div className="mt-6 rounded-lg border border-primary/25 bg-primary/5 p-4">
                <div className="flex items-center gap-2">
                  <FileCodeIcon className="size-3.5 text-primary" aria-hidden="true" />
                  <span className="text-xs font-medium">Output</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  One comprehensive natural-language prompt describing the full architecture, tech
                  stack, design system, and implementation approach — with confidence score and
                  limitations.
                </p>
              </div>

              <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                <SparklesIcon className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                Paste the prompt into any AI coding agent to start rebuilding.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
