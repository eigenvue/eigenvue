/**
 * @fileoverview Quantum Gates & Circuits — Step Generator
 *
 * Generates a step-by-step visualization of quantum gate operations on
 * a multi-qubit state vector. Each gate is applied sequentially, with
 * the state vector and probabilities updated after each application.
 *
 * ALGORITHM:
 *   1. Initialize the |0...0⟩ state vector for n qubits.
 *   2. For each gate in the sequence:
 *      a. Apply the gate using quantum-math library functions.
 *      b. Verify normalization (assertNormalized).
 *      c. Record the updated state vector and probabilities.
 *   3. Yield a step for initialization and after each gate application.
 *
 * STATE SNAPSHOT SAFETY:
 *   State vectors are deep-copied (map to new [re, im] tuples) at every step.
 *   Gate sequences are spread-copied.
 */

import { createGenerator } from "@/engine/generator";
import type { VisualAction } from "@/engine/generator";
import {
  createZeroState,
  applySingleQubitGate,
  applyTwoQubitGate,
  assertNormalized,
  measurementProbabilities,
  basisLabels,
  getStandardGate,
  GATE_CNOT,
  GATE_CZ,
  GATE_SWAP,
  type Complex,
  type StateVector,
} from "@/engine/utils/quantum-math";

interface QuantumGatesInputs extends Record<string, unknown> {
  readonly numQubits: number;
  readonly gates: ReadonlyArray<{
    readonly gate: string;
    readonly qubits: readonly number[];
    readonly angle?: number;
  }>;
}

/** Deep copy a state vector (create fresh Complex tuples). */
function cloneState(state: StateVector): [number, number][] {
  return state.map(([re, im]) => [re, im] as [number, number]);
}

/** Get a human-readable description of what a gate does. */
function gateDescription(gateName: string, qubits: readonly number[]): string {
  const qubitStr = qubits.length === 1
    ? `qubit ${qubits[0]}`
    : `qubits ${qubits.join(", ")}`;

  switch (gateName) {
    case "H": return `Hadamard gate on ${qubitStr}: creates superposition by rotating the state. H|0⟩ = |+⟩, H|1⟩ = |−⟩.`;
    case "X": return `Pauli-X (NOT) gate on ${qubitStr}: flips |0⟩ ↔ |1⟩.`;
    case "Y": return `Pauli-Y gate on ${qubitStr}: rotation by π around the Y axis.`;
    case "Z": return `Pauli-Z gate on ${qubitStr}: flips the phase of |1⟩. Z|1⟩ = −|1⟩.`;
    case "S": return `Phase gate (S) on ${qubitStr}: adds a π/2 phase to |1⟩.`;
    case "T": return `T gate on ${qubitStr}: adds a π/4 phase to |1⟩.`;
    case "CNOT": return `CNOT gate: qubit ${qubits[0]} controls, qubit ${qubits[1]} is target. Flips target when control is |1⟩.`;
    case "CZ": return `CZ gate on ${qubitStr}: adds a phase flip when both qubits are |1⟩.`;
    case "SWAP": return `SWAP gate on ${qubitStr}: exchanges the states of the two qubits.`;
    default: return `${gateName} gate on ${qubitStr}.`;
  }
}

export default createGenerator<QuantumGatesInputs>({
  id: "quantum-gates",

  *generate(inputs, step) {
    const { numQubits, gates } = inputs;
    const labels = basisLabels(numQubits);

    // ── Step 0: Initialize ─────────────────────────────────────────
    const state: StateVector = createZeroState(numQubits);
    const initProbs = measurementProbabilities(state);

    yield step({
      id: "initialize",
      title: "Initialize Quantum Register",
      explanation:
        `Creating a ${numQubits}-qubit register in the |${"0".repeat(numQubits)}⟩ state. ` +
        `The state vector has ${1 << numQubits} amplitudes, with all probability concentrated on |${"0".repeat(numQubits)}⟩.`,
      state: {
        numQubits,
        gateSequence: [...gates],
        currentGateIndex: -1,
        stateVector: cloneState(state),
        probabilities: [...initProbs],
        basisLabels: [...labels],
        currentGate: null,
      },
      visualActions: [
        {
          type: "showStateVector",
          amplitudes: cloneState(state),
          labels: [...labels],
        },
        {
          type: "showProbabilities",
          probabilities: [...initProbs],
          labels: [...labels],
        },
      ],
      codeHighlight: { language: "pseudocode", lines: [1, 2] },
      phase: "initialization",
    });

    // ── Steps 1..N: Apply each gate ────────────────────────────────
    for (let i = 0; i < gates.length; i++) {
      const gateEntry = gates[i]!;
      const { gate: gateName, qubits, angle } = gateEntry;

      // Apply the gate
      if (qubits.length === 1) {
        const gateMatrix = getStandardGate(gateName, angle);
        if (!gateMatrix) {
          throw new Error(`Unknown gate: "${gateName}"`);
        }
        applySingleQubitGate(state, gateMatrix, qubits[0]!, numQubits);
      } else if (qubits.length === 2) {
        let gateMatrix;
        switch (gateName) {
          case "CNOT": gateMatrix = GATE_CNOT; break;
          case "CZ": gateMatrix = GATE_CZ; break;
          case "SWAP": gateMatrix = GATE_SWAP; break;
          default: throw new Error(`Unknown 2-qubit gate: "${gateName}"`);
        }
        applyTwoQubitGate(state, gateMatrix, qubits[0]!, qubits[1]!, numQubits);
      }

      // Verify normalization after every gate
      assertNormalized(state, `after gate ${i}: ${gateName}(${qubits.join(",")})`);

      const probs = measurementProbabilities(state);

      const visualActions: VisualAction[] = [
        {
          type: "applyGate",
          gate: gateName,
          qubits: [...qubits],
          gateIndex: i,
          ...(angle !== undefined ? { angle } : {}),
        },
        {
          type: "showStateVector",
          amplitudes: cloneState(state),
          labels: [...labels],
        },
        {
          type: "showProbabilities",
          probabilities: [...probs],
          labels: [...labels],
        },
        {
          type: "highlightQubitWire",
          qubits: [...qubits],
          color: "#00ffc8",
        },
      ];

      // Show gate matrix for single-qubit gates
      const gateMatrixForDisplay = getStandardGate(gateName, angle);
      if (gateMatrixForDisplay && qubits.length === 1) {
        visualActions.push({
          type: "showGateMatrix",
          gate: gateName,
          matrix: gateMatrixForDisplay,
        });
      }

      yield step({
        id: `apply_gate_${i}`,
        title: `Apply ${gateName} Gate`,
        explanation: gateDescription(gateName, qubits),
        state: {
          numQubits,
          gateSequence: [...gates],
          currentGateIndex: i,
          stateVector: cloneState(state),
          probabilities: [...probs],
          basisLabels: [...labels],
          currentGate: { gate: gateName, qubits: [...qubits], ...(angle !== undefined ? { angle } : {}) },
        },
        visualActions,
        codeHighlight: { language: "pseudocode", lines: [4, 5, 6] },
        phase: "execution",
        isTerminal: i === gates.length - 1,
      });
    }
  },
});
