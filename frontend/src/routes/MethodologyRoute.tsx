import { Link } from 'react-router-dom';

import { BuildCapabilities } from '@/components/history/BuildCapabilities';

/**
 * Methodology and limitations.
 *
 * Published in the product, not just the repository: a tool that makes claims about other
 * people's websites owes its users a plain account of how it reaches them and where it stops.
 */

const VERDICTS = [
  { term: 'Verified', detail: 'Direct evidence was observed in this scan.' },
  { term: 'Strongly supported', detail: 'Multiple independent signals agree.' },
  { term: 'Likely', detail: 'Good evidence, but not conclusive.' },
  { term: 'Possible', detail: 'Plausible, on weak evidence.' },
  {
    term: 'Not detected',
    detail:
      'The expected signature was absent. This is not the same as unused: server-rendered, self-hosted, or heavily bundled technologies are frequently invisible from outside.',
  },
  {
    term: 'Not publicly determinable',
    detail: 'The property cannot reasonably be established from outside the site.',
  },
  { term: 'Unable to verify', detail: 'Required evidence was not collected or collection failed.' },
] as const;

const LIMITS = [
  'No offensive testing: no exploitation, credential attacks, authentication bypass, brute force, fuzzing, or destructive requests.',
  'No crawling. One URL per scan, so findings describe that page and that moment only.',
  'No authenticated, paywalled, or geo-restricted content, and no bypassing of bot protection or consent walls.',
  'One cold run from one network location, so timing observations are lab conditions rather than field data.',
  'Automated accessibility rules cover a subset of WCAG and are evidence inside Design, not a conformance certificate.',
  'Scans are stored in this browser only. Deleting one is permanent because there is no server copy.',
] as const;

const SECTIONS = [
  { id: 'detection', label: 'How detection works' },
  { id: 'verdicts', label: 'Verdict states' },
  { id: 'ai', label: 'AI Intelligence' },
  { id: 'security', label: 'Security posture' },
  { id: 'limitations', label: 'Limitations' },
  { id: 'build', label: 'This build' },
] as const;

export function MethodologyRoute() {
  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_13rem] lg:gap-16">
      <div className="min-w-0 max-w-2xl">
        <header>
          <p className="text-xs font-medium tracking-[0.12em] text-primary uppercase">Reference</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Methodology and limitations
          </h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            How ReverseX reaches its conclusions, and what it cannot tell you.
          </p>
        </header>

        <Block id="detection" title="How detection works">
          <p>
            A scan collects evidence once: HTTP response headers, the served document, DNS and robots
            observations, and — when a browser is available — the rendered DOM, computed styles,
            timing entries, and the network ledger. Deterministic analyzers then read that evidence.
          </p>
          <p>
            Detection itself is not performed by a language model. Each finding carries the evidence
            supporting it, and a claim without evidence cannot be constructed by the backend, so it
            cannot reach a report.
          </p>
        </Block>

        <Block id="verdicts" title="Verdict states">
          <p>
            Every finding carries one verdict. Keeping absence and ignorance distinct from denial is
            the whole point of the vocabulary.
          </p>
          <dl className="mt-6 divide-y divide-border/60 border-y border-border/60">
            {VERDICTS.map(({ term, detail }) => (
              <div key={term} className="py-4 sm:grid sm:grid-cols-[13rem_1fr] sm:gap-6">
                <dt className="text-sm font-medium text-foreground">{term}</dt>
                <dd className="mt-1 text-sm leading-6 sm:mt-0">{detail}</dd>
              </div>
            ))}
          </dl>
        </Block>

        <Block id="ai" title="AI Intelligence">
          <p>
            Deterministic evidence comes first and can produce all four reports on its own. When a
            completed scan has genuine evidence gaps and a research or inference provider is
            configured, you may choose to run AI Intelligence.
          </p>
          <p>
            It researches public sources, correlates them with collected signals, and weighs
            competing hypotheses. Its conclusions are labelled separately and never overwrite a
            direct observation. AI does not gain visibility into private systems.
          </p>
        </Block>

        <Block id="security" title="Observable security posture">
          <p>
            Security is the only scored report, because the presence and quality of observable
            defensive configuration is genuinely useful to communicate. Every rule, weight, and band
            is published, and rules that could not be evaluated are excluded from both sides of the
            ratio.
          </p>
          <p>
            It is not a vulnerability assessment, a penetration test, or a compliance rating, and it
            cannot establish that a site is secure. No other report is scored, because a score for
            design or technology would be an invented weighting presented as a measurement.
          </p>
        </Block>

        <Block id="limitations" title="Limitations">
          <ul className="mt-2 space-y-3">
            {LIMITS.map((limit) => (
              <li key={limit} className="flex gap-3 text-sm leading-6">
                <span
                  className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground/50"
                  aria-hidden="true"
                />
                <span>{limit}</span>
              </li>
            ))}
          </ul>
        </Block>

        <Block id="build" title="This build">
          <BuildCapabilities />
        </Block>

        <p className="mt-14 border-t border-border/60 pt-6 text-sm text-muted-foreground">
          Ready to try it?{' '}
          <Link to="/#analyze" className="text-primary underline-offset-4 hover:underline">
            Analyze a website
          </Link>
          .
        </p>
      </div>

      <nav
        aria-label="On this page"
        className="sticky top-24 hidden h-fit lg:block"
      >
        <p className="text-[0.6875rem] font-medium tracking-[0.1em] text-muted-foreground uppercase">
          On this page
        </p>
        <ul className="mt-4 space-y-2.5 text-sm">
          {SECTIONS.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {section.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

function Block({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-14 scroll-mt-24">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-4 space-y-4 text-sm leading-7 text-muted-foreground">{children}</div>
    </section>
  );
}
