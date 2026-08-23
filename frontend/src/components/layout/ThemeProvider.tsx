import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { DEFAULT_THEME, applyTheme, type ThemePreference } from '@/lib/prefs/prefs';

interface ThemeContextValue {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  toggleTheme: () => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  setTheme: () => undefined,
  toggleTheme: () => undefined,
});

/**
 * Theme is the only cross-tree UI state, so it gets a small context rather than a state library.
 *
 * Every visit deliberately starts in the light theme and the choice is *not* persisted: the
 * product's default presentation is light, and a returning visitor should see it that way. Switching
 * to dark therefore lasts for the current page only. Making it sticky is a one-line change here if
 * that turns out to be the wrong call.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemePreference>(DEFAULT_THEME);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = useCallback(
    () => setTheme((current) => (current === 'dark' ? 'light' : 'dark')),
    [],
  );

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, toggleTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
