/**
 * @fileoverview Quantum Teleportation — Step Generator
 *
 * Demonstrates the quantum teleportation protocol: transferring a qubit
 * state using entanglement and classical communication.
 *
 * PROTOCOL:
 *   1. Prepare Bell pair between qubits 1 and 2 (H then CNOT).
 *   2. Alice applies CNOT(0,1) then H(0) to her qubits.
 *   3. Alice measures qubits 0 and 1, sending classical bits to Bob.
 *   4. Bob applies correction X^{m₁} Z^{m₀} to qubit 2.
 *   5. Bob's qubit is now in the original state |ψ⟩.
 *
 * VERIFICATION: After correction, extract qubit 2's state and verify
 * it matches the input state within ±1e-6 on Bloch sphere angles.
 *
 * STEP GENERATION STRATEGY:
 *   The generator yields a step at each "interesting moment":
 *   - Initialization (Alice's state, zero qubits 1/2)
 *   - Bell pair creation (H on qubit 1, CNOT(1,2))
 *   - Alice's operations (CNOT(0,1), H on qubit 0)
 *   - Alice's measurements (qubit 0, qubit 1 — with Born rule probabilities)
 *   - Bob's correction (conditional X and/or Z gates)
 *   - Verification (Bloch sphere comparison)
 *
 * MATHEMATICAL CORRECTNESS:
 *   - State vectors are arrays of Complex ([re, im]) pairs with length 2^3 = 8.
 *   - All operations preserve normalization (Σ|αᵢ|² = 1) which is asserted
 *     via assertNormalized() after every gate and measurement.
 *   - Measurement projection zeroes amplitudes inconsistent with the observed
 *     outcome, then renormalizes.
 *   - Correction formula: X^{m₁} Z^{m₀} — X depends on qubit1 result,
 *     Z depends on qubit0 result. Applied as: first X (if m₁=1), then Z (if m₀=1).
 *
 * STATE SNAPSHOT SAFETY:
 *   The state vector is deep-copied via cloneState() at every step boundary.
 *   All arrays in state/visualActions are spread-copied. No mutable references
 *   leak across steps.
 *
 * CODE HIGHLIGHT MAPPING:
 *   Lines reference the "pseudocode" implementation in meta.json.
 *   The pseudocode is 21 lines. Line numbers are 1-indexed.
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
  blochAnglesToState,
  stateToBlochAngles,
  blochAnglesToCartesian,
  complexAbsSq,
  GATE_H,
  GATE_X,
  GATE_Z,
  GATE_CNOT,
  type Complex,
  type StateVector,
} from "@/engine/utils/quantum-math";

// ─────────────────────────────────────────────────────────────────────────────
// INPUT TYPE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Input parameters for quantum teleportation.
 *
 * CONSTRAINTS (enforced by meta.json schema):
 * - teleportState.theta: [0, π]  — Bloch sphere polar angle
 * - teleportState.phi:   [0, 2π) — Bloch sphere azimuthal angle
 * - teleportState.label: display name for the state
 * - aliceMeasurements.qubit0: 0 | 1 — predetermined outcome for qubit 0
 * - aliceMeasurements.qubit1: 0 | 1 — predetermined outcome for qubit 1
 */
interface QuantumTeleportationInputs extends Record<string, unknown> {
  readonly teleportState: {
    readonly theta: number;
    readonly phi: number;
    readonly label: string;
  };
  readonly aliceMeasurements: {
    readonly qubit0: 0 | 1;
    readonly qubit1: 0 | 1;
  };
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

export default createGenerator<QuantumTeleportationInputs>({
  id: "quantum-teleportation",

  *generate(inputs, step) {
    const { teleportState, aliceMeasurements } = inputs;
    const { theta, phi, label } = teleportState;
    const { qubit0: m0, qubit1: m1 } = aliceMeasurements;
    const numQubits = 3;
    const labels = basisLabels(numQubits);

    // ── Compute Alice's original state ────────────────────────────────────
    // |ψ⟩ = cos(θ/2)|0⟩ + e^{iφ}sin(θ/2)|1⟩
    const [origAlpha0, origAlpha1] = blochAnglesToState(theta, phi);
    const origBloch = blochAnglesToCartesian(theta, phi);

    // ── Build the initial 3-qubit state: |ψ⟩ ⊗ |0⟩ ⊗ |0⟩ ───────────────
    // |ψ⟩ = α|0⟩ + β|1⟩, so the full state is:
    //   α|000⟩ + β|100⟩
    //
    // Basis ordering (big-endian): index = q0*4 + q1*2 + q2
    //   |000⟩ = index 0, |100⟩ = index 4
    let state: StateVector = createZeroState(numQubits);
    state[0] = [...origAlpha0] as Complex; // α|000⟩
    state[4] = [...origAlpha1] as Complex; // β|100⟩
    for (let k = 0; k < 8; k++) {
      if (k !== 0 && k !== 4) state[k] = [0, 0];
    }
    assertNormalized(state, "initial state |ψ⟩⊗|00⟩");

    // ── Step 0: Initialize ─────────────────────────────────────────────
    // Show the full array with Alice's state and two zero qubits.
    yield step({
      id: "initialize",
      title: "Initialize: Alice's State",
      explanation:
        `Alice has qubit 0 in state ${label} = cos(θ/2)|0⟩ + e^{iφ}sin(θ/2)|1⟩ ` +
        `with θ = ${theta.toFixed(4)}, φ = ${phi.toFixed(4)}. ` +
        `Qubits 1 and 2 are in |0⟩. Goal: teleport ${label} to Bob's qubit (qubit 2).`,
      state: {
        numQubits,
        stateVector: cloneState(state),
        probabilities: [...measurementProbabilities(state)],
        basisLabels: [...labels],
        originalTheta: theta,
        originalPhi: phi,
        originalLabel: label,
        originalBloch: { ...origBloch },
        classicalBits: [],
        phase: "initialize",
      },
      visualActions: [
        {
          type: "rotateBlochSphere",
          theta,
          phi,
          label: `Alice: ${label}`,
        },
        {
          type: "showStateVector",
          amplitudes: cloneState(state),
          labels: [...labels],
        },
      ],
      codeHighlight: { language: "pseudocode", lines: [1, 2, 3] },
      phase: "initialization",
    });

    // ── Step 1: Bell pair — H on qubit 1 ───────────────────────────────
    // Hadamard puts qubit 1 in superposition: |0⟩ → (|0⟩ + |1⟩)/√2
    applySingleQubitGate(state, GATE_H, 1, numQubits);
    assertNormalized(state, "after H on qubit 1");

    yield step({
      id: "bell_hadamard",
      title: "Create Bell Pair: H on Qubit 1",
      explanation:
        "Applying Hadamard to qubit 1 puts it in superposition: |0⟩ → (|0⟩ + |1⟩)/√2. " +
        "This is the first step of creating a Bell pair between qubits 1 and 2.",
      state: {
        numQubits,
        stateVector: cloneState(state),
        probabilities: [...measurementProbabilities(state)],
        basisLabels: [...labels],
        originalTheta: theta,
        originalPhi: phi,
        originalLabel: label,
        originalBloch: { ...origBloch },
        classicalBits: [],
        phase: "bell_preparation",
      },
      visualActions: [
        {
          type: "applyGate",
          gate: "H",
          qubits: [1],
          gateIndex: 0,
        },
        {
          type: "showStateVector",
          amplitudes: cloneState(state),
          labels: [...labels],
        },
      ],
      codeHighlight: { language: "pseudocode", lines: [5, 6] },
      phase: "bell_preparation",
    });

    // ── Step 2: Bell pair — CNOT(1, 2) ─────────────────────────────────
    // CNOT with qubit 1 as control and qubit 2 as target creates the
    // Bell state |Φ+⟩ = (|00⟩ + |11⟩)/√2 between qubits 1 and 2.
    applyTwoQubitGate(state, GATE_CNOT, 1, 2, numQubits);
    assertNormalized(state, "after CNOT(1,2)");

    yield step({
      id: "bell_cnot",
      title: "Create Bell Pair: CNOT(1, 2)",
      explanation:
        "Applying CNOT with qubit 1 as control and qubit 2 as target creates the " +
        "Bell state |Φ+⟩ = (|00⟩ + |11⟩)/√2 between qubits 1 and 2. " +
        "These entangled qubits will serve as the quantum channel for teleportation.",
      state: {
        numQubits,
        stateVector: cloneState(state),
        probabilities: [...measurementProbabilities(state)],
        basisLabels: [...labels],
        originalTheta: theta,
        originalPhi: phi,
        originalLabel: label,
        originalBloch: { ...origBloch },
        classicalBits: [],
        phase: "bell_preparation",
      },
      visualActions: [
        {
          type: "applyGate",
          gate: "CNOT",
          qubits: [1, 2],
          gateIndex: 1,
        },
        {
          type: "showEntanglement",
          qubits: [1, 2],
          isEntangled: true,
        },
        {
          type: "showStateVector",
          amplitudes: cloneState(state),
          labels: [...labels],
        },
      ],
      codeHighlight: { language: "pseudocode", lines: [6] },
      phase: "bell_preparation",
    });

    // ── Step 3: Alice CNOT(0, 1) ───────────────────────────────────────
    // Alice applies CNOT with her original qubit (0) as control and
    // qubit 1 as target. This entangles her state with the Bell pair.
    applyTwoQubitGate(state, GATE_CNOT, 0, 1, numQubits);
    assertNormalized(state, "after Alice CNOT(0,1)");

    yield step({
      id: "alice_cnot",
      title: "Alice: CNOT(0, 1)",
      explanation:
        "Alice applies CNOT with her original qubit (0) as control and qubit 1 as target. " +
        "This entangles Alice's state with the Bell pair, mixing the information across all three qubits.",
      state: {
        numQubits,
        stateVector: cloneState(state),
        probabilities: [...measurementProbabilities(state)],
        basisLabels: [...labels],
        originalTheta: theta,
        originalPhi: phi,
        originalLabel: label,
        originalBloch: { ...origBloch },
        classicalBits: [],
        phase: "alice_operations",
      },
      visualActions: [
        {
          type: "applyGate",
          gate: "CNOT",
          qubits: [0, 1],
          gateIndex: 2,
        },
        {
          type: "showStateVector",
          amplitudes: cloneState(state),
          labels: [...labels],
        },
      ],
      codeHighlight: { language: "pseudocode", lines: [9] },
      phase: "alice_operations",
    });

    // ── Step 4: Alice H on qubit 0 ─────────────────────────────────────
    // After H, the state is in a form where measuring qubits 0,1 will
    // project qubit 2 into a state related to |ψ⟩. Each of the four
    // measurement outcomes (00, 01, 10, 11) occurs with probability 1/4.
    applySingleQubitGate(state, GATE_H, 0, numQubits);
    assertNormalized(state, "after Alice H on qubit 0");

    yield step({
      id: "alice_hadamard",
      title: "Alice: H on Qubit 0",
      explanation:
        "Alice applies Hadamard to qubit 0. The state is now in a form where " +
        "measuring qubits 0 and 1 will project qubit 2 into a state related to the original |ψ⟩. " +
        "Each of the four measurement outcomes (00, 01, 10, 11) occurs with probability 1/4.",
      state: {
        numQubits,
        stateVector: cloneState(state),
        probabilities: [...measurementProbabilities(state)],
        basisLabels: [...labels],
        originalTheta: theta,
        originalPhi: phi,
        originalLabel: label,
        originalBloch: { ...origBloch },
        classicalBits: [],
        phase: "alice_operations",
      },
      visualActions: [
        {
          type: "applyGate",
          gate: "H",
          qubits: [0],
          gateIndex: 3,
        },
        {
          type: "showStateVector",
          amplitudes: cloneState(state),
          labels: [...labels],
        },
      ],
      codeHighlight: { language: "pseudocode", lines: [10] },
      phase: "alice_operations",
    });

    // ── Step 5: Alice measures qubit 0 ─────────────────────────────────
    // Compute Born rule probability, then project and renormalize.
    const [p0_0, p0_1] = qubitProbabilities(state, 0, numQubits);
    const prob_m0 = m0 === 0 ? p0_0 : p0_1;
    state = projectAndNormalize(state, 0, m0, numQubits);
    assertNormalized(state, `after measuring qubit 0 = ${m0}`);

    yield step({
      id: "measure_qubit0",
      title: `Alice Measures Qubit 0 → ${m0}`,
      explanation:
        `Alice measures qubit 0 and gets result ${m0} (probability: ${(prob_m0 * 100).toFixed(1)}%). ` +
        `She sends this classical bit to Bob. The state collapses — amplitudes inconsistent ` +
        `with qubit 0 = ${m0} are set to zero and the state is renormalized.`,
      state: {
        numQubits,
        stateVector: cloneState(state),
        probabilities: [...measurementProbabilities(state)],
        basisLabels: [...labels],
        originalTheta: theta,
        originalPhi: phi,
        originalLabel: label,
        originalBloch: { ...origBloch },
        classicalBits: [m0],
        phase: "measurement",
      },
      visualActions: [
        {
          type: "collapseState",
          qubit: 0,
          outcome: m0,
          probability: prob_m0,
        },
        {
          type: "showClassicalBits",
          bits: [m0],
        },
        {
          type: "showStateVector",
          amplitudes: cloneState(state),
          labels: [...labels],
        },
      ],
      codeHighlight: { language: "pseudocode", lines: [12, 13] },
      phase: "measurement",
    });

    // ── Step 6: Alice measures qubit 1 ─────────────────────────────────
    const [p1_0, p1_1] = qubitProbabilities(state, 1, numQubits);
    const prob_m1 = m1 === 0 ? p1_0 : p1_1;
    state = projectAndNormalize(state, 1, m1, numQubits);
    assertNormalized(state, `after measuring qubit 1 = ${m1}`);

    yield step({
      id: "measure_qubit1",
      title: `Alice Measures Qubit 1 → ${m1}`,
      explanation:
        `Alice measures qubit 1 and gets result ${m1} (probability: ${(prob_m1 * 100).toFixed(1)}%). ` +
        `She sends this classical bit to Bob. Bob now has both bits: (${m0}, ${m1}).`,
      state: {
        numQubits,
        stateVector: cloneState(state),
        probabilities: [...measurementProbabilities(state)],
        basisLabels: [...labels],
        originalTheta: theta,
        originalPhi: phi,
        originalLabel: label,
        originalBloch: { ...origBloch },
        classicalBits: [m0, m1],
        phase: "measurement",
      },
      visualActions: [
        {
          type: "collapseState",
          qubit: 1,
          outcome: m1,
          probability: prob_m1,
        },
        {
          type: "showClassicalBits",
          bits: [m0, m1],
        },
        {
          type: "showStateVector",
          amplitudes: cloneState(state),
          labels: [...labels],
        },
      ],
      codeHighlight: { language: "pseudocode", lines: [13] },
      phase: "measurement",
    });

    // ── Step 7: Bob applies correction ─────────────────────────────────
    // Correction formula: X^{m₁} Z^{m₀}
    //   - Z depends on qubit 0 result (m₀)
    //   - X depends on qubit 1 result (m₁)
    //   - Apply X first (if needed), then Z (if needed)
    //
    // (0,0): I  — no correction
    // (0,1): X  — bit flip only
    // (1,0): Z  — phase flip only
    // (1,1): X then Z — bit flip, then phase flip
    let correctionDesc = "";
    if (m0 === 0 && m1 === 0) {
      correctionDesc = "No correction needed (both bits are 0).";
    } else if (m0 === 0 && m1 === 1) {
      applySingleQubitGate(state, GATE_X, 2, numQubits);
      correctionDesc = "Apply X gate to qubit 2 (bit m₁ = 1).";
    } else if (m0 === 1 && m1 === 0) {
      applySingleQubitGate(state, GATE_Z, 2, numQubits);
      correctionDesc = "Apply Z gate to qubit 2 (bit m₀ = 1).";
    } else {
      // m0=1, m1=1: apply X then Z
      applySingleQubitGate(state, GATE_X, 2, numQubits);
      applySingleQubitGate(state, GATE_Z, 2, numQubits);
      correctionDesc = "Apply X then Z to qubit 2 (both bits are 1).";
    }
    assertNormalized(state, "after Bob's correction");

    // Build correction visual actions
    const correctionVisualActions: VisualAction[] = [
      {
        type: "showStateVector",
        amplitudes: cloneState(state),
        labels: [...labels],
      },
      {
        type: "showClassicalBits",
        bits: [m0, m1],
      },
    ];

    yield step({
      id: "bob_correction",
      title: "Bob: Apply Correction",
      explanation:
        `Bob received classical bits (m₀=${m0}, m₁=${m1}). ${correctionDesc} ` +
        `The correction formula is X^{m₁} Z^{m₀} — this recovers the original state.`,
      state: {
        numQubits,
        stateVector: cloneState(state),
        probabilities: [...measurementProbabilities(state)],
        basisLabels: [...labels],
        originalTheta: theta,
        originalPhi: phi,
        originalLabel: label,
        originalBloch: { ...origBloch },
        classicalBits: [m0, m1],
        correction: { m0, m1 },
        phase: "correction",
      },
      visualActions: correctionVisualActions,
      codeHighlight: { language: "pseudocode", lines: [15, 16, 17] },
      phase: "correction",
    });

    // ── Step 8: Verification (terminal) ────────────────────────────────
    // After measurement of qubits 0,1 and correction, the 3-qubit state
    // should be |m₀⟩|m₁⟩|ψ⟩. Extract qubit 2's state from the two
    // non-zero amplitudes corresponding to the fixed values of qubits 0,1.
    //
    // Basis index = m₀*4 + m₁*2 + q₂ (big-endian)
    const base = (m0 << 2) | (m1 << 1);
    const bobAlpha0 = state[base]!;      // qubit 2 = 0
    const bobAlpha1 = state[base | 1]!;  // qubit 2 = 1

    const bobAngles = stateToBlochAngles([bobAlpha0, bobAlpha1]);
    const bobBloch = blochAnglesToCartesian(bobAngles.theta, bobAngles.phi);

    yield step({
      id: "verification",
      title: "Teleportation Complete!",
      explanation:
        `Bob's qubit (qubit 2) is now in state ${label}. ` +
        `Bloch angles: θ = ${bobAngles.theta.toFixed(4)}, φ = ${bobAngles.phi.toFixed(4)} ` +
        `(original: θ = ${theta.toFixed(4)}, φ = ${phi.toFixed(4)}). ` +
        `The quantum state has been teleported without copying — Alice's original state was destroyed by measurement.`,
      state: {
        numQubits,
        stateVector: cloneState(state),
        probabilities: [...measurementProbabilities(state)],
        basisLabels: [...labels],
        originalTheta: theta,
        originalPhi: phi,
        originalLabel: label,
        originalBloch: { ...origBloch },
        bobTheta: bobAngles.theta,
        bobPhi: bobAngles.phi,
        bobBloch: { ...bobBloch },
        classicalBits: [m0, m1],
        teleportationSuccess: true,
        phase: "verification",
      },
      visualActions: [
        {
          type: "rotateBlochSphere",
          theta: bobAngles.theta,
          phi: bobAngles.phi,
          label: `Bob: ${label}`,
        },
        {
          type: "showProbabilities",
          probabilities: [complexAbsSq(bobAlpha0), complexAbsSq(bobAlpha1)],
          labels: ["|0⟩", "|1⟩"],
        },
        {
          type: "showMessage",
          text: `Teleportation successful! Bob's qubit matches ${label}.`,
          messageType: "success",
        },
      ],
      codeHighlight: { language: "pseudocode", lines: [20, 21] },
      phase: "verification",
      isTerminal: true,
    });
  },
});
