/**
 * @fileoverview Playback Controls — Transport bar for algorithm visualization.
 *
 * Provides: Reset | Step Back | Play/Pause | Step Forward | Speed | Progress
 *
 * KEYBOARD SHORTCUTS (handled by the parent VisualizerShell):
 *   Space     → Play/Pause
 *   ArrowLeft → Step backward
 *   ArrowRight→ Step forward
 *   Home      → Reset to step 0
 *   End       → Jump to last step
 *
 * ACCESSIBILITY:
 * - All buttons have aria-labels.
 * - The progress bar is an accessible range input (slider).
 * - Focus is managed so keyboard users can navigate the controls.
 */

"use client";

import type { PlaybackState, PlaybackControls as Controls } from "@/hooks/usePlayback";
import { SPEED_OPTIONS } from "@/hooks/usePlayback";

interface PlaybackControlsProps {
  readonly state: PlaybackState;
  readonly controls: Controls;
  readonly totalSteps: number;
}

export function PlaybackControls({ state, controls, totalSteps }: PlaybackControlsProps) {
  const { currentIndex, isPlaying, speedIndex } = state;
  const maxIndex = Math.max(0, totalSteps - 1);

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 bg-background-surface rounded-lg border border-border"
      role="toolbar"
      aria-label="Playback controls"
    >
      {/* Reset */}
      <button
        onClick={controls.reset}
        aria-label="Reset to first step"
        className="p-2 rounded-md text-text-tertiary hover:text-text-primary hover:bg-background-hover transition-colors disabled:opacity-30"
        disabled={currentIndex === 0 && !isPlaying}
      >
        ⏮
      </button>

      {/* Step Backward */}
      <button
        onClick={controls.stepBackward}
        aria-label="Previous step"
        className="p-2 rounded-md text-text-tertiary hover:text-text-primary hover:bg-background-hover transition-colors disabled:opacity-30"
        disabled={currentIndex === 0}
      >
        ⏪
      </button>

      {/* Play / Pause */}
      <button
        onClick={controls.togglePlay}
        aria-label={isPlaying ? "Pause" : "Play"}
        className="p-2 px-3 rounded-md bg-gradient-to-r from-gradient-from to-gradient-to text-white hover:opacity-90 transition-opacity"
      >
        {isPlaying ? "⏸" : "▶"}
      </button>

      {/* Step Forward */}
      <button
        onClick={controls.stepForward}
        aria-label="Next step"
        className="p-2 rounded-md text-text-tertiary hover:text-text-primary hover:bg-background-hover transition-colors disabled:opacity-30"
        disabled={currentIndex === maxIndex}
      >
        ⏩
      </button>

      {/* Speed */}
      <button
        onClick={controls.cycleSpeed}
        aria-label={`Playback speed: ${SPEED_OPTIONS[speedIndex]!.label}. Click to change.`}
        className="px-2 py-1 text-xs font-mono rounded-md bg-background-elevated text-text-secondary hover:text-text-primary transition-colors min-w-[3rem] text-center"
      >
        {SPEED_OPTIONS[speedIndex]!.label}
      </button>

      {/* Step Counter */}
      <span
        className="text-xs font-mono text-text-tertiary ml-2 whitespace-nowrap"
        aria-live="polite"
      >
        {currentIndex + 1} / {totalSteps}
      </span>

      {/* Progress Bar / Scrubber */}
      <input
        type="range"
        min={0}
        max={maxIndex}
        value={currentIndex}
        onChange={(e) => controls.goToStep(parseInt(e.target.value, 10))}
        aria-label={`Step ${currentIndex + 1} of ${totalSteps}`}
        aria-valuemin={0}
        aria-valuemax={maxIndex}
        aria-valuenow={currentIndex}
        className="flex-1 h-1.5 rounded-lg appearance-none bg-background-elevated cursor-pointer accent-classical"
      />
    </div>
  );
}
