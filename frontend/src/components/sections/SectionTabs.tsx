import { LayoutGridIcon, PaletteIcon, RadioTowerIcon, ShieldCheckIcon, CodeIcon } from 'lucide-react';

import { StatusDot } from '@/components/sections/StatusBadge';
import { sectionLabel } from '@/lib/format/labels';
import { sectionStatusLabel } from '@/lib/format/status';
import { cn } from '@/lib/utils';
import { SECTION_KEYS, type SectionKey, type SectionSet } from '@/types/analysis';

export type NavKey = 'overview' | SectionKey;

const ICONS: Record<NavKey, typeof CodeIcon> = {
  overview: LayoutGridIcon,
  design: PaletteIcon,
  technology: CodeIcon,
  security: ShieldCheckIcon,
  traffic: RadioTowerIcon,
};

/**
 * Report navigation as a sticky tab strip.
 *
 * Horizontal at every width: four reports plus an overview is a shape that reads better as tabs
 * than as a sidebar, and it means phone and desktop share one interaction instead of two layouts.
 * Status stays as a dot *and* text, so it is never encoded by colour alone.
 */
export function SectionTabs({
  sections,
  active,
  onSelect,
}: {
  sections: SectionSet;
  active: NavKey;
  onSelect: (key: NavKey) => void;
}) {
  return (
    <div className="sticky top-14 z-30 border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <nav aria-label="Report sections" className="section-shell">
        <ul className="scrollbar-thin -mb-px flex gap-1 overflow-x-auto">
          <Tab
            navKey="overview"
            label="Overview"
            active={active === 'overview'}
            onSelect={onSelect}
          />
          {SECTION_KEYS.map((key) => (
            <Tab
              key={key}
              navKey={key}
              label={sectionLabel(key)}
              count={sections[key].findings.length}
              status={sections[key].meta.status}
              active={active === key}
              onSelect={onSelect}
            />
          ))}
        </ul>
      </nav>
    </div>
  );
}

function Tab({
  navKey,
  label,
  count,
  status,
  active,
  onSelect,
}: {
  navKey: NavKey;
  label: string;
  count?: number;
  status?: SectionSet[SectionKey]['meta']['status'];
  active: boolean;
  onSelect: (key: NavKey) => void;
}) {
  const Icon = ICONS[navKey];
  return (
    <li className="shrink-0">
      <button
        type="button"
        onClick={() => onSelect(navKey)}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'group relative flex items-center gap-2 px-3 py-3.5 text-sm whitespace-nowrap transition-colors sm:px-4',
          active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        {status ? (
          <StatusDot status={status} />
        ) : (
          <Icon className="size-3.5 shrink-0" aria-hidden="true" />
        )}
        <span className="font-medium">{label}</span>
        {count !== undefined && count > 0 && (
          <span
            className={cn(
              'rounded-full px-1.5 py-0.5 font-mono text-[0.625rem] tabular-nums transition-colors',
              active ? 'bg-primary/12 text-primary' : 'bg-secondary text-muted-foreground',
            )}
          >
            {count}
          </span>
        )}
        {status && <span className="sr-only">{sectionStatusLabel(status)}</span>}
        <span
          className={cn(
            'absolute inset-x-2 bottom-0 h-0.5 rounded-full transition-all duration-300',
            active ? 'bg-primary opacity-100' : 'bg-transparent opacity-0',
          )}
          aria-hidden="true"
        />
      </button>
    </li>
  );
}
