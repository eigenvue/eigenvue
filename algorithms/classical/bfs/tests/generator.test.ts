/**
 * @fileoverview BFS Generator — Unit Tests
 */

import { describe, it, expect } from "vitest";
import { runGenerator } from "@/engine/generator";
import bfsGenerator from "../generator";

import simpleFixture from "./simple-graph.fixture.json";
import disconnectedFixture from "./disconnected.fixture.json";
import singleFixture from "./single-node.fixture.json";

function run(inputs: Record<string, unknown>) {
  return runGenerator(bfsGenerator, inputs).steps;
}

function validateStepStructure(steps: readonly any[]) {
  expect(steps.length).toBeGreaterThan(0);
  steps.forEach((s, i) => expect(s.index).toBe(i));
  expect(steps[steps.length - 1].isTerminal).toBe(true);
  expect(steps.filter((s) => s.isTerminal).length).toBe(1);
}

describe("BFS Generator", () => {
  it("finds shortest path in simple graph", () => {
    const steps = run(simpleFixture.inputs);
    validateStepStructure(steps);
    const lastStep = steps[steps.length - 1];
    expect(lastStep.id).toBe(simpleFixture.expected.terminalStepId);
    // Path should be 2 edges (shortest from A to F).
    const path = lastStep.state.path as string[];
    expect(path.length - 1).toBe(simpleFixture.expected.pathLength);
    expect(path[0]).toBe("A");
    expect(path[path.length - 1]).toBe("F");
  });

  it("reports target not found in disconnected graph", () => {
    const steps = run(disconnectedFixture.inputs);
    validateStepStructure(steps);
    expect(steps[steps.length - 1].id).toBe(disconnectedFixture.expected.terminalStepId);
  });

  it("handles single-node graph", () => {
    const steps = run(singleFixture.inputs);
    validateStepStructure(steps);
    expect(steps[steps.length - 1].id).toBe(singleFixture.expected.terminalStepId);
  });

  it("visits all reachable nodes when no target", () => {
    const steps = run({
      adjacencyList: { A: ["B", "C"], B: ["A"], C: ["A"] },
      positions: { A: { x: 0.3, y: 0.5 }, B: { x: 0.6, y: 0.2 }, C: { x: 0.6, y: 0.8 } },
      startNode: "A",
    });
    validateStepStructure(steps);
    expect(steps[steps.length - 1].id).toBe("exploration_complete");
    const visited = steps[steps.length - 1].state.visited as string[];
    expect(visited).toContain("A");
    expect(visited).toContain("B");
    expect(visited).toContain("C");
  });

  it("BFS finds shortest path (not just any path)", () => {
    // Graph: A-B-C-D and A-D (shortcut). BFS from A to D should find A→D (length 1 or via shortcut).
    const steps = run({
      adjacencyList: { A: ["B", "D"], B: ["A", "C"], C: ["B", "D"], D: ["A", "C"] },
      positions: { A: { x: 0.1, y: 0.5 }, B: { x: 0.4, y: 0.2 }, C: { x: 0.7, y: 0.2 }, D: { x: 0.9, y: 0.5 } },
      startNode: "A",
      targetNode: "D",
    });
    validateStepStructure(steps);
    const path = steps[steps.length - 1].state.path as string[];
    // Shortest path A→D is direct (1 edge).
    expect(path.length - 1).toBe(1);
  });
});
