/**
 * @fileoverview Tests for bloch-sphere layout.
 *
 * These tests verify that the bloch-sphere layout produces the correct
 * wireframe sphere, state vector arrow, axis labels, and probability bars.
 * Tests cover visual actions (rotateBlochSphere, showProbabilities),
 * edge cases, and stable ID generation for smooth animation.
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
import "../layouts/bloch-sphere";

const mockCanvasSize: CanvasSize = { width: 800, height: 600 };

describe("bloch-sphere layout", () => {
  let layout: LayoutFunction;

  beforeEach(() => {
    layout = getLayout("bloch-sphere")!;
    expect(layout).toBeDefined();
  });

  describe("registration", () => {
    it("is registered and retrievable by name", () => {
      const fn = getLayout("bloch-sphere");
      expect(fn).toBeDefined();
      expect(typeof fn).toBe("function");
    });
  });

  describe("basic rendering", () => {
    it("renders primitives for |0> state (theta: 0, phi: 0)", () => {
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Initial State |0>",
        explanation: "Qubit initialized to the |0> state at the north pole.",
        state: {
          alpha0: [1, 0],
          alpha1: [0, 0],
          theta: 0,
          phi: 0,
          blochX: 0,
          blochY: 0,
          blochZ: 1,
          probZero: 1,
          probOne: 0,
        },
        visualActions: [{ type: "rotateBlochSphere", theta: 0, phi: 0, label: "|0\u27E9" }],
        codeHighlight: { language: "pseudocode", lines: [] },
        isTerminal: false,
      };

      const scene = layout(step, mockCanvasSize, {});

      // Scene should produce primitives (wireframe segments, axes, labels, state vector).
      expect(scene.primitives.length).toBeGreaterThan(0);

      // Verify the state vector connection exists.
      const stateVector = scene.primitives.find(
        (p) => p.id === "state-vector",
      ) as ConnectionPrimitive;
      expect(stateVector).toBeDefined();
      expect(stateVector.kind).toBe("connection");

      // Verify the state vector tip dot exists.
      const tipDot = scene.primitives.find((p) => p.id === "state-vector-tip") as ElementPrimitive;
      expect(tipDot).toBeDefined();
      expect(tipDot.kind).toBe("element");
      expect(tipDot.shape).toBe("circle");

      // Verify the state label annotation exists.
      const stateLabel = scene.primitives.find(
        (p) => p.id === "state-label",
      ) as AnnotationPrimitive;
      expect(stateLabel).toBeDefined();
      expect(stateLabel.text).toBe("|0\u27E9");
    });

    it("renders axis labels for |0>, |1>, |+>, |->, |+i>, |-i>", () => {
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Axis Labels",
        explanation: "Checking all axis labels are present on the Bloch sphere.",
        state: { theta: 0, phi: 0 },
        visualActions: [],
        codeHighlight: { language: "pseudocode", lines: [] },
        isTerminal: false,
      };

      const scene = layout(step, mockCanvasSize, {});

      const label0 = scene.primitives.find((p) => p.id === "axis-label-0") as AnnotationPrimitive;
      expect(label0).toBeDefined();
      expect(label0.text).toBe("|0\u27E9");

      const label1 = scene.primitives.find((p) => p.id === "axis-label-1") as AnnotationPrimitive;
      expect(label1).toBeDefined();
      expect(label1.text).toBe("|1\u27E9");

      const labelPlus = scene.primitives.find(
        (p) => p.id === "axis-label-plus",
      ) as AnnotationPrimitive;
      expect(labelPlus).toBeDefined();
      expect(labelPlus.text).toBe("|+\u27E9");

      const labelMinus = scene.primitives.find(
        (p) => p.id === "axis-label-minus",
      ) as AnnotationPrimitive;
      expect(labelMinus).toBeDefined();
      expect(labelMinus.text).toBe("|-\u27E9");

      const labelPlusI = scene.primitives.find(
        (p) => p.id === "axis-label-plus-i",
      ) as AnnotationPrimitive;
      expect(labelPlusI).toBeDefined();
      expect(labelPlusI.text).toBe("|+i\u27E9");

      const labelMinusI = scene.primitives.find(
        (p) => p.id === "axis-label-minus-i",
      ) as AnnotationPrimitive;
      expect(labelMinusI).toBeDefined();
      expect(labelMinusI.text).toBe("|-i\u27E9");
    });

    it("renders wireframe segments for equator, XZ meridian, and YZ meridian", () => {
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Wireframe",
        explanation: "Verifying wireframe segments exist.",
        state: { theta: 0, phi: 0 },
        visualActions: [],
        codeHighlight: { language: "pseudocode", lines: [] },
        isTerminal: false,
      };

      const scene = layout(step, mockCanvasSize, {});

      // Wireframe segments are ConnectionPrimitives with IDs starting with
      // "equator-", "meridian-xz-", or "meridian-yz-".
      const equatorSegments = scene.primitives.filter(
        (p) => p.kind === "connection" && p.id.startsWith("equator-"),
      );
      const meridianXZSegments = scene.primitives.filter(
        (p) => p.kind === "connection" && p.id.startsWith("meridian-xz-"),
      );
      const meridianYZSegments = scene.primitives.filter(
        (p) => p.kind === "connection" && p.id.startsWith("meridian-yz-"),
      );

      // Each great circle should produce many line segments.
      expect(equatorSegments.length).toBeGreaterThan(10);
      expect(meridianXZSegments.length).toBeGreaterThan(10);
      expect(meridianYZSegments.length).toBeGreaterThan(10);
    });

    it("renders three axis lines (x, y, z)", () => {
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Axis Lines",
        explanation: "Checking axis connection primitives.",
        state: { theta: 0, phi: 0 },
        visualActions: [],
        codeHighlight: { language: "pseudocode", lines: [] },
        isTerminal: false,
      };

      const scene = layout(step, mockCanvasSize, {});

      const axisX = scene.primitives.find((p) => p.id === "axis-x");
      const axisY = scene.primitives.find((p) => p.id === "axis-y");
      const axisZ = scene.primitives.find((p) => p.id === "axis-z");

      expect(axisX).toBeDefined();
      expect(axisY).toBeDefined();
      expect(axisZ).toBeDefined();

      expect(axisX!.kind).toBe("connection");
      expect(axisY!.kind).toBe("connection");
      expect(axisZ!.kind).toBe("connection");
    });
  });

  describe("visual actions", () => {
    it("showProbabilities action renders probability bars below the sphere", () => {
      const step: Step = {
        index: 1,
        id: "step-2",
        title: "Show Probabilities",
        explanation: "Displaying measurement probabilities as bars.",
        state: {
          theta: 0,
          phi: 0,
        },
        visualActions: [
          {
            type: "showProbabilities",
            probabilities: [1.0, 0.0],
            labels: ["|0\u27E9", "|1\u27E9"],
          },
        ],
        codeHighlight: { language: "pseudocode", lines: [] },
        isTerminal: false,
      };

      const scene = layout(step, mockCanvasSize, {});

      // Probability bars should be present with IDs like "bloch-prob-bar-0".
      const probBar0 = scene.primitives.find(
        (p) => p.id === "bloch-prob-bar-0",
      ) as ElementPrimitive;
      const probBar1 = scene.primitives.find(
        (p) => p.id === "bloch-prob-bar-1",
      ) as ElementPrimitive;

      expect(probBar0).toBeDefined();
      expect(probBar1).toBeDefined();
      expect(probBar0.kind).toBe("element");

      // Probability labels should also exist.
      const probLabel0 = scene.primitives.find(
        (p) => p.id === "bloch-prob-label-0",
      ) as AnnotationPrimitive;
      expect(probLabel0).toBeDefined();
      expect(probLabel0.text).toBe("|0\u27E9");

      // Percentage annotations should exist.
      const probPct0 = scene.primitives.find(
        (p) => p.id === "bloch-prob-pct-0",
      ) as AnnotationPrimitive;
      expect(probPct0).toBeDefined();

      // Probability section title should be present.
      const probTitle = scene.primitives.find(
        (p) => p.id === "prob-section-title",
      ) as AnnotationPrimitive;
      expect(probTitle).toBeDefined();
      expect(probTitle.text).toBe("Probabilities");
    });

    it("rotateBlochSphere with equator state (theta: pi/2, phi: 0)", () => {
      const halfPi = Math.PI / 2;

      const step: Step = {
        index: 2,
        id: "step-3",
        title: "Equator State |+>",
        explanation: "Qubit on the equator of the Bloch sphere after Hadamard.",
        state: {
          alpha0: [Math.SQRT1_2, 0],
          alpha1: [Math.SQRT1_2, 0],
          theta: halfPi,
          phi: 0,
          blochX: 1,
          blochY: 0,
          blochZ: 0,
          probZero: 0.5,
          probOne: 0.5,
        },
        visualActions: [{ type: "rotateBlochSphere", theta: halfPi, phi: 0, label: "|+\u27E9" }],
        codeHighlight: { language: "pseudocode", lines: [] },
        isTerminal: false,
      };

      const scene = layout(step, mockCanvasSize, {});

      // The state vector arrow should exist.
      const stateVector = scene.primitives.find(
        (p) => p.id === "state-vector",
      ) as ConnectionPrimitive;
      expect(stateVector).toBeDefined();
      expect(stateVector.arrowHead).toBe("end");

      // The state label should show |+>.
      const stateLabel = scene.primitives.find(
        (p) => p.id === "state-label",
      ) as AnnotationPrimitive;
      expect(stateLabel).toBeDefined();
      expect(stateLabel.text).toBe("|+\u27E9");

      // Angle info should display theta = 90.0 degrees.
      const angleInfo = scene.primitives.find((p) => p.id === "angle-info") as AnnotationPrimitive;
      expect(angleInfo).toBeDefined();
      expect(angleInfo.text).toContain("90.0");
    });

    it("showGateMatrix action renders a gate info badge", () => {
      const step: Step = {
        index: 3,
        id: "step-4",
        title: "Apply Hadamard",
        explanation: "Applying H gate to the qubit.",
        state: { theta: 0, phi: 0 },
        visualActions: [
          {
            type: "showGateMatrix",
            gate: "H",
            matrix: [
              [
                [Math.SQRT1_2, 0],
                [Math.SQRT1_2, 0],
              ],
              [
                [Math.SQRT1_2, 0],
                [-Math.SQRT1_2, 0],
              ],
            ],
          },
        ],
        codeHighlight: { language: "pseudocode", lines: [] },
        isTerminal: false,
      };

      const scene = layout(step, mockCanvasSize, {});

      const gateInfo = scene.primitives.find((p) => p.id === "gate-info") as AnnotationPrimitive;
      expect(gateInfo).toBeDefined();
      expect(gateInfo.form).toBe("badge");
      expect(gateInfo.text).toContain("H");
    });

    it("silently ignores unknown visual action types", () => {
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Unknown Action",
        explanation: "Step with an unrecognized action type.",
        state: { theta: 0, phi: 0 },
        visualActions: [{ type: "someFutureAction", data: 42 }],
        codeHighlight: { language: "pseudocode", lines: [] },
        isTerminal: false,
      };

      // Should not throw.
      const scene = layout(step, mockCanvasSize, {});

      // Should still produce wireframe, axes, and labels.
      expect(scene.primitives.length).toBeGreaterThan(0);
    });
  });

  describe("ID uniqueness and coordinate validity", () => {
    it("all primitive IDs are unique within a scene", () => {
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Unique IDs",
        explanation: "Checking that all primitive IDs are unique.",
        state: { theta: Math.PI / 4, phi: Math.PI / 3 },
        visualActions: [
          { type: "rotateBlochSphere", theta: Math.PI / 4, phi: Math.PI / 3, label: "|psi\u27E9" },
          {
            type: "showProbabilities",
            probabilities: [0.854, 0.146],
            labels: ["|0\u27E9", "|1\u27E9"],
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
        state: { theta: Math.PI / 2, phi: Math.PI },
        visualActions: [
          { type: "rotateBlochSphere", theta: Math.PI / 2, phi: Math.PI },
          {
            type: "showProbabilities",
            probabilities: [0.5, 0.5],
            labels: ["|0\u27E9", "|1\u27E9"],
          },
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
        state: { theta: 0, phi: 0 },
        visualActions: [{ type: "rotateBlochSphere", theta: 0, phi: 0, label: "|0\u27E9" }],
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
