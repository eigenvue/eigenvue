/**
 * @fileoverview Generator Runner
 *
 * Executes algorithm generators and produces validated StepSequences.
 *
 * The runner's responsibilities:
 * 1. Create the step builder function (assigns indices automatically).
 * 2. Execute the generator, collecting all yielded steps.
 * 3. Validate the step sequence (index contiguity, single terminal, etc.).
 * 4. Wrap the steps in a StepSequence with metadata.
 *
 * MATHEMATICAL INVARIANTS ENFORCED:
 * - steps[i].index === i for all i in [0, steps.length)
 * - Exactly one step has isTerminal === true, and it is steps[steps.length - 1]
 * - Step array is non-empty (at least one step)
 *
 * ERROR HANDLING:
 * - If the generator throws, the error propagates with context about which
 *   step was being generated when it failed.
 * - Validation errors include the specific invariant that was violated.
 */

import type { Step, StepSequence } from "@/shared/types/step";
import { STEP_FORMAT_VERSION } from "@/shared/types/step";
import type { GeneratorDefinition, StepInput, StepBuilderFn } from "./types";

/**
 * Options for running a generator.
 */
export interface RunOptions {
  /**
   * Maximum number of steps the generator is allowed to produce.
   * This is a safety limit to prevent infinite loops from locking the browser.
   * @default 10_000
   */
  readonly maxSteps?: number;
}

/** Default maximum steps before the runner forcibly stops. */
const DEFAULT_MAX_STEPS = 10_000;

/**
 * Runs a generator with the given inputs and returns a validated StepSequence.
 *
 * @typeParam TInputs - The algorithm's input parameter shape.
 * @param definition - The generator definition (from `createGenerator()`).
 * @param inputs     - The algorithm's input parameters.
 * @param options    - Optional configuration (max steps, etc.).
 * @returns A complete, validated StepSequence.
 * @throws {GeneratorError} If the generator fails or produces invalid output.
 *
 * @example
 * ```typescript
 * import binarySearchGenerator from "@/algorithms/classical/binary-search/generator";
 * import { runGenerator } from "@/engine/generator";
 *
 * const result = runGenerator(binarySearchGenerator, {
 *   array: [1, 3, 5, 7, 9, 11, 13],
 *   target: 7,
 * });
 *
 * console.log(result.steps.length); // e.g., 5
 * console.log(result.steps[result.steps.length - 1].isTerminal); // true
 * ```
 */
export function runGenerator<TInputs extends Record<string, unknown>>(
  definition: GeneratorDefinition<TInputs>,
  inputs: TInputs,
  options?: RunOptions,
): StepSequence {
  const maxSteps = options?.maxSteps ?? DEFAULT_MAX_STEPS;
  const steps: Step[] = [];

  /**
   * Step builder function provided to the generator.
   *
   * Each call:
   * 1. Assigns the next sequential index.
   * 2. Sets isTerminal to false if not provided.
   * 3. Creates the complete Step object.
   *
   * NOTE: The step builder does NOT deep-clone the state object.
   * It is the generator's responsibility to provide independent state
   * snapshots (see StepInput.state documentation). This is a deliberate
   * design choice — deep cloning every state would be expensive for
   * large data structures, and the generator author knows which parts
   * of the state are mutable and need copying.
   */
  const stepBuilder: StepBuilderFn = (input: StepInput): Step => {
    const index = steps.length;

    // Validate step ID format.
    if (!/^[a-z0-9][a-z0-9_-]*$/.test(input.id)) {
      throw new GeneratorError(
        definition.id,
        index,
        `Invalid step ID "${input.id}". ` +
          `Must match pattern: ^[a-z0-9][a-z0-9_-]*$ ` +
          `(lowercase alphanumeric, hyphens, underscores).`,
      );
    }

    // Validate title is non-empty and within length limit.
    if (input.title.length === 0) {
      throw new GeneratorError(definition.id, index, `Step title must not be empty.`);
    }
    if (input.title.length > 200) {
      throw new GeneratorError(
        definition.id,
        index,
        `Step title exceeds 200 characters (got ${input.title.length}).`,
      );
    }

    // Validate code highlight lines are positive integers.
    for (const line of input.codeHighlight.lines) {
      if (!Number.isInteger(line) || line < 1) {
        throw new GeneratorError(
          definition.id,
          index,
          `Code highlight lines must be positive integers. Got: ${line}`,
        );
      }
    }

    const step: Step = {
      index,
      id: input.id,
      title: input.title,
      explanation: input.explanation,
      state: input.state,
      visualActions: [...input.visualActions],
      codeHighlight: {
        language: input.codeHighlight.language,
        lines: [...input.codeHighlight.lines],
      },
      isTerminal: input.isTerminal ?? false,
      phase: input.phase,
    };

    steps.push(step);
    return step;
  };

  // ─── Execute the generator ─────────────────────────────────────────────

  try {
    const iterator = definition.generate(inputs, stepBuilder);

    for (const _step of iterator) {
      // The step was already added to `steps` by the stepBuilder.
      // We just need to iterate to drive the generator forward.

      // Safety limit to prevent infinite generators from freezing the browser.
      if (steps.length >= maxSteps) {
        throw new GeneratorError(
          definition.id,
          steps.length - 1,
          `Generator exceeded maximum step limit of ${maxSteps}. ` +
            `This usually indicates an infinite loop in the generator. ` +
            `If this is intentional, increase the maxSteps option.`,
        );
      }
    }
  } catch (error) {
    if (error instanceof GeneratorError) {
      throw error;
    }
    // Wrap unexpected errors with context.
    throw new GeneratorError(
      definition.id,
      steps.length,
      `Generator threw an unexpected error: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : undefined,
    );
  }

  // ─── Validate the step sequence ────────────────────────────────────────

  validateSteps(definition.id, steps);

  // ─── Construct the StepSequence ────────────────────────────────────────

  return {
    formatVersion: STEP_FORMAT_VERSION,
    algorithmId: definition.id,
    inputs: inputs as Record<string, unknown>,
    steps,
    generatedAt: new Date().toISOString(),
    generatedBy: "typescript",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates a collected step array against all step format invariants.
 *
 * INVARIANTS CHECKED:
 * 1. Non-empty: At least one step must exist.
 * 2. Index contiguity: steps[i].index === i for all i.
 * 3. Single terminal: Exactly one step has isTerminal === true.
 * 4. Terminal is last: The terminal step is steps[steps.length - 1].
 * 5. Visual action constraints (see validateVisualActions).
 *
 * @param algorithmId - For error messages.
 * @param steps       - The step array to validate.
 * @throws {GeneratorError} If any invariant is violated.
 */
function validateSteps(algorithmId: string, steps: readonly Step[]): void {
  // ── Invariant 1: Non-empty ──
  if (steps.length === 0) {
    throw new GeneratorError(
      algorithmId,
      -1,
      "Generator produced zero steps. Every algorithm must yield at least one step.",
    );
  }

  // ── Invariant 2: Index contiguity ──
  for (let i = 0; i < steps.length; i++) {
    if (steps[i]!.index !== i) {
      throw new GeneratorError(
        algorithmId,
        i,
        `Index contiguity violation: steps[${i}].index is ${steps[i]!.index}, expected ${i}. ` +
          `This is a bug in the GeneratorRunner, not in the generator.`,
      );
    }
  }

  // ── Invariant 3 & 4: Single terminal, and it must be the last step ──
  const terminalIndices = steps.map((s, i) => (s.isTerminal ? i : -1)).filter((i) => i !== -1);

  if (terminalIndices.length === 0) {
    throw new GeneratorError(
      algorithmId,
      steps.length - 1,
      "No terminal step found. The last step must have isTerminal: true. " +
        "Did you forget to set isTerminal: true on the final yield?",
    );
  }

  if (terminalIndices.length > 1) {
    throw new GeneratorError(
      algorithmId,
      terminalIndices[1]!,
      `Multiple terminal steps found at indices: [${terminalIndices.join(", ")}]. ` +
        `Exactly one step must be terminal, and it must be the last step.`,
    );
  }

  if (terminalIndices[0] !== steps.length - 1) {
    throw new GeneratorError(
      algorithmId,
      terminalIndices[0]!,
      `Terminal step is at index ${terminalIndices[0]}, but the last step is at ` +
        `index ${steps.length - 1}. The terminal step must be the last step.`,
    );
  }

  // ── Invariant 5: Visual action constraints ──
  for (const step of steps) {
    validateVisualActions(algorithmId, step);
  }
}

/**
 * Validates visual actions within a single step for semantic correctness.
 *
 * MATHEMATICAL INVARIANTS ENFORCED:
 * - showAttentionWeights: sum(weights) === 1.0 ± 1e-6, each weight ∈ [0, 1]
 * - highlightRange / dimRange: from <= to
 * - compareElements: result ∈ {"less", "greater", "equal"}
 * - updateBarChart: if labels present, labels.length === values.length
 *
 * @param algorithmId - For error messages.
 * @param step        - The step whose actions to validate.
 * @throws {GeneratorError} If any action violates its constraints.
 */
function validateVisualActions(algorithmId: string, step: Step): void {
  for (const action of step.visualActions) {
    switch (action.type) {
      case "highlightRange":
      case "dimRange": {
        const from = action["from"] as number;
        const to = action["to"] as number;
        if (from > to) {
          throw new GeneratorError(
            algorithmId,
            step.index,
            `${action.type}: "from" (${from}) must be <= "to" (${to}).`,
          );
        }
        break;
      }

      case "compareElements": {
        const result = action["result"] as string;
        if (!["less", "greater", "equal"].includes(result)) {
          throw new GeneratorError(
            algorithmId,
            step.index,
            `compareElements: "result" must be "less", "greater", or "equal". Got: "${result}".`,
          );
        }
        break;
      }

      case "showAttentionWeights": {
        const weights = action["weights"] as readonly number[];

        // Validate each weight is in [0, 1].
        for (let i = 0; i < weights.length; i++) {
          if (weights[i]! < 0 || weights[i]! > 1) {
            throw new GeneratorError(
              algorithmId,
              step.index,
              `showAttentionWeights: weight[${i}] = ${weights[i]} is outside [0, 1].`,
            );
          }
        }

        /**
         * MATHEMATICAL PRECISION NOTE:
         * We use a Kahan summation algorithm here instead of a naive reduce
         * to minimize floating-point accumulation error. For attention weights
         * produced by softmax, naive summation can drift by more than 1e-6
         * for sequences longer than ~100 tokens.
         *
         * Kahan summation maintains a running compensation term that tracks
         * the low-order bits lost during each addition, achieving O(1) error
         * independent of the number of terms (vs O(n·ε) for naive summation).
         *
         * Reference: Kahan, W. (1965). "Pracniques: Further remarks on
         * reducing truncation errors." Communications of the ACM.
         */
        let sum = 0;
        let compensation = 0; // Running compensation for lost low-order bits.
        for (const w of weights) {
          const y = w - compensation; // Compensated value to add.
          const t = sum + y; // New sum (some low bits of y may be lost).
          compensation = t - sum - y; // Recover what was lost: (t - sum) is the
          // high-order part of y; subtracting y gives
          // the negative of the lost low-order bits.
          sum = t;
        }

        if (Math.abs(sum - 1.0) > 1e-6) {
          throw new GeneratorError(
            algorithmId,
            step.index,
            `showAttentionWeights: weights must sum to 1.0 (±1e-6). ` +
              `Got sum = ${sum} (delta = ${Math.abs(sum - 1.0).toExponential(6)}). ` +
              `Sum computed using Kahan summation for numerical stability.`,
          );
        }
        break;
      }

      case "updateBarChart": {
        const values = action["values"] as readonly number[];
        const labels = action["labels"] as readonly string[] | undefined;
        if (labels !== undefined && labels.length !== values.length) {
          throw new GeneratorError(
            algorithmId,
            step.index,
            `updateBarChart: labels.length (${labels.length}) must equal ` +
              `values.length (${values.length}).`,
          );
        }
        break;
      }

      // Unknown action types are silently ignored — this is by design.
      // The open vocabulary principle means new action types can be added
      // without modifying the runner or validation logic.
      default:
        break;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ERROR TYPE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Error thrown when a generator produces invalid output or encounters
 * a runtime failure.
 *
 * Always includes the algorithm ID and the step index where the error
 * occurred, making debugging straightforward.
 */
export class GeneratorError extends Error {
  /** The algorithm that caused the error. */
  readonly algorithmId: string;

  /** The step index at which the error occurred (-1 if before any step). */
  readonly stepIndex: number;

  /** The original error, if this wraps an unexpected exception. */
  readonly cause?: Error;

  constructor(algorithmId: string, stepIndex: number, message: string, cause?: Error) {
    super(`[${algorithmId}] Step ${stepIndex}: ${message}`);
    this.name = "GeneratorError";
    this.algorithmId = algorithmId;
    this.stepIndex = stepIndex;
    this.cause = cause;
  }
}
