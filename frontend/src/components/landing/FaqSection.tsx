import { ChevronDownIcon } from 'lucide-react';

import { SectionHeading } from './SectionHeading';

const FAQS = [
  {
    question: 'What does ReverseX do?',
    answer: 'ReverseX analyzes websites and GitHub repositories to generate a single comprehensive reconstruction prompt. This prompt tells an AI coding agent exactly how to rebuild the analyzed project, including architecture, technologies, design patterns, and key features.',
  },
  {
    question: 'What can ReverseX analyze?',
    answer: 'ReverseX can analyze public website URLs (one page at a time) and GitHub repositories (public repos only). For websites, it examines DOM, CSS, JavaScript, network requests, and visual design. For GitHub repos, it analyzes the file structure, dependencies, README, and code organization.',
  },
  {
    question: 'Can ReverseX see private repositories or backend code?',
    answer: 'No. ReverseX can only analyze public GitHub repositories and publicly accessible websites. It cannot access private repos, authenticated systems, backend code, or internal APIs. The reconstruction prompt describes only what can be observed from public evidence.',
  },
  {
    question: 'How accurate are the reconstruction prompts?',
    answer: 'Each prompt includes a confidence score that reflects the quality of available evidence. GitHub repositories typically have higher confidence since more information is available. Website analysis is limited to observable frontend code and behavior. All prompts include limitations that clarify what could not be determined.',
  },
  {
    question: 'What technologies can ReverseX detect?',
    answer: 'ReverseX can detect React, Vue, Next.js, Angular, Svelte, and other frameworks when signatures are present. For GitHub repos, it detects technologies from package.json, requirements.txt, go.mod, and other dependency files. It identifies build tools, UI libraries, and backend frameworks when evidence supports the conclusion.',
  },
  {
    question: 'Can I use the prompt with AI coding agents?',
    answer: 'Yes, that\'s exactly what it\'s designed for. Copy the generated prompt and paste it into any AI coding agent (Claude, GPT-4, etc.) to have it rebuild a similar project. The prompt includes all necessary context about architecture, tech stack, design patterns, and implementation details.',
  },
  {
    question: 'What\'s the difference between website and GitHub analysis?',
    answer: 'Website analysis examines one public page: DOM structure, styles, scripts, network requests, and visual design. GitHub analysis examines the entire repository: file structure, code organization, dependencies, documentation, and detected patterns. GitHub typically provides more complete information for reconstruction.',
  },
  {
    question: 'Why might a prompt be incomplete?',
    answer: 'Prompts may be incomplete when: websites use server-side rendering that hides structure, repositories lack documentation, private dependencies are used, or implementation details aren\'t publicly observable. All limitations are listed explicitly in the output so you know what\'s missing.',
  },
  {
    question: 'Does ReverseX store my data?',
    answer: 'Results are stored only in your browser\'s local storage. The backend processes the analysis but doesn\'t permanently store results. You can delete your local analysis history at any time from the History page.',
  },
  {
    question: 'Can ReverseX analyze the same site multiple times?',
    answer: 'Yes. Each analysis captures the state at that specific moment. Websites change over time, and multiple analyses can track how a site evolves. Each reconstruction is saved separately in your local history.',
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
            title="Clear answers before you start."
            description="What ReverseX can analyze, how reconstruction prompts work, and what to expect from the output."
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
