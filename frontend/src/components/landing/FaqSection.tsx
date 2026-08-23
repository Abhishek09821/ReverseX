import { ChevronDownIcon } from 'lucide-react';

import { SectionHeading } from './SectionHeading';

const FAQS = [
  {
    question: 'What does ReverseX analyze?',
    answer: 'ReverseX analyzes one publicly reachable URL at a specific moment. It examines the public response, rendered browser evidence, technical fingerprints, TLS, headers, cookies, public research signals, and other observable evidence to produce Design, Tech Stack, Security, and Traffic reports. It does not assume that one page represents an entire domain.',
  },
  {
    question: 'Can ReverseX see a private backend?',
    answer: 'No. ReverseX cannot access private backend code, repositories, internal services, authenticated systems, unpublished APIs, or infrastructure that exposes no public signal. It reports only observable public evidence and clearly marks what is not publicly determinable.',
  },
  {
    question: 'How does AI Intelligence work?',
    answer: 'Normal evidence comes first. When that evidence is insufficient and the feature is available, the user can choose Run AI Intelligence. ReverseX then researches public sources and disclosed technical information, correlates them with collected signals, considers competing hypotheses, and returns a labeled verdict with confidence, evidence, sources, and limitations. AI assists reasoning; it is not the source of truth.',
  },
  {
    question: 'Can ReverseX detect React, Next.js, or Vue?',
    answer: 'It can identify React, Next.js, Vue, and other technologies when observable signatures support the conclusion. Sites can remove, mask, or share signatures, so ReverseX reports an evidence-based verdict rather than guaranteeing detection. An expected signature that is absent is reported as not detected, not proof of non-use.',
  },
  {
    question: 'Can ReverseX identify a website’s database?',
    answer: 'Usually not. A database is private backend infrastructure and cannot reasonably be established from outside unless a public endpoint, technical disclosure, error, or other credible public signal reveals it. Without that evidence, the verdict is not publicly determinable; ReverseX does not guess.',
  },
  {
    question: 'Is ReverseX a hacking or penetration-testing tool?',
    answer: 'No. ReverseX performs passive, non-offensive analysis of publicly reachable pages. It does not exploit vulnerabilities, bypass authentication, defeat access controls, or replace an authorized penetration test, vulnerability assessment, or compliance audit.',
  },
  {
    question: 'Can I give ReverseX reports to an AI coding agent?',
    answer: 'Yes. A report can give an AI coding agent structured context about observed design, technology, security, and public traffic signals, including evidence and limitations. This can improve implementation prompts, but the report does not grant the agent private source access or prove hidden implementation details.',
  },
  {
    question: 'Why can AI-assisted conclusions be wrong?',
    answer: 'Public information can be incomplete, outdated, ambiguous, or contradictory, and an AI model can misinterpret it. ReverseX reduces that risk by keeping observed evidence separate, showing sources and confidence, considering competing hypotheses, and preserving uncertainty in the verdict. Important conclusions should still be independently verified.',
  },
  {
    question: 'Is a full-site crawl required?',
    answer: 'No. ReverseX can analyze one public URL without crawling the whole site. The resulting evidence applies to the collected page and moment; it does not claim complete site-wide coverage. Additional pages can be analyzed separately when broader public evidence is needed.',
  },
  {
    question: 'Is AI always required?',
    answer: 'No. Browser evidence and deterministic technical fingerprinting come first and can produce reports without AI. AI Intelligence is an optional, user-initiated investigation only when evidence is insufficient and the capability is available. Its conclusions remain labeled and do not replace direct evidence.',
  },
] as const;

export function FaqSection() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="landing-divider landing-section landing-reveal scroll-mt-20"
    >
      <div className="section-shell">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <SectionHeading
            id="faq-title"
            eyebrow="FAQ"
            title="Clear answers before you scan."
            description="What outside observation, public research, and optional AI-assisted reasoning can — and cannot — establish."
          />
          <div className="min-w-0 divide-y divide-border border-t border-border">
            {FAQS.map(({ question, answer }, index) => (
              <details key={question} className="group" open={index === 0}>
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 py-4 text-sm font-medium marker:hidden">
                  <span className="min-w-0">{question}</span>
                  <ChevronDownIcon
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <p className="pb-5 text-sm leading-7 text-muted-foreground">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
