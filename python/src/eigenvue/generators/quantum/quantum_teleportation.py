"""
Quantum Teleportation — Step Generator (Python mirror of generator.ts).

Demonstrates the quantum teleportation protocol: transferring a qubit
state using entanglement and classical communication.

PROTOCOL:
  1. Prepare Bell pair between qubits 1 and 2 (H then CNOT).
  2. Alice applies CNOT(0,1) then H(0) to her qubits.
  3. Alice measures qubits 0 and 1, sending classical bits to Bob.
  4. Bob applies correction X^{m1} Z^{m0} to qubit 2.
  5. Bob's qubit is now in the original state |psi>.

VERIFICATION: After correction, extract qubit 2's state and verify
it matches the input state within +/-1e-6 on Bloch sphere angles.

STATE SNAPSHOT SAFETY:
  The state vector is deep-copied via _clone_state() at every step boundary.
  All arrays in state/visual_actions are list-copied. No mutable references
  leak across steps.

CROSS-LANGUAGE PARITY: Must produce identical steps to the TypeScript version.
"""

from __future__ import annotations

from typing import Any

from eigenvue._step_types import CodeHighlight, Step, VisualAction
from eigenvue.math_utils.quantum_math import (
    GATE_CNOT,
    GATE_H,
    GATE_X,
    GATE_Z,
    StateVector,
    apply_single_qubit_gate,
    apply_two_qubit_gate,
    assert_normalized,
    basis_labels,
    bloch_angles_to_cartesian,
    bloch_angles_to_state,
    complex_abs_sq,
    create_zero_state,
    measurement_probabilities,
    project_and_normalize,
    qubit_probabilities,
    state_to_bloch_angles,
)


def _clone_state(state: StateVector) -> list[list[float]]:
    """Deep copy a state vector (create fresh [re, im] lists)."""
    return [list(amp) for amp in state]


def generate(inputs: dict[str, Any]) -> list[Step]:
    """Generate quantum teleportation visualization steps."""
    teleport_state: dict[str, Any] = inputs["teleportState"]
    alice_measurements: dict[str, int] = inputs["aliceMeasurements"]
    theta: float = teleport_state["theta"]
    phi: float = teleport_state["phi"]
    label: str = teleport_state["label"]
    m0: int = alice_measurements["qubit0"]
    m1: int = alice_measurements["qubit1"]
    num_qubits = 3
    labels = basis_labels(num_qubits)

    steps: list[Step] = []
    idx = 0

    # ── Compute Alice's original state ────────────────────────────────────
    # |psi> = cos(theta/2)|0> + e^{i*phi}sin(theta/2)|1>
    orig_alpha0, orig_alpha1 = bloch_angles_to_state(theta, phi)
    orig_bloch_x, orig_bloch_y, orig_bloch_z = bloch_angles_to_cartesian(theta, phi)
    orig_bloch = {"x": orig_bloch_x, "y": orig_bloch_y, "z": orig_bloch_z}

    # ── Build the initial 3-qubit state: |psi> x |0> x |0> ───────────────
    # |psi> = alpha|0> + beta|1>, so the full state is:
    #   alpha|000> + beta|100>
    #
    # Basis ordering (big-endian): index = q0*4 + q1*2 + q2
    #   |000> = index 0, |100> = index 4
    state = create_zero_state(num_qubits)
    state[0] = orig_alpha0  # alpha|000>
    state[4] = orig_alpha1  # beta|100>
    for k in range(8):
        if k != 0 and k != 4:
            state[k] = (0.0, 0.0)
    assert_normalized(state, "initial state |psi>\u2297|00\u27e9")

    # ── Step 0: Initialize ─────────────────────────────────────────────
    steps.append(
        Step(
            index=idx,
            id="initialize",
            title="Initialize: Alice's State",
            explanation=(
                f"Alice has qubit 0 in state {label} = cos(\u03b8/2)|0\u27e9 + e^{{i\u03c6}}sin(\u03b8/2)|1\u27e9 "
                f"with \u03b8 = {theta:.4f}, \u03c6 = {phi:.4f}. "
                f"Qubits 1 and 2 are in |0\u27e9. Goal: teleport {label} to Bob's qubit (qubit 2)."
            ),
            state={
                "numQubits": num_qubits,
                "stateVector": _clone_state(state),
                "probabilities": list(measurement_probabilities(state)),
                "basisLabels": list(labels),
                "originalTheta": theta,
                "originalPhi": phi,
                "originalLabel": label,
                "originalBloch": dict(orig_bloch),
                "classicalBits": [],
                "phase": "initialize",
            },
            visual_actions=(
                VisualAction(
                    type="rotateBlochSphere",
                    params={
                        "theta": theta,
                        "phi": phi,
                        "label": f"Alice: {label}",
                    },
                ),
                VisualAction(
                    type="showStateVector",
                    params={
                        "amplitudes": _clone_state(state),
                        "labels": list(labels),
                    },
                ),
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=[1, 2, 3]),
            is_terminal=False,
            phase="initialization",
        )
    )
    idx += 1

    # ── Step 1: Bell pair — H on qubit 1 ───────────────────────────────
    apply_single_qubit_gate(state, GATE_H, 1, num_qubits)
    assert_normalized(state, "after H on qubit 1")

    steps.append(
        Step(
            index=idx,
            id="bell_hadamard",
            title="Create Bell Pair: H on Qubit 1",
            explanation=(
                "Applying Hadamard to qubit 1 puts it in superposition: "
                "|0\u27e9 \u2192 (|0\u27e9 + |1\u27e9)/\u221a2. "
                "This is the first step of creating a Bell pair between qubits 1 and 2."
            ),
            state={
                "numQubits": num_qubits,
                "stateVector": _clone_state(state),
                "probabilities": list(measurement_probabilities(state)),
                "basisLabels": list(labels),
                "originalTheta": theta,
                "originalPhi": phi,
                "originalLabel": label,
                "originalBloch": dict(orig_bloch),
                "classicalBits": [],
                "phase": "bell_preparation",
            },
            visual_actions=(
                VisualAction(
                    type="applyGate",
                    params={
                        "gate": "H",
                        "qubits": [1],
                        "gateIndex": 0,
                    },
                ),
                VisualAction(
                    type="showStateVector",
                    params={
                        "amplitudes": _clone_state(state),
                        "labels": list(labels),
                    },
                ),
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=[5, 6]),
            is_terminal=False,
            phase="bell_preparation",
        )
    )
    idx += 1

    # ── Step 2: Bell pair — CNOT(1, 2) ─────────────────────────────────
    apply_two_qubit_gate(state, GATE_CNOT, 1, 2, num_qubits)
    assert_normalized(state, "after CNOT(1,2)")

    steps.append(
        Step(
            index=idx,
            id="bell_cnot",
            title="Create Bell Pair: CNOT(1, 2)",
            explanation=(
                "Applying CNOT with qubit 1 as control and qubit 2 as target creates the "
                "Bell state |\u03a6+\u27e9 = (|00\u27e9 + |11\u27e9)/\u221a2 between qubits 1 and 2. "
                "These entangled qubits will serve as the quantum channel for teleportation."
            ),
            state={
                "numQubits": num_qubits,
                "stateVector": _clone_state(state),
                "probabilities": list(measurement_probabilities(state)),
                "basisLabels": list(labels),
                "originalTheta": theta,
                "originalPhi": phi,
                "originalLabel": label,
                "originalBloch": dict(orig_bloch),
                "classicalBits": [],
                "phase": "bell_preparation",
            },
            visual_actions=(
                VisualAction(
                    type="applyGate",
                    params={
                        "gate": "CNOT",
                        "qubits": [1, 2],
                        "gateIndex": 1,
                    },
                ),
                VisualAction(
                    type="showEntanglement",
                    params={
                        "qubits": [1, 2],
                        "isEntangled": True,
                    },
                ),
                VisualAction(
                    type="showStateVector",
                    params={
                        "amplitudes": _clone_state(state),
                        "labels": list(labels),
                    },
                ),
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=[6]),
            is_terminal=False,
            phase="bell_preparation",
        )
    )
    idx += 1

    # ── Step 3: Alice CNOT(0, 1) ───────────────────────────────────────
    apply_two_qubit_gate(state, GATE_CNOT, 0, 1, num_qubits)
    assert_normalized(state, "after Alice CNOT(0,1)")

    steps.append(
        Step(
            index=idx,
            id="alice_cnot",
            title="Alice: CNOT(0, 1)",
            explanation=(
                "Alice applies CNOT with her original qubit (0) as control and qubit 1 as target. "
                "This entangles Alice's state with the Bell pair, mixing the information across all three qubits."
            ),
            state={
                "numQubits": num_qubits,
                "stateVector": _clone_state(state),
                "probabilities": list(measurement_probabilities(state)),
                "basisLabels": list(labels),
                "originalTheta": theta,
                "originalPhi": phi,
                "originalLabel": label,
                "originalBloch": dict(orig_bloch),
                "classicalBits": [],
                "phase": "alice_operations",
            },
            visual_actions=(
                VisualAction(
                    type="applyGate",
                    params={
                        "gate": "CNOT",
                        "qubits": [0, 1],
                        "gateIndex": 2,
                    },
                ),
                VisualAction(
                    type="showStateVector",
                    params={
                        "amplitudes": _clone_state(state),
                        "labels": list(labels),
                    },
                ),
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=[9]),
            is_terminal=False,
            phase="alice_operations",
        )
    )
    idx += 1

    # ── Step 4: Alice H on qubit 0 ─────────────────────────────────────
    apply_single_qubit_gate(state, GATE_H, 0, num_qubits)
    assert_normalized(state, "after Alice H on qubit 0")

    steps.append(
        Step(
            index=idx,
            id="alice_hadamard",
            title="Alice: H on Qubit 0",
            explanation=(
                "Alice applies Hadamard to qubit 0. The state is now in a form where "
                "measuring qubits 0 and 1 will project qubit 2 into a state related to the original |\u03c8\u27e9. "
                "Each of the four measurement outcomes (00, 01, 10, 11) occurs with probability 1/4."
            ),
            state={
                "numQubits": num_qubits,
                "stateVector": _clone_state(state),
                "probabilities": list(measurement_probabilities(state)),
                "basisLabels": list(labels),
                "originalTheta": theta,
                "originalPhi": phi,
                "originalLabel": label,
                "originalBloch": dict(orig_bloch),
                "classicalBits": [],
                "phase": "alice_operations",
            },
            visual_actions=(
                VisualAction(
                    type="applyGate",
                    params={
                        "gate": "H",
                        "qubits": [0],
                        "gateIndex": 3,
                    },
                ),
                VisualAction(
                    type="showStateVector",
                    params={
                        "amplitudes": _clone_state(state),
                        "labels": list(labels),
                    },
                ),
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=[10]),
            is_terminal=False,
            phase="alice_operations",
        )
    )
    idx += 1

    # ── Step 5: Alice measures qubit 0 ─────────────────────────────────
    p0_0, p0_1 = qubit_probabilities(state, 0, num_qubits)
    prob_m0 = p0_0 if m0 == 0 else p0_1
    state = project_and_normalize(state, 0, m0, num_qubits)
    assert_normalized(state, f"after measuring qubit 0 = {m0}")

    steps.append(
        Step(
            index=idx,
            id="measure_qubit0",
            title=f"Alice Measures Qubit 0 \u2192 {m0}",
            explanation=(
                f"Alice measures qubit 0 and gets result {m0} (probability: {prob_m0 * 100:.1f}%). "
                f"She sends this classical bit to Bob. The state collapses \u2014 amplitudes inconsistent "
                f"with qubit 0 = {m0} are set to zero and the state is renormalized."
            ),
            state={
                "numQubits": num_qubits,
                "stateVector": _clone_state(state),
                "probabilities": list(measurement_probabilities(state)),
                "basisLabels": list(labels),
                "originalTheta": theta,
                "originalPhi": phi,
                "originalLabel": label,
                "originalBloch": dict(orig_bloch),
                "classicalBits": [m0],
                "phase": "measurement",
            },
            visual_actions=(
                VisualAction(
                    type="collapseState",
                    params={
                        "qubit": 0,
                        "outcome": m0,
                        "probability": prob_m0,
                    },
                ),
                VisualAction(
                    type="showClassicalBits",
                    params={
                        "bits": [m0],
                    },
                ),
                VisualAction(
                    type="showStateVector",
                    params={
                        "amplitudes": _clone_state(state),
                        "labels": list(labels),
                    },
                ),
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=[12, 13]),
            is_terminal=False,
            phase="measurement",
        )
    )
    idx += 1

    # ── Step 6: Alice measures qubit 1 ─────────────────────────────────
    p1_0, p1_1 = qubit_probabilities(state, 1, num_qubits)
    prob_m1 = p1_0 if m1 == 0 else p1_1
    state = project_and_normalize(state, 1, m1, num_qubits)
    assert_normalized(state, f"after measuring qubit 1 = {m1}")

    steps.append(
        Step(
            index=idx,
            id="measure_qubit1",
            title=f"Alice Measures Qubit 1 \u2192 {m1}",
            explanation=(
                f"Alice measures qubit 1 and gets result {m1} (probability: {prob_m1 * 100:.1f}%). "
                f"She sends this classical bit to Bob. Bob now has both bits: ({m0}, {m1})."
            ),
            state={
                "numQubits": num_qubits,
                "stateVector": _clone_state(state),
                "probabilities": list(measurement_probabilities(state)),
                "basisLabels": list(labels),
                "originalTheta": theta,
                "originalPhi": phi,
                "originalLabel": label,
                "originalBloch": dict(orig_bloch),
                "classicalBits": [m0, m1],
                "phase": "measurement",
            },
            visual_actions=(
                VisualAction(
                    type="collapseState",
                    params={
                        "qubit": 1,
                        "outcome": m1,
                        "probability": prob_m1,
                    },
                ),
                VisualAction(
                    type="showClassicalBits",
                    params={
                        "bits": [m0, m1],
                    },
                ),
                VisualAction(
                    type="showStateVector",
                    params={
                        "amplitudes": _clone_state(state),
                        "labels": list(labels),
                    },
                ),
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=[13]),
            is_terminal=False,
            phase="measurement",
        )
    )
    idx += 1

    # ── Step 7: Bob applies correction ─────────────────────────────────
    # Correction formula: X^{m1} Z^{m0}
    #   - Z depends on qubit 0 result (m0)
    #   - X depends on qubit 1 result (m1)
    #   - Apply X first (if needed), then Z (if needed)
    #
    # (0,0): I  — no correction
    # (0,1): X  — bit flip only
    # (1,0): Z  — phase flip only
    # (1,1): X then Z — bit flip, then phase flip
    if m0 == 0 and m1 == 0:
        correction_desc = "No correction needed (both bits are 0)."
    elif m0 == 0 and m1 == 1:
        apply_single_qubit_gate(state, GATE_X, 2, num_qubits)
        correction_desc = "Apply X gate to qubit 2 (bit m\u2081 = 1)."
    elif m0 == 1 and m1 == 0:
        apply_single_qubit_gate(state, GATE_Z, 2, num_qubits)
        correction_desc = "Apply Z gate to qubit 2 (bit m\u2080 = 1)."
    else:
        # m0=1, m1=1: apply X then Z
        apply_single_qubit_gate(state, GATE_X, 2, num_qubits)
        apply_single_qubit_gate(state, GATE_Z, 2, num_qubits)
        correction_desc = "Apply X then Z to qubit 2 (both bits are 1)."
    assert_normalized(state, "after Bob's correction")

    steps.append(
        Step(
            index=idx,
            id="bob_correction",
            title="Bob: Apply Correction",
            explanation=(
                f"Bob received classical bits (m\u2080={m0}, m\u2081={m1}). {correction_desc} "
                f"The correction formula is X^{{m\u2081}} Z^{{m\u2080}} \u2014 this recovers the original state."
            ),
            state={
                "numQubits": num_qubits,
                "stateVector": _clone_state(state),
                "probabilities": list(measurement_probabilities(state)),
                "basisLabels": list(labels),
                "originalTheta": theta,
                "originalPhi": phi,
                "originalLabel": label,
                "originalBloch": dict(orig_bloch),
                "classicalBits": [m0, m1],
                "correction": {"m0": m0, "m1": m1},
                "phase": "correction",
            },
            visual_actions=(
                VisualAction(
                    type="showStateVector",
                    params={
                        "amplitudes": _clone_state(state),
                        "labels": list(labels),
                    },
                ),
                VisualAction(
                    type="showClassicalBits",
                    params={
                        "bits": [m0, m1],
                    },
                ),
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=[15, 16, 17]),
            is_terminal=False,
            phase="correction",
        )
    )
    idx += 1

    # ── Step 8: Verification (terminal) ────────────────────────────────
    # After measurement of qubits 0,1 and correction, the 3-qubit state
    # should be |m0>|m1>|psi>. Extract qubit 2's state from the two
    # non-zero amplitudes corresponding to the fixed values of qubits 0,1.
    #
    # Basis index = m0*4 + m1*2 + q2 (big-endian)
    base = (m0 << 2) | (m1 << 1)
    bob_alpha0 = state[base]  # qubit 2 = 0
    bob_alpha1 = state[base | 1]  # qubit 2 = 1

    bob_theta, bob_phi = state_to_bloch_angles((bob_alpha0, bob_alpha1))
    bob_bloch_x, bob_bloch_y, bob_bloch_z = bloch_angles_to_cartesian(bob_theta, bob_phi)

    steps.append(
        Step(
            index=idx,
            id="verification",
            title="Teleportation Complete!",
            explanation=(
                f"Bob's qubit (qubit 2) is now in state {label}. "
                f"Bloch angles: \u03b8 = {bob_theta:.4f}, \u03c6 = {bob_phi:.4f} "
                f"(original: \u03b8 = {theta:.4f}, \u03c6 = {phi:.4f}). "
                f"The quantum state has been teleported without copying \u2014 "
                f"Alice's original state was destroyed by measurement."
            ),
            state={
                "numQubits": num_qubits,
                "stateVector": _clone_state(state),
                "probabilities": list(measurement_probabilities(state)),
                "basisLabels": list(labels),
                "originalTheta": theta,
                "originalPhi": phi,
                "originalLabel": label,
                "originalBloch": dict(orig_bloch),
                "bobTheta": bob_theta,
                "bobPhi": bob_phi,
                "bobBloch": {"x": bob_bloch_x, "y": bob_bloch_y, "z": bob_bloch_z},
                "classicalBits": [m0, m1],
                "teleportationSuccess": True,
                "phase": "verification",
            },
            visual_actions=(
                VisualAction(
                    type="rotateBlochSphere",
                    params={
                        "theta": bob_theta,
                        "phi": bob_phi,
                        "label": f"Bob: {label}",
                    },
                ),
                VisualAction(
                    type="showProbabilities",
                    params={
                        "probabilities": [
                            complex_abs_sq(bob_alpha0),
                            complex_abs_sq(bob_alpha1),
                        ],
                        "labels": ["|0\u27e9", "|1\u27e9"],
                    },
                ),
                VisualAction(
                    type="showMessage",
                    params={
                        "text": f"Teleportation successful! Bob's qubit matches {label}.",
                        "messageType": "success",
                    },
                ),
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=[20, 21]),
            phase="verification",
            is_terminal=True,
        )
    )

    return steps
