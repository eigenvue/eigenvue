/**
 * @fileoverview Superposition & Measurement Generator — Unit Tests
 *
 * Validates step structure, preparation gates, measurement collapse behavior,
 * Born rule probabilities, and entanglement detection for the
 * superposition-measurement generator.
 */

import { describe, it, expect } from "vitest";
import { runGenerator } from "@/engine/generator";
import superpositionGenerator from "../../../algorithms/quantum/superposition-measurement/generator";

import singleQubitFixture from "../../../algorithms/quantum/superposition-measurement/tests/single-qubit-measure.fixture.json";
import bellStateFixture from "../../../algorithms/quantum/superposition-measurement/tests/bell-state-measure.fixture.json";
import multiQubitFixture from "../../../algorithms/quantum/superposition-measurement/tests/multi-qubit-measure.fixture.json";

/** Helper: run generator and return steps array. */
function run(inputs: {
  numQubits: number;
  preparationGates: ReadonlyArray<{
    gate: string;
    qubits: readonly number[];
    angle?: number;
  }>;
  measurements: ReadonlyArray<{
    qubit: number;
    outcome: 0 | 1;
  }>;
}) {
  return runGenerator(superpositionGenerator, inputs).steps;
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

/** Helper: compute norm of a state vector (array of [re, im] pairs). */
function stateVectorNorm(amplitudes: readonly [number, number][]): number {
  let sum = 0;
  for (const [re, im] of amplitudes) {
    sum += re * re + im * im;
  }
  return Math.sqrt(sum);
}

describe("Superposition & Measurement Generator", () => {
  it("single-qubit measurement: H then measure (fixture)", () => {
    const steps = run({
      numQubits: singleQubitFixture.inputs.numQubits,
      preparationGates: singleQubitFixture.inputs.preparationGates as any,
      measurements: singleQubitFixture.inputs.measurements as any,
    });
    validateStepStructure(steps);

    // 1 init + 1 preparation gate (H) + 1 measurement = 3 steps.
    expect(steps).toHaveLength(3);
  });

  it("single-qubit: after H, state is equal superposition", () => {
    const steps = run({
      numQubits: singleQubitFixture.inputs.numQubits,
      preparationGates: singleQubitFixture.inputs.preparationGates as any,
      measurements: singleQubitFixture.inputs.measurements as any,
    });

    // Step 1 (prepare_gate_0) applies H: state should be (|0⟩+|1⟩)/√2.
    const afterH = steps[1]!.state as Record<string, unknown>;
    const amps = afterH.stateVector as [number, number][];
    const invSqrt2 = 0.7071067811865476;
    expect(amps[0]![0]).toBeCloseTo(invSqrt2, 10);
    expect(amps[0]![1]).toBeCloseTo(0, 10);
    expect(amps[1]![0]).toBeCloseTo(invSqrt2, 10);
    expect(amps[1]![1]).toBeCloseTo(0, 10);

    // Probabilities should be [0.5, 0.5].
    const probs = afterH.probabilities as number[];
    expect(probs[0]).toBeCloseTo(0.5, 10);
    expect(probs[1]).toBeCloseTo(0.5, 10);
  });

  it("single-qubit: measurement collapses to |0⟩ when outcome is 0", () => {
    const steps = run({
      numQubits: singleQubitFixture.inputs.numQubits,
      preparationGates: singleQubitFixture.inputs.preparationGates as any,
      measurements: singleQubitFixture.inputs.measurements as any,
    });

    // Last step is measurement with outcome 0 → state collapses to |0⟩.
    const measureState = steps[steps.length - 1]!.state as Record<string, unknown>;
    const amps = measureState.stateVector as [number, number][];
    expect(amps[0]![0]).toBeCloseTo(1, 10);
    expect(amps[0]![1]).toBeCloseTo(0, 10);
    expect(amps[1]![0]).toBeCloseTo(0, 10);
    expect(amps[1]![1]).toBeCloseTo(0, 10);

    // Classical bits recorded.
    const bits = measureState.classicalBits as number[];
    expect(bits).toEqual([0]);

    // Outcome probability was 0.5 (Born rule for equal superposition).
    expect(measureState.outcomeProb).toBeCloseTo(0.5, 10);
  });

  it("Bell state measurement: H+CNOT then measure both qubits (fixture)", () => {
    const steps = run({
      numQubits: bellStateFixture.inputs.numQubits,
      preparationGates: bellStateFixture.inputs.preparationGates as any,
      measurements: bellStateFixture.inputs.measurements as any,
    });
    validateStepStructure(steps);

    // 1 init + 2 prep gates (H, CNOT) + 2 measurements = 5 steps.
    expect(steps).toHaveLength(5);
  });

  it("Bell state: after H+CNOT, qubits are entangled", () => {
    const steps = run({
      numQubits: bellStateFixture.inputs.numQubits,
      preparationGates: bellStateFixture.inputs.preparationGates as any,
      measurements: bellStateFixture.inputs.measurements as any,
    });

    // After CNOT (step 2, prepare_gate_1): Bell state (|00⟩+|11⟩)/√2.
    const bellState = steps[2]!.state as Record<string, unknown>;
    expect(bellState.entangled).toBe(true);

    const amps = bellState.stateVector as [number, number][];
    const invSqrt2 = 0.7071067811865476;
    // |00⟩ ≈ 1/√2.
    expect(amps[0]![0]).toBeCloseTo(invSqrt2, 10);
    // |01⟩ = 0.
    expect(amps[1]![0]).toBeCloseTo(0, 10);
    // |10⟩ = 0.
    expect(amps[2]![0]).toBeCloseTo(0, 10);
    // |11⟩ ≈ 1/√2.
    expect(amps[3]![0]).toBeCloseTo(invSqrt2, 10);
  });

  it("Bell state: measuring qubit 0 as 0 collapses to |00⟩", () => {
    const steps = run({
      numQubits: bellStateFixture.inputs.numQubits,
      preparationGates: bellStateFixture.inputs.preparationGates as any,
      measurements: bellStateFixture.inputs.measurements as any,
    });

    // Step 3 (measure_qubit_0): measuring qubit 0 as 0.
    const afterMeasure0 = steps[3]!.state as Record<string, unknown>;
    const amps = afterMeasure0.stateVector as [number, number][];

    // After collapse: |00⟩ = 1, rest = 0.
    expect(amps[0]![0]).toBeCloseTo(1, 10);
    expect(amps[1]![0]).toBeCloseTo(0, 10);
    expect(amps[2]![0]).toBeCloseTo(0, 10);
    expect(amps[3]![0]).toBeCloseTo(0, 10);

    // Outcome probability was 0.5 (50% chance in Bell state).
    expect(afterMeasure0.outcomeProb).toBeCloseTo(0.5, 10);
  });

  it("Bell state: measuring qubit 1 after qubit 0 is deterministic", () => {
    const steps = run({
      numQubits: bellStateFixture.inputs.numQubits,
      preparationGates: bellStateFixture.inputs.preparationGates as any,
      measurements: bellStateFixture.inputs.measurements as any,
    });

    // Step 4 (measure_qubit_1): qubit 1 outcome is 0, P=1 (deterministic).
    const afterMeasure1 = steps[4]!.state as Record<string, unknown>;
    expect(afterMeasure1.outcomeProb).toBeCloseTo(1.0, 10);
    expect(afterMeasure1.classicalBits).toEqual([0, 0]);
  });

  it("state vector norm ≈ 1 for every step", () => {
    const steps = run({
      numQubits: bellStateFixture.inputs.numQubits,
      preparationGates: bellStateFixture.inputs.preparationGates as any,
      measurements: bellStateFixture.inputs.measurements as any,
    });

    for (const s of steps) {
      const state = s.state as Record<string, unknown>;
      const amps = state.stateVector as [number, number][];
      expect(stateVectorNorm(amps)).toBeCloseTo(1.0, 10);
    }
  });

  it("multi-qubit GHZ state measurement (fixture)", () => {
    const steps = run({
      numQubits: multiQubitFixture.inputs.numQubits,
      preparationGates: multiQubitFixture.inputs.preparationGates as any,
      measurements: multiQubitFixture.inputs.measurements as any,
    });
    validateStepStructure(steps);

    // 1 init + 3 prep gates (H, CNOT, CNOT) + 3 measurements = 7 steps.
    expect(steps).toHaveLength(7);
  });

  it("multi-qubit: after preparation, GHZ state (|000⟩+|111⟩)/√2", () => {
    const steps = run({
      numQubits: multiQubitFixture.inputs.numQubits,
      preparationGates: multiQubitFixture.inputs.preparationGates as any,
      measurements: multiQubitFixture.inputs.measurements as any,
    });

    // After the last preparation gate (step 3), we have the GHZ state.
    const ghzState = steps[3]!.state as Record<string, unknown>;
    const amps = ghzState.stateVector as [number, number][];
    const invSqrt2 = 0.7071067811865476;

    // |000⟩ (index 0) ≈ 1/√2.
    expect(amps[0]![0]).toBeCloseTo(invSqrt2, 10);
    // All intermediate states = 0.
    for (let i = 1; i < 7; i++) {
      expect(amps[i]![0]).toBeCloseTo(0, 10);
    }
    // |111⟩ (index 7) ≈ 1/√2.
    expect(amps[7]![0]).toBeCloseTo(invSqrt2, 10);
  });

  it("measurement steps include collapseState visual action", () => {
    const steps = run({
      numQubits: singleQubitFixture.inputs.numQubits,
      preparationGates: singleQubitFixture.inputs.preparationGates as any,
      measurements: singleQubitFixture.inputs.measurements as any,
    });

    // The last step is a measurement step.
    const measureStep = steps[steps.length - 1]!;
    const actionTypes = measureStep.visualActions.map((a: any) => a.type);
    expect(actionTypes).toContain("collapseState");
    expect(actionTypes).toContain("showClassicalBits");
    expect(actionTypes).toContain("showStateVector");
    expect(actionTypes).toContain("showProbabilities");
  });

  it("probabilities sum to 1 for all steps", () => {
    const steps = run({
      numQubits: bellStateFixture.inputs.numQubits,
      preparationGates: bellStateFixture.inputs.preparationGates as any,
      measurements: bellStateFixture.inputs.measurements as any,
    });

    for (const s of steps) {
      const state = s.state as Record<string, unknown>;
      const probs = state.probabilities as number[];
      const sum = probs.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 10);
    }
  });
});
