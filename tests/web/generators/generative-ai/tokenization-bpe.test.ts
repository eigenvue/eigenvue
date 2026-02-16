/**
 * @fileoverview BPE Tokenization Generator — Unit Tests
 *
 * Validates step structure, algorithmic correctness, and edge cases.
 * Tests the BPE Tokenization generator from the cross-platform test location.
 */

import { describe, it, expect } from "vitest";
import { runGenerator } from "@/engine/generator";
import tokenizationBPEGenerator from "../../../../algorithms/generative-ai/tokenization-bpe/generator";

import basicMergeFixture from "../../../../algorithms/generative-ai/tokenization-bpe/tests/basic-merge.fixture.json";
import singleWordFixture from "../../../../algorithms/generative-ai/tokenization-bpe/tests/single-word.fixture.json";
import multiWordFixture from "../../../../algorithms/generative-ai/tokenization-bpe/tests/multi-word.fixture.json";

/** Helper: run generator and return steps array. */
function run(inputs: { text: string; mergeRules: [[string, string], string][] }) {
  return runGenerator(tokenizationBPEGenerator, inputs).steps;
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

describe("Tokenization BPE Generator", () => {
  it("validates step structure for basic-merge fixture", () => {
    const steps = run(
      basicMergeFixture.inputs as { text: string; mergeRules: [[string, string], string][] },
    );
    validateStepStructure(steps);
  });

  it("final state has correct tokens for basic-merge fixture", () => {
    const steps = run(
      basicMergeFixture.inputs as { text: string; mergeRules: [[string, string], string][] },
    );
    const lastStep = steps[steps.length - 1]!;
    const state = lastStep.state as Record<string, unknown>;
    expect(state.tokens).toEqual(["ab"]);
    expect(state.finalTokenCount).toBe(1);
  });

  it("validates step structure for single-word fixture", () => {
    const steps = run(
      singleWordFixture.inputs as { text: string; mergeRules: [[string, string], string][] },
    );
    validateStepStructure(steps);
  });

  it("final state has tokens: ['lowest'] for single-word fixture", () => {
    const steps = run(
      singleWordFixture.inputs as { text: string; mergeRules: [[string, string], string][] },
    );
    const lastStep = steps[steps.length - 1]!;
    const state = lastStep.state as Record<string, unknown>;
    expect(state.tokens).toEqual(["lowest"]);
  });

  it("first step is character-split with correct character tokens", () => {
    const steps = run(
      basicMergeFixture.inputs as { text: string; mergeRules: [[string, string], string][] },
    );
    const firstStep = steps[0]!;
    expect(firstStep.id).toBe("character-split");
    const state = firstStep.state as Record<string, unknown>;
    expect(state.tokens).toEqual(["a", "b"]);
  });

  it("last step is terminal", () => {
    const steps = run(
      singleWordFixture.inputs as { text: string; mergeRules: [[string, string], string][] },
    );
    const lastStep = steps[steps.length - 1]!;
    expect(lastStep.isTerminal).toBe(true);
    expect(lastStep.id).toBe("complete");
  });

  it("is deterministic: running twice produces identical results", () => {
    const inputs = singleWordFixture.inputs as {
      text: string;
      mergeRules: [[string, string], string][];
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
      singleWordFixture.inputs as { text: string; mergeRules: [[string, string], string][] },
    );
    for (const s of steps) {
      expect(hasNoNaNOrInfinity(s.state)).toBe(true);
    }
  });

  it("validates step structure for multi-word fixture", () => {
    const steps = run(
      multiWordFixture.inputs as { text: string; mergeRules: [[string, string], string][] },
    );
    validateStepStructure(steps);
  });

  it("multi-word: splits into individual characters including space", () => {
    const steps = run(
      multiWordFixture.inputs as { text: string; mergeRules: [[string, string], string][] },
    );
    const firstStep = steps[0]!;
    expect(firstStep.id).toBe("character-split");
    const state = firstStep.state as Record<string, unknown>;
    expect(state.tokens).toEqual(["l", "o", "w", " ", "e", "s", "t"]);
  });

  it("multi-word: final tokens preserve word boundaries via space token", () => {
    const steps = run(
      multiWordFixture.inputs as { text: string; mergeRules: [[string, string], string][] },
    );
    const lastStep = steps[steps.length - 1]!;
    const state = lastStep.state as Record<string, unknown>;
    expect(state.tokens).toEqual(["low", " ", "est"]);
    expect(state.finalTokenCount).toBe(3);
  });

  it("handles text with no matching merge rules (all rules skip)", () => {
    const steps = run({
      text: "xyz",
      mergeRules: [[["a", "b"], "ab"]],
    });
    validateStepStructure(steps);

    // First step should be character-split
    const firstStep = steps[0]!;
    expect(firstStep.id).toBe("character-split");
    const firstState = firstStep.state as Record<string, unknown>;
    expect(firstState.tokens).toEqual(["x", "y", "z"]);

    // Final tokens should remain as individual characters since no rule matches
    const lastStep = steps[steps.length - 1]!;
    const lastState = lastStep.state as Record<string, unknown>;
    expect(lastState.tokens).toEqual(["x", "y", "z"]);
    expect(lastState.finalTokenCount).toBe(3);
  });
});
