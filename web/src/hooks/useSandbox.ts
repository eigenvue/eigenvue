/**
 * @fileoverview useSandbox — Sandbox lifecycle management hook.
 *
 * Manages the SandboxController lifecycle:
 * - Creates a single SandboxController instance per component lifecycle.
 * - Disposes the controller on unmount.
 * - Exposes execute() for running user code.
 * - Handles automatic cancellation of previous executions.
 *
 * @module useSandbox
 */

"use client";

import { useRef, useCallback, useEffect } from "react";
import { SandboxController } from "@/engine/sandbox/SandboxController";
import type { SandboxExecutionResult, SandboxError, SandboxOptions } from "@/engine/sandbox/types";

export interface UseSandboxReturn {
  /** Execute user code in the sandbox. */
  execute: (code: string, options?: SandboxOptions) => Promise<SandboxExecutionResult>;
  /** Cancel any pending execution. */
  cancel: () => void;
}

/**
 * Hook for managing the sandbox controller lifecycle.
 *
 * Creates a single SandboxController on mount and disposes it on unmount.
 * Each call to execute() cancels any previously pending execution.
 */
export function useSandbox(): UseSandboxReturn {
  const controllerRef = useRef<SandboxController | null>(null);

  // Lazily create the controller.
  function getController(): SandboxController {
    if (!controllerRef.current || controllerRef.current.isDisposed) {
      controllerRef.current = new SandboxController();
    }
    return controllerRef.current;
  }

  // Dispose on unmount.
  useEffect(() => {
    return () => {
      controllerRef.current?.dispose();
      controllerRef.current = null;
    };
  }, []);

  const execute = useCallback(
    async (code: string, options?: SandboxOptions): Promise<SandboxExecutionResult> => {
      const controller = getController();
      return controller.execute(code, options);
    },
    [],
  );

  const cancel = useCallback(() => {
    // Dispose and recreate to cancel any pending execution.
    controllerRef.current?.dispose();
    controllerRef.current = null;
  }, []);

  return { execute, cancel };
}

/**
 * Type guard for SandboxError objects.
 */
export function isSandboxError(value: unknown): value is SandboxError {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    "message" in value &&
    typeof (value as SandboxError).kind === "string" &&
    typeof (value as SandboxError).message === "string"
  );
}
