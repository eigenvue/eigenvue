/**
 * @fileoverview Heap Sort Generator — Unit Tests
 *
 * Four test groups mirror the master spec:
 *   1. Fixture tests       — every fixture's step IDs, count, and key states.
 *   2. Format compliance   — index contiguity, single terminal, id pattern, etc.
 *   3. State immutability  — array snapshots are independent across steps.
 *   4. Edge cases          — single element, all duplicates, reverse-sorted.
 */

import { describe, it, expect } from "vitest";
import { runGenerator } from "@/engine/generator";
import type { VisualAction } from "@/engine/generator";
import heapSortGenerator from "../generator";

import randomFixture from "./random.fixture.json";
import reverseSortedFixture from "./reverse-sorted.fixture.json";
import duplicatesFixture from "./duplicates.fixture.json";
import nearlySortedFixture from "./nearly-sorted.fixture.json";
import singleElementFixture from "./single-element.fixture.json";

interface FixtureKeyState {
  stepIndex: number;
  field: string;
  value: unknown;
}

interface Fixture {
  description: string;
  inputs: { array: number[] };
  expected: {
    stepCount: number;
    terminalStepId: string;
    sortedArray: number[];
    stepIds: string[];
    keyStates: FixtureKeyState[];
  };
}

function assertFixture(fixture: Fixture): void {
  const { steps } = runGenerator(heapSortGenerator, fixture.inputs);

  // 1. Step count.
  expect(steps.length, "step count").toBe(fixture.expected.stepCount);

  // 2. Terminal step ID.
  const terminal = steps[steps.length - 1]!;
  expect(terminal.id, "terminal step id").toBe(fixture.expected.terminalStepId);
  expect(terminal.isTerminal, "terminal step is terminal").toBe(true);

  // 3. Final array == sortedArray.
  expect(terminal.state.array, "final array").toEqual(fixture.expected.sortedArray);

  // 4. Step ID sequence.
  const actualIds = steps.map((s) => s.id);
  expect(actualIds, "step id sequence").toEqual(fixture.expected.stepIds);

  // 5. Key state values.
  for (const ks of fixture.expected.keyStates) {
    expect(
      ks.stepIndex,
      `keyState references step ${ks.stepIndex} but only ${steps.length} steps exist`,
    ).toBeLessThan(steps.length);
    const stepState = steps[ks.stepIndex]!.state as Record<string, unknown>;
    expect(
      stepState[ks.field],
      `keyStates[stepIndex=${ks.stepIndex}, field=${ks.field}]`,
    ).toEqual(ks.value);
  }
}

// ── 1. Fixture tests ─────────────────────────────────────────────────────────

describe("Heap Sort Generator — Fixture Tests", () => {
  it("sorts the canonical [3,1,4,1,5,9,2,6] input correctly", () => {
    assertFixture(randomFixture as Fixture);
  });

  it("sorts a reverse-sorted input (input was already a max-heap)", () => {
    assertFixture(reverseSortedFixture as Fixture);
  });

  it("handles all-duplicate input without infinite looping", () => {
    assertFixture(duplicatesFixture as Fixture);
  });

  it("does not benefit from a nearly-sorted input (still full O(n log n))", () => {
    assertFixture(nearlySortedFixture as Fixture);
  });

  it("handles single-element input with exactly one terminal step", () => {
    assertFixture(singleElementFixture as Fixture);
  });
});

// ── 2. Format compliance tests ───────────────────────────────────────────────

describe("Heap Sort Generator — Format Compliance", () => {
  const result = runGenerator(heapSortGenerator, { array: [3, 1, 4, 1, 5, 9, 2, 6] });

  it("emits the expected algorithm id and generator origin", () => {
    expect(result.formatVersion).toBe(1);
    expect(result.algorithmId).toBe("heap-sort");
    expect(result.generatedBy).toBe("typescript");
    expect(result.steps.length).toBeGreaterThan(0);
  });

  it("step indices are contiguous and 0-based", () => {
    result.steps.forEach((s, i) => {
      expect(s.index).toBe(i);
    });
  });

  it("exactly one step is terminal and it is the last one", () => {
    const terminalSteps = result.steps.filter((s) => s.isTerminal);
    expect(terminalSteps.length).toBe(1);
    expect(terminalSteps[0]!.index).toBe(result.steps.length - 1);
  });

  it("every step id matches the URL-safe pattern", () => {
    const pattern = /^[a-z0-9][a-z0-9_-]*$/;
    for (const s of result.steps) {
      expect(s.id).toMatch(pattern);
    }
  });

  it("codeHighlight lines are 1-indexed positive integers", () => {
    for (const s of result.steps) {
      for (const line of s.codeHighlight.lines) {
        expect(Number.isInteger(line)).toBe(true);
        expect(line).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("every visual action is well-formed (dimRange has from <= to)", () => {
    for (const s of result.steps) {
      for (const action of s.visualActions) {
        if (action.type === "dimRange" || action.type === "highlightRange") {
          const a = action as VisualAction & { from: number; to: number };
          expect(a.from, `${action.type} on step ${s.index}`).toBeLessThanOrEqual(a.to);
        }
      }
    }
  });

  it("state shape is consistent across every step", () => {
    const expectedKeys = new Set([
      "array",
      "heapSize",
      "phase",
      "sortedSuffix",
      "node",
      "left",
      "right",
      "largest",
    ]);
    for (const s of result.steps) {
      const actualKeys = new Set(Object.keys(s.state as Record<string, unknown>));
      expect(actualKeys, `state keys at step ${s.index}`).toEqual(expectedKeys);
    }
  });
});

// ── 3. State immutability tests ──────────────────────────────────────────────

describe("Heap Sort Generator — State Immutability", () => {
  it("each step's array snapshot is a fresh copy", () => {
    const { steps } = runGenerator(heapSortGenerator, { array: [5, 3, 1, 4, 2] });
    for (let i = 0; i < steps.length - 1; i++) {
      const a = steps[i]!.state.array as number[];
      const b = steps[i + 1]!.state.array as number[];
      expect(a, `steps[${i}].state.array vs steps[${i + 1}].state.array`).not.toBe(b);
    }
  });

  it("mutating a step's array does not bleed into other steps", () => {
    const { steps } = runGenerator(heapSortGenerator, { array: [4, 2, 1, 3] });
    const arr0 = steps[0]!.state.array as number[];
    const originalValue = arr0[0];
    arr0[0] = 99999;
    const arr1 = steps[1]!.state.array as number[];
    expect(arr1[0]).toBe(originalValue);
  });

  it("sortedSuffix arrays are independent across steps", () => {
    const { steps } = runGenerator(heapSortGenerator, { array: [4, 2, 1, 3] });
    // After the final extract, sortedSuffix should grow. Two different steps' arrays
    // should never share the same reference.
    const a = steps[0]!.state.sortedSuffix as number[];
    const b = steps[steps.length - 1]!.state.sortedSuffix as number[];
    expect(a).not.toBe(b);
  });
});

// ── 4. Edge case tests ───────────────────────────────────────────────────────

describe("Heap Sort Generator — Edge Cases", () => {
  it("two-element array sorts correctly with minimal steps", () => {
    const { steps } = runGenerator(heapSortGenerator, { array: [2, 1] });
    expect((steps[steps.length - 1]!.state.array as number[])).toEqual([1, 2]);
    expect(steps[steps.length - 1]!.isTerminal).toBe(true);
  });

  it("array with negatives sorts correctly", () => {
    const { steps } = runGenerator(heapSortGenerator, { array: [3, -1, 0, -5, 2] });
    expect((steps[steps.length - 1]!.state.array as number[])).toEqual([-5, -1, 0, 2, 3]);
  });

  it("array length is preserved at every step", () => {
    const input = [7, 2, 5, 9, 1, 6, 3, 8, 4];
    const { steps } = runGenerator(heapSortGenerator, { array: input });
    for (const s of steps) {
      expect((s.state.array as number[]).length).toBe(input.length);
    }
  });

  it("phase progresses build → extract → done across the sequence", () => {
    const { steps } = runGenerator(heapSortGenerator, { array: [3, 1, 4, 1, 5, 9, 2, 6] });
    const phases = steps.map((s) => s.state.phase as string);

    // The first step is "build".
    expect(phases[0]).toBe("build");
    // The terminal step is "done".
    expect(phases[phases.length - 1]).toBe("done");
    // Somewhere in the middle, phase transitions to "extract".
    const firstExtract = phases.indexOf("extract");
    expect(firstExtract).toBeGreaterThan(0);
    // And it does not flip back to "build" after that.
    for (let i = firstExtract; i < phases.length - 1; i++) {
      expect(phases[i]).toBe("extract");
    }
  });
});
