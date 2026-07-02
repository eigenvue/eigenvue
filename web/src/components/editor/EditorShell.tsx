/**
 * @fileoverview Editor Shell — Top-Level Layout Composition
 *
 * Composes all editor sub-components into the full editor experience.
 *
 * LAYOUT (desktop, >=1024px):
 * +----------------------------------------------------------+
 * | EditorToolbar (Run | Layout Selector | Templates | Share) |
 * +---------------------------+------------------------------+
 * |                           |                              |
 * |   MonacoEditor            |   VisualizationPanel         |
 * |   (code editing)          |   (canvas rendering)         |
 * |                           |                              |
 * |                           |   OR ErrorPanel              |
 * |                           |   (if execution failed)      |
 * |                           +------------------------------+
 * |                           |   ExplanationPanel           |
 * |                           |   + StateInspector           |
 * +---------------------------+------------------------------+
 * | PlaybackControls (play/pause/step/speed/scrub)           |
 * +----------------------------------------------------------+
 *
 * LAYOUT (mobile, <768px):
 * Tabbed interface:
 *   Tab 1: MonacoEditor (full width)
 *   Tab 2: Visualization + Explanation
 *
 * @module EditorShell
 */

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useEditorState } from "@/hooks/useEditorState";
import { usePlayback } from "@/hooks/usePlayback";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { MonacoEditor } from "./MonacoEditor";
import { EditorToolbar } from "./EditorToolbar";
import { ErrorPanel } from "./ErrorPanel";
import { TemplateDrawer } from "./TemplateDrawer";
import { VisualizationPanel } from "@/engine/VisualizationPanel";
import { PlaybackControls } from "@/components/visualizer/PlaybackControls";
import { ExplanationPanel } from "@/components/visualizer/ExplanationPanel";
import { StateInspector } from "@/components/visualizer/StateInspector";
import type { AlgorithmTemplate } from "@/engine/sandbox/templates";
import type { AlgorithmMeta } from "@/lib/algorithm-loader";

// Default meta for custom algorithms (ExplanationPanel requires AlgorithmMeta).
const EDITOR_ALGORITHM_META: AlgorithmMeta = {
  id: "custom-algorithm",
  name: "Custom Algorithm",
  description: {
    short: "Custom algorithm written in the editor.",
    long: "This algorithm was created using the Eigenvue Custom Algorithm Editor. Write JavaScript code using the step() function to create visualizations.",
  },
  category: "classical",
  complexity: { time: "User-defined", space: "User-defined", level: "beginner" },
  visual: {
    layout: "array-with-pointers",
    theme: { primary: "#38bdf8", secondary: "#0ea5e9" },
    components: {},
  },
  inputs: { schema: {}, defaults: {}, examples: [] },
  code: { implementations: {}, defaultLanguage: "javascript" },
  education: { keyConcepts: [], pitfalls: [], quiz: [], resources: [] },
  seo: {
    keywords: ["custom", "algorithm", "editor"],
    ogDescription: "Custom algorithm created in the Eigenvue editor.",
  },
  prerequisites: [],
  related: [],
  author: "User",
  version: "1.0.0",
};

// ─── Mobile Tab Selector ─────────────────────────────────────────────────

type MobileTab = "code" | "preview";

// ─── Component ────────────────────────────────────────────────────────────

export function EditorShell() {
  const [state, actions] = useEditorState();
  const totalSteps = state.steps?.length ?? 0;
  const [playback, playbackControls] = usePlayback(totalSteps);
  // Honour the OS-level "reduce motion" setting for the canvas animation.
  const prefersReducedMotion = useReducedMotion();
  const [isTemplateDrawerOpen, setIsTemplateDrawerOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("code");
  const [splitPercent, setSplitPercent] = useState(() => {
    if (typeof window === "undefined") return 50;
    const stored = localStorage.getItem("eigenvue-editor-split");
    return stored ? parseInt(stored, 10) : 50;
  });

  const isDraggingRef = useRef(false);
  const shellRef = useRef<HTMLDivElement>(null);

  // Reset playback when steps change.
  useEffect(() => {
    if (state.steps && state.steps.length > 0) {
      playbackControls.reset();
    }
  }, [state.steps, playbackControls]);

  // ─── Template Selection ─────────────────────────────────────────

  const handleTemplateSelect = useCallback(
    (template: AlgorithmTemplate) => {
      actions.loadTemplate(template.id);
    },
    [actions],
  );

  // ─── Keyboard Shortcuts ─────────────────────────────────────────

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ctrl/Cmd + Shift + T: Open templates
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "T") {
        e.preventDefault();
        setIsTemplateDrawerOpen((prev) => !prev);
      }
      // Ctrl/Cmd + Shift + S: Share
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "S") {
        e.preventDefault();
        const url = actions.getShareUrl();
        navigator.clipboard.writeText(url).catch(() => {
          window.prompt("Copy this URL to share:", url);
        });
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [actions]);

  // ─── Resizable Split ───────────────────────────────────────────

  const handleMouseDown = useCallback(() => {
    isDraggingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!isDraggingRef.current || !shellRef.current) return;

      const rect = shellRef.current.getBoundingClientRect();
      const percent = ((e.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.max(30, Math.min(70, percent));
      setSplitPercent(clamped);
    }

    function handleMouseUp() {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        localStorage.setItem("eigenvue-editor-split", splitPercent.toString());
      }
    }

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [splitPercent]);

  // ─── Current Step Data ─────────────────────────────────────────

  const currentStep =
    state.steps && state.steps.length > 0 ? (state.steps[playback.currentIndex] ?? null) : null;

  const currentState = currentStep?.state ?? null;

  // ─── Error Info for Monaco ─────────────────────────────────────

  const monacoError =
    state.error && state.error.line
      ? {
          line: state.error.line,
          column: state.error.column,
          message: state.error.message,
        }
      : null;

  // ─── Render ────────────────────────────────────────────────────

  return (
    <div ref={shellRef} className="flex flex-col h-[calc(100vh-64px)]">
      {/* Toolbar */}
      <EditorToolbar
        isRunning={state.isRunning}
        executionTimeMs={state.executionTimeMs}
        stepCount={state.steps?.length ?? null}
        layoutId={state.layoutId}
        onRun={actions.run}
        onLayoutChange={actions.setLayoutId}
        onOpenTemplates={() => setIsTemplateDrawerOpen(true)}
        onShare={actions.getShareUrl}
      />

      {/* ── Mobile Tab Bar ──────────────────────────────────────── */}
      <div className="flex md:hidden border-b border-slate-800">
        <button
          type="button"
          className={`flex-1 py-2 text-sm font-medium text-center transition-colors ${
            mobileTab === "code" ? "text-cyan-400 border-b-2 border-cyan-400" : "text-slate-400"
          }`}
          onClick={() => setMobileTab("code")}
        >
          Code
        </button>
        <button
          type="button"
          className={`flex-1 py-2 text-sm font-medium text-center transition-colors ${
            mobileTab === "preview" ? "text-cyan-400 border-b-2 border-cyan-400" : "text-slate-400"
          }`}
          onClick={() => setMobileTab("preview")}
        >
          Preview
        </button>
      </div>

      {/* ── Main Content ────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Editor Panel (desktop: left split, mobile: tab 1) ── */}
        <div
          className={`overflow-hidden ${mobileTab === "code" ? "flex" : "hidden"} md:flex flex-col`}
          style={{ width: `${splitPercent}%` }}
        >
          <MonacoEditor
            value={state.code}
            onChange={actions.setCode}
            error={monacoError}
            readOnly={state.isRunning}
            onRun={actions.run}
          />
        </div>

        {/* ── Resizable Divider (desktop only) ──────────────── */}
        <div
          className="hidden md:flex items-center justify-center w-1 cursor-col-resize bg-slate-800 hover:bg-cyan-500/30 transition-colors group"
          onMouseDown={handleMouseDown}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize editor panels"
          tabIndex={0}
        >
          <div className="w-0.5 h-8 bg-slate-600 group-hover:bg-cyan-400 rounded-full transition-colors" />
        </div>

        {/* ── Preview Panel (desktop: right split, mobile: tab 2) ─ */}
        <div
          className={`overflow-hidden ${
            mobileTab === "preview" ? "flex" : "hidden"
          } md:flex flex-col flex-1`}
        >
          {/* Visualization or Error */}
          <div className="flex-1 min-h-0 relative">
            {state.error ? (
              <ErrorPanel error={state.error} onDismiss={actions.clearError} />
            ) : state.steps && state.steps.length > 0 ? (
              <VisualizationPanel
                steps={state.steps}
                currentStep={playback.currentIndex}
                layoutName={state.layoutId}
                animationDurationMs={prefersReducedMotion ? 0 : undefined}
                className="h-full"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
                <div className="text-center">
                  <svg
                    className="w-12 h-12 mx-auto mb-3 text-slate-700"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-sm font-medium">
                    Click <span className="text-cyan-400">Run</span> or press{" "}
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-xs font-mono">
                      Ctrl+Enter
                    </kbd>{" "}
                    to visualize
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Explanation + State Inspector (only when steps are available) */}
          {state.steps && state.steps.length > 0 && !state.error && (
            <div className="h-[200px] min-h-[150px] border-t border-slate-800 flex">
              <div className="flex-1 overflow-hidden">
                <ExplanationPanel
                  currentStep={currentStep}
                  totalSteps={totalSteps}
                  meta={EDITOR_ALGORITHM_META}
                />
              </div>
              <div className="w-px bg-slate-800" />
              <div className="w-[280px] overflow-hidden">
                <StateInspector state={currentState as Record<string, unknown> | null} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Playback Controls ───────────────────────────────────── */}
      {state.steps && state.steps.length > 0 && !state.error && (
        <div className="border-t border-slate-800 bg-slate-900/50">
          <PlaybackControls state={playback} controls={playbackControls} totalSteps={totalSteps} />
        </div>
      )}

      {/* ── Template Drawer ─────────────────────────────────────── */}
      <TemplateDrawer
        isOpen={isTemplateDrawerOpen}
        onClose={() => setIsTemplateDrawerOpen(false)}
        onSelect={handleTemplateSelect}
      />
    </div>
  );
}
