/**
 * @fileoverview QuickSort Generator — Unit Tests
 *
 * Validates step structure, algorithmic correctness, and edge cases.
 * Tests the QuickSort generator from the cross-platform test location.
 */

import { describe, it, expect } from "vitest";
import { runGenerator } from "@/engine/generator";
import quickSortGenerator from "../../../../algorithms/classical/quicksort/generator";

import defaultFixture from "../../../../algorithms/classical/quicksort/tests/default.fixture.json";
import alreadySortedFixture from "../../../../algorithms/classical/quicksort/tests/already-sorted.fixture.json";
import duplicatesFixture from "../../../../algorithms/classical/quicksort/tests/duplicates.fixture.json";

/** Helper: run generator and return steps array. */
function run(inputs: { array: number[] }) {
  return runGenerator(quickSortGenerator, inputs).steps;
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

describe("QuickSort Generator", () => {
  it("sorts default fixture array correctly", () => {
    const steps = run({ array: defaultFixture.inputs.array as number[] });
    validateStepStructure(steps);

    const finalArray = (steps[steps.length - 1]!.state as Record<string, unknown>).array as number[];
    expect(finalArray).toEqual(defaultFixture.expected.sortedArray);
  });

  it("handles already-sorted array (Lomuto worst case)", () => {
    const steps = run({ array: alreadySortedFixture.inputs.array as number[] });
    validateStepStructure(steps);

    const finalArray = (steps[steps.length - 1]!.state as Record<string, unknown>).array as number[];
    expect(finalArray).toEqual(alreadySortedFixture.expected.sortedArray);
  });

  it("handles duplicates correctly", () => {
    const steps = run({ array: duplicatesFixture.inputs.array as number[] });
    validateStepStructure(steps);

    const finalArray = (steps[steps.length - 1]!.state as Record<string, unknown>).array as number[];
    expect(finalArray).toEqual(duplicatesFixture.expected.sortedArray);
  });

  it("handles single-element array", () => {
    const steps = run({ array: [42] });
    validateStepStructure(steps);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.id).toBe("already_sorted");
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

  it("every pivot_placed step marks a permanently sorted index", () => {
    const steps = run({ array: [38, 27, 43, 3, 9, 82, 10] });

    const pivotSteps = steps.filter((s) => s.id === "pivot_placed");
    expect(pivotSteps.length).toBeGreaterThan(0);

    for (const s of pivotSteps) {
      const state = s.state as Record<string, unknown>;
      const pivotIdx = state.pivotIdx as number;
      const sorted = state.sorted as number[];
      expect(sorted).toContain(pivotIdx);
    }
  });
});
