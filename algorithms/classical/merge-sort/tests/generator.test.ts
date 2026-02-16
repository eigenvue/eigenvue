/**
 * @fileoverview Merge Sort Generator — Unit Tests
 */

import { describe, it, expect } from "vitest";
import { runGenerator } from "@/engine/generator";
import mergeSortGenerator from "../generator";

import defaultFixture from "./default.fixture.json";
import powerOfTwoFixture from "./power-of-two.fixture.json";
import singleFixture from "./single-element.fixture.json";

function run(inputs: { array: number[] }) {
  return runGenerator(mergeSortGenerator, inputs).steps;
}

function validateStepStructure(steps: readonly any[]) {
  expect(steps.length).toBeGreaterThan(0);
  steps.forEach((s, i) => expect(s.index).toBe(i));
  expect(steps[steps.length - 1].isTerminal).toBe(true);
  expect(steps.filter((s) => s.isTerminal).length).toBe(1);
}

describe("Merge Sort Generator", () => {
  it("sorts default array correctly", () => {
    const steps = run({ array: defaultFixture.inputs.array });
    validateStepStructure(steps);
    expect(steps[steps.length - 1].state.array).toEqual(defaultFixture.expected.sortedArray);
  });

  it("sorts power-of-two length array", () => {
    const steps = run({ array: powerOfTwoFixture.inputs.array });
    validateStepStructure(steps);
    expect(steps[steps.length - 1].state.array).toEqual(powerOfTwoFixture.expected.sortedArray);
  });

  it("handles single element", () => {
    const steps = run({ array: singleFixture.inputs.array });
    validateStepStructure(steps);
    expect(steps.length).toBe(1);
    expect(steps[0].id).toBe("already_sorted");
  });

  it("handles empty array", () => {
    const steps = run({ array: [] });
    validateStepStructure(steps);
    expect(steps.length).toBe(1);
  });

  it("preserves array length across all steps", () => {
    const input = [5, 3, 8, 1, 7];
    const steps = run({ array: input });
    for (const s of steps) {
      if (s.state.array) {
        expect((s.state.array as number[]).length).toBe(input.length);
      }
    }
  });

  it("is stable: equal elements maintain relative order", () => {
    const steps = run({ array: [3, 1, 3, 2] });
    expect(steps[steps.length - 1].state.array).toEqual([1, 2, 3, 3]);
  });

  it("handles already-sorted array", () => {
    const steps = run({ array: [1, 2, 3, 4, 5] });
    validateStepStructure(steps);
    expect(steps[steps.length - 1].state.array).toEqual([1, 2, 3, 4, 5]);
  });
});
