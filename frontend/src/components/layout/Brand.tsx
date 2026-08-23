import { BRAND_NAME, BRAND_TAGLINE } from '@/components/layout/nav-config';
import { cn } from '@/lib/utils';

const MARK = { sm: 'h-6', md: 'h-7', lg: 'h-9' } as const;
const WORD = { sm: 'text-[1.0625rem]', md: 'text-lg', lg: 'text-2xl' } as const;

/**
 * Brand lockup: the supplied mark plus the wordmark.
 *
 * The artwork is black line art, so it is served with its white background keyed to alpha and
 * inverted for the dark theme with `dark:invert`. That keeps one asset serving both themes instead
 * of shipping a second, light-on-dark copy that could drift out of sync.
 */
export function Brand({
  size = 'md',
  variant = 'lockup',
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  /** `lockup` pairs the mark with type; `full` uses the supplied logo including its tagline. */
  variant?: 'lockup' | 'full';
  className?: string;
}) {
  if (variant === 'full') {
    return (
      <img
        src="/reversex-wordmark.png"
        alt={BRAND_NAME}
        width={720}
        height={151}
        className={cn('h-auto w-full max-w-[15rem] dark:invert', className)}
      />
    );
  }

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <img
        src="/reversex-mark.png"
        alt=""
        aria-hidden="true"
        width={192}
        height={187}
        className={cn(
          'w-auto shrink-0 transition-transform duration-300 group-hover/brand:scale-[1.06] dark:invert',
          MARK[size],
        )}
      />
      <span className="flex min-w-0 flex-col leading-none">
        <span className={cn('font-semibold tracking-[-0.025em]', WORD[size])}>
          <span className="text-foreground">Reverse</span>
          <span className="text-muted-foreground">X</span>
        </span>
        {size === 'lg' && (
          <span className="mt-2 text-[0.5625rem] tracking-[0.26em] text-muted-foreground uppercase">
            {BRAND_TAGLINE}
          </span>
        )}
      </span>
    </span>
  );
}
