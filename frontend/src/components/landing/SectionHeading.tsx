import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  align = 'left',
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
  children?: ReactNode;
}) {
  return (
    <header className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center')}>
      <p className="text-xs font-medium tracking-[0.12em] text-primary uppercase">{eyebrow}</p>
      <h2
        id={id}
        className="mt-3 text-[1.75rem] leading-tight font-semibold tracking-[-0.025em] text-balance sm:text-4xl"
      >
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">
          {description}
        </p>
      )}
      {children}
    </header>
  );
}
