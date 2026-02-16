/**
 * @fileoverview Tests for layer-network layout.
 *
 * These tests verify that the layer-network layout produces the correct
 * multi-layer neural network structure: neurons for each layer, fully
 * connected weight connections, layer labels, loss badge, and the
 * activateNeuron / propagateSignal / showGradient visual actions.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { getLayout } from "../layouts/registry";
import type { Step, CanvasSize, LayoutFunction, ElementPrimitive, ConnectionPrimitive, AnnotationPrimitive } from "../types";

// Import the layout module to trigger self-registration.
import "../layouts/layer-network";

const mockCanvasSize: CanvasSize = { width: 800, height: 600 };

/**
 * Helper: creates a basic Step for the layer-network layout.
 * Defaults to a [2, 3, 1] network with activations, weights, and gradients.
 */
function makeStep(overrides: Partial<Step> = {}): Step {
  return {
    index: 0,
    id: "step-1",
    title: "Test Step",
    explanation: "Testing layout.",
    state: {
      layerSizes: [2, 3, 1],
      activations: [
        [0.5, 0.8],
        [0.3, 0.6, 0.9],
        [0.7],
      ],
      weights: [
        [],                                          // layer 0 has no incoming weights
        [[0.2, -0.1], [0.5, 0.3], [-0.4, 0.7]],    // layer 1: 3 neurons, each 2 inputs
        [[0.6, -0.2, 0.4]],                         // layer 2: 1 neuron, 3 inputs
      ],
      gradients: [
        [0.01, 0.02],
        [0.1, -0.05, 0.08],
        [0.5],
      ],
    },
    visualActions: [],
    codeHighlight: { language: "pseudocode", lines: [] },
    isTerminal: false,
    ...overrides,
  };
}

describe("layer-network layout", () => {
  let layout: LayoutFunction;

  beforeEach(() => {
    layout = getLayout("layer-network")!;
    expect(layout).toBeDefined();
  });

  describe("registration", () => {
    it("is registered and retrievable by name", () => {
      const fn = getLayout("layer-network");
      expect(fn).toBeDefined();
      expect(typeof fn).toBe("function");
    });
  });

  describe("basic rendering", () => {
    it("renders 6 neurons for layerSizes [2, 3, 1]", () => {
      const step = makeStep();
      const scene = layout(step, mockCanvasSize, {});

      const neurons = scene.primitives.filter(
        p => p.kind === "element" && p.id.startsWith("neuron-")
      );
      // 2 + 3 + 1 = 6 neurons
      expect(neurons.length).toBe(6);

      // Verify specific neuron IDs exist.
      expect(scene.primitives.find(p => p.id === "neuron-0-0")).toBeDefined();
      expect(scene.primitives.find(p => p.id === "neuron-0-1")).toBeDefined();
      expect(scene.primitives.find(p => p.id === "neuron-1-0")).toBeDefined();
      expect(scene.primitives.find(p => p.id === "neuron-1-1")).toBeDefined();
      expect(scene.primitives.find(p => p.id === "neuron-1-2")).toBeDefined();
      expect(scene.primitives.find(p => p.id === "neuron-2-0")).toBeDefined();
    });

    it("renders 9 connections (2*3 + 3*1)", () => {
      const step = makeStep();
      const scene = layout(step, mockCanvasSize, {});

      const connections = scene.primitives.filter(
        p => p.kind === "connection" && p.id.startsWith("conn-")
      );
      // Layer 1 receives from layer 0: 3 neurons * 2 inputs = 6 connections
      // Layer 2 receives from layer 1: 1 neuron * 3 inputs = 3 connections
      // Total = 9
      expect(connections.length).toBe(9);
    });

    it("renders layer labels for each layer", () => {
      const step = makeStep();
      const scene = layout(step, mockCanvasSize, {});

      for (let l = 0; l < 3; l++) {
        const lbl = scene.primitives.find(p => p.id === `layer-label-${l}`);
        expect(lbl).toBeDefined();
        expect(lbl?.kind).toBe("annotation");
      }
    });

    it("loss badge appears when state.loss is defined", () => {
      const stepWithLoss = makeStep({
        state: {
          layerSizes: [2, 3, 1],
          activations: [[0.5, 0.8], [0.3, 0.6, 0.9], [0.7]],
          weights: [[], [[0.2, -0.1], [0.5, 0.3], [-0.4, 0.7]], [[0.6, -0.2, 0.4]]],
          gradients: [[0.01, 0.02], [0.1, -0.05, 0.08], [0.5]],
          loss: 0.3456,
        },
      });
      const scene = layout(stepWithLoss, mockCanvasSize, {});

      const lossBadge = scene.primitives.find(p => p.id === "loss-badge");
      expect(lossBadge).toBeDefined();
      expect(lossBadge?.kind).toBe("annotation");
      expect((lossBadge as AnnotationPrimitive).form).toBe("badge");
      expect((lossBadge as AnnotationPrimitive).text).toContain("Loss");
    });

    it("loss badge does not appear when state.loss is undefined", () => {
      const step = makeStep();
      const scene = layout(step, mockCanvasSize, {});

      const lossBadge = scene.primitives.find(p => p.id === "loss-badge");
      expect(lossBadge).toBeUndefined();
    });
  });

  describe("visual actions", () => {
    it("activateNeuron action changes node appearance", () => {
      const step = makeStep({
        visualActions: [
          { type: "activateNeuron", layer: 1, index: 1 },
        ],
      });

      const scene = layout(step, mockCanvasSize, {});

      const activeNeuron = scene.primitives.find(p => p.id === "neuron-1-1") as ElementPrimitive;
      const inactiveNeuron = scene.primitives.find(p => p.id === "neuron-1-0") as ElementPrimitive;

      expect(activeNeuron).toBeDefined();
      expect(inactiveNeuron).toBeDefined();

      // The activated neuron should have a different fill and stroke.
      expect(activeNeuron.fillColor).not.toBe(inactiveNeuron.fillColor);
      expect(activeNeuron.strokeColor).not.toBe(inactiveNeuron.strokeColor);
      expect(activeNeuron.strokeWidth).toBeGreaterThan(inactiveNeuron.strokeWidth);
    });

    it("propagateSignal action changes connection colors to blue (#38bdf8)", () => {
      const step = makeStep({
        visualActions: [
          { type: "propagateSignal", fromLayer: 0, toLayer: 1 },
        ],
      });

      const scene = layout(step, mockCanvasSize, {});

      // Connections from layer 0 to layer 1 should have the signal color.
      const forwardConns = scene.primitives.filter(
        p => p.kind === "connection" && p.id.startsWith("conn-1-")
      ) as ConnectionPrimitive[];

      expect(forwardConns.length).toBe(6); // 3 neurons * 2 inputs

      for (const conn of forwardConns) {
        expect(conn.color).toBe("#38bdf8");
      }

      // Connections from layer 1 to layer 2 should NOT have the signal color.
      const otherConns = scene.primitives.filter(
        p => p.kind === "connection" && p.id.startsWith("conn-2-")
      ) as ConnectionPrimitive[];

      for (const conn of otherConns) {
        expect(conn.color).not.toBe("#38bdf8");
      }
    });

    it("showGradient action changes connections to dashed pattern", () => {
      const step = makeStep({
        visualActions: [
          { type: "showGradient", layer: 1 },
        ],
      });

      const scene = layout(step, mockCanvasSize, {});

      // Connections at gradient layer (l=1) should have dashed pattern.
      const gradientConns = scene.primitives.filter(
        p => p.kind === "connection" && p.id.startsWith("conn-1-")
      ) as ConnectionPrimitive[];

      expect(gradientConns.length).toBe(6);

      for (const conn of gradientConns) {
        expect(conn.dashPattern.length).toBeGreaterThan(0);
      }

      // Connections not at the gradient layer should remain solid.
      const otherConns = scene.primitives.filter(
        p => p.kind === "connection" && p.id.startsWith("conn-2-")
      ) as ConnectionPrimitive[];

      for (const conn of otherConns) {
        expect(conn.dashPattern.length).toBe(0);
      }
    });
  });

  describe("purity", () => {
    it("calling twice with same args produces identical output", () => {
      const step = makeStep({
        visualActions: [
          { type: "activateNeuron", layer: 1, index: 2 },
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
          layerSizes: [2, 3, 1],
          activations: [[0.5, 0.8], [0.3, 0.6, 0.9], [0.7]],
          weights: [[], [[0.2, -0.1], [0.5, 0.3], [-0.4, 0.7]], [[0.6, -0.2, 0.4]]],
          gradients: [[0.01, 0.02], [0.1, -0.05, 0.08], [0.5]],
          loss: 0.25,
        },
        visualActions: [
          { type: "activateNeuron", layer: 0, index: 1 },
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
