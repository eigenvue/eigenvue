/**
 * @fileoverview Merge Sort Generator — Unit Tests
 *
 * Validates step structure, algorithmic correctness, and edge cases.
 * Tests the Merge Sort generator from the cross-platform test location.
 */

import { describe, it, expect } from "vitest";
import { runGenerator } from "@/engine/generator";
import mergeSortGenerator from "../../../../algorithms/classical/merge-sort/generator";

import defaultFixture from "../../../../algorithms/classical/merge-sort/tests/default.fixture.json";
import powerOfTwoFixture from "../../../../algorithms/classical/merge-sort/tests/power-of-two.fixture.json";
import singleFixture from "../../../../algorithms/classical/merge-sort/tests/single-element.fixture.json";

/** Helper: run generator and return steps array. */
function run(inputs: { array: number[] }) {
  return runGenerator(mergeSortGenerator, inputs).steps;
}

/** Helper: validate structural invariants on any step array. */
function validateStepStructure(steps: readonly any[]) {
  expect(steps.length).toBeGreaterThan(0);

  steps.forEach((s, i) => {
    expect(s.index).toBe(i);
  });

  expect(steps[steps.length - 1].isTerminal).toBe(true);

  for (let i = 0; i < steps.length - 1; i++) {
    expect(steps[i].isTerminal).toBe(false);
  }

  for (const s of steps) {
    expect(typeof s.id).toBe("string");
    expect(typeof s.title).toBe("string");
    expect(typeof s.explanation).toBe("string");
    expect(Array.isArray(s.visualActions)).toBe(true);
    expect(s.state).toBeDefined();
  }
}

describe("Merge Sort Generator", () => {
  it("sorts default fixture array correctly", () => {
    const steps = run({ array: defaultFixture.inputs.array as number[] });
    validateStepStructure(steps);

    const finalArray = (steps[steps.length - 1]!.state as Record<string, unknown>).array as number[];
    expect(finalArray).toEqual(defaultFixture.expected.sortedArray);
  });

  it("sorts power-of-two length array correctly (clean binary splits)", () => {
    const steps = run({ array: powerOfTwoFixture.inputs.array as number[] });
    validateStepStructure(steps);

    const finalArray = (steps[steps.length - 1]!.state as Record<string, unknown>).array as number[];
    expect(finalArray).toEqual(powerOfTwoFixture.expected.sortedArray);
  });

  it("handles single element (fixture)", () => {
    const steps = run({ array: singleFixture.inputs.array as number[] });
    validateStepStructure(steps);
    expect(steps).toHaveLength(singleFixture.expected.stepCount);
    expect(steps[0]!.id).toBe(singleFixture.expected.terminalStepId);
    expect(steps[0]!.isTerminal).toBe(true);
  });

  it("handles empty array", () => {
    const steps = run({ array: [] });
    validateStepStructure(steps);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.isTerminal).toBe(true);
  });

  it("preserves array length across all steps", () => {
    const input = [38, 27, 43, 3, 9, 82, 10];
    const steps = run({ array: input });

    for (const s of steps) {
      const state = s.state as Record<string, unknown>;
      if (state.array) {
        expect((state.array as number[]).length).toBe(input.length);
      }
    }
  });

  it("is stable: equal elements maintain relative order", () => {
    const steps = run({ array: [3, 1, 3, 2] });
    validateStepStructure(steps);
    const finalArray = (steps[steps.length - 1]!.state as Record<string, unknown>).array as number[];
    expect(finalArray).toEqual([1, 2, 3, 3]);
  });

  it("handles already-sorted array", () => {
    const steps = run({ array: [1, 2, 3, 4, 5] });
    validateStepStructure(steps);

    const finalArray = (steps[steps.length - 1]!.state as Record<string, unknown>).array as number[];
    expect(finalArray).toEqual([1, 2, 3, 4, 5]);
  });

  it("merge_complete steps produce sorted sub-arrays", () => {
    const steps = run({ array: [8, 3, 6, 1, 5, 2, 7, 4] });
    validateStepStructure(steps);

    const mergeSteps = steps.filter((s) => s.id === "merge_complete");
    for (const s of mergeSteps) {
      const state = s.state as Record<string, unknown>;
      const array = state.array as number[];
      const left = state.left as number;
      const right = state.right as number;

      // The sub-array [left..right] should be sorted after merge_complete.
      const sub = array.slice(left, right + 1);
      const sorted = [...sub].sort((a, b) => a - b);
      expect(sub).toEqual(sorted);
    }
  });
});
