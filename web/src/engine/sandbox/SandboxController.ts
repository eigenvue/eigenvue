/**
 * @fileoverview Sandbox Controller
 *
 * Main-thread interface for the sandbox Web Worker.
 * Manages worker lifecycle, sends execution requests, receives results,
 * and implements the watchdog timeout for force-killing hung workers.
 *
 * LIFECYCLE:
 *   const controller = new SandboxController();
 *   controller.execute(code).then(steps => { ... }).catch(error => { ... });
 *   controller.dispose(); // Clean up when the editor unmounts.
 *
 * WORKER RECOVERY:
 * If a worker is force-terminated (timeout), the controller automatically
 * creates a fresh worker for the next execution. The caller does not need
 * to handle worker recycling.
 *
 * CONCURRENCY:
 * Only one execution can be in-flight at a time. Calling execute() while
 * a previous execution is still running will terminate the previous
 * execution and start the new one.
 *
 * @module SandboxController
 */

import type {
  SandboxRequest,
  SandboxResponse,
  SandboxExecutionResult,
  SandboxError,
  SandboxOptions,
} from "./types";

/** Default configuration values. */
const DEFAULTS: Required<SandboxOptions> = {
  timeout: 5_000,
  maxSteps: 500,
  maxStateSizeBytes: 1_048_576,
  watchdogGraceMs: 1_000,
};

export class SandboxController {
  /** The current Web Worker instance. Recreated after force-termination. */
  private worker: Worker | null = null;

  /** Path to the worker script. Resolved at construction time. */
  private readonly workerUrl: string | URL;

  /** Whether the controller has been disposed. */
  private disposed = false;

  /** The promise resolve/reject for the current in-flight execution. */
  private pendingResolve: ((result: SandboxExecutionResult) => void) | null = null;
  private pendingReject: ((error: SandboxError) => void) | null = null;

  /** Watchdog timer ID for force-killing hung workers. */
  private watchdogTimerId: ReturnType<typeof setTimeout> | null = null;

  /** Current execution options (updated per execute() call). */
  private options: Required<SandboxOptions> = { ...DEFAULTS };

  /**
   * @param workerUrl - URL to the compiled sandbox-worker.js file.
   *   In Next.js, this is typically resolved via `new URL('./sandbox-worker.ts', import.meta.url)`.
   */
  constructor(workerUrl?: string | URL) {
    this.workerUrl = workerUrl ?? new URL("./sandbox-worker.ts", import.meta.url);
  }

  /**
   * Execute user code in the sandbox.
   *
   * @param code - The user's JavaScript code (function body).
   * @param options - Optional overrides for timeout, maxSteps, etc.
   * @returns A promise that resolves with the execution result (steps + timing),
   *          or rejects with a SandboxError.
   *
   * @throws {Error} If the controller has been disposed.
   */
  async execute(code: string, options?: Partial<SandboxOptions>): Promise<SandboxExecutionResult> {
    if (this.disposed) {
      throw new Error("SandboxController has been disposed.");
    }

    this.cancelPending("Execution cancelled: new execution started.");
    this.options = { ...DEFAULTS, ...options };
    this.ensureWorker();

    return new Promise<SandboxExecutionResult>((resolve, reject) => {
      this.pendingResolve = resolve;
      this.pendingReject = reject;

      const watchdogTimeout = this.options.timeout + this.options.watchdogGraceMs;
      this.watchdogTimerId = setTimeout(() => {
        this.handleWatchdogTimeout();
      }, watchdogTimeout);

      const request: SandboxRequest = {
        type: "execute",
        code,
        timeout: this.options.timeout,
        maxSteps: this.options.maxSteps,
        maxStateSizeBytes: this.options.maxStateSizeBytes,
      };

      this.worker!.postMessage(request);
    });
  }

  /**
   * Dispose the controller and terminate the worker.
   * After calling dispose(), the controller cannot be used again.
   */
  dispose(): void {
    this.disposed = true;
    this.cancelPending("SandboxController disposed.");
    this.terminateWorker();
  }

  /** Check if the controller has been disposed. */
  get isDisposed(): boolean {
    return this.disposed;
  }

  // ─── Private Methods ────────────────────────────────────────────────

  /** Ensure the worker is created and has a message handler attached. */
  private ensureWorker(): void {
    if (this.worker) return;

    this.worker = new Worker(this.workerUrl, { type: "module" });
    this.worker.onmessage = (event: MessageEvent<SandboxResponse>) => {
      this.handleWorkerMessage(event.data);
    };
    this.worker.onerror = (event: ErrorEvent) => {
      this.handleWorkerError(event);
    };
  }

  /** Handle a message from the worker. */
  private handleWorkerMessage(response: SandboxResponse): void {
    this.clearWatchdog();

    if (response.type === "steps") {
      this.pendingResolve?.({
        steps: response.steps,
        executionTimeMs: response.executionTimeMs,
      });
    } else if (response.type === "error") {
      this.pendingReject?.(response.error);
    }

    this.pendingResolve = null;
    this.pendingReject = null;
  }

  /**
   * Handle the watchdog timeout firing.
   * Force-terminate the worker and report a timeout error.
   */
  private handleWatchdogTimeout(): void {
    this.watchdogTimerId = null;
    this.terminateWorker();

    const error: SandboxError = {
      kind: "timeout",
      message:
        `Execution timed out and the worker was force-terminated. ` +
        `Your code likely contains a tight infinite loop that never calls step(). ` +
        `Check for while(true) or for-loops without proper exit conditions.`,
      timeout: this.options.timeout,
    };

    this.pendingReject?.(error);
    this.pendingResolve = null;
    this.pendingReject = null;
  }

  /**
   * Handle a worker-level error (script load failure, etc.).
   * Terminates the broken worker so a fresh one is created on next execute().
   */
  private handleWorkerError(event: ErrorEvent): void {
    this.clearWatchdog();
    this.terminateWorker();

    const error: SandboxError = {
      kind: "internal",
      message: `Worker error: ${event.message}`,
    };

    this.pendingReject?.(error);
    this.pendingResolve = null;
    this.pendingReject = null;
  }

  /**
   * Cancel any pending execution.
   *
   * Terminates the current worker to prevent stale responses from the
   * old execution arriving and incorrectly resolving/rejecting the
   * new execution's promise. A fresh worker is created on next execute().
   */
  private cancelPending(reason: string): void {
    this.clearWatchdog();
    if (this.pendingReject) {
      this.pendingReject({ kind: "cancelled", message: reason });
    }
    this.pendingResolve = null;
    this.pendingReject = null;
    // Terminate the old worker so its in-flight response cannot arrive
    // after a new execution's promise callbacks are installed.
    this.terminateWorker();
  }

  /** Clear the watchdog timer. */
  private clearWatchdog(): void {
    if (this.watchdogTimerId !== null) {
      clearTimeout(this.watchdogTimerId);
      this.watchdogTimerId = null;
    }
  }

  /** Terminate the current worker. */
  private terminateWorker(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
