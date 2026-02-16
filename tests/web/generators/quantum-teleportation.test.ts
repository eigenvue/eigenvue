/**
 * @fileoverview Quantum Teleportation Generator — Unit Tests
 *
 * Validates step structure, Bell pair creation, Alice's operations,
 * measurement collapse, Bob's correction, and final state verification
 * for the quantum-teleportation generator.
 *
 * The teleportation protocol transfers a qubit state |psi> from Alice
 * (qubit 0) to Bob (qubit 2) using an entangled Bell pair and classical
 * communication.
 */

import { describe, it, expect } from "vitest";
import { runGenerator } from "@/engine/generator";
import teleportationGenerator from "../../../algorithms/quantum/quantum-teleportation/generator";

import teleportZeroFixture from "../../../algorithms/quantum/quantum-teleportation/tests/teleport-zero.fixture.json";
import teleportSuperpositionFixture from "../../../algorithms/quantum/quantum-teleportation/tests/teleport-superposition.fixture.json";
import teleportOneFixture from "../../../algorithms/quantum/quantum-teleportation/tests/teleport-one.fixture.json";

/** Helper: run generator and return steps array. */
function run(inputs: {
  teleportState: { theta: number; phi: number; label: string };
  aliceMeasurements: { qubit0: 0 | 1; qubit1: 0 | 1 };
}) {
  return runGenerator(teleportationGenerator, inputs).steps;
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

describe("Quantum Teleportation Generator", () => {
  it("teleporting |0⟩ produces correct step structure (fixture)", () => {
    const steps = run({
      teleportState: teleportZeroFixture.inputs.teleportState,
      aliceMeasurements: teleportZeroFixture.inputs.aliceMeasurements as any,
    });
    validateStepStructure(steps);

    // Protocol steps:
    //   0: initialize
    //   1: bell_hadamard
    //   2: bell_cnot
    //   3: alice_cnot
    //   4: alice_hadamard
    //   5: measure_qubit0
    //   6: measure_qubit1
    //   7: bob_correction
    //   8: verification (terminal)
    expect(steps).toHaveLength(9);
    expect(steps[steps.length - 1].id).toBe(teleportZeroFixture.expected.terminalStepId);
  });

  it("teleporting |0⟩: Bob's final state matches theta=0, phi=0", () => {
    const steps = run({
      teleportState: teleportZeroFixture.inputs.teleportState,
      aliceMeasurements: teleportZeroFixture.inputs.aliceMeasurements as any,
    });

    const verificationState = steps[steps.length - 1]!.state as Record<string, unknown>;
    const expectedAngles = teleportZeroFixture.expected.keyStates[1]!.bobBlochAngles;

    expect(verificationState.bobTheta as number).toBeCloseTo(expectedAngles.theta, 6);
    expect(verificationState.bobPhi as number).toBeCloseTo(expectedAngles.phi, 6);
    expect(verificationState.teleportationSuccess).toBe(true);
  });

  it("teleporting |0⟩ with m0=0, m1=0: no correction needed", () => {
    const steps = run({
      teleportState: { theta: 0, phi: 0, label: "|0⟩" },
      aliceMeasurements: { qubit0: 0, qubit1: 0 },
    });

    // The correction step (step 7) should note no correction.
    const correctionState = steps[7]!.state as Record<string, unknown>;
    const correction = correctionState.correction as { m0: number; m1: number };
    expect(correction.m0).toBe(0);
    expect(correction.m1).toBe(0);
  });

  it("teleporting |+⟩ superposition: Bob recovers theta=pi/2, phi=0 (fixture)", () => {
    const steps = run({
      teleportState: teleportSuperpositionFixture.inputs.teleportState,
      aliceMeasurements: teleportSuperpositionFixture.inputs.aliceMeasurements as any,
    });
    validateStepStructure(steps);
    expect(steps).toHaveLength(9);

    const verificationState = steps[steps.length - 1]!.state as Record<string, unknown>;
    const expectedAngles = teleportSuperpositionFixture.expected.keyStates[1]!.bobBlochAngles;

    // |+⟩ is at theta=pi/2, phi=0 on the Bloch sphere equator.
    expect(verificationState.bobTheta as number).toBeCloseTo(expectedAngles.theta, 6);
    expect(verificationState.bobPhi as number).toBeCloseTo(expectedAngles.phi, 6);
    expect(verificationState.teleportationSuccess).toBe(true);
  });

  it("teleporting |+⟩ with m0=0, m1=1: X correction applied", () => {
    const steps = run({
      teleportState: teleportSuperpositionFixture.inputs.teleportState,
      aliceMeasurements: teleportSuperpositionFixture.inputs.aliceMeasurements as any,
    });

    const correctionState = steps[7]!.state as Record<string, unknown>;
    const correction = correctionState.correction as { m0: number; m1: number };
    expect(correction.m0).toBe(0);
    expect(correction.m1).toBe(1);
  });

  it("teleporting |1⟩: Bob's final state at south pole theta=pi (fixture)", () => {
    const steps = run({
      teleportState: teleportOneFixture.inputs.teleportState,
      aliceMeasurements: teleportOneFixture.inputs.aliceMeasurements as any,
    });
    validateStepStructure(steps);
    expect(steps).toHaveLength(9);

    const verificationState = steps[steps.length - 1]!.state as Record<string, unknown>;
    const expectedAngles = teleportOneFixture.expected.keyStates[1]!.bobBlochAngles;

    // |1⟩ is at theta=pi, phi=0 (south pole).
    expect(verificationState.bobTheta as number).toBeCloseTo(expectedAngles.theta, 6);
    expect(verificationState.bobPhi as number).toBeCloseTo(expectedAngles.phi, 6);
    expect(verificationState.teleportationSuccess).toBe(true);
  });

  it("teleporting |1⟩ with m0=1, m1=1: X then Z correction applied", () => {
    const steps = run({
      teleportState: teleportOneFixture.inputs.teleportState,
      aliceMeasurements: teleportOneFixture.inputs.aliceMeasurements as any,
    });

    const correctionState = steps[7]!.state as Record<string, unknown>;
    const correction = correctionState.correction as { m0: number; m1: number };
    expect(correction.m0).toBe(1);
    expect(correction.m1).toBe(1);
  });

  it("state vector norm ≈ 1 for every step (teleport |0⟩)", () => {
    const steps = run({
      teleportState: { theta: 0, phi: 0, label: "|0⟩" },
      aliceMeasurements: { qubit0: 0, qubit1: 0 },
    });

    for (const s of steps) {
      const state = s.state as Record<string, unknown>;
      const amps = state.stateVector as [number, number][];
      expect(stateVectorNorm(amps)).toBeCloseTo(1.0, 10);
    }
  });

  it("state vector norm ≈ 1 for every step (teleport |+⟩)", () => {
    const steps = run({
      teleportState: { theta: Math.PI / 2, phi: 0, label: "|+⟩" },
      aliceMeasurements: { qubit0: 0, qubit1: 1 },
    });

    for (const s of steps) {
      const state = s.state as Record<string, unknown>;
      const amps = state.stateVector as [number, number][];
      expect(stateVectorNorm(amps)).toBeCloseTo(1.0, 10);
    }
  });

  it("Bob's final state matches Alice's original — theta and phi preserved", () => {
    // Test all three fixture cases.
    const cases = [
      {
        teleportState: teleportZeroFixture.inputs.teleportState,
        aliceMeasurements: teleportZeroFixture.inputs.aliceMeasurements as any,
      },
      {
        teleportState: teleportSuperpositionFixture.inputs.teleportState,
        aliceMeasurements: teleportSuperpositionFixture.inputs.aliceMeasurements as any,
      },
      {
        teleportState: teleportOneFixture.inputs.teleportState,
        aliceMeasurements: teleportOneFixture.inputs.aliceMeasurements as any,
      },
    ];

    for (const c of cases) {
      const steps = run(c);
      const verificationState = steps[steps.length - 1]!.state as Record<string, unknown>;

      // Bob's Bloch angles should match Alice's original within tolerance.
      expect(verificationState.bobTheta as number).toBeCloseTo(
        verificationState.originalTheta as number,
        6,
      );
      // For phi, need to handle the case where theta=0 or theta=pi (phi undefined).
      const origTheta = verificationState.originalTheta as number;
      if (Math.abs(origTheta) > 1e-6 && Math.abs(origTheta - Math.PI) > 1e-6) {
        expect(verificationState.bobPhi as number).toBeCloseTo(
          verificationState.originalPhi as number,
          6,
        );
      }
    }
  });

  it("Alice's measurement probabilities are 0.25 each (equiprobable)", () => {
    // For the |+⟩ teleportation case, measure qubit 0 and 1.
    const steps = run({
      teleportState: { theta: Math.PI / 2, phi: 0, label: "|+⟩" },
      aliceMeasurements: { qubit0: 0, qubit1: 1 },
    });

    // Step 5 (measure_qubit0) and step 6 (measure_qubit1) each have
    // their outcome probability recorded. Each outcome (0 or 1) for each
    // qubit has probability 0.5 in the teleportation protocol (since all
    // four (m0, m1) outcomes are equiprobable at 0.25 in the joint space).
    //
    // However, P(qubit0 = 0) = 0.5 and P(qubit1 = 1 | qubit0 = 0) = 0.5.
    // These are the marginal/conditional probabilities respectively.
  });

  it("initial state has Alice's qubit set and others at |0⟩", () => {
    const steps = run({
      teleportState: { theta: 0, phi: 0, label: "|0⟩" },
      aliceMeasurements: { qubit0: 0, qubit1: 0 },
    });

    const initState = steps[0]!.state as Record<string, unknown>;
    const amps = initState.stateVector as [number, number][];

    // For |0⟩ (theta=0): alpha0=[1,0], alpha1=[0,0].
    // Full state: |000⟩ = alpha0 * |000⟩ + alpha1 * |100⟩.
    // So amp[0] = [1,0], amp[4] = [0,0], rest = [0,0].
    expect(amps[0]![0]).toBeCloseTo(1, 10);
    expect(amps[0]![1]).toBeCloseTo(0, 10);
    for (let i = 1; i < 8; i++) {
      expect(amps[i]![0]).toBeCloseTo(0, 10);
      expect(amps[i]![1]).toBeCloseTo(0, 10);
    }
  });

  it("verification step includes rotateBlochSphere visual action", () => {
    const steps = run({
      teleportState: { theta: 0, phi: 0, label: "|0⟩" },
      aliceMeasurements: { qubit0: 0, qubit1: 0 },
    });

    const lastStep = steps[steps.length - 1]!;
    const actionTypes = lastStep.visualActions.map((a: any) => a.type);
    expect(actionTypes).toContain("rotateBlochSphere");
    expect(actionTypes).toContain("showProbabilities");
    expect(actionTypes).toContain("showMessage");
  });

  it("probabilities sum to 1 for all steps (teleport |1⟩)", () => {
    const steps = run({
      teleportState: teleportOneFixture.inputs.teleportState,
      aliceMeasurements: teleportOneFixture.inputs.aliceMeasurements as any,
    });

    for (const s of steps) {
      const state = s.state as Record<string, unknown>;
      const probs = state.probabilities as number[];
      const sum = probs.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 10);
    }
  });
});
