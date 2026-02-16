/**
 * @fileoverview Token Embeddings Generator — Unit Tests
 *
 * Validates step structure, embedding dimensions, cosine similarity bounds,
 * determinism, and absence of NaN/Infinity.
 * Tests the Token Embeddings generator from the cross-platform test location.
 */

import { describe, it, expect } from "vitest";
import { runGenerator } from "@/engine/generator";
import tokenEmbeddingsGenerator from "../../../../algorithms/generative-ai/token-embeddings/generator";

import threeTokensFixture from "../../../../algorithms/generative-ai/token-embeddings/tests/three-tokens.fixture.json";
import similarityCheckFixture from "../../../../algorithms/generative-ai/token-embeddings/tests/similarity-check.fixture.json";

/** Helper: run generator and return steps array. */
function run(inputs: { tokens: string[]; embeddingDim: number }) {
  return runGenerator(tokenEmbeddingsGenerator, inputs).steps;
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

describe("Token Embeddings Generator", () => {
  it("validates step structure for three-tokens fixture", () => {
    const steps = run(threeTokensFixture.inputs as { tokens: string[]; embeddingDim: number });
    validateStepStructure(steps);
  });

  it("each embedding has correct dimension", () => {
    const steps = run(threeTokensFixture.inputs as { tokens: string[]; embeddingDim: number });
    const lastStep = steps[steps.length - 1]!;
    const state = lastStep.state as Record<string, unknown>;
    const embeddings = state.embeddings as number[][];
    const dim = threeTokensFixture.inputs.embeddingDim;

    expect(embeddings).toHaveLength(threeTokensFixture.inputs.tokens.length);
    for (const emb of embeddings) {
      expect(emb).toHaveLength(dim);
    }
  });

  it("similarity scores are in [-1, 1]", () => {
    const steps = run(similarityCheckFixture.inputs as { tokens: string[]; embeddingDim: number });

    // Find all cosine-similarity steps
    const simSteps = steps.filter((s) => s.id === "cosine-similarity");
    expect(simSteps.length).toBeGreaterThan(0);

    for (const s of simSteps) {
      const state = s.state as Record<string, unknown>;
      const score = state.similarityScore as number;
      expect(score).toBeGreaterThanOrEqual(-1);
      expect(score).toBeLessThanOrEqual(1);
    }
  });

  it("produces deterministic embeddings (same token produces same vector)", () => {
    const inputs = threeTokensFixture.inputs as { tokens: string[]; embeddingDim: number };
    const steps1 = run(inputs);
    const steps2 = run(inputs);

    expect(steps1.length).toBe(steps2.length);
    for (let i = 0; i < steps1.length; i++) {
      expect(steps1[i]!.id).toBe(steps2[i]!.id);
      expect(steps1[i]!.state).toEqual(steps2[i]!.state);
    }
  });

  it("last step is terminal", () => {
    const steps = run(threeTokensFixture.inputs as { tokens: string[]; embeddingDim: number });
    const lastStep = steps[steps.length - 1]!;
    expect(lastStep.isTerminal).toBe(true);
    expect(lastStep.id).toBe("complete");
  });

  it("has no NaN or Infinity in any state values", () => {
    const steps = run(threeTokensFixture.inputs as { tokens: string[]; embeddingDim: number });
    for (const s of steps) {
      expect(hasNoNaNOrInfinity(s.state)).toBe(true);
    }
  });
});
