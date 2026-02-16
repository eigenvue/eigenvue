/**
 * @fileoverview Runtime Performance Monitor Hook
 *
 * Tracks canvas rendering performance during algorithm visualization.
 * Reports frame timing data to help identify performance regressions.
 *
 * METRICS TRACKED:
 * - Frame render time (ms): how long each canvas frame takes to draw.
 * - Frames per second: rolling average over the last 60 frames.
 * - Dropped frames: frames that took > 16.67ms (missed 60fps target).
 *
 * USAGE:
 *   const perf = usePerformanceMonitor();
 *   // In the render loop:
 *   perf.startFrame();
 *   renderScene(ctx, scene);
 *   perf.endFrame();
 *   // Read metrics:
 *   console.log(perf.metrics.fps, perf.metrics.avgFrameTime);
 *
 * DEVELOPMENT ONLY:
 * In production builds, all methods are no-ops that return immediately.
 * There is ZERO performance overhead in production.
 *
 * WHY A HOOK:
 * The monitor needs to persist across renders (useRef) and optionally
 * expose metrics to a debug overlay (useState). A hook encapsulates
 * both cleanly.
 */

import { useRef, useCallback, useState } from "react";

interface PerformanceMetrics {
  /** Rolling average FPS over the last 60 frames. */
  fps: number;
  /** Average frame render time in milliseconds. */
  avgFrameTime: number;
  /** Count of frames that exceeded the 16.67ms budget. */
  droppedFrames: number;
  /** Total frames rendered since last reset. */
  totalFrames: number;
}

const FRAME_WINDOW = 60; // Number of frames for rolling average.
const FRAME_BUDGET_MS = 16.67; // 60fps target.

const IS_DEV = process.env.NODE_ENV !== "production";

export function usePerformanceMonitor() {
  const frameTimesRef = useRef<number[]>([]);
  const frameStartRef = useRef<number>(0);
  const droppedRef = useRef<number>(0);
  const totalRef = useRef<number>(0);

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    avgFrameTime: 0,
    droppedFrames: 0,
    totalFrames: 0,
  });

  const startFrame = useCallback(() => {
    if (!IS_DEV) return;
    frameStartRef.current = performance.now();
  }, []);

  const endFrame = useCallback(() => {
    if (!IS_DEV) return;

    const elapsed = performance.now() - frameStartRef.current;
    const frameTimes = frameTimesRef.current;

    frameTimes.push(elapsed);
    totalRef.current++;

    if (elapsed > FRAME_BUDGET_MS) {
      droppedRef.current++;
    }

    // Keep only the last FRAME_WINDOW entries.
    if (frameTimes.length > FRAME_WINDOW) {
      frameTimes.shift();
    }

    // Update metrics every 30 frames to avoid excessive re-renders.
    if (totalRef.current % 30 === 0) {
      const sum = frameTimes.reduce((a, b) => a + b, 0);
      const avg = sum / frameTimes.length;
      const fps = avg > 0 ? Math.min(1000 / avg, 60) : 60;

      setMetrics({
        fps: Math.round(fps),
        avgFrameTime: Math.round(avg * 100) / 100,
        droppedFrames: droppedRef.current,
        totalFrames: totalRef.current,
      });
    }
  }, []);

  const reset = useCallback(() => {
    frameTimesRef.current = [];
    droppedRef.current = 0;
    totalRef.current = 0;
    setMetrics({ fps: 60, avgFrameTime: 0, droppedFrames: 0, totalFrames: 0 });
  }, []);

  return { startFrame, endFrame, reset, metrics };
}
