/**
 * @fileoverview DFS Generator — Unit Tests
 *
 * Validates step structure, algorithmic correctness, and edge cases.
 * Tests the DFS generator from the cross-platform test location.
 */

import { describe, it, expect } from "vitest";
import { runGenerator } from "@/engine/generator";
import dfsGenerator from "../../../../algorithms/classical/dfs/generator";

import simpleGraphFixture from "../../../../algorithms/classical/dfs/tests/simple-graph.fixture.json";
import cycleFixture from "../../../../algorithms/classical/dfs/tests/cycle.fixture.json";
import linearChainFixture from "../../../../algorithms/classical/dfs/tests/linear-chain.fixture.json";

/** Helper: run generator and return steps array. */
function run(inputs: Record<string, unknown>) {
  return runGenerator(dfsGenerator, inputs).steps;
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

describe("DFS Generator", () => {
  it("finds target in simple graph (fixture)", () => {
    const steps = run(simpleGraphFixture.inputs as Record<string, unknown>);
    validateStepStructure(steps);

    const lastStep = steps[steps.length - 1]!;
    expect(lastStep.id).toBe(simpleGraphFixture.expected.terminalStepId);

    // Path should start at startNode and end at targetNode.
    const state = lastStep.state as Record<string, unknown>;
    const path = state.path as string[];
    expect(path[0]).toBe(simpleGraphFixture.inputs.startNode);
    expect(path[path.length - 1]).toBe(simpleGraphFixture.inputs.targetNode);
  });

  it("handles cycles without infinite loop (fixture)", () => {
    const steps = run(cycleFixture.inputs as Record<string, unknown>);
    validateStepStructure(steps);

    const lastStep = steps[steps.length - 1]!;
    expect(lastStep.id).toBe(cycleFixture.expected.terminalStepId);

    // All nodes in the cycle should be visited.
    const state = lastStep.state as Record<string, unknown>;
    const visited = state.visited as string[];
    expect(visited).toHaveLength(cycleFixture.expected.visitedCount);
  });

  it("finds target in linear chain (fixture)", () => {
    const steps = run(linearChainFixture.inputs as Record<string, unknown>);
    validateStepStructure(steps);

    const lastStep = steps[steps.length - 1]!;
    expect(lastStep.id).toBe(linearChainFixture.expected.terminalStepId);
  });

  it("reports unreachable target in disconnected graph", () => {
    const steps = run({
      adjacencyList: {
        A: ["B"],
        B: ["A"],
        C: [],
      },
      positions: {
        A: { x: 0.2, y: 0.5 },
        B: { x: 0.5, y: 0.5 },
        C: { x: 0.8, y: 0.5 },
      },
      startNode: "A",
      targetNode: "C",
    });
    validateStepStructure(steps);

    const lastStep = steps[steps.length - 1]!;
    expect(lastStep.id).toBe("target_not_found");
  });

  it("explores all reachable nodes without target", () => {
    const steps = run({
      adjacencyList: {
        A: ["B", "C"],
        B: ["A"],
        C: ["A"],
      },
      positions: {
        A: { x: 0.5, y: 0.2 },
        B: { x: 0.2, y: 0.8 },
        C: { x: 0.8, y: 0.8 },
      },
      startNode: "A",
    });
    validateStepStructure(steps);

    const lastStep = steps[steps.length - 1]!;
    expect(lastStep.id).toBe("exploration_complete");

    const state = lastStep.state as Record<string, unknown>;
    const visited = state.visited as string[];
    expect(visited).toHaveLength(3);
    expect(visited).toContain("A");
    expect(visited).toContain("B");
    expect(visited).toContain("C");
  });

  it("single-node graph terminates correctly", () => {
    const steps = run({
      adjacencyList: { A: [] },
      positions: { A: { x: 0.5, y: 0.5 } },
      startNode: "A",
    });
    validateStepStructure(steps);

    const lastStep = steps[steps.length - 1]!;
    expect(lastStep.id).toBe("exploration_complete");

    const state = lastStep.state as Record<string, unknown>;
    const visited = state.visited as string[];
    expect(visited).toHaveLength(1);
    expect(visited).toContain("A");
  });
});
