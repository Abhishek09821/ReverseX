import { Link } from 'react-router-dom';

import { BuildCapabilities } from '@/components/history/BuildCapabilities';

/**
 * Methodology and limitations.
 */

const CONFIDENCE_LEVELS = [
  { term: 'High', detail: 'Rich evidence — GitHub repos with comprehensive documentation and structure, or websites with clearly observable frontend technology.' },
  { term: 'Medium', detail: 'Good evidence but some aspects inferred from patterns. Common for websites where server-side technology is not directly observable.' },
  { term: 'Low', detail: 'Minimal evidence — sparse repos, minimal-JS sites, or sources where most implementation details are hidden from public view.' },
] as const;

const LIMITS = [
  'GitHub analysis covers only public repositories. Private repos, secrets, and environment variables are never accessible.',
  'Website analysis is limited to one publicly reachable URL per analysis. No crawling, no authenticated pages.',
  'Server-side technology (databases, backend frameworks) can only be identified when public signals expose them.',
  'No offensive or invasive techniques: no credential attacks, authentication bypass, brute force, or destructive requests.',
  'Reconstruction prompts describe observable structure and patterns, not proprietary business logic or private implementation.',
  'Results are stored only in this browser. Deleting an analysis is permanent — there is no server copy.',
  'The reconstruction prompt is a starting point for rebuilding, not a guarantee of identical output when used with an AI agent.',
] as const;

const SECTIONS = [
  { id: 'how-it-works', label: 'How it works' },
  { id: 'sources', label: 'Input sources' },
  { id: 'confidence', label: 'Confidence levels' },
  { id: 'output', label: 'Prompt output' },
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
            How ReverseX analyzes websites and repositories to generate reconstruction prompts, and what it cannot tell you.
          </p>
        </header>

        <Block id="how-it-works" title="How it works">
          <p>
            ReverseX accepts two input types: a publicly accessible website URL or a GitHub repository identifier. It then
            collects all observable evidence, analyzes the structure and technology stack, and generates a single
            comprehensive natural-language prompt.
          </p>
          <p>
            For websites, evidence comes from the HTTP response, rendered DOM, CSS stylesheets, JavaScript files, network
            requests, and observable visual patterns. For GitHub repositories, evidence comes from the file tree,
            dependency files (package.json, requirements.txt, go.mod, etc.), README, configuration files, and code organization.
          </p>
          <p>
            The final output is one polished prompt designed to be pasted directly into an AI coding agent. It describes
            the architecture, technology choices, design patterns, component structure, and implementation approach.
          </p>
        </Block>

        <Block id="sources" title="Input sources">
          <p>
            ReverseX supports two source types:
          </p>
          <dl className="mt-4 divide-y divide-border/60 border-y border-border/60">
            <div className="py-4 sm:grid sm:grid-cols-[13rem_1fr] sm:gap-6">
              <dt className="text-sm font-medium text-foreground">Website URL</dt>
              <dd className="mt-1 text-sm leading-6 sm:mt-0">
                Any publicly reachable HTTP or HTTPS page. Enter as <code className="font-mono text-xs">example.com</code> or
                a full URL. ReverseX visits the page as a normal browser would and collects observable evidence.
              </dd>
            </div>
            <div className="py-4 sm:grid sm:grid-cols-[13rem_1fr] sm:gap-6">
              <dt className="text-sm font-medium text-foreground">GitHub Repository</dt>
              <dd className="mt-1 text-sm leading-6 sm:mt-0">
                A public GitHub repository. Enter as <code className="font-mono text-xs">owner/repo</code>,{' '}
                <code className="font-mono text-xs">github.com/owner/repo</code>, or a full GitHub URL. ReverseX uses the
                GitHub API to analyze the repository structure, dependencies, and documentation.
              </dd>
            </div>
          </dl>
        </Block>

        <Block id="confidence" title="Confidence levels">
          <p>
            Every reconstruction prompt carries a confidence level that reflects how much evidence was available.
            This tells you how complete the analysis is before you hand the prompt to an AI agent.
          </p>
          <dl className="mt-6 divide-y divide-border/60 border-y border-border/60">
            {CONFIDENCE_LEVELS.map(({ term, detail }) => (
              <div key={term} className="py-4 sm:grid sm:grid-cols-[8rem_1fr] sm:gap-6">
                <dt className="text-sm font-medium text-foreground">{term}</dt>
                <dd className="mt-1 text-sm leading-6 sm:mt-0">{detail}</dd>
              </div>
            ))}
          </dl>
        </Block>

        <Block id="output" title="Prompt output">
          <p>
            The reconstruction prompt is a natural-language document, structured for AI coding agents. It typically includes:
          </p>
          <ul className="mt-4 space-y-2">
            {[
              'Technology stack with version hints where available',
              'Project structure and file organization',
              'Architecture patterns and design decisions',
              'Component or module breakdown',
              'Styling approach and design system details',
              'Key features and functionality to implement',
              'Explicit limitations — what could not be determined',
            ].map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-6">
                <span
                  className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/60"
                  aria-hidden="true"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p>
            The prompt is designed to be copied as-is. You can also extend it with your own requirements before
            passing it to an AI agent.
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
            Generate a reconstruction prompt
          </Link>
          .
        </p>
      </div>

      <nav aria-label="On this page" className="sticky top-24 hidden h-fit lg:block">
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
