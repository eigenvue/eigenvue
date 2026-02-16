/**
 * @fileoverview Grover's Search Algorithm Generator — Unit Tests
 *
 * Validates step structure, optimal iteration count, amplitude amplification,
 * success probabilities, and normalization for the grovers-search generator.
 *
 * Key mathematical results tested:
 *   - 2 qubits, 1 target, 1 iteration  -> P(target) = 1.0 (100%)
 *   - 3 qubits, 1 target, 2 iterations -> P(target) ~ 0.9453 (94.5%)
 *   - 3 qubits, 2 targets, 1 iteration -> P(targets) ~ 1.0 (100%)
 */

import { describe, it, expect } from "vitest";
import { runGenerator } from "@/engine/generator";
import groversGenerator from "../../../algorithms/quantum/grovers-search/generator";

import twoQubitFixture from "../../../algorithms/quantum/grovers-search/tests/two-qubit-search.fixture.json";
import threeQubitFixture from "../../../algorithms/quantum/grovers-search/tests/three-qubit-search.fixture.json";
import multiTargetFixture from "../../../algorithms/quantum/grovers-search/tests/multi-target-search.fixture.json";

/** Helper: run generator and return steps array. */
function run(inputs: { numQubits: number; targets: readonly number[] }) {
  return runGenerator(groversGenerator, inputs).steps;
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

describe("Grover's Search Generator", () => {
  it("2-qubit search: 1 iteration gives 100% success (fixture)", () => {
    const steps = run({
      numQubits: twoQubitFixture.inputs.numQubits,
      targets: twoQubitFixture.inputs.targets,
    });
    validateStepStructure(steps);

    // Verify optimal iteration count is 1.
    // R = floor(pi/4 * sqrt(4/1)) = floor(pi/4 * 2) = floor(1.5708) = 1.
    const lastState = steps[steps.length - 1]!.state as Record<string, unknown>;
    expect(lastState.totalIterations).toBe(twoQubitFixture.expected.optimalIterations);
    expect(lastState.totalIterations).toBe(1);

    // Steps: init + hadamard_all + oracle_1 + diffusion_1 + measure = 5.
    expect(steps).toHaveLength(5);
  });

  it("2-qubit: after Hadamard, uniform superposition at 1/sqrt(4) = 0.5", () => {
    const steps = run({
      numQubits: twoQubitFixture.inputs.numQubits,
      targets: twoQubitFixture.inputs.targets,
    });

    // Step 1 (hadamard_all): uniform superposition.
    const hadState = steps[1]!.state as Record<string, unknown>;
    const amps = hadState.stateVector as [number, number][];
    for (let i = 0; i < 4; i++) {
      expect(amps[i]![0]).toBeCloseTo(0.5, 10);
      expect(amps[i]![1]).toBeCloseTo(0, 10);
    }
  });

  it("2-qubit: oracle negates target |11⟩ amplitude", () => {
    const steps = run({
      numQubits: twoQubitFixture.inputs.numQubits,
      targets: twoQubitFixture.inputs.targets,
    });

    // Step 2 (oracle_1): target amplitude negated.
    const oracleState = steps[2]!.state as Record<string, unknown>;
    const amps = oracleState.stateVector as [number, number][];

    // Non-target amplitudes unchanged at 0.5.
    expect(amps[0]![0]).toBeCloseTo(0.5, 10);
    expect(amps[1]![0]).toBeCloseTo(0.5, 10);
    expect(amps[2]![0]).toBeCloseTo(0.5, 10);
    // Target |11⟩ (index 3) negated to -0.5.
    expect(amps[3]![0]).toBeCloseTo(-0.5, 10);
  });

  it("2-qubit: after diffusion, target has probability 1.0", () => {
    const steps = run({
      numQubits: twoQubitFixture.inputs.numQubits,
      targets: twoQubitFixture.inputs.targets,
    });

    // Step 3 (diffusion_1): target amplified to 1.0.
    const diffState = steps[3]!.state as Record<string, unknown>;
    const amps = diffState.stateVector as [number, number][];

    // Non-targets at 0.
    expect(amps[0]![0]).toBeCloseTo(0, 6);
    expect(amps[1]![0]).toBeCloseTo(0, 6);
    expect(amps[2]![0]).toBeCloseTo(0, 6);
    // Target |11⟩ at amplitude 1.0 (or -1.0; probability is what matters).
    expect(Math.abs(amps[3]![0])).toBeCloseTo(1, 6);

    // Success probability = 1.0 exactly.
    expect(diffState.successProbability).toBeCloseTo(1.0, 6);
  });

  it("3-qubit search: 2 iterations give ~94.5% success (fixture)", () => {
    const steps = run({
      numQubits: threeQubitFixture.inputs.numQubits,
      targets: threeQubitFixture.inputs.targets,
    });
    validateStepStructure(steps);

    // Verify optimal iteration count is 2.
    // R = floor(pi/4 * sqrt(8/1)) = floor(pi/4 * 2.828) = floor(2.221) = 2.
    const lastState = steps[steps.length - 1]!.state as Record<string, unknown>;
    expect(lastState.totalIterations).toBe(threeQubitFixture.expected.optimalIterations);
    expect(lastState.totalIterations).toBe(2);

    // Steps: init + hadamard + (oracle+diffusion)*2 + measure = 1+1+4+1 = 7.
    expect(steps).toHaveLength(7);
  });

  it("3-qubit: after Hadamard, uniform superposition at 1/sqrt(8)", () => {
    const steps = run({
      numQubits: threeQubitFixture.inputs.numQubits,
      targets: threeQubitFixture.inputs.targets,
    });

    const hadState = steps[1]!.state as Record<string, unknown>;
    const amps = hadState.stateVector as [number, number][];
    const invSqrt8 = 0.3535533905932738;

    for (let i = 0; i < 8; i++) {
      expect(amps[i]![0]).toBeCloseTo(invSqrt8, 10);
      expect(amps[i]![1]).toBeCloseTo(0, 10);
    }
  });

  it("3-qubit: final success probability >= 0.94", () => {
    const steps = run({
      numQubits: threeQubitFixture.inputs.numQubits,
      targets: threeQubitFixture.inputs.targets,
    });

    const lastState = steps[steps.length - 1]!.state as Record<string, unknown>;
    const successProb = lastState.successProbability as number;

    // P(|101⟩) ≈ 94.5% after 2 iterations.
    expect(successProb).toBeGreaterThanOrEqual(
      threeQubitFixture.expected.finalSuccessProbability.minProbability,
    );
    expect(successProb).toBeCloseTo(0.9453, 3);
  });

  it("multi-target search: 3 qubits, 2 targets, 1 iteration (fixture)", () => {
    const steps = run({
      numQubits: multiTargetFixture.inputs.numQubits,
      targets: multiTargetFixture.inputs.targets,
    });
    validateStepStructure(steps);

    const lastState = steps[steps.length - 1]!.state as Record<string, unknown>;

    // R = floor(pi/4 * sqrt(8/2)) = floor(pi/4 * 2) = floor(1.571) = 1.
    expect(lastState.totalIterations).toBe(multiTargetFixture.expected.optimalIterations);
    expect(lastState.totalIterations).toBe(1);

    // Combined success probability >= 0.9.
    const successProb = lastState.successProbability as number;
    expect(successProb).toBeGreaterThanOrEqual(
      multiTargetFixture.expected.finalSuccessProbability.minProbability,
    );
  });

  it("state vector norm ≈ 1 for every step (2-qubit)", () => {
    const steps = run({
      numQubits: twoQubitFixture.inputs.numQubits,
      targets: twoQubitFixture.inputs.targets,
    });

    for (const s of steps) {
      const state = s.state as Record<string, unknown>;
      const amps = state.stateVector as [number, number][];
      expect(stateVectorNorm(amps)).toBeCloseTo(1.0, 10);
    }
  });

  it("state vector norm ≈ 1 for every step (3-qubit)", () => {
    const steps = run({
      numQubits: threeQubitFixture.inputs.numQubits,
      targets: threeQubitFixture.inputs.targets,
    });

    for (const s of steps) {
      const state = s.state as Record<string, unknown>;
      const amps = state.stateVector as [number, number][];
      expect(stateVectorNorm(amps)).toBeCloseTo(1.0, 10);
    }
  });

  it("probabilities sum to 1 for all steps", () => {
    const steps = run({
      numQubits: threeQubitFixture.inputs.numQubits,
      targets: threeQubitFixture.inputs.targets,
    });

    for (const s of steps) {
      const state = s.state as Record<string, unknown>;
      const probs = state.probabilities as number[];
      const sum = probs.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 10);
    }
  });

  it("visual actions include showProbabilities with targetStates", () => {
    const steps = run({
      numQubits: twoQubitFixture.inputs.numQubits,
      targets: twoQubitFixture.inputs.targets,
    });

    // Every step should have showProbabilities.
    for (const s of steps) {
      const actionTypes = s.visualActions.map((a: any) => a.type);
      expect(actionTypes).toContain("showProbabilities");
    }

    // The final step should have a showMessage with success info.
    const lastStep = steps[steps.length - 1]!;
    const actionTypes = lastStep.visualActions.map((a: any) => a.type);
    expect(actionTypes).toContain("showMessage");
  });

  it("success probability increases monotonically across diffusion steps (2-qubit)", () => {
    const steps = run({
      numQubits: twoQubitFixture.inputs.numQubits,
      targets: twoQubitFixture.inputs.targets,
    });

    // For 2-qubit case with 1 iteration, there is only one diffusion.
    // Initial success (after Hadamard) = 0.25, after diffusion = 1.0.
    const hadState = steps[1]!.state as Record<string, unknown>;
    const hadSuccess = hadState.successProbability as number;
    expect(hadSuccess).toBeCloseTo(0.25, 10);

    const diffState = steps[3]!.state as Record<string, unknown>;
    const diffSuccess = diffState.successProbability as number;
    expect(diffSuccess).toBeGreaterThan(hadSuccess);
  });
});
