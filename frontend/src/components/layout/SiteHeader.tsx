/**
 * Site header.
 *
 * A restrained sticky bar with hover-revealed mega-menu panels on pointer devices and a
 * disclosure drawer on small screens. Hover is a convenience only: every panel is also
 * reachable by keyboard, because a nav that needs a mouse is a broken nav.
 */
import {
  ChevronDownIcon,
  CircleAlertIcon,
  HistoryIcon,
  MenuIcon,
  MoonIcon,
  SunIcon,
  XIcon,
} from 'lucide-react';
import { useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';

import { Brand } from '@/components/layout/Brand';
import { ThemeContext } from '@/components/layout/ThemeProvider';
import { NAV_GROUPS, type NavLinkItem } from '@/components/layout/nav-config';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { isPersistent } from '@/lib/db/repository';
import { cn } from '@/lib/utils';

/** Delay before a hover-out closes the panel, so diagonal cursor paths do not flicker. */
const CLOSE_DELAY_MS = 160;

/**
 * Hover dwell required before a panel opens.
 *
 * Without it, a cursor merely crossing the bar on its way elsewhere yanks a panel open. The delay
 * only applies to the first open: once a panel is showing, moving between triggers is instant, so
 * browsing the nav still feels immediate.
 */
const OPEN_DELAY_MS = 500;

/**
 * True only for pointers that genuinely hover.
 *
 * Touch and pen taps synthesise `mouseenter` immediately before `click`. Without this guard the
 * hover handler would open the panel and the click would toggle it straight back shut, so a tap
 * could never open the menu at all.
 */
function pointerCanHover(): boolean {
  return window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false;
}

export function SiteHeader() {
  const location = useLocation();
  const persistent = isPersistent();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(
    () => typeof window !== 'undefined' && window.scrollY > 8,
  );
  const closeTimer = useRef<number | null>(null);
  const openTimer = useRef<number | null>(null);
  const headerRef = useRef<HTMLElement>(null);

  // A navigation must not leave a panel or drawer hanging open, including on back/forward.
  // Adjusted during render rather than in an effect so there is no extra paint with stale UI.
  const locationKey = `${location.pathname}${location.hash}`;
  const [lastLocationKey, setLastLocationKey] = useState(locationKey);
  if (lastLocationKey !== locationKey) {
    setLastLocationKey(locationKey);
    setOpenGroup(null);
    setDrawerOpen(false);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!openGroup && !drawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpenGroup(null);
      setDrawerOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (headerRef.current?.contains(event.target as Node)) return;
      setOpenGroup(null);
      setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [openGroup, drawerOpen]);

  useEffect(
    () => () => {
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
      if (openTimer.current !== null) window.clearTimeout(openTimer.current);
    },
    [],
  );

  const cancelClose = () => {
    if (closeTimer.current === null) return;
    window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };

  const cancelOpen = () => {
    if (openTimer.current === null) return;
    window.clearTimeout(openTimer.current);
    openTimer.current = null;
  };

  const scheduleClose = () => {
    cancelClose();
    cancelOpen();
    closeTimer.current = window.setTimeout(() => setOpenGroup(null), CLOSE_DELAY_MS);
  };

  /** Instant while a panel is already showing; otherwise it waits for deliberate dwell. */
  const requestOpen = (groupId: string) => {
    cancelClose();
    cancelOpen();
    if (openGroup !== null) {
      setOpenGroup(groupId);
      return;
    }
    openTimer.current = window.setTimeout(() => setOpenGroup(groupId), OPEN_DELAY_MS);
  };

  const activeGroup = NAV_GROUPS.find((group) => group.id === openGroup) ?? null;

  return (
    <header
      ref={headerRef}
      className={cn(
        'sticky top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300',
        activeGroup
          ? 'border-b border-border/60 bg-background'
          : scrolled
            ? 'border-b border-border/70 bg-background/80 backdrop-blur-xl'
            : 'border-b border-transparent bg-background/55 backdrop-blur-md',
      )}
      onMouseLeave={scheduleClose}
    >
      <div className="section-shell flex h-14 items-center gap-2">
        <Link
          to="/"
          className="group/brand flex shrink-0 items-center rounded-md"
          aria-label="ReverseX home"
          onMouseEnter={() => {
            if (pointerCanHover() && openGroup) {
              cancelClose();
              setOpenGroup(null);
            }
          }}
        >
          <Brand size="sm" />
        </Link>

        <nav aria-label="Main" className="ml-4 hidden min-w-0 flex-1 items-center lg:flex">
          {NAV_GROUPS.map((group) => {
            const isOpen = openGroup === group.id;
            return (
              <button
                key={group.id}
                type="button"
                aria-expanded={isOpen}
                aria-controls={`nav-panel-${group.id}`}
                onMouseEnter={() => {
                  if (!pointerCanHover()) return;
                  requestOpen(group.id);
                }}
                onMouseLeave={cancelOpen}
                onClick={() => {
                  cancelOpen();
                  setOpenGroup(isOpen ? null : group.id);
                }}
                className={cn(
                  'inline-flex items-center gap-1 rounded-md px-3 py-2 text-[0.8125rem] transition-colors',
                  isOpen ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {group.label}
                <ChevronDownIcon
                  className={cn(
                    'size-3 transition-transform duration-200',
                    isOpen && 'rotate-180',
                  )}
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          {!persistent && (
            <Badge variant="attention" className="mr-1 hidden xl:inline-flex">
              <CircleAlertIcon className="size-3" aria-hidden="true" />
              Session-only storage
            </Badge>
          )}

          <Button variant="ghost" size="sm" asChild className="hidden gap-1.5 sm:inline-flex">
            <Link to="/history" aria-label="Stored scans">
              <HistoryIcon className="size-3.5" />
              <span className="text-xs">History</span>
            </Link>
          </Button>

          <ThemeToggle />

          <Button size="sm" asChild className="ml-1 hidden h-8 rounded-full px-4 text-xs sm:inline-flex">
            <Link to="/#analyze">Analyze</Link>
          </Button>

          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="lg:hidden"
            aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={drawerOpen}
            aria-controls="mobile-nav"
            onClick={() => setDrawerOpen((open) => !open)}
          >
            {drawerOpen ? <XIcon className="size-5" /> : <MenuIcon className="size-5" />}
          </Button>
        </div>
      </div>

      {/* Desktop mega-menu */}
      {NAV_GROUPS.map((group) => (
        <div
          key={group.id}
          id={`nav-panel-${group.id}`}
          hidden={openGroup !== group.id}
          onMouseEnter={cancelClose}
          className="nav-panel absolute inset-x-0 top-full hidden border-b border-border/60 bg-background shadow-lg shadow-foreground/5 lg:block"
        >
          <div className="section-shell grid gap-10 py-9 md:grid-cols-[repeat(auto-fit,minmax(13rem,1fr))]">
            {group.columns.map((column) => (
              <div key={column.title}>
                <p className="text-[0.6875rem] tracking-wide text-muted-foreground">
                  {column.title}
                </p>
                <ul className="mt-4 space-y-3.5">
                  {column.links.map((link) => (
                    <li key={`${link.label}-${link.href}`}>
                      <PanelLink link={link} onNavigate={() => setOpenGroup(null)} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/*
       * Background scrim.
       *
       * Portalled to `body` on purpose: the header sets `z-50`, which makes it a stacking
       * context, and `backdrop-filter` only blurs what is painted behind the element *within*
       * that context. Nested inside the header it would have had nothing to blur.
       */}
      {openGroup &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="nav-scrim fixed inset-x-0 bottom-0 top-14 z-40 bg-background/25 backdrop-blur-[3px]"
            aria-hidden="true"
            onMouseEnter={() => setOpenGroup(null)}
            onClick={() => setOpenGroup(null)}
          />,
          document.body,
        )}

      {/* Mobile drawer */}
      {drawerOpen && (
        <div
          id="mobile-nav"
          className="max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-t border-border/60 bg-background lg:hidden"
        >
          <nav aria-label="Mobile" className="section-shell py-4">
            <ul className="divide-y divide-border/70">
              {NAV_GROUPS.map((group) => (
                <li key={group.id} className="py-1">
                  <details className="group">
                    <summary className="flex cursor-pointer list-none items-center justify-between py-3 text-[0.9375rem] font-medium marker:hidden">
                      {group.label}
                      <ChevronDownIcon
                        className="size-4 text-muted-foreground transition-transform group-open:rotate-180"
                        aria-hidden="true"
                      />
                    </summary>
                    <ul className="pb-3 pl-1">
                      {group.columns.flatMap((column) => column.links).map((link) => (
                        <li key={`${link.label}-${link.href}`}>
                          <PanelLink
                            link={link}
                            compact
                            onNavigate={() => setDrawerOpen(false)}
                          />
                        </li>
                      ))}
                    </ul>
                  </details>
                </li>
              ))}
              <li className="py-3">
                <Link
                  to="/history"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-2 text-[0.9375rem] font-medium"
                >
                  <HistoryIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                  Stored scans
                </Link>
              </li>
            </ul>

            <Button asChild className="mt-5 h-11 w-full rounded-full">
              <Link to="/#analyze" onClick={() => setDrawerOpen(false)}>
                Analyze a Website
              </Link>
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}

function PanelLink({
  link,
  compact = false,
  onNavigate,
}: {
  link: NavLinkItem;
  compact?: boolean;
  onNavigate: () => void;
}) {
  const label = (
    <>
      <span className={cn('block', compact ? 'text-sm' : 'text-[0.9375rem] font-medium')}>
        {link.label}
        {link.external && <span className="sr-only"> (opens in a new tab)</span>}
      </span>
      {link.detail && !compact && (
        <span className="mt-0.5 block text-xs text-muted-foreground">{link.detail}</span>
      )}
    </>
  );

  const className = cn(
    'block rounded-md transition-colors hover:text-primary',
    compact ? 'py-2 text-muted-foreground' : 'text-foreground/90',
  );

  if (link.external) {
    return (
      <a href={link.href} target="_blank" rel="noreferrer" className={className} onClick={onNavigate}>
        {label}
      </a>
    );
  }

  return (
    <Link to={link.href} className={className} onClick={onNavigate}>
      {label}
    </Link>
  );
}

/**
 * Two states only, so this is a button rather than a menu.
 *
 * A menu for a binary choice costs an extra click and an extra surface for no benefit.
 */
function ThemeToggle() {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const Icon = theme === 'dark' ? SunIcon : MoonIcon;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      <Icon className="size-4" />
    </Button>
  );
}
