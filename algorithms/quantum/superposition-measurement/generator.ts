/**
 * @fileoverview Superposition & Measurement — Step Generator
 *
 * Demonstrates quantum measurement: prepares a state using gates, then
 * measures qubits with predetermined outcomes to show Born rule probabilities
 * and wave function collapse.
 *
 * ALGORITHM:
 *   1. Initialize |0...0⟩ state.
 *   2. Apply preparation gates (e.g., H then CNOT to create Bell state).
 *   3. For each measurement:
 *      a. Compute probability of the predetermined outcome.
 *      b. Project and renormalize the state vector.
 *      c. Show the collapsed state and classical result.
 *
 * CRITICAL: Measurement outcomes are DETERMINISTIC (predetermined by inputs)
 * for pedagogical walkthrough purposes. The generator shows the probability
 * and the resulting collapse.
 *
 * STEP GENERATION STRATEGY:
 *   The generator yields a step at each "interesting moment":
 *   - Initialization (zero state, qubit register shown)
 *   - Each gate application (state vector evolves, entanglement detected)
 *   - Each measurement (probability displayed, state collapses, classical bit recorded)
 *
 * MATHEMATICAL CORRECTNESS:
 *   - State vectors are arrays of Complex ([re, im]) pairs with length 2^n.
 *   - All operations preserve normalization (Σ|αᵢ|² = 1) which is asserted
 *     via assertNormalized() after every gate and measurement.
 *   - Measurement projection zeroes amplitudes inconsistent with the observed
 *     outcome, then renormalizes. For a qubit measured as |0⟩, all basis
 *     states where that qubit is |1⟩ have their amplitudes set to zero.
 *   - Born rule probability: P(outcome) = Σ|αᵢ|² over basis states consistent
 *     with the measurement outcome.
 *
 * STATE SNAPSHOT SAFETY:
 *   The state vector is deep-copied via cloneState() at every step boundary.
 *   All arrays in state/visualActions are spread-copied. No mutable references
 *   leak across steps.
 *
 * CODE HIGHLIGHT MAPPING:
 *   Lines reference the "pseudocode" implementation in meta.json.
 *   The pseudocode is 16 lines. Line numbers are 1-indexed.
 */

import { createGenerator } from "@/engine/generator";
import type { VisualAction } from "@/engine/generator";
import {
  createZeroState,
  applySingleQubitGate,
  applyTwoQubitGate,
  assertNormalized,
  measurementProbabilities,
  qubitProbabilities,
  projectAndNormalize,
  basisLabels,
  getStandardGate,
  isEntangled,
  GATE_CNOT,
  GATE_CZ,
  GATE_SWAP,
  type Complex,
  type StateVector,
} from "@/engine/utils/quantum-math";

// ─────────────────────────────────────────────────────────────────────────────
// INPUT TYPE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Input parameters for superposition & measurement.
 *
 * CONSTRAINTS (enforced by meta.json schema):
 * - numQubits: 1 or 2
 * - preparationGates: 1–10 gates, each with a name and qubit indices
 * - measurements: 1–2 measurements, each with a qubit index and outcome (0 or 1)
 */
interface SuperpositionMeasurementInputs extends Record<string, unknown> {
  readonly numQubits: number;
  readonly preparationGates: ReadonlyArray<{
    readonly gate: string;
    readonly qubits: readonly number[];
    readonly angle?: number;
  }>;
  readonly measurements: ReadonlyArray<{
    readonly qubit: number;
    readonly outcome: 0 | 1;
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deep-copy a state vector so that no mutable references leak across steps.
 *
 * Each amplitude is a [re, im] tuple. We create a fresh tuple for every entry
 * so that downstream mutations (gate applications, projections) do not alter
 * previously yielded step snapshots.
 */
function cloneState(state: StateVector): [number, number][] {
  return state.map(([re, im]) => [re, im] as [number, number]);
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

export default createGenerator<SuperpositionMeasurementInputs>({
  id: "superposition-measurement",

  *generate(inputs, step) {
    const { numQubits, preparationGates, measurements } = inputs;
    const labels = basisLabels(numQubits);
    let state: StateVector = createZeroState(numQubits);
    const classicalBits: (0 | 1)[] = [];

    // ── Step 0: Initialize ─────────────────────────────────────────────
    // Show the zero state |0...0⟩ with all probability concentrated on
    // the first basis state. This is the starting point before any gates.
    yield step({
      id: "initialize",
      title: "Initialize Quantum Register",
      explanation:
        `Starting with ${numQubits} qubit${numQubits > 1 ? "s" : ""} in the |${"0".repeat(numQubits)}⟩ state. ` +
        `We will prepare a quantum state, then measure to observe collapse.`,
      state: {
        numQubits,
        stateVector: cloneState(state),
        probabilities: [...measurementProbabilities(state)],
        basisLabels: [...labels],
        currentPhase: "initialization",
        classicalBits: [],
        entangled: false,
      },
      visualActions: [
        {
          type: "showStateVector",
          amplitudes: cloneState(state),
          labels: [...labels],
        },
        {
          type: "showProbabilities",
          probabilities: [...measurementProbabilities(state)],
          labels: [...labels],
        },
      ],
      codeHighlight: { language: "pseudocode", lines: [1, 2] },
      phase: "initialization",
    });

    // ── Preparation gates ──────────────────────────────────────────────
    // Apply each gate sequentially, yielding a step after each one to
    // show how the state vector evolves. After two-qubit gates, we check
    // for entanglement and annotate accordingly.
    for (let i = 0; i < preparationGates.length; i++) {
      const { gate: gateName, qubits, angle } = preparationGates[i]!;

      // ── Apply the gate ─────────────────────────────────────────────
      if (qubits.length === 1) {
        const gateMatrix = getStandardGate(gateName, angle);
        if (!gateMatrix) throw new Error(`Unknown gate: "${gateName}"`);
        applySingleQubitGate(state, gateMatrix, qubits[0]!, numQubits);
      } else if (qubits.length === 2) {
        let gateMatrix;
        switch (gateName) {
          case "CNOT": gateMatrix = GATE_CNOT; break;
          case "CZ":   gateMatrix = GATE_CZ;   break;
          case "SWAP": gateMatrix = GATE_SWAP;  break;
          default: throw new Error(`Unknown 2-qubit gate: "${gateName}"`);
        }
        applyTwoQubitGate(state, gateMatrix, qubits[0]!, qubits[1]!, numQubits);
      }

      // Assert normalization after every gate to catch numerical errors early.
      assertNormalized(state, `after preparation gate ${i}: ${gateName}`);

      const probs = measurementProbabilities(state);
      const entangled = numQubits === 2 && state.length === 4 ? isEntangled(state) : false;

      // ── Build visual actions ───────────────────────────────────────
      const visualActions: VisualAction[] = [
        {
          type: "applyGate",
          gate: gateName,
          qubits: [...qubits],
          gateIndex: i,
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
      ];

      if (entangled) {
        visualActions.push({
          type: "showEntanglement",
          qubits: [0, 1],
          isEntangled: true,
        });
      }

      yield step({
        id: `prepare_gate_${i}`,
        title: `Prepare: Apply ${gateName}`,
        explanation:
          `Applying ${gateName} to qubit${qubits.length > 1 ? "s" : ""} ${qubits.join(", ")}. ` +
          (entangled
            ? "The qubits are now entangled — their measurement outcomes will be correlated!"
            : ""),
        state: {
          numQubits,
          stateVector: cloneState(state),
          probabilities: [...probs],
          basisLabels: [...labels],
          currentPhase: "preparation",
          classicalBits: [...classicalBits],
          entangled,
        },
        visualActions,
        codeHighlight: { language: "pseudocode", lines: [4, 5] },
        phase: "preparation",
      });
    }

    // ── Measurements ───────────────────────────────────────────────────
    // For each measurement, compute the Born rule probability of the
    // predetermined outcome, then project and renormalize. The state
    // vector collapses, and we record the classical bit.
    for (let m = 0; m < measurements.length; m++) {
      const { qubit, outcome } = measurements[m]!;

      // ── Compute probability of this outcome (Born rule) ────────────
      // qubitProbabilities returns [P(0), P(1)] for the specified qubit.
      const [p0, p1] = qubitProbabilities(state, qubit, numQubits);
      const outcomeProb = outcome === 0 ? p0 : p1;

      // ── Project and renormalize ────────────────────────────────────
      // All amplitudes inconsistent with qubit=outcome are set to zero.
      // The remaining amplitudes are rescaled so the state is normalized.
      state = projectAndNormalize(state, qubit, outcome, numQubits);
      assertNormalized(state, `after measuring qubit ${qubit} = ${outcome}`);
      classicalBits.push(outcome);

      const probs = measurementProbabilities(state);
      const isLast = m === measurements.length - 1;

      yield step({
        id: `measure_qubit_${qubit}`,
        title: `Measure Qubit ${qubit}`,
        explanation:
          `Measuring qubit ${qubit}: P(${outcome}) = ${(outcomeProb * 100).toFixed(1)}%. ` +
          `Result: ${outcome}. The state collapses — amplitudes inconsistent with ` +
          `qubit ${qubit} = ${outcome} are set to zero and the state is renormalized.`,
        state: {
          numQubits,
          stateVector: cloneState(state),
          probabilities: [...probs],
          basisLabels: [...labels],
          currentPhase: "measurement",
          classicalBits: [...classicalBits],
          measuredQubit: qubit,
          measuredOutcome: outcome,
          outcomeProb,
          entangled: false,
        },
        visualActions: [
          {
            type: "collapseState",
            qubit,
            outcome,
            probability: outcomeProb,
          },
          {
            type: "showClassicalBits",
            bits: [...classicalBits],
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
        ],
        codeHighlight: { language: "pseudocode", lines: [7, 8, 9] },
        phase: "measurement",
        isTerminal: isLast,
      });
    }
  },
});
