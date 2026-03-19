/**
 * @fileoverview Sandbox Runtime — User-Facing Generator API
 *
 * Creates the `step()` function and `utils` helper object that are
 * injected into user code as arguments. This is the public contract
 * of the custom algorithm editor.
 *
 * USER CODE SEES:
 *   step({ title, explanation, state, visualActions })  → void
 *   step({ ..., isTerminal: true })                     → void (last step)
 *   utils.deepClone(obj)                                → deep copy
 *
 * USER CODE DOES NOT SEE:
 *   The runtime's internal state (steps array, counters, size tracking).
 *
 * MATHEMATICAL INVARIANTS (enforced at each step() call):
 *   step.index === (number of previous step() calls)
 *   state is JSON-serializable (validated by JSON.stringify round-trip)
 *   serialized state size ≤ maxStateSizeBytes
 *
 * @module sandbox-runtime
 */

import type { Step, VisualAction } from "@/shared/types/step";

/** Configuration for the sandbox runtime. */
export interface SandboxRuntimeConfig {
  readonly maxSteps: number;
  readonly maxStateSizeBytes: number;
}

/**
 * The input object users pass to step().
 *
 * This is a simplified version of the internal StepInput type (Phase 5).
 * Key differences:
 * - `codeHighlight` is not required (user code doesn't have a code panel).
 * - `phase` is optional.
 * - `visualActions` accepts a broader type (no readonly requirement in user code).
 */
export interface UserStepInput {
  /** Short heading for this step (≤ 200 chars). */
  readonly title: string;

  /** Plain-language narration of what is happening. */
  readonly explanation: string;

  /**
   * Snapshot of all algorithm variables at this point.
   *
   * IMPORTANT: You must pass a COPY of any mutable data.
   * Use utils.deepClone() or the spread operator for arrays/objects.
   */
  readonly state: Record<string, unknown>;

  /**
   * Rendering instructions for this step.
   *
   * Each visual action tells the renderer what to draw.
   * The available action types depend on the selected layout.
   * Unrecognized action types are silently ignored.
   */
  readonly visualActions: VisualAction[];

  /**
   * Whether this is the last step of the algorithm.
   * Set this to `true` on the FINAL step() call.
   * @default false
   */
  readonly isTerminal?: boolean;

  /**
   * Optional grouping label (e.g., "initialization", "search", "result").
   * The UI uses this to show phase transitions in the explanation panel.
   */
  readonly phase?: string;
}

/** The step() function signature as seen by user code. */
export type UserStepFunction = (input: UserStepInput) => void;

/**
 * Utility helpers available to user code via the `utils` argument.
 */
export interface SandboxUtils {
  /**
   * Deep-clone a JSON-serializable value.
   *
   * @param value - Any JSON-serializable value.
   * @returns A deep copy of the value.
   * @throws {Error} If the value is not JSON-serializable.
   */
  deepClone<T>(value: T): T;

  /**
   * Create a 2D array (matrix) initialized to a fill value.
   *
   * @param rows - Number of rows.
   * @param cols - Number of columns.
   * @param fill - Initial value for every cell (default: 0).
   * @returns A rows × cols 2D array.
   */
  createMatrix<T = number>(rows: number, cols: number, fill?: T): T[][];

  /**
   * Generate an array of sequential integers from `start` to `end` (exclusive).
   *
   * @param start - First value (inclusive).
   * @param end - Last value (exclusive).
   * @param step - Increment between values (default: 1).
   * @returns Array of integers.
   *
   * @example utils.range(0, 5) → [0, 1, 2, 3, 4]
   * @example utils.range(2, 10, 3) → [2, 5, 8]
   */
  range(start: number, end: number, step?: number): number[];

  /**
   * Shuffle an array in place using the Fisher-Yates algorithm
   * with a deterministic seed.
   *
   * @param array - The array to shuffle (mutated in place).
   * @param seed - Integer seed for the PRNG (default: 42).
   * @returns The same array, shuffled.
   */
  shuffle<T>(array: T[], seed?: number): T[];

  /**
   * Generate a random integer in [min, max] (inclusive) using a seeded PRNG.
   *
   * @param min - Minimum value (inclusive).
   * @param max - Maximum value (inclusive).
   * @param seed - Integer seed for the PRNG (default: 42).
   * @returns A deterministic "random" integer.
   */
  randomInt(min: number, max: number, seed?: number): number;

  /**
   * Format a number for display (truncate to specified decimal places).
   *
   * @param value - The number to format.
   * @param decimals - Number of decimal places (default: 2).
   * @returns The formatted string.
   */
  formatNumber(value: number, decimals?: number): string;
}

/**
 * Captured console — logs are collected into an array instead of
 * being sent to the browser console. The editor displays them
 * in the error/output panel.
 */
export interface SandboxConsole {
  log(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  info(...args: unknown[]): void;
}

/** The object returned by createSandboxRuntime(). */
export interface SandboxRuntime {
  /** The step builder function, passed to user code. */
  readonly step: UserStepFunction;
  /** Utility helpers, passed to user code. */
  readonly utils: SandboxUtils;
  /** Captured console (logs are collected, not sent to browser console). */
  readonly console: SandboxConsole;
  /** Retrieve the collected steps after execution. */
  getSteps(): Step[];
  /** Get total state size in bytes (for payload limit check). */
  getTotalStateSizeBytes(): number;
  /** Signal termination (called by timeout handler). */
  terminate(): void;
  /** Get captured console logs. */
  getConsoleLogs(): Array<{ level: string; args: unknown[] }>;
}

// ═══════════════════════════════════════════════════════════════════════════
// IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Seeded PRNG (xorshift32).
 *
 * Deterministic pseudo-random number generator.
 * MATHEMATICAL PROPERTIES:
 * - Period: 2^32 - 1
 * - Same seed always produces same sequence
 * - Uniform distribution over [0, 2^32)
 */
function xorshift32(seed: number): () => number {
  let state = seed | 0;
  if (state === 0) state = 1;
  return (): number => {
    state ^= state << 13;
    state ^= state >> 17;
    state ^= state << 5;
    return state >>> 0;
  };
}

/**
 * Create the sandbox runtime for a single execution.
 *
 * Each call to createSandboxRuntime() returns a fresh, independent runtime.
 * The runtime is used for exactly one code execution and then discarded.
 *
 * @param config - Configuration for step limits and state sizes.
 * @returns A SandboxRuntime instance.
 */
export function createSandboxRuntime(config: SandboxRuntimeConfig): SandboxRuntime {
  const steps: Step[] = [];
  let totalStateSizeBytes = 0;
  let terminated = false;
  const consoleLogs: Array<{ level: string; args: unknown[] }> = [];

  // ─── Step Function ─────────────────────────────────────────────────

  const step: UserStepFunction = (input: UserStepInput): void => {
    if (terminated) {
      throw new Error("__SANDBOX_TERMINATED__");
    }

    const index = steps.length;

    // ─── Step limit check ────────────────────────────────────────
    if (index >= config.maxSteps) {
      throw new Error(
        `Step limit exceeded (maximum: ${config.maxSteps}). ` +
          `Your algorithm produced too many steps. Consider reducing ` +
          `the input size or yielding fewer intermediate steps.`,
      );
    }

    // ─── Validate title ──────────────────────────────────────────
    if (typeof input.title !== "string" || input.title.length === 0) {
      throw new Error(
        `Step ${index}: title must be a non-empty string. ` + `Got: ${JSON.stringify(input.title)}`,
      );
    }
    if (input.title.length > 200) {
      throw new Error(`Step ${index}: title exceeds 200 characters (got ${input.title.length}).`);
    }

    // ─── Validate explanation ────────────────────────────────────
    if (typeof input.explanation !== "string") {
      throw new Error(
        `Step ${index}: explanation must be a string. ` + `Got: ${typeof input.explanation}`,
      );
    }

    // ─── Validate state is JSON-serializable and within size limit ─
    let serializedState: string;
    try {
      serializedState = JSON.stringify(input.state);
    } catch (e) {
      throw new Error(
        `Step ${index}: state is not JSON-serializable. ` +
          `State must contain only JSON-safe values (no functions, ` +
          `no circular references, no undefined values). ` +
          `Error: ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    const stateSizeBytes = new TextEncoder().encode(serializedState).length;
    if (stateSizeBytes > config.maxStateSizeBytes) {
      throw new Error(
        `Step ${index}: state size (${(stateSizeBytes / 1024).toFixed(1)} KB) ` +
          `exceeds the ${(config.maxStateSizeBytes / 1024).toFixed(0)} KB limit. ` +
          `Reduce the amount of data in your state object.`,
      );
    }
    totalStateSizeBytes += stateSizeBytes;

    // ─── Validate visualActions ──────────────────────────────────
    if (!Array.isArray(input.visualActions)) {
      throw new Error(
        `Step ${index}: visualActions must be an array. ` + `Got: ${typeof input.visualActions}`,
      );
    }
    for (let i = 0; i < input.visualActions.length; i++) {
      const action = input.visualActions[i];
      if (typeof action !== "object" || action === null || typeof action.type !== "string") {
        throw new Error(
          `Step ${index}: visualActions[${i}] must be an object with a string "type" property. ` +
            `Got: ${JSON.stringify(action)}`,
        );
      }
    }

    // ─── Construct the Step object ───────────────────────────────
    const stepObj: Step = {
      index,
      id: `user_step_${index}`,
      title: input.title,
      explanation: input.explanation,
      state: JSON.parse(serializedState),
      visualActions: JSON.parse(JSON.stringify(input.visualActions)),
      codeHighlight: { language: "javascript", lines: [] },
      isTerminal: input.isTerminal ?? false,
      phase: input.phase,
    };

    steps.push(stepObj);
  };

  // ─── Utils ─────────────────────────────────────────────────────────

  // Shared PRNG instance for randomInt — sequential calls with the same
  // seed produce a sequence rather than the same first value each time.
  let sharedRng: { seed: number; next: () => number } | null = null;

  function getOrCreateRng(seed: number): () => number {
    if (sharedRng && sharedRng.seed === seed) {
      return sharedRng.next;
    }
    const next = xorshift32(seed);
    sharedRng = { seed, next };
    return next;
  }

  const utils: SandboxUtils = {
    deepClone<T>(value: T): T {
      return JSON.parse(JSON.stringify(value));
    },

    createMatrix<T = number>(rows: number, cols: number, fill?: T): T[][] {
      const defaultFill = (fill !== undefined ? fill : 0) as T;
      // For non-primitive fill values (objects/arrays), deep-clone each cell
      // to prevent shared references across the matrix.
      const isPrimitive =
        defaultFill === null ||
        (typeof defaultFill !== "object" && typeof defaultFill !== "function");
      return Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () =>
          isPrimitive ? defaultFill : JSON.parse(JSON.stringify(defaultFill)),
        ),
      );
    },

    range(start: number, end: number, rangeStep: number = 1): number[] {
      if (rangeStep === 0) throw new Error("utils.range: step cannot be 0.");
      if (rangeStep > 0 && start >= end) return [];
      if (rangeStep < 0 && start <= end) return [];
      const result: number[] = [];
      const maxLength = 100_000;
      if (rangeStep > 0) {
        for (let i = start; i < end && result.length < maxLength; i += rangeStep) {
          result.push(i);
        }
      } else {
        for (let i = start; i > end && result.length < maxLength; i += rangeStep) {
          result.push(i);
        }
      }
      return result;
    },

    shuffle<T>(array: T[], seed: number = 42): T[] {
      const rng = xorshift32(seed);
      for (let i = array.length - 1; i > 0; i--) {
        const j = rng() % (i + 1);
        const temp = array[i];
        array[i] = array[j]!;
        array[j] = temp!;
      }
      return array;
    },

    randomInt(min: number, max: number, seed: number = 42): number {
      const rng = getOrCreateRng(seed);
      return min + (rng() % (max - min + 1));
    },

    formatNumber(value: number, decimals: number = 2): string {
      return value.toFixed(decimals);
    },
  };

  // ─── Console Capture ────────────────────────────────────────────────

  const sandboxConsole: SandboxConsole = {
    log: (...args: unknown[]) => consoleLogs.push({ level: "log", args }),
    warn: (...args: unknown[]) => consoleLogs.push({ level: "warn", args }),
    error: (...args: unknown[]) => consoleLogs.push({ level: "error", args }),
    info: (...args: unknown[]) => consoleLogs.push({ level: "info", args }),
  };

  // ─── Runtime Interface ────────────────────────────────────────────

  return {
    step,
    utils,
    console: sandboxConsole,
    getSteps: () => [...steps],
    getTotalStateSizeBytes: () => totalStateSizeBytes,
    terminate: () => {
      terminated = true;
    },
    getConsoleLogs: () => [...consoleLogs],
  };
}
