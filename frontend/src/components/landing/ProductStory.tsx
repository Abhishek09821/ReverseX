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
    title: 'Observe the website',
    detail: 'Open one public URL as a normal visitor and observe the response and rendered page.',
  },
  {
    icon: RadarIcon,
    title: 'Collect evidence',
    detail:
      'Capture browser evidence, document signals, network activity, DNS, TLS, headers, and cookies where available.',
  },
  {
    icon: Code2Icon,
    title: 'Identify technologies',
    detail:
      'Use technical fingerprinting to identify frameworks, rendering, libraries, infrastructure, and integrations.',
  },
  {
    icon: SearchCheckIcon,
    title: 'Research when necessary',
    detail: 'Consult public technical information only when observed evidence needs context.',
  },
  {
    icon: SparklesIcon,
    title: 'Use AI only for gaps',
    detail:
      'Offer AI-assisted reasoning only where evidence is incomplete, kept labelled and separate.',
  },
  {
    icon: FileCheck2Icon,
    title: 'Produce transparent verdicts',
    detail: 'Show evidence, sources, confidence, and limitations behind every conclusion.',
  },
] as const;

const STEPS = [
  {
    icon: Globe2Icon,
    title: 'Scan',
    detail: 'Collect public browser and HTTP evidence from one reachable URL.',
  },
  {
    icon: RadarIcon,
    title: 'Detect',
    detail:
      'Analyze DOM, CSS, JavaScript, network requests, fonts, headers, media, and runtime signals.',
  },
  {
    icon: SearchCheckIcon,
    title: 'Research',
    detail:
      'When required, research public engineering information, documentation, and other credible sources.',
  },
  {
    icon: SparklesIcon,
    title: 'Reason',
    detail:
      'AI correlates the evidence and generates carefully labelled hypotheses. It is not the source of truth.',
  },
  {
    icon: FileCheck2Icon,
    title: 'Verdict',
    detail: 'Produce transparent conclusions with confidence, evidence, and limitations.',
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
            title="From public evidence to technical intelligence."
            description="Six restrained stages: observe the website, collect evidence, identify technologies, research public information when necessary, use AI only when evidence is incomplete, and produce transparent verdicts."
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
              Analyze a website
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
            title="Scan. Detect. Research. Reason. Verdict."
            description="Deterministic evidence comes first. Public research and AI-assisted reasoning only clarify what the evidence leaves incomplete."
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
