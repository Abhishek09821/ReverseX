import {
  CheckCircle2Icon,
  Code2Icon,
  CopyIcon,
  FileTextIcon,
  FolderGitIcon,
  GlobeIcon,
  SparklesIcon,
  ZapIcon,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SectionHeading } from './SectionHeading';

const FEATURES = [
  {
    icon: GlobeIcon,
    title: 'Website Analysis',
    points: ['DOM structure', 'CSS & design system', 'JavaScript frameworks', 'Network requests', 'Visual layout', 'Typography & color'],
    limit: 'Limited to publicly observable frontend. Private backend code and API internals are not accessible.',
  },
  {
    icon: FolderGitIcon,
    title: 'GitHub Repository',
    points: ['File structure', 'Dependencies', 'Tech stack', 'Documentation', 'CI/CD config', 'Architecture patterns'],
    limit: 'Public repositories only. Private repos, secrets, and environment configs are never exposed.',
  },
  {
    icon: Code2Icon,
    title: 'Tech Stack Detection',
    points: ['Frontend frameworks', 'Build tools', 'UI libraries', 'Backend hints', 'Databases (when visible)', 'Package managers'],
    limit: 'Identified from observable signals. Server-side technology without public signals cannot be determined.',
  },
  {
    icon: SparklesIcon,
    title: 'Reconstruction Prompt',
    points: ['Complete architecture', 'Component breakdown', 'Styling approach', 'Data patterns', 'Implementation notes', 'Confidence score'],
    limit: 'One polished prompt per analysis. Covers everything needed for an AI agent to rebuild a similar project.',
  },
] as const;

const CONFIDENCE_LEVELS = [
  {
    icon: CheckCircle2Icon,
    label: 'High',
    detail: 'Rich evidence — typically GitHub repos with detailed documentation.',
    tone: 'text-status-verified',
  },
  {
    icon: ZapIcon,
    label: 'Medium',
    detail: 'Good evidence but some details inferred from patterns.',
    tone: 'text-status-inferred',
  },
  {
    icon: FileTextIcon,
    label: 'Low',
    detail: 'Minimal evidence — minimal-JS sites or sparse repos.',
    tone: 'text-status-attention',
  },
] as const;

const EXAMPLE_PROMPT = `Build a modern SaaS dashboard application with the following specifications:

## Tech Stack
- **Frontend**: React 18 with TypeScript, Vite as build tool
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query for server state
- **Routing**: React Router v6

## Architecture
Implement a component-driven architecture with...`;

export function ReportsShowcase() {
  return (
    <>
      <section
        id="reports"
        aria-labelledby="reports-title"
        className="landing-divider landing-section landing-reveal scroll-mt-20"
      >
        <div className="section-shell">
          <SectionHeading
            id="reports-title"
            eyebrow="What's analyzed"
            title="Websites, GitHub repos — one prompt."
            description="ReverseX ingests public evidence from two source types and synthesizes everything into a single reconstruction prompt, ready to paste into any AI coding agent."
          />

          <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 xl:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, points, limit }) => (
              <article key={title} className="flex flex-col bg-card p-5 sm:p-6">
                <Icon className="size-4 text-primary" aria-hidden="true" />
                <h3 className="mt-5 text-base font-semibold">{title}</h3>
                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {points.map((point) => (
                    <li
                      key={point}
                      className="rounded-full bg-secondary/60 px-2.5 py-1 text-[0.6875rem] text-muted-foreground"
                    >
                      {point}
                    </li>
                  ))}
                </ul>
                <p className="mt-auto pt-6 text-xs leading-5 text-muted-foreground">
                  <span className="font-medium text-foreground">Note.</span> {limit}
                </p>
              </article>
            ))}
          </div>

          {/* Prompt output preview */}
          <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
            <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border px-4 py-4 sm:px-6">
              <div className="min-w-0">
                <p className="font-mono text-[0.625rem] tracking-[0.14em] text-muted-foreground uppercase">
                  Illustrative output
                </p>
                <p className="mt-1 truncate font-mono text-sm font-medium">Reconstruction prompt</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="verified">High confidence</Badge>
                <Badge variant="muted">Example only</Badge>
              </div>
            </header>

            <div className="p-5 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-sm font-medium">Output Format</h3>
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  aria-label="Copy prompt (illustrative)"
                >
                  <CopyIcon className="size-3.5" />
                  Copy
                </button>
              </div>
              <div className="mt-4 rounded-lg border border-border bg-muted/30 p-4">
                <pre className="whitespace-pre-wrap text-xs leading-6 text-foreground">
                  {EXAMPLE_PROMPT}
                </pre>
                <p className="mt-2 text-xs italic text-muted-foreground">
                  … prompt continues with full implementation details, component breakdown, and styling instructions.
                </p>
              </div>
              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                Structure only. This preview is not a real analysis. The actual prompt is longer and tailored to the specific target analyzed.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        id="confidence"
        aria-labelledby="confidence-title"
        className="landing-divider landing-section landing-reveal scroll-mt-20"
      >
        <div className="section-shell">
          <SectionHeading
            id="confidence-title"
            eyebrow="Confidence system"
            title="Every prompt knows what it doesn't know."
            description="Each reconstruction prompt carries a confidence score and an explicit list of limitations — so you know exactly how complete the analysis is before handing it to an AI agent."
          />
          <dl className="mt-12 grid gap-x-10 gap-y-6 sm:grid-cols-3">
            {CONFIDENCE_LEVELS.map(({ icon: Icon, label, detail, tone }) => (
              <div key={label} className={cn('grid grid-cols-[1.125rem_1fr] gap-x-3')}>
                <Icon className={cn('mt-0.5 size-4', tone)} aria-hidden="true" />
                <div>
                  <dt className="text-sm font-medium">{label}</dt>
                  <dd className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </>
  );
}
