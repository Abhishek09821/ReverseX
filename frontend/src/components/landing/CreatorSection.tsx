import { ArrowUpRightIcon } from 'lucide-react';

import { CREATOR_LINKEDIN_URL, CREATOR_NAME } from '@/components/layout/nav-config';
import { Button } from '@/components/ui/button';

export function CreatorSection() {
  return (
    <section
      id="creator"
      aria-labelledby="creator-title"
      className="landing-divider landing-section landing-reveal scroll-mt-20"
    >
      <div className="section-shell">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-16">
          <div className="max-w-xl">
            <p className="text-xs font-medium tracking-[0.12em] text-primary uppercase">Creator</p>
            <h2
              id="creator-title"
              className="mt-3 text-[1.75rem] font-semibold tracking-[-0.025em] sm:text-4xl"
            >
              Built by {CREATOR_NAME}.
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">
              ReverseX is an independently built, developer-focused product grounded in one
              principle: technical intelligence should make its evidence and limits as visible as
              its conclusions.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" asChild>
              <a href={CREATOR_LINKEDIN_URL} target="_blank" rel="noreferrer">
                Connect on LinkedIn
                <ArrowUpRightIcon className="size-3.5" aria-hidden="true" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </Button>
            <Button asChild>
              <a href="#analyze">Analyze a Website</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
