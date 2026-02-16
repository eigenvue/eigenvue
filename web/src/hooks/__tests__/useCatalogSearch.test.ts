/**
 * Tests for the useCatalogSearch debounced search hook.
 *
 * Tests cover:
 * - Initial state (default and custom initial query).
 * - Immediate inputValue updates on every change.
 * - Debounced query updates after SEARCH_DEBOUNCE_MS delay.
 * - Trimming and lowercasing of the debounced query.
 * - clearSearch resets both values and cancels pending timers.
 * - Timer cleanup on unmount (no leaked timers).
 *
 * Uses vi.useFakeTimers() for deterministic debounce testing.
 *
 * See Phase7_Implementation.md §25 — Testing Strategy.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCatalogSearch } from "@/hooks/useCatalogSearch";
import { SEARCH_DEBOUNCE_MS } from "@/lib/catalog-constants";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useCatalogSearch — initial state", () => {
  it("starts with empty values when no initial query provided", () => {
    const { result } = renderHook(() => useCatalogSearch());

    expect(result.current.inputValue).toBe("");
    expect(result.current.debouncedQuery).toBe("");
  });

  it("starts with provided initial query", () => {
    const { result } = renderHook(() => useCatalogSearch("Binary"));

    expect(result.current.inputValue).toBe("Binary");
    expect(result.current.debouncedQuery).toBe("binary");
  });

  it("trims and lowercases the initial query for debouncedQuery", () => {
    const { result } = renderHook(() => useCatalogSearch("  QuickSort  "));

    expect(result.current.inputValue).toBe("  QuickSort  ");
    expect(result.current.debouncedQuery).toBe("quicksort");
  });
});

describe("useCatalogSearch — onSearchChange", () => {
  it("updates inputValue immediately on change", () => {
    const { result } = renderHook(() => useCatalogSearch());

    act(() => {
      result.current.onSearchChange("Binary");
    });

    expect(result.current.inputValue).toBe("Binary");
    // Debounced value should NOT have updated yet.
    expect(result.current.debouncedQuery).toBe("");
  });

  it("updates debouncedQuery after debounce delay", () => {
    const { result } = renderHook(() => useCatalogSearch());

    act(() => {
      result.current.onSearchChange("Binary");
    });

    // Advance time by debounce delay.
    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    expect(result.current.debouncedQuery).toBe("binary");
  });

  it("trims and lowercases the debounced query", () => {
    const { result } = renderHook(() => useCatalogSearch());

    act(() => {
      result.current.onSearchChange("  MERGE Sort  ");
    });

    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    expect(result.current.debouncedQuery).toBe("merge sort");
  });

  it("does not update debouncedQuery before delay elapses", () => {
    const { result } = renderHook(() => useCatalogSearch());

    act(() => {
      result.current.onSearchChange("query");
    });

    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 1);
    });

    expect(result.current.debouncedQuery).toBe("");
  });

  it("resets debounce timer on rapid input changes", () => {
    const { result } = renderHook(() => useCatalogSearch());

    // Type "b", then "bi", then "bin" rapidly.
    act(() => {
      result.current.onSearchChange("b");
    });

    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 50);
    });

    act(() => {
      result.current.onSearchChange("bi");
    });

    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 50);
    });

    act(() => {
      result.current.onSearchChange("bin");
    });

    // At this point, no debounce should have fired yet.
    expect(result.current.debouncedQuery).toBe("");
    expect(result.current.inputValue).toBe("bin");

    // Now wait the full debounce from the last keystroke.
    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    expect(result.current.debouncedQuery).toBe("bin");
  });
});

describe("useCatalogSearch — clearSearch", () => {
  it("clears both inputValue and debouncedQuery immediately", () => {
    const { result } = renderHook(() => useCatalogSearch("initial"));

    act(() => {
      result.current.clearSearch();
    });

    expect(result.current.inputValue).toBe("");
    expect(result.current.debouncedQuery).toBe("");
  });

  it("cancels pending debounce timer on clear", () => {
    const { result } = renderHook(() => useCatalogSearch());

    // Type something, then clear before debounce fires.
    act(() => {
      result.current.onSearchChange("query");
    });

    act(() => {
      result.current.clearSearch();
    });

    // Advance past debounce — should remain empty.
    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS * 2);
    });

    expect(result.current.inputValue).toBe("");
    expect(result.current.debouncedQuery).toBe("");
  });
});

describe("useCatalogSearch — cleanup", () => {
  it("cancels pending timer on unmount", () => {
    const { result, unmount } = renderHook(() => useCatalogSearch());

    act(() => {
      result.current.onSearchChange("query");
    });

    // Unmount before debounce fires.
    unmount();

    // Advancing timers after unmount should not throw.
    expect(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS * 2);
    }).not.toThrow();
  });
});
