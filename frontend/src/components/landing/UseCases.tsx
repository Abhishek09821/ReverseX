import { BotIcon, Code2Icon, SearchCheckIcon, ServerCogIcon, WorkflowIcon } from 'lucide-react';

import { SectionHeading } from './SectionHeading';

const USE_CASES = [
  {
    icon: BotIcon,
    title: 'AI Coding Agents',
    detail: 'Feed the reconstruction prompt directly to Claude, GPT-4, or any AI agent to rebuild a similar project.',
  },
  {
    icon: Code2Icon,
    title: 'Frontend Developers',
    detail: 'Understand how a site is built, then use the prompt as a starting point for your own implementation.',
  },
  {
    icon: WorkflowIcon,
    title: 'Product Teams',
    detail: 'Quickly assess competitor technology choices and patterns before making architectural decisions.',
  },
  {
    icon: SearchCheckIcon,
    title: 'Technical Researchers',
    detail: 'Study publicly observable architecture and engineering practices with an auditable, confidence-scored output.',
  },
  {
    icon: ServerCogIcon,
    title: 'Open Source Contributors',
    detail: 'Understand the structure of a GitHub project before contributing or forking it.',
  },
] as const;

export function UseCases() {
  return (
    <section
      id="use-cases"
      aria-labelledby="use-cases-title"
      className="landing-divider landing-section landing-reveal scroll-mt-20"
    >
      <div className="section-shell">
        <SectionHeading
          id="use-cases-title"
          eyebrow="Why this matters"
          title="From analysis to implementation."
          description="Useful wherever understanding how something is built saves you time. The output is always a ready-to-use prompt, not a report to read."
        />

        <dl className="mt-12 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {USE_CASES.map(({ icon: Icon, title, detail }) => (
            <div key={title} className="flex gap-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-primary">
                <Icon className="size-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <dt className="text-sm font-medium">{title}</dt>
                <dd className="mt-1.5 text-sm leading-6 text-muted-foreground">{detail}</dd>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
