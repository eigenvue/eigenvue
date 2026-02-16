/**
 * @fileoverview Quantum Gates & Circuits Generator — Unit Tests
 *
 * Validates step structure, gate application correctness, state vector
 * amplitudes, normalization, and visual actions for the quantum-gates generator.
 */

import { describe, it, expect } from "vitest";
import { runGenerator } from "@/engine/generator";
import quantumGatesGenerator from "../../../algorithms/quantum/quantum-gates/generator";

import singleQubitGatesFixture from "../../../algorithms/quantum/quantum-gates/tests/single-qubit-gates.fixture.json";
import cnotGateFixture from "../../../algorithms/quantum/quantum-gates/tests/cnot-gate.fixture.json";
import hadamardSequenceFixture from "../../../algorithms/quantum/quantum-gates/tests/hadamard-sequence.fixture.json";

type GateEntry = { gate: string; qubits: number[]; angle?: number };

/** Helper: run generator and return steps array. */
function run(inputs: { numQubits: number; gates: readonly GateEntry[] }) {
  return runGenerator(quantumGatesGenerator, inputs).steps;
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

describe("Quantum Gates Generator", () => {
  it("applies single-qubit gates X then H correctly (fixture)", () => {
    const fixtureGates = singleQubitGatesFixture.inputs.gates as GateEntry[];
    const steps = run({ numQubits: singleQubitGatesFixture.inputs.numQubits, gates: fixtureGates });
    validateStepStructure(steps);

    // 1 init step + 2 gate steps = 3 total.
    expect(steps).toHaveLength(3);
    expect(steps[steps.length - 1].id).toBe(singleQubitGatesFixture.expected.terminalStepId);

    // After X gate (step 1): X|0⟩ = |1⟩ → amplitudes [[0,0], [1,0]].
    const xKeyState = singleQubitGatesFixture.expected.keyStates[0]!;
    const afterX = steps[1]!.state as Record<string, unknown>;
    const xAmplitudes = afterX.stateVector as [number, number][];
    expect(xAmplitudes[0]![0]).toBeCloseTo(xKeyState.amplitudes[0][0], 10);
    expect(xAmplitudes[0]![1]).toBeCloseTo(xKeyState.amplitudes[0][1], 10);
    expect(xAmplitudes[1]![0]).toBeCloseTo(xKeyState.amplitudes[1][0], 10);
    expect(xAmplitudes[1]![1]).toBeCloseTo(xKeyState.amplitudes[1][1], 10);

    // After H gate (step 2): H|1⟩ = |−⟩ = (|0⟩ − |1⟩)/√2.
    const hKeyState = singleQubitGatesFixture.expected.keyStates[1]!;
    const afterH = steps[2]!.state as Record<string, unknown>;
    const hAmplitudes = afterH.stateVector as [number, number][];
    expect(hAmplitudes[0]![0]).toBeCloseTo(hKeyState.amplitudes[0][0], 10);
    expect(hAmplitudes[1]![0]).toBeCloseTo(hKeyState.amplitudes[1][0], 10);
  });

  it("creates Bell state with H then CNOT (fixture)", () => {
    const fixtureGates = cnotGateFixture.inputs.gates as GateEntry[];
    const steps = run({ numQubits: cnotGateFixture.inputs.numQubits, gates: fixtureGates });
    validateStepStructure(steps);

    // 1 init + 2 gate steps = 3 total.
    expect(steps).toHaveLength(3);
    expect(steps[steps.length - 1].id).toBe(cnotGateFixture.expected.terminalStepId);

    // After H on qubit 0 (step 1): |+0⟩ = (|00⟩ + |10⟩)/√2.
    const hKeyState = cnotGateFixture.expected.keyStates[0]!;
    const afterH = steps[1]!.state as Record<string, unknown>;
    const hAmps = afterH.stateVector as [number, number][];
    for (let i = 0; i < hKeyState.amplitudes.length; i++) {
      expect(hAmps[i]![0]).toBeCloseTo(hKeyState.amplitudes[i][0], 10);
      expect(hAmps[i]![1]).toBeCloseTo(hKeyState.amplitudes[i][1], 10);
    }

    // After CNOT (step 2): Bell state |Φ+⟩ = (|00⟩ + |11⟩)/√2.
    const cnotKeyState = cnotGateFixture.expected.keyStates[1]!;
    const afterCNOT = steps[2]!.state as Record<string, unknown>;
    const bellAmps = afterCNOT.stateVector as [number, number][];
    // |00⟩ amplitude ≈ 1/√2
    expect(bellAmps[0]![0]).toBeCloseTo(cnotKeyState.amplitudes[0][0], 10);
    // |01⟩ amplitude = 0
    expect(bellAmps[1]![0]).toBeCloseTo(cnotKeyState.amplitudes[1][0], 10);
    // |10⟩ amplitude = 0
    expect(bellAmps[2]![0]).toBeCloseTo(cnotKeyState.amplitudes[2][0], 10);
    // |11⟩ amplitude ≈ 1/√2
    expect(bellAmps[3]![0]).toBeCloseTo(cnotKeyState.amplitudes[3][0], 10);
  });

  it("verifies H squared equals identity (fixture)", () => {
    const fixtureGates = hadamardSequenceFixture.inputs.gates as GateEntry[];
    const steps = run({ numQubits: hadamardSequenceFixture.inputs.numQubits, gates: fixtureGates });
    validateStepStructure(steps);

    // After H (step 1): |+⟩.
    const hKeyState = hadamardSequenceFixture.expected.keyStates[0]!;
    const afterH1 = steps[1]!.state as Record<string, unknown>;
    const h1Amps = afterH1.stateVector as [number, number][];
    expect(h1Amps[0]![0]).toBeCloseTo(hKeyState.amplitudes[0][0], 10);
    expect(h1Amps[1]![0]).toBeCloseTo(hKeyState.amplitudes[1][0], 10);

    // After H again (step 2): back to |0⟩ since H^2 = I.
    const h2KeyState = hadamardSequenceFixture.expected.keyStates[1]!;
    const afterH2 = steps[2]!.state as Record<string, unknown>;
    const h2Amps = afterH2.stateVector as [number, number][];
    expect(h2Amps[0]![0]).toBeCloseTo(h2KeyState.amplitudes[0][0], 6);
    expect(h2Amps[0]![1]).toBeCloseTo(h2KeyState.amplitudes[0][1], 6);
    expect(h2Amps[1]![0]).toBeCloseTo(h2KeyState.amplitudes[1][0], 6);
    expect(h2Amps[1]![1]).toBeCloseTo(h2KeyState.amplitudes[1][1], 6);
  });

  it("state vector norm ≈ 1 for every step", () => {
    const fixtureGates = cnotGateFixture.inputs.gates as GateEntry[];
    const steps = run({ numQubits: cnotGateFixture.inputs.numQubits, gates: fixtureGates });

    for (const s of steps) {
      const state = s.state as Record<string, unknown>;
      const amps = state.stateVector as [number, number][];
      expect(stateVectorNorm(amps)).toBeCloseTo(1.0, 10);
    }
  });

  it("single-qubit normalization across all gate steps", () => {
    const fixtureGates = singleQubitGatesFixture.inputs.gates as GateEntry[];
    const steps = run({ numQubits: singleQubitGatesFixture.inputs.numQubits, gates: fixtureGates });

    for (const s of steps) {
      const state = s.state as Record<string, unknown>;
      const amps = state.stateVector as [number, number][];
      expect(stateVectorNorm(amps)).toBeCloseTo(1.0, 10);
    }
  });

  it("visual actions include applyGate and showStateVector for gate steps", () => {
    const fixtureGates = cnotGateFixture.inputs.gates as GateEntry[];
    const steps = run({ numQubits: cnotGateFixture.inputs.numQubits, gates: fixtureGates });

    // Step 0 is initialization — should have showStateVector.
    const initActions = steps[0]!.visualActions.map((a: any) => a.type);
    expect(initActions).toContain("showStateVector");
    expect(initActions).toContain("showProbabilities");

    // Gate steps should have applyGate, showStateVector, showProbabilities, highlightQubitWire.
    for (let i = 1; i < steps.length; i++) {
      const actionTypes = steps[i]!.visualActions.map((a: any) => a.type);
      expect(actionTypes).toContain("applyGate");
      expect(actionTypes).toContain("showStateVector");
      expect(actionTypes).toContain("showProbabilities");
      expect(actionTypes).toContain("highlightQubitWire");
    }
  });

  it("probabilities sum to 1 for all steps", () => {
    const fixtureGates = cnotGateFixture.inputs.gates as GateEntry[];
    const steps = run({ numQubits: cnotGateFixture.inputs.numQubits, gates: fixtureGates });

    for (const s of steps) {
      const state = s.state as Record<string, unknown>;
      const probs = state.probabilities as number[];
      const sum = probs.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 10);
    }
  });

  it("initial state is |00⟩ with all probability on first basis state", () => {
    const fixtureGates = cnotGateFixture.inputs.gates as GateEntry[];
    const steps = run({ numQubits: 2, gates: fixtureGates });

    const initState = steps[0]!.state as Record<string, unknown>;
    const amps = initState.stateVector as [number, number][];

    // |00⟩ amplitude = [1, 0], rest are [0, 0].
    expect(amps[0]![0]).toBeCloseTo(1, 10);
    expect(amps[0]![1]).toBeCloseTo(0, 10);
    for (let i = 1; i < amps.length; i++) {
      expect(amps[i]![0]).toBeCloseTo(0, 10);
      expect(amps[i]![1]).toBeCloseTo(0, 10);
    }
  });
});
