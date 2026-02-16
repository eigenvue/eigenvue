/**
 * Eigenvue — The visual learning platform for understanding algorithms.
 *
 * Usage:
 *
 *   import { list, steps, show } from "eigenvue";
 *
 *   // List all available algorithms
 *   list();
 *
 *   // List by category
 *   list({ category: "classical" });
 *
 *   // Get step data programmatically
 *   const result = steps("binary-search");
 *
 *   // Open an interactive visualization in the browser
 *   show("binary-search");
 *
 * @packageDocumentation
 */

export { list } from "./catalog";
export type { AlgorithmInfo, ListOptions } from "./catalog";
export { steps } from "./runner";
export type { StepsResult } from "./runner";
export { show } from "./server";
export type { ShowOptions } from "./server";

// Re-export step types for consumers who want to work with raw step data.
// These come from the shared type definitions.
export type {
  Step,
  VisualAction,
  CodeHighlight,
  StepSequence,
} from "@/shared/types/step";

/** Package version. */
export const version = "1.0.1";
