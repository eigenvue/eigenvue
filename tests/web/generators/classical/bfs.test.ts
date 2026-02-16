/**
 * @fileoverview BFS Generator — Unit Tests
 *
 * Validates step structure, algorithmic correctness, and edge cases.
 * Tests the BFS generator from the cross-platform test location.
 */

import { describe, it, expect } from "vitest";
import { runGenerator } from "@/engine/generator";
import bfsGenerator from "../../../../algorithms/classical/bfs/generator";

import simpleGraphFixture from "../../../../algorithms/classical/bfs/tests/simple-graph.fixture.json";
import disconnectedFixture from "../../../../algorithms/classical/bfs/tests/disconnected.fixture.json";
import singleNodeFixture from "../../../../algorithms/classical/bfs/tests/single-node.fixture.json";

/** Helper: run generator and return steps array. */
function run(inputs: Record<string, unknown>) {
  return runGenerator(bfsGenerator, inputs).steps;
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

describe("BFS Generator", () => {
  it("finds shortest path in simple graph (fixture)", () => {
    const steps = run(simpleGraphFixture.inputs as Record<string, unknown>);
    validateStepStructure(steps);

    const lastStep = steps[steps.length - 1]!;
    expect(lastStep.id).toBe(simpleGraphFixture.expected.terminalStepId);

    // Verify path exists and has correct length.
    const state = lastStep.state as Record<string, unknown>;
    const path = state.path as string[];
    expect(path).toBeDefined();
    expect(path.length - 1).toBe(simpleGraphFixture.expected.pathLength);
    // Path starts at startNode and ends at targetNode.
    expect(path[0]).toBe(simpleGraphFixture.inputs.startNode);
    expect(path[path.length - 1]).toBe(simpleGraphFixture.inputs.targetNode);
  });

  it("reports target not found in disconnected graph (fixture)", () => {
    const steps = run(disconnectedFixture.inputs as Record<string, unknown>);
    validateStepStructure(steps);

    const lastStep = steps[steps.length - 1]!;
    expect(lastStep.id).toBe(disconnectedFixture.expected.terminalStepId);
  });

  it("handles single-node graph (fixture)", () => {
    const steps = run(singleNodeFixture.inputs as Record<string, unknown>);
    validateStepStructure(steps);

    const lastStep = steps[steps.length - 1]!;
    expect(lastStep.id).toBe(singleNodeFixture.expected.terminalStepId);

    const state = lastStep.state as Record<string, unknown>;
    const visited = state.visited as string[];
    expect(visited).toHaveLength(singleNodeFixture.expected.visitedCount);
  });

  it("visits all reachable nodes when no target specified", () => {
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

  it("BFS finds shortest path (not just any path)", () => {
    // Graph: A-B, A-C, A-D, B-D, C-D. Shortest A→D is direct (1 edge).
    const steps = run({
      adjacencyList: {
        A: ["B", "C", "D"],
        B: ["A", "D"],
        C: ["A", "D"],
        D: ["A", "B", "C"],
      },
      positions: {
        A: { x: 0.1, y: 0.5 },
        B: { x: 0.4, y: 0.2 },
        C: { x: 0.4, y: 0.8 },
        D: { x: 0.9, y: 0.5 },
      },
      startNode: "A",
      targetNode: "D",
    });
    validateStepStructure(steps);

    const lastStep = steps[steps.length - 1]!;
    expect(lastStep.id).toBe("target_found");

    const state = lastStep.state as Record<string, unknown>;
    const path = state.path as string[];
    // BFS guarantees shortest path: A→D (1 edge).
    expect(path.length - 1).toBe(1);
  });
});
