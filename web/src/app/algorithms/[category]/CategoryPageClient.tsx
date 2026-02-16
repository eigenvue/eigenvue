/**
 * CategoryPageClient — Client component for category-specific catalog.
 *
 * Similar to CatalogPageClient but:
 * - Category is locked (no CategoryFilterBar).
 * - Header shows category-specific title and description.
 * - URL state only includes difficulty, search, and sort (no category param).
 *
 * See Phase7_Implementation.md §18 — Page: /algorithms/[category].
 */

'use client';

import { useEffect, useRef } from 'react';
import { type AlgorithmMeta } from '@/shared/types/step';
import { useCatalogFilters } from '@/hooks/useCatalogFilters';
import { useCatalogSearch } from '@/hooks/useCatalogSearch';
import { useCatalogUrlState } from '@/hooks/useCatalogUrlState';
import { type CategoryDisplayInfo } from '@/lib/catalog-constants';
import {
  CatalogHeader,
  CatalogToolbar,
  AlgorithmGrid,
  EmptyState,
} from '@/components/catalog';

interface CategoryPageClientProps {
  readonly algorithms: readonly AlgorithmMeta[];
  readonly categoryInfo: CategoryDisplayInfo;
}

export function CategoryPageClient({
  algorithms,
  categoryInfo,
}: CategoryPageClientProps) {
  // ── URL state ──
  const { initialState, syncToUrl } = useCatalogUrlState();

  // ── Search (debounced) ──
  const {
    inputValue: searchInputValue,
    debouncedQuery,
    onSearchChange,
    clearSearch,
  } = useCatalogSearch(initialState.searchQuery);

  // ── Filters + sort (category is fixed from props, not URL) ──
  const {
    state,
    results,
    resultCount,
    totalCount,
    toggleDifficulty,
    clearDifficulties,
    setSearchQuery,
    setSortBy,
    resetAll,
  } = useCatalogFilters(algorithms, {
    ...initialState,
    category: categoryInfo.id,
  });

  /** Sync debounced search → filter state */
  useEffect(() => {
    setSearchQuery(debouncedQuery);
  }, [debouncedQuery, setSearchQuery]);

  /** Sync filter state → URL */
  const prevStateRef = useRef(state);
  useEffect(() => {
    if (prevStateRef.current !== state) {
      prevStateRef.current = state;
      syncToUrl(state);
    }
  }, [state, syncToUrl]);

  function handleResetAll() {
    resetAll();
    clearSearch();
  }

  /**
   * If the category is marked as unavailable (e.g., quantum in v1),
   * show the empty-category state instead of an empty grid.
   */
  if (!categoryInfo.isAvailable) {
    return (
      <>
        <CatalogHeader
          category={categoryInfo}
          algorithmCount={0}
        />
        <EmptyState
          type="empty-category"
          categoryName={categoryInfo.label}
        />
      </>
    );
  }

  const isFiltered =
    state.difficulties.size > 0 ||
    state.searchQuery !== '' ||
    state.sortBy !== 'name-asc';

  return (
    <>
      <CatalogHeader
        category={categoryInfo}
        algorithmCount={totalCount}
      />

      <div className="mb-8">
        <CatalogToolbar
          searchValue={searchInputValue}
          onSearchChange={onSearchChange}
          onSearchClear={clearSearch}
          activeDifficulties={state.difficulties}
          onDifficultyToggle={toggleDifficulty}
          onDifficultyClear={clearDifficulties}
          sortBy={state.sortBy}
          onSortChange={setSortBy}
          resultCount={resultCount}
          totalCount={totalCount}
        />
      </div>

      <AlgorithmGrid
        algorithms={results}
        isFiltered={isFiltered}
        onClearFilters={handleResetAll}
      />
    </>
  );
}
