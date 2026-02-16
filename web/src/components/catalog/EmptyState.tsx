/**
 * EmptyState — Displayed when no algorithms match the current filters
 * or when a category has no algorithms yet.
 *
 * TWO MODES:
 *
 * 1. "no-results" — Active filters returned zero matches.
 *    Shows: "No algorithms found" + suggestion to clear filters.
 *    CTA: "Clear filters" button.
 *
 * 2. "empty-category" — A category exists but has no algorithms yet.
 *    Shows: "Coming Soon" message with category context.
 *    CTA: "Browse all algorithms" link.
 *
 * DESIGN: Centered vertically within the grid area, with a subtle
 * icon and muted text. Avoids looking like an error — empty states
 * should feel friendly and actionable.
 *
 * See Phase7_Implementation.md §15 — Component: EmptyState.
 */

import Link from "next/link";

interface EmptyStateProps {
  readonly type: "no-results" | "empty-category";
  readonly onClearFilters?: () => void;
  /** Category name for context in empty-category mode. */
  readonly categoryName?: string;
}

export function EmptyState({ type, onClearFilters, categoryName }: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center py-20 text-center"
      role="status"
      aria-live="polite"
    >
      {/* Icon */}
      <div className="mb-4 rounded-full bg-background-elevated p-4">
        <svg
          className="h-8 w-8 text-text-tertiary"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          {type === "no-results" ? (
            /* Search-not-found icon */
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6"
            />
          ) : (
            /* Clock / coming-soon icon */
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          )}
        </svg>
      </div>

      {/* Title */}
      <h3 className="mb-2 text-lg font-semibold text-text-primary">
        {type === "no-results"
          ? "No algorithms found"
          : `${categoryName ?? "This category"} — Coming Soon`}
      </h3>

      {/* Description */}
      <p className="mb-6 max-w-sm text-sm text-text-secondary">
        {type === "no-results"
          ? "Try adjusting your search or filters to find what you're looking for."
          : "We're working on adding algorithms to this category. Check back soon, or explore other categories in the meantime."}
      </p>

      {/* CTA */}
      {type === "no-results" && onClearFilters ? (
        <button
          onClick={onClearFilters}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:border-border-hover transition-all duration-normal"
        >
          Clear all filters
        </button>
      ) : (
        <Link
          href="/algorithms"
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:border-border-hover transition-all duration-normal"
        >
          Browse all algorithms
        </Link>
      )}
    </div>
  );
}
