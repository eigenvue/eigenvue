/**
 * @fileoverview Tests for neuron-diagram layout.
 *
 * These tests verify that the neuron-diagram layout produces the correct
 * single-neuron structure: input nodes, weight connections, bias label,
 * summation node, activation box, output node, phase labels, and the
 * activateNeuron / showPreActivation / showActivationFunction visual actions.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { getLayout } from "../layouts/registry";
import type { Step, CanvasSize, LayoutFunction, ElementPrimitive, ConnectionPrimitive, AnnotationPrimitive } from "../types";

// Import the layout module to trigger self-registration.
import "../layouts/neuron-diagram";

const mockCanvasSize: CanvasSize = { width: 800, height: 600 };

/**
 * Helper: creates a basic Step for the neuron-diagram layout.
 * Defaults to a 2-input neuron with weights, bias, and activation values.
 */
function makeStep(overrides: Partial<Step> = {}): Step {
  return {
    index: 0,
    id: "step-1",
    title: "Test Step",
    explanation: "Testing layout.",
    state: {
      inputs: [0.5, 0.8],
      weights: [0.3, -0.6],
      bias: 0.1,
      z: 0.25,
      activation: 0.56,
      activationFunction: "sigmoid",
      output: 0.56,
    },
    visualActions: [],
    codeHighlight: { language: "pseudocode", lines: [] },
    isTerminal: false,
    ...overrides,
  };
}

describe("neuron-diagram layout", () => {
  let layout: LayoutFunction;

  beforeEach(() => {
    layout = getLayout("neuron-diagram")!;
    expect(layout).toBeDefined();
  });

  describe("registration", () => {
    it("is registered and retrievable by name", () => {
      const fn = getLayout("neuron-diagram");
      expect(fn).toBeDefined();
      expect(typeof fn).toBe("function");
    });
  });

  describe("basic rendering", () => {
    it("renders 2 input nodes for a 2-input neuron", () => {
      const step = makeStep();
      const scene = layout(step, mockCanvasSize, {});

      const inputNodes = scene.primitives.filter(
        p => p.kind === "element" && p.id.startsWith("input-node-")
      );
      expect(inputNodes.length).toBe(2);

      expect(scene.primitives.find(p => p.id === "input-node-0")).toBeDefined();
      expect(scene.primitives.find(p => p.id === "input-node-1")).toBeDefined();
    });

    it("renders summation-node, activation-box, and output-node", () => {
      const step = makeStep();
      const scene = layout(step, mockCanvasSize, {});

      const sumNode = scene.primitives.find(p => p.id === "summation-node");
      expect(sumNode).toBeDefined();
      expect(sumNode?.kind).toBe("element");

      const actBox = scene.primitives.find(p => p.id === "activation-box");
      expect(actBox).toBeDefined();
      expect(actBox?.kind).toBe("element");

      const outNode = scene.primitives.find(p => p.id === "output-node");
      expect(outNode).toBeDefined();
      expect(outNode?.kind).toBe("element");
    });

    it("renders weight connections for each input", () => {
      const step = makeStep();
      const scene = layout(step, mockCanvasSize, {});

      const weightConns = scene.primitives.filter(
        p => p.kind === "connection" && p.id.startsWith("weight-conn-")
      );
      expect(weightConns.length).toBe(2);

      expect(scene.primitives.find(p => p.id === "weight-conn-0")).toBeDefined();
      expect(scene.primitives.find(p => p.id === "weight-conn-1")).toBeDefined();
    });

    it("renders bias-label annotation", () => {
      const step = makeStep();
      const scene = layout(step, mockCanvasSize, {});

      const biasLabel = scene.primitives.find(p => p.id === "bias-label");
      expect(biasLabel).toBeDefined();
      expect(biasLabel?.kind).toBe("annotation");
    });

    it("renders sum-to-activation and activation-to-output connections", () => {
      const step = makeStep();
      const scene = layout(step, mockCanvasSize, {});

      expect(scene.primitives.find(p => p.id === "sum-to-activation")).toBeDefined();
      expect(scene.primitives.find(p => p.id === "activation-to-output")).toBeDefined();
    });

    it("renders phase labels", () => {
      const step = makeStep();
      const scene = layout(step, mockCanvasSize, {});

      const phaseLabels = scene.primitives.filter(
        p => p.kind === "annotation" && p.id.startsWith("phase-label-")
      );
      expect(phaseLabels.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe("visual actions", () => {
    it("activateNeuron action with layer=0, index=0 changes input-node-0 appearance", () => {
      const step = makeStep({
        visualActions: [
          { type: "activateNeuron", layer: 0, index: 0 },
        ],
      });

      const scene = layout(step, mockCanvasSize, {});

      const activeNode = scene.primitives.find(p => p.id === "input-node-0") as ElementPrimitive;
      const inactiveNode = scene.primitives.find(p => p.id === "input-node-1") as ElementPrimitive;

      expect(activeNode).toBeDefined();
      expect(inactiveNode).toBeDefined();

      // The activated input node should have a different fill color and/or
      // stroke width compared to the inactive input node.
      expect(activeNode.fillColor).not.toBe(inactiveNode.fillColor);
      expect(activeNode.strokeWidth).toBeGreaterThan(inactiveNode.strokeWidth);
    });

    it("showPreActivation action increases summation-node strokeWidth", () => {
      const stepBase = makeStep();
      const sceneBase = layout(stepBase, mockCanvasSize, {});
      const sumBase = sceneBase.primitives.find(p => p.id === "summation-node") as ElementPrimitive;

      const stepActive = makeStep({
        visualActions: [{ type: "showPreActivation" }],
      });
      const sceneActive = layout(stepActive, mockCanvasSize, {});
      const sumActive = sceneActive.primitives.find(p => p.id === "summation-node") as ElementPrimitive;

      expect(sumActive.strokeWidth).toBeGreaterThan(sumBase.strokeWidth);
    });

    it("showActivationFunction action changes activation-box strokeColor", () => {
      const stepBase = makeStep();
      const sceneBase = layout(stepBase, mockCanvasSize, {});
      const actBase = sceneBase.primitives.find(p => p.id === "activation-box") as ElementPrimitive;

      const stepActive = makeStep({
        visualActions: [{ type: "showActivationFunction" }],
      });
      const sceneActive = layout(stepActive, mockCanvasSize, {});
      const actActive = sceneActive.primitives.find(p => p.id === "activation-box") as ElementPrimitive;

      expect(actActive.strokeColor).not.toBe(actBase.strokeColor);
    });
  });

  describe("purity", () => {
    it("calling twice with same args produces identical output", () => {
      const step = makeStep({
        visualActions: [
          { type: "activateNeuron", layer: 0, index: 0 },
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
        visualActions: [
          { type: "activateNeuron", layer: 0, index: 0 },
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
