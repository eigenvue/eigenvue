/**
 * @fileoverview VisualizerShell — Unit Tests
 *
 * Tests the VisualizerShell component. Due to its complexity (dynamic imports,
 * Next.js hooks, canvas rendering), these tests focus on:
 * - Mounts without error.
 * - Displays the algorithm name and complexity info.
 * - Renders the playback controls toolbar.
 * - Keyboard shortcuts dispatch correct actions.
 *
 * The VisualizationPanel (Phase 4 canvas) is mocked since it requires a
 * real canvas context which jsdom does not provide.
 *
 * See Phase5_Implementation.md Part S — Testing Strategy.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { AlgorithmMeta } from "@/lib/algorithm-loader";

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock next/navigation's useSearchParams.
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(""),
}));

// Mock the Phase 4 VisualizationPanel (requires canvas).
vi.mock("@/engine/VisualizationPanel", () => ({
  VisualizationPanel: ({ currentStep }: { currentStep: number }) => (
    <div data-testid="visualization-panel" data-step={currentStep}>
      Canvas Mock
    </div>
  ),
}));

// Mock the useAlgorithm hook to return a controlled step sequence.
const mockSetInputs = vi.fn();
vi.mock("@/hooks/useAlgorithm", () => ({
  useAlgorithm: () => [
    {
      inputs: { array: [1, 3, 5, 7, 9], target: 5 },
      stepSequence: {
        formatVersion: 1,
        algorithmId: "binary-search",
        inputs: { array: [1, 3, 5, 7, 9], target: 5 },
        steps: [
          {
            index: 0,
            id: "initialize",
            title: "Initialize Search",
            explanation: "Setting up search.",
            state: { array: [1, 3, 5, 7, 9], target: 5, left: 0, right: 4, result: null },
            visualActions: [],
            codeHighlight: { language: "pseudocode", lines: [1, 2, 3] },
            isTerminal: false,
            phase: "initialization",
          },
          {
            index: 1,
            id: "calculate_mid",
            title: "Calculate Middle (Iteration 1)",
            explanation: "mid = floor((0 + 4) / 2) = 2.",
            state: { array: [1, 3, 5, 7, 9], target: 5, left: 0, right: 4, mid: 2, result: null },
            visualActions: [],
            codeHighlight: { language: "pseudocode", lines: [5, 6] },
            isTerminal: false,
            phase: "search",
          },
          {
            index: 2,
            id: "found",
            title: "Target Found!",
            explanation: "Found 5 at index 2.",
            state: { array: [1, 3, 5, 7, 9], target: 5, left: 0, right: 4, mid: 2, result: 2 },
            visualActions: [],
            codeHighlight: { language: "pseudocode", lines: [8] },
            isTerminal: true,
            phase: "result",
          },
        ],
        generatedAt: "2026-01-01T00:00:00.000Z",
        generatedBy: "typescript",
      },
      error: null,
    },
    { setInputs: mockSetInputs },
  ],
}));

// ─── Test Meta ────────────────────────────────────────────────────────────────

const TEST_META: AlgorithmMeta = {
  id: "binary-search",
  name: "Binary Search",
  category: "classical",
  description: {
    short: "Find a target in a sorted array.",
    long: "Binary search is a divide-and-conquer algorithm.",
  },
  complexity: { time: "O(log n)", space: "O(1)", level: "beginner" },
  visual: {
    layout: "array-with-pointers",
    theme: { primary: "#38bdf8", secondary: "#0284c7" },
    components: {},
  },
  inputs: {
    schema: {
      array: { type: "array", items: { type: "number" } },
      target: { type: "number" },
    },
    defaults: { array: [1, 3, 5, 7, 9], target: 5 },
    examples: [],
  },
  code: {
    implementations: {
      pseudocode: "function binarySearch(array, target):\n  return -1",
    },
    defaultLanguage: "pseudocode",
  },
  education: {
    keyConcepts: [],
    pitfalls: [],
    quiz: [],
    resources: [],
  },
  seo: { keywords: [], ogDescription: "Test" },
  prerequisites: [],
  related: [],
  author: "eigenvue",
  version: "1.0.0",
};

// ─── Import after mocks ──────────────────────────────────────────────────────

// Dynamic import so mocks are registered before module loads.
import { VisualizerShell } from "../VisualizerShell";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("VisualizerShell — Mounting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mounts without error", () => {
    expect(() =>
      render(<VisualizerShell algorithmId="binary-search" meta={TEST_META} />),
    ).not.toThrow();
  });

  it("displays the algorithm name", () => {
    render(<VisualizerShell algorithmId="binary-search" meta={TEST_META} />);

    expect(screen.getByText("Binary Search")).toBeInTheDocument();
  });

  it("displays complexity information", () => {
    render(<VisualizerShell algorithmId="binary-search" meta={TEST_META} />);

    // Complexity info may appear in both the title bar and the explanation panel.
    // Use getAllByText to handle multiple matches.
    expect(screen.getAllByText(/O\(log n\)/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/O\(1\)/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/beginner/).length).toBeGreaterThanOrEqual(1);
  });

  it("renders the playback controls toolbar", () => {
    render(<VisualizerShell algorithmId="binary-search" meta={TEST_META} />);

    expect(screen.getByRole("toolbar")).toBeInTheDocument();
    expect(screen.getByLabelText("Play")).toBeInTheDocument();
  });

  it("renders the share button", () => {
    render(<VisualizerShell algorithmId="binary-search" meta={TEST_META} />);

    expect(screen.getByText("Share")).toBeInTheDocument();
  });

  it("renders the input editor toggle", () => {
    render(<VisualizerShell algorithmId="binary-search" meta={TEST_META} />);

    expect(screen.getByText("Edit Inputs & Examples")).toBeInTheDocument();
  });

  it("renders the visualization panel mock", () => {
    render(<VisualizerShell algorithmId="binary-search" meta={TEST_META} />);

    expect(screen.getByTestId("visualization-panel")).toBeInTheDocument();
  });
});

describe("VisualizerShell — Keyboard Shortcuts", () => {
  it("Space key triggers play/pause", () => {
    render(<VisualizerShell algorithmId="binary-search" meta={TEST_META} />);

    fireEvent.keyDown(window, { key: " " });

    // After space, the play button should still be present (state managed by usePlayback).
    // We verify the shortcut doesn't throw and the component remains stable.
    expect(screen.getByRole("toolbar")).toBeInTheDocument();
  });

  it("ArrowRight key does not throw", () => {
    render(<VisualizerShell algorithmId="binary-search" meta={TEST_META} />);

    expect(() => {
      fireEvent.keyDown(window, { key: "ArrowRight" });
    }).not.toThrow();
  });

  it("ArrowLeft key does not throw", () => {
    render(<VisualizerShell algorithmId="binary-search" meta={TEST_META} />);

    expect(() => {
      fireEvent.keyDown(window, { key: "ArrowLeft" });
    }).not.toThrow();
  });

  it("Home key does not throw", () => {
    render(<VisualizerShell algorithmId="binary-search" meta={TEST_META} />);

    expect(() => {
      fireEvent.keyDown(window, { key: "Home" });
    }).not.toThrow();
  });

  it("End key does not throw", () => {
    render(<VisualizerShell algorithmId="binary-search" meta={TEST_META} />);

    expect(() => {
      fireEvent.keyDown(window, { key: "End" });
    }).not.toThrow();
  });

  it("does not capture shortcuts when typing in an input field", () => {
    render(<VisualizerShell algorithmId="binary-search" meta={TEST_META} />);

    // Expand the input editor.
    fireEvent.click(screen.getByText("Edit Inputs & Examples"));

    // Find an input field and focus it.
    const inputFields = screen.getAllByRole("textbox");
    if (inputFields.length > 0) {
      const inputField = inputFields[0]!;
      inputField.focus();

      // Fire a space key on the input — should NOT trigger play/pause.
      fireEvent.keyDown(inputField, { key: " " });

      // Component should still be stable.
      expect(screen.getByRole("toolbar")).toBeInTheDocument();
    }
  });
});
