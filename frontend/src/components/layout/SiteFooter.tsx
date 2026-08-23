/**
 * Site footer.
 *
 * Two compact columns on phones, four on desktop. No disclosure widgets: at this link count
 * a grid stays readable without hiding anything behind a tap.
 */
import { Link } from 'react-router-dom';

import { openSupportHelper } from '@/components/landing/support-events';
import { Brand } from '@/components/layout/Brand';
import { CREATOR_LINKEDIN_URL, CREATOR_NAME } from '@/components/layout/nav-config';

interface FooterGroup {
  title: string;
  links: { label: string; href: string; external?: boolean }[];
}

const GROUPS: FooterGroup[] = [
  {
    title: 'Navigation',
    links: [
      { label: 'Product', href: '/#product' },
      { label: 'How It Works', href: '/#how-it-works' },
      { label: 'Reports', href: '/#reports' },
      { label: 'FAQ', href: '/#faq' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Methodology', href: '/methodology' },
      { label: 'Limitations', href: '/methodology#limitations' },
      { label: 'Stored scans', href: '/history' },
    ],
  },
  {
    title: 'Creator',
    links: [
      { label: CREATOR_NAME, href: '/#creator' },
      { label: 'LinkedIn', href: CREATOR_LINKEDIN_URL, external: true },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/70">
      <div className="section-shell py-12 sm:py-16">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)] md:gap-12">
          <div className="max-w-xs">
            <Link to="/" className="inline-flex rounded-md" aria-label="ReverseX home">
              <Brand variant="full" />
            </Link>
            <p className="mt-5 text-sm leading-6 text-muted-foreground">
              Passive analysis of publicly reachable pages. Every conclusion carries its evidence,
              confidence and limits.
            </p>
            <button
              type="button"
              onClick={(event) => openSupportHelper(event.currentTarget)}
              className="mt-5 inline-flex items-center rounded-full border border-border px-4 py-2 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              Need help?
            </button>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:col-span-3 md:gap-12">
            {GROUPS.map((group) => (
              <nav key={group.title} aria-label={group.title}>
                <h2 className="text-[0.6875rem] font-medium tracking-[0.1em] text-muted-foreground uppercase">
                  {group.title}
                </h2>
                <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
                  {group.links.map((link) => (
                    <li key={`${link.label}-${link.href}`}>
                      {link.external ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noreferrer"
                          className="transition-colors hover:text-foreground"
                        >
                          {link.label}
                          <span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      ) : (
                        <Link to={link.href} className="transition-colors hover:text-foreground">
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} ReverseX</p>
          <p>Public evidence only. Private systems stay outside the report.</p>
        </div>
      </div>
    </footer>
  );
}
