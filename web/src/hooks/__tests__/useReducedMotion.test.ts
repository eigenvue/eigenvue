/**
 * @fileoverview useReducedMotion — unit tests.
 *
 * Verifies the hook reflects the OS "prefers-reduced-motion" setting and
 * reacts to live changes. This hook is what makes the algorithm visualizer and
 * the editor disable the canvas animation for motion-sensitive users.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { useReducedMotion } from "../useReducedMotion";

const originalMatchMedia = window.matchMedia;

afterEach(() => {
  window.matchMedia = originalMatchMedia;
  vi.restoreAllMocks();
});

/** Installs a controllable matchMedia mock and returns the query-list stub. */
function installMatchMedia(initialMatches: boolean) {
  const mql = {
    matches: initialMatches,
    media: "(prefers-reduced-motion: reduce)",
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  };
  window.matchMedia = vi.fn(() => mql) as unknown as typeof window.matchMedia;
  return mql;
}

type ChangeListener = (event: MediaQueryListEvent) => void;

describe("useReducedMotion", () => {
  it("returns false when the user has no reduced-motion preference", () => {
    installMatchMedia(false);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it("returns true when the user prefers reduced motion", () => {
    installMatchMedia(true);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });

  it("reacts to live changes in the preference", () => {
    const mql = installMatchMedia(false);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);

    const handler = mql.addEventListener.mock.calls[0]?.[1] as ChangeListener;
    act(() => handler({ matches: true } as MediaQueryListEvent));
    expect(result.current).toBe(true);

    act(() => handler({ matches: false } as MediaQueryListEvent));
    expect(result.current).toBe(false);
  });

  it("subscribes and unsubscribes from the media query", () => {
    const mql = installMatchMedia(false);
    const { unmount } = renderHook(() => useReducedMotion());
    expect(mql.addEventListener).toHaveBeenCalledTimes(1);
    unmount();
    expect(mql.removeEventListener).toHaveBeenCalledTimes(1);
  });
});
