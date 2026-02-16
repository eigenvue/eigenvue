// =============================================================================
// web/src/engine/VisualizationPanel.tsx
//
// React component that renders an algorithm visualization on a Canvas 2D.
// Receives a step array, current step index, and layout name.
//
// Responsibilities:
//   - Creates and manages the CanvasManager (DPI, resize).
//   - Creates and manages the AnimationManager (transitions).
//   - Resolves the layout function from the registry.
//   - Produces PrimitiveScenes from steps and feeds them to the engine.
//
// Props:
//   steps       - The full step array from the generator.
//   currentStep - The index of the current step to display.
//   layoutName  - The name of the layout (e.g., "array-with-pointers").
//   layoutConfig - Optional layout-specific configuration.
//   animationDurationMs - Duration of transitions in ms. Default: 400.
//   className   - Optional CSS class for the wrapper div.
// =============================================================================

"use client";

import React, { useRef, useEffect, useCallback } from "react";

import type { Step, PrimitiveScene } from "./types";
import { DEFAULT_ANIMATION_DURATION_MS } from "./types";
import { CanvasManager } from "./canvas";
import { AnimationManager } from "./animation";
import { getLayout } from "./layouts";
import { renderScene } from "./primitives";

export interface VisualizationPanelProps {
  steps: Step[];
  currentStep: number;
  layoutName: string;
  layoutConfig?: Record<string, unknown>;
  animationDurationMs?: number;
  className?: string;
}

export const VisualizationPanel: React.FC<VisualizationPanelProps> = ({
  steps,
  currentStep,
  layoutName,
  layoutConfig = {},
  animationDurationMs = DEFAULT_ANIMATION_DURATION_MS,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasManagerRef = useRef<CanvasManager | null>(null);
  const animationManagerRef = useRef<AnimationManager | null>(null);

  // Resolve the layout function. Memoize to avoid repeated lookups.
  const layoutFn = getLayout(layoutName);

  // -- Frame render callback --
  // This is called by the AnimationManager on every animation frame.
  // It receives the interpolated scene and draws it to the canvas.
  const handleFrame = useCallback((scene: PrimitiveScene) => {
    const cm = canvasManagerRef.current;
    if (!cm) return;

    cm.renderOnce((ctx, size) => {
      renderScene(ctx, scene, size);
    });
  }, []);

  // -- Initialize CanvasManager and AnimationManager --
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cm = new CanvasManager(canvas);
    canvasManagerRef.current = cm;

    const am = new AnimationManager(handleFrame, {
      durationMs: animationDurationMs,
    });
    animationManagerRef.current = am;

    return () => {
      am.dispose();
      cm.dispose();
      canvasManagerRef.current = null;
      animationManagerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally mount-only. Canvas/AM refs are stable.

  // -- Update animation duration when prop changes --
  useEffect(() => {
    animationManagerRef.current?.updateConfig({
      durationMs: animationDurationMs,
    });
  }, [animationDurationMs]);

  // -- Respond to step changes --
  useEffect(() => {
    const am = animationManagerRef.current;
    const cm = canvasManagerRef.current;
    if (!am || !cm || !layoutFn) return;

    const step = steps[currentStep];
    if (!step) return;

    const size = cm.getSize();
    const scene = layoutFn(step, size, layoutConfig);
    am.transitionTo(scene);
  }, [steps, currentStep, layoutFn, layoutConfig]);

  // -- Handle resize: re-layout the current step without animation --
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new ResizeObserver(() => {
      const am = animationManagerRef.current;
      const cm = canvasManagerRef.current;
      if (!am || !cm || !layoutFn) return;

      const step = steps[currentStep];
      if (!step) return;

      const size = cm.getSize();
      const scene = layoutFn(step, size, layoutConfig);
      am.jumpTo(scene);
    });

    observer.observe(canvas);
    return () => observer.disconnect();
  }, [steps, currentStep, layoutFn, layoutConfig]);

  // -- Render --
  return (
    <div className={className} style={{ width: "100%", height: "100%", position: "relative" }}>
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
        }}
        role="img"
        aria-label={
          steps[currentStep]
            ? `Visualization: ${steps[currentStep]!.title} — ${steps[currentStep]!.explanation}`
            : "Algorithm visualization"
        }
      />
      {!layoutFn && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ef4444",
            fontFamily: "monospace",
            fontSize: 14,
          }}
        >
          Layout &quot;{layoutName}&quot; not found. Check that the layout module is imported.
        </div>
      )}
    </div>
  );
};
