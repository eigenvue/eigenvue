/**
 * @fileoverview Editor State Management Hook
 *
 * Central state management for the custom algorithm editor.
 * This hook owns all mutable editor state and exposes actions
 * for the UI to call.
 *
 * STATE:
 *   code: string              — Current code in the editor.
 *   layoutId: string          — Selected layout ID.
 *   steps: Step[] | null      — Steps from the last successful execution, or null.
 *   error: SandboxError | null — Error from the last execution, or null.
 *   isRunning: boolean        — Whether code is currently being executed.
 *   executionTimeMs: number | null — Execution time of the last run.
 *
 * ACTIONS:
 *   setCode(code)             — Update the editor content.
 *   setLayoutId(id)           — Change the selected layout.
 *   run()                     — Execute the current code in the sandbox.
 *   loadTemplate(templateId)  — Load a template's code and layout.
 *   clearError()              — Dismiss the current error.
 *   reset()                   — Reset to blank state.
 *   getShareUrl()             — Generate a shareable URL for the current state.
 *
 * URL SYNC:
 * On mount, the hook reads URL search params:
 *   ?code=BASE64_ENCODED_CODE — Restores code from a shared URL.
 *   ?layout=LAYOUT_ID         — Restores the selected layout.
 *   ?template=TEMPLATE_ID     — Loads a specific template.
 *
 * INITIALIZATION PRIORITY:
 * 1. If ?code= is present -> use that code + ?layout= (or default layout).
 * 2. Else if ?template= is present -> load that template.
 * 3. Else -> load the blank template.
 *
 * @module useEditorState
 */

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import type { Step } from "@/shared/types/step";
import type { SandboxError } from "@/engine/sandbox/types";
import { getTemplateById, BLANK_TEMPLATE } from "@/engine/sandbox/templates";
import { decodeEditorState, encodeEditorState } from "@/lib/editor-url-state";
import { useSandbox, isSandboxError } from "./useSandbox";

// ─── Types ────────────────────────────────────────────────────────────────

export interface EditorState {
  code: string;
  layoutId: string;
  steps: Step[] | null;
  error: SandboxError | null;
  isRunning: boolean;
  executionTimeMs: number | null;
}

export interface EditorActions {
  setCode: (code: string) => void;
  setLayoutId: (id: string) => void;
  run: () => Promise<void>;
  loadTemplate: (templateId: string) => void;
  clearError: () => void;
  reset: () => void;
  getShareUrl: () => string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useEditorState(): [EditorState, EditorActions] {
  const searchParams = useSearchParams();
  const { execute } = useSandbox();
  const initializedRef = useRef(false);

  // ─── Initialize State from URL ───────────────────────────────────

  const [code, setCode] = useState(BLANK_TEMPLATE.code);
  const [layoutId, setLayoutId] = useState(BLANK_TEMPLATE.layoutId);
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [error, setError] = useState<SandboxError | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [executionTimeMs, setExecutionTimeMs] = useState<number | null>(null);

  // Read URL params on mount.
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // Priority 1: ?code= present — decode shared state.
    const decoded = decodeEditorState(searchParams);
    if (decoded && searchParams.has("code")) {
      setCode(decoded.code);
      setLayoutId(decoded.layoutId);
      return;
    }

    // Priority 2: ?template= present — load that template.
    const templateId = searchParams.get("template");
    if (templateId) {
      const template = getTemplateById(templateId);
      if (template) {
        setCode(template.code);
        setLayoutId(template.layoutId);
        return;
      }
    }

    // Priority 3: Default — blank template (already set in initial state).
  }, [searchParams]);

  // ─── Actions ─────────────────────────────────────────────────────

  const run = useCallback(async () => {
    setIsRunning(true);
    setError(null);

    try {
      const result = await execute(code, {
        timeout: 5000,
        maxSteps: 500,
        maxStateSizeBytes: 1_048_576,
      });
      setSteps(result.steps);
      setExecutionTimeMs(result.executionTimeMs);
      setError(null);
    } catch (err: unknown) {
      if (isSandboxError(err)) {
        setError(err);
      } else {
        setError({
          kind: "internal",
          message: err instanceof Error ? err.message : "An unexpected error occurred.",
        });
      }
      setSteps(null);
      setExecutionTimeMs(null);
    } finally {
      setIsRunning(false);
    }
  }, [code, execute]);

  const loadTemplate = useCallback((templateId: string) => {
    const template = getTemplateById(templateId);
    if (!template) return;

    setCode(template.code);
    setLayoutId(template.layoutId);
    setSteps(null);
    setError(null);
    setExecutionTimeMs(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setCode(BLANK_TEMPLATE.code);
    setLayoutId(BLANK_TEMPLATE.layoutId);
    setSteps(null);
    setError(null);
    setExecutionTimeMs(null);
  }, []);

  const getShareUrl = useCallback(() => {
    const params = encodeEditorState(code, layoutId);
    const base = typeof window !== "undefined" ? `${window.location.origin}/editor` : "/editor";
    return `${base}?${params.toString()}`;
  }, [code, layoutId]);

  // ─── Return ──────────────────────────────────────────────────────

  const state: EditorState = {
    code,
    layoutId,
    steps,
    error,
    isRunning,
    executionTimeMs,
  };

  const actions: EditorActions = {
    setCode,
    setLayoutId,
    run,
    loadTemplate,
    clearError,
    reset,
    getShareUrl,
  };

  return [state, actions];
}
