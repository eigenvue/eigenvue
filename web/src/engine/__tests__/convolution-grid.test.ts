/**
 * @fileoverview Tests for convolution-grid layout.
 *
 * These tests verify that the convolution-grid layout produces the correct
 * three-grid structure (input, kernel, output), operator symbols, sum badge,
 * product overlays, and the highlightKernelPosition / showConvolutionProducts /
 * writeOutputCell visual actions.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { getLayout } from "../layouts/registry";
import type { Step, CanvasSize, LayoutFunction, ElementPrimitive, ConnectionPrimitive, AnnotationPrimitive } from "../types";

// Import the layout module to trigger self-registration.
import "../layouts/convolution-grid";

const mockCanvasSize: CanvasSize = { width: 800, height: 600 };

/**
 * Helper: creates a basic Step for the convolution-grid layout.
 * Defaults to a 3x3 input, 2x2 kernel, and 2x2 output.
 */
function makeStep(overrides: Partial<Step> = {}): Step {
  return {
    index: 0,
    id: "step-1",
    title: "Test Step",
    explanation: "Testing layout.",
    state: {
      inputGrid: [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ],
      kernel: [
        [1, 0],
        [0, -1],
      ],
      outputGrid: [
        [0, 0],
        [0, 0],
      ],
      currentRow: 0,
      currentCol: 0,
    },
    visualActions: [],
    codeHighlight: { language: "pseudocode", lines: [] },
    isTerminal: false,
    ...overrides,
  };
}

describe("convolution-grid layout", () => {
  let layout: LayoutFunction;

  beforeEach(() => {
    layout = getLayout("convolution-grid")!;
    expect(layout).toBeDefined();
  });

  describe("registration", () => {
    it("is registered and retrievable by name", () => {
      const fn = getLayout("convolution-grid");
      expect(fn).toBeDefined();
      expect(typeof fn).toBe("function");
    });
  });

  describe("basic rendering", () => {
    it("renders 9 input cells for a 3x3 input", () => {
      const step = makeStep();
      const scene = layout(step, mockCanvasSize, {});

      const inputCells = scene.primitives.filter(
        p => p.kind === "element" && p.id.startsWith("input-cell-")
      );
      expect(inputCells.length).toBe(9);

      // Verify specific input cell IDs exist.
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          expect(scene.primitives.find(p => p.id === `input-cell-${r}-${c}`)).toBeDefined();
        }
      }
    });

    it("renders 4 kernel cells for a 2x2 kernel", () => {
      const step = makeStep();
      const scene = layout(step, mockCanvasSize, {});

      const kernelCells = scene.primitives.filter(
        p => p.kind === "element" && p.id.startsWith("kernel-cell-")
      );
      expect(kernelCells.length).toBe(4);

      for (let kr = 0; kr < 2; kr++) {
        for (let kc = 0; kc < 2; kc++) {
          expect(scene.primitives.find(p => p.id === `kernel-cell-${kr}-${kc}`)).toBeDefined();
        }
      }
    });

    it("renders 4 output cells for a 2x2 output", () => {
      const step = makeStep();
      const scene = layout(step, mockCanvasSize, {});

      const outputCells = scene.primitives.filter(
        p => p.kind === "element" && p.id.startsWith("output-cell-")
      );
      expect(outputCells.length).toBe(4);

      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 2; c++) {
          expect(scene.primitives.find(p => p.id === `output-cell-${r}-${c}`)).toBeDefined();
        }
      }
    });

    it("renders grid titles: title-input, title-kernel, title-output", () => {
      const step = makeStep();
      const scene = layout(step, mockCanvasSize, {});

      const titleInput = scene.primitives.find(p => p.id === "title-input");
      expect(titleInput).toBeDefined();
      expect(titleInput?.kind).toBe("annotation");

      const titleKernel = scene.primitives.find(p => p.id === "title-kernel");
      expect(titleKernel).toBeDefined();
      expect(titleKernel?.kind).toBe("annotation");

      const titleOutput = scene.primitives.find(p => p.id === "title-output");
      expect(titleOutput).toBeDefined();
      expect(titleOutput?.kind).toBe("annotation");
    });

    it("renders operator symbols: operator-star and operator-equals", () => {
      const step = makeStep();
      const scene = layout(step, mockCanvasSize, {});

      const star = scene.primitives.find(p => p.id === "operator-star");
      expect(star).toBeDefined();
      expect(star?.kind).toBe("annotation");

      const equals = scene.primitives.find(p => p.id === "operator-equals");
      expect(equals).toBeDefined();
      expect(equals?.kind).toBe("annotation");
    });

    it("sum badge appears when sum is defined with currentRow and currentCol", () => {
      const step = makeStep({
        state: {
          inputGrid: [[1, 2, 3], [4, 5, 6], [7, 8, 9]],
          kernel: [[1, 0], [0, -1]],
          outputGrid: [[0, 0], [0, 0]],
          currentRow: 0,
          currentCol: 0,
          sum: -4,
        },
      });
      const scene = layout(step, mockCanvasSize, {});

      const sumBadge = scene.primitives.find(p => p.id === "sum-badge");
      expect(sumBadge).toBeDefined();
      expect(sumBadge?.kind).toBe("annotation");
      expect((sumBadge as AnnotationPrimitive).form).toBe("badge");
      expect((sumBadge as AnnotationPrimitive).text).toContain("Σ");
    });

    it("sum badge does not appear when sum is undefined", () => {
      const step = makeStep({
        state: {
          inputGrid: [[1, 2, 3], [4, 5, 6], [7, 8, 9]],
          kernel: [[1, 0], [0, -1]],
          outputGrid: [[0, 0], [0, 0]],
        },
      });
      const scene = layout(step, mockCanvasSize, {});

      const sumBadge = scene.primitives.find(p => p.id === "sum-badge");
      expect(sumBadge).toBeUndefined();
    });
  });

  describe("visual actions", () => {
    it("highlightKernelPosition action highlights correct input cells", () => {
      const step = makeStep({
        visualActions: [
          { type: "highlightKernelPosition", row: 1, col: 1, kernelHeight: 2, kernelWidth: 2 },
        ],
      });

      const scene = layout(step, mockCanvasSize, {});

      // The highlighted cells should be at rows [1,2], cols [1,2].
      const highlightedCell = scene.primitives.find(p => p.id === "input-cell-1-1") as ElementPrimitive;
      const nonHighlightedCell = scene.primitives.find(p => p.id === "input-cell-0-0") as ElementPrimitive;

      expect(highlightedCell).toBeDefined();
      expect(nonHighlightedCell).toBeDefined();

      // The highlighted cell should have a different fill/stroke than the non-highlighted one.
      expect(highlightedCell.fillColor).not.toBe(nonHighlightedCell.fillColor);
      expect(highlightedCell.strokeColor).not.toBe(nonHighlightedCell.strokeColor);
      expect(highlightedCell.strokeWidth).toBeGreaterThan(nonHighlightedCell.strokeWidth);
    });

    it("showConvolutionProducts action shows product badges", () => {
      const step = makeStep({
        state: {
          inputGrid: [[1, 2, 3], [4, 5, 6], [7, 8, 9]],
          kernel: [[1, 0], [0, -1]],
          outputGrid: [[0, 0], [0, 0]],
          currentRow: 0,
          currentCol: 0,
          products: [[1, 0], [0, -5]],
        },
        visualActions: [
          { type: "highlightKernelPosition", row: 0, col: 0, kernelHeight: 2, kernelWidth: 2 },
          { type: "showConvolutionProducts" },
        ],
      });

      const scene = layout(step, mockCanvasSize, {});

      // Product badges should appear over the highlighted cells.
      const productBadges = scene.primitives.filter(
        p => p.kind === "annotation" && p.id.startsWith("product-")
      );
      expect(productBadges.length).toBeGreaterThan(0);
    });

    it("writeOutputCell action changes output cell appearance", () => {
      const stepBase = makeStep();
      const sceneBase = layout(stepBase, mockCanvasSize, {});
      const outputCellBase = sceneBase.primitives.find(p => p.id === "output-cell-0-0") as ElementPrimitive;

      const stepActive = makeStep({
        state: {
          inputGrid: [[1, 2, 3], [4, 5, 6], [7, 8, 9]],
          kernel: [[1, 0], [0, -1]],
          outputGrid: [[-4, 0], [0, 0]],
          currentRow: 0,
          currentCol: 0,
        },
        visualActions: [
          { type: "writeOutputCell", row: 0, col: 0 },
        ],
      });
      const sceneActive = layout(stepActive, mockCanvasSize, {});
      const outputCellActive = sceneActive.primitives.find(p => p.id === "output-cell-0-0") as ElementPrimitive;

      expect(outputCellActive).toBeDefined();

      // The just-written output cell should have a thicker stroke.
      expect(outputCellActive.strokeWidth).toBeGreaterThan(outputCellBase.strokeWidth);
    });
  });

  describe("purity", () => {
    it("calling twice with same args produces identical output", () => {
      const step = makeStep({
        visualActions: [
          { type: "highlightKernelPosition", row: 0, col: 0, kernelHeight: 2, kernelWidth: 2 },
        ],
      });

      const scene1 = layout(step, mockCanvasSize, {});
      const scene2 = layout(step, mockCanvasSize, {});

      // Deep equality check: same primitives in same order.
      expect(scene1.primitives.length).toBe(scene2.primitives.length);

      for (let i = 0; i < scene1.primitives.length; i++) {
        expect(scene1.primitives[i]).toEqual(scene2.primitives[i]);
      }
    });
  });

  describe("ID uniqueness and coordinate validity", () => {
    it("all primitive IDs are unique within a scene", () => {
      const step = makeStep({
        state: {
          inputGrid: [[1, 2, 3], [4, 5, 6], [7, 8, 9]],
          kernel: [[1, 0], [0, -1]],
          outputGrid: [[-4, 0], [0, 0]],
          currentRow: 0,
          currentCol: 0,
          products: [[1, 0], [0, -5]],
          sum: -4,
        },
        visualActions: [
          { type: "highlightKernelPosition", row: 0, col: 0, kernelHeight: 2, kernelWidth: 2 },
          { type: "showConvolutionProducts" },
          { type: "writeOutputCell", row: 0, col: 0 },
        ],
      });

      const scene = layout(step, mockCanvasSize, {});
      const ids = scene.primitives.map(p => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("all primitives have finite coordinates", () => {
      const step = makeStep();
      const scene = layout(step, mockCanvasSize, {});

      for (const prim of scene.primitives) {
        if (prim.kind === "element") {
          const el = prim as ElementPrimitive;
          expect(Number.isFinite(el.x)).toBe(true);
          expect(Number.isFinite(el.y)).toBe(true);
          expect(Number.isFinite(el.width)).toBe(true);
          expect(Number.isFinite(el.height)).toBe(true);
        } else if (prim.kind === "connection") {
          const conn = prim as ConnectionPrimitive;
          expect(Number.isFinite(conn.x1)).toBe(true);
          expect(Number.isFinite(conn.y1)).toBe(true);
          expect(Number.isFinite(conn.x2)).toBe(true);
          expect(Number.isFinite(conn.y2)).toBe(true);
          expect(Number.isFinite(conn.curveOffset)).toBe(true);
        } else if (prim.kind === "annotation") {
          const ann = prim as AnnotationPrimitive;
          expect(Number.isFinite(ann.x)).toBe(true);
          expect(Number.isFinite(ann.y)).toBe(true);
        }
      }
    });
  });
});
