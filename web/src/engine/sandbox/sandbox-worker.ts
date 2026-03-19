/**
 * @fileoverview Sandbox Web Worker
 *
 * This file runs in a dedicated Web Worker thread. It receives user-submitted
 * JavaScript code from the main thread (via SandboxController), executes it
 * in a restricted environment, and returns the resulting Step objects.
 *
 * SECURITY MODEL:
 * - Dangerous global APIs are deleted BEFORE any user code runs.
 * - User code executes via `new Function()`, NOT `eval()`, to prevent
 *   access to the worker's local scope variables.
 * - The only APIs available to user code are the sandbox runtime functions
 *   explicitly passed as arguments.
 *
 * ISOLATION GUARANTEE:
 * - User code CANNOT access: fetch, XMLHttpRequest, importScripts,
 *   WebSocket, EventSource, BroadcastChannel, indexedDB, caches, navigator.
 * - User code CAN access: Math, JSON, Array, Object, String, Number,
 *   Boolean, Map, Set, Date, RegExp, Error, console (captured).
 * - User code CAN access: the `step()` function and `utils` helper object
 *   injected by the sandbox runtime.
 *
 * THREADING:
 * - This file runs in its OWN thread, separate from the main UI thread.
 * - Communication is exclusively via `self.postMessage()` / `self.onmessage`.
 * - The main thread CAN terminate this worker at any time via `worker.terminate()`.
 *
 * @module sandbox-worker
 */

import type { SandboxRequest, SandboxResponse, SandboxError } from "./types";
import { createSandboxRuntime } from "./sandbox-runtime";

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 1: BLOCK DANGEROUS APIS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * List of global APIs to delete from the worker scope.
 *
 * RATIONALE for each:
 * - fetch / XMLHttpRequest / WebSocket / EventSource: prevent network access
 * - importScripts: prevent loading external scripts
 * - BroadcastChannel: prevent cross-tab communication
 * - indexedDB / caches: prevent persistent storage
 * - navigator: prevent fingerprinting and geolocation
 * - RTCPeerConnection / RTCDataChannel: prevent WebRTC network access
 */
const BLOCKED_APIS: string[] = [
  "fetch",
  "XMLHttpRequest",
  "WebSocket",
  "EventSource",
  "BroadcastChannel",
  "importScripts",
  "indexedDB",
  "caches",
  "navigator",
  "RTCPeerConnection",
  "RTCDataChannel",
];

for (const api of BLOCKED_APIS) {
  try {
    Object.defineProperty(self, api, {
      value: undefined,
      writable: false,
      configurable: false,
    });
  } catch {
    // Some APIs may not exist in all worker environments. That's fine —
    // if it doesn't exist, it can't be abused.
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 2: MESSAGE HANDLER
// ═══════════════════════════════════════════════════════════════════════════

self.onmessage = (event: MessageEvent<SandboxRequest>) => {
  const request = event.data;

  if (request.type !== "execute") {
    postResponse({
      type: "error",
      error: {
        kind: "internal",
        message: `Unknown request type: ${(request as unknown as Record<string, unknown>).type}`,
      },
    });
    return;
  }

  executeUserCode(request);
};

/**
 * Execute user-submitted code in the sandbox runtime.
 *
 * This function:
 * 1. Creates the sandbox runtime (step function + utils).
 * 2. Wraps user code in `new Function()` to isolate scope.
 * 3. Executes the function with a timeout.
 * 4. Validates and returns the resulting steps.
 */
function executeUserCode(request: SandboxRequest & { type: "execute" }): void {
  const { code, timeout, maxSteps, maxStateSizeBytes } = request;
  const startTime = performance.now();

  const runtime = createSandboxRuntime({
    maxSteps: maxSteps,
    maxStateSizeBytes: maxStateSizeBytes,
  });

  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    runtime.terminate();
    postResponse({
      type: "error",
      error: {
        kind: "timeout",
        message:
          `Execution timed out after ${timeout}ms. ` +
          `Your code may contain an infinite loop, or the algorithm may be ` +
          `too complex for the given input size. Try reducing the input or ` +
          `adding fewer steps.`,
        timeout,
      },
    });
  }, timeout);

  try {
    // `new Function(argNames..., body)` creates a function whose scope is
    // the GLOBAL scope (the worker), not the local scope of this file.
    // This means user code cannot access `runtime`, `request`, `timeoutId`,
    // or any other local variables.
    const sandboxedFn = new Function("step", "utils", "console", code);

    sandboxedFn(runtime.step, runtime.utils, runtime.console);

    clearTimeout(timeoutId);

    if (timedOut) {
      return;
    }

    const steps = runtime.getSteps();

    if (steps.length === 0) {
      postResponse({
        type: "error",
        error: {
          kind: "validation",
          message:
            "Your code did not produce any steps. " +
            "Call step({ ... }) at least once to create a visualization step.",
        },
      });
      return;
    }

    const lastStep = steps[steps.length - 1]!;
    if (!lastStep.isTerminal) {
      postResponse({
        type: "error",
        error: {
          kind: "validation",
          message:
            "The last step must have isTerminal: true. " +
            "Add `isTerminal: true` to your final step() call to indicate " +
            "the algorithm has finished.",
        },
      });
      return;
    }

    for (let i = 0; i < steps.length - 1; i++) {
      if (steps[i]!.isTerminal) {
        postResponse({
          type: "error",
          error: {
            kind: "validation",
            message:
              `Step ${i} has isTerminal: true, but it is not the last step ` +
              `(total steps: ${steps.length}). Only the final step may be terminal.`,
          },
        });
        return;
      }
    }

    const totalSize = runtime.getTotalStateSizeBytes();
    const MAX_TOTAL_SIZE = 10 * 1024 * 1024;
    if (totalSize > MAX_TOTAL_SIZE) {
      postResponse({
        type: "error",
        error: {
          kind: "validation",
          message:
            `Total step data size (${(totalSize / 1024 / 1024).toFixed(2)} MB) ` +
            `exceeds the 10 MB limit. Reduce the amount of data stored in step states.`,
        },
      });
      return;
    }

    const executionTimeMs = performance.now() - startTime;

    postResponse({
      type: "steps",
      steps,
      executionTimeMs,
    });
  } catch (error) {
    clearTimeout(timeoutId);

    if (timedOut) {
      return;
    }

    const sandboxError = parseSandboxError(error);
    postResponse({
      type: "error",
      error: sandboxError,
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/** Type-safe wrapper around self.postMessage. */
function postResponse(response: SandboxResponse): void {
  self.postMessage(response);
}

/**
 * Parse a thrown error into a SandboxError with user-friendly messaging.
 *
 * Extracts line/column information from the error stack trace when possible.
 * `new Function()` errors report line numbers relative to the function body.
 * Since the function body IS the user's code, line numbers map directly
 * to editor line numbers (no offset correction needed).
 */
function parseSandboxError(error: unknown): SandboxError {
  if (error instanceof SyntaxError) {
    const lineInfo = extractLineFromStack((error as Error).stack);
    return {
      kind: "syntax",
      message: error.message,
      name: error.name,
      line: lineInfo?.line,
      column: lineInfo?.column,
      stack: error.stack,
    };
  }
  if (error instanceof Error) {
    // Check if this is a sandbox-internal termination signal.
    if (error.message === "__SANDBOX_TERMINATED__") {
      return {
        kind: "timeout",
        message: "Execution was terminated due to timeout.",
      };
    }

    const lineInfo = extractLineFromStack(error.stack);
    return {
      kind: "runtime",
      message: error.message,
      name: error.name,
      line: lineInfo?.line,
      column: lineInfo?.column,
      stack: error.stack,
    };
  }
  return {
    kind: "runtime",
    message: String(error),
  };
}

/**
 * Extract line and column numbers from an error stack trace.
 *
 * Stack traces from `new Function()` typically contain entries like:
 *   "at anonymous (eval at executeUserCode (...), <anonymous>:3:10)"
 *
 * We look for the `<anonymous>:LINE:COL` pattern.
 *
 * BROWSER DIFFERENCES:
 * - Chrome/Edge: `<anonymous>:LINE:COL`
 * - Firefox: `Function:LINE:COL`
 * - Safari: varies — best-effort parsing
 *
 * @returns null if the pattern is not found (graceful degradation).
 */
function extractLineFromStack(stack: string | undefined): { line: number; column: number } | null {
  if (!stack) return null;

  // Pattern 1: Chrome/Edge — "<anonymous>:LINE:COL"
  const chromeMatch = stack.match(/<anonymous>:(\d+):(\d+)/);
  if (chromeMatch) {
    return {
      line: parseInt(chromeMatch[1]!, 10),
      column: parseInt(chromeMatch[2]!, 10),
    };
  }

  // Pattern 2: Firefox — "Function:LINE:COL"
  const firefoxMatch = stack.match(/Function:(\d+):(\d+)/);
  if (firefoxMatch) {
    return {
      line: parseInt(firefoxMatch[1]!, 10),
      column: parseInt(firefoxMatch[2]!, 10),
    };
  }

  // Pattern 3: Generic fallback — any ":LINE:COL" at end of a line
  const genericMatch = stack.match(/:(\d+):(\d+)\)?$/m);
  if (genericMatch) {
    return {
      line: parseInt(genericMatch[1]!, 10),
      column: parseInt(genericMatch[2]!, 10),
    };
  }

  return null;
}
