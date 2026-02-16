/**
 * SectionWrapper — wraps each landing page section with:
 * - Consistent vertical padding
 * - Scroll-triggered fade-in animation via Intersection Observer
 * - Semantic <section> tag with optional aria-labelledby
 *
 * Every section on the landing page should use this wrapper
 * for visual consistency and animation behavior.
 */

"use client";

import { useRef } from "react";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";

interface SectionWrapperProps {
  children: React.ReactNode;
  className?: string;
  /** ID for the section, used for anchor links and aria-labelledby */
  id?: string;
  /** aria-labelledby value — should reference a heading ID within */
  ariaLabelledBy?: string;
}

export function SectionWrapper({
  children,
  className = "",
  id,
  ariaLabelledBy,
}: SectionWrapperProps) {
  const ref = useRef<HTMLElement>(null);
  const isVisible = useIntersectionObserver(ref, {
    threshold: 0.1,
    /** Once visible, stay visible — do not re-animate on scroll-up */
    triggerOnce: true,
  });

  return (
    <section
      ref={ref}
      id={id}
      aria-labelledby={ariaLabelledBy}
      className={`py-20 md:py-28 transition-opacity duration-slower ${
        isVisible ? "opacity-100" : "opacity-0"
      } ${className}`}
    >
      {children}
    </section>
  );
}
