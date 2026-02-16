/**
 * @fileoverview Dijkstra's Algorithm Generator — Unit Tests
 *
 * Validates step structure, algorithmic correctness, and edge cases.
 * Tests the Dijkstra generator from the cross-platform test location.
 *
 * CRITICAL INVARIANT: Distances are non-decreasing when nodes are finalized.
 */

import { describe, it, expect } from "vitest";
import { runGenerator } from "@/engine/generator";
import dijkstraGenerator from "../../../../algorithms/classical/dijkstra/generator";

import simpleWeightedFixture from "../../../../algorithms/classical/dijkstra/tests/simple-weighted.fixture.json";
import unreachableFixture from "../../../../algorithms/classical/dijkstra/tests/unreachable.fixture.json";
import singleNodeFixture from "../../../../algorithms/classical/dijkstra/tests/single-node.fixture.json";

/** Helper: run generator and return steps array. */
function run(inputs: Record<string, unknown>) {
  return runGenerator(dijkstraGenerator, inputs).steps;
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

describe("Dijkstra's Algorithm Generator", () => {
  it("finds shortest path with correct cost (fixture)", () => {
    const steps = run(simpleWeightedFixture.inputs as Record<string, unknown>);
    validateStepStructure(steps);

    const lastStep = steps[steps.length - 1]!;
    expect(lastStep.id).toBe(simpleWeightedFixture.expected.terminalStepId);

    const state = lastStep.state as Record<string, unknown>;
    const path = state.path as string[];
    expect(path).toEqual(simpleWeightedFixture.expected.path);
  });

  it("handles unreachable target (fixture)", () => {
    const steps = run(unreachableFixture.inputs as Record<string, unknown>);
    validateStepStructure(steps);

    const lastStep = steps[steps.length - 1]!;
    expect(lastStep.id).toBe(unreachableFixture.expected.terminalStepId);
  });

  it("handles single-node graph (fixture)", () => {
    const steps = run(singleNodeFixture.inputs as Record<string, unknown>);
    validateStepStructure(steps);

    const lastStep = steps[steps.length - 1]!;
    expect(lastStep.id).toBe(singleNodeFixture.expected.terminalStepId);

    const state = lastStep.state as Record<string, unknown>;
    const distances = state.distances as Record<string, number | string>;
    expect(distances).toBeDefined();
    expect(distances["A"]).toBe(0);
  });

  it("distances are non-decreasing when nodes are finalized", () => {
    const steps = run(simpleWeightedFixture.inputs as Record<string, unknown>);

    const extractMinSteps = steps.filter((s) => s.id === "extract_min");
    expect(extractMinSteps.length).toBeGreaterThan(0);

    // Extract the distance of each finalized node from the step title.
    // Title format: 'Process "X" (dist = N)'
    const finalizedDistances: number[] = [];
    for (const s of extractMinSteps) {
      const match = s.title.match(/dist = (\d+)/);
      if (match) {
        finalizedDistances.push(parseInt(match[1]!, 10));
      }
    }

    // Dijkstra invariant: finalized distances must be non-decreasing.
    for (let i = 1; i < finalizedDistances.length; i++) {
      expect(finalizedDistances[i]!).toBeGreaterThanOrEqual(finalizedDistances[i - 1]!);
    }
  });

  it("all edge weights are non-negative in test data", () => {
    const adjList = simpleWeightedFixture.inputs.adjacencyList as Record<
      string,
      Array<{ to: string; weight: number }>
    >;

    for (const [, neighbors] of Object.entries(adjList)) {
      for (const { weight } of neighbors) {
        expect(weight).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("computes correct shortest distances without target (all nodes)", () => {
    const steps = run({
      adjacencyList: {
        A: [{ to: "B", weight: 2 }, { to: "C", weight: 5 }],
        B: [{ to: "A", weight: 2 }, { to: "C", weight: 1 }],
        C: [{ to: "A", weight: 5 }, { to: "B", weight: 1 }],
      },
      positions: {
        A: { x: 0.1, y: 0.5 },
        B: { x: 0.5, y: 0.2 },
        C: { x: 0.9, y: 0.5 },
      },
      startNode: "A",
    });
    validateStepStructure(steps);

    const lastStep = steps[steps.length - 1]!;
    expect(lastStep.id).toBe("complete");

    const state = lastStep.state as Record<string, unknown>;
    const distances = state.distances as Record<string, number | string>;
    // Shortest: A=0, B=2 (A→B), C=3 (A→B→C)
    expect(distances["A"]).toBe(0);
    expect(distances["B"]).toBe(2);
    expect(distances["C"]).toBe(3);
  });
});
