/**
 * @fileoverview Bubble Sort Generator — Unit Tests
 *
 * Validates step structure, algorithmic correctness, and edge cases.
 * Tests the Bubble Sort generator from the cross-platform test location.
 */

import { describe, it, expect } from "vitest";
import { runGenerator } from "@/engine/generator";
import bubbleSortGenerator from "../../../../algorithms/classical/bubble-sort/generator";

import sortedFixture from "../../../../algorithms/classical/bubble-sort/tests/sorted.fixture.json";
import reversedFixture from "../../../../algorithms/classical/bubble-sort/tests/reversed.fixture.json";
import singleFixture from "../../../../algorithms/classical/bubble-sort/tests/single-element.fixture.json";

/** Helper: run generator and return steps array. */
function run(inputs: { array: number[] }) {
  return runGenerator(bubbleSortGenerator, inputs).steps;
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

describe("Bubble Sort Generator", () => {
  it("sorts a typical unsorted array correctly", () => {
    const steps = run({ array: [64, 34, 25, 12, 22, 11, 90] });
    validateStepStructure(steps);

    // Final array must be sorted.
    const finalState = steps[steps.length - 1]!.state as Record<string, unknown>;
    const finalArray = finalState.array as number[];
    expect(finalArray).toEqual([11, 12, 22, 25, 34, 64, 90]);
  });

  it("early-terminates on already-sorted array (fixture)", () => {
    const steps = run({ array: sortedFixture.inputs.array as number[] });
    validateStepStructure(steps);

    const lastStep = steps[steps.length - 1]!;
    expect(lastStep.id).toBe(sortedFixture.expected.terminalStepId);

    // Array unchanged.
    const finalArray = (lastStep.state as Record<string, unknown>).array as number[];
    expect(finalArray).toEqual(sortedFixture.expected.sortedArray);
  });

  it("handles reverse-sorted array — worst case (fixture)", () => {
    const steps = run({ array: reversedFixture.inputs.array as number[] });
    validateStepStructure(steps);

    const lastStep = steps[steps.length - 1]!;
    expect(lastStep.id).toBe(reversedFixture.expected.terminalStepId);
    const finalArray = (lastStep.state as Record<string, unknown>).array as number[];
    expect(finalArray).toEqual(reversedFixture.expected.sortedArray);
  });

  it("handles single-element array (fixture)", () => {
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
    const finalArray = (steps[steps.length - 1]!.state as Record<string, unknown>).array as number[];
    expect(finalArray).toEqual([1, 2, 3, 3]);
  });

  it("handles duplicates correctly", () => {
    const steps = run({ array: [5, 3, 8, 3, 2, 5, 1] });
    validateStepStructure(steps);
    const finalArray = (steps[steps.length - 1]!.state as Record<string, unknown>).array as number[];
    expect(finalArray).toEqual([1, 2, 3, 3, 5, 5, 8]);
  });

  it("step states are independent snapshots", () => {
    const steps = run({ array: [3, 1, 2] });
    expect(steps.length).toBeGreaterThan(1);

    // Mutating step 0's state should not affect step 1's state.
    const state0 = steps[0]!.state as Record<string, unknown>;
    const state1 = steps[1]!.state as Record<string, unknown>;
    const arr0Before = [...(state0.array as number[])];
    const arr1Before = [...(state1.array as number[])];

    (state0.array as number[])[0] = 999;
    expect((state1.array as number[])).toEqual(arr1Before);
    // Restore for safety.
    (state0.array as number[])[0] = arr0Before[0]!;
  });
});
