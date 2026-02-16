/**
 * @fileoverview DFS Generator — Unit Tests
 */

import { describe, it, expect } from "vitest";
import { runGenerator } from "@/engine/generator";
import dfsGenerator from "../generator";

import simpleFixture from "./simple-graph.fixture.json";
import cycleFixture from "./cycle.fixture.json";
import linearFixture from "./linear-chain.fixture.json";

function run(inputs: Record<string, unknown>) {
  return runGenerator(dfsGenerator, inputs).steps;
}

function validateStepStructure(steps: readonly any[]) {
  expect(steps.length).toBeGreaterThan(0);
  steps.forEach((s, i) => expect(s.index).toBe(i));
  expect(steps[steps.length - 1].isTerminal).toBe(true);
  expect(steps.filter((s) => s.isTerminal).length).toBe(1);
}

describe("DFS Generator", () => {
  it("finds target in simple graph", () => {
    const steps = run(simpleFixture.inputs);
    validateStepStructure(steps);
    expect(steps[steps.length - 1].id).toBe(simpleFixture.expected.terminalStepId);
    const path = steps[steps.length - 1].state.path as string[];
    expect(path[0]).toBe("A");
    expect(path[path.length - 1]).toBe("F");
  });

  it("handles cycles without infinite loop", () => {
    const steps = run(cycleFixture.inputs);
    validateStepStructure(steps);
    expect(steps[steps.length - 1].id).toBe(cycleFixture.expected.terminalStepId);
    const visited = steps[steps.length - 1].state.visited as string[];
    expect(visited.length).toBe(cycleFixture.expected.visitedCount);
  });

  it("finds target in linear chain", () => {
    const steps = run(linearFixture.inputs);
    validateStepStructure(steps);
    expect(steps[steps.length - 1].id).toBe(linearFixture.expected.terminalStepId);
    const path = steps[steps.length - 1].state.path as string[];
    expect(path[0]).toBe("A");
    expect(path[path.length - 1]).toBe("D");
  });

  it("reports unreachable target", () => {
    const steps = run({
      adjacencyList: { A: ["B"], B: ["A"], C: [] },
      positions: { A: { x: 0.2, y: 0.5 }, B: { x: 0.5, y: 0.5 }, C: { x: 0.8, y: 0.5 } },
      startNode: "A",
      targetNode: "C",
    });
    validateStepStructure(steps);
    expect(steps[steps.length - 1].id).toBe("target_not_found");
  });

  it("explores all reachable nodes without target", () => {
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

  it("single-node graph", () => {
    const steps = run({
      adjacencyList: { A: [] },
      positions: { A: { x: 0.5, y: 0.5 } },
      startNode: "A",
    });
    validateStepStructure(steps);
    expect(steps[steps.length - 1].id).toBe("exploration_complete");
  });
});
