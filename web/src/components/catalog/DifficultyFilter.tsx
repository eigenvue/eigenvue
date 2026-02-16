/**
 * DifficultyFilter — Toggle chips for filtering by difficulty level.
 *
 * BEHAVIOR:
 * - Zero or more difficulty levels can be active (checkbox semantics).
 * - When no difficulties are selected, ALL are shown (no filter applied).
 * - Clicking an active chip deselects it. Clicking an inactive chip selects it.
 * - A "Clear" button appears when any difficulty is selected.
 *
 * ACCESSIBILITY:
 * - Uses role="group" with aria-label.
 * - Each chip is a <button> with aria-pressed.
 *
 * See Phase7_Implementation.md §10 — Component: DifficultyFilter.
 */

'use client';

import { type DifficultyLevel } from '@/shared/types/step';
import { DIFFICULTIES } from '@/lib/catalog-constants';

interface DifficultyFilterProps {
  readonly activeDifficulties: ReadonlySet<DifficultyLevel>;
  readonly onToggle: (level: DifficultyLevel) => void;
  readonly onClear: () => void;
}

export function DifficultyFilter({
  activeDifficulties,
  onToggle,
  onClear,
}: DifficultyFilterProps) {
  const hasSelection = activeDifficulties.size > 0;

  return (
    <div
      role="group"
      aria-label="Filter by difficulty level"
      className="flex flex-wrap items-center gap-2"
    >
      <span className="text-xs font-medium text-text-tertiary mr-1">
        Difficulty:
      </span>

      {DIFFICULTIES.map((diff) => {
        const isActive = activeDifficulties.has(diff.id);

        return (
          <button
            key={diff.id}
            aria-pressed={isActive}
            onClick={() => onToggle(diff.id)}
            className={[
              'rounded-full border px-3 py-1 text-xs font-medium',
              'transition-all duration-fast',
              isActive
                ? `${diff.colorClass} ${diff.bgClass} border-current/30`
                : 'text-text-tertiary bg-transparent border-border hover:border-border-hover hover:text-text-secondary',
            ].join(' ')}
          >
            {diff.label}
          </button>
        );
      })}

      {/* Clear button — only visible when a selection exists */}
      {hasSelection && (
        <button
          onClick={onClear}
          className="ml-1 text-xs text-text-tertiary hover:text-text-secondary transition-colors duration-fast"
          aria-label="Clear difficulty filter"
        >
          ✕ Clear
        </button>
      )}
    </div>
  );
}
