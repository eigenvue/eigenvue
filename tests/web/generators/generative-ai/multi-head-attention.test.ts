/**
 * @fileoverview Multi-Head Attention Generator — Unit Tests
 *
 * Validates step structure, per-head attention weight invariants,
 * divisibility precondition, concatenated output shape, determinism,
 * and absence of NaN/Infinity.
 * Tests the Multi-Head Attention generator from the cross-platform test location.
 */

import { describe, it, expect } from "vitest";
import { runGenerator } from "@/engine/generator";
import multiHeadAttentionGenerator from "../../../../algorithms/generative-ai/multi-head-attention/generator";

import twoHeadFixture from "../../../../algorithms/generative-ai/multi-head-attention/tests/two-head.fixture.json";
import fourHeadFixture from "../../../../algorithms/generative-ai/multi-head-attention/tests/four-head.fixture.json";

/** Helper: run generator and return steps array. */
function run(inputs: { tokens: string[]; embeddingDim: number; numHeads: number }) {
  return runGenerator(multiHeadAttentionGenerator, inputs).steps;
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

describe("Multi-Head Attention Generator", () => {
  it("validates step structure for two-head fixture", () => {
    const steps = run(
      twoHeadFixture.inputs as { tokens: string[]; embeddingDim: number; numHeads: number },
    );
    validateStepStructure(steps);
  });

  it("attention weight rows sum to 1.0 per head", () => {
    const inputs = twoHeadFixture.inputs as {
      tokens: string[];
      embeddingDim: number;
      numHeads: number;
    };
    const steps = run(inputs);

    // Find all per-head softmax steps
    const softmaxSteps = steps.filter((s) => s.id.match(/^head-\d+-softmax$/));
    expect(softmaxSteps).toHaveLength(inputs.numHeads);

    for (const s of softmaxSteps) {
      const state = s.state as Record<string, unknown>;
      const attentionWeights = state.attentionWeights as number[][];
      expect(attentionWeights).toBeDefined();

      for (let i = 0; i < attentionWeights.length; i++) {
        const rowSum = attentionWeights[i]!.reduce((a, b) => a + b, 0);
        expect(Math.abs(rowSum - 1.0)).toBeLessThan(1e-6);
        for (const w of attentionWeights[i]!) {
          expect(w).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it("throws error when d_model not divisible by numHeads", () => {
    expect(() => {
      run({ tokens: ["a", "b"], embeddingDim: 7, numHeads: 3 });
    }).toThrow(/divisible/);
  });

  it("is deterministic: running twice produces identical results", () => {
    const inputs = twoHeadFixture.inputs as {
      tokens: string[];
      embeddingDim: number;
      numHeads: number;
    };
    const steps1 = run(inputs);
    const steps2 = run(inputs);

    expect(steps1.length).toBe(steps2.length);
    for (let i = 0; i < steps1.length; i++) {
      expect(steps1[i]!.id).toBe(steps2[i]!.id);
      expect(steps1[i]!.state).toEqual(steps2[i]!.state);
    }
  });

  it("has no NaN or Infinity in any state values", () => {
    const steps = run(
      twoHeadFixture.inputs as { tokens: string[]; embeddingDim: number; numHeads: number },
    );
    for (const s of steps) {
      expect(hasNoNaNOrInfinity(s.state)).toBe(true);
    }
  });

  it("concatenated output has shape [seqLen, d_model]", () => {
    const inputs = fourHeadFixture.inputs as {
      tokens: string[];
      embeddingDim: number;
      numHeads: number;
    };
    const steps = run(inputs);

    // Find the concatenation step
    const concatStep = steps.find((s) => s.id === "concatenate");
    expect(concatStep).toBeDefined();

    const state = concatStep!.state as Record<string, unknown>;
    const concat = state.concat as number[][];

    expect(concat).toHaveLength(inputs.tokens.length);
    for (const row of concat) {
      expect(row).toHaveLength(inputs.embeddingDim);
    }
  });
});
