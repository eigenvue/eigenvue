/**
 * @fileoverview Template Registry
 *
 * Each template provides:
 * - A unique ID.
 * - A display name.
 * - A description of what it demonstrates.
 * - The layout ID it's designed for.
 * - The complete JavaScript code (as a string).
 *
 * Templates serve three purposes:
 * 1. Learning by example — users see how to use the API correctly.
 * 2. Starting point — users modify templates rather than writing from scratch.
 * 3. Smoke test — every template must produce valid steps (tested in CI).
 *
 * @module templates
 */

export interface AlgorithmTemplate {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly layoutId: string;
  readonly category: "classical" | "deep-learning" | "generative-ai" | "quantum";
  /** The complete JavaScript source code. */
  readonly code: string;
  /** Difficulty level of the template. */
  readonly difficulty: "beginner" | "intermediate" | "advanced";
}

export { ARRAY_TEMPLATE } from "./array-template";
export { SORTING_TEMPLATE } from "./sorting-template";
export { GRAPH_TEMPLATE } from "./graph-template";
export { NEURAL_NETWORK_TEMPLATE } from "./neural-network-template";
export { ATTENTION_TEMPLATE } from "./attention-template";
export { BLANK_TEMPLATE } from "./blank-template";

import { ARRAY_TEMPLATE } from "./array-template";
import { SORTING_TEMPLATE } from "./sorting-template";
import { GRAPH_TEMPLATE } from "./graph-template";
import { NEURAL_NETWORK_TEMPLATE } from "./neural-network-template";
import { ATTENTION_TEMPLATE } from "./attention-template";
import { BLANK_TEMPLATE } from "./blank-template";

/** All available templates, ordered by difficulty. */
export const ALL_TEMPLATES: readonly AlgorithmTemplate[] = [
  BLANK_TEMPLATE,
  ARRAY_TEMPLATE,
  SORTING_TEMPLATE,
  GRAPH_TEMPLATE,
  NEURAL_NETWORK_TEMPLATE,
  ATTENTION_TEMPLATE,
];

/** Look up a template by ID. Returns undefined if not found. */
export function getTemplateById(id: string): AlgorithmTemplate | undefined {
  return ALL_TEMPLATES.find((t) => t.id === id);
}
