"""
Quantum Gates & Circuits — Step Generator (Python mirror of generator.ts).

Generates a step-by-step visualization of quantum gate operations on
a multi-qubit state vector. Each gate is applied sequentially, with
the state vector and probabilities updated after each application.

ALGORITHM:
  1. Initialize the |0...0⟩ state vector for n qubits.
  2. For each gate in the sequence:
     a. Apply the gate using quantum-math library functions.
     b. Verify normalization (assert_normalized).
     c. Record the updated state vector and probabilities.
  3. Yield a step for initialization and after each gate application.

STATE SNAPSHOT SAFETY:
  State vectors are deep-copied (map to new [re, im] lists) at every step.
  Gate sequences are list-copied.

CROSS-LANGUAGE PARITY: Must produce identical steps to the TypeScript version.
"""

from __future__ import annotations

from typing import Any

from eigenvue._step_types import CodeHighlight, Step, VisualAction
from eigenvue.math_utils.quantum_math import (
    GATE_CNOT,
    GATE_CZ,
    GATE_SWAP,
    StateVector,
    apply_single_qubit_gate,
    apply_two_qubit_gate,
    assert_normalized,
    basis_labels,
    create_zero_state,
    get_standard_gate,
    measurement_probabilities,
)


def _clone_state(state: StateVector) -> list[list[float]]:
    """Deep copy a state vector (create fresh [re, im] lists)."""
    return [list(amp) for amp in state]


def _gate_description(gate_name: str, qubits: list[int]) -> str:
    """Get a human-readable description of what a gate does."""
    qubit_str = (
        f"qubit {qubits[0]}" if len(qubits) == 1 else f"qubits {', '.join(str(q) for q in qubits)}"
    )

    if gate_name == "H":
        return f"Hadamard gate on {qubit_str}: creates superposition by rotating the state. H|0\u27e9 = |+\u27e9, H|1\u27e9 = |\u2212\u27e9."
    if gate_name == "X":
        return f"Pauli-X (NOT) gate on {qubit_str}: flips |0\u27e9 \u2194 |1\u27e9."
    if gate_name == "Y":
        return f"Pauli-Y gate on {qubit_str}: rotation by \u03c0 around the Y axis."
    if gate_name == "Z":
        return (
            f"Pauli-Z gate on {qubit_str}: flips the phase of |1\u27e9. Z|1\u27e9 = \u2212|1\u27e9."
        )
    if gate_name == "S":
        return f"Phase gate (S) on {qubit_str}: adds a \u03c0/2 phase to |1\u27e9."
    if gate_name == "T":
        return f"T gate on {qubit_str}: adds a \u03c0/4 phase to |1\u27e9."
    if gate_name == "CNOT" and len(qubits) >= 2:
        return f"CNOT gate: qubit {qubits[0]} controls, qubit {qubits[1]} is target. Flips target when control is |1\u27e9."
    if gate_name == "CZ":
        return f"CZ gate on {qubit_str}: adds a phase flip when both qubits are |1\u27e9."
    if gate_name == "SWAP":
        return f"SWAP gate on {qubit_str}: exchanges the states of the two qubits."
    return f"{gate_name} gate on {qubit_str}."


def generate(inputs: dict[str, Any]) -> list[Step]:
    """Generate quantum gates visualization steps."""
    num_qubits: int = inputs["numQubits"]
    gates: list[dict[str, Any]] = list(inputs["gates"])
    labels = basis_labels(num_qubits)

    steps: list[Step] = []
    idx = 0

    # ── Step 0: Initialize ─────────────────────────────────────────
    state = create_zero_state(num_qubits)
    init_probs = measurement_probabilities(state)

    steps.append(
        Step(
            index=idx,
            id="initialize",
            title="Initialize Quantum Register",
            explanation=(
                f"Creating a {num_qubits}-qubit register in the "
                f"|{'0' * num_qubits}\u27e9 state. "
                f"The state vector has {1 << num_qubits} amplitudes, with all "
                f"probability concentrated on |{'0' * num_qubits}\u27e9."
            ),
            state={
                "numQubits": num_qubits,
                "gateSequence": list(gates),
                "currentGateIndex": -1,
                "stateVector": _clone_state(state),
                "probabilities": list(init_probs),
                "basisLabels": list(labels),
                "currentGate": None,
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
                    type="showProbabilities",
                    params={
                        "probabilities": list(init_probs),
                        "labels": list(labels),
                    },
                ),
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=[1, 2]),
            is_terminal=False,
            phase="initialization",
        )
    )
    idx += 1

    # ── Steps 1..N: Apply each gate ────────────────────────────────
    for i, gate_entry in enumerate(gates):
        gate_name: str = gate_entry["gate"]
        qubits: list[int] = list(gate_entry["qubits"])
        angle = gate_entry.get("angle")

        # Apply the gate
        if len(qubits) == 1:
            gate_matrix = get_standard_gate(gate_name, angle)
            if gate_matrix is None:
                raise ValueError(f'Unknown gate: "{gate_name}"')
            apply_single_qubit_gate(state, gate_matrix, qubits[0], num_qubits)
        elif len(qubits) == 2:
            two_qubit_gates = {
                "CNOT": GATE_CNOT,
                "CZ": GATE_CZ,
                "SWAP": GATE_SWAP,
            }
            gate_matrix = two_qubit_gates.get(gate_name)
            if gate_matrix is None:
                raise ValueError(f'Unknown 2-qubit gate: "{gate_name}"')
            apply_two_qubit_gate(state, gate_matrix, qubits[0], qubits[1], num_qubits)

        # Verify normalization after every gate
        assert_normalized(state, f"after gate {i}: {gate_name}({','.join(str(q) for q in qubits)})")

        probs = measurement_probabilities(state)

        visual_actions_list: list[VisualAction] = [
            VisualAction(
                type="applyGate",
                params={
                    "gate": gate_name,
                    "qubits": list(qubits),
                    "gateIndex": i,
                    **({"angle": angle} if angle is not None else {}),
                },
            ),
            VisualAction(
                type="showStateVector",
                params={
                    "amplitudes": _clone_state(state),
                    "labels": list(labels),
                },
            ),
            VisualAction(
                type="showProbabilities",
                params={
                    "probabilities": list(probs),
                    "labels": list(labels),
                },
            ),
            VisualAction(
                type="highlightQubitWire",
                params={
                    "qubits": list(qubits),
                    "color": "#00ffc8",
                },
            ),
        ]

        # Show gate matrix for single-qubit gates
        gate_matrix_for_display = get_standard_gate(gate_name, angle)
        if gate_matrix_for_display is not None and len(qubits) == 1:
            visual_actions_list.append(
                VisualAction(
                    type="showGateMatrix",
                    params={
                        "gate": gate_name,
                        "matrix": [[list(c) for c in row] for row in gate_matrix_for_display],
                    },
                )
            )

        current_gate = {
            "gate": gate_name,
            "qubits": list(qubits),
            **({"angle": angle} if angle is not None else {}),
        }

        steps.append(
            Step(
                index=idx,
                id=f"apply_gate_{i}",
                title=f"Apply {gate_name} Gate",
                explanation=_gate_description(gate_name, qubits),
                state={
                    "numQubits": num_qubits,
                    "gateSequence": list(gates),
                    "currentGateIndex": i,
                    "stateVector": _clone_state(state),
                    "probabilities": list(probs),
                    "basisLabels": list(labels),
                    "currentGate": current_gate,
                },
                visual_actions=tuple(visual_actions_list),
                code_highlight=CodeHighlight(language="pseudocode", lines=[4, 5, 6]),
                phase="execution",
                is_terminal=(i == len(gates) - 1),
            )
        )
        idx += 1

    return steps
