/**
 * @fileoverview Perceptron Generator — Unit Tests
 *
 * Validates step structure, algorithmic correctness, and edge cases.
 * Tests the Perceptron generator from the cross-platform test location.
 */

import { describe, it, expect } from "vitest";
import { runGenerator } from "@/engine/generator";
import perceptronGenerator from "../../../algorithms/deep-learning/perceptron/generator";

import andGateFixture from "../../../algorithms/deep-learning/perceptron/tests/and-gate.fixture.json";
import orGateFixture from "../../../algorithms/deep-learning/perceptron/tests/or-gate.fixture.json";
import singleInputFixture from "../../../algorithms/deep-learning/perceptron/tests/single-input.fixture.json";

/** Helper: run generator and return steps array. */
function run(inputs: {
  inputs: number[];
  weights: number[];
  bias: number;
  activationFunction: string;
}) {
  return runGenerator(perceptronGenerator, inputs).steps;
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

describe("Perceptron Generator", () => {
  // ── Step Structure Validation ─────────────────────────────────────────

  it("validates step structure for and-gate fixture", () => {
    const steps = run(
      andGateFixture.inputs as {
        inputs: number[];
        weights: number[];
        bias: number;
        activationFunction: string;
      },
    );
    validateStepStructure(steps);
  });

  it("validates step structure for or-gate fixture", () => {
    const steps = run(
      orGateFixture.inputs as {
        inputs: number[];
        weights: number[];
        bias: number;
        activationFunction: string;
      },
    );
    validateStepStructure(steps);
  });

  it("validates step structure for single-input fixture", () => {
    const steps = run(
      singleInputFixture.inputs as {
        inputs: number[];
        weights: number[];
        bias: number;
        activationFunction: string;
      },
    );
    validateStepStructure(steps);
  });

  // ── Step Count ────────────────────────────────────────────────────────

  it("step count = 6 for and-gate fixture", () => {
    const steps = run(
      andGateFixture.inputs as {
        inputs: number[];
        weights: number[];
        bias: number;
        activationFunction: string;
      },
    );
    expect(steps.length).toBe(6);
  });

  it("step count = 6 for or-gate fixture", () => {
    const steps = run(
      orGateFixture.inputs as {
        inputs: number[];
        weights: number[];
        bias: number;
        activationFunction: string;
      },
    );
    expect(steps.length).toBe(6);
  });

  it("step count = 6 for single-input fixture", () => {
    const steps = run(
      singleInputFixture.inputs as {
        inputs: number[];
        weights: number[];
        bias: number;
        activationFunction: string;
      },
    );
    expect(steps.length).toBe(6);
  });

  // ── Step IDs ──────────────────────────────────────────────────────────

  it("terminal step id = 'output'", () => {
    const steps = run(
      andGateFixture.inputs as {
        inputs: number[];
        weights: number[];
        bias: number;
        activationFunction: string;
      },
    );
    expect(steps[steps.length - 1].id).toBe("output");
  });

  it("first step id = 'show-inputs'", () => {
    const steps = run(
      andGateFixture.inputs as {
        inputs: number[];
        weights: number[];
        bias: number;
        activationFunction: string;
      },
    );
    expect(steps[0].id).toBe("show-inputs");
  });

  // ── Pre-activation Verification ──────────────────────────────────────

  it("pre-activation step (index 3) has z = dot(w,x) + b for and-gate", () => {
    const inputs = andGateFixture.inputs as {
      inputs: number[];
      weights: number[];
      bias: number;
      activationFunction: string;
    };
    const steps = run(inputs);
    const preActStep = steps[3]!;
    const state = preActStep.state as Record<string, unknown>;

    // z = dot(w, x) + b
    const expectedZ =
      inputs.inputs.reduce((sum, xi, i) => sum + xi * inputs.weights[i]!, 0) +
      inputs.bias;
    expect(state.z).toBeCloseTo(expectedZ, 10);
  });

  it("pre-activation step (index 3) has z = dot(w,x) + b for single-input", () => {
    const inputs = singleInputFixture.inputs as {
      inputs: number[];
      weights: number[];
      bias: number;
      activationFunction: string;
    };
    const steps = run(inputs);
    const preActStep = steps[3]!;
    const state = preActStep.state as Record<string, unknown>;

    const expectedZ =
      inputs.inputs.reduce((sum, xi, i) => sum + xi * inputs.weights[i]!, 0) +
      inputs.bias;
    expect(state.z).toBeCloseTo(expectedZ, 10);
  });

  // ── Activation Function Outputs ───────────────────────────────────────

  it("sigmoid activation output is in (0, 1) for single-input fixture", () => {
    const steps = run(
      singleInputFixture.inputs as {
        inputs: number[];
        weights: number[];
        bias: number;
        activationFunction: string;
      },
    );
    const outputStep = steps[steps.length - 1]!;
    const state = outputStep.state as Record<string, unknown>;
    const a = state.a as number;
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThan(1);
  });

  it("step function output is in {0, 1} for and-gate fixture", () => {
    const steps = run(
      andGateFixture.inputs as {
        inputs: number[];
        weights: number[];
        bias: number;
        activationFunction: string;
      },
    );
    const outputStep = steps[steps.length - 1]!;
    const state = outputStep.state as Record<string, unknown>;
    const a = state.a as number;
    expect([0, 1]).toContain(a);
  });

  it("step function output is in {0, 1} for or-gate fixture", () => {
    const steps = run(
      orGateFixture.inputs as {
        inputs: number[];
        weights: number[];
        bias: number;
        activationFunction: string;
      },
    );
    const outputStep = steps[steps.length - 1]!;
    const state = outputStep.state as Record<string, unknown>;
    const a = state.a as number;
    expect([0, 1]).toContain(a);
  });

  // ── Determinism ───────────────────────────────────────────────────────

  it("is deterministic: running twice produces identical steps", () => {
    const inputs = singleInputFixture.inputs as {
      inputs: number[];
      weights: number[];
      bias: number;
      activationFunction: string;
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

  it("has no NaN or Infinity in any state values (and-gate)", () => {
    const steps = run(
      andGateFixture.inputs as {
        inputs: number[];
        weights: number[];
        bias: number;
        activationFunction: string;
      },
    );
    for (const s of steps) {
      expect(hasNoNaNOrInfinity(s.state)).toBe(true);
    }
  });

  it("has no NaN or Infinity in any state values (or-gate)", () => {
    const steps = run(
      orGateFixture.inputs as {
        inputs: number[];
        weights: number[];
        bias: number;
        activationFunction: string;
      },
    );
    for (const s of steps) {
      expect(hasNoNaNOrInfinity(s.state)).toBe(true);
    }
  });

  it("has no NaN or Infinity in any state values (single-input)", () => {
    const steps = run(
      singleInputFixture.inputs as {
        inputs: number[];
        weights: number[];
        bias: number;
        activationFunction: string;
      },
    );
    for (const s of steps) {
      expect(hasNoNaNOrInfinity(s.state)).toBe(true);
    }
  });
});
