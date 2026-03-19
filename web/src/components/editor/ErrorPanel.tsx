/**
 * @fileoverview Error Panel
 *
 * Displays sandbox execution errors with clear, actionable messages.
 * Replaces the VisualizationPanel when an error is present.
 *
 * ERROR DISPLAY BY KIND:
 *
 * "syntax" — Show the error message, highlight the line in the editor.
 *   Icon: red exclamation circle.
 *   Suggestion: "Check for missing brackets, semicolons, or typos."
 *
 * "runtime" — Show the error name + message, highlight the line.
 *   Icon: red bug icon.
 *   Suggestion: Depends on error type.
 *
 * "timeout" — Show the timeout duration and suggestions.
 *   Icon: orange clock icon.
 *   Suggestion: "Your code took too long. Check for infinite loops."
 *
 * "validation" — Show which validation rule was violated.
 *   Icon: yellow warning triangle.
 *   Suggestion: Context-specific.
 *
 * @module ErrorPanel
 */

"use client";

import type { SandboxError } from "@/engine/sandbox/types";

// ─── Props ────────────────────────────────────────────────────────────────

export interface ErrorPanelProps {
  /** The error to display. */
  error: SandboxError;
  /** Called when the user dismisses the error. */
  onDismiss: () => void;
}

// ─── Error Kind Config ────────────────────────────────────────────────────

interface ErrorKindConfig {
  icon: React.ReactNode;
  label: string;
  borderColor: string;
  bgColor: string;
  getSuggestion: (error: SandboxError) => string;
}

function getErrorKindConfig(kind: SandboxError["kind"]): ErrorKindConfig {
  switch (kind) {
    case "syntax":
      return {
        icon: (
          <svg
            className="w-5 h-5 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        ),
        label: "Syntax Error",
        borderColor: "border-red-500/50",
        bgColor: "bg-red-500/5",
        getSuggestion: () =>
          "Check for missing brackets, semicolons, or typos. Make sure all strings and template literals are properly closed.",
      };
    case "runtime":
      return {
        icon: (
          <svg
            className="w-5 h-5 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
        label: "Runtime Error",
        borderColor: "border-red-500/50",
        bgColor: "bg-red-500/5",
        getSuggestion: (error) => {
          if (error.name === "TypeError") {
            return "Check that variables are defined and used correctly. A common cause is accessing a property on `undefined` or `null`.";
          }
          if (error.name === "RangeError") {
            return "Check for invalid array indices or excessive recursion depth.";
          }
          if (error.name === "ReferenceError") {
            return "A variable or function name is misspelled or not defined. Remember that `step`, `utils`, and `console` are available.";
          }
          return "Review the error message and check the highlighted line in the editor.";
        },
      };
    case "timeout":
      return {
        icon: (
          <svg
            className="w-5 h-5 text-amber-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
        label: "Timeout",
        borderColor: "border-amber-500/50",
        bgColor: "bg-amber-500/5",
        getSuggestion: (error) =>
          `Your code exceeded the ${error.timeout ? `${(error.timeout / 1000).toFixed(0)}s` : ""} time limit. ` +
          "Common causes: `while(true)` without a break condition, for-loops with incorrect bounds, or very large input sizes.",
      };
    case "validation":
      return {
        icon: (
          <svg
            className="w-5 h-5 text-yellow-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        ),
        label: "Validation Error",
        borderColor: "border-yellow-500/50",
        bgColor: "bg-yellow-500/5",
        getSuggestion: (error) => {
          const msg = error.message.toLowerCase();
          if (msg.includes("terminal")) {
            return "Add `isTerminal: true` to your last step() call to mark it as the final step.";
          }
          if (msg.includes("empty") || msg.includes("no steps")) {
            return "Your code must call step() at least once to produce a visualization.";
          }
          return "Check the error message for details about which validation rule was violated.";
        },
      };
    case "cancelled":
      return {
        icon: (
          <svg
            className="w-5 h-5 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ),
        label: "Cancelled",
        borderColor: "border-slate-500/50",
        bgColor: "bg-slate-500/5",
        getSuggestion: () => "The previous execution was cancelled because a new one was started.",
      };
    case "internal":
    default:
      return {
        icon: (
          <svg
            className="w-5 h-5 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
        label: "Internal Error",
        borderColor: "border-red-500/50",
        bgColor: "bg-red-500/5",
        getSuggestion: () =>
          "This is an unexpected error in the sandbox. Please try again or report this issue.",
      };
  }
}

// ─── Component ────────────────────────────────────────────────────────────

export function ErrorPanel({ error, onDismiss }: ErrorPanelProps) {
  const config = getErrorKindConfig(error.kind);

  return (
    <div
      className={`flex flex-col h-full ${config.bgColor} border-l-4 ${config.borderColor} overflow-y-auto`}
      role="alert"
      aria-live="assertive"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          {config.icon}
          <h3 className="text-sm font-semibold text-text-primary">{error.name ?? config.label}</h3>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded hover:bg-slate-700/50 transition-colors text-slate-400 hover:text-slate-200"
          aria-label="Dismiss error"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Error Message */}
      <div className="p-4 space-y-4">
        <div className="font-mono text-sm text-red-300 bg-slate-900/60 rounded-md p-3 whitespace-pre-wrap break-words">
          {error.message}
        </div>

        {/* Line/Column */}
        {error.line != null && (
          <div className="text-xs text-slate-400">
            at line {error.line}
            {error.column != null && `, column ${error.column}`}
          </div>
        )}

        {/* Suggestion */}
        <div className="rounded-md bg-slate-800/50 p-3">
          <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1.5">
            Suggestion
          </h4>
          <p className="text-sm text-slate-300 leading-relaxed">{config.getSuggestion(error)}</p>
        </div>

        {/* Stack Trace (collapsible) */}
        {error.stack && (
          <details className="group">
            <summary className="text-xs font-mono text-slate-500 cursor-pointer hover:text-slate-400">
              Stack Trace
            </summary>
            <pre className="mt-2 text-xs font-mono text-slate-500 bg-slate-900/40 rounded p-2 overflow-x-auto whitespace-pre-wrap">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
