/**
 * @fileoverview Visualizer Shell — The complete algorithm visualizer UI.
 *
 * Layout:
 * ┌──────────────┬─────────────────────────────┬──────────────────┐
 * │  Code Panel   │   Visualization Canvas       │ Explanation Panel │
 * │  (left)       │   (center, from Phase 4)     │ (right)          │
 * │               │                              │ + State Inspector │
 * ├──────────────┴─────────────────────────────┴──────────────────┤
 * │                     Playback Controls                          │
 * ├───────────────────────────────────────────────────────────────-┤
 * │  Input Editor (collapsible)         │  Share Button            │
 * └───────────────────────────────────────────────────────────────-┘
 *
 * RESPONSIVE BEHAVIOR:
 * - Desktop (≥1024px): Three-column layout as shown above.
 * - Tablet (768–1023px): Code panel collapses to a tab; two-column layout.
 * - Mobile (<768px): Single column, stacked vertically.
 *
 * STATE FLOW:
 * 1. On mount: parse URL params → determine inputs → run generator → get steps.
 * 2. Steps flow into usePlayback → current step index.
 * 3. Current step flows into VisualizationPanel (canvas), CodePanel, ExplanationPanel.
 * 4. User actions (play, step, input change) update state → URL updates.
 *
 * DESIGN DECISION: Algorithm loading and step generation are delegated to
 * the useAlgorithm hook (deliverable #23). Playback state is managed by
 * usePlayback. This component composes both and wires them to the UI.
 */

"use client";

import { useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";

import type { AlgorithmMeta } from "@/lib/algorithm-loader";
import { parseUrlState, updateUrlState } from "@/lib/url-state";
import { useAlgorithm } from "@/hooks/useAlgorithm";
import { usePlayback } from "@/hooks/usePlayback";

// Phase 4 component:
// DESIGN DECISION: The Phase 4 VisualizationPanel uses `currentStep` prop (number index),
// not `currentIndex`. We adapt to its actual prop contract.
// See Phase4_Rendering_Engine_Core.md — VisualizationPanel component.
import { VisualizationPanel } from "@/engine/VisualizationPanel";

// Phase 5 components:
import { CodePanel } from "./CodePanel";
import { ExplanationPanel } from "./ExplanationPanel";
import { StateInspector } from "./StateInspector";
import { PlaybackControls } from "./PlaybackControls";
import { InputEditor } from "./InputEditor";
import { ShareButton } from "./ShareButton";

interface VisualizerShellProps {
  readonly algorithmId: string;
  readonly meta: AlgorithmMeta;
}

export function VisualizerShell({ algorithmId, meta }: VisualizerShellProps) {
  const searchParams = useSearchParams();

  // ── Parse URL state on mount ────────────────────────────────────────
  const urlState = useMemo(
    () =>
      parseUrlState(
        searchParams,
        meta.inputs.schema as Record<string, { type: string; items?: { type: string } }>,
      ),
    // Only parse on initial render — we don't want to re-parse on every
    // URL change (since we're the ones changing the URL via replaceState).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // ── Algorithm loading & step generation (useAlgorithm hook) ─────────
  const [algoState, algoControls] = useAlgorithm(algorithmId, meta, urlState);
  const { inputs, stepSequence, error: generatorError } = algoState;

  // ── Playback state ──────────────────────────────────────────────────
  const totalSteps = stepSequence?.steps.length ?? 0;

  const handleStepChange = useCallback(
    (index: number) => {
      updateUrlState(algorithmId, inputs, index, meta.inputs.defaults);
    },
    [algorithmId, inputs, meta.inputs.defaults],
  );

  const [playbackState, playbackControls] = usePlayback(
    totalSteps,
    urlState.stepIndex ?? 0,
    handleStepChange,
  );

  const currentStep = stepSequence?.steps[playbackState.currentIndex] ?? null;

  // ── Keyboard shortcuts ──────────────────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't capture shortcuts when user is typing in an input field.
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      switch (e.key) {
        case " ":
          e.preventDefault();
          playbackControls.togglePlay();
          break;
        case "ArrowRight":
          e.preventDefault();
          playbackControls.stepForward();
          break;
        case "ArrowLeft":
          e.preventDefault();
          playbackControls.stepBackward();
          break;
        case "Home":
          e.preventDefault();
          playbackControls.goToStep(0);
          break;
        case "End":
          e.preventDefault();
          playbackControls.goToStep(totalSteps - 1);
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [playbackControls, totalSteps]);

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] mt-16 p-4 gap-3">
      {/* ── Algorithm Title Bar ──────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">{meta.name}</h1>
          <p className="text-xs text-text-tertiary font-mono">
            {meta.complexity.time} time · {meta.complexity.space} space · {meta.complexity.level}
          </p>
        </div>
        <ShareButton
          algorithmId={algorithmId}
          inputs={inputs}
          stepIndex={playbackState.currentIndex}
        />
      </div>

      {/* ── Error Display ────────────────────────────────────────── */}
      {generatorError && (
        <div className="px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-md text-sm text-red-400">
          {generatorError}
        </div>
      )}

      {/* ── Three-Panel Layout ───────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[320px_1fr_320px] gap-3 min-h-0">
        {/* Left: Code Panel */}
        <div className="hidden lg:flex flex-col min-h-0">
          <CodePanel
            implementations={meta.code.implementations}
            defaultLanguage={meta.code.defaultLanguage}
            codeHighlight={currentStep?.codeHighlight ?? null}
          />
        </div>

        {/* Center: Visualization Canvas */}
        {/* ADAPTATION: Phase 4 VisualizationPanel uses `currentStep` prop (number),
            not `currentIndex`. See web/src/engine/VisualizationPanel.tsx line 34. */}
        <div className="flex flex-col min-h-0">
          <VisualizationPanel
            steps={stepSequence?.steps ? [...stepSequence.steps] : []}
            currentStep={playbackState.currentIndex}
            layoutName={meta.visual.layout}
            layoutConfig={meta.visual.components}
          />
        </div>

        {/* Right: Explanation + State Inspector */}
        <div className="hidden lg:flex flex-col gap-3 min-h-0">
          <div className="min-h-[200px] flex-shrink-0 overflow-y-auto max-h-[50%]">
            <ExplanationPanel currentStep={currentStep} totalSteps={totalSteps} meta={meta} />
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <StateInspector state={currentStep?.state ?? null} />
          </div>
        </div>
      </div>

      {/* ── Playback Controls ────────────────────────────────────── */}
      <PlaybackControls state={playbackState} controls={playbackControls} totalSteps={totalSteps} />

      {/* ── Input Editor (Collapsible) ───────────────────────────── */}
      <details className="mt-1">
        <summary className="text-xs font-mono text-text-tertiary cursor-pointer hover:text-text-secondary">
          Edit Inputs & Examples
        </summary>
        <div className="mt-2">
          <InputEditor meta={meta} currentInputs={inputs} onRun={algoControls.setInputs} />
        </div>
      </details>
    </div>
  );
}
