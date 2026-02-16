/**
 * useReducedMotion — detects the user's motion preference.
 *
 * Returns true if the user has enabled "prefers-reduced-motion: reduce".
 * Used by the Starfield canvas and any other JS-driven animations
 * to skip or simplify animation when the user prefers reduced motion.
 *
 * The CSS @media rule in globals.css handles CSS animations.
 * This hook handles JavaScript-driven animations (Canvas, RAF loops).
 */

"use client";

import { useState, useEffect } from "react";

export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return prefersReducedMotion;
}
