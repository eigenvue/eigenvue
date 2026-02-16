/**
 * @fileoverview Gradient Descent Generator — Unit Tests
 *
 * Validates step structure, algorithmic correctness, and edge cases.
 * Tests the Gradient Descent generator with SGD, Momentum, and Adam optimizers
 * from the cross-platform test location.
 */

import { describe, it, expect } from "vitest";
import { runGenerator } from "@/engine/generator";
import gradientDescentGenerator from "../../../algorithms/deep-learning/gradient-descent/generator";

import sgdFixture from "../../../algorithms/deep-learning/gradient-descent/tests/quadratic-sgd.fixture.json";
import momentumFixture from "../../../algorithms/deep-learning/gradient-descent/tests/quadratic-momentum.fixture.json";
import adamFixture from "../../../algorithms/deep-learning/gradient-descent/tests/rosenbrock-adam.fixture.json";

/** Helper: run generator and return steps array. */
function run(inputs: {
  startX: number;
  startY: number;
  learningRate: number;
  optimizer: string;
  numSteps: number;
}) {
  return runGenerator(gradientDescentGenerator, inputs).steps;
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

/** Loss surface: f(x, y) = x^2 + 3y^2 */
function lossFn(x: number, y: number): number {
  return x * x + 3 * y * y;
}

describe("Gradient Descent Generator", () => {
  // ── Step Structure Validation ─────────────────────────────────────────

  it("validates step structure for SGD fixture", () => {
    const steps = run(
      sgdFixture.inputs as {
        startX: number;
        startY: number;
        learningRate: number;
        optimizer: string;
        numSteps: number;
      },
    );
    validateStepStructure(steps);
  });

  it("validates step structure for Momentum fixture", () => {
    const steps = run(
      momentumFixture.inputs as {
        startX: number;
        startY: number;
        learningRate: number;
        optimizer: string;
        numSteps: number;
      },
    );
    validateStepStructure(steps);
  });

  it("validates step structure for Adam fixture", () => {
    const steps = run(
      adamFixture.inputs as {
        startX: number;
        startY: number;
        learningRate: number;
        optimizer: string;
        numSteps: number;
      },
    );
    validateStepStructure(steps);
  });

  // ── Step Count ────────────────────────────────────────────────────────

  it("SGD fixture: step count = 21 (1 initial + 20 steps)", () => {
    const steps = run(
      sgdFixture.inputs as {
        startX: number;
        startY: number;
        learningRate: number;
        optimizer: string;
        numSteps: number;
      },
    );
    expect(steps.length).toBe(21);
  });

  it("Momentum fixture: step count = 31", () => {
    const steps = run(
      momentumFixture.inputs as {
        startX: number;
        startY: number;
        learningRate: number;
        optimizer: string;
        numSteps: number;
      },
    );
    expect(steps.length).toBe(31);
  });

  it("Adam fixture: step count = 26", () => {
    const steps = run(
      adamFixture.inputs as {
        startX: number;
        startY: number;
        learningRate: number;
        optimizer: string;
        numSteps: number;
      },
    );
    expect(steps.length).toBe(26);
  });

  // ── Initial Step Loss ─────────────────────────────────────────────────

  it("initial step: loss = startX^2 + 3*startY^2 for SGD", () => {
    const inputs = sgdFixture.inputs as {
      startX: number;
      startY: number;
      learningRate: number;
      optimizer: string;
      numSteps: number;
    };
    const steps = run(inputs);
    const initialStep = steps[0]!;
    const state = initialStep.state as Record<string, unknown>;
    const expectedLoss = lossFn(inputs.startX, inputs.startY);
    expect(state.loss).toBeCloseTo(expectedLoss, 10);
  });

  it("initial step: loss = startX^2 + 3*startY^2 for Momentum", () => {
    const inputs = momentumFixture.inputs as {
      startX: number;
      startY: number;
      learningRate: number;
      optimizer: string;
      numSteps: number;
    };
    const steps = run(inputs);
    const initialStep = steps[0]!;
    const state = initialStep.state as Record<string, unknown>;
    const expectedLoss = lossFn(inputs.startX, inputs.startY);
    expect(state.loss).toBeCloseTo(expectedLoss, 10);
  });

  it("initial step: loss = startX^2 + 3*startY^2 for Adam", () => {
    const inputs = adamFixture.inputs as {
      startX: number;
      startY: number;
      learningRate: number;
      optimizer: string;
      numSteps: number;
    };
    const steps = run(inputs);
    const initialStep = steps[0]!;
    const state = initialStep.state as Record<string, unknown>;
    const expectedLoss = lossFn(inputs.startX, inputs.startY);
    expect(state.loss).toBeCloseTo(expectedLoss, 10);
  });

  // ── Loss Decreases Over Trajectory ────────────────────────────────────

  it("loss decreases over trajectory for SGD (last loss < first loss)", () => {
    const steps = run(
      sgdFixture.inputs as {
        startX: number;
        startY: number;
        learningRate: number;
        optimizer: string;
        numSteps: number;
      },
    );
    const firstState = steps[0]!.state as Record<string, unknown>;
    const lastState = steps[steps.length - 1]!.state as Record<
      string,
      unknown
    >;
    expect(lastState.loss as number).toBeLessThan(firstState.loss as number);
  });

  it("loss decreases over trajectory for Momentum (last loss < first loss)", () => {
    const steps = run(
      momentumFixture.inputs as {
        startX: number;
        startY: number;
        learningRate: number;
        optimizer: string;
        numSteps: number;
      },
    );
    const firstState = steps[0]!.state as Record<string, unknown>;
    const lastState = steps[steps.length - 1]!.state as Record<
      string,
      unknown
    >;
    expect(lastState.loss as number).toBeLessThan(firstState.loss as number);
  });

  it("loss decreases over trajectory for Adam (last loss < first loss)", () => {
    const steps = run(
      adamFixture.inputs as {
        startX: number;
        startY: number;
        learningRate: number;
        optimizer: string;
        numSteps: number;
      },
    );
    const firstState = steps[0]!.state as Record<string, unknown>;
    const lastState = steps[steps.length - 1]!.state as Record<
      string,
      unknown
    >;
    expect(lastState.loss as number).toBeLessThan(firstState.loss as number);
  });

  // ── Final Parameters Closer to Origin ─────────────────────────────────

  it("final parameters are closer to (0,0) than starting parameters for SGD", () => {
    const inputs = sgdFixture.inputs as {
      startX: number;
      startY: number;
      learningRate: number;
      optimizer: string;
      numSteps: number;
    };
    const steps = run(inputs);
    const lastState = steps[steps.length - 1]!.state as Record<
      string,
      unknown
    >;
    const finalParams = lastState.parameters as number[];

    const startDist = Math.sqrt(
      inputs.startX * inputs.startX + inputs.startY * inputs.startY,
    );
    const finalDist = Math.sqrt(
      finalParams[0]! * finalParams[0]! + finalParams[1]! * finalParams[1]!,
    );
    expect(finalDist).toBeLessThan(startDist);
  });

  it("final parameters are closer to (0,0) than starting parameters for Momentum", () => {
    const inputs = momentumFixture.inputs as {
      startX: number;
      startY: number;
      learningRate: number;
      optimizer: string;
      numSteps: number;
    };
    const steps = run(inputs);
    const lastState = steps[steps.length - 1]!.state as Record<
      string,
      unknown
    >;
    const finalParams = lastState.parameters as number[];

    const startDist = Math.sqrt(
      inputs.startX * inputs.startX + inputs.startY * inputs.startY,
    );
    const finalDist = Math.sqrt(
      finalParams[0]! * finalParams[0]! + finalParams[1]! * finalParams[1]!,
    );
    expect(finalDist).toBeLessThan(startDist);
  });

  it("final parameters are closer to (0,0) than starting parameters for Adam", () => {
    const inputs = adamFixture.inputs as {
      startX: number;
      startY: number;
      learningRate: number;
      optimizer: string;
      numSteps: number;
    };
    const steps = run(inputs);
    const lastState = steps[steps.length - 1]!.state as Record<
      string,
      unknown
    >;
    const finalParams = lastState.parameters as number[];

    const startDist = Math.sqrt(
      inputs.startX * inputs.startX + inputs.startY * inputs.startY,
    );
    const finalDist = Math.sqrt(
      finalParams[0]! * finalParams[0]! + finalParams[1]! * finalParams[1]!,
    );
    expect(finalDist).toBeLessThan(startDist);
  });

  // ── Adam Step Counter ─────────────────────────────────────────────────

  it("Adam t always >= 1 (stepNumber in state starts at 1 for optimization steps)", () => {
    const steps = run(
      adamFixture.inputs as {
        startX: number;
        startY: number;
        learningRate: number;
        optimizer: string;
        numSteps: number;
      },
    );

    // Skip the initial step (stepNumber = 0), check optimization steps
    for (let i = 1; i < steps.length; i++) {
      const state = steps[i]!.state as Record<string, unknown>;
      expect(state.stepNumber as number).toBeGreaterThanOrEqual(1);
    }
  });

  // ── Terminal Step ─────────────────────────────────────────────────────

  it("terminal step is last step for SGD", () => {
    const steps = run(
      sgdFixture.inputs as {
        startX: number;
        startY: number;
        learningRate: number;
        optimizer: string;
        numSteps: number;
      },
    );
    expect(steps[steps.length - 1].isTerminal).toBe(true);
  });

  it("terminal step is last step for Momentum", () => {
    const steps = run(
      momentumFixture.inputs as {
        startX: number;
        startY: number;
        learningRate: number;
        optimizer: string;
        numSteps: number;
      },
    );
    expect(steps[steps.length - 1].isTerminal).toBe(true);
  });

  it("terminal step is last step for Adam", () => {
    const steps = run(
      adamFixture.inputs as {
        startX: number;
        startY: number;
        learningRate: number;
        optimizer: string;
        numSteps: number;
      },
    );
    expect(steps[steps.length - 1].isTerminal).toBe(true);
  });

  // ── Determinism ───────────────────────────────────────────────────────

  it("is deterministic: running twice produces identical steps (SGD)", () => {
    const inputs = sgdFixture.inputs as {
      startX: number;
      startY: number;
      learningRate: number;
      optimizer: string;
      numSteps: number;
    };
    const steps1 = run(inputs);
    const steps2 = run(inputs);

    expect(steps1.length).toBe(steps2.length);
    for (let i = 0; i < steps1.length; i++) {
      expect(steps1[i]!.id).toBe(steps2[i]!.id);
      expect(steps1[i]!.state).toEqual(steps2[i]!.state);
    }
  });

  it("is deterministic: running twice produces identical steps (Adam)", () => {
    const inputs = adamFixture.inputs as {
      startX: number;
      startY: number;
      learningRate: number;
      optimizer: string;
      numSteps: number;
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

  it("has no NaN or Infinity in any state values (SGD)", () => {
    const steps = run(
      sgdFixture.inputs as {
        startX: number;
        startY: number;
        learningRate: number;
        optimizer: string;
        numSteps: number;
      },
    );
    for (const s of steps) {
      expect(hasNoNaNOrInfinity(s.state)).toBe(true);
    }
  });

  it("has no NaN or Infinity in any state values (Momentum)", () => {
    const steps = run(
      momentumFixture.inputs as {
        startX: number;
        startY: number;
        learningRate: number;
        optimizer: string;
        numSteps: number;
      },
    );
    for (const s of steps) {
      expect(hasNoNaNOrInfinity(s.state)).toBe(true);
    }
  });

  it("has no NaN or Infinity in any state values (Adam)", () => {
    const steps = run(
      adamFixture.inputs as {
        startX: number;
        startY: number;
        learningRate: number;
        optimizer: string;
        numSteps: number;
      },
    );
    for (const s of steps) {
      expect(hasNoNaNOrInfinity(s.state)).toBe(true);
    }
  });
});
