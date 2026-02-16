/**
 * @fileoverview Generator API — Type Definitions
 *
 * This file defines the types for algorithm generators in Eigenvue.
 * A "generator" is a function that takes algorithm inputs and produces
 * an array of Step objects (defined in Phase 3). The generator API
 * provides a structured way to create, validate, and run generators.
 *
 * DESIGN DECISIONS:
 * - Generators are plain functions, not classes. This keeps them simple,
 *   testable, and free of hidden state.
 * - The `createGenerator` factory returns a `GeneratorDefinition` object
 *   that bundles the generate function with its algorithm ID. This enables
 *   the runner to attach metadata (algorithmId, generatedAt, etc.) to
 *   the output StepSequence without the generator itself needing to know
 *   about those fields.
 * - Inputs are generic (`TInputs`) so each algorithm gets compile-time
 *   type safety on its specific parameter shape.
 *
 * @module @eigenvue/generator
 */

import type { Step, VisualAction, CodeHighlight, StepSequence } from "@/shared/types/step";

// Re-export Step types so generators can import everything from one place.
export type { Step, VisualAction, CodeHighlight, StepSequence };

// ─────────────────────────────────────────────────────────────────────────────
// STEP BUILDER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The fields a generator must provide when yielding a step.
 * Omits `index` because the runner assigns indices automatically
 * (guaranteeing contiguity and correctness — no manual index tracking).
 *
 * The generator provides the CONTENT of the step; the runner wraps it
 * with positional metadata.
 */
export interface StepInput {
  /**
   * Template identifier for this step (e.g., "compare_mid", "found").
   * Must match pattern: ^[a-z0-9][a-z0-9_-]*$
   */
  readonly id: string;

  /** Short heading for this step (≤ 200 chars). */
  readonly title: string;

  /** Plain-language narration of what is happening. */
  readonly explanation: string;

  /**
   * Snapshot of all algorithm variables at this point.
   * IMPORTANT: This must be a deep copy (or fresh object) of the current state.
   * If you pass a reference to a mutable variable, the state will be
   * incorrect when the user steps backward (because all steps would
   * point to the same mutated object).
   *
   * Safe patterns:
   *   state: { array: [...array], target, left, right, mid }
   *     — spread operator creates a shallow copy of the array
   *   state: structuredClone({ complex, nested, data })
   *     — for deeply nested mutable state
   *
   * NEVER do this:
   *   state: { array, target, left, right }
   *     — `array` is a reference; if mutated later, ALL steps see the mutation
   */
  readonly state: Record<string, unknown>;

  /** Rendering instructions for this step. */
  readonly visualActions: readonly VisualAction[];

  /** Source code line mapping for this step. */
  readonly codeHighlight: CodeHighlight;

  /**
   * Set to `true` ONLY on the final step of the algorithm.
   * The runner validates that exactly one step is terminal and that
   * it is the last one.
   * @default false
   */
  readonly isTerminal?: boolean;

  /**
   * Optional grouping label (e.g., "initialization", "search", "result").
   * The UI uses this to display phase transitions.
   */
  readonly phase?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP BUILDER FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A function that converts a StepInput into a complete Step object.
 * Provided to generators by the runner — generators never construct
 * Step objects directly.
 *
 * The step() function:
 * 1. Assigns the correct `index` (auto-incrementing).
 * 2. Sets `isTerminal` to false if not provided.
 * 3. Returns a frozen, immutable Step object.
 *
 * @param input - The step content provided by the generator.
 * @returns A complete, validated Step object.
 */
export type StepBuilderFn = (input: StepInput) => Step;

// ─────────────────────────────────────────────────────────────────────────────
// GENERATOR FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The generator function signature.
 *
 * A generator is a JavaScript generator function (function*) that receives
 * the algorithm's inputs and a step builder function. It yields Step objects
 * (created via the step builder) at each "interesting moment" of the algorithm.
 *
 * RULES:
 * 1. The generator MUST yield at least one step.
 * 2. The last yielded step MUST have `isTerminal: true`.
 * 3. No step other than the last may have `isTerminal: true`.
 * 4. The generator MUST terminate (no infinite loops).
 * 5. State objects in steps MUST be independent snapshots (see StepInput.state docs).
 *
 * @typeParam TInputs - The shape of the algorithm's input parameters.
 * @param inputs - The algorithm's input parameters (e.g., { array, target }).
 * @param step   - The step builder function. Call this to create each step.
 * @yields Step objects in execution order.
 */
export type GeneratorFunction<TInputs extends Record<string, unknown>> = (
  inputs: TInputs,
  step: StepBuilderFn,
) => Generator<Step, void, undefined>;

// ─────────────────────────────────────────────────────────────────────────────
// GENERATOR DEFINITION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A complete generator definition, bundling the algorithm ID with its
 * generate function. This is the object returned by `createGenerator()`.
 *
 * @typeParam TInputs - The shape of the algorithm's input parameters.
 */
export interface GeneratorDefinition<TInputs extends Record<string, unknown>> {
  /** The algorithm's URL-safe identifier (e.g., "binary-search"). */
  readonly id: string;

  /**
   * The generator function. Called by the GeneratorRunner with validated
   * inputs and a step builder.
   */
  readonly generate: GeneratorFunction<TInputs>;
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE GENERATOR FACTORY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Configuration object passed to `createGenerator()`.
 *
 * @typeParam TInputs - The shape of the algorithm's input parameters.
 */
export interface CreateGeneratorConfig<TInputs extends Record<string, unknown>> {
  /**
   * The algorithm's URL-safe identifier.
   * Must match the `id` field in the algorithm's `meta.json`.
   * Must match pattern: ^[a-z0-9][a-z0-9-]*$
   */
  readonly id: string;

  /**
   * The generator function.
   * Note: This must be a generator function (function*), not a regular function.
   * The `generate` property uses the short method syntax `*generate(inputs, step)`.
   */
  readonly generate: GeneratorFunction<TInputs>;
}

/**
 * Factory function to create a type-safe generator definition.
 *
 * Usage in an algorithm's generator.ts:
 *
 * ```typescript
 * import { createGenerator } from "@/engine/generator";
 *
 * interface BinarySearchInputs {
 *   array: number[];
 *   target: number;
 * }
 *
 * export default createGenerator<BinarySearchInputs>({
 *   id: "binary-search",
 *   *generate(inputs, step) {
 *     // ... yield step({ ... }) at each interesting moment
 *   },
 * });
 * ```
 *
 * @typeParam TInputs - The input parameter shape.
 * @param config - The algorithm ID and generator function.
 * @returns A GeneratorDefinition that the runner can execute.
 */
export function createGenerator<TInputs extends Record<string, unknown>>(
  config: CreateGeneratorConfig<TInputs>,
): GeneratorDefinition<TInputs> {
  // Validate the algorithm ID format at definition time.
  if (!/^[a-z0-9][a-z0-9-]*$/.test(config.id)) {
    throw new Error(
      `Invalid algorithm ID "${config.id}". ` +
        `Must match pattern: ^[a-z0-9][a-z0-9-]*$ ` +
        `(lowercase alphanumeric and hyphens, starting with a letter or digit).`,
    );
  }

  return {
    id: config.id,
    generate: config.generate,
  };
}
