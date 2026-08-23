import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

import { SupportHelper } from '@/components/landing/SupportHelper';
import { HashScroll } from '@/components/layout/HashScroll';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { cn } from '@/lib/utils';

/**
 * Global chrome.
 *
 * The landing route manages its own full-bleed sections, so the shell only constrains width
 * on the application routes. One header and one footer serve every route: a second navigation
 * language for "app" pages was the thing that made this feel like an internal dashboard.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const isLanding = location.pathname === '/';

  return (
    <div className="flex min-h-dvh flex-col">
      <HashScroll />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[70] focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:shadow-lg"
      >
        Skip to content
      </a>

      <SiteHeader />

      <main
        id="main"
        className={cn(
          'flex-1',
          // The landing route owns full-bleed sections and opts into section-aware scrolling;
          // application routes are constrained by the shared shell.
          isLanding ? 'landing-snap w-full' : 'section-shell py-10 sm:py-14',
        )}
      >
        {children}
      </main>

      <SiteFooter />
      <SupportHelper />
    </div>
  );
}
