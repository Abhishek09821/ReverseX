/**
 * UI preferences in localStorage.
 *
 * Strictly small, non-critical UI state. Analysis data never comes here: localStorage is
 * synchronous, size-limited, and writing megabytes to it would block the main thread. Reads are
 * defensive — a corrupt value resets to defaults rather than throwing during startup.
 */

/**
 * Storage key.
 *
 * Deliberately unchanged: it addresses preferences already written to real browsers, and renaming
 * it would silently discard every existing user's settings for no gain.
 */
export const PREFS_KEY = 'weblens.prefs.v1';

export type ThemePreference = 'light' | 'dark';
export type Density = 'comfortable' | 'compact';

export interface Prefs {
  density: Density;
  show_evidence_by_default: boolean;
  history_retention: number | null;
}

/** Every visit starts light; the theme is a per-visit choice, not a stored preference. */
export const DEFAULT_THEME: ThemePreference = 'light';

export const DEFAULT_PREFS: Prefs = {
  density: 'comfortable',
  show_evidence_by_default: false,
  history_retention: null,
};

const DENSITIES: Density[] = ['comfortable', 'compact'];

/**
 * Always reach storage through `window`.
 *
 * Recent Node versions expose a global `localStorage` of their own, which shadows the DOM one
 * under a test runner. Going through `window` guarantees we get the browser (or jsdom)
 * implementation.
 */
function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    // Access itself can throw when storage is blocked by policy.
    return null;
  }
}

export function loadPrefs(): Prefs {
  const store = storage();
  if (!store) return { ...DEFAULT_PREFS };
  try {
    const raw = store.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    return coerce(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(prefs: Prefs): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Storage may be full or blocked. Preferences are not worth surfacing an error for.
  }
}

export function updatePrefs(patch: Partial<Prefs>): Prefs {
  const next = { ...loadPrefs(), ...patch };
  savePrefs(next);
  return next;
}

/** Accept anything, return something valid. Unknown fields are dropped. */
function coerce(input: unknown): Prefs {
  if (!input || typeof input !== 'object') return { ...DEFAULT_PREFS };
  const raw = input as Record<string, unknown>;

  return {
    density: DENSITIES.includes(raw.density as Density)
      ? (raw.density as Density)
      : DEFAULT_PREFS.density,
    show_evidence_by_default:
      typeof raw.show_evidence_by_default === 'boolean'
        ? raw.show_evidence_by_default
        : DEFAULT_PREFS.show_evidence_by_default,
    history_retention:
      typeof raw.history_retention === 'number' && raw.history_retention > 0
        ? Math.floor(raw.history_retention)
        : null,
  };
}

/** Apply the theme to the document root. */
export function applyTheme(theme: ThemePreference): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
}
