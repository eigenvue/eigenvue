/**
 * @fileoverview Bubble Sort Generator — Unit Tests
 *
 * Validates step structure, algorithmic correctness, and edge cases.
 */

import { describe, it, expect } from "vitest";
import { runGenerator } from "@/engine/generator";
import bubbleSortGenerator from "../generator";

import sortedFixture from "./sorted.fixture.json";
import reversedFixture from "./reversed.fixture.json";
import singleFixture from "./single-element.fixture.json";

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

  // Only the last step is terminal.
  const terminalSteps = steps.filter((s) => s.isTerminal);
  expect(terminalSteps.length).toBe(1);

  // All steps have required fields.
  for (const s of steps) {
    expect(typeof s.id).toBe("string");
    expect(typeof s.title).toBe("string");
    expect(typeof s.explanation).toBe("string");
    expect(Array.isArray(s.visualActions)).toBe(true);
  }
}

describe("Bubble Sort Generator", () => {
  it("sorts a typical unsorted array correctly", () => {
    const steps = run({ array: [64, 34, 25, 12, 22, 11, 90] });
    validateStepStructure(steps);

    const finalState = steps[steps.length - 1]!.state;
    const sorted = [11, 12, 22, 25, 34, 64, 90];
    expect(finalState.array).toEqual(sorted);
  });

  it("early-terminates on already-sorted array", () => {
    const steps = run({ array: sortedFixture.inputs.array });
    validateStepStructure(steps);

    const lastStep = steps[steps.length - 1]!;
    expect(lastStep.id).toBe(sortedFixture.expected.terminalStepId);
    expect(lastStep.state.array).toEqual(sortedFixture.expected.sortedArray);
  });

  it("handles reverse-sorted array (worst case)", () => {
    const steps = run({ array: reversedFixture.inputs.array });
    validateStepStructure(steps);

    const lastStep = steps[steps.length - 1]!;
    expect(lastStep.id).toBe(reversedFixture.expected.terminalStepId);
    expect(lastStep.state.array).toEqual(reversedFixture.expected.sortedArray);
  });

  it("handles single-element array", () => {
    const steps = run({ array: singleFixture.inputs.array });
    validateStepStructure(steps);
    expect(steps.length).toBe(singleFixture.expected.stepCount);
    expect(steps[0]!.id).toBe(singleFixture.expected.terminalStepId);
    expect(steps[0]!.isTerminal).toBe(true);
  });

  it("handles empty array", () => {
    const steps = run({ array: [] });
    validateStepStructure(steps);
    expect(steps.length).toBe(1);
    expect(steps[0]!.isTerminal).toBe(true);
  });

  it("preserves array length across all steps", () => {
    const input = [38, 27, 43, 3, 9, 82, 10];
    const steps = run({ array: input });

    for (const s of steps) {
      if (s.state.array) {
        expect((s.state.array as number[]).length).toBe(input.length);
      }
    }
  });

  it("is stable: equal elements maintain relative order", () => {
    const steps = run({ array: [3, 1, 3, 2] });
    const finalArray = steps[steps.length - 1]!.state.array;
    expect(finalArray).toEqual([1, 2, 3, 3]);
  });

  it("step states are independent snapshots", () => {
    const steps = run({ array: [5, 3, 1] });
    // Mutating step 0 should not affect step 1
    const step0Array = steps[0]!.state.array as number[];
    step0Array[0] = 9999;
    const step1Array = steps[1]!.state.array as number[];
    expect(step1Array[0]).not.toBe(9999);
  });

  it("handles duplicates correctly", () => {
    const steps = run({ array: [5, 3, 8, 3, 2, 5, 1] });
    validateStepStructure(steps);
    const finalArray = steps[steps.length - 1]!.state.array as number[];
    expect(finalArray).toEqual([1, 2, 3, 3, 5, 5, 8]);
  });
});
