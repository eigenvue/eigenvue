/**
 * Generator runner — executes a TypeScript generator and returns validated steps.
 *
 * This is the Node package wrapper around the web app's GeneratorRunner.
 * It resolves inputs (user-provided or defaults) and runs the generator.
 *
 * MIRRORS: python/src/eigenvue/runner.py
 */

import { runGenerator as runGeneratorCore } from "@/engine/generator/GeneratorRunner";
import type { StepSequence } from "@/shared/types/step";
import { getGenerator } from "./generators/registry";
import { getDefaultInputs } from "./catalog";

/** The result returned by the steps() function. */
export type StepsResult = StepSequence;

/**
 * Generate and return the step sequence for an algorithm.
 *
 * @param algorithmId - The algorithm identifier (e.g., "binary-search").
 * @param inputs - Custom input parameters. If omitted, uses defaults from metadata.
 * @returns A validated StepSequence containing all steps.
 * @throws {Error} If the algorithm ID is not recognized or generation fails.
 *
 * @example
 * ```typescript
 * import { steps } from "eigenvue";
 *
 * const result = steps("binary-search", { array: [1, 3, 5, 7, 9], target: 5 });
 * console.log(result.steps.length);
 * console.log(result.steps[result.steps.length - 1].isTerminal); // true
 * ```
 */
export function steps(
  algorithmId: string,
  inputs?: Record<string, unknown>,
): StepSequence {
  const resolvedInputs = inputs ?? getDefaultInputs(algorithmId);
  const definition = getGenerator(algorithmId);
  return runGeneratorCore(definition, resolvedInputs);
}
