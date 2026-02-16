/**
 * @fileoverview Tests for the interpolation module.
 *
 * Verifies that primitives are correctly interpolated during animated
 * transitions: stable primitives interpolate all numeric/color properties,
 * entering primitives fade in from opacity 0, and exiting primitives
 * fade out to opacity 0.
 */

import { describe, it, expect } from "vitest";
import { interpolatePrimitive } from "../animation/interpolate";
import type {
  PrimitiveTransition,
  ElementPrimitive,
  ConnectionPrimitive,
  ContainerPrimitive,
  AnnotationPrimitive,
  OverlayPrimitive,
} from "../types";

// ---------------------------------------------------------------------------
// Test helpers: factory functions for primitives
// ---------------------------------------------------------------------------

function makeElement(overrides: Partial<ElementPrimitive> = {}): ElementPrimitive {
  return {
    kind: "element",
    id: "elem-0",
    x: 100,
    y: 100,
    width: 50,
    height: 50,
    shape: "rect",
    cornerRadius: 4,
    fillColor: "#ff0000",
    strokeColor: "#000000",
    strokeWidth: 2,
    label: "A",
    labelFontSize: 14,
    labelColor: "#ffffff",
    subLabel: "0",
    subLabelFontSize: 10,
    subLabelColor: "#666666",
    rotation: 0,
    opacity: 1,
    zIndex: 30,
    ...overrides,
  };
}

function makeConnection(overrides: Partial<ConnectionPrimitive> = {}): ConnectionPrimitive {
  return {
    kind: "connection",
    id: "conn-0",
    x1: 0,
    y1: 0,
    x2: 100,
    y2: 100,
    curveOffset: 0,
    color: "#333333",
    lineWidth: 2,
    dashPattern: [],
    arrowHead: "end",
    arrowSize: 8,
    label: "",
    labelFontSize: 10,
    labelColor: "#000000",
    opacity: 1,
    zIndex: 20,
    ...overrides,
  };
}

function makeContainer(overrides: Partial<ContainerPrimitive> = {}): ContainerPrimitive {
  return {
    kind: "container",
    id: "container-0",
    x: 200,
    y: 200,
    width: 300,
    height: 200,
    cornerRadius: 8,
    fillColor: "transparent",
    strokeColor: "#cccccc",
    strokeWidth: 1,
    dashPattern: [],
    label: "Group",
    labelFontSize: 12,
    labelColor: "#999999",
    opacity: 1,
    zIndex: 10,
    ...overrides,
  };
}

function makeAnnotation(overrides: Partial<AnnotationPrimitive> = {}): AnnotationPrimitive {
  return {
    kind: "annotation",
    id: "anno-0",
    form: "pointer",
    x: 150,
    y: 80,
    text: "low",
    fontSize: 12,
    textColor: "#4CAF50",
    color: "#4CAF50",
    pointerHeight: 10,
    pointerWidth: 12,
    bracketWidth: 0,
    bracketTickHeight: 6,
    badgePaddingX: 8,
    badgePaddingY: 4,
    opacity: 1,
    zIndex: 40,
    ...overrides,
  };
}

function makeOverlay(overrides: Partial<OverlayPrimitive> = {}): OverlayPrimitive {
  return {
    kind: "overlay",
    id: "overlay-0",
    overlayType: "grid",
    x: 0,
    y: 0,
    width: 800,
    height: 600,
    gridSpacing: 20,
    gridColor: "#eeeeee",
    gridLineWidth: 1,
    heatmapData: [],
    heatmapColorLow: "#ffffff",
    heatmapColorHigh: "#ff0000",
    opacity: 1,
    zIndex: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("interpolatePrimitive", () => {
  // =========================================================================
  // Stable transitions — Element
  // =========================================================================
  describe("stable element interpolation", () => {
    it("returns source at t=0", () => {
      const from = makeElement({ x: 100, y: 100, fillColor: "#ff0000" });
      const to = makeElement({ x: 200, y: 200, fillColor: "#00ff00" });
      const transition: PrimitiveTransition = {
        id: "elem-0",
        state: "stable",
        from,
        to,
      };

      const result = interpolatePrimitive(transition, 0);

      expect(result).not.toBeNull();
      expect(result!.kind).toBe("element");
      const elem = result as ElementPrimitive;
      expect(elem.x).toBe(100);
      expect(elem.y).toBe(100);
      expect(elem.fillColor).toBe("#ff0000");
    });

    it("returns target at t=1", () => {
      const from = makeElement({ x: 100, y: 100, fillColor: "#ff0000" });
      const to = makeElement({ x: 200, y: 200, fillColor: "#00ff00" });
      const transition: PrimitiveTransition = {
        id: "elem-0",
        state: "stable",
        from,
        to,
      };

      const result = interpolatePrimitive(transition, 1);

      expect(result).not.toBeNull();
      const elem = result as ElementPrimitive;
      expect(elem.x).toBe(200);
      expect(elem.y).toBe(200);
      expect(elem.fillColor).toBe("#00ff00");
    });

    it("interpolates numeric properties at t=0.5", () => {
      const from = makeElement({ x: 100, y: 0, width: 40, height: 40, opacity: 0.5 });
      const to = makeElement({ x: 200, y: 100, width: 60, height: 80, opacity: 1 });
      const transition: PrimitiveTransition = {
        id: "elem-0",
        state: "stable",
        from,
        to,
      };

      const result = interpolatePrimitive(transition, 0.5) as ElementPrimitive;

      expect(result.x).toBe(150);
      expect(result.y).toBe(50);
      expect(result.width).toBe(50);
      expect(result.height).toBe(60);
      expect(result.opacity).toBe(0.75);
    });

    it("uses target string properties instantly", () => {
      const from = makeElement({ label: "old", subLabel: "0", shape: "rect" });
      const to = makeElement({ label: "new", subLabel: "1", shape: "circle" });
      const transition: PrimitiveTransition = {
        id: "elem-0",
        state: "stable",
        from,
        to,
      };

      const result = interpolatePrimitive(transition, 0.3) as ElementPrimitive;

      expect(result.label).toBe("new");
      expect(result.subLabel).toBe("1");
      expect(result.shape).toBe("circle");
    });

    it("uses target zIndex", () => {
      const from = makeElement({ zIndex: 10 });
      const to = makeElement({ zIndex: 50 });
      const transition: PrimitiveTransition = {
        id: "elem-0",
        state: "stable",
        from,
        to,
      };

      const result = interpolatePrimitive(transition, 0.5) as ElementPrimitive;

      expect(result.zIndex).toBe(50);
    });

    it("interpolates colors component-wise", () => {
      const from = makeElement({ fillColor: "#ff0000" }); // red
      const to = makeElement({ fillColor: "#0000ff" }); // blue
      const transition: PrimitiveTransition = {
        id: "elem-0",
        state: "stable",
        from,
        to,
      };

      const result = interpolatePrimitive(transition, 0.5) as ElementPrimitive;

      // Midpoint between red (255,0,0) and blue (0,0,255) is (128,0,128)
      expect(result.fillColor).toMatch(/^rgba\(/);
      expect(result.fillColor).toContain("128");
    });
  });

  // =========================================================================
  // Stable transitions — Connection
  // =========================================================================
  describe("stable connection interpolation", () => {
    it("interpolates endpoints and lineWidth", () => {
      const from = makeConnection({ x1: 0, y1: 0, x2: 100, y2: 100, lineWidth: 2 });
      const to = makeConnection({ x1: 50, y1: 50, x2: 200, y2: 200, lineWidth: 4 });
      const transition: PrimitiveTransition = {
        id: "conn-0",
        state: "stable",
        from,
        to,
      };

      const result = interpolatePrimitive(transition, 0.5) as ConnectionPrimitive;

      expect(result.x1).toBe(25);
      expect(result.y1).toBe(25);
      expect(result.x2).toBe(150);
      expect(result.y2).toBe(150);
      expect(result.lineWidth).toBe(3);
    });

    it("uses target dashPattern and arrowHead instantly", () => {
      const from = makeConnection({ dashPattern: [6, 4], arrowHead: "none" });
      const to = makeConnection({ dashPattern: [3, 2], arrowHead: "both" });
      const transition: PrimitiveTransition = {
        id: "conn-0",
        state: "stable",
        from,
        to,
      };

      const result = interpolatePrimitive(transition, 0.3) as ConnectionPrimitive;

      expect(result.dashPattern).toEqual([3, 2]);
      expect(result.arrowHead).toBe("both");
    });
  });

  // =========================================================================
  // Stable transitions — Container
  // =========================================================================
  describe("stable container interpolation", () => {
    it("interpolates position and size", () => {
      const from = makeContainer({ x: 100, y: 100, width: 200, height: 100 });
      const to = makeContainer({ x: 200, y: 200, width: 400, height: 200 });
      const transition: PrimitiveTransition = {
        id: "container-0",
        state: "stable",
        from,
        to,
      };

      const result = interpolatePrimitive(transition, 0.5) as ContainerPrimitive;

      expect(result.x).toBe(150);
      expect(result.y).toBe(150);
      expect(result.width).toBe(300);
      expect(result.height).toBe(150);
    });

    it("uses target dashPattern and label instantly", () => {
      const from = makeContainer({ dashPattern: [10, 5], label: "Old" });
      const to = makeContainer({ dashPattern: [5, 2], label: "New" });
      const transition: PrimitiveTransition = {
        id: "container-0",
        state: "stable",
        from,
        to,
      };

      const result = interpolatePrimitive(transition, 0.2) as ContainerPrimitive;

      expect(result.dashPattern).toEqual([5, 2]);
      expect(result.label).toBe("New");
    });
  });

  // =========================================================================
  // Stable transitions — Annotation
  // =========================================================================
  describe("stable annotation interpolation", () => {
    it("interpolates position and font size", () => {
      const from = makeAnnotation({ x: 100, y: 50, fontSize: 12 });
      const to = makeAnnotation({ x: 200, y: 100, fontSize: 16 });
      const transition: PrimitiveTransition = {
        id: "anno-0",
        state: "stable",
        from,
        to,
      };

      const result = interpolatePrimitive(transition, 0.5) as AnnotationPrimitive;

      expect(result.x).toBe(150);
      expect(result.y).toBe(75);
      expect(result.fontSize).toBe(14);
    });

    it("uses target text and form instantly", () => {
      const from = makeAnnotation({ text: "low", form: "pointer" });
      const to = makeAnnotation({ text: "high", form: "badge" });
      const transition: PrimitiveTransition = {
        id: "anno-0",
        state: "stable",
        from,
        to,
      };

      const result = interpolatePrimitive(transition, 0.1) as AnnotationPrimitive;

      expect(result.text).toBe("high");
      expect(result.form).toBe("badge");
    });

    it("interpolates pointer and bracket dimensions", () => {
      const from = makeAnnotation({
        pointerHeight: 10,
        pointerWidth: 12,
        bracketWidth: 100,
        bracketTickHeight: 6,
      });
      const to = makeAnnotation({
        pointerHeight: 20,
        pointerWidth: 24,
        bracketWidth: 200,
        bracketTickHeight: 12,
      });
      const transition: PrimitiveTransition = {
        id: "anno-0",
        state: "stable",
        from,
        to,
      };

      const result = interpolatePrimitive(transition, 0.5) as AnnotationPrimitive;

      expect(result.pointerHeight).toBe(15);
      expect(result.pointerWidth).toBe(18);
      expect(result.bracketWidth).toBe(150);
      expect(result.bracketTickHeight).toBe(9);
    });
  });

  // =========================================================================
  // Stable transitions — Overlay (instant switch)
  // =========================================================================
  describe("stable overlay interpolation", () => {
    it("returns source when t < 0.5", () => {
      const from = makeOverlay({ gridSpacing: 20 });
      const to = makeOverlay({ gridSpacing: 40 });
      const transition: PrimitiveTransition = {
        id: "overlay-0",
        state: "stable",
        from,
        to,
      };

      const result = interpolatePrimitive(transition, 0.4) as OverlayPrimitive;

      expect(result.gridSpacing).toBe(20);
    });

    it("returns target when t >= 0.5", () => {
      const from = makeOverlay({ gridSpacing: 20 });
      const to = makeOverlay({ gridSpacing: 40 });
      const transition: PrimitiveTransition = {
        id: "overlay-0",
        state: "stable",
        from,
        to,
      };

      const result = interpolatePrimitive(transition, 0.5) as OverlayPrimitive;

      expect(result.gridSpacing).toBe(40);
    });
  });

  // =========================================================================
  // Entering transitions (fade in)
  // =========================================================================
  describe("entering transitions", () => {
    it("has opacity 0 at t=0", () => {
      const to = makeElement({ opacity: 1 });
      const transition: PrimitiveTransition = {
        id: "elem-0",
        state: "entering",
        from: null,
        to,
      };

      const result = interpolatePrimitive(transition, 0);

      expect(result).not.toBeNull();
      expect(result!.opacity).toBe(0);
    });

    it("has full target opacity at t=1", () => {
      const to = makeElement({ opacity: 0.8 });
      const transition: PrimitiveTransition = {
        id: "elem-0",
        state: "entering",
        from: null,
        to,
      };

      const result = interpolatePrimitive(transition, 1);

      expect(result).not.toBeNull();
      expect(result!.opacity).toBeCloseTo(0.8);
    });

    it("has half target opacity at t=0.5", () => {
      const to = makeElement({ opacity: 1 });
      const transition: PrimitiveTransition = {
        id: "elem-0",
        state: "entering",
        from: null,
        to,
      };

      const result = interpolatePrimitive(transition, 0.5);

      expect(result).not.toBeNull();
      expect(result!.opacity).toBeCloseTo(0.5);
    });

    it("works for connection primitives", () => {
      const to = makeConnection({ opacity: 1 });
      const transition: PrimitiveTransition = {
        id: "conn-0",
        state: "entering",
        from: null,
        to,
      };

      const result = interpolatePrimitive(transition, 0.5);

      expect(result).not.toBeNull();
      expect(result!.kind).toBe("connection");
      expect(result!.opacity).toBeCloseTo(0.5);
    });

    it("works for annotation primitives", () => {
      const to = makeAnnotation({ opacity: 1 });
      const transition: PrimitiveTransition = {
        id: "anno-0",
        state: "entering",
        from: null,
        to,
      };

      const result = interpolatePrimitive(transition, 0.75);

      expect(result).not.toBeNull();
      expect(result!.kind).toBe("annotation");
      expect(result!.opacity).toBeCloseTo(0.75);
    });
  });

  // =========================================================================
  // Exiting transitions (fade out)
  // =========================================================================
  describe("exiting transitions", () => {
    it("has full source opacity at t=0", () => {
      const from = makeElement({ opacity: 1 });
      const transition: PrimitiveTransition = {
        id: "elem-0",
        state: "exiting",
        from,
        to: null,
      };

      const result = interpolatePrimitive(transition, 0);

      expect(result).not.toBeNull();
      expect(result!.opacity).toBe(1);
    });

    it("returns null at t=1 (fully faded out)", () => {
      const from = makeElement({ opacity: 1 });
      const transition: PrimitiveTransition = {
        id: "elem-0",
        state: "exiting",
        from,
        to: null,
      };

      const result = interpolatePrimitive(transition, 1);

      expect(result).toBeNull();
    });

    it("returns null when opacity drops below 0.01", () => {
      const from = makeElement({ opacity: 1 });
      const transition: PrimitiveTransition = {
        id: "elem-0",
        state: "exiting",
        from,
        to: null,
      };

      // At t=0.995, opacity = 1 * (1 - 0.995) = 0.005 which is < 0.01
      const result = interpolatePrimitive(transition, 0.995);

      expect(result).toBeNull();
    });

    it("has diminishing opacity at t=0.5", () => {
      const from = makeElement({ opacity: 1 });
      const transition: PrimitiveTransition = {
        id: "elem-0",
        state: "exiting",
        from,
        to: null,
      };

      const result = interpolatePrimitive(transition, 0.5);

      expect(result).not.toBeNull();
      expect(result!.opacity).toBeCloseTo(0.5);
    });

    it("scales from source opacity (not always 1)", () => {
      const from = makeElement({ opacity: 0.6 });
      const transition: PrimitiveTransition = {
        id: "elem-0",
        state: "exiting",
        from,
        to: null,
      };

      const result = interpolatePrimitive(transition, 0.5);

      expect(result).not.toBeNull();
      // 0.6 * (1 - 0.5) = 0.3
      expect(result!.opacity).toBeCloseTo(0.3);
    });

    it("works for container primitives", () => {
      const from = makeContainer({ opacity: 1 });
      const transition: PrimitiveTransition = {
        id: "container-0",
        state: "exiting",
        from,
        to: null,
      };

      const result = interpolatePrimitive(transition, 0.5);

      expect(result).not.toBeNull();
      expect(result!.kind).toBe("container");
      expect(result!.opacity).toBeCloseTo(0.5);
    });
  });

  // =========================================================================
  // Edge cases
  // =========================================================================
  describe("edge cases", () => {
    it("handles mismatched kinds by returning target", () => {
      const from = makeElement({ id: "x" });
      const to = makeConnection({ id: "x" });
      const transition: PrimitiveTransition = {
        id: "x",
        state: "stable",
        from,
        to,
      };

      const result = interpolatePrimitive(transition, 0.5);

      expect(result).not.toBeNull();
      expect(result!.kind).toBe("connection");
    });

    it("preserves id from target in stable transitions", () => {
      const from = makeElement({ id: "elem-0" });
      const to = makeElement({ id: "elem-0" });
      const transition: PrimitiveTransition = {
        id: "elem-0",
        state: "stable",
        from,
        to,
      };

      const result = interpolatePrimitive(transition, 0.5);

      expect(result).not.toBeNull();
      expect(result!.id).toBe("elem-0");
    });
  });
});
