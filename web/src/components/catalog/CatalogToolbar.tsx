/**
 * CatalogToolbar — Composes the search, difficulty filter, sort controls,
 * and result count into a single responsive toolbar row.
 *
 * LAYOUT:
 * Desktop:  [Search ...........]  [Difficulty chips]  [Sort ▾]  [X of Y]
 * Tablet:   [Search ...........]  [Sort ▾]
 *           [Difficulty chips]                         [X of Y]
 * Mobile:   [Search ...........]
 *           [Difficulty chips]
 *           [Sort ▾]  [X of Y]
 *
 * See Phase7_Implementation.md §13 — Component: CatalogToolbar.
 */

'use client';

import { type DifficultyLevel } from '@/shared/types/step';
import { type SortOption } from '@/lib/catalog-types';
import { SearchInput } from './SearchInput';
import { DifficultyFilter } from './DifficultyFilter';
import { SortSelector } from './SortSelector';

interface CatalogToolbarProps {
  /* Search */
  readonly searchValue: string;
  readonly onSearchChange: (value: string) => void;
  readonly onSearchClear: () => void;
  /* Difficulty */
  readonly activeDifficulties: ReadonlySet<DifficultyLevel>;
  readonly onDifficultyToggle: (level: DifficultyLevel) => void;
  readonly onDifficultyClear: () => void;
  /* Sort */
  readonly sortBy: SortOption;
  readonly onSortChange: (sort: SortOption) => void;
  /* Count */
  readonly resultCount: number;
  readonly totalCount: number;
}

export function CatalogToolbar({
  searchValue,
  onSearchChange,
  onSearchClear,
  activeDifficulties,
  onDifficultyToggle,
  onDifficultyClear,
  sortBy,
  onSortChange,
  resultCount,
  totalCount,
}: CatalogToolbarProps) {
  const isFiltered = resultCount !== totalCount;

  return (
    <div className="flex flex-col gap-4">
      {/* Row 1: Search + Sort */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <SearchInput
          value={searchValue}
          onChange={onSearchChange}
          onClear={onSearchClear}
        />
        <div className="flex items-center gap-3 ml-auto">
          <SortSelector value={sortBy} onChange={onSortChange} />
          <span
            className="text-xs text-text-tertiary whitespace-nowrap"
            aria-live="polite"
            aria-atomic="true"
          >
            {isFiltered ? (
              <>
                <span className="text-text-secondary font-medium">
                  {resultCount}
                </span>{' '}
                of {totalCount}
              </>
            ) : (
              <>
                <span className="text-text-secondary font-medium">
                  {totalCount}
                </span>{' '}
                algorithm{totalCount !== 1 ? 's' : ''}
              </>
            )}
          </span>
        </div>
      </div>

      {/* Row 2: Difficulty filter */}
      <DifficultyFilter
        activeDifficulties={activeDifficulties}
        onToggle={onDifficultyToggle}
        onClear={onDifficultyClear}
      />
    </div>
  );
}
