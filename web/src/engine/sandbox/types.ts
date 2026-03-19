/**
 * @fileoverview Sandbox Message Protocol Types
 *
 * Defines the message format for communication between the main thread
 * (SandboxController) and the Web Worker (sandbox-worker).
 *
 * All messages are sent via `postMessage()` and must be structured-cloneable.
 * This means no functions, no Symbols, no DOM nodes.
 *
 * @module sandbox/types
 */

import type { Step } from "@/shared/types/step";

// ═══════════════════════════════════════════════════════════════════════════
// MESSAGES: Main Thread → Worker
// ═══════════════════════════════════════════════════════════════════════════

/** Request to execute user code. */
export interface ExecuteRequest {
  readonly type: "execute";
  /** The user's JavaScript code (will be used as `new Function()` body). */
  readonly code: string;
  /** Maximum execution time in milliseconds. */
  readonly timeout: number;
  /** Maximum number of step() calls allowed. */
  readonly maxSteps: number;
  /** Maximum serialized size of a single step's state in bytes. */
  readonly maxStateSizeBytes: number;
}

/** Union of all possible request types (extensible for future commands). */
export type SandboxRequest = ExecuteRequest;

// ═══════════════════════════════════════════════════════════════════════════
// MESSAGES: Worker → Main Thread
// ═══════════════════════════════════════════════════════════════════════════

/** Successful execution result. */
export interface StepsResponse {
  readonly type: "steps";
  /** The array of Step objects produced by the user's code. */
  readonly steps: Step[];
  /** Total execution time in milliseconds. */
  readonly executionTimeMs: number;
}

/** Error during execution. */
export interface ErrorResponse {
  readonly type: "error";
  /** Structured error details. */
  readonly error: SandboxError;
}

/** Union of all possible response types. */
export type SandboxResponse = StepsResponse | ErrorResponse;

// ═══════════════════════════════════════════════════════════════════════════
// ERROR TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Structured error from the sandbox.
 *
 * `kind` discriminates the error type so the UI can display appropriate
 * messages and recovery suggestions.
 */
export interface SandboxError {
  /**
   * Error classification:
   * - "syntax"     — Code failed to parse (e.g., missing bracket).
   * - "runtime"    — Code threw during execution (e.g., TypeError).
   * - "timeout"    — Execution exceeded the time limit.
   * - "validation" — Steps produced are structurally invalid.
   * - "cancelled"  — Execution was cancelled by a new execution or dispose.
   * - "internal"   — Bug in the sandbox itself (should never happen).
   */
  readonly kind: "syntax" | "runtime" | "timeout" | "validation" | "cancelled" | "internal";

  /** Human-readable error message. */
  readonly message: string;

  /** Error name (e.g., "TypeError", "RangeError"). Only for runtime errors. */
  readonly name?: string;

  /** Line number in the user's code where the error occurred. */
  readonly line?: number;

  /** Column number in the user's code where the error occurred. */
  readonly column?: number;

  /** Full stack trace (for debugging). */
  readonly stack?: string;

  /** Timeout duration in ms (only for timeout errors). */
  readonly timeout?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTROLLER OPTIONS
// ═══════════════════════════════════════════════════════════════════════════

/** Configuration options for SandboxController.execute(). */
export interface SandboxOptions {
  /** Maximum execution time in milliseconds. @default 5000 */
  timeout?: number;
  /** Maximum number of step() calls. @default 500 */
  maxSteps?: number;
  /** Maximum serialized state size per step in bytes. @default 1_048_576 (1 MB) */
  maxStateSizeBytes?: number;
  /** Grace period after internal timeout before force-killing the worker. @default 1000 */
  watchdogGraceMs?: number;
}

/** The result of a successful sandbox execution. */
export interface SandboxExecutionResult {
  /** The validated array of Step objects. */
  readonly steps: Step[];
  /** Total execution time in milliseconds. */
  readonly executionTimeMs: number;
}
