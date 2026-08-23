import {
  CheckCircle2Icon,
  CircleDashedIcon,
  Code2Icon,
  EyeIcon,
  GaugeIcon,
  LockKeyholeIcon,
  MinusCircleIcon,
  RadioTowerIcon,
  ShieldCheckIcon,
} from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SectionHeading } from './SectionHeading';

const REPORTS = [
  {
    key: 'design',
    icon: EyeIcon,
    title: 'Design',
    points: [
      'Layout',
      'Typography',
      'Colors',
      'Spacing',
      'Responsive behavior',
      'Components',
      'Media',
      'Motion',
    ],
    limit:
      'Cannot recover private design files, source components, or the intent behind a decision.',
  },
  {
    key: 'tech-stack',
    icon: Code2Icon,
    title: 'Tech Stack',
    points: [
      'Frontend',
      'Rendering',
      'Styling',
      'Libraries',
      'Infrastructure',
      'API signals',
      'Backend clues',
      'Third-party services',
    ],
    limit:
      'Cannot reveal private source code, hidden services, or server-side technology without a public signal.',
  },
  {
    key: 'security',
    icon: ShieldCheckIcon,
    title: 'Security',
    points: ['TLS', 'Headers', 'Cookies', 'CSP', 'HSTS', 'Observable configuration'],
    limit:
      'Not a penetration test, vulnerability assessment, or compliance audit, and never proof a site is secure.',
  },
  {
    key: 'traffic',
    icon: RadioTowerIcon,
    title: 'Traffic',
    points: ['Popularity', 'Public estimates', 'Rankings', 'Public signals', 'Confidence', 'Limitations'],
    limit:
      'Cannot access private analytics, exact visitor counts, campaign performance, or audience data.',
  },
] as const;

type ReportKey = (typeof REPORTS)[number]['key'];

const VERDICTS = [
  {
    icon: CheckCircle2Icon,
    label: 'Verified',
    detail: 'Direct evidence.',
    tone: 'text-status-verified',
  },
  {
    icon: CheckCircle2Icon,
    label: 'Strongly supported',
    detail: 'Multiple independent signals agree.',
    tone: 'text-status-strongly-inferred',
  },
  {
    icon: GaugeIcon,
    label: 'Likely',
    detail: 'Good evidence but not conclusive.',
    tone: 'text-status-inferred',
  },
  {
    icon: CircleDashedIcon,
    label: 'Possible',
    detail: 'Plausible but weak evidence.',
    tone: 'text-status-ai-inferred',
  },
  {
    icon: MinusCircleIcon,
    label: 'Not detected',
    detail: 'Expected signature was not observed.',
    tone: 'text-status-neutral',
  },
  {
    icon: CircleDashedIcon,
    label: 'Not publicly determinable',
    detail: 'Cannot reasonably be established from outside.',
    tone: 'text-status-neutral',
  },
  {
    icon: LockKeyholeIcon,
    label: 'Unable to verify',
    detail: 'Insufficient data or failed collection.',
    tone: 'text-status-attention',
  },
] as const;

const PREVIEW_ROWS: Record<ReportKey, ReadonlyArray<{ label: string; value: string }>> = {
  design: [
    { label: 'Layout', value: 'Observed structure and grid system' },
    { label: 'Typography', value: 'Rendered families, weights, and scale' },
    { label: 'Colors', value: 'Computed background and text values' },
    { label: 'Responsive', value: 'Only the viewports actually observed' },
  ],
  'tech-stack': [
    { label: 'Frontend', value: 'No claim without an observable signal' },
    { label: 'Framework', value: 'Expected signatures are evaluated' },
    { label: 'Rendering', value: 'Observed delivery pattern' },
    { label: 'Styling', value: 'Document and asset evidence' },
    { label: 'Infrastructure', value: 'Public network and header signals' },
    { label: 'Backend', value: 'Not publicly determinable unless disclosed' },
  ],
  security: [
    { label: 'TLS', value: 'Observable certificate and protocol data' },
    { label: 'Headers', value: 'Collected response headers only' },
    { label: 'Cookies', value: 'Visible attributes, never values' },
    { label: 'CSP / HSTS', value: 'Present-and-parsed, or reported absent' },
  ],
  traffic: [
    { label: 'Popularity', value: 'Public signals and estimates only' },
    { label: 'Rankings', value: 'Shown only when publicly sourced' },
    { label: 'Analytics', value: 'Tags observed during the visit' },
    { label: 'Limitations', value: 'Private analytics remain unavailable' },
  ],
};

const META_ROWS = [
  { label: 'Verdict', value: 'One of seven explicit states' },
  { label: 'Confidence', value: 'Shown alongside the verdict' },
  { label: 'Evidence', value: 'Response, document, DNS, TLS, or browser reference' },
  { label: 'Sources', value: 'Observed evidence and public research only' },
] as const;

export function ReportsShowcase() {
  const [selected, setSelected] = useState<ReportKey>('tech-stack');
  const active = REPORTS.find((report) => report.key === selected) ?? REPORTS[1];

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
            eyebrow="Reports"
            title="Design, Tech Stack, Security, Traffic."
            description="Four focused reports shaped around what public evidence can support — and explicit about what stays out of reach."
          />

          <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 xl:grid-cols-4">
            {REPORTS.map(({ icon: Icon, title, points, limit }) => (
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
                  <span className="font-medium text-foreground">Limit.</span> {limit}
                </p>
              </article>
            ))}
          </div>

          {/* Preview */}
          <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
            <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border px-4 py-4 sm:px-6">
              <div className="min-w-0">
                <p className="font-mono text-[0.625rem] tracking-[0.14em] text-muted-foreground uppercase">
                  Illustrative preview
                </p>
                <p className="mt-1 truncate font-mono text-sm font-medium">www.example.com</p>
              </div>
              <Badge variant="muted">No live scan data</Badge>
            </header>

            <div
              className="scrollbar-thin flex gap-1 overflow-x-auto border-b border-border px-2 sm:px-4"
              role="group"
              aria-label="Choose preview report"
            >
              {REPORTS.map((report) => (
                <button
                  key={report.key}
                  type="button"
                  aria-pressed={selected === report.key}
                  onClick={() => setSelected(report.key)}
                  className={cn(
                    'shrink-0 border-b-2 px-3 py-3 text-xs font-medium whitespace-nowrap transition-colors',
                    selected === report.key
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  {report.title}
                </button>
              ))}
            </div>

            <div className="grid gap-8 p-5 sm:p-7 lg:grid-cols-2 lg:gap-12" aria-live="polite">
              <div>
                <div className="flex items-center gap-2">
                  <active.icon className="size-4 text-primary" aria-hidden="true" />
                  <h3 className="text-sm font-medium">{active.title}</h3>
                </div>
                <dl className="mt-5 space-y-3.5">
                  {PREVIEW_ROWS[selected].map((row) => (
                    <PreviewRow key={row.label} {...row} />
                  ))}
                </dl>
              </div>
              <div className="lg:border-l lg:border-border lg:pl-12">
                <h3 className="text-sm font-medium">Every finding carries</h3>
                <dl className="mt-5 space-y-3.5">
                  {META_ROWS.map((row) => (
                    <PreviewRow key={row.label} {...row} />
                  ))}
                </dl>
                <p className="mt-6 text-xs leading-5 text-muted-foreground">
                  Structure only. This preview is not a scan and makes no claim about a real
                  website.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="verdicts"
        aria-labelledby="verdicts-title"
        className="landing-divider landing-section landing-reveal scroll-mt-20"
      >
        <div className="section-shell">
          <SectionHeading
            id="verdicts-title"
            eyebrow="Verdict system"
            title="Uncertainty stays on the page."
            description="Seven states, so absence of a signal is never dressed up as a denial and a gap is never dressed up as a fact."
          />
          <dl className="mt-12 grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {VERDICTS.map(({ icon: Icon, label, detail, tone }) => (
              <div key={label} className="grid grid-cols-[1.125rem_1fr] gap-x-3">
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

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[8rem_1fr] sm:gap-4">
      <dt className="font-mono text-[0.625rem] tracking-wide text-muted-foreground uppercase sm:pt-0.5">
        {label}
      </dt>
      <dd className="text-xs leading-5">{value}</dd>
    </div>
  );
}
