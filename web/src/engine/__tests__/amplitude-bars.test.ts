/**
 * @fileoverview Tests for amplitude-bars layout.
 *
 * These tests verify that the amplitude-bars layout produces the correct
 * bar chart structure for quantum state vector measurement probabilities.
 * Tests cover amplitude-to-probability conversion, visual actions
 * (showProbabilities, showStateVector), target state highlighting,
 * axis rendering, and stable ID generation for smooth animation.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { getLayout } from "../layouts/registry";
import type {
  Step,
  CanvasSize,
  LayoutFunction,
  ElementPrimitive,
  ConnectionPrimitive,
  AnnotationPrimitive,
} from "../types";

// Import the layout module to trigger self-registration.
import "../layouts/amplitude-bars";

const mockCanvasSize: CanvasSize = { width: 800, height: 600 };

describe("amplitude-bars layout", () => {
  let layout: LayoutFunction;

  beforeEach(() => {
    layout = getLayout("amplitude-bars")!;
    expect(layout).toBeDefined();
  });

  describe("registration", () => {
    it("is registered and retrievable by name", () => {
      const fn = getLayout("amplitude-bars");
      expect(fn).toBeDefined();
      expect(typeof fn).toBe("function");
    });
  });

  describe("basic rendering", () => {
    it("renders bars for a 2-qubit uniform superposition from amplitudes", () => {
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Uniform Superposition",
        explanation: "Equal superposition across all 4 basis states.",
        state: {
          numQubits: 2,
          amplitudes: [
            [0.5, 0],
            [0.5, 0],
            [0.5, 0],
            [0.5, 0],
          ],
        },
        visualActions: [
          {
            type: "showProbabilities",
            probabilities: [0.25, 0.25, 0.25, 0.25],
            labels: ["|00\u27E9", "|01\u27E9", "|10\u27E9", "|11\u27E9"],
          },
        ],
        codeHighlight: { language: "pseudocode", lines: [] },
        isTerminal: false,
      };

      const scene = layout(step, mockCanvasSize, {});

      // Scene should produce primitives.
      expect(scene.primitives.length).toBeGreaterThan(0);

      // Should have 4 probability bars (one per basis state).
      const bars = scene.primitives.filter(
        (p) => p.kind === "element" && p.id.startsWith("prob-bar-"),
      );
      expect(bars.length).toBe(4);

      // Each bar should be an element primitive with rect shape.
      for (const bar of bars) {
        const el = bar as ElementPrimitive;
        expect(el.shape).toBe("rect");
        expect(el.width).toBeGreaterThan(0);
        expect(el.height).toBeGreaterThan(0);
      }

      // Should have 4 percentage labels.
      const pctLabels = scene.primitives.filter(
        (p) => p.kind === "annotation" && p.id.startsWith("prob-pct-"),
      );
      expect(pctLabels.length).toBe(4);

      // Should have 4 basis state labels.
      const basisLabels = scene.primitives.filter(
        (p) => p.kind === "annotation" && p.id.startsWith("prob-label-"),
      );
      expect(basisLabels.length).toBe(4);

      // Verify basis labels match the expected values.
      const label0 = scene.primitives.find((p) => p.id === "prob-label-0") as AnnotationPrimitive;
      expect(label0).toBeDefined();
      expect(label0.text).toBe("|00\u27E9");

      const label3 = scene.primitives.find((p) => p.id === "prob-label-3") as AnnotationPrimitive;
      expect(label3).toBeDefined();
      expect(label3.text).toBe("|11\u27E9");
    });

    it("computes probabilities from amplitudes when no action provides them", () => {
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Amplitude to Probability",
        explanation: "Probabilities computed from |alpha|^2.",
        state: {
          numQubits: 1,
          amplitudes: [
            [Math.SQRT1_2, 0], // |0>: probability = 0.5
            [0, Math.SQRT1_2], // |1>: probability = 0.5 (imaginary amplitude)
          ],
        },
        visualActions: [],
        codeHighlight: { language: "pseudocode", lines: [] },
        isTerminal: false,
      };

      const scene = layout(step, mockCanvasSize, {});

      // Should produce 2 bars.
      const bars = scene.primitives.filter(
        (p) => p.kind === "element" && p.id.startsWith("prob-bar-"),
      );
      expect(bars.length).toBe(2);

      // Both bars should have the same height (equal probability).
      const bar0 = bars.find((p) => p.id === "prob-bar-0") as ElementPrimitive;
      const bar1 = bars.find((p) => p.id === "prob-bar-1") as ElementPrimitive;
      expect(bar0).toBeDefined();
      expect(bar1).toBeDefined();
      expect(bar0.height).toBeCloseTo(bar1.height, 1);
    });

    it("renders axes and chart title", () => {
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Chart Structure",
        explanation: "Verifying axes and title exist.",
        state: {
          numQubits: 2,
          amplitudes: [
            [1, 0],
            [0, 0],
            [0, 0],
            [0, 0],
          ],
        },
        visualActions: [],
        codeHighlight: { language: "pseudocode", lines: [] },
        isTerminal: false,
      };

      const scene = layout(step, mockCanvasSize, {});

      // Y-axis line should exist.
      const yAxis = scene.primitives.find((p) => p.id === "y-axis") as ConnectionPrimitive;
      expect(yAxis).toBeDefined();
      expect(yAxis.kind).toBe("connection");

      // X-axis (baseline) should exist.
      const xAxis = scene.primitives.find((p) => p.id === "x-axis") as ConnectionPrimitive;
      expect(xAxis).toBeDefined();
      expect(xAxis.kind).toBe("connection");

      // Y-axis title should exist.
      const yAxisTitle = scene.primitives.find(
        (p) => p.id === "y-axis-title",
      ) as AnnotationPrimitive;
      expect(yAxisTitle).toBeDefined();
      expect(yAxisTitle.text).toBe("Probability");

      // Chart title should exist and mention the qubit count.
      const chartTitle = scene.primitives.find(
        (p) => p.id === "chart-title",
      ) as AnnotationPrimitive;
      expect(chartTitle).toBeDefined();
      expect(chartTitle.text).toContain("2 qubit");

      // Y-axis tick labels should exist (0.00, 0.25, 0.50, 0.75, 1.00).
      for (let t = 0; t < 5; t++) {
        const tickLabel = scene.primitives.find(
          (p) => p.id === `y-label-${t}`,
        ) as AnnotationPrimitive;
        expect(tickLabel).toBeDefined();
      }

      // Y-axis grid lines should exist.
      for (let t = 0; t < 5; t++) {
        const gridLine = scene.primitives.find(
          (p) => p.id === `y-grid-${t}`,
        ) as ConnectionPrimitive;
        expect(gridLine).toBeDefined();
      }
    });
  });

  describe("visual actions", () => {
    it("showProbabilities action overrides amplitude-computed probabilities", () => {
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Action Override",
        explanation: "showProbabilities action should take precedence.",
        state: {
          numQubits: 2,
          amplitudes: [
            [0.5, 0],
            [0.5, 0],
            [0.5, 0],
            [0.5, 0],
          ],
        },
        visualActions: [
          {
            type: "showProbabilities",
            probabilities: [0.9, 0.05, 0.03, 0.02],
            labels: ["|00\u27E9", "|01\u27E9", "|10\u27E9", "|11\u27E9"],
          },
        ],
        codeHighlight: { language: "pseudocode", lines: [] },
        isTerminal: false,
      };

      const scene = layout(step, mockCanvasSize, {});

      // Bar 0 should be much taller than bar 3 since probabilities differ.
      const bar0 = scene.primitives.find((p) => p.id === "prob-bar-0") as ElementPrimitive;
      const bar3 = scene.primitives.find((p) => p.id === "prob-bar-3") as ElementPrimitive;

      expect(bar0).toBeDefined();
      expect(bar3).toBeDefined();
      expect(bar0.height).toBeGreaterThan(bar3.height);
    });

    it("generates default binary labels when none are provided", () => {
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Default Labels",
        explanation: "Labels should auto-generate from binary indices.",
        state: {
          numQubits: 2,
          amplitudes: [
            [1, 0],
            [0, 0],
            [0, 0],
            [0, 0],
          ],
        },
        visualActions: [],
        codeHighlight: { language: "pseudocode", lines: [] },
        isTerminal: false,
      };

      const scene = layout(step, mockCanvasSize, {});

      // With no labels provided, the layout should generate binary labels.
      const label0 = scene.primitives.find((p) => p.id === "prob-label-0") as AnnotationPrimitive;
      const label1 = scene.primitives.find((p) => p.id === "prob-label-1") as AnnotationPrimitive;
      const label2 = scene.primitives.find((p) => p.id === "prob-label-2") as AnnotationPrimitive;
      const label3 = scene.primitives.find((p) => p.id === "prob-label-3") as AnnotationPrimitive;

      expect(label0).toBeDefined();
      expect(label1).toBeDefined();
      expect(label2).toBeDefined();
      expect(label3).toBeDefined();

      // Labels should be binary representations like |00>, |01>, |10>, |11>.
      expect(label0.text).toBe("|00\u27E9");
      expect(label1.text).toBe("|01\u27E9");
      expect(label2.text).toBe("|10\u27E9");
      expect(label3.text).toBe("|11\u27E9");
    });
  });

  describe("target state highlighting", () => {
    it("highlights target states with a different bar fill color", () => {
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Target Highlighting",
        explanation: "Target states should be visually distinct.",
        state: {
          numQubits: 2,
          amplitudes: [
            [0.5, 0],
            [0.5, 0],
            [0.5, 0],
            [0.5, 0],
          ],
          targetStates: [1, 3],
        },
        visualActions: [],
        codeHighlight: { language: "pseudocode", lines: [] },
        isTerminal: false,
      };

      const scene = layout(step, mockCanvasSize, {});

      // Non-target bar (index 0).
      const normalBar = scene.primitives.find((p) => p.id === "prob-bar-0") as ElementPrimitive;

      // Target bar (index 1).
      const targetBar = scene.primitives.find((p) => p.id === "prob-bar-1") as ElementPrimitive;

      expect(normalBar).toBeDefined();
      expect(targetBar).toBeDefined();

      // Target bars should have a different fill color than normal bars.
      expect(normalBar.fillColor).not.toBe(targetBar.fillColor);

      // Another target bar (index 3) should match the first target bar.
      const targetBar3 = scene.primitives.find((p) => p.id === "prob-bar-3") as ElementPrimitive;
      expect(targetBar3).toBeDefined();
      expect(targetBar3.fillColor).toBe(targetBar.fillColor);
    });

    it("target state labels are highlighted with the target color", () => {
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Target Label Color",
        explanation: "Target state basis labels should be highlighted.",
        state: {
          numQubits: 2,
          amplitudes: [
            [0.5, 0],
            [0.5, 0],
            [0.5, 0],
            [0.5, 0],
          ],
          targetStates: [2],
        },
        visualActions: [],
        codeHighlight: { language: "pseudocode", lines: [] },
        isTerminal: false,
      };

      const scene = layout(step, mockCanvasSize, {});

      const normalLabel = scene.primitives.find(
        (p) => p.id === "prob-label-0",
      ) as AnnotationPrimitive;
      const targetLabel = scene.primitives.find(
        (p) => p.id === "prob-label-2",
      ) as AnnotationPrimitive;

      expect(normalLabel).toBeDefined();
      expect(targetLabel).toBeDefined();

      // Target label should have a different text color than normal labels.
      expect(targetLabel.textColor).not.toBe(normalLabel.textColor);
    });
  });

  describe("edge cases", () => {
    it("returns empty scene for empty amplitudes", () => {
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Empty State",
        explanation: "No amplitudes provided.",
        state: {
          numQubits: 0,
          amplitudes: [],
        },
        visualActions: [],
        codeHighlight: { language: "pseudocode", lines: [] },
        isTerminal: true,
      };

      const scene = layout(step, mockCanvasSize, {});
      expect(scene.primitives).toEqual([]);
    });

    it("handles zero-probability states with minimal bar height", () => {
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Zero Probability",
        explanation: "Some basis states have zero probability.",
        state: {
          numQubits: 2,
          amplitudes: [
            [1, 0], // 100% probability
            [0, 0], // 0% probability
            [0, 0], // 0% probability
            [0, 0], // 0% probability
          ],
        },
        visualActions: [],
        codeHighlight: { language: "pseudocode", lines: [] },
        isTerminal: false,
      };

      const scene = layout(step, mockCanvasSize, {});

      // All 4 bars should exist even with zero probability.
      const bars = scene.primitives.filter(
        (p) => p.kind === "element" && p.id.startsWith("prob-bar-"),
      );
      expect(bars.length).toBe(4);

      // Zero-probability bars should have reduced opacity.
      const zeroBar = bars.find((p) => p.id === "prob-bar-1") as ElementPrimitive;
      const fullBar = bars.find((p) => p.id === "prob-bar-0") as ElementPrimitive;
      expect(zeroBar).toBeDefined();
      expect(fullBar).toBeDefined();
      expect(zeroBar.opacity).toBeLessThan(fullBar.opacity);

      // Full-probability bar should be taller than zero-probability bar.
      expect(fullBar.height).toBeGreaterThan(zeroBar.height);
    });

    it("silently ignores unknown visual action types", () => {
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Unknown Action",
        explanation: "Step with unknown action type.",
        state: {
          numQubits: 1,
          amplitudes: [
            [1, 0],
            [0, 0],
          ],
        },
        visualActions: [{ type: "someUnrecognizedAction", data: "test" }],
        codeHighlight: { language: "pseudocode", lines: [] },
        isTerminal: false,
      };

      // Should not throw.
      const scene = layout(step, mockCanvasSize, {});
      expect(scene.primitives.length).toBeGreaterThan(0);
    });
  });

  describe("ID uniqueness and coordinate validity", () => {
    it("all primitive IDs are unique within a scene", () => {
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Unique IDs",
        explanation: "Checking all IDs are unique.",
        state: {
          numQubits: 2,
          amplitudes: [
            [0.5, 0],
            [0.5, 0],
            [0.5, 0],
            [0.5, 0],
          ],
          targetStates: [1],
        },
        visualActions: [
          {
            type: "showProbabilities",
            probabilities: [0.25, 0.25, 0.25, 0.25],
            labels: ["|00\u27E9", "|01\u27E9", "|10\u27E9", "|11\u27E9"],
          },
        ],
        codeHighlight: { language: "pseudocode", lines: [] },
        isTerminal: false,
      };

      const scene = layout(step, mockCanvasSize, {});
      const ids = scene.primitives.map((p) => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("all primitives have finite coordinates", () => {
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Finite Coords",
        explanation: "All coordinates should be finite numbers.",
        state: {
          numQubits: 2,
          amplitudes: [
            [0.5, 0],
            [0.5, 0],
            [0.5, 0],
            [0.5, 0],
          ],
        },
        visualActions: [],
        codeHighlight: { language: "pseudocode", lines: [] },
        isTerminal: false,
      };

      const scene = layout(step, mockCanvasSize, {});

      for (const prim of scene.primitives) {
        if (prim.kind === "element") {
          const el = prim as ElementPrimitive;
          expect(Number.isFinite(el.x)).toBe(true);
          expect(Number.isFinite(el.y)).toBe(true);
          expect(Number.isFinite(el.width)).toBe(true);
          expect(Number.isFinite(el.height)).toBe(true);
        } else if (prim.kind === "annotation") {
          const ann = prim as AnnotationPrimitive;
          expect(Number.isFinite(ann.x)).toBe(true);
          expect(Number.isFinite(ann.y)).toBe(true);
        } else if (prim.kind === "connection") {
          const conn = prim as ConnectionPrimitive;
          expect(Number.isFinite(conn.x1)).toBe(true);
          expect(Number.isFinite(conn.y1)).toBe(true);
          expect(Number.isFinite(conn.x2)).toBe(true);
          expect(Number.isFinite(conn.y2)).toBe(true);
        }
      }
    });

    it("produces stable IDs across identical steps", () => {
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Stable IDs",
        explanation: "Same step should produce the same IDs.",
        state: {
          numQubits: 2,
          amplitudes: [
            [0.5, 0],
            [0.5, 0],
            [0.5, 0],
            [0.5, 0],
          ],
        },
        visualActions: [],
        codeHighlight: { language: "pseudocode", lines: [] },
        isTerminal: false,
      };

      const scene1 = layout(step, mockCanvasSize, {});
      const scene2 = layout(step, mockCanvasSize, {});

      const ids1 = scene1.primitives.map((p) => p.id).sort();
      const ids2 = scene2.primitives.map((p) => p.id).sort();

      expect(ids1).toEqual(ids2);
    });
  });
});
