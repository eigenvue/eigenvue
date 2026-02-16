/**
 * @fileoverview Feedforward Network Generator — Unit Tests
 *
 * Validates step structure, algorithmic correctness, and edge cases.
 * Tests the Feedforward Network generator from the cross-platform test location.
 */

import { describe, it, expect } from "vitest";
import { runGenerator } from "@/engine/generator";
import feedforwardGenerator from "../../../algorithms/deep-learning/feedforward-network/generator";

import twoLayerFixture from "../../../algorithms/deep-learning/feedforward-network/tests/two-layer.fixture.json";
import threeLayerFixture from "../../../algorithms/deep-learning/feedforward-network/tests/three-layer.fixture.json";
import singleNeuronFixture from "../../../algorithms/deep-learning/feedforward-network/tests/single-neuron-per-layer.fixture.json";

/** Helper: run generator and return steps array. */
function run(inputs: {
  inputValues: number[];
  layerSizes: number[];
  activationFunction: string;
  seed: string;
}) {
  return runGenerator(feedforwardGenerator, inputs).steps;
}

/** Helper: validate structural invariants on any step array. */
function validateStepStructure(steps: readonly any[]) {
  expect(steps.length).toBeGreaterThan(0);

  // Indices are 0-based and contiguous.
  steps.forEach((s, i) => {
    expect(s.index).toBe(i);
  });

  // Last step is terminal.
  expect(steps[steps.length - 1].isTerminal).toBe(true);

  // No non-last step is terminal.
  for (let i = 0; i < steps.length - 1; i++) {
    expect(steps[i].isTerminal).toBe(false);
  }

  // All steps have required fields with correct types.
  for (const s of steps) {
    expect(typeof s.id).toBe("string");
    expect(typeof s.title).toBe("string");
    expect(typeof s.explanation).toBe("string");
    expect(Array.isArray(s.visualActions)).toBe(true);
    expect(s.state).toBeDefined();
  }
}

/** Helper: recursively check no NaN or Infinity in any state value. */
function hasNoNaNOrInfinity(obj: unknown): boolean {
  if (typeof obj === "number") return isFinite(obj);
  if (Array.isArray(obj)) return obj.every(hasNoNaNOrInfinity);
  if (obj && typeof obj === "object")
    return Object.values(obj).every(hasNoNaNOrInfinity);
  return true;
}

describe("Feedforward Network Generator", () => {
  // ── Step Structure Validation ─────────────────────────────────────────

  it("validates step structure for two-layer fixture", () => {
    const steps = run(
      twoLayerFixture.inputs as {
        inputValues: number[];
        layerSizes: number[];
        activationFunction: string;
        seed: string;
      },
    );
    validateStepStructure(steps);
  });

  it("validates step structure for three-layer fixture", () => {
    const steps = run(
      threeLayerFixture.inputs as {
        inputValues: number[];
        layerSizes: number[];
        activationFunction: string;
        seed: string;
      },
    );
    validateStepStructure(steps);
  });

  it("validates step structure for single-neuron-per-layer fixture", () => {
    const steps = run(
      singleNeuronFixture.inputs as {
        inputValues: number[];
        layerSizes: number[];
        activationFunction: string;
        seed: string;
      },
    );
    validateStepStructure(steps);
  });

  // ── Step Count ────────────────────────────────────────────────────────

  it("step count = 4 for two-layer fixture (architecture + 2 forward + output)", () => {
    const steps = run(
      twoLayerFixture.inputs as {
        inputValues: number[];
        layerSizes: number[];
        activationFunction: string;
        seed: string;
      },
    );
    expect(steps.length).toBe(4);
  });

  it("step count = 5 for three-layer fixture", () => {
    const steps = run(
      threeLayerFixture.inputs as {
        inputValues: number[];
        layerSizes: number[];
        activationFunction: string;
        seed: string;
      },
    );
    expect(steps.length).toBe(5);
  });

  it("step count = 4 for single-neuron-per-layer fixture", () => {
    const steps = run(
      singleNeuronFixture.inputs as {
        inputValues: number[];
        layerSizes: number[];
        activationFunction: string;
        seed: string;
      },
    );
    expect(steps.length).toBe(4);
  });

  // ── Architecture Step ─────────────────────────────────────────────────

  it("architecture step has correct layerSizes in state for two-layer", () => {
    const steps = run(
      twoLayerFixture.inputs as {
        inputValues: number[];
        layerSizes: number[];
        activationFunction: string;
        seed: string;
      },
    );
    const archStep = steps[0]!;
    expect(archStep.id).toBe("architecture");
    const state = archStep.state as Record<string, unknown>;
    expect(state.layerSizes).toEqual([2, 3, 1]);
  });

  it("architecture step has correct layerSizes in state for three-layer", () => {
    const steps = run(
      threeLayerFixture.inputs as {
        inputValues: number[];
        layerSizes: number[];
        activationFunction: string;
        seed: string;
      },
    );
    const archStep = steps[0]!;
    expect(archStep.id).toBe("architecture");
    const state = archStep.state as Record<string, unknown>;
    expect(state.layerSizes).toEqual([3, 4, 4, 2]);
  });

  // ── Terminal Step ─────────────────────────────────────────────────────

  it("terminal step id = 'output'", () => {
    const steps = run(
      twoLayerFixture.inputs as {
        inputValues: number[];
        layerSizes: number[];
        activationFunction: string;
        seed: string;
      },
    );
    expect(steps[steps.length - 1].id).toBe("output");
  });

  // ── Sigmoid Outputs ───────────────────────────────────────────────────

  it("sigmoid outputs are always in (0, 1) for two-layer fixture", () => {
    const steps = run(
      twoLayerFixture.inputs as {
        inputValues: number[];
        layerSizes: number[];
        activationFunction: string;
        seed: string;
      },
    );
    const outputStep = steps[steps.length - 1]!;
    const state = outputStep.state as Record<string, unknown>;
    const activations = state.activations as number[][];

    // Check all activations in all layers (except input layer)
    for (let l = 1; l < activations.length; l++) {
      for (const val of activations[l]!) {
        expect(val).toBeGreaterThan(0);
        expect(val).toBeLessThan(1);
      }
    }
  });

  it("sigmoid outputs are always in (0, 1) for single-neuron fixture", () => {
    const steps = run(
      singleNeuronFixture.inputs as {
        inputValues: number[];
        layerSizes: number[];
        activationFunction: string;
        seed: string;
      },
    );
    const outputStep = steps[steps.length - 1]!;
    const state = outputStep.state as Record<string, unknown>;
    const activations = state.activations as number[][];

    for (let l = 1; l < activations.length; l++) {
      for (const val of activations[l]!) {
        expect(val).toBeGreaterThan(0);
        expect(val).toBeLessThan(1);
      }
    }
  });

  // ── Determinism ───────────────────────────────────────────────────────

  it("is deterministic: running twice produces identical steps", () => {
    const inputs = twoLayerFixture.inputs as {
      inputValues: number[];
      layerSizes: number[];
      activationFunction: string;
      seed: string;
    };
    const steps1 = run(inputs);
    const steps2 = run(inputs);

    expect(steps1.length).toBe(steps2.length);
    for (let i = 0; i < steps1.length; i++) {
      expect(steps1[i]!.id).toBe(steps2[i]!.id);
      expect(steps1[i]!.state).toEqual(steps2[i]!.state);
    }
  });

  // ── No NaN or Infinity ────────────────────────────────────────────────

  it("has no NaN or Infinity in any state values (two-layer)", () => {
    const steps = run(
      twoLayerFixture.inputs as {
        inputValues: number[];
        layerSizes: number[];
        activationFunction: string;
        seed: string;
      },
    );
    for (const s of steps) {
      expect(hasNoNaNOrInfinity(s.state)).toBe(true);
    }
  });

  it("has no NaN or Infinity in any state values (three-layer)", () => {
    const steps = run(
      threeLayerFixture.inputs as {
        inputValues: number[];
        layerSizes: number[];
        activationFunction: string;
        seed: string;
      },
    );
    for (const s of steps) {
      expect(hasNoNaNOrInfinity(s.state)).toBe(true);
    }
  });

  it("has no NaN or Infinity in any state values (single-neuron)", () => {
    const steps = run(
      singleNeuronFixture.inputs as {
        inputValues: number[];
        layerSizes: number[];
        activationFunction: string;
        seed: string;
      },
    );
    for (const s of steps) {
      expect(hasNoNaNOrInfinity(s.state)).toBe(true);
    }
  });
});
