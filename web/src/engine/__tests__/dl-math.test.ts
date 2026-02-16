/**
 * @fileoverview Tests for dl-math.ts — Deep Learning Math Library.
 *
 * Every function is tested for correctness against hand-computed values.
 * Numerical gradient checks verify analytical derivatives.
 *
 * Mathematical basis: Section 4 of the Phase 9 specification.
 */

import { describe, it, expect } from "vitest";
import {
  sigmoid,
  sigmoidDerivative,
  relu,
  reluDerivative,
  tanh,
  tanhDerivative,
  stepFunction,
  mseLoss,
  mseLossGradient,
  bceLoss,
  dotProduct,
  matVecMul,
  vecAdd,
  numericalGradient,
  sgdStep,
  momentumStep,
  adamStep,
  seedRandom,
} from "../utils/dl-math";

// ── Helper: relative error between two values ──────────────────────────────
function relativeError(a: number, b: number): number {
  return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1e-7);
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. Activation Functions
// ══════════════════════════════════════════════════════════════════════════════

describe("sigmoid", () => {
  it("sigmoid(0) === 0.5", () => {
    expect(sigmoid(0)).toBe(0.5);
  });

  it("sigmoid(large positive) → 1.0", () => {
    expect(sigmoid(100)).toBeCloseTo(1.0, 10);
    expect(sigmoid(500)).toBe(1.0);
    expect(sigmoid(600)).toBe(1.0);
  });

  it("sigmoid(large negative) → 0.0", () => {
    expect(sigmoid(-100)).toBeCloseTo(0.0, 10);
    // z = -500 is at the guard boundary: 1/(1+exp(500)) is extremely small
    expect(sigmoid(-500)).toBeCloseTo(0.0, 10);
    // z < -500 triggers the explicit 0.0 guard
    expect(sigmoid(-600)).toBe(0.0);
  });

  it("sigmoid output is always in (0, 1)", () => {
    for (const z of [-10, -5, -1, -0.5, 0, 0.5, 1, 5, 10]) {
      const s = sigmoid(z);
      expect(s).toBeGreaterThan(0);
      expect(s).toBeLessThan(1);
    }
  });

  it("sigmoid(1) ≈ 0.7310585...", () => {
    expect(sigmoid(1)).toBeCloseTo(0.7310585786300049, 10);
  });
});

describe("sigmoidDerivative", () => {
  it("sigmoidDerivative(0) === 0.25", () => {
    expect(sigmoidDerivative(0)).toBe(0.25);
  });

  it("sigmoidDerivative matches numerical derivative to 5 decimal places", () => {
    for (const z of [-3, -1, 0, 1, 3]) {
      const analytical = sigmoidDerivative(z);
      const eps = 1e-5;
      const numerical = (sigmoid(z + eps) - sigmoid(z - eps)) / (2 * eps);
      expect(relativeError(analytical, numerical)).toBeLessThan(1e-5);
    }
  });

  it("sigmoidDerivative is maximized at z=0", () => {
    const atZero = sigmoidDerivative(0);
    for (const z of [-2, -1, -0.5, 0.5, 1, 2]) {
      expect(sigmoidDerivative(z)).toBeLessThanOrEqual(atZero);
    }
  });
});

describe("relu", () => {
  it("relu(positive) returns the value", () => {
    expect(relu(3.5)).toBe(3.5);
    expect(relu(0.001)).toBe(0.001);
  });

  it("relu(negative) returns 0", () => {
    expect(relu(-3.5)).toBe(0);
    expect(relu(-0.001)).toBe(0);
  });

  it("relu(0) returns 0", () => {
    expect(relu(0)).toBe(0);
  });
});

describe("reluDerivative", () => {
  it("reluDerivative(positive) returns 1", () => {
    expect(reluDerivative(3.5)).toBe(1);
    expect(reluDerivative(0.001)).toBe(1);
  });

  it("reluDerivative(negative) returns 0", () => {
    expect(reluDerivative(-3.5)).toBe(0);
    expect(reluDerivative(-0.001)).toBe(0);
  });

  it("reluDerivative(0) === 0 (convention)", () => {
    // CRITICAL: ReLU'(0) = 0 — Section 4.2.2 convention
    expect(reluDerivative(0)).toBe(0);
  });
});

describe("tanh", () => {
  it("tanh(0) === 0", () => {
    expect(tanh(0)).toBe(0);
  });

  it("tanh output is in (-1, 1)", () => {
    for (const z of [-10, -5, -1, 0, 1, 5, 10]) {
      const t = tanh(z);
      expect(t).toBeGreaterThan(-1);
      expect(t).toBeLessThan(1);
    }
  });
});

describe("tanhDerivative", () => {
  it("tanhDerivative(0) === 1", () => {
    expect(tanhDerivative(0)).toBe(1);
  });

  it("tanhDerivative matches numerical derivative", () => {
    for (const z of [-2, -1, 0, 1, 2]) {
      const analytical = tanhDerivative(z);
      const eps = 1e-5;
      const numerical = (tanh(z + eps) - tanh(z - eps)) / (2 * eps);
      expect(relativeError(analytical, numerical)).toBeLessThan(1e-5);
    }
  });
});

describe("stepFunction", () => {
  it("step(positive) === 1", () => {
    expect(stepFunction(1)).toBe(1);
    expect(stepFunction(0.001)).toBe(1);
  });

  it("step(negative) === 0", () => {
    expect(stepFunction(-1)).toBe(0);
    expect(stepFunction(-0.001)).toBe(0);
  });

  it("step(0) === 1 (convention: z >= 0)", () => {
    expect(stepFunction(0)).toBe(1);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. Loss Functions
// ══════════════════════════════════════════════════════════════════════════════

describe("mseLoss", () => {
  it("mseLoss([1,0], [0,1]) === 1.0", () => {
    // L = (1/2) * ((1-0)² + (0-1)²) = (1/2) * (1+1) = 1.0
    expect(mseLoss([1, 0], [0, 1])).toBe(1.0);
  });

  it("mseLoss of identical vectors is 0", () => {
    expect(mseLoss([1, 2, 3], [1, 2, 3])).toBe(0);
  });

  it("mseLoss is non-negative", () => {
    expect(mseLoss([0.5], [0.7])).toBeGreaterThanOrEqual(0);
  });
});

describe("mseLossGradient", () => {
  it("includes the 2/k factor", () => {
    // predictions = [1, 0], targets = [0, 1], k = 2
    // grad[0] = (2/2) * (1 - 0) = 1.0
    // grad[1] = (2/2) * (0 - 1) = -1.0
    const grad = mseLossGradient([1, 0], [0, 1]);
    expect(grad[0]).toBe(1.0);
    expect(grad[1]).toBe(-1.0);
  });

  it("gradient matches numerical gradient", () => {
    const predictions = [0.5, 0.8, 0.3];
    const targets = [0.7, 0.2, 0.9];
    const analytical = mseLossGradient(predictions, targets);

    const numerical = numericalGradient(
      (p) => mseLoss(p, targets),
      [...predictions],
    );

    for (let i = 0; i < predictions.length; i++) {
      expect(relativeError(analytical[i]!, numerical[i]!)).toBeLessThan(1e-4);
    }
  });
});

describe("bceLoss", () => {
  it("bceLoss returns non-negative value", () => {
    expect(bceLoss([0.9], [1])).toBeGreaterThanOrEqual(0);
    expect(bceLoss([0.1], [0])).toBeGreaterThanOrEqual(0);
  });

  it("bceLoss is small when prediction matches target", () => {
    const highConf = bceLoss([0.99], [1]);
    const lowConf = bceLoss([0.5], [1]);
    expect(highConf).toBeLessThan(lowConf);
  });

  it("bceLoss handles edge values without NaN", () => {
    // Predictions very close to 0 or 1 should not produce NaN or Infinity
    const loss1 = bceLoss([0.0000001], [0]);
    const loss2 = bceLoss([0.9999999], [1]);
    expect(Number.isFinite(loss1)).toBe(true);
    expect(Number.isFinite(loss2)).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. Linear Algebra
// ══════════════════════════════════════════════════════════════════════════════

describe("dotProduct", () => {
  it("computes correct dot product", () => {
    expect(dotProduct([1, 2, 3], [4, 5, 6])).toBe(32); // 4+10+18
  });

  it("dot product of orthogonal vectors is 0", () => {
    expect(dotProduct([1, 0], [0, 1])).toBe(0);
  });

  it("throws on length mismatch", () => {
    expect(() => dotProduct([1, 2], [1, 2, 3])).toThrow();
  });
});

describe("matVecMul", () => {
  it("computes correct matrix-vector product", () => {
    // [[1, 2], [3, 4]] @ [5, 6] = [1*5+2*6, 3*5+4*6] = [17, 39]
    const result = matVecMul([[1, 2], [3, 4]], [5, 6]);
    expect(result).toEqual([17, 39]);
  });

  it("identity matrix returns input vector", () => {
    const result = matVecMul([[1, 0], [0, 1]], [3, 7]);
    expect(result).toEqual([3, 7]);
  });

  it("throws on dimension mismatch", () => {
    expect(() => matVecMul([[1, 2, 3]], [1, 2])).toThrow();
  });

  it("handles empty matrix", () => {
    expect(matVecMul([], [])).toEqual([]);
  });
});

describe("vecAdd", () => {
  it("adds vectors element-wise", () => {
    expect(vecAdd([1, 2, 3], [4, 5, 6])).toEqual([5, 7, 9]);
  });

  it("throws on length mismatch", () => {
    expect(() => vecAdd([1, 2], [1])).toThrow();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 4. Numerical Gradient
// ══════════════════════════════════════════════════════════════════════════════

describe("numericalGradient", () => {
  it("approximates gradient of x² correctly", () => {
    // f(x) = x², f'(x) = 2x
    const grad = numericalGradient((theta) => theta[0]! * theta[0]!, [3]);
    expect(Math.abs(grad[0]! - 6)).toBeLessThan(1e-4);
  });

  it("approximates gradient of multi-dimensional quadratic", () => {
    // f(x, y) = x² + 4y², grad = [2x, 8y]
    const grad = numericalGradient(
      (theta) => theta[0]! * theta[0]! + 4 * theta[1]! * theta[1]!,
      [1, 2],
    );
    expect(Math.abs(grad[0]! - 2)).toBeLessThan(1e-4);
    expect(Math.abs(grad[1]! - 16)).toBeLessThan(1e-4);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 5. Optimizers
// ══════════════════════════════════════════════════════════════════════════════

describe("sgdStep", () => {
  it("performs a basic SGD update", () => {
    // θ = [1, 2], g = [0.5, -0.3], lr = 0.1
    // θ_new = [1 - 0.1*0.5, 2 - 0.1*(-0.3)] = [0.95, 2.03]
    const result = sgdStep([1, 2], [0.5, -0.3], 0.1);
    expect(result[0]).toBeCloseTo(0.95, 10);
    expect(result[1]).toBeCloseTo(2.03, 10);
  });

  it("zero gradient means no change", () => {
    const result = sgdStep([1, 2], [0, 0], 0.1);
    expect(result).toEqual([1, 2]);
  });
});

describe("momentumStep", () => {
  it("accumulates velocity", () => {
    // First step: v = 0.9*0 + 0.5 = 0.5, θ = 1 - 0.1*0.5 = 0.95
    const step1 = momentumStep([1], [0.5], [0], 0.1, 0.9);
    expect(step1.velocity[0]).toBeCloseTo(0.5, 10);
    expect(step1.params[0]).toBeCloseTo(0.95, 10);

    // Second step with same gradient: v = 0.9*0.5 + 0.5 = 0.95
    const step2 = momentumStep(step1.params, [0.5], step1.velocity, 0.1, 0.9);
    expect(step2.velocity[0]).toBeCloseTo(0.95, 10);
  });

  it("produces faster convergence than SGD on elongated quadratic", () => {
    // f(x,y) = x² + 4y², start at [5, 5]
    let sgdParams = [5, 5];
    let momParams = [5, 5];
    let velocity = [0, 0];
    const lr = 0.01;

    for (let i = 0; i < 100; i++) {
      const sgdGrad = [2 * sgdParams[0]!, 8 * sgdParams[1]!];
      sgdParams = sgdStep(sgdParams, sgdGrad, lr);

      const momGrad = [2 * momParams[0]!, 8 * momParams[1]!];
      const result = momentumStep(momParams, momGrad, velocity, lr, 0.9);
      momParams = result.params;
      velocity = result.velocity;
    }

    const sgdLoss = sgdParams[0]! ** 2 + 4 * sgdParams[1]! ** 2;
    const momLoss = momParams[0]! ** 2 + 4 * momParams[1]! ** 2;
    expect(momLoss).toBeLessThan(sgdLoss);
  });
});

describe("adamStep", () => {
  it("throws for t = 0", () => {
    expect(() => adamStep([1], [0.5], [0], [0], 0.01, 0)).toThrow();
  });

  it("produces valid output at t = 1 (no NaN)", () => {
    const result = adamStep([1, 2], [0.5, -0.3], [0, 0], [0, 0], 0.01, 1);
    expect(Number.isFinite(result.params[0])).toBe(true);
    expect(Number.isFinite(result.params[1])).toBe(true);
    expect(Number.isNaN(result.params[0])).toBe(false);
    expect(Number.isNaN(result.params[1])).toBe(false);
  });

  it("converges on simple quadratic", () => {
    // f(x) = x², start at x = 5
    let params = [5];
    let m = [0];
    let v = [0];

    for (let t = 1; t <= 200; t++) {
      const grad = [2 * params[0]!]; // f'(x) = 2x
      const result = adamStep(params, grad, m, v, 0.1, t);
      params = result.params;
      m = result.m;
      v = result.v;
    }

    expect(Math.abs(params[0]!)).toBeLessThan(0.1);
  });

  it("never produces NaN in any step", () => {
    let params = [5, 5];
    let m = [0, 0];
    let v = [0, 0];

    for (let t = 1; t <= 50; t++) {
      const grad = [2 * params[0]!, 8 * params[1]!];
      const result = adamStep(params, grad, m, v, 0.01, t);
      params = result.params;
      m = result.m;
      v = result.v;

      for (const p of params) {
        expect(Number.isNaN(p)).toBe(false);
        expect(Number.isFinite(p)).toBe(true);
      }
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 6. seedRandom (re-exported from genai-math)
// ══════════════════════════════════════════════════════════════════════════════

describe("seedRandom", () => {
  it("produces deterministic sequences", () => {
    const rng1 = seedRandom("test-seed");
    const rng2 = seedRandom("test-seed");
    for (let i = 0; i < 100; i++) {
      expect(rng1()).toBe(rng2());
    }
  });

  it("different seeds produce different sequences", () => {
    const rng1 = seedRandom("seed-a");
    const rng2 = seedRandom("seed-b");
    // At least one of the first 10 values should differ
    let allSame = true;
    for (let i = 0; i < 10; i++) {
      if (rng1() !== rng2()) allSame = false;
    }
    expect(allSame).toBe(false);
  });

  it("values are in [0, 1)", () => {
    const rng = seedRandom("range-test");
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 7. Numerical Gradient Verification of Activation Derivatives
// ══════════════════════════════════════════════════════════════════════════════

describe("activation derivative numerical verification", () => {
  const eps = 1e-5;

  it("sigmoid derivative matches numerical gradient at multiple points", () => {
    for (const z of [-5, -2, -1, -0.5, 0, 0.5, 1, 2, 5]) {
      const analytical = sigmoidDerivative(z);
      const numerical = (sigmoid(z + eps) - sigmoid(z - eps)) / (2 * eps);
      expect(relativeError(analytical, numerical)).toBeLessThan(1e-5);
    }
  });

  it("tanh derivative matches numerical gradient at multiple points", () => {
    for (const z of [-5, -2, -1, -0.5, 0, 0.5, 1, 2, 5]) {
      const analytical = tanhDerivative(z);
      const numerical = (tanh(z + eps) - tanh(z - eps)) / (2 * eps);
      expect(relativeError(analytical, numerical)).toBeLessThan(1e-5);
    }
  });

  it("relu derivative matches numerical gradient away from 0", () => {
    // Skip z=0 since ReLU is not differentiable there
    for (const z of [-5, -2, -1, -0.5, 0.5, 1, 2, 5]) {
      const analytical = reluDerivative(z);
      const numerical = (relu(z + eps) - relu(z - eps)) / (2 * eps);
      expect(relativeError(analytical, numerical)).toBeLessThan(1e-4);
    }
  });
});
