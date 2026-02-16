/**
 * @fileoverview Tests for array-with-pointers layout.
 *
 * These tests verify that the array-with-pointers layout produces the correct
 * primitive structure, handles all visual actions, and maintains stable IDs
 * across steps for smooth animation.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { getLayout } from "../layouts/registry";
import type {
  Step,
  CanvasSize,
  LayoutFunction,
  ElementPrimitive,
  AnnotationPrimitive,
} from "../types";

// Import the layout module to trigger self-registration.
import "../layouts/array-with-pointers";

const mockCanvasSize: CanvasSize = { width: 800, height: 600 };

describe("array-with-pointers layout", () => {
  let layout: LayoutFunction;

  beforeEach(() => {
    layout = getLayout("array-with-pointers")!;
    expect(layout).toBeDefined();
  });

  describe("basic rendering", () => {
    it("returns empty scene for empty array", () => {
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Empty Array",
        explanation: "Testing empty array handling.",
        state: { array: [] },
        visualActions: [],
        codeHighlight: { language: "python", lines: [] },
        isTerminal: true,
      };

      const scene = layout(step, mockCanvasSize, {});
      expect(scene.primitives).toEqual([]);
    });

    it("renders a single element at center", () => {
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Single Element",
        explanation: "One element array.",
        state: { array: [42] },
        visualActions: [],
        codeHighlight: { language: "python", lines: [] },
        isTerminal: false,
      };

      const scene = layout(step, mockCanvasSize, {});
      expect(scene.primitives.length).toBe(1);

      const cell = scene.primitives[0];
      expect(cell?.kind).toBe("element");
      expect(cell?.id).toBe("cell-0");
      expect((cell as ElementPrimitive).label).toBe("42");
      expect((cell as ElementPrimitive).subLabel).toBe("0");
    });

    it("renders 7 elements with default fill and correct IDs", () => {
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Seven Elements",
        explanation: "Array with seven elements.",
        state: { array: [1, 3, 5, 7, 9, 11, 13] },
        visualActions: [],
        codeHighlight: { language: "python", lines: [] },
        isTerminal: false,
      };

      const scene = layout(step, mockCanvasSize, {});

      // Should have exactly 7 element primitives (one per array cell).
      const elements = scene.primitives.filter((p) => p.kind === "element");
      expect(elements.length).toBe(7);

      // Verify IDs are stable and sequential.
      for (let i = 0; i < 7; i++) {
        expect(elements[i]?.id).toBe(`cell-${i}`);
        expect((elements[i] as ElementPrimitive).label).toBe(String([1, 3, 5, 7, 9, 11, 13][i]));
        expect((elements[i] as ElementPrimitive).subLabel).toBe(String(i));
        // Default fill color (slate-800).
        expect((elements[i] as ElementPrimitive).fillColor).toBe("#1e293b");
      }
    });
  });

  describe("visual actions", () => {
    it("applies highlightElement to target cell", () => {
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Highlight",
        explanation: "Highlighting cell 3.",
        state: { array: [1, 3, 5, 7, 9, 11, 13] },
        visualActions: [{ type: "highlightElement", index: 3 }],
        codeHighlight: { language: "python", lines: [] },
        isTerminal: false,
      };

      const scene = layout(step, mockCanvasSize, {});
      const cell3 = scene.primitives.find((p) => p.id === "cell-3");

      expect(cell3).toBeDefined();
      expect((cell3 as ElementPrimitive).fillColor).toBe("#38bdf8"); // THEME.highlight
    });

    it("creates pointer annotation with correct x position", () => {
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Move Pointer",
        explanation: "Moving 'mid' pointer to index 3.",
        state: { array: [1, 3, 5, 7, 9, 11, 13] },
        visualActions: [{ type: "movePointer", id: "mid", to: 3 }],
        codeHighlight: { language: "python", lines: [] },
        isTerminal: false,
      };

      const scene = layout(step, mockCanvasSize, {});
      const pointer = scene.primitives.find((p) => p.id === "pointer-mid");

      expect(pointer).toBeDefined();
      expect(pointer?.kind).toBe("annotation");
      expect((pointer as AnnotationPrimitive).form).toBe("pointer");
      expect((pointer as AnnotationPrimitive).text).toBe("mid");

      // The pointer's x should align with cell-3's center x.
      const cell3 = scene.primitives.find((p) => p.id === "cell-3");
      expect((pointer as AnnotationPrimitive).x).toBe((cell3 as ElementPrimitive).x);
    });

    it("staggers multiple pointers on the same cell vertically", () => {
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Multiple Pointers",
        explanation: "Two pointers on cell 3.",
        state: { array: [1, 3, 5, 7, 9, 11, 13] },
        visualActions: [
          { type: "movePointer", id: "left", to: 3 },
          { type: "movePointer", id: "right", to: 3 },
        ],
        codeHighlight: { language: "python", lines: [] },
        isTerminal: false,
      };

      const scene = layout(step, mockCanvasSize, {});
      const pointerLeft = scene.primitives.find((p) => p.id === "pointer-left");
      const pointerRight = scene.primitives.find((p) => p.id === "pointer-right");

      expect(pointerLeft).toBeDefined();
      expect(pointerRight).toBeDefined();

      // Both should have the same x (aligned with cell 3).
      expect((pointerLeft as AnnotationPrimitive).x).toBe((pointerRight as AnnotationPrimitive).x);

      // They should have different y (staggered vertically).
      expect((pointerLeft as AnnotationPrimitive).y).not.toBe(
        (pointerRight as AnnotationPrimitive).y,
      );
    });

    it("applies markFound action: green cell and 'Found!' badge", () => {
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Found",
        explanation: "Target found at index 5.",
        state: { array: [1, 3, 5, 7, 9, 11, 13] },
        visualActions: [{ type: "markFound", index: 5 }],
        codeHighlight: { language: "python", lines: [] },
        isTerminal: false,
      };

      const scene = layout(step, mockCanvasSize, {});
      const cell5 = scene.primitives.find((p) => p.id === "cell-5");
      const badge = scene.primitives.find((p) => p.id === "badge-found");

      expect(cell5).toBeDefined();
      expect((cell5 as ElementPrimitive).fillColor).toBe("#22c55e"); // THEME.found (green)

      expect(badge).toBeDefined();
      expect(badge?.kind).toBe("annotation");
      expect((badge as AnnotationPrimitive).form).toBe("badge");
      expect((badge as AnnotationPrimitive).text).toBe("Found!");
    });

    it("applies markNotFound action: 'Target Not Found' label exists", () => {
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Not Found",
        explanation: "Target not in array.",
        state: { array: [1, 3, 5, 7, 9, 11, 13] },
        visualActions: [{ type: "markNotFound" }],
        codeHighlight: { language: "python", lines: [] },
        isTerminal: false,
      };

      const scene = layout(step, mockCanvasSize, {});
      const label = scene.primitives.find((p) => p.id === "label-not-found");

      expect(label).toBeDefined();
      expect(label?.kind).toBe("annotation");
      expect((label as AnnotationPrimitive).form).toBe("label");
      expect((label as AnnotationPrimitive).text).toBe("Target Not Found");
      expect((label as AnnotationPrimitive).textColor).toBe("#ef4444"); // THEME.notFound (red)
    });
  });

  describe("stable IDs across steps", () => {
    it("maintains consistent cell IDs for the same array", () => {
      const array = [10, 20, 30, 40, 50];

      const step1: Step = {
        index: 0,
        id: "step-1",
        title: "Step 1",
        explanation: "Initial state.",
        state: { array },
        visualActions: [],
        codeHighlight: { language: "python", lines: [] },
        isTerminal: false,
      };

      const step2: Step = {
        index: 1,
        id: "step-2",
        title: "Step 2",
        explanation: "After some operation.",
        state: { array },
        visualActions: [{ type: "highlightElement", index: 2 }],
        codeHighlight: { language: "python", lines: [] },
        isTerminal: false,
      };

      const scene1 = layout(step1, mockCanvasSize, {});
      const scene2 = layout(step2, mockCanvasSize, {});

      const ids1 = scene1.primitives.filter((p) => p.kind === "element").map((p) => p.id);
      const ids2 = scene2.primitives.filter((p) => p.kind === "element").map((p) => p.id);

      // Cell IDs must be the same across both steps.
      expect(ids1).toEqual(ids2);
      expect(ids1).toEqual(["cell-0", "cell-1", "cell-2", "cell-3", "cell-4"]);
    });

    it("maintains consistent pointer IDs across steps", () => {
      const array = [1, 2, 3, 4, 5];

      const step1: Step = {
        index: 0,
        id: "step-1",
        title: "Step 1",
        explanation: "Pointer at 0.",
        state: { array },
        visualActions: [{ type: "movePointer", id: "ptr", to: 0 }],
        codeHighlight: { language: "python", lines: [] },
        isTerminal: false,
      };

      const step2: Step = {
        index: 1,
        id: "step-2",
        title: "Step 2",
        explanation: "Pointer at 3.",
        state: { array },
        visualActions: [{ type: "movePointer", id: "ptr", to: 3 }],
        codeHighlight: { language: "python", lines: [] },
        isTerminal: false,
      };

      const scene1 = layout(step1, mockCanvasSize, {});
      const scene2 = layout(step2, mockCanvasSize, {});

      const pointer1 = scene1.primitives.find((p) => p.id === "pointer-ptr");
      const pointer2 = scene2.primitives.find((p) => p.id === "pointer-ptr");

      expect(pointer1).toBeDefined();
      expect(pointer2).toBeDefined();

      // ID is stable, position changes.
      expect(pointer1?.id).toBe(pointer2?.id);
      expect((pointer1 as AnnotationPrimitive).x).not.toBe((pointer2 as AnnotationPrimitive).x); // Different position
    });
  });

  describe("edge cases", () => {
    it("handles highlightElement with out-of-bounds index gracefully", () => {
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Out of Bounds",
        explanation: "Index 10 doesn't exist.",
        state: { array: [1, 2, 3] },
        visualActions: [{ type: "highlightElement", index: 10 }],
        codeHighlight: { language: "python", lines: [] },
        isTerminal: false,
      };

      // Should not crash.
      const scene = layout(step, mockCanvasSize, {});
      expect(scene.primitives.length).toBe(3); // Only the 3 cells
    });

    it("handles movePointer with out-of-bounds index gracefully", () => {
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Pointer Out of Bounds",
        explanation: "Pointer to index -1.",
        state: { array: [1, 2, 3] },
        visualActions: [{ type: "movePointer", id: "ptr", to: -1 }],
        codeHighlight: { language: "python", lines: [] },
        isTerminal: false,
      };

      // Pointer should not be created.
      const scene = layout(step, mockCanvasSize, {});
      const pointer = scene.primitives.find((p) => p.id === "pointer-ptr");
      expect(pointer).toBeUndefined();
    });

    it("handles missing array gracefully", () => {
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "No Array",
        explanation: "State has no array field.",
        state: {},
        visualActions: [],
        codeHighlight: { language: "python", lines: [] },
        isTerminal: false,
      };

      // Should return empty scene, not crash.
      const scene = layout(step, mockCanvasSize, {});
      expect(scene.primitives).toEqual([]);
    });
  });
});
