/**
 * useCatalogSearch — Debounced text search hook.
 *
 * Provides a controlled input value and a debounced query string.
 * The input value updates on every keystroke (for responsive UI).
 * The debounced value updates after SEARCH_DEBOUNCE_MS of inactivity.
 *
 * WHY separate values:
 * - `inputValue` drives the <input> element so typing feels instant.
 * - `debouncedQuery` drives the actual filtering so the grid doesn't
 *   re-render on every keystroke.
 *
 * This hook is intentionally minimal — it handles debounce timing only.
 * The actual string matching is done in useCatalogFilters.
 *
 * See Phase7_Implementation.md §7.1 — useCatalogSearch.
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { SEARCH_DEBOUNCE_MS } from '@/lib/catalog-constants';

interface UseCatalogSearchReturn {
  /** Current input field value — updates on every keystroke. */
  readonly inputValue: string;
  /** Debounced, trimmed, lowercased query — updates after debounce delay. */
  readonly debouncedQuery: string;
  /** Handler for the <input onChange> event. */
  readonly onSearchChange: (value: string) => void;
  /** Clears both the input and the debounced query immediately. */
  readonly clearSearch: () => void;
}

export function useCatalogSearch(
  /** Optional initial query (e.g., from URL params). */
  initialQuery: string = ''
): UseCatalogSearchReturn {
  const [inputValue, setInputValue] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(
    initialQuery.trim().toLowerCase()
  );
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * On input change: update the display value immediately,
   * then schedule a debounced update to the query value.
   */
  const onSearchChange = useCallback((value: string) => {
    setInputValue(value);

    // Clear any pending debounce timer.
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      setDebouncedQuery(value.trim().toLowerCase());
    }, SEARCH_DEBOUNCE_MS);
  }, []);

  /** Clear both values immediately, canceling any pending debounce. */
  const clearSearch = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }
    setInputValue('');
    setDebouncedQuery('');
  }, []);

  /** Cleanup: cancel any pending timer on unmount. */
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { inputValue, debouncedQuery, onSearchChange, clearSearch };
}
