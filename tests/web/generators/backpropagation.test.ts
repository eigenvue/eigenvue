/**
 * @fileoverview Backpropagation Generator — Unit Tests
 *
 * Validates step structure, algorithmic correctness, and edge cases.
 * Includes NUMERICAL GRADIENT VERIFICATION to ensure analytical gradients
 * computed by the generator match central-difference numerical gradients.
 */

import { describe, it, expect } from "vitest";
import { runGenerator } from "@/engine/generator";
import backpropGenerator from "../../../algorithms/deep-learning/backpropagation/generator";

import xorFixture from "../../../algorithms/deep-learning/backpropagation/tests/xor-network.fixture.json";
import singleOutputFixture from "../../../algorithms/deep-learning/backpropagation/tests/single-output.fixture.json";
import gradVerifyFixture from "../../../algorithms/deep-learning/backpropagation/tests/gradient-verification.fixture.json";

import {
  seedRandom,
  sigmoid,
  sigmoidDerivative,
  matVecMul,
  vecAdd,
  mseLoss,
  numericalGradient,
} from "@/engine/utils/dl-math";

/** Input type for the backpropagation generator. */
type BackpropInputs = {
  inputValues: number[];
  targets: number[];
  layerSizes: number[];
  activationFunction: string;
  lossFunction: string;
  learningRate: number;
  seed: string;
};

/** Helper: run generator and return steps array. */
function run(inputs: BackpropInputs) {
  return runGenerator(backpropGenerator, inputs).steps;
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

describe("Backpropagation Generator", () => {
  // ── Step Structure Validation ─────────────────────────────────────────

  it("validates step structure for xor-network fixture", () => {
    const steps = run(xorFixture.inputs as BackpropInputs);
    validateStepStructure(steps);
  });

  it("validates step structure for single-output fixture", () => {
    const steps = run(singleOutputFixture.inputs as BackpropInputs);
    validateStepStructure(steps);
  });

  it("validates step structure for gradient-verification fixture", () => {
    const steps = run(gradVerifyFixture.inputs as BackpropInputs);
    validateStepStructure(steps);
  });

  // ── Step Counts ───────────────────────────────────────────────────────

  it("XOR fixture: step count = 9", () => {
    const steps = run(xorFixture.inputs as BackpropInputs);
    expect(steps.length).toBe(9);
  });

  it("single-output fixture: step count = 6", () => {
    const steps = run(singleOutputFixture.inputs as BackpropInputs);
    expect(steps.length).toBe(6);
  });

  it("gradient-verification fixture: step count = 9", () => {
    const steps = run(gradVerifyFixture.inputs as BackpropInputs);
    expect(steps.length).toBe(9);
  });

  // ── Step IDs ──────────────────────────────────────────────────────────

  it("terminal step id = 'complete'", () => {
    const steps = run(xorFixture.inputs as BackpropInputs);
    expect(steps[steps.length - 1].id).toBe("complete");
  });

  it("first step id = 'forward-start'", () => {
    const steps = run(xorFixture.inputs as BackpropInputs);
    expect(steps[0].id).toBe("forward-start");
  });

  // ── Compute-loss Step ─────────────────────────────────────────────────

  it("compute-loss step has loss defined and finite", () => {
    const steps = run(xorFixture.inputs as BackpropInputs);
    const lossStep = steps.find((s: any) => s.id === "compute-loss")!;
    expect(lossStep).toBeDefined();
    const state = lossStep.state as Record<string, unknown>;
    expect(typeof state.loss).toBe("number");
    expect(isFinite(state.loss as number)).toBe(true);
  });

  // ── Backward-output Step ──────────────────────────────────────────────

  it("backward-output step has gradients defined", () => {
    const steps = run(xorFixture.inputs as BackpropInputs);
    const backOutputStep = steps.find(
      (s: any) => s.id === "backward-output",
    )!;
    expect(backOutputStep).toBeDefined();
    const state = backOutputStep.state as Record<string, unknown>;
    expect(state.gradients).toBeDefined();
    expect(Array.isArray(state.gradients)).toBe(true);
  });

  // ══════════════════════════════════════════════════════════════════════
  // NUMERICAL GRADIENT VERIFICATION (most critical test)
  // ══════════════════════════════════════════════════════════════════════

  it("analytical gradients match numerical gradients (gradient-verification fixture)", () => {
    const inputs = gradVerifyFixture.inputs as BackpropInputs;
    // layerSizes: [2, 3, 1], sigmoid, MSE, seed "grad-check"
    const { inputValues, targets, layerSizes, seed } = inputs;

    // 1. Initialize weights the same way as the generator (Xavier + seedRandom)
    const rng = seedRandom(seed);
    const N = layerSizes.length;

    const W: number[][][] = [[]];
    const b: number[][] = [[]];

    for (let l = 1; l < N; l++) {
      const nIn = layerSizes[l - 1]!;
      const nOut = layerSizes[l]!;
      const limit = Math.sqrt(6 / (nIn + nOut));
      const Wl: number[][] = [];
      for (let j = 0; j < nOut; j++) {
        const row: number[] = [];
        for (let i = 0; i < nIn; i++) {
          row.push((rng() * 2 - 1) * limit);
        }
        Wl.push(row);
      }
      W.push(Wl);
      b.push(Array.from({ length: nOut }, () => 0.01));
    }

    // 2. Flatten all weights and biases into a 1D vector theta
    //    Order: for each layer l=1..N-1: all weights W[l] row-major, then all biases b[l]
    function flattenParams(
      weights: number[][][],
      biases: number[][],
    ): number[] {
      const theta: number[] = [];
      for (let l = 1; l < N; l++) {
        for (let j = 0; j < weights[l]!.length; j++) {
          for (let i = 0; i < weights[l]![j]!.length; i++) {
            theta.push(weights[l]![j]![i]!);
          }
        }
        for (let j = 0; j < biases[l]!.length; j++) {
          theta.push(biases[l]![j]!);
        }
      }
      return theta;
    }

    // 3. Define f(theta) that reconstructs weights, does forward pass, returns MSE loss
    function reconstructAndLoss(theta: number[]): number {
      // Reconstruct weights and biases from flat theta
      const rW: number[][][] = [[]];
      const rB: number[][] = [[]];
      let idx = 0;
      for (let l = 1; l < N; l++) {
        const nIn = layerSizes[l - 1]!;
        const nOut = layerSizes[l]!;
        const Wl: number[][] = [];
        for (let j = 0; j < nOut; j++) {
          const row: number[] = [];
          for (let i = 0; i < nIn; i++) {
            row.push(theta[idx]!);
            idx++;
          }
          Wl.push(row);
        }
        rW.push(Wl);
        const bl: number[] = [];
        for (let j = 0; j < nOut; j++) {
          bl.push(theta[idx]!);
          idx++;
        }
        rB.push(bl);
      }

      // Forward pass with sigmoid activation
      let a: number[] = [...inputValues];
      for (let l = 1; l < N; l++) {
        const z = vecAdd(matVecMul(rW[l]!, a), rB[l]!);
        a = z.map((zj) => sigmoid(zj));
      }

      // MSE loss
      return mseLoss(a, targets);
    }

    // 4. Compute numerical gradient via central differences
    const theta = flattenParams(W, b);
    const numGrad = numericalGradient(reconstructAndLoss, theta);

    // 5. Get analytical gradients from the generator
    const steps = run(inputs);

    // Extract delta values from the backward steps
    // The generator stores gradients (deltas) per layer
    const completeStep = steps.find((s: any) => s.id === "complete")!;
    const state = completeStep.state as Record<string, unknown>;
    const generatorGradients = state.gradients as number[][];

    // The generator also stores activations (needed to compute weight gradients)
    // We need to re-run the forward pass with our initialized weights to get activations
    // Actually, we can extract them from the generator's state
    const activations = state.activations as number[][];

    // 6. Flatten analytical gradients into same order as theta
    //    dLoss/dW[l][j][i] = delta[l][j] * a[l-1][i]
    //    dLoss/db[l][j] = delta[l][j]
    //    But the activations in the state are AFTER the weight update,
    //    so we need to get pre-update activations from an earlier step.
    //    Use the compute-loss step which has activations before any update.
    const lossStep = steps.find((s: any) => s.id === "compute-loss")!;
    const lossState = lossStep.state as Record<string, unknown>;
    const preUpdateActivations = lossState.activations as number[][];

    const analyticalGrad: number[] = [];
    for (let l = 1; l < N; l++) {
      const prevA = preUpdateActivations[l - 1]!;
      const deltaL = generatorGradients[l]!;
      // Weight gradients: dLoss/dW[l][j][i] = delta[l][j] * a[l-1][i]
      for (let j = 0; j < layerSizes[l]!; j++) {
        for (let i = 0; i < layerSizes[l - 1]!; i++) {
          analyticalGrad.push(deltaL[j]! * prevA[i]!);
        }
      }
      // Bias gradients: dLoss/db[l][j] = delta[l][j]
      for (let j = 0; j < layerSizes[l]!; j++) {
        analyticalGrad.push(deltaL[j]!);
      }
    }

    // 7. Compare: relative error < 1e-4 for every weight
    expect(analyticalGrad.length).toBe(numGrad.length);
    for (let i = 0; i < analyticalGrad.length; i++) {
      const aGrad = analyticalGrad[i]!;
      const nGrad = numGrad[i]!;
      // Relative error: |a - n| / max(|a|, |n|, 1e-8)
      const denom = Math.max(Math.abs(aGrad), Math.abs(nGrad), 1e-8);
      const relError = Math.abs(aGrad - nGrad) / denom;
      expect(relError).toBeLessThan(1e-4);
    }
  });

  // ── BCE + Sigmoid Combined Gradient ───────────────────────────────────

  it("BCE+sigmoid: output delta equals prediction minus target", () => {
    const inputs = singleOutputFixture.inputs as BackpropInputs;
    const steps = run(inputs);

    // Find backward-output step
    const backOutputStep = steps.find(
      (s: any) => s.id === "backward-output",
    )!;
    const backState = backOutputStep.state as Record<string, unknown>;
    const gradients = backState.gradients as number[][];
    const outputLayerIdx = inputs.layerSizes.length - 1;
    const outputDelta = gradients[outputLayerIdx]!;

    // Find compute-loss step for predictions
    const lossStep = steps.find((s: any) => s.id === "compute-loss")!;
    const lossState = lossStep.state as Record<string, unknown>;
    const predictions = lossState.predictions as number[];
    const targets = inputs.targets;

    // For BCE + sigmoid: delta = a - y
    for (let j = 0; j < predictions.length; j++) {
      expect(outputDelta[j]).toBeCloseTo(
        predictions[j]! - targets[j]!,
        10,
      );
    }
  });

  // ── Determinism ───────────────────────────────────────────────────────

  it("is deterministic: running twice produces identical steps", () => {
    const inputs = xorFixture.inputs as BackpropInputs;
    const steps1 = run(inputs);
    const steps2 = run(inputs);

    expect(steps1.length).toBe(steps2.length);
    for (let i = 0; i < steps1.length; i++) {
      expect(steps1[i]!.id).toBe(steps2[i]!.id);
      expect(steps1[i]!.state).toEqual(steps2[i]!.state);
    }
  });

  // ── No NaN or Infinity ────────────────────────────────────────────────

  it("has no NaN or Infinity in any state values (xor-network)", () => {
    const steps = run(xorFixture.inputs as BackpropInputs);
    for (const s of steps) {
      expect(hasNoNaNOrInfinity(s.state)).toBe(true);
    }
  });

  it("has no NaN or Infinity in any state values (single-output)", () => {
    const steps = run(singleOutputFixture.inputs as BackpropInputs);
    for (const s of steps) {
      expect(hasNoNaNOrInfinity(s.state)).toBe(true);
    }
  });

  it("has no NaN or Infinity in any state values (gradient-verification)", () => {
    const steps = run(gradVerifyFixture.inputs as BackpropInputs);
    for (const s of steps) {
      expect(hasNoNaNOrInfinity(s.state)).toBe(true);
    }
  });
});
