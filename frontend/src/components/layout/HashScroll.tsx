import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Scroll to `#hash` targets after a client-side navigation.
 *
 * React Router does not restore hash position on its own, so navbar links like `/#reports`
 * from another route would otherwise land silently at the top of the page.
 */
export function HashScroll() {
  const { hash, pathname } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }

    // The landing sections are lazily rendered; retry briefly until the target exists.
    let frame = 0;
    let attempts = 0;

    const tryScroll = () => {
      const target = document.querySelector(hash);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      if (attempts++ < 20) frame = window.requestAnimationFrame(tryScroll);
    };

    frame = window.requestAnimationFrame(tryScroll);
    return () => window.cancelAnimationFrame(frame);
  }, [hash, pathname]);

  return null;
}
