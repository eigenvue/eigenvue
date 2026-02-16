/**
 * AlgorithmGrid — Responsive grid layout for AlgorithmCard components.
 *
 * GRID COLUMNS:
 * - Mobile (< 640px):  1 column
 * - Tablet (640–1023px): 2 columns
 * - Desktop (>= 1024px):  3 columns
 *
 * When the grid is empty (no algorithms match filters), renders the
 * EmptyState component instead.
 *
 * ANIMATION: Cards fade in with a staggered delay when the grid first
 * renders or when filter results change. This uses CSS animation-delay
 * computed per card index, capped at 12 cards to prevent long waits.
 *
 * See Phase7_Implementation.md §14 — Component: AlgorithmGrid.
 */

import { type AlgorithmMeta } from '@/shared/types/step';
import { AlgorithmCard } from './AlgorithmCard';
import { EmptyState } from './EmptyState';

interface AlgorithmGridProps {
  readonly algorithms: readonly AlgorithmMeta[];
  /** Pass true when active filters are in use (affects empty state messaging). */
  readonly isFiltered: boolean;
  /** Called when the user clicks "Clear filters" in the empty state. */
  readonly onClearFilters: () => void;
}

/**
 * Maximum number of cards that receive a stagger delay.
 * Cards beyond this index animate at the same time to prevent
 * the last cards from appearing many seconds after the first.
 */
const MAX_STAGGER_COUNT = 12;

/**
 * Stagger delay per card in milliseconds.
 * Total animation time for MAX_STAGGER_COUNT cards:
 *   12 × 50ms = 600ms — fast enough to feel snappy, slow enough to be visible.
 */
const STAGGER_DELAY_MS = 50;

export function AlgorithmGrid({
  algorithms,
  isFiltered,
  onClearFilters,
}: AlgorithmGridProps) {
  if (algorithms.length === 0) {
    return (
      <EmptyState
        type={isFiltered ? 'no-results' : 'empty-category'}
        onClearFilters={onClearFilters}
      />
    );
  }

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      role="list"
      aria-label="Algorithm cards"
    >
      {algorithms.map((algo, index) => (
        <div
          key={algo.id}
          role="listitem"
          className="animate-fade-in-up"
          style={{
            /**
             * Stagger delay: card N appears N×50ms after the first.
             * Clamped to MAX_STAGGER_COUNT to prevent excessive delays.
             *
             * MATHEMATICAL NOTE:
             * delay = min(index, MAX_STAGGER_COUNT) × STAGGER_DELAY_MS
             * For index=0: delay=0ms (immediate)
             * For index=5: delay=250ms
             * For index=12: delay=600ms
             * For index=20: delay=600ms (clamped)
             */
            animationDelay: `${
              Math.min(index, MAX_STAGGER_COUNT) * STAGGER_DELAY_MS
            }ms`,
            animationFillMode: 'backwards',
          }}
        >
          <AlgorithmCard algorithm={algo} />
        </div>
      ))}
    </div>
  );
}
