/**
 * @fileoverview usePlayback — Playback state machine hook.
 *
 * Manages play/pause, step forward/backward, speed control, and auto-play
 * timer. This hook owns the "current step index" state and exposes controls.
 *
 * STATE MACHINE:
 *   - Idle: Not playing. User manually steps or scrubs.
 *   - Playing: Auto-advancing at the configured speed.
 *   - Playing stops automatically when the terminal step is reached.
 *
 * SPEED TIERS (milliseconds between steps):
 *   0.5x = 1200ms, 1x = 600ms, 2x = 300ms, 4x = 150ms
 */

"use client";

import { useState, useCallback, useRef, useEffect } from "react";

/** Available playback speed multipliers and their interval in ms. */
export const SPEED_OPTIONS = [
  { label: "0.5×", multiplier: 0.5, intervalMs: 1200 },
  { label: "1×",   multiplier: 1,   intervalMs: 600  },
  { label: "2×",   multiplier: 2,   intervalMs: 300  },
  { label: "4×",   multiplier: 4,   intervalMs: 150  },
] as const;

export interface PlaybackState {
  /** Current step index (0-based). */
  readonly currentIndex: number;
  /** Whether playback is active (auto-advancing). */
  readonly isPlaying: boolean;
  /** Index into SPEED_OPTIONS for the current speed. */
  readonly speedIndex: number;
}

export interface PlaybackControls {
  /** Go to a specific step index. */
  goToStep: (index: number) => void;
  /** Advance one step forward. No-op at terminal step. */
  stepForward: () => void;
  /** Go one step backward. No-op at step 0. */
  stepBackward: () => void;
  /** Toggle play/pause. */
  togglePlay: () => void;
  /** Start playing from current position. */
  play: () => void;
  /** Pause playback. */
  pause: () => void;
  /** Reset to step 0 and pause. */
  reset: () => void;
  /** Cycle to the next speed option. */
  cycleSpeed: () => void;
}

/**
 * Custom hook for managing algorithm playback state.
 *
 * @param totalSteps    - Total number of steps in the current step sequence.
 * @param initialIndex  - Initial step index (from URL state). Clamped to valid range.
 * @param onStepChange  - Callback when the step index changes (for URL sync).
 */
export function usePlayback(
  totalSteps: number,
  initialIndex: number = 0,
  onStepChange?: (index: number) => void,
): [PlaybackState, PlaybackControls] {
  // Clamp initial index to valid range.
  const clampedInitial = Math.max(0, Math.min(initialIndex, totalSteps - 1));

  const [currentIndex, setCurrentIndex] = useState(clampedInitial);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(1); // Default: 1× speed

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  const maxIndex = Math.max(0, totalSteps - 1);

  // ── Step change handler (with callback) ──────────────────────────────
  const setStep = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, maxIndex));
      setCurrentIndex(clamped);
      onStepChange?.(clamped);
    },
    [maxIndex, onStepChange],
  );

  // ── Controls ─────────────────────────────────────────────────────────
  const goToStep = useCallback(
    (index: number) => {
      setIsPlaying(false);
      setStep(index);
    },
    [setStep],
  );

  const stepForward = useCallback(() => {
    if (currentIndexRef.current < maxIndex) {
      setStep(currentIndexRef.current + 1);
    }
  }, [maxIndex, setStep]);

  const stepBackward = useCallback(() => {
    if (currentIndexRef.current > 0) {
      setStep(currentIndexRef.current - 1);
    }
  }, [setStep]);

  const pause = useCallback(() => setIsPlaying(false), []);

  const play = useCallback(() => {
    if (currentIndexRef.current >= maxIndex) {
      // If at the end, reset to beginning before playing.
      setStep(0);
    }
    setIsPlaying(true);
  }, [maxIndex, setStep]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const reset = useCallback(() => {
    setIsPlaying(false);
    setStep(0);
  }, [setStep]);

  const cycleSpeed = useCallback(() => {
    setSpeedIndex((prev) => (prev + 1) % SPEED_OPTIONS.length);
  }, []);

  // ── Auto-play timer ──────────────────────────────────────────────────
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (!isPlaying) return;

    const intervalMs = SPEED_OPTIONS[speedIndex]!.intervalMs;

    timerRef.current = setInterval(() => {
      if (currentIndexRef.current >= maxIndex) {
        // Reached the end — stop playing.
        setIsPlaying(false);
        return;
      }
      setStep(currentIndexRef.current + 1);
    }, intervalMs);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPlaying, speedIndex, maxIndex, setStep]);

  // ── Reset playback when total steps changes (re-generation) ──────────
  useEffect(() => {
    setIsPlaying(false);
    setCurrentIndex(0);
  }, [totalSteps]);

  const state: PlaybackState = { currentIndex, isPlaying, speedIndex };
  const controls: PlaybackControls = {
    goToStep, stepForward, stepBackward,
    togglePlay, play, pause, reset, cycleSpeed,
  };

  return [state, controls];
}
