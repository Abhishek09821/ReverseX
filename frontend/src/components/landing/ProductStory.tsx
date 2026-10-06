import {
  Code2Icon,
  EyeIcon,
  FileCheck2Icon,
  Globe2Icon,
  RadarIcon,
  SearchCheckIcon,
  SparklesIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { SectionHeading } from './SectionHeading';

const STAGES = [
  {
    icon: EyeIcon,
    title: 'Collect evidence',
    detail: 'Analyze website DOM, network, or GitHub repository structure and code.',
  },
  {
    icon: RadarIcon,
    title: 'Detect technologies',
    detail:
      'Identify frameworks, libraries, tech stack, dependencies, and architecture patterns.',
  },
  {
    icon: Code2Icon,
    title: 'Analyze structure',
    detail:
      'Understand component hierarchy, design patterns, file organization, and key features.',
  },
  {
    icon: SearchCheckIcon,
    title: 'Synthesize findings',
    detail: 'Combine all evidence into a coherent understanding of how the system works.',
  },
  {
    icon: SparklesIcon,
    title: 'Generate prompt',
    detail:
      'Create a comprehensive natural-language prompt that tells an AI how to rebuild it.',
  },
  {
    icon: FileCheck2Icon,
    title: 'Deliver with context',
    detail: 'Provide confidence scores, limitations, and metadata about the reconstruction.',
  },
] as const;

const STEPS = [
  {
    icon: Globe2Icon,
    title: 'Analyze',
    detail: 'Collect evidence from website URLs or GitHub repository structure.',
  },
  {
    icon: RadarIcon,
    title: 'Detect',
    detail:
      'Identify technologies, frameworks, dependencies, and architecture patterns automatically.',
  },
  {
    icon: Code2Icon,
    title: 'Understand',
    detail:
      'Map component relationships, design systems, and key features into a coherent model.',
  },
  {
    icon: SparklesIcon,
    title: 'Synthesize',
    detail:
      'AI processes all evidence to build a complete understanding of structure and behavior.',
  },
  {
    icon: FileCheck2Icon,
    title: 'Generate',
    detail: 'Output one polished prompt that tells another AI how to recreate the project.',
  },
] as const;

export function ProductStory() {
  return (
    <>
      <section aria-labelledby="what-title" className="landing-section landing-reveal">
        <div className="section-shell">
          <SectionHeading
            id="what-title"
            eyebrow="What ReverseX does"
            title="From code to reconstruction prompt."
            description="Six stages: collect evidence from websites or GitHub, detect technologies, analyze structure, synthesize findings, generate a comprehensive prompt, and deliver it with confidence scores and limitations."
          />

          <ol className="mt-12 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
            {STAGES.map(({ icon: Icon, title, detail }, index) => (
              <li key={title} className="flex gap-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-primary">
                  <Icon className="size-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h3 className="flex items-baseline gap-2 text-sm font-medium">
                    {title}
                    <span className="font-mono text-[0.625rem] text-muted-foreground tabular-nums">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </h3>
                  <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{detail}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
            <a href="#analyze" className="text-primary underline-offset-4 hover:underline">
              Generate a reconstruction prompt
            </a>
            <Link
              to="/methodology"
              className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Read the methodology
            </Link>
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        aria-labelledby="how-title"
        className="landing-divider landing-section landing-reveal scroll-mt-20"
      >
        <div className="section-shell">
          <SectionHeading
            id="how-title"
            eyebrow="How it works"
            title="Analyze. Detect. Understand. Synthesize. Generate."
            description="Analyze websites and GitHub repositories to understand their structure, then generate a single comprehensive prompt that tells an AI agent how to rebuild them."
          />

          <ol className="mt-12 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map(({ icon: Icon, title, detail }, index) => (
              <li key={title} className="flex flex-col bg-card p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <Icon className="size-4 text-primary" aria-hidden="true" />
                  <span className="font-mono text-[0.625rem] text-muted-foreground tabular-nums">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="mt-6 text-sm font-medium">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
