/**
 * @fileoverview Tests for PrimitiveRenderer.
 *
 * Testing canvas rendering requires mocking CanvasRenderingContext2D.
 * These tests verify that the renderer calls the correct canvas methods
 * for each primitive type and respects z-index ordering and opacity.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderScene } from "../primitives/PrimitiveRenderer";
import type {
  PrimitiveScene,
  ElementPrimitive,
  ConnectionPrimitive,
  AnnotationPrimitive,
  CanvasSize,
} from "../types";

/**
 * Creates a mock 2D canvas context with spies on all relevant methods.
 */
function createMockContext() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    rect: vi.fn(),
    arcTo: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    quadraticCurveTo: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 50 })),
    setLineDash: vi.fn(),
    setTransform: vi.fn(),
    // Properties
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    globalAlpha: 1,
    font: "",
    textAlign: "left" as CanvasTextAlign,
    textBaseline: "alphabetic" as CanvasTextBaseline,
  } as unknown as CanvasRenderingContext2D;
}

const mockCanvasSize: CanvasSize = { width: 800, height: 600 };

describe("renderScene", () => {
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    ctx = createMockContext();
  });

  describe("basic rendering", () => {
    it("renders an empty scene without errors", () => {
      const scene: PrimitiveScene = { primitives: [] };
      expect(() => renderScene(ctx, scene, mockCanvasSize)).not.toThrow();
    });

    it("skips primitives with zero opacity", () => {
      const element: ElementPrimitive = {
        kind: "element",
        id: "test",
        x: 100,
        y: 100,
        width: 50,
        height: 50,
        shape: "rect",
        cornerRadius: 0,
        fillColor: "#ff0000",
        strokeColor: "transparent",
        strokeWidth: 0,
        label: "",
        labelFontSize: 12,
        labelColor: "#000",
        subLabel: "",
        subLabelFontSize: 10,
        subLabelColor: "#666",
        rotation: 0,
        opacity: 0, // Zero opacity
        zIndex: 10,
      };

      const scene: PrimitiveScene = { primitives: [element] };
      renderScene(ctx, scene, mockCanvasSize);

      // Should not call save/restore for zero-opacity primitives
      expect(ctx.save).not.toHaveBeenCalled();
    });
  });

  describe("z-index ordering", () => {
    it("draws primitives in z-index order (low to high)", () => {
      const drawOrder: string[] = [];

      const element1: ElementPrimitive = {
        kind: "element",
        id: "high-z",
        x: 100,
        y: 100,
        width: 50,
        height: 50,
        shape: "rect",
        cornerRadius: 0,
        fillColor: "#ff0000",
        strokeColor: "transparent",
        strokeWidth: 0,
        label: "",
        labelFontSize: 12,
        labelColor: "#000",
        subLabel: "",
        subLabelFontSize: 10,
        subLabelColor: "#666",
        rotation: 0,
        opacity: 1,
        zIndex: 30, // Higher z-index
      };

      const element2: ElementPrimitive = {
        ...element1,
        id: "low-z",
        x: 200, // Different x to distinguish
        zIndex: 10, // Lower z-index
      };

      // Insert in reverse order to test sorting
      const scene: PrimitiveScene = { primitives: [element1, element2] };

      // Track when each primitive starts being drawn by intercepting translate calls
      (ctx.translate as ReturnType<typeof vi.fn>).mockImplementation((x: number, _y: number) => {
        if (x === 100) {
          drawOrder.push("high-z");
        } else if (x === 200) {
          drawOrder.push("low-z");
        }
      });

      renderScene(ctx, scene, mockCanvasSize);

      // Low z-index should be drawn first
      expect(drawOrder[0]).toBe("low-z");
      expect(drawOrder[1]).toBe("high-z");
    });
  });

  describe("element rendering", () => {
    it("draws a rectangular element", () => {
      const element: ElementPrimitive = {
        kind: "element",
        id: "rect",
        x: 100,
        y: 100,
        width: 50,
        height: 50,
        shape: "rect",
        cornerRadius: 0,
        fillColor: "#ff0000",
        strokeColor: "#000000",
        strokeWidth: 2,
        label: "5",
        labelFontSize: 14,
        labelColor: "#fff",
        subLabel: "0",
        subLabelFontSize: 10,
        subLabelColor: "#666",
        rotation: 0,
        opacity: 1,
        zIndex: 10,
      };

      const scene: PrimitiveScene = { primitives: [element] };
      renderScene(ctx, scene, mockCanvasSize);

      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.translate).toHaveBeenCalledWith(100, 100);
      expect(ctx.rect).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
      expect(ctx.fillText).toHaveBeenCalledWith("5", 0, 0); // Label
      expect(ctx.restore).toHaveBeenCalled();
    });

    it("draws a circular element", () => {
      const element: ElementPrimitive = {
        kind: "element",
        id: "circle",
        x: 100,
        y: 100,
        width: 50,
        height: 50,
        shape: "circle",
        cornerRadius: 0,
        fillColor: "#00ff00",
        strokeColor: "transparent",
        strokeWidth: 0,
        label: "",
        labelFontSize: 12,
        labelColor: "#000",
        subLabel: "",
        subLabelFontSize: 10,
        subLabelColor: "#666",
        rotation: 0,
        opacity: 0.5,
        zIndex: 10,
      };

      const scene: PrimitiveScene = { primitives: [element] };
      renderScene(ctx, scene, mockCanvasSize);

      expect(ctx.ellipse).toHaveBeenCalled();
      expect(ctx.globalAlpha).toBe(0.5);
    });
  });

  describe("connection rendering", () => {
    it("draws a straight connection", () => {
      const connection: ConnectionPrimitive = {
        kind: "connection",
        id: "line",
        x1: 0,
        y1: 0,
        x2: 100,
        y2: 100,
        curveOffset: 0,
        color: "#0000ff",
        lineWidth: 2,
        dashPattern: [],
        arrowHead: "none",
        arrowSize: 10,
        label: "",
        labelFontSize: 12,
        labelColor: "#000",
        opacity: 1,
        zIndex: 20,
      };

      const scene: PrimitiveScene = { primitives: [connection] };
      renderScene(ctx, scene, mockCanvasSize);

      expect(ctx.moveTo).toHaveBeenCalledWith(0, 0);
      expect(ctx.lineTo).toHaveBeenCalledWith(100, 100);
      expect(ctx.stroke).toHaveBeenCalled();
    });

    it("draws a curved connection", () => {
      const connection: ConnectionPrimitive = {
        kind: "connection",
        id: "curve",
        x1: 0,
        y1: 0,
        x2: 100,
        y2: 100,
        curveOffset: 20,
        color: "#0000ff",
        lineWidth: 2,
        dashPattern: [],
        arrowHead: "end",
        arrowSize: 10,
        label: "Weight",
        labelFontSize: 12,
        labelColor: "#000",
        opacity: 1,
        zIndex: 20,
      };

      const scene: PrimitiveScene = { primitives: [connection] };
      renderScene(ctx, scene, mockCanvasSize);

      expect(ctx.quadraticCurveTo).toHaveBeenCalled();
      expect(ctx.fillText).toHaveBeenCalled(); // Arrow and label
    });
  });

  describe("annotation rendering", () => {
    it("draws a pointer annotation", () => {
      const annotation: AnnotationPrimitive = {
        kind: "annotation",
        id: "ptr",
        form: "pointer",
        x: 100,
        y: 100,
        text: "left",
        fontSize: 12,
        textColor: "#ffa500",
        color: "#ffa500",
        pointerHeight: 12,
        pointerWidth: 14,
        bracketWidth: 0,
        bracketTickHeight: 0,
        badgePaddingX: 0,
        badgePaddingY: 0,
        opacity: 1,
        zIndex: 40,
      };

      const scene: PrimitiveScene = { primitives: [annotation] };
      renderScene(ctx, scene, mockCanvasSize);

      expect(ctx.moveTo).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
      expect(ctx.fillText).toHaveBeenCalledWith("left", 100, expect.any(Number));
    });

    it("draws a badge annotation", () => {
      const annotation: AnnotationPrimitive = {
        kind: "annotation",
        id: "badge",
        form: "badge",
        x: 100,
        y: 100,
        text: "Found!",
        fontSize: 13,
        textColor: "#ffffff",
        color: "#22c55e",
        pointerHeight: 0,
        pointerWidth: 0,
        bracketWidth: 0,
        bracketTickHeight: 0,
        badgePaddingX: 10,
        badgePaddingY: 5,
        opacity: 1,
        zIndex: 40,
      };

      const scene: PrimitiveScene = { primitives: [annotation] };
      renderScene(ctx, scene, mockCanvasSize);

      expect(ctx.measureText).toHaveBeenCalledWith("Found!");
      expect(ctx.fill).toHaveBeenCalled();
      expect(ctx.fillText).toHaveBeenCalledWith("Found!", 100, 100);
    });
  });
});
