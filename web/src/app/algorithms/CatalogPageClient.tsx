/**
 * CatalogPageClient — Client-side interactive catalog experience.
 *
 * This is the "brain" of the catalog page. It composes:
 * - CatalogHeader (page title)
 * - CategoryFilterBar (category tabs)
 * - CatalogToolbar (search + difficulty + sort + count)
 * - AlgorithmGrid (card grid + empty state)
 *
 * STATE MANAGEMENT:
 * - useCatalogUrlState() reads initial filter state from URL params.
 * - useCatalogSearch() handles debounced text search.
 * - useCatalogFilters() handles all filtering, sorting, and state mutations.
 * - URL is kept in sync: every filter change writes to the URL.
 *
 * DATA FLOW:
 * URL params → initialState → useCatalogFilters (state) → filter/sort → results → Grid
 *                                    ↕ (mutations)
 *                              syncToUrl(state) → URL params
 *
 * See Phase7_Implementation.md §17 — Page: /algorithms.
 */

"use client";

import { useEffect, useRef } from "react";
import { type AlgorithmMeta } from "@/shared/types/step";
import { useCatalogFilters } from "@/hooks/useCatalogFilters";
import { useCatalogSearch } from "@/hooks/useCatalogSearch";
import { useCatalogUrlState } from "@/hooks/useCatalogUrlState";
import {
  CatalogHeader,
  CategoryFilterBar,
  CatalogToolbar,
  AlgorithmGrid,
} from "@/components/catalog";

interface CatalogPageClientProps {
  readonly algorithms: readonly AlgorithmMeta[];
  readonly categoryCounts: Record<string, number>;
}

export function CatalogPageClient({ algorithms, categoryCounts }: CatalogPageClientProps) {
  // ── URL state ──
  const { initialState, syncToUrl } = useCatalogUrlState();

  // ── Search (debounced) ──
  const {
    inputValue: searchInputValue,
    debouncedQuery,
    onSearchChange,
    clearSearch,
  } = useCatalogSearch(initialState.searchQuery);

  // ── Filters + sort ──
  const {
    state,
    results,
    resultCount,
    totalCount,
    setCategory,
    toggleDifficulty,
    clearDifficulties,
    setSearchQuery,
    setSortBy,
    resetAll,
  } = useCatalogFilters(algorithms, initialState);

  /**
   * Sync debounced search query into the filter state.
   * This is the bridge between useCatalogSearch (debounce timing)
   * and useCatalogFilters (actual filter application).
   */
  useEffect(() => {
    setSearchQuery(debouncedQuery);
  }, [debouncedQuery, setSearchQuery]);

  /**
   * Sync filter state changes to the URL.
   *
   * IMPORTANT: Use a ref to track the previous state and only update
   * the URL when state actually changes. This prevents an infinite loop
   * where URL change → state change → URL change → ...
   */
  const prevStateRef = useRef(state);
  useEffect(() => {
    if (prevStateRef.current !== state) {
      prevStateRef.current = state;
      syncToUrl(state);
    }
  }, [state, syncToUrl]);

  /**
   * Convert the categoryCounts object to a Map for the CategoryFilterBar.
   */
  const categoryCountMap = new Map(Object.entries(categoryCounts));

  /**
   * Handle "reset all" — also clears the search input value.
   */
  function handleResetAll() {
    resetAll();
    clearSearch();
  }

  const isFiltered =
    state.category !== "all" ||
    state.difficulties.size > 0 ||
    state.searchQuery !== "" ||
    state.sortBy !== "name-asc";

  return (
    <>
      {/* Page header */}
      <CatalogHeader category={null} algorithmCount={totalCount} />

      {/* Category filter tabs */}
      <div className="mb-6">
        <CategoryFilterBar
          activeCategory={state.category}
          onCategoryChange={setCategory}
          categoryCounts={categoryCountMap}
        />
      </div>

      {/* Toolbar: search + difficulty + sort + count */}
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

      {/* Algorithm grid */}
      <AlgorithmGrid algorithms={results} isFiltered={isFiltered} onClearFilters={handleResetAll} />
    </>
  );
}
