/**
 * useMediaQuery — hook for responsive JS-side breakpoint detection.
 *
 * Takes a CSS media query string and returns true if it matches.
 * Updates when the window resizes or the match status changes.
 *
 * Example:
 *   const isMobile = useMediaQuery("(max-width: 768px)");
 */

"use client";

import { useState, useEffect } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [query]);

  return matches;
}
