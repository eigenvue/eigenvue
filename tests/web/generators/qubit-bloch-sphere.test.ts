/**
 * @fileoverview Qubit States & Bloch Sphere Generator — Unit Tests
 *
 * Validates step structure, Bloch sphere angles, measurement probabilities,
 * normalization, and visual actions for the qubit-bloch-sphere generator.
 */

import { describe, it, expect } from "vitest";
import { runGenerator } from "@/engine/generator";
import blochSphereGenerator from "../../../algorithms/quantum/qubit-bloch-sphere/generator";

import basisStatesFixture from "../../../algorithms/quantum/qubit-bloch-sphere/tests/basis-states.fixture.json";
import superpositionFixture from "../../../algorithms/quantum/qubit-bloch-sphere/tests/superposition.fixture.json";
import arbitraryStateFixture from "../../../algorithms/quantum/qubit-bloch-sphere/tests/arbitrary-state.fixture.json";

/** Helper: run generator and return steps array. */
function run(inputs: {
  stateSequence: ReadonlyArray<{
    label: string;
    amplitudes: readonly [number, number, number, number];
    gate?: string;
  }>;
}) {
  return runGenerator(blochSphereGenerator, inputs).steps;
}

/** Helper: validate structural invariants on any step array. */
function validateStepStructure(steps: readonly any[]) {
  expect(steps.length).toBeGreaterThan(0);

  // Indices are 0-based and contiguous.
  steps.forEach((s, i) => {
    expect(s.index).toBe(i);
  });

  // Last step is terminal.
  expect(steps[steps.length - 1].isTerminal).toBe(true);

  // No non-last step is terminal.
  for (let i = 0; i < steps.length - 1; i++) {
    expect(steps[i].isTerminal).toBe(false);
  }

  // All steps have required fields with correct types.
  for (const s of steps) {
    expect(typeof s.id).toBe("string");
    expect(typeof s.title).toBe("string");
    expect(typeof s.explanation).toBe("string");
    expect(Array.isArray(s.visualActions)).toBe(true);
    expect(s.state).toBeDefined();
  }
}

describe("Qubit Bloch Sphere Generator", () => {
  it("generates correct step count for default 6-state sequence", () => {
    // A 6-state sequence yields 1 intro + 6 state steps = 7 total steps.
    const stateSequence = [
      { label: "|0⟩", amplitudes: [1, 0, 0, 0] as const },
      { label: "|1⟩", amplitudes: [0, 0, 1, 0] as const, gate: "X" },
      { label: "|+⟩", amplitudes: [0.7071067811865476, 0, 0.7071067811865476, 0] as const, gate: "H" },
      { label: "|−⟩", amplitudes: [0.7071067811865476, 0, -0.7071067811865476, 0] as const },
      { label: "|+i⟩", amplitudes: [0.7071067811865476, 0, 0, 0.7071067811865476] as const, gate: "S" },
      { label: "|−i⟩", amplitudes: [0.7071067811865476, 0, 0, -0.7071067811865476] as const },
    ];

    const steps = run({ stateSequence });
    validateStepStructure(steps);

    // 1 introduction step + 6 state steps = 7 total.
    expect(steps).toHaveLength(7);
  });

  it("handles basis states fixture — 2 states yield 3 steps (fixture)", () => {
    const steps = run({
      stateSequence: basisStatesFixture.inputs.stateSequence as any,
    });
    validateStepStructure(steps);

    // 2 states in sequence + 1 introduction = 3 steps.
    expect(steps).toHaveLength(basisStatesFixture.expected.stepCount);
    expect(steps[steps.length - 1].id).toBe(basisStatesFixture.expected.terminalStepId);
  });

  it("verifies Bloch angles for |0⟩ state: theta=0, phi=0", () => {
    const steps = run({
      stateSequence: basisStatesFixture.inputs.stateSequence as any,
    });

    // Step 1 (show_state_0) is |0⟩ — north pole of Bloch sphere.
    const state0 = steps[1]!.state as Record<string, unknown>;
    expect(state0.theta).toBeCloseTo(0, 10);
    expect(state0.phi).toBeCloseTo(0, 10);
    expect(state0.blochX).toBeCloseTo(0, 10);
    expect(state0.blochY).toBeCloseTo(0, 10);
    expect(state0.blochZ).toBeCloseTo(1, 10);
    expect(state0.probZero).toBeCloseTo(1.0, 10);
    expect(state0.probOne).toBeCloseTo(0.0, 10);
  });

  it("verifies Bloch angles for |1⟩ state: theta=pi, phi=0", () => {
    const steps = run({
      stateSequence: basisStatesFixture.inputs.stateSequence as any,
    });

    // Step 2 (show_state_1) is |1⟩ — south pole of Bloch sphere.
    const keyState = basisStatesFixture.expected.keyStates[1]!;
    const state1 = steps[2]!.state as Record<string, unknown>;
    expect(state1.theta).toBeCloseTo(keyState.theta, 10);
    expect(state1.phi).toBeCloseTo(keyState.phi, 10);
    expect(state1.blochZ).toBeCloseTo(keyState.blochZ, 10);
    expect(state1.probZero).toBeCloseTo(keyState.probZero, 10);
    expect(state1.probOne).toBeCloseTo(keyState.probOne, 10);
  });

  it("verifies normalization: probZero + probOne ≈ 1 for every step", () => {
    const steps = run({
      stateSequence: superpositionFixture.inputs.stateSequence as any,
    });
    validateStepStructure(steps);

    for (const s of steps) {
      const state = s.state as Record<string, unknown>;
      const probZero = state.probZero as number;
      const probOne = state.probOne as number;
      expect(probZero + probOne).toBeCloseTo(1.0, 10);
    }
  });

  it("verifies |+⟩ superposition state on equator (fixture)", () => {
    const steps = run({
      stateSequence: superpositionFixture.inputs.stateSequence as any,
    });
    validateStepStructure(steps);
    expect(steps).toHaveLength(superpositionFixture.expected.stepCount);

    // Step show_state_1 is H|0⟩ = |+⟩ on the equator.
    const keyState = superpositionFixture.expected.keyStates[0]!;
    const plusState = steps[2]!.state as Record<string, unknown>;
    expect(plusState.theta).toBeCloseTo(keyState.theta, 10);
    expect(plusState.phi).toBeCloseTo(keyState.phi, 10);
    expect(plusState.blochX).toBeCloseTo(keyState.blochX, 10);
    expect(plusState.blochZ).toBeCloseTo(keyState.blochZ, 6);
    expect(plusState.probZero).toBeCloseTo(keyState.probZero, 10);
    expect(plusState.probOne).toBeCloseTo(keyState.probOne, 10);
  });

  it("verifies arbitrary state S|+⟩ = |+i⟩ (fixture)", () => {
    const steps = run({
      stateSequence: arbitraryStateFixture.inputs.stateSequence as any,
    });
    validateStepStructure(steps);
    expect(steps).toHaveLength(arbitraryStateFixture.expected.stepCount);

    // Terminal step (show_state_2) is S|+⟩ = |+i⟩.
    const keyState = arbitraryStateFixture.expected.keyStates[0]!;
    const lastState = steps[steps.length - 1]!.state as Record<string, unknown>;
    expect(lastState.theta).toBeCloseTo(keyState.theta, 10);
    expect(lastState.phi).toBeCloseTo(keyState.phi, 10);
    expect(lastState.blochX).toBeCloseTo(keyState.blochX, 6);
    expect(lastState.blochY).toBeCloseTo(keyState.blochY, 10);
    expect(lastState.blochZ).toBeCloseTo(keyState.blochZ, 6);
    expect(lastState.probZero).toBeCloseTo(keyState.probZero, 10);
    expect(lastState.probOne).toBeCloseTo(keyState.probOne, 10);
  });

  it("visual actions include rotateBlochSphere and showProbabilities", () => {
    const steps = run({
      stateSequence: basisStatesFixture.inputs.stateSequence as any,
    });

    for (const s of steps) {
      const actionTypes = s.visualActions.map((a: any) => a.type);
      expect(actionTypes).toContain("rotateBlochSphere");
      expect(actionTypes).toContain("showProbabilities");
    }
  });

  it("includes showGateMatrix action when gate is specified", () => {
    const steps = run({
      stateSequence: basisStatesFixture.inputs.stateSequence as any,
    });

    // Step 1 (show_state_0) is |0⟩ with no gate — no showGateMatrix.
    const step1Actions = steps[1]!.visualActions.map((a: any) => a.type);
    expect(step1Actions).not.toContain("showGateMatrix");

    // Step 2 (show_state_1) is |1⟩ via X gate — should have showGateMatrix.
    const step2Actions = steps[2]!.visualActions.map((a: any) => a.type);
    expect(step2Actions).toContain("showGateMatrix");
  });

  it("step states are independent snapshots", () => {
    const steps = run({
      stateSequence: basisStatesFixture.inputs.stateSequence as any,
    });
    expect(steps.length).toBeGreaterThan(1);

    // Mutating step 1's state should not affect step 2's state.
    const state1 = steps[1]!.state as Record<string, unknown>;
    const state2 = steps[2]!.state as Record<string, unknown>;
    const seq1Before = [...(state1.stateSequence as any[])];
    const seq2Before = [...(state2.stateSequence as any[])];

    (state1.stateSequence as any[]).push({ label: "mutant" });
    expect((state2.stateSequence as any[]).length).toBe(seq2Before.length);
  });
});
