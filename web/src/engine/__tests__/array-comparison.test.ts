/**
 * @fileoverview Tests for array-comparison layout.
 *
 * Validates that the array-comparison layout:
 * - Produces correct primitive structures for sorting algorithm steps
 * - Handles all visual actions (swap arcs, comparisons, pointers, pivot, partition, auxiliary)
 * - Maintains stable IDs across steps for smooth animation
 * - Handles edge cases gracefully (empty arrays, out-of-bounds indices)
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
import "../layouts/array-comparison";

const mockCanvasSize: CanvasSize = { width: 800, height: 600 };

/** Helper: create a Step with the given overrides. */
function makeStep({ state, ...rest }: Partial<Step> & { state: Record<string, unknown> }): Step {
  return {
    index: 0,
    id: "test-step",
    title: "Test Step",
    explanation: "Test explanation.",
    state,
    visualActions: [],
    codeHighlight: { language: "pseudocode", lines: [] },
    isTerminal: false,
    ...rest,
  };
}

describe("array-comparison layout", () => {
  let layout: LayoutFunction;

  beforeEach(() => {
    layout = getLayout("array-comparison")!;
    expect(layout).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // Basic rendering
  // ---------------------------------------------------------------------------

  describe("basic rendering", () => {
    it("returns empty scene for empty array", () => {
      const step = makeStep({ state: { array: [] } });
      const scene = layout(step, mockCanvasSize, {});
      expect(scene.primitives).toEqual([]);
    });

    it("returns empty scene when array is missing from state", () => {
      const step = makeStep({ state: {} });
      const scene = layout(step, mockCanvasSize, {});
      expect(scene.primitives).toEqual([]);
    });

    it("renders a single element with correct label and sub-label", () => {
      const step = makeStep({ state: { array: [42] } });
      const scene = layout(step, mockCanvasSize, {});

      const elements = scene.primitives.filter((p) => p.kind === "element");
      expect(elements).toHaveLength(1);

      const cell = elements[0] as ElementPrimitive;
      expect(cell.id).toBe("cell-0");
      expect(cell.label).toBe("42");
      expect(cell.subLabel).toBe("0");
      expect(cell.shape).toBe("roundedRect");
    });

    it("renders N elements with sequential IDs and correct labels", () => {
      const array = [38, 27, 43, 3, 9];
      const step = makeStep({ state: { array } });
      const scene = layout(step, mockCanvasSize, {});

      const elements = scene.primitives.filter((p) => p.kind === "element");
      expect(elements).toHaveLength(array.length);

      for (let i = 0; i < array.length; i++) {
        const cell = elements[i] as ElementPrimitive;
        expect(cell.id).toBe(`cell-${i}`);
        expect(cell.label).toBe(String(array[i]));
        expect(cell.subLabel).toBe(String(i));
        // Default fill color (slate-800).
        expect(cell.fillColor).toBe("#1e293b");
      }
    });

    it("elements are horizontally centered on the canvas", () => {
      const step = makeStep({ state: { array: [1, 2, 3] } });
      const scene = layout(step, mockCanvasSize, {});

      const elements = scene.primitives.filter((p) => p.kind === "element") as ElementPrimitive[];
      const xs = elements.map((e) => e.x);

      // All x values should be within the canvas bounds.
      for (const x of xs) {
        expect(x).toBeGreaterThan(0);
        expect(x).toBeLessThan(mockCanvasSize.width);
      }

      // The array should be centered — check symmetry about the canvas midpoint.
      const center = mockCanvasSize.width / 2;
      const leftDistance = center - xs[0]!;
      const rightDistance = xs[xs.length - 1]! - center;
      expect(Math.abs(leftDistance - rightDistance)).toBeLessThan(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Visual actions
  // ---------------------------------------------------------------------------

  describe("visual actions", () => {
    it("applies highlightElement to the target cell", () => {
      const step = makeStep({
        state: { array: [1, 2, 3, 4, 5] },
        visualActions: [{ type: "highlightElement", index: 2, color: "highlight" }],
      });
      const scene = layout(step, mockCanvasSize, {});
      const cell = scene.primitives.find((p) => p.id === "cell-2") as ElementPrimitive;

      expect(cell).toBeDefined();
      expect(cell.fillColor).toBe("#38bdf8"); // THEME.highlight (sky-400)
    });

    it("applies highlightElement with highlightAlt color", () => {
      const step = makeStep({
        state: { array: [1, 2, 3, 4, 5] },
        visualActions: [{ type: "highlightElement", index: 3, color: "highlightAlt" }],
      });
      const scene = layout(step, mockCanvasSize, {});
      const cell = scene.primitives.find((p) => p.id === "cell-3") as ElementPrimitive;

      expect(cell.fillColor).toBe("#818cf8"); // THEME.highlightAlt (indigo-400)
    });

    it("creates pointer annotation aligned with target cell", () => {
      const step = makeStep({
        state: { array: [10, 20, 30, 40, 50] },
        visualActions: [{ type: "movePointer", id: "j", to: 2 }],
      });
      const scene = layout(step, mockCanvasSize, {});

      const pointer = scene.primitives.find((p) => p.id === "pointer-j") as AnnotationPrimitive;
      const cell = scene.primitives.find((p) => p.id === "cell-2") as ElementPrimitive;

      expect(pointer).toBeDefined();
      expect(pointer.kind).toBe("annotation");
      expect(pointer.form).toBe("pointer");
      expect(pointer.text).toBe("j");
      // Pointer x aligns with cell center x.
      expect(pointer.x).toBe(cell.x);
    });

    it("staggers multiple pointers targeting the same cell", () => {
      const step = makeStep({
        state: { array: [1, 2, 3] },
        visualActions: [
          { type: "movePointer", id: "i", to: 1 },
          { type: "movePointer", id: "j", to: 1 },
        ],
      });
      const scene = layout(step, mockCanvasSize, {});

      const pi = scene.primitives.find((p) => p.id === "pointer-i") as AnnotationPrimitive;
      const pj = scene.primitives.find((p) => p.id === "pointer-j") as AnnotationPrimitive;

      expect(pi).toBeDefined();
      expect(pj).toBeDefined();
      // Same x (both target cell 1).
      expect(pi.x).toBe(pj.x);
      // Different y (staggered vertically).
      expect(pi.y).not.toBe(pj.y);
    });

    it("creates swap arc ConnectionPrimitive between two cells", () => {
      const step = makeStep({
        state: { array: [5, 3, 8, 1] },
        visualActions: [{ type: "swapElements", i: 0, j: 2 }],
      });
      const scene = layout(step, mockCanvasSize, {});

      const arc = scene.primitives.find((p) => p.id === "swap-arc-0") as ConnectionPrimitive;
      expect(arc).toBeDefined();
      expect(arc.kind).toBe("connection");
      expect(arc.color).toBe("#f472b6"); // THEME.swapArc (pink-400)
      expect(arc.arrowHead).toBe("both");
      // Arc curves upward (negative curveOffset).
      expect(arc.curveOffset).toBeLessThan(0);
    });

    it("creates comparison line with result badge for 'greater'", () => {
      const step = makeStep({
        state: { array: [5, 3] },
        visualActions: [{ type: "compareElements", i: 0, j: 1, result: "greater" }],
      });
      const scene = layout(step, mockCanvasSize, {});

      const line = scene.primitives.find((p) => p.id === "compare-line-0") as ConnectionPrimitive;
      expect(line).toBeDefined();
      expect(line.kind).toBe("connection");
      expect(line.label).toBe(">");
      expect(line.color).toBe("#60a5fa"); // THEME.compareLine (blue-400)
    });

    it("creates comparison line with result badge for 'less'", () => {
      const step = makeStep({
        state: { array: [3, 5] },
        visualActions: [{ type: "compareElements", i: 0, j: 1, result: "less" }],
      });
      const scene = layout(step, mockCanvasSize, {});

      const line = scene.primitives.find((p) => p.id === "compare-line-0") as ConnectionPrimitive;
      expect(line.label).toBe("<");
    });

    it("creates comparison line with result badge for 'equal'", () => {
      const step = makeStep({
        state: { array: [5, 5] },
        visualActions: [{ type: "compareElements", i: 0, j: 1, result: "equal" }],
      });
      const scene = layout(step, mockCanvasSize, {});

      const line = scene.primitives.find((p) => p.id === "compare-line-0") as ConnectionPrimitive;
      expect(line.label).toBe("=");
    });

    it("also accepts short-form compare result values (gt, lt, eq)", () => {
      const step = makeStep({
        state: { array: [5, 3, 5] },
        visualActions: [
          { type: "compareElements", i: 0, j: 1, result: "gt" },
          { type: "compareElements", i: 0, j: 2, result: "eq" },
        ],
      });
      const scene = layout(step, mockCanvasSize, {});

      const line0 = scene.primitives.find((p) => p.id === "compare-line-0") as ConnectionPrimitive;
      const line1 = scene.primitives.find((p) => p.id === "compare-line-1") as ConnectionPrimitive;
      expect(line0.label).toBe(">");
      expect(line1.label).toBe("=");
    });

    it("creates pivot badge annotation below the pivot cell", () => {
      const step = makeStep({
        state: { array: [3, 1, 4, 1, 5] },
        visualActions: [{ type: "markPivot", index: 4 }],
      });
      const scene = layout(step, mockCanvasSize, {});

      const badge = scene.primitives.find((p) => p.id === "badge-pivot") as AnnotationPrimitive;
      expect(badge).toBeDefined();
      expect(badge.kind).toBe("annotation");
      expect(badge.form).toBe("badge");
      expect(badge.text).toBe("pivot");
      expect(badge.color).toBe("#c084fc"); // THEME.pivot (purple-400)
    });

    it("creates partition boundary as a dashed vertical line", () => {
      const step = makeStep({
        state: { array: [1, 2, 3, 4, 5] },
        visualActions: [{ type: "setPartition", index: 2 }],
      });
      const scene = layout(step, mockCanvasSize, {});

      const partLine = scene.primitives.find((p) => p.id === "partition-line") as ConnectionPrimitive;
      expect(partLine).toBeDefined();
      expect(partLine.kind).toBe("connection");
      // Vertical line: same x for both endpoints.
      expect(partLine.x1).toBe(partLine.x2);
      // Dashed pattern.
      expect(partLine.dashPattern).toEqual([6, 4]);
    });

    it("applies markSorted to color cells green", () => {
      const step = makeStep({
        state: { array: [1, 2, 3, 4, 5] },
        visualActions: [{ type: "markSorted", indices: [3, 4] }],
      });
      const scene = layout(step, mockCanvasSize, {});

      const cell3 = scene.primitives.find((p) => p.id === "cell-3") as ElementPrimitive;
      const cell4 = scene.primitives.find((p) => p.id === "cell-4") as ElementPrimitive;
      expect(cell3.fillColor).toBe("#22c55e"); // THEME.sorted (green-500)
      expect(cell4.fillColor).toBe("#22c55e");

      // Unsorted cells retain default fill.
      const cell0 = scene.primitives.find((p) => p.id === "cell-0") as ElementPrimitive;
      expect(cell0.fillColor).toBe("#1e293b"); // THEME.cellDefault
    });

    it("individual highlight overrides markSorted color", () => {
      const step = makeStep({
        state: { array: [1, 2, 3] },
        visualActions: [
          { type: "markSorted", indices: [0, 1, 2] },
          { type: "highlightElement", index: 1, color: "highlight" },
        ],
      });
      const scene = layout(step, mockCanvasSize, {});

      // Cell 1 should be highlight color, not sorted color.
      const cell1 = scene.primitives.find((p) => p.id === "cell-1") as ElementPrimitive;
      expect(cell1.fillColor).toBe("#38bdf8"); // highlight overrides sorted
    });

    it("applies dimRange to dim cells with reduced opacity", () => {
      const step = makeStep({
        state: { array: [1, 2, 3, 4, 5] },
        visualActions: [{ type: "dimRange", from: 0, to: 1 }],
      });
      const scene = layout(step, mockCanvasSize, {});

      const cell0 = scene.primitives.find((p) => p.id === "cell-0") as ElementPrimitive;
      const cell1 = scene.primitives.find((p) => p.id === "cell-1") as ElementPrimitive;
      expect(cell0.fillColor).toBe("#0f172a"); // THEME.dimmed
      expect(cell0.opacity).toBe(0.4);
      expect(cell1.fillColor).toBe("#0f172a");
      expect(cell1.opacity).toBe(0.4);

      // Cell 2 should be unaffected.
      const cell2 = scene.primitives.find((p) => p.id === "cell-2") as ElementPrimitive;
      expect(cell2.fillColor).toBe("#1e293b");
      expect(cell2.opacity).toBe(1);
    });

    it("applies highlightRange to cells in [from, to]", () => {
      const step = makeStep({
        state: { array: [1, 2, 3, 4, 5] },
        visualActions: [{ type: "highlightRange", from: 1, to: 3 }],
      });
      const scene = layout(step, mockCanvasSize, {});

      const cell1 = scene.primitives.find((p) => p.id === "cell-1") as ElementPrimitive;
      const cell2 = scene.primitives.find((p) => p.id === "cell-2") as ElementPrimitive;
      const cell3 = scene.primitives.find((p) => p.id === "cell-3") as ElementPrimitive;
      // rangeHighlight color.
      expect(cell1.fillColor).toBe("rgba(30, 64, 175, 0.2)");
      expect(cell2.fillColor).toBe("rgba(30, 64, 175, 0.2)");
      expect(cell3.fillColor).toBe("rgba(30, 64, 175, 0.2)");

      // Cell 0 and 4 should be unaffected.
      const cell0 = scene.primitives.find((p) => p.id === "cell-0") as ElementPrimitive;
      expect(cell0.fillColor).toBe("#1e293b");
    });

    it("creates showMessage annotation at canvas bottom", () => {
      const step = makeStep({
        state: { array: [1, 2, 3] },
        visualActions: [
          { type: "showMessage", text: "Sorted!", messageType: "success" },
        ],
      });
      const scene = layout(step, mockCanvasSize, {});

      const msg = scene.primitives.find((p) => p.id === "message") as AnnotationPrimitive;
      expect(msg).toBeDefined();
      expect(msg.kind).toBe("annotation");
      expect(msg.form).toBe("label");
      expect(msg.text).toBe("Sorted!");
      expect(msg.textColor).toBe("#22c55e"); // success → green
    });
  });

  // ---------------------------------------------------------------------------
  // Auxiliary array
  // ---------------------------------------------------------------------------

  describe("auxiliary array", () => {
    it("renders auxiliary row when state.auxiliary is present", () => {
      const step = makeStep({
        state: {
          array: [5, 3, 8, 1],
          auxiliary: [null, null, 3, 5],
        },
      });
      const scene = layout(step, mockCanvasSize, {});

      // Should have main cells + aux cells + aux label.
      const auxCells = scene.primitives.filter(
        (p) => p.kind === "element" && p.id.startsWith("aux-cell-"),
      ) as ElementPrimitive[];
      expect(auxCells).toHaveLength(4);

      // Cells with values should be opaque; null cells should be dimmed.
      const auxCell0 = auxCells.find((c) => c.id === "aux-cell-0")!;
      const auxCell2 = auxCells.find((c) => c.id === "aux-cell-2")!;
      expect(auxCell0.opacity).toBe(0.3); // null → empty
      expect(auxCell0.label).toBe("");
      expect(auxCell2.opacity).toBe(1);
      expect(auxCell2.label).toBe("3");
    });

    it("renders auxiliary row from setAuxiliary visual action", () => {
      const step = makeStep({
        state: { array: [1, 2, 3] },
        visualActions: [
          { type: "setAuxiliary", array: [1, null, null] },
        ],
      });
      const scene = layout(step, mockCanvasSize, {});

      const auxCells = scene.primitives.filter(
        (p) => p.kind === "element" && p.id.startsWith("aux-cell-"),
      ) as ElementPrimitive[];
      expect(auxCells).toHaveLength(3);
    });

    it("applies highlightAuxiliary to color a specific aux cell", () => {
      const step = makeStep({
        state: {
          array: [1, 2, 3],
          auxiliary: [1, null, null],
        },
        visualActions: [
          { type: "highlightAuxiliary", index: 0, color: "highlight" },
        ],
      });
      const scene = layout(step, mockCanvasSize, {});

      const auxCell0 = scene.primitives.find((p) => p.id === "aux-cell-0") as ElementPrimitive;
      expect(auxCell0.fillColor).toBe("#38bdf8"); // THEME.highlight
    });
  });

  // ---------------------------------------------------------------------------
  // Stable IDs across steps
  // ---------------------------------------------------------------------------

  describe("stable IDs across steps", () => {
    it("maintains consistent cell IDs for the same array across steps", () => {
      const array = [10, 20, 30];

      const step1 = makeStep({
        index: 0,
        state: { array },
        visualActions: [],
      });
      const step2 = makeStep({
        index: 1,
        state: { array },
        visualActions: [{ type: "highlightElement", index: 1 }],
      });

      const scene1 = layout(step1, mockCanvasSize, {});
      const scene2 = layout(step2, mockCanvasSize, {});

      const ids1 = scene1.primitives.filter((p) => p.kind === "element").map((p) => p.id);
      const ids2 = scene2.primitives.filter((p) => p.kind === "element").map((p) => p.id);
      expect(ids1).toEqual(ids2);
    });

    it("produces stable swap-arc IDs across renders", () => {
      const step = makeStep({
        state: { array: [5, 3] },
        visualActions: [{ type: "swapElements", i: 0, j: 1 }],
      });

      const scene1 = layout(step, mockCanvasSize, {});
      const scene2 = layout(step, mockCanvasSize, {});

      const arc1 = scene1.primitives.find((p) => p.id === "swap-arc-0");
      const arc2 = scene2.primitives.find((p) => p.id === "swap-arc-0");
      expect(arc1).toBeDefined();
      expect(arc2).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  describe("edge cases", () => {
    it("handles highlightElement with out-of-bounds index gracefully", () => {
      const step = makeStep({
        state: { array: [1, 2, 3] },
        visualActions: [{ type: "highlightElement", index: 10 }],
      });
      const scene = layout(step, mockCanvasSize, {});
      // Should not crash. Only the 3 cells exist.
      const elements = scene.primitives.filter((p) => p.kind === "element");
      expect(elements).toHaveLength(3);
    });

    it("handles movePointer with out-of-bounds index gracefully", () => {
      const step = makeStep({
        state: { array: [1, 2, 3] },
        visualActions: [{ type: "movePointer", id: "ptr", to: -1 }],
      });
      const scene = layout(step, mockCanvasSize, {});
      const pointer = scene.primitives.find((p) => p.id === "pointer-ptr");
      // Pointer should not be rendered for out-of-bounds target.
      expect(pointer).toBeUndefined();
    });

    it("handles swapElements with i === j gracefully (no arc created)", () => {
      const step = makeStep({
        state: { array: [1, 2, 3] },
        visualActions: [{ type: "swapElements", i: 1, j: 1 }],
      });
      const scene = layout(step, mockCanvasSize, {});
      const arcs = scene.primitives.filter((p) => p.id.startsWith("swap-arc-"));
      expect(arcs).toHaveLength(0);
    });

    it("ignores unknown visual action types (open vocabulary)", () => {
      const step = makeStep({
        state: { array: [1, 2, 3] },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        visualActions: [{ type: "unknownFutureAction", data: 42 } as any],
      });
      // Should not crash.
      const scene = layout(step, mockCanvasSize, {});
      expect(scene.primitives.length).toBeGreaterThan(0);
    });

    it("handles markPivot with out-of-bounds index gracefully (no badge)", () => {
      const step = makeStep({
        state: { array: [1, 2] },
        visualActions: [{ type: "markPivot", index: 5 }],
      });
      const scene = layout(step, mockCanvasSize, {});
      const badge = scene.primitives.find((p) => p.id === "badge-pivot");
      expect(badge).toBeUndefined();
    });

    it("handles setPartition with out-of-bounds index gracefully (no line)", () => {
      const step = makeStep({
        state: { array: [1, 2] },
        visualActions: [{ type: "setPartition", index: 10 }],
      });
      const scene = layout(step, mockCanvasSize, {});
      const line = scene.primitives.find((p) => p.id === "partition-line");
      expect(line).toBeUndefined();
    });
  });
});
