/**
 * @fileoverview Tests for token-sequence layout.
 *
 * These tests verify that the token-sequence layout produces the correct
 * primitive structure, handles all GenAI visual actions, and maintains stable
 * IDs for smooth animation.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { getLayout } from "../layouts/registry";
import type { Step, CanvasSize, LayoutFunction, ElementPrimitive, ConnectionPrimitive, AnnotationPrimitive } from "../types";

// Import the layout module to trigger self-registration.
import "../layouts/token-sequence";

const mockCanvasSize: CanvasSize = { width: 800, height: 600 };

describe("token-sequence layout", () => {
  let layout: LayoutFunction;

  beforeEach(() => {
    layout = getLayout("token-sequence")!;
    expect(layout).toBeDefined();
  });

  describe("registration", () => {
    it("is registered and retrievable by name", () => {
      const fn = getLayout("token-sequence");
      expect(fn).toBeDefined();
      expect(typeof fn).toBe("function");
    });
  });

  describe("basic rendering", () => {
    it("returns scene with token chip elements for tokens in state.tokens", () => {
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Tokens",
        explanation: "Rendering tokens.",
        state: { tokens: ["The", "cat", "sat"] },
        visualActions: [],
        codeHighlight: { language: "pseudocode", lines: [] },
        isTerminal: false,
      };

      const scene = layout(step, mockCanvasSize, {});
      const elements = scene.primitives.filter(p => p.kind === "element");
      expect(elements.length).toBe(3);
    });

    it("each token chip has stable ID token-chip-{i} and correct label", () => {
      const tokens = ["Hello", "world", "!"];
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Token IDs",
        explanation: "Checking token IDs and labels.",
        state: { tokens },
        visualActions: [],
        codeHighlight: { language: "pseudocode", lines: [] },
        isTerminal: false,
      };

      const scene = layout(step, mockCanvasSize, {});
      const elements = scene.primitives.filter(p => p.kind === "element") as ElementPrimitive[];

      for (let i = 0; i < tokens.length; i++) {
        expect(elements[i]?.id).toBe(`token-chip-${i}`);
        expect(elements[i]?.label).toBe(tokens[i]);
      }
    });

    it("returns empty scene for empty tokens array", () => {
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Empty Tokens",
        explanation: "No tokens to render.",
        state: { tokens: [] },
        visualActions: [],
        codeHighlight: { language: "pseudocode", lines: [] },
        isTerminal: true,
      };

      const scene = layout(step, mockCanvasSize, {});
      expect(scene.primitives).toEqual([]);
    });
  });

  describe("visual actions", () => {
    it("highlightToken action changes fill color of targeted token", () => {
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Highlight Token",
        explanation: "Highlighting token at index 1.",
        state: { tokens: ["The", "cat", "sat"] },
        visualActions: [
          { type: "highlightToken", index: 1 },
        ],
        codeHighlight: { language: "pseudocode", lines: [] },
        isTerminal: false,
      };

      const scene = layout(step, mockCanvasSize, {});
      const chip0 = scene.primitives.find(p => p.id === "token-chip-0") as ElementPrimitive;
      const chip1 = scene.primitives.find(p => p.id === "token-chip-1") as ElementPrimitive;

      expect(chip1).toBeDefined();
      // Highlighted token should have a different fill than the default.
      expect(chip1.fillColor).not.toBe(chip0.fillColor);
    });

    it("mergeTokens action creates merge annotation", () => {
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Merge Tokens",
        explanation: "Merging tokens 0 and 1.",
        state: { tokens: ["H", "ello", "world"] },
        visualActions: [
          { type: "mergeTokens", leftIndex: 0, rightIndex: 1, result: "Hello" },
        ],
        codeHighlight: { language: "pseudocode", lines: [] },
        isTerminal: false,
      };

      const scene = layout(step, mockCanvasSize, {});
      const bracket = scene.primitives.find(
        p => p.kind === "annotation" && p.id === "merge-bracket-0-1"
      ) as AnnotationPrimitive;

      expect(bracket).toBeDefined();
      expect(bracket.form).toBe("bracket");
      expect(bracket.text).toContain("Hello");
    });

    it("showEmbedding action creates bar chart elements", () => {
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Show Embedding",
        explanation: "Displaying embedding for token 0.",
        state: { tokens: ["The", "cat"] },
        visualActions: [
          { type: "showEmbedding", tokenIndex: 0, values: [0.5, -0.3, 0.8, -0.1] },
        ],
        codeHighlight: { language: "pseudocode", lines: [] },
        isTerminal: false,
      };

      const scene = layout(step, mockCanvasSize, {});

      // Should create bar elements for each embedding dimension.
      const bars = scene.primitives.filter(
        p => p.kind === "element" && p.id.startsWith("emb-bar-0-")
      );
      expect(bars.length).toBe(4);

      // Verify individual bar IDs.
      for (let d = 0; d < 4; d++) {
        const bar = scene.primitives.find(p => p.id === `emb-bar-0-${d}`);
        expect(bar).toBeDefined();
        expect(bar?.kind).toBe("element");
      }
    });

    it("showAttentionWeights action creates arc connections", () => {
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Show Attention",
        explanation: "Attention weights from token 0.",
        state: { tokens: ["The", "cat", "sat"] },
        visualActions: [
          { type: "showAttentionWeights", queryIdx: 0, weights: [0.1, 0.7, 0.2] },
        ],
        codeHighlight: { language: "pseudocode", lines: [] },
        isTerminal: false,
      };

      const scene = layout(step, mockCanvasSize, {});
      const arcs = scene.primitives.filter(
        p => p.kind === "connection" && p.id.startsWith("attn-arc-")
      );

      // Should have arcs for non-negligible weights (all three are >= 0.01).
      expect(arcs.length).toBeGreaterThanOrEqual(2);

      // Verify the strongest arc exists.
      const arc01 = scene.primitives.find(p => p.id === "attn-arc-0-1") as ConnectionPrimitive;
      expect(arc01).toBeDefined();
      expect(arc01.kind).toBe("connection");
    });

    it("silently ignores unknown visual action types", () => {
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Unknown Action",
        explanation: "Step with unknown action.",
        state: { tokens: ["The", "cat"] },
        visualActions: [
          { type: "someUnknownFutureAction", data: 42 },
        ],
        codeHighlight: { language: "pseudocode", lines: [] },
        isTerminal: false,
      };

      // Should not throw, and should produce normal token chips.
      const scene = layout(step, mockCanvasSize, {});
      const elements = scene.primitives.filter(p => p.kind === "element");
      expect(elements.length).toBe(2);
    });
  });

  describe("ID uniqueness and coordinate validity", () => {
    it("all primitives have unique IDs within a scene", () => {
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Unique IDs",
        explanation: "Checking ID uniqueness.",
        state: { tokens: ["A", "B", "C", "D"] },
        visualActions: [
          { type: "highlightToken", index: 1 },
          { type: "showEmbedding", tokenIndex: 0, values: [0.5, -0.3] },
          { type: "showAttentionWeights", queryIdx: 0, weights: [0.25, 0.25, 0.25, 0.25] },
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
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Finite Coords",
        explanation: "Checking coordinate validity.",
        state: { tokens: ["Hello", "world", "test"] },
        visualActions: [
          { type: "showEmbedding", tokenIndex: 1, values: [0.1, 0.2, 0.3] },
          { type: "showAttentionWeights", queryIdx: 0, weights: [0.5, 0.3, 0.2] },
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
