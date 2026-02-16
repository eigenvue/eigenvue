/**
 * @fileoverview Tests for loss-landscape layout.
 *
 * These tests verify that the loss-landscape layout produces the correct
 * contour plot (50x50 grid of colored cells), current position marker,
 * minimum marker, gradient arrow, trajectory segments, start position
 * marker, info bar labels, and axis labels.
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
import "../layouts/loss-landscape";

const mockCanvasSize: CanvasSize = { width: 800, height: 600 };

/**
 * Helper: creates a basic Step for the loss-landscape layout.
 * Defaults to a quadratic surface with basic parameters.
 */
function makeStep(overrides: Partial<Step> = {}): Step {
  return {
    index: 0,
    id: "step-1",
    title: "Test Step",
    explanation: "Testing layout.",
    state: {
      parameters: [1.5, 1.5],
      loss: 4.5,
      gradient: [3.0, 3.0],
      optimizer: "sgd",
      trajectory: [],
      learningRate: 0.01,
      stepNumber: 0,
      surfaceType: "quadratic",
      surfaceParams: { a: 1, b: 1 },
      xRange: [-3, 3],
      yRange: [-3, 3],
      minimum: [0, 0],
    },
    visualActions: [],
    codeHighlight: { language: "pseudocode", lines: [] },
    isTerminal: false,
    ...overrides,
  };
}

describe("loss-landscape layout", () => {
  let layout: LayoutFunction;

  beforeEach(() => {
    layout = getLayout("loss-landscape")!;
    expect(layout).toBeDefined();
  });

  describe("registration", () => {
    it("is registered and retrievable by name", () => {
      const fn = getLayout("loss-landscape");
      expect(fn).toBeDefined();
      expect(typeof fn).toBe("function");
    });
  });

  describe("basic rendering", () => {
    it("produces contour cells with ids starting with contour-", () => {
      const step = makeStep();
      const scene = layout(step, mockCanvasSize, {});

      const contourCells = scene.primitives.filter(
        (p) => p.kind === "element" && p.id.startsWith("contour-"),
      );

      // The grid is 50x50 = 2500 cells.
      expect(contourCells.length).toBe(2500);
    });

    it("renders a current position marker", () => {
      const step = makeStep();
      const scene = layout(step, mockCanvasSize, {});

      const currentPos = scene.primitives.find((p) => p.id === "current-pos");
      expect(currentPos).toBeDefined();
      expect(currentPos?.kind).toBe("element");
    });

    it("renders a minimum marker", () => {
      const step = makeStep();
      const scene = layout(step, mockCanvasSize, {});

      const minMarker = scene.primitives.find((p) => p.id === "minimum-marker");
      expect(minMarker).toBeDefined();
      expect(minMarker?.kind).toBe("element");
      expect((minMarker as ElementPrimitive).shape).toBe("diamond");
    });

    it("renders a gradient arrow when gradient is non-zero", () => {
      const step = makeStep();
      const scene = layout(step, mockCanvasSize, {});

      const gradArrow = scene.primitives.find((p) => p.id === "gradient-arrow");
      expect(gradArrow).toBeDefined();
      expect(gradArrow?.kind).toBe("connection");
      expect((gradArrow as ConnectionPrimitive).arrowHead).toBe("end");
    });

    it("does not render a gradient arrow when gradient is zero", () => {
      const step = makeStep({
        state: {
          parameters: [0, 0],
          loss: 0,
          gradient: [0, 0],
          optimizer: "sgd",
          trajectory: [],
          learningRate: 0.01,
          stepNumber: 0,
          surfaceType: "quadratic",
          surfaceParams: { a: 1, b: 1 },
          xRange: [-3, 3],
          yRange: [-3, 3],
          minimum: [0, 0],
        },
      });
      const scene = layout(step, mockCanvasSize, {});

      const gradArrow = scene.primitives.find((p) => p.id === "gradient-arrow");
      expect(gradArrow).toBeUndefined();
    });

    it("renders info bar labels", () => {
      const step = makeStep();
      const scene = layout(step, mockCanvasSize, {});

      // The layout produces 4 info labels: info-0 through info-3.
      for (let i = 0; i < 4; i++) {
        const infoLabel = scene.primitives.find((p) => p.id === `info-${i}`);
        expect(infoLabel).toBeDefined();
        expect(infoLabel?.kind).toBe("annotation");
      }
    });

    it("renders axis labels", () => {
      const step = makeStep();
      const scene = layout(step, mockCanvasSize, {});

      expect(scene.primitives.find((p) => p.id === "x-axis-min")).toBeDefined();
      expect(scene.primitives.find((p) => p.id === "x-axis-max")).toBeDefined();
      expect(scene.primitives.find((p) => p.id === "y-axis-min")).toBeDefined();
      expect(scene.primitives.find((p) => p.id === "y-axis-max")).toBeDefined();
    });
  });

  describe("trajectory rendering", () => {
    it("renders trajectory line segments when trajectory has multiple points", () => {
      const step = makeStep({
        state: {
          parameters: [0.5, 0.5],
          loss: 0.5,
          gradient: [1.0, 1.0],
          optimizer: "sgd",
          trajectory: [
            { parameters: [2.0, 2.0], loss: 8.0 },
            { parameters: [1.5, 1.5], loss: 4.5 },
            { parameters: [1.0, 1.0], loss: 2.0 },
            { parameters: [0.5, 0.5], loss: 0.5 },
          ],
          learningRate: 0.01,
          stepNumber: 3,
          surfaceType: "quadratic",
          surfaceParams: { a: 1, b: 1 },
          xRange: [-3, 3],
          yRange: [-3, 3],
          minimum: [0, 0],
        },
      });

      const scene = layout(step, mockCanvasSize, {});

      // 4 trajectory points produce 3 segments.
      const trajSegments = scene.primitives.filter(
        (p) => p.kind === "connection" && p.id.startsWith("traj-segment-"),
      );
      expect(trajSegments.length).toBe(3);
    });

    it("renders a start position marker when trajectory is non-empty", () => {
      const step = makeStep({
        state: {
          parameters: [1.0, 1.0],
          loss: 2.0,
          gradient: [2.0, 2.0],
          optimizer: "sgd",
          trajectory: [
            { parameters: [2.0, 2.0], loss: 8.0 },
            { parameters: [1.0, 1.0], loss: 2.0 },
          ],
          learningRate: 0.01,
          stepNumber: 1,
          surfaceType: "quadratic",
          surfaceParams: { a: 1, b: 1 },
          xRange: [-3, 3],
          yRange: [-3, 3],
          minimum: [0, 0],
        },
      });

      const scene = layout(step, mockCanvasSize, {});

      const startPos = scene.primitives.find((p) => p.id === "start-pos");
      expect(startPos).toBeDefined();
      expect(startPos?.kind).toBe("element");
    });

    it("does not render trajectory segments when trajectory is empty", () => {
      const step = makeStep();
      const scene = layout(step, mockCanvasSize, {});

      const trajSegments = scene.primitives.filter(
        (p) => p.kind === "connection" && p.id.startsWith("traj-segment-"),
      );
      expect(trajSegments.length).toBe(0);
    });
  });

  describe("purity", () => {
    it("calling twice with same args produces identical output", () => {
      const step = makeStep({
        state: {
          parameters: [1.0, 1.0],
          loss: 2.0,
          gradient: [2.0, 2.0],
          optimizer: "adam",
          trajectory: [
            { parameters: [2.0, 2.0], loss: 8.0 },
            { parameters: [1.0, 1.0], loss: 2.0 },
          ],
          learningRate: 0.001,
          stepNumber: 1,
          surfaceType: "quadratic",
          surfaceParams: { a: 1, b: 1 },
          xRange: [-3, 3],
          yRange: [-3, 3],
          minimum: [0, 0],
        },
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
          parameters: [1.0, 1.0],
          loss: 2.0,
          gradient: [2.0, 2.0],
          optimizer: "sgd",
          trajectory: [
            { parameters: [2.0, 2.0], loss: 8.0 },
            { parameters: [1.5, 1.5], loss: 4.5 },
            { parameters: [1.0, 1.0], loss: 2.0 },
          ],
          learningRate: 0.01,
          stepNumber: 2,
          surfaceType: "quadratic",
          surfaceParams: { a: 1, b: 1 },
          xRange: [-3, 3],
          yRange: [-3, 3],
          minimum: [0, 0],
        },
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
