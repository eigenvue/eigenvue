/**
 * @fileoverview Transformer Block Generator — Unit Tests
 *
 * Validates step structure, residual connection and layer norm invariants
 * (validated internally by the generator), output shape, determinism,
 * absence of NaN/Infinity, and the divisibility precondition.
 * Tests the Transformer Block generator from the cross-platform test location.
 */

import { describe, it, expect } from "vitest";
import { runGenerator } from "@/engine/generator";
import transformerBlockGenerator from "../../../../algorithms/generative-ai/transformer-block/generator";

import basicBlockFixture from "../../../../algorithms/generative-ai/transformer-block/tests/basic-block.fixture.json";
import residualVerificationFixture from "../../../../algorithms/generative-ai/transformer-block/tests/residual-verification.fixture.json";

/** Helper: run generator and return steps array. */
function run(inputs: {
  tokens: string[];
  embeddingDim: number;
  ffnDim: number;
  numHeads: number;
}) {
  return runGenerator(transformerBlockGenerator, inputs).steps;
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

describe("Transformer Block Generator", () => {
  it("validates step structure for basic-block fixture", () => {
    const steps = run(
      basicBlockFixture.inputs as {
        tokens: string[];
        embeddingDim: number;
        ffnDim: number;
        numHeads: number;
      },
    );
    validateStepStructure(steps);
  });

  it("completes without throwing (residual and layer norm invariants validated internally)", () => {
    // The generator internally validates:
    //   - Residual: result[j] = input[j] + sublayerOutput[j] (±1e-9)
    //   - LayerNorm: mean(output) ≈ 0 (±1e-6), variance(output) ≈ 1 (±1e-4)
    // If any invariant is violated, the generator throws.
    expect(() => {
      run(
        residualVerificationFixture.inputs as {
          tokens: string[];
          embeddingDim: number;
          ffnDim: number;
          numHeads: number;
        },
      );
    }).not.toThrow();
  });

  it("output shape matches input shape [seqLen, d]", () => {
    const inputs = basicBlockFixture.inputs as {
      tokens: string[];
      embeddingDim: number;
      ffnDim: number;
      numHeads: number;
    };
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
    const inputs = basicBlockFixture.inputs as {
      tokens: string[];
      embeddingDim: number;
      ffnDim: number;
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

  it("has no NaN or Infinity in any step state", () => {
    const steps = run(
      basicBlockFixture.inputs as {
        tokens: string[];
        embeddingDim: number;
        ffnDim: number;
        numHeads: number;
      },
    );
    for (const s of steps) {
      expect(hasNoNaNOrInfinity(s.state)).toBe(true);
    }
  });

  it("throws when d_model not divisible by numHeads", () => {
    expect(() => {
      run({ tokens: ["a", "b"], embeddingDim: 7, ffnDim: 16, numHeads: 3 });
    }).toThrow(/divisible/);
  });
});
