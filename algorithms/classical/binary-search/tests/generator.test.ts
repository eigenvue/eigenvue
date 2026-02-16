/**
 * @fileoverview Binary Search Generator — Unit Tests
 *
 * Tests the binary search generator against golden fixtures and additional
 * edge cases. Every fixture test verifies:
 * 1. Correct step count
 * 2. Correct terminal step ID
 * 3. Correct result value
 * 4. Correct step ID sequence
 * 5. Correct state values at key steps
 *
 * TESTING PHILOSOPHY:
 * - Fixtures test correctness of the ALGORITHM (right steps, right states).
 * - Additional tests verify GENERATOR BEHAVIOR (immutability, format compliance).
 * - No test relies on floating-point comparisons — binary search is purely integer.
 */

import { describe, it, expect } from "vitest";
import { runGenerator } from "@/engine/generator";
import binarySearchGenerator from "../generator";

// Import fixture files.
import foundFixture from "./found.fixture.json";
import notFoundFixture from "./not-found.fixture.json";
import singleElementFixture from "./single-element.fixture.json";
import edgeLeftFixture from "./edge-left.fixture.json";
import edgeRightFixture from "./edge-right.fixture.json";

// ─── Helper ──────────────────────────────────────────────────────────────────

/**
 * Runs the generator with fixture inputs and validates all expected properties.
 * This helper consolidates the common assertion pattern used by all fixture tests.
 */
function assertFixture(fixture: {
  description: string;
  inputs: { array: number[]; target: number };
  expected: {
    stepCount: number;
    terminalStepId: string;
    result: number;
    stepIds: string[];
    keyStates: Array<{ stepIndex: number; field: string; value: unknown }>;
  };
}) {
  const result = runGenerator(binarySearchGenerator, fixture.inputs);
  const { steps } = result;

  // 1. Step count.
  expect(steps.length).toBe(fixture.expected.stepCount);

  // 2. Terminal step ID.
  const terminalStep = steps[steps.length - 1]!;
  expect(terminalStep.id).toBe(fixture.expected.terminalStepId);
  expect(terminalStep.isTerminal).toBe(true);

  // 3. Result value in terminal state.
  expect(terminalStep.state.result).toBe(fixture.expected.result);

  // 4. Step ID sequence.
  const actualStepIds = steps.map((s) => s.id);
  expect(actualStepIds).toEqual(fixture.expected.stepIds);

  // 5. Key state values.
  for (const check of fixture.expected.keyStates) {
    const stepState = steps[check.stepIndex]!.state;
    expect(stepState[check.field]).toEqual(check.value);
  }
}

// ─── Fixture Tests ───────────────────────────────────────────────────────────

describe("Binary Search Generator — Fixture Tests", () => {
  it("found: default example", () => {
    assertFixture(foundFixture);
  });

  it("not found: target absent from array", () => {
    assertFixture(notFoundFixture);
  });

  it("single element: target found", () => {
    assertFixture(singleElementFixture);
  });

  it("edge case: target is first element", () => {
    assertFixture(edgeLeftFixture);
  });

  it("edge case: target is last element", () => {
    assertFixture(edgeRightFixture);
  });
});

// ─── Format Compliance Tests ─────────────────────────────────────────────────

describe("Binary Search Generator — Format Compliance", () => {
  const result = runGenerator(binarySearchGenerator, {
    array: [1, 3, 5, 7, 9],
    target: 5,
  });

  it("produces a valid StepSequence", () => {
    expect(result.formatVersion).toBe(1);
    expect(result.algorithmId).toBe("binary-search");
    expect(result.generatedBy).toBe("typescript");
    expect(result.generatedAt).toBeTruthy();
    expect(result.steps.length).toBeGreaterThan(0);
  });

  it("all step indices are contiguous and 0-based", () => {
    result.steps.forEach((step, i) => {
      expect(step.index).toBe(i);
    });
  });

  it("exactly one step is terminal and it is the last", () => {
    const terminalSteps = result.steps.filter((s) => s.isTerminal);
    expect(terminalSteps.length).toBe(1);
    expect(terminalSteps[0]!.index).toBe(result.steps.length - 1);
  });

  it("all step IDs match the required pattern", () => {
    const pattern = /^[a-z0-9][a-z0-9_-]*$/;
    for (const step of result.steps) {
      expect(step.id).toMatch(pattern);
    }
  });

  it("all code highlight lines are positive integers", () => {
    for (const step of result.steps) {
      for (const line of step.codeHighlight.lines) {
        expect(Number.isInteger(line)).toBe(true);
        expect(line).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("every step has a non-empty title and explanation", () => {
    for (const step of result.steps) {
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.explanation.length).toBeGreaterThan(0);
    }
  });
});

// ─── State Immutability Tests ────────────────────────────────────────────────

describe("Binary Search Generator — State Immutability", () => {
  it("step states are independent snapshots", () => {
    const result = runGenerator(binarySearchGenerator, {
      array: [1, 3, 5, 7, 9, 11, 13],
      target: 7,
    });

    // Collect all 'array' state values.
    const arrays = result.steps.map((s) => s.state.array as number[]);

    // All arrays should be identical (algorithm doesn't modify the array).
    for (const arr of arrays) {
      expect(arr).toEqual([1, 3, 5, 7, 9, 11, 13]);
    }

    // But they should NOT be the same reference.
    for (let i = 0; i < arrays.length - 1; i++) {
      expect(arrays[i]).not.toBe(arrays[i + 1]);
    }
  });

  it("modifying a step state does not affect other steps", () => {
    const result = runGenerator(binarySearchGenerator, {
      array: [10, 20, 30],
      target: 20,
    });

    // Mutate step 0's state array (if possible).
    const step0Array = result.steps[0]!.state.array as number[];
    step0Array[0] = 9999;

    // Step 1's array should be unaffected.
    const step1Array = result.steps[1]!.state.array as number[];
    expect(step1Array[0]).toBe(10);
  });
});

// ─── Edge Case Tests ─────────────────────────────────────────────────────────

describe("Binary Search Generator — Edge Cases", () => {
  it("single element, target not found", () => {
    const result = runGenerator(binarySearchGenerator, {
      array: [42],
      target: 99,
    });
    const terminal = result.steps[result.steps.length - 1]!;
    expect(terminal.id).toBe("not_found");
    expect(terminal.state.result).toBe(-1);
  });

  it("two elements, target is first", () => {
    const result = runGenerator(binarySearchGenerator, {
      array: [10, 20],
      target: 10,
    });
    const terminal = result.steps[result.steps.length - 1]!;
    expect(terminal.id).toBe("found");
    expect(terminal.state.result).toBe(0);
  });

  it("two elements, target is second", () => {
    const result = runGenerator(binarySearchGenerator, {
      array: [10, 20],
      target: 20,
    });
    const terminal = result.steps[result.steps.length - 1]!;
    expect(terminal.id).toBe("found");
    expect(terminal.state.result).toBe(1);
  });

  it("negative numbers in array", () => {
    const result = runGenerator(binarySearchGenerator, {
      array: [-10, -5, 0, 5, 10],
      target: -5,
    });
    const terminal = result.steps[result.steps.length - 1]!;
    expect(terminal.id).toBe("found");
    expect(terminal.state.result).toBe(1);
  });

  it("all same elements, target found", () => {
    const result = runGenerator(binarySearchGenerator, {
      array: [7, 7, 7, 7, 7],
      target: 7,
    });
    const terminal = result.steps[result.steps.length - 1]!;
    expect(terminal.id).toBe("found");
    // Any index is valid since all elements are 7.
    const resultIdx = terminal.state.result as number;
    expect(resultIdx).toBeGreaterThanOrEqual(0);
    expect(resultIdx).toBeLessThan(5);
  });

  it("maximum iteration count is bounded by log2(n)", () => {
    // 16-element array: max iterations = ceil(log2(16)) = 4
    const result = runGenerator(binarySearchGenerator, {
      array: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
      target: 999, // Not found — forces maximum iterations.
    });

    // Count calculate_mid steps = number of iterations.
    const iterations = result.steps.filter((s) => s.id === "calculate_mid").length;
    expect(iterations).toBeLessThanOrEqual(5); // ceil(log2(16)) + 1 as safety margin
  });
});
