/**
 * AlgorithmCard — Displays a single algorithm as a clickable card.
 *
 * ANATOMY:
 * ┌──────────────────────────────────────┐
 * │  [Category Badge]   [Difficulty Tag] │
 * │                                      │
 * │  Algorithm Name                      │
 * │                                      │
 * │  Short description text goes here    │
 * │  and may wrap to two lines.          │
 * │                                      │
 * │  Time: O(log n)    Space: O(1)       │
 * └──────────────────────────────────────┘
 *
 * INTERACTIONS:
 * - Entire card is a clickable <a> link to /algo/[id].
 * - Hover: card elevates (shadow + border glow in category color).
 * - Focus-visible: keyboard focus ring around the entire card.
 * - The card border subtly tints with the category accent color on hover.
 *
 * ACCESSIBILITY:
 * - The entire card is an <a> element (not a div with onClick).
 * - aria-label includes the algorithm name and category for screen readers.
 * - Complexity notation uses <abbr> with title for O() notation explanation.
 *
 * PERFORMANCE:
 * - This is a server component (no "use client") — it renders to static HTML.
 * - No state, no effects, no event handlers beyond the native <a> behavior.
 *
 * See Phase7_Implementation.md §8 — Component: AlgorithmCard.
 */

import Link from "next/link";
import { type AlgorithmMeta } from "@/shared/types/step";
import { Badge } from "@/components/ui/Badge";
import { CATEGORY_BY_ID, DIFFICULTY_BY_ID } from "@/lib/catalog-constants";

interface AlgorithmCardProps {
  readonly algorithm: AlgorithmMeta;
}

export function AlgorithmCard({ algorithm }: AlgorithmCardProps) {
  const categoryInfo = CATEGORY_BY_ID.get(algorithm.category);
  const difficultyInfo = DIFFICULTY_BY_ID.get(algorithm.complexity.level);

  /**
   * DEFENSIVE CHECK: categoryInfo and difficultyInfo should always be defined
   * because the algorithm-registry validates these values at load time.
   * If they're undefined, the card still renders — just without color styling.
   */
  if (!categoryInfo || !difficultyInfo) {
    console.warn(
      `[AlgorithmCard] Missing display info for category="${algorithm.category}" ` +
        `or difficulty="${algorithm.complexity.level}" on algorithm "${algorithm.id}".`,
    );
  }

  return (
    <Link
      href={`/algo/${algorithm.id}`}
      className={[
        /* ── Base card styling ── */
        "group block rounded-xl border p-5",
        "bg-background-surface border-border",
        /* ── Hover state ── */
        "hover:bg-background-elevated hover:border-border-hover",
        "hover:shadow-card-hover",
        /* ── Transition ── */
        "transition-all duration-normal",
        /* ── Focus state (keyboard navigation) ── */
        "focus-visible:outline-2 focus-visible:outline-offset-2",
        "focus-visible:outline-border-focus",
      ].join(" ")}
      aria-label={`${algorithm.name} — ${categoryInfo?.label ?? algorithm.category}, ${difficultyInfo?.label ?? algorithm.complexity.level} difficulty`}
    >
      {/* ── Row 1: Category badge + Difficulty tag ── */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <Badge category={categoryInfo?.badgeCategory ?? "default"}>
          {categoryInfo?.label ?? algorithm.category}
        </Badge>

        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-xs font-medium ${
            difficultyInfo?.colorClass ?? "text-text-tertiary"
          } ${difficultyInfo?.bgClass ?? "bg-background-elevated"}`}
        >
          {difficultyInfo?.label ?? algorithm.complexity.level}
        </span>
      </div>

      {/* ── Row 2: Algorithm name ── */}
      <h3 className="mb-2 text-lg font-semibold text-text-primary transition-colors duration-normal">
        {algorithm.name}
      </h3>

      {/* ── Row 3: Short description ── */}
      <p className="mb-4 text-sm leading-relaxed text-text-secondary line-clamp-2">
        {algorithm.description.short}
      </p>

      {/* ── Row 4: Complexity notation ── */}
      <div className="flex items-center gap-4 text-xs font-mono text-text-tertiary">
        <span>
          Time:{" "}
          <abbr
            title={`Time complexity: ${algorithm.complexity.time}`}
            className="no-underline text-text-secondary"
          >
            {algorithm.complexity.time}
          </abbr>
        </span>
        <span>
          Space:{" "}
          <abbr
            title={`Space complexity: ${algorithm.complexity.space}`}
            className="no-underline text-text-secondary"
          >
            {algorithm.complexity.space}
          </abbr>
        </span>
      </div>
    </Link>
  );
}
