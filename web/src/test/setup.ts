import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// jsdom does not implement window.matchMedia. Provide a safe default (no media
// query matches) so hooks like useReducedMotion can run in component tests.
// Individual tests may override window.matchMedia to simulate a preference.
if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}
