/**
 * @fileoverview PlaybackControls — Unit Tests
 *
 * Tests the PlaybackControls component in isolation by passing
 * mock state and control handlers. Validates:
 * - Correct rendering of all transport buttons.
 * - Button disabled states at step boundaries.
 * - Speed label display and cycling.
 * - Progress bar attributes.
 * - Play/pause toggle label changes.
 * - Accessibility: aria-labels on all interactive elements.
 *
 * See Phase5_Implementation.md Part S — Testing Strategy.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlaybackControls } from "../PlaybackControls";
import type { PlaybackState, PlaybackControls as Controls } from "@/hooks/usePlayback";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeState(overrides: Partial<PlaybackState> = {}): PlaybackState {
  return {
    currentIndex: 0,
    isPlaying: false,
    speedIndex: 1,
    ...overrides,
  };
}

function makeControls(): Controls {
  return {
    goToStep: vi.fn(),
    stepForward: vi.fn(),
    stepBackward: vi.fn(),
    togglePlay: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    reset: vi.fn(),
    cycleSpeed: vi.fn(),
  };
}

// ─── Rendering Tests ─────────────────────────────────────────────────────────

describe("PlaybackControls — Rendering", () => {
  it("renders all transport buttons", () => {
    const controls = makeControls();
    render(
      <PlaybackControls state={makeState()} controls={controls} totalSteps={10} />,
    );

    expect(screen.getByLabelText("Reset to first step")).toBeInTheDocument();
    expect(screen.getByLabelText("Previous step")).toBeInTheDocument();
    expect(screen.getByLabelText("Play")).toBeInTheDocument();
    expect(screen.getByLabelText("Next step")).toBeInTheDocument();
  });

  it("shows step counter", () => {
    render(
      <PlaybackControls
        state={makeState({ currentIndex: 4 })}
        controls={makeControls()}
        totalSteps={10}
      />,
    );

    expect(screen.getByText("5 / 10")).toBeInTheDocument();
  });

  it("shows current speed label", () => {
    render(
      <PlaybackControls
        state={makeState({ speedIndex: 2 })}
        controls={makeControls()}
        totalSteps={10}
      />,
    );

    // Speed index 2 = "2×"
    expect(screen.getByText("2×")).toBeInTheDocument();
  });

  it("shows progress bar with correct ARIA attributes", () => {
    render(
      <PlaybackControls
        state={makeState({ currentIndex: 3 })}
        controls={makeControls()}
        totalSteps={10}
      />,
    );

    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("aria-valuemin", "0");
    expect(slider).toHaveAttribute("aria-valuemax", "9");
    expect(slider).toHaveAttribute("aria-valuenow", "3");
  });
});

// ─── Boundary Tests ──────────────────────────────────────────────────────────

describe("PlaybackControls — Step Boundaries", () => {
  it("disables step backward at step 0", () => {
    render(
      <PlaybackControls
        state={makeState({ currentIndex: 0 })}
        controls={makeControls()}
        totalSteps={10}
      />,
    );

    expect(screen.getByLabelText("Previous step")).toBeDisabled();
  });

  it("disables step forward at last step", () => {
    render(
      <PlaybackControls
        state={makeState({ currentIndex: 9 })}
        controls={makeControls()}
        totalSteps={10}
      />,
    );

    expect(screen.getByLabelText("Next step")).toBeDisabled();
  });

  it("enables step forward when not at last step", () => {
    render(
      <PlaybackControls
        state={makeState({ currentIndex: 5 })}
        controls={makeControls()}
        totalSteps={10}
      />,
    );

    expect(screen.getByLabelText("Next step")).not.toBeDisabled();
  });

  it("enables step backward when not at step 0", () => {
    render(
      <PlaybackControls
        state={makeState({ currentIndex: 3 })}
        controls={makeControls()}
        totalSteps={10}
      />,
    );

    expect(screen.getByLabelText("Previous step")).not.toBeDisabled();
  });
});

// ─── Interaction Tests ───────────────────────────────────────────────────────

describe("PlaybackControls — Interactions", () => {
  it("calls togglePlay when play button clicked", () => {
    const controls = makeControls();
    render(
      <PlaybackControls state={makeState()} controls={controls} totalSteps={10} />,
    );

    fireEvent.click(screen.getByLabelText("Play"));
    expect(controls.togglePlay).toHaveBeenCalledTimes(1);
  });

  it("shows Pause label when playing", () => {
    render(
      <PlaybackControls
        state={makeState({ isPlaying: true })}
        controls={makeControls()}
        totalSteps={10}
      />,
    );

    expect(screen.getByLabelText("Pause")).toBeInTheDocument();
  });

  it("calls stepForward when next button clicked", () => {
    const controls = makeControls();
    render(
      <PlaybackControls
        state={makeState({ currentIndex: 3 })}
        controls={controls}
        totalSteps={10}
      />,
    );

    fireEvent.click(screen.getByLabelText("Next step"));
    expect(controls.stepForward).toHaveBeenCalledTimes(1);
  });

  it("calls stepBackward when previous button clicked", () => {
    const controls = makeControls();
    render(
      <PlaybackControls
        state={makeState({ currentIndex: 3 })}
        controls={controls}
        totalSteps={10}
      />,
    );

    fireEvent.click(screen.getByLabelText("Previous step"));
    expect(controls.stepBackward).toHaveBeenCalledTimes(1);
  });

  it("calls reset when reset button clicked", () => {
    const controls = makeControls();
    render(
      <PlaybackControls
        state={makeState({ currentIndex: 5 })}
        controls={controls}
        totalSteps={10}
      />,
    );

    fireEvent.click(screen.getByLabelText("Reset to first step"));
    expect(controls.reset).toHaveBeenCalledTimes(1);
  });

  it("calls cycleSpeed when speed button clicked", () => {
    const controls = makeControls();
    render(
      <PlaybackControls state={makeState()} controls={controls} totalSteps={10} />,
    );

    fireEvent.click(screen.getByText("1×"));
    expect(controls.cycleSpeed).toHaveBeenCalledTimes(1);
  });

  it("calls goToStep when progress bar changes", () => {
    const controls = makeControls();
    render(
      <PlaybackControls state={makeState()} controls={controls} totalSteps={10} />,
    );

    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "7" } });
    expect(controls.goToStep).toHaveBeenCalledWith(7);
  });
});

// ─── Accessibility Tests ─────────────────────────────────────────────────────

describe("PlaybackControls — Accessibility", () => {
  it("has toolbar role with aria-label", () => {
    render(
      <PlaybackControls state={makeState()} controls={makeControls()} totalSteps={10} />,
    );

    expect(screen.getByRole("toolbar")).toHaveAttribute(
      "aria-label",
      "Playback controls",
    );
  });

  it("speed button includes current speed in aria-label", () => {
    render(
      <PlaybackControls
        state={makeState({ speedIndex: 3 })}
        controls={makeControls()}
        totalSteps={10}
      />,
    );

    const speedButton = screen.getByText("4×");
    expect(speedButton).toHaveAttribute("aria-label");
    expect(speedButton.getAttribute("aria-label")).toContain("4×");
  });
});
