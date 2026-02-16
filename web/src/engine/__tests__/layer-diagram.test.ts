/**
 * @fileoverview Tests for layer-diagram layout.
 *
 * These tests verify that the layer-diagram layout produces the correct
 * transformer block structure: sublayer blocks, flow arrows, residual skip
 * connections, add symbols, and the activateSublayer visual action.
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
import "../layouts/layer-diagram";

const mockCanvasSize: CanvasSize = { width: 800, height: 600 };

/**
 * Helper: creates a basic Step for the layer-diagram layout.
 * The layer-diagram does not require tokens in state; it always renders
 * the fixed set of transformer sublayers.
 */
function makeStep(overrides: Partial<Step> = {}): Step {
  return {
    index: 0,
    id: "step-1",
    title: "Transformer Block",
    explanation: "Visualizing transformer sublayers.",
    state: {},
    visualActions: [],
    codeHighlight: { language: "pseudocode", lines: [] },
    isTerminal: false,
    ...overrides,
  };
}

describe("layer-diagram layout", () => {
  let layout: LayoutFunction;

  beforeEach(() => {
    layout = getLayout("layer-diagram")!;
    expect(layout).toBeDefined();
  });

  describe("registration", () => {
    it("is registered and retrievable by name", () => {
      const fn = getLayout("layer-diagram");
      expect(fn).toBeDefined();
      expect(typeof fn).toBe("function");
    });
  });

  describe("sublayer blocks", () => {
    it("renders 6 sublayer blocks", () => {
      const step = makeStep();
      const scene = layout(step, mockCanvasSize, {});

      const blocks = scene.primitives.filter(
        (p) => p.kind === "element" && p.id.startsWith("block-"),
      );
      expect(blocks.length).toBe(6);
    });

    it("block IDs follow pattern block-{sublayerId}", () => {
      const expectedIds = [
        "block-input",
        "block-self-attention",
        "block-add-norm-1",
        "block-ffn",
        "block-add-norm-2",
        "block-output",
      ];

      const step = makeStep();
      const scene = layout(step, mockCanvasSize, {});

      for (const expectedId of expectedIds) {
        const block = scene.primitives.find((p) => p.id === expectedId);
        expect(block).toBeDefined();
        expect(block?.kind).toBe("element");
      }
    });
  });

  describe("flow arrows", () => {
    it("renders 5 flow arrows between consecutive blocks", () => {
      const step = makeStep();
      const scene = layout(step, mockCanvasSize, {});

      const arrows = scene.primitives.filter(
        (p) => p.kind === "connection" && p.id.startsWith("flow-arrow-"),
      );
      expect(arrows.length).toBe(5);

      // Verify sequential IDs: flow-arrow-0 through flow-arrow-4.
      for (let i = 0; i < 5; i++) {
        const arrow = scene.primitives.find((p) => p.id === `flow-arrow-${i}`);
        expect(arrow).toBeDefined();
        expect(arrow?.kind).toBe("connection");
      }
    });
  });

  describe("residual skip connections", () => {
    it("renders 2 residual skip connections, each as 3 connection segments", () => {
      const step = makeStep();
      const scene = layout(step, mockCanvasSize, {});

      const residualSegments = scene.primitives.filter(
        (p) => p.kind === "connection" && p.id.startsWith("residual-"),
      );

      // 2 residual connections x 3 segments each = 6 connection primitives.
      expect(residualSegments.length).toBe(6);

      // First residual: input (idx 0) to add-norm-1 (idx 2).
      expect(scene.primitives.find((p) => p.id === "residual-0-2-top")).toBeDefined();
      expect(scene.primitives.find((p) => p.id === "residual-0-2-vert")).toBeDefined();
      expect(scene.primitives.find((p) => p.id === "residual-0-2-bottom")).toBeDefined();

      // Second residual: add-norm-1 (idx 2) to add-norm-2 (idx 4).
      expect(scene.primitives.find((p) => p.id === "residual-2-4-top")).toBeDefined();
      expect(scene.primitives.find((p) => p.id === "residual-2-4-vert")).toBeDefined();
      expect(scene.primitives.find((p) => p.id === "residual-2-4-bottom")).toBeDefined();
    });

    it("renders 2 add symbols with text content", () => {
      const step = makeStep();
      const scene = layout(step, mockCanvasSize, {});

      const addSymbols = scene.primitives.filter(
        (p) => p.kind === "annotation" && p.id.startsWith("add-symbol-"),
      );
      expect(addSymbols.length).toBe(2);

      // Each add symbol should display the circled plus character.
      for (const sym of addSymbols) {
        const ann = sym as AnnotationPrimitive;
        expect(ann.form).toBe("badge");
        expect(ann.text).toContain("\u2295"); // ⊕
      }
    });
  });

  describe("visual actions", () => {
    it("activateSublayer action highlights the targeted block", () => {
      const step = makeStep({
        visualActions: [
          { type: "activateSublayer", sublayerId: "ffn", label: "Feed-Forward Network" },
        ],
      });

      const scene = layout(step, mockCanvasSize, {});

      const ffnBlock = scene.primitives.find((p) => p.id === "block-ffn") as ElementPrimitive;
      const inputBlock = scene.primitives.find((p) => p.id === "block-input") as ElementPrimitive;

      expect(ffnBlock).toBeDefined();
      expect(inputBlock).toBeDefined();

      // The activated block should have a different fill and stroke than
      // a non-activated block.
      expect(ffnBlock.fillColor).not.toBe(inputBlock.fillColor);
      expect(ffnBlock.strokeColor).not.toBe(inputBlock.strokeColor);
      expect(ffnBlock.strokeWidth).toBeGreaterThan(inputBlock.strokeWidth);
    });
  });

  describe("purity", () => {
    it("calling twice with same args produces identical output", () => {
      const step = makeStep({
        visualActions: [
          { type: "activateSublayer", sublayerId: "self-attention", label: "Self-Attention" },
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
        visualActions: [{ type: "activateSublayer", sublayerId: "ffn", label: "FFN" }],
      });

      const scene = layout(step, mockCanvasSize, {});
      const ids = scene.primitives.map((p) => p.id);
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
