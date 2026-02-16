/**
 * useIntersectionObserver — detects when an element enters the viewport.
 *
 * Used for scroll-triggered animations. Supports a `triggerOnce` option
 * that disconnects the observer after the first intersection, preventing
 * re-triggering on scroll-up.
 *
 * Returns a boolean: true when the element is (or has been) visible.
 */

"use client";

import { useState, useEffect, type RefObject } from "react";

interface ObserverOptions {
  /** Fraction of the element that must be visible (0-1). Default: 0.1 */
  threshold?: number;
  /** Root margin for early/late triggering. Default: "0px" */
  rootMargin?: string;
  /** If true, stays true after first trigger. Default: true */
  triggerOnce?: boolean;
}

export function useIntersectionObserver(
  ref: RefObject<Element | null>,
  options: ObserverOptions = {}
): boolean {
  const { threshold = 0.1, rootMargin = "0px", triggerOnce = true } = options;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [ref, threshold, rootMargin, triggerOnce]);

  return isVisible;
}
