/**
 * useCatalogUrlState — Bidirectional URL ↔ filter state synchronization.
 *
 * READS: On mount, parses URL query parameters into a CatalogFilterState.
 * WRITES: When the filter state changes, updates URL query parameters
 *         using Next.js router (shallow navigation — no page reload).
 *
 * URL PARAMETER SCHEMA:
 *   ?category=classical          → CategoryFilter
 *   &difficulty=beginner,advanced → Comma-separated DifficultyLevel values
 *   &q=binary                    → Search query text
 *   &sort=difficulty-asc         → SortOption
 *
 * DEFAULT BEHAVIOR: Parameters equal to their default values are OMITTED
 * from the URL to keep it clean. For example:
 *   /algorithms                          → all defaults
 *   /algorithms?category=classical       → only category differs from default
 *   /algorithms?q=sort&sort=name-desc    → search + sort differ from default
 *
 * STABILITY: URL updates use replaceState (not pushState) to avoid
 * polluting the browser history with every filter change. The user
 * presses Back to leave the catalog page, not to undo filter changes.
 *
 * See Phase7_Implementation.md §7.3 / §19 — URL State Synchronization.
 */

'use client';

import { useRef, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import {
  type CatalogFilterState,
  type CategoryFilter,
  type SortOption,
  DEFAULT_CATALOG_STATE,
} from '@/lib/catalog-types';
import { type DifficultyLevel } from '@/shared/types/step';

// ——————————————————————————————————————————————————
// URL PARSING (URL → State)
// ——————————————————————————————————————————————————

/** Valid category values (for URL param validation). */
const VALID_CATEGORIES = new Set([
  'all',
  'classical',
  'deep-learning',
  'generative-ai',
  'quantum',
]);

/** Valid difficulty values (for URL param validation). */
const VALID_DIFFICULTIES = new Set<DifficultyLevel>([
  'beginner',
  'intermediate',
  'advanced',
  'expert',
]);

/** Valid sort values (for URL param validation). */
const VALID_SORTS = new Set<SortOption>([
  'name-asc',
  'name-desc',
  'difficulty-asc',
  'difficulty-desc',
]);

/**
 * Parses URL search parameters into a CatalogFilterState.
 * Invalid parameter values are silently ignored — defaults are used instead.
 * This prevents malformed URLs from crashing the page.
 *
 * @param params — URLSearchParams from the current URL.
 * @returns A valid CatalogFilterState.
 */
export function parseUrlState(params: URLSearchParams): CatalogFilterState {
  // --- Category ---
  const categoryParam = params.get('category');
  const category: CategoryFilter =
    categoryParam && VALID_CATEGORIES.has(categoryParam)
      ? (categoryParam as CategoryFilter)
      : DEFAULT_CATALOG_STATE.category;

  // --- Difficulties ---
  const diffParam = params.get('difficulty');
  const difficulties = new Set<DifficultyLevel>();
  if (diffParam) {
    for (const part of diffParam.split(',')) {
      const trimmed = part.trim() as DifficultyLevel;
      if (VALID_DIFFICULTIES.has(trimmed)) {
        difficulties.add(trimmed);
      }
    }
  }

  // --- Search query ---
  const searchQuery = (params.get('q') ?? '').trim().toLowerCase();

  // --- Sort ---
  const sortParam = params.get('sort');
  const sortBy: SortOption =
    sortParam && VALID_SORTS.has(sortParam as SortOption)
      ? (sortParam as SortOption)
      : DEFAULT_CATALOG_STATE.sortBy;

  return { category, difficulties, searchQuery, sortBy };
}

// ——————————————————————————————————————————————————
// URL SERIALIZATION (State → URL)
// ——————————————————————————————————————————————————

/**
 * Serializes a CatalogFilterState into URL search parameters.
 * Omits parameters that match their default values.
 *
 * @param state — Current filter state.
 * @returns URLSearchParams string (e.g., "category=classical&q=sort").
 *          Returns empty string if all values are default.
 */
export function serializeUrlState(state: CatalogFilterState): string {
  const params = new URLSearchParams();

  if (state.category !== DEFAULT_CATALOG_STATE.category) {
    params.set('category', state.category);
  }

  if (state.difficulties.size > 0) {
    /**
     * Sort difficulty values for deterministic URL ordering.
     * Without this, Set iteration order could vary, producing
     * different URLs for the same state.
     */
    const sorted = Array.from(state.difficulties).sort();
    params.set('difficulty', sorted.join(','));
  }

  if (state.searchQuery !== '') {
    params.set('q', state.searchQuery);
  }

  if (state.sortBy !== DEFAULT_CATALOG_STATE.sortBy) {
    params.set('sort', state.sortBy);
  }

  return params.toString();
}

// ——————————————————————————————————————————————————
// REACT HOOK
// ——————————————————————————————————————————————————

/**
 * Hook that reads initial state from URL params and writes state changes
 * back to the URL.
 *
 * @returns initialState — The CatalogFilterState parsed from the current URL.
 * @returns syncToUrl — Callback to update the URL with the current state.
 */
export function useCatalogUrlState(): {
  initialState: CatalogFilterState;
  syncToUrl: (state: CatalogFilterState) => void;
} {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  /**
   * Parse URL on mount. useRef ensures this only computes once —
   * subsequent URL changes from our own writes don't re-trigger parsing.
   */
  const initialStateRef = useRef<CatalogFilterState>(
    parseUrlState(searchParams)
  );

  /**
   * Write state changes to URL. Uses router.replace with shallow: true
   * to avoid adding history entries for every filter toggle.
   */
  const syncToUrl = useCallback(
    (state: CatalogFilterState) => {
      const queryString = serializeUrlState(state);
      const url = queryString ? `${pathname}?${queryString}` : pathname;

      /**
       * Replace (not push) to avoid polluting browser history.
       * The { scroll: false } option prevents scrolling to top on update.
       */
      router.replace(url, { scroll: false });
    },
    [pathname, router]
  );

  return {
    initialState: initialStateRef.current,
    syncToUrl,
  };
}
