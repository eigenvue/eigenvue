// =============================================================================
// web/src/engine/layouts/registry.ts
//
// Central registry for layout functions. Layouts self-register by calling
// `registerLayout()` at module load time. The visualizer page resolves a
// layout by name using `getLayout()`.
//
// Design: The registry is a module-level singleton (a plain Map). This is
// intentional — there is exactly one layout registry per application instance.
// In testing, call `clearLayoutRegistry()` to reset state between tests.
// =============================================================================

import type { LayoutRegistration, LayoutFunction } from "../types";

const registry = new Map<string, LayoutRegistration>();

/**
 * Registers a layout function under a unique name.
 *
 * @param registration - The layout name, description, and function.
 * @throws {Error} If a layout with the same name is already registered.
 */
export function registerLayout(registration: LayoutRegistration): void {
  if (registry.has(registration.name)) {
    throw new Error(
      `Layout "${registration.name}" is already registered. ` +
        `Each layout name must be unique across the application.`,
    );
  }
  registry.set(registration.name, registration);
}

/**
 * Retrieves a registered layout function by name.
 *
 * @param name - The layout name (e.g., "array-with-pointers").
 * @returns The LayoutFunction, or undefined if not registered.
 */
export function getLayout(name: string): LayoutFunction | undefined {
  return registry.get(name)?.layout;
}

/**
 * Returns all registered layout names, sorted alphabetically.
 * Useful for documentation and debugging.
 */
export function getRegisteredLayoutNames(): string[] {
  return [...registry.keys()].sort();
}

/**
 * Clears the registry. For use in test suites only.
 */
export function clearLayoutRegistry(): void {
  registry.clear();
}
