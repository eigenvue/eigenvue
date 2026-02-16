/**
 * @fileoverview Self-Attention Generator — Unit Tests
 *
 * Validates step structure, attention weight invariants (row sums to 1.0,
 * non-negative weights), output dimensions, determinism, and absence of
 * NaN/Infinity.
 * Tests the Self-Attention generator from the cross-platform test location.
 */

import { describe, it, expect } from "vitest";
import { runGenerator } from "@/engine/generator";
import selfAttentionGenerator from "../../../../algorithms/generative-ai/self-attention/generator";

import threeTokenFixture from "../../../../algorithms/generative-ai/self-attention/tests/three-token-attention.fixture.json";
import fourTokenFixture from "../../../../algorithms/generative-ai/self-attention/tests/four-token-attention.fixture.json";
import uniformAttentionFixture from "../../../../algorithms/generative-ai/self-attention/tests/uniform-attention.fixture.json";

/** Helper: run generator and return steps array. */
function run(inputs: { tokens: string[]; embeddingDim: number }) {
  return runGenerator(selfAttentionGenerator, inputs).steps;
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
  if (obj && typeof obj === "object") return Object.values(obj).every(hasNoNaNOrInfinity);
  return true;
}

describe("Self-Attention Generator", () => {
  it("validates step structure for three-token fixture", () => {
    const steps = run(threeTokenFixture.inputs as { tokens: string[]; embeddingDim: number });
    validateStepStructure(steps);
  });

  it("attention weight rows sum to 1.0 (±1e-6) in the softmax step", () => {
    const steps = run(threeTokenFixture.inputs as { tokens: string[]; embeddingDim: number });

    // Find the apply-softmax step
    const softmaxStep = steps.find((s) => s.id === "apply-softmax");
    expect(softmaxStep).toBeDefined();

    const state = softmaxStep!.state as Record<string, unknown>;
    const attentionWeights = state.attentionWeights as number[][];
    expect(attentionWeights).toBeDefined();

    for (let i = 0; i < attentionWeights.length; i++) {
      const rowSum = attentionWeights[i]!.reduce((a, b) => a + b, 0);
      expect(Math.abs(rowSum - 1.0)).toBeLessThan(1e-6);
    }
  });

  it("all attention weights are non-negative", () => {
    const steps = run(threeTokenFixture.inputs as { tokens: string[]; embeddingDim: number });

    const softmaxStep = steps.find((s) => s.id === "apply-softmax");
    expect(softmaxStep).toBeDefined();

    const state = softmaxStep!.state as Record<string, unknown>;
    const attentionWeights = state.attentionWeights as number[][];

    for (const row of attentionWeights) {
      for (const w of row) {
        expect(w).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("output dimensions match input dimensions", () => {
    const inputs = threeTokenFixture.inputs as { tokens: string[]; embeddingDim: number };
    const steps = run(inputs);

    const lastStep = steps[steps.length - 1]!;
    const state = lastStep.state as Record<string, unknown>;
    const output = state.output as number[][];

    expect(output).toHaveLength(inputs.tokens.length);
    for (const row of output) {
      expect(row).toHaveLength(inputs.embeddingDim);
    }
  });

  it("is deterministic: running twice produces identical results", () => {
    const inputs = threeTokenFixture.inputs as { tokens: string[]; embeddingDim: number };
    const steps1 = run(inputs);
    const steps2 = run(inputs);

    expect(steps1.length).toBe(steps2.length);
    for (let i = 0; i < steps1.length; i++) {
      expect(steps1[i]!.id).toBe(steps2[i]!.id);
      expect(steps1[i]!.state).toEqual(steps2[i]!.state);
    }
  });

  it("has no NaN or Infinity in any state values", () => {
    const steps = run(threeTokenFixture.inputs as { tokens: string[]; embeddingDim: number });
    for (const s of steps) {
      expect(hasNoNaNOrInfinity(s.state)).toBe(true);
    }
  });

  it("uniform-attention: identical tokens produce uniform attention weights", () => {
    const steps = run(uniformAttentionFixture.inputs as { tokens: string[]; embeddingDim: number });
    validateStepStructure(steps);

    const softmaxStep = steps.find((s) => s.id === "apply-softmax");
    expect(softmaxStep).toBeDefined();

    const state = softmaxStep!.state as Record<string, unknown>;
    const attentionWeights = state.attentionWeights as number[][];
    const seqLen = uniformAttentionFixture.inputs.tokens.length;
    const expectedWeight = 1 / seqLen;

    expect(attentionWeights).toHaveLength(seqLen);

    for (let i = 0; i < attentionWeights.length; i++) {
      const row = attentionWeights[i]!;
      // Row must sum to 1.0.
      const rowSum = row.reduce((a, b) => a + b, 0);
      expect(Math.abs(rowSum - 1.0)).toBeLessThan(1e-6);

      // Each weight must be ≈ 1/n (uniform distribution).
      for (const w of row) {
        expect(w).toBeGreaterThanOrEqual(0);
        expect(Math.abs(w - expectedWeight)).toBeLessThan(1e-6);
      }
    }

    // Verify no NaN/Infinity.
    for (const s of steps) {
      expect(hasNoNaNOrInfinity(s.state)).toBe(true);
    }
  });

  it("four-token fixture also validates correctly", () => {
    const steps = run(fourTokenFixture.inputs as { tokens: string[]; embeddingDim: number });
    validateStepStructure(steps);

    // Also verify attention weight invariants for the four-token case
    const softmaxStep = steps.find((s) => s.id === "apply-softmax");
    expect(softmaxStep).toBeDefined();

    const state = softmaxStep!.state as Record<string, unknown>;
    const attentionWeights = state.attentionWeights as number[][];

    expect(attentionWeights).toHaveLength(fourTokenFixture.inputs.tokens.length);

    for (let i = 0; i < attentionWeights.length; i++) {
      const rowSum = attentionWeights[i]!.reduce((a, b) => a + b, 0);
      expect(Math.abs(rowSum - 1.0)).toBeLessThan(1e-6);
      for (const w of attentionWeights[i]!) {
        expect(w).toBeGreaterThanOrEqual(0);
      }
    }

    // Verify no NaN/Infinity
    for (const s of steps) {
      expect(hasNoNaNOrInfinity(s.state)).toBe(true);
    }
  });
});
