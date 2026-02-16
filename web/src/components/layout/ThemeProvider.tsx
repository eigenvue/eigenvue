/**
 * ThemeProvider — manages dark/light mode switching.
 *
 * Provides a React context with the current theme and a toggle function.
 * The theme is persisted in localStorage and respects system preference
 * (prefers-color-scheme) as the initial default.
 *
 * Theme is applied by toggling the `.light` class on <html>.
 * CSS custom properties in globals.css respond to this class.
 *
 * FOUC PREVENTION: An inline <script> in layout.tsx sets the initial class
 * before React hydration, so there is no flash of wrong theme.
 */

"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

const STORAGE_KEY = "theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  /**
   * On mount, read the actual state from the DOM (which was set by the
   * inline script in layout.tsx) to sync React state with reality.
   */
  useEffect(() => {
    const isLight = document.documentElement.classList.contains("light");
    setTheme(isLight ? "light" : "dark");
  }, []);

  /** Apply theme class to <html> whenever theme changes. */
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("light");
    } else {
      root.classList.remove("light");
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // localStorage may be unavailable (private browsing, etc.)
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
