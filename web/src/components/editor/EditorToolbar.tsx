/**
 * @fileoverview Editor Toolbar
 *
 * The top toolbar of the custom algorithm editor. Contains:
 * - Run button (executes user code)
 * - Layout selector (dropdown to choose rendering layout)
 * - Templates button (opens the template drawer)
 * - Share button (copies share URL to clipboard)
 *
 * KEYBOARD SHORTCUTS (documented in tooltip):
 * - Ctrl/Cmd + Enter: Run code (handled by MonacoEditor)
 * - Ctrl/Cmd + Shift + T: Open templates
 * - Ctrl/Cmd + Shift + S: Share
 *
 * @module EditorToolbar
 */

"use client";

import { useState, useCallback } from "react";
import { LayoutSelector } from "./LayoutSelector";

// ─── Props ────────────────────────────────────────────────────────────────

export interface EditorToolbarProps {
  /** Whether code is currently executing. */
  isRunning: boolean;
  /** Execution time of the last run in ms (null if not yet run). */
  executionTimeMs: number | null;
  /** Number of steps produced by the last run. */
  stepCount: number | null;
  /** Current layout ID. */
  layoutId: string;
  /** Called when Run is clicked. */
  onRun: () => void;
  /** Called when layout changes. */
  onLayoutChange: (layoutId: string) => void;
  /** Called when Templates button is clicked. */
  onOpenTemplates: () => void;
  /** Called when Share is clicked. Returns the share URL for the toast. */
  onShare: () => string;
}

// ─── Component ────────────────────────────────────────────────────────────

export function EditorToolbar({
  isRunning,
  executionTimeMs,
  stepCount,
  layoutId,
  onRun,
  onLayoutChange,
  onOpenTemplates,
  onShare,
}: EditorToolbarProps) {
  const [showCopied, setShowCopied] = useState(false);

  const handleShare = useCallback(async () => {
    const url = onShare();
    try {
      await navigator.clipboard.writeText(url);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch {
      // Fallback: prompt the user to copy manually.
      window.prompt("Copy this URL to share:", url);
    }
  }, [onShare]);

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm">
      {/* ── Run Button ──────────────────────────────────────────── */}
      <button
        type="button"
        onClick={onRun}
        disabled={isRunning}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
          isRunning
            ? "bg-slate-700 text-slate-400 cursor-not-allowed"
            : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm shadow-cyan-500/20"
        }`}
        title="Run code (Ctrl+Enter)"
        aria-label={isRunning ? "Running code..." : "Run code"}
      >
        {isRunning ? (
          <>
            <div className="w-3.5 h-3.5 border-2 border-slate-500 border-t-slate-300 rounded-full animate-spin" />
            Running...
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Run
          </>
        )}
      </button>

      {/* ── Execution Info ──────────────────────────────────────── */}
      {executionTimeMs != null && !isRunning && (
        <span className="text-xs text-slate-500 font-mono">
          {executionTimeMs.toFixed(0)}ms
          {stepCount != null && ` · ${stepCount} steps`}
        </span>
      )}

      {/* ── Spacer ─────────────────────────────────────────────── */}
      <div className="flex-1" />

      {/* ── Layout Selector ────────────────────────────────────── */}
      <LayoutSelector selectedLayoutId={layoutId} onSelect={onLayoutChange} />

      {/* ── Divider ────────────────────────────────────────────── */}
      <div className="w-px h-5 bg-slate-700" />

      {/* ── Templates Button ───────────────────────────────────── */}
      <button
        type="button"
        onClick={onOpenTemplates}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm text-slate-300 hover:text-text-primary hover:bg-slate-800/50 transition-colors"
        title="Browse templates (Ctrl+Shift+T)"
        aria-label="Open template library"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
          />
        </svg>
        Templates
      </button>

      {/* ── Share Button ────────────────────────────────────────── */}
      <button
        type="button"
        onClick={handleShare}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm text-slate-300 hover:text-text-primary hover:bg-slate-800/50 transition-colors relative"
        title="Copy share URL (Ctrl+Shift+S)"
        aria-label="Share algorithm"
      >
        {showCopied ? (
          <>
            <svg
              className="w-4 h-4 text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-emerald-400">Copied!</span>
          </>
        ) : (
          <>
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
              />
            </svg>
            Share
          </>
        )}
      </button>
    </div>
  );
}
