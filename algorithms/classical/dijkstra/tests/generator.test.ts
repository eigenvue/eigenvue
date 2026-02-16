/**
 * @fileoverview Dijkstra's Algorithm Generator — Unit Tests
 */

import { describe, it, expect } from "vitest";
import { runGenerator } from "@/engine/generator";
import dijkstraGenerator from "../generator";

import simpleFixture from "./simple-weighted.fixture.json";
import unreachableFixture from "./unreachable.fixture.json";
import singleFixture from "./single-node.fixture.json";

function run(inputs: Record<string, unknown>) {
  return runGenerator(dijkstraGenerator, inputs).steps;
}

function validateStepStructure(steps: readonly any[]) {
  expect(steps.length).toBeGreaterThan(0);
  steps.forEach((s, i) => expect(s.index).toBe(i));
  expect(steps[steps.length - 1].isTerminal).toBe(true);
  expect(steps.filter((s) => s.isTerminal).length).toBe(1);
}

describe("Dijkstra Generator", () => {
  it("finds shortest path with correct cost", () => {
    const steps = run(simpleFixture.inputs as Record<string, unknown>);
    validateStepStructure(steps);
    const lastStep = steps[steps.length - 1];
    expect(lastStep.id).toBe(simpleFixture.expected.terminalStepId);
    const path = lastStep.state.path as string[];
    expect(path).toEqual(simpleFixture.expected.path);
  });

  it("handles unreachable target", () => {
    const steps = run(unreachableFixture.inputs as Record<string, unknown>);
    validateStepStructure(steps);
    expect(steps[steps.length - 1].id).toBe(unreachableFixture.expected.terminalStepId);
  });

  it("handles single-node graph", () => {
    const steps = run(singleFixture.inputs as Record<string, unknown>);
    validateStepStructure(steps);
    expect(steps[steps.length - 1].id).toBe(singleFixture.expected.terminalStepId);
    const distances = steps[steps.length - 1].state.distances as Record<string, number | string>;
    expect(distances["A"]).toBe(0);
  });

  it("distances are non-decreasing when nodes are finalized", () => {
    const steps = run(simpleFixture.inputs as Record<string, unknown>);
    const extractMinSteps = steps.filter((s) => s.id === "extract_min");
    const extractedDistances: number[] = [];
    for (const s of extractMinSteps) {
      const current = s.state.current as string;
      const distances = s.state.distances as Record<string, number | string>;
      const d = distances[current];
      if (typeof d === "number") {
        extractedDistances.push(d);
      }
    }
    // Verify non-decreasing order.
    for (let i = 1; i < extractedDistances.length; i++) {
      expect(extractedDistances[i]).toBeGreaterThanOrEqual(extractedDistances[i - 1]!);
    }
  });

  it("all edge weights are non-negative in test data", () => {
    const adj = simpleFixture.inputs.adjacencyList as Record<string, Array<{ to: string; weight: number }>>;
    for (const neighbors of Object.values(adj)) {
      for (const { weight } of neighbors) {
        expect(weight).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("computes shortest path without target (all nodes)", () => {
    const steps = run({
      adjacencyList: {
        A: [{ to: "B", weight: 2 }, { to: "C", weight: 5 }],
        B: [{ to: "A", weight: 2 }, { to: "C", weight: 1 }],
        C: [{ to: "A", weight: 5 }, { to: "B", weight: 1 }],
      },
      positions: { A: { x: 0.2, y: 0.5 }, B: { x: 0.5, y: 0.2 }, C: { x: 0.8, y: 0.5 } },
      startNode: "A",
    });
    validateStepStructure(steps);
    expect(steps[steps.length - 1].id).toBe("complete");
    const distances = steps[steps.length - 1].state.distances as Record<string, number | string>;
    expect(distances["A"]).toBe(0);
    expect(distances["B"]).toBe(2);
    expect(distances["C"]).toBe(3); // A→B (2) + B→C (1) = 3
  });
});
