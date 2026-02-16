/**
 * useCatalogFilters — Core filtering, sorting, and search logic.
 *
 * This hook is the engine of the catalog page. It takes:
 * - A complete list of AlgorithmMeta objects (the unfiltered catalog).
 * - A CatalogFilterState (current user selections).
 *
 * And returns:
 * - The filtered, sorted subset of algorithms to display.
 * - The count of results.
 * - Filter mutation functions (setCategory, toggleDifficulty, etc.).
 *
 * PURE COMPUTATION: The filtering and sorting logic is extracted into
 * pure functions (filterAlgorithms, sortAlgorithms) that are unit-testable
 * without React.
 *
 * MATHEMATICAL CORRECTNESS:
 * - Search matching is case-insensitive using String.prototype.toLowerCase().
 * - Sort comparisons use localeCompare for name ordering (handles Unicode).
 * - Difficulty sorting uses integer weights (0–3) with no floating-point math.
 * - All filter predicates are AND-combined: an algorithm must match ALL
 *   active filters to appear.
 *
 * See Phase7_Implementation.md §7.2 — useCatalogFilters.
 */

"use client";

import { useState, useMemo, useCallback } from "react";
import { type AlgorithmMeta, type DifficultyLevel } from "@/shared/types/step";
import {
  type CatalogFilterState,
  type CategoryFilter,
  type SortOption,
  DEFAULT_CATALOG_STATE,
  DIFFICULTY_WEIGHT,
} from "@/lib/catalog-types";

// ——————————————————————————————————————————————————
// PURE FUNCTIONS (no React dependency — fully unit-testable)
// ——————————————————————————————————————————————————

/**
 * Determines whether a single algorithm matches the text search query.
 *
 * SEARCH FIELDS (checked in order):
 * 1. name (display name, e.g., "Binary Search")
 * 2. description.short (e.g., "Efficient search in sorted arrays")
 * 3. id (e.g., "binary-search")
 * 4. seo.keywords (e.g., ["binary search", "sorted array", "log n"])
 *
 * MATCHING RULES:
 * - Case-insensitive (both query and fields are lowercased).
 * - Substring match: "sort" matches "QuickSort", "Bubble Sort", "Sorting".
 * - Matches against ANY field — a single match is sufficient.
 * - Empty query matches all algorithms.
 *
 * @param algo — The algorithm to test.
 * @param query — Lowercased, trimmed search query.
 * @returns true if the algorithm matches the query.
 */
export function matchesSearch(algo: AlgorithmMeta, query: string): boolean {
  if (query === "") return true;

  const nameLower = algo.name.toLowerCase();
  if (nameLower.includes(query)) return true;

  const shortDescLower = algo.description.short.toLowerCase();
  if (shortDescLower.includes(query)) return true;

  const idLower = algo.id.toLowerCase();
  if (idLower.includes(query)) return true;

  for (const keyword of algo.seo.keywords) {
    if (keyword.toLowerCase().includes(query)) return true;
  }

  return false;
}

/**
 * Filters the algorithm list by all active filter criteria.
 *
 * Filter combination logic: AND (all filters must match).
 *
 * @param algorithms — Complete, unfiltered algorithm list.
 * @param state — Current filter state.
 * @returns Filtered subset (preserves input order).
 */
export function filterAlgorithms(
  algorithms: readonly AlgorithmMeta[],
  state: CatalogFilterState,
): AlgorithmMeta[] {
  return algorithms.filter((algo) => {
    // --- Category filter ---
    if (state.category !== "all" && algo.category !== state.category) {
      return false;
    }

    // --- Difficulty filter (empty set = show all) ---
    if (state.difficulties.size > 0 && !state.difficulties.has(algo.complexity.level)) {
      return false;
    }

    // --- Text search ---
    if (!matchesSearch(algo, state.searchQuery)) {
      return false;
    }

    return true;
  });
}

/**
 * Sorts the algorithm list according to the selected sort option.
 *
 * STABILITY: JavaScript's Array.prototype.sort is guaranteed stable
 * in all modern engines (ES2019+). For tie-breaking in difficulty sorts,
 * we use name as a secondary key to ensure deterministic ordering.
 *
 * @param algorithms — List to sort (will NOT be mutated — returns new array).
 * @param sortBy — The selected sort option.
 * @returns New sorted array.
 */
export function sortAlgorithms(
  algorithms: readonly AlgorithmMeta[],
  sortBy: SortOption,
): AlgorithmMeta[] {
  const sorted = [...algorithms];

  switch (sortBy) {
    case "name-asc":
      sorted.sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
      break;

    case "name-desc":
      sorted.sort((a, b) => b.name.localeCompare(a.name, "en", { sensitivity: "base" }));
      break;

    case "difficulty-asc":
      sorted.sort((a, b) => {
        // INVARIANT: DIFFICULTY_WEIGHT values are integers 0–3, strictly ordered.
        const diff = DIFFICULTY_WEIGHT[a.complexity.level] - DIFFICULTY_WEIGHT[b.complexity.level];
        // Secondary sort: alphabetical by name for stable ordering.
        if (diff !== 0) return diff;
        return a.name.localeCompare(b.name, "en", { sensitivity: "base" });
      });
      break;

    case "difficulty-desc":
      sorted.sort((a, b) => {
        const diff = DIFFICULTY_WEIGHT[b.complexity.level] - DIFFICULTY_WEIGHT[a.complexity.level];
        if (diff !== 0) return diff;
        return a.name.localeCompare(b.name, "en", { sensitivity: "base" });
      });
      break;

    default: {
      /**
       * Exhaustiveness check: TypeScript will error here if a new
       * SortOption value is added without handling it in this switch.
       */
      const _exhaustive: never = sortBy;
      throw new Error(`Unhandled sort option: ${_exhaustive}`);
    }
  }

  return sorted;
}

// ——————————————————————————————————————————————————
// REACT HOOK
// ——————————————————————————————————————————————————

interface UseCatalogFiltersReturn {
  /** The current filter state. */
  readonly state: CatalogFilterState;
  /** Filtered AND sorted algorithms ready for rendering. */
  readonly results: readonly AlgorithmMeta[];
  /** Number of algorithms matching current filters. */
  readonly resultCount: number;
  /** Total number of algorithms (for "X of Y" display). */
  readonly totalCount: number;

  // --- Mutation functions ---
  readonly setCategory: (category: CategoryFilter) => void;
  readonly toggleDifficulty: (level: DifficultyLevel) => void;
  readonly clearDifficulties: () => void;
  readonly setSearchQuery: (query: string) => void;
  readonly setSortBy: (sort: SortOption) => void;
  readonly resetAll: () => void;
}

export function useCatalogFilters(
  algorithms: readonly AlgorithmMeta[],
  initialState: CatalogFilterState = DEFAULT_CATALOG_STATE,
): UseCatalogFiltersReturn {
  const [state, setState] = useState<CatalogFilterState>(initialState);

  /**
   * Memoize the filtered + sorted results.
   * Re-computes only when the algorithms list or filter state changes.
   *
   * The pipeline is:  filter → sort → freeze
   */
  const results = useMemo(() => {
    const filtered = filterAlgorithms(algorithms, state);
    const sorted = sortAlgorithms(filtered, state.sortBy);
    return sorted;
  }, [algorithms, state]);

  // --- Mutation functions ---

  const setCategory = useCallback((category: CategoryFilter) => {
    setState((prev) => ({ ...prev, category }));
  }, []);

  const toggleDifficulty = useCallback((level: DifficultyLevel) => {
    setState((prev) => {
      const next = new Set(prev.difficulties);
      if (next.has(level)) {
        next.delete(level);
      } else {
        next.add(level);
      }
      return { ...prev, difficulties: next };
    });
  }, []);

  const clearDifficulties = useCallback(() => {
    setState((prev) => ({
      ...prev,
      difficulties: new Set<DifficultyLevel>(),
    }));
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    setState((prev) => ({ ...prev, searchQuery: query }));
  }, []);

  const setSortBy = useCallback((sort: SortOption) => {
    setState((prev) => ({ ...prev, sortBy: sort }));
  }, []);

  const resetAll = useCallback(() => {
    setState(DEFAULT_CATALOG_STATE);
  }, []);

  return {
    state,
    results,
    resultCount: results.length,
    totalCount: algorithms.length,
    setCategory,
    toggleDifficulty,
    clearDifficulties,
    setSearchQuery,
    setSortBy,
    resetAll,
  };
}
