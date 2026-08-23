import { useEffect, useState } from 'react';

/** Ease-out cubic: fast start, settled finish. Reads as "counting up", not "loading". */
function easeOut(t: number): number {
  return 1 - (1 - t) ** 3;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/**
 * Animate a number from zero to `target` once on mount.
 *
 * `null` means "not animating", which is why the final value is derived rather than stored: with
 * reduced motion, or before the first frame, the real number is returned instead of a zero that
 * would briefly misreport a score.
 */
export function useCountUp(target: number, durationMs = 900): number {
  const [animated, setAnimated] = useState<number | null>(null);

  useEffect(() => {
    if (prefersReducedMotion() || target === 0) return;

    let frame = 0;
    let start: number | null = null;

    const tick = (now: number) => {
      start ??= now;
      const progress = Math.min(1, (now - start) / durationMs);
      // Written from the frame callback, never synchronously in the effect body.
      setAnimated(Math.round(target * easeOut(progress)));
      if (progress < 1) frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(frame);
      setAnimated(null);
    };
  }, [target, durationMs]);

  return animated ?? target;
}
