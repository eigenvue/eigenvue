/**
 * @fileoverview Tests for attention-heatmap layout.
 *
 * These tests verify that the attention-heatmap layout produces the correct
 * grid cell structure, handles attention matrix visual actions, and maintains
 * stable IDs for smooth animation.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { getLayout } from "../layouts/registry";
import type { Step, CanvasSize, LayoutFunction, ElementPrimitive, AnnotationPrimitive } from "../types";

// Import the layout module to trigger self-registration.
import "../layouts/attention-heatmap";

const mockCanvasSize: CanvasSize = { width: 800, height: 600 };

describe("attention-heatmap layout", () => {
  let layout: LayoutFunction;

  beforeEach(() => {
    layout = getLayout("attention-heatmap")!;
    expect(layout).toBeDefined();
  });

  describe("registration", () => {
    it("is registered and retrievable by name", () => {
      const fn = getLayout("attention-heatmap");
      expect(fn).toBeDefined();
      expect(typeof fn).toBe("function");
    });
  });

  describe("basic rendering", () => {
    it("renders correct number of grid cells for N x N attention matrix", () => {
      const tokens = ["The", "cat", "sat"];
      const N = tokens.length;
      const weights = [
        [0.5, 0.3, 0.2],
        [0.1, 0.7, 0.2],
        [0.2, 0.2, 0.6],
      ];

      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Full Attention Matrix",
        explanation: "Showing 3x3 attention matrix.",
        state: { tokens },
        visualActions: [
          { type: "showFullAttentionMatrix", weights },
        ],
        codeHighlight: { language: "pseudocode", lines: [] },
        isTerminal: false,
      };

      const scene = layout(step, mockCanvasSize, {});
      const cells = scene.primitives.filter(
        p => p.kind === "element" && p.id.startsWith("heatmap-cell-")
      );

      // N x N grid should produce N*N cells.
      expect(cells.length).toBe(N * N);
    });

    it("showFullAttentionMatrix action populates grid with colored cells", () => {
      const tokens = ["A", "B"];
      const weights = [
        [0.8, 0.2],
        [0.3, 0.7],
      ];

      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Colored Cells",
        explanation: "Cells should have heatmap colors.",
        state: { tokens },
        visualActions: [
          { type: "showFullAttentionMatrix", weights },
        ],
        codeHighlight: { language: "pseudocode", lines: [] },
        isTerminal: false,
      };

      const scene = layout(step, mockCanvasSize, {});
      const cell00 = scene.primitives.find(p => p.id === "heatmap-cell-0-0") as ElementPrimitive;
      const cell01 = scene.primitives.find(p => p.id === "heatmap-cell-0-1") as ElementPrimitive;

      expect(cell00).toBeDefined();
      expect(cell01).toBeDefined();

      // Higher weight (0.8) should have a different fill than lower weight (0.2).
      expect(cell00.fillColor).not.toBe(cell01.fillColor);
    });

    it("cell IDs follow pattern heatmap-cell-{row}-{col}", () => {
      const tokens = ["X", "Y", "Z"];
      const weights = [
        [0.33, 0.33, 0.34],
        [0.33, 0.33, 0.34],
        [0.33, 0.33, 0.34],
      ];

      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Cell IDs",
        explanation: "Verifying cell ID pattern.",
        state: { tokens },
        visualActions: [
          { type: "showFullAttentionMatrix", weights },
        ],
        codeHighlight: { language: "pseudocode", lines: [] },
        isTerminal: false,
      };

      const scene = layout(step, mockCanvasSize, {});

      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const cell = scene.primitives.find(p => p.id === `heatmap-cell-${row}-${col}`);
          expect(cell).toBeDefined();
          expect(cell?.kind).toBe("element");
        }
      }
    });

    it("token labels appear as row and column headers", () => {
      const tokens = ["The", "cat"];

      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Headers",
        explanation: "Checking row/column headers.",
        state: { tokens },
        visualActions: [],
        codeHighlight: { language: "pseudocode", lines: [] },
        isTerminal: false,
      };

      const scene = layout(step, mockCanvasSize, {});

      // Column headers (key tokens).
      for (let col = 0; col < tokens.length; col++) {
        const colHeader = scene.primitives.find(p => p.id === `col-header-${col}`) as AnnotationPrimitive;
        expect(colHeader).toBeDefined();
        expect(colHeader.text).toBe(tokens[col]);
      }

      // Row headers (query tokens).
      for (let row = 0; row < tokens.length; row++) {
        const rowHeader = scene.primitives.find(p => p.id === `row-header-${row}`) as AnnotationPrimitive;
        expect(rowHeader).toBeDefined();
        expect(rowHeader.text).toBe(tokens[row]);
      }
    });
  });

  describe("visual actions", () => {
    it("showAttentionWeights highlights a specific row", () => {
      const tokens = ["A", "B", "C"];
      const weights = [
        [0.5, 0.3, 0.2],
        [0.1, 0.7, 0.2],
        [0.2, 0.2, 0.6],
      ];

      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Highlight Row",
        explanation: "Highlighting query row 1.",
        state: { tokens },
        visualActions: [
          { type: "showFullAttentionMatrix", weights },
          { type: "showAttentionWeights", queryIdx: 1, weights: [0.1, 0.7, 0.2] },
        ],
        codeHighlight: { language: "pseudocode", lines: [] },
        isTerminal: false,
      };

      const scene = layout(step, mockCanvasSize, {});

      // Highlighted row cells should have a stroke color indicating active state.
      const highlightedCell = scene.primitives.find(
        p => p.id === "heatmap-cell-1-0"
      ) as ElementPrimitive;
      const nonHighlightedCell = scene.primitives.find(
        p => p.id === "heatmap-cell-0-0"
      ) as ElementPrimitive;

      expect(highlightedCell).toBeDefined();
      expect(nonHighlightedCell).toBeDefined();

      // The highlighted row's cells should have a visible stroke.
      expect(highlightedCell.strokeWidth).toBeGreaterThan(0);
      expect(highlightedCell.strokeColor).not.toBe("transparent");

      // The non-highlighted row should have transparent stroke.
      expect(nonHighlightedCell.strokeColor).toBe("transparent");
    });

    it("activateHead shows head badge annotation via state fields", () => {
      const tokens = ["A", "B"];

      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Active Head",
        explanation: "Showing head 2 of 8.",
        state: { tokens, activeHead: 1, totalHeads: 8 },
        visualActions: [],
        codeHighlight: { language: "pseudocode", lines: [] },
        isTerminal: false,
      };

      const scene = layout(step, mockCanvasSize, {});
      const badge = scene.primitives.find(p => p.id === "head-badge") as AnnotationPrimitive;

      expect(badge).toBeDefined();
      expect(badge.kind).toBe("annotation");
      expect(badge.form).toBe("badge");
      expect(badge.text).toContain("Head");
      expect(badge.text).toContain("2"); // activeHead + 1 = 2
      expect(badge.text).toContain("8"); // totalHeads
    });

    it("silently ignores unknown visual action types", () => {
      const tokens = ["The", "cat"];

      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Unknown Action",
        explanation: "Step with unknown action type.",
        state: { tokens },
        visualActions: [
          { type: "someUnrecognizedAction", payload: "test" },
        ],
        codeHighlight: { language: "pseudocode", lines: [] },
        isTerminal: false,
      };

      // Should not throw.
      const scene = layout(step, mockCanvasSize, {});
      // Should still produce headers and axis labels.
      expect(scene.primitives.length).toBeGreaterThan(0);
    });
  });

  describe("edge cases", () => {
    it("returns empty scene for empty tokens", () => {
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Empty Tokens",
        explanation: "No tokens in sequence.",
        state: { tokens: [] },
        visualActions: [],
        codeHighlight: { language: "pseudocode", lines: [] },
        isTerminal: true,
      };

      const scene = layout(step, mockCanvasSize, {});
      expect(scene.primitives).toEqual([]);
    });
  });

  describe("ID uniqueness and coordinate validity", () => {
    it("all primitive IDs are unique within a scene", () => {
      const tokens = ["A", "B", "C"];
      const weights = [
        [0.5, 0.3, 0.2],
        [0.1, 0.7, 0.2],
        [0.2, 0.2, 0.6],
      ];

      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Unique IDs",
        explanation: "Checking all IDs are unique.",
        state: { tokens, activeHead: 0, totalHeads: 4 },
        visualActions: [
          { type: "showFullAttentionMatrix", weights },
          { type: "showAttentionWeights", queryIdx: 1, weights: [0.1, 0.7, 0.2] },
        ],
        codeHighlight: { language: "pseudocode", lines: [] },
        isTerminal: false,
      };

      const scene = layout(step, mockCanvasSize, {});
      const ids = scene.primitives.map(p => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("all primitives have finite coordinates", () => {
      const tokens = ["Hello", "world"];
      const weights = [
        [0.6, 0.4],
        [0.3, 0.7],
      ];

      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Finite Coords",
        explanation: "All coordinates should be finite numbers.",
        state: { tokens },
        visualActions: [
          { type: "showFullAttentionMatrix", weights },
        ],
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
        }
      }
    });
  });
});
