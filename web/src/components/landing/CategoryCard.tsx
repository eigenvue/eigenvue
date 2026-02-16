/**
 * CategoryCard — displays a single algorithm domain.
 *
 * Visual design:
 * - Dark surface background with category-colored top border (2px)
 * - Category icon in a muted-color circle
 * - Title, tagline, description
 * - Topic pills using category accent color
 * - Algorithm count badge
 * - "Coming Soon" overlay for unavailable categories (quantum in v1)
 * - On hover: subtle lift (translateY), enhanced shadow with category glow
 *
 * The card is an <article> for semantic correctness.
 * The entire card is wrapped in an anchor tag linking to the category page.
 */

"use client";

import { useRef } from "react";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { Badge } from "@/components/ui/Badge";
import type { CategoryDefinition, CategoryId } from "@/lib/constants";

interface CategoryCardProps {
  category: CategoryDefinition;
  animationDelay: number;
}

/**
 * Map category IDs to Tailwind shadow classes.
 * These must match the boxShadow tokens defined in tailwind.config.ts.
 */
const glowShadows: Record<CategoryId, string> = {
  classical: "hover:shadow-glow-classical",
  deeplearning: "hover:shadow-glow-deeplearning",
  genai: "hover:shadow-glow-genai",
  quantum: "hover:shadow-glow-quantum",
};

/**
 * Map category IDs to border-top color classes.
 * Using arbitrary values since these are dynamic per-category.
 */
const topBorderColors: Record<CategoryId, string> = {
  classical: "border-t-classical",
  deeplearning: "border-t-deeplearning",
  genai: "border-t-genai",
  quantum: "border-t-quantum",
};

export function CategoryCard({ category, animationDelay }: CategoryCardProps) {
  const ref = useRef<HTMLElement>(null);
  const isVisible = useIntersectionObserver(ref, { threshold: 0.15, triggerOnce: true });

  return (
    <article
      ref={ref}
      className={`
        relative flex flex-col overflow-hidden rounded-xl border border-border
        border-t-2 ${topBorderColors[category.id]}
        bg-background-surface
        transition-all duration-normal
        hover:-translate-y-1 ${glowShadows[category.id]}
        ${isVisible ? "animate-fade-in-up" : "opacity-0"}
      `}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {/* "Coming Soon" overlay for unavailable categories */}
      {!category.available && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background-page/70 backdrop-blur-sm">
          <Badge className="text-sm">Coming Soon</Badge>
        </div>
      )}

      <div className="flex flex-1 flex-col p-6">
        {/* Category name and tagline */}
        <h3 className="text-xl font-semibold text-text-primary">{category.name}</h3>
        <p className="mt-1 text-sm text-text-tertiary">{category.tagline}</p>
        <p className="mt-3 flex-1 text-sm text-text-secondary">{category.description}</p>

        {/* Topic pills */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {category.topics.map((topic) => (
            <Badge key={topic} category={category.id}>
              {topic}
            </Badge>
          ))}
        </div>

        {/* Algorithm count */}
        {category.available && (
          <div className="mt-4 text-xs text-text-tertiary">
            {category.algorithmCount} algorithm{category.algorithmCount !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </article>
  );
}
