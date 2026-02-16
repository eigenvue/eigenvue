/**
 * @fileoverview QuickSort Generator — Unit Tests
 */

import { describe, it, expect } from "vitest";
import { runGenerator } from "@/engine/generator";
import quickSortGenerator from "../generator";

import defaultFixture from "./default.fixture.json";
import alreadySortedFixture from "./already-sorted.fixture.json";
import duplicatesFixture from "./duplicates.fixture.json";

function run(inputs: { array: number[] }) {
  return runGenerator(quickSortGenerator, inputs).steps;
}

function validateStepStructure(steps: readonly any[]) {
  expect(steps.length).toBeGreaterThan(0);
  steps.forEach((s, i) => expect(s.index).toBe(i));
  expect(steps[steps.length - 1].isTerminal).toBe(true);
  expect(steps.filter((s) => s.isTerminal).length).toBe(1);
  for (const s of steps) {
    expect(typeof s.id).toBe("string");
    expect(typeof s.title).toBe("string");
    expect(typeof s.explanation).toBe("string");
  }
}

describe("QuickSort Generator", () => {
  it("sorts a typical unsorted array correctly", () => {
    const steps = run({ array: defaultFixture.inputs.array });
    validateStepStructure(steps);
    expect(steps[steps.length - 1].state.array).toEqual(defaultFixture.expected.sortedArray);
  });

  it("handles already-sorted array (worst case for Lomuto)", () => {
    const steps = run({ array: alreadySortedFixture.inputs.array });
    validateStepStructure(steps);
    expect(steps[steps.length - 1].state.array).toEqual(alreadySortedFixture.expected.sortedArray);
  });

  it("handles duplicates", () => {
    const steps = run({ array: duplicatesFixture.inputs.array });
    validateStepStructure(steps);
    expect(steps[steps.length - 1].state.array).toEqual(duplicatesFixture.expected.sortedArray);
  });

  it("handles single-element array", () => {
    const steps = run({ array: [42] });
    validateStepStructure(steps);
    expect(steps.length).toBe(1);
    expect(steps[0].id).toBe("already_sorted");
  });

  it("handles empty array", () => {
    const steps = run({ array: [] });
    validateStepStructure(steps);
    expect(steps.length).toBe(1);
    expect(steps[0].isTerminal).toBe(true);
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

  it("every pivot_placed step marks a permanently sorted index", () => {
    const steps = run({ array: [38, 27, 43, 3, 9, 82, 10] });
    const pivotSteps = steps.filter((s) => s.id === "pivot_placed");
    for (const ps of pivotSteps) {
      const pivotIdx = ps.state.pivotIdx as number;
      expect(pivotIdx).toBeGreaterThanOrEqual(0);
      expect((ps.state.sorted as number[]).includes(pivotIdx)).toBe(true);
    }
  });
});
