"""
Superposition & Measurement — Step Generator (Python mirror of generator.ts).

Demonstrates quantum measurement: prepares a state using gates, then
measures qubits with predetermined outcomes to show Born rule probabilities
and wave function collapse.

ALGORITHM:
  1. Initialize |0...0⟩ state.
  2. Apply preparation gates (e.g., H then CNOT to create Bell state).
  3. For each measurement:
     a. Compute probability of the predetermined outcome.
     b. Project and renormalize the state vector.
     c. Show the collapsed state and classical result.

CRITICAL: Measurement outcomes are DETERMINISTIC (predetermined by inputs)
for pedagogical walkthrough purposes. The generator shows the probability
and the resulting collapse.

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
    GATE_CZ,
    GATE_SWAP,
    StateVector,
    apply_single_qubit_gate,
    apply_two_qubit_gate,
    assert_normalized,
    basis_labels,
    create_zero_state,
    get_standard_gate,
    is_entangled,
    measurement_probabilities,
    project_and_normalize,
    qubit_probabilities,
)


def _clone_state(state: StateVector) -> list[list[float]]:
    """Deep copy a state vector (create fresh [re, im] lists)."""
    return [list(amp) for amp in state]


def generate(inputs: dict[str, Any]) -> list[Step]:
    """Generate superposition and measurement visualization steps."""
    num_qubits: int = inputs["numQubits"]
    preparation_gates: list[dict[str, Any]] = list(inputs["preparationGates"])
    measurements: list[dict[str, Any]] = list(inputs["measurements"])
    labels = basis_labels(num_qubits)
    state = create_zero_state(num_qubits)
    classical_bits: list[int] = []

    steps: list[Step] = []
    idx = 0

    # ── Step 0: Initialize ─────────────────────────────────────────────
    steps.append(
        Step(
            index=idx,
            id="initialize",
            title="Initialize Quantum Register",
            explanation=(
                f"Starting with {num_qubits} qubit{'s' if num_qubits > 1 else ''} "
                f"in the |{'0' * num_qubits}\u27e9 state. "
                f"We will prepare a quantum state, then measure to observe collapse."
            ),
            state={
                "numQubits": num_qubits,
                "stateVector": _clone_state(state),
                "probabilities": list(measurement_probabilities(state)),
                "basisLabels": list(labels),
                "currentPhase": "initialization",
                "classicalBits": [],
                "entangled": False,
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
                        "probabilities": list(measurement_probabilities(state)),
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

    # ── Preparation gates ──────────────────────────────────────────────
    for i, gate_entry in enumerate(preparation_gates):
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

        # Assert normalization after every gate
        assert_normalized(state, f"after preparation gate {i}: {gate_name}")

        probs = measurement_probabilities(state)
        entangled = num_qubits == 2 and len(state) == 4 and is_entangled(state)

        # Build visual actions
        visual_actions_list: list[VisualAction] = [
            VisualAction(
                type="applyGate",
                params={
                    "gate": gate_name,
                    "qubits": list(qubits),
                    "gateIndex": i,
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
        ]

        if entangled:
            visual_actions_list.append(
                VisualAction(
                    type="showEntanglement",
                    params={
                        "qubits": [0, 1],
                        "isEntangled": True,
                    },
                )
            )

        entangle_note = (
            "The qubits are now entangled \u2014 their measurement outcomes will be correlated!"
            if entangled
            else ""
        )

        steps.append(
            Step(
                index=idx,
                id=f"prepare_gate_{i}",
                title=f"Prepare: Apply {gate_name}",
                explanation=(
                    f"Applying {gate_name} to qubit{'s' if len(qubits) > 1 else ''} "
                    f"{', '.join(str(q) for q in qubits)}. {entangle_note}"
                ),
                state={
                    "numQubits": num_qubits,
                    "stateVector": _clone_state(state),
                    "probabilities": list(probs),
                    "basisLabels": list(labels),
                    "currentPhase": "preparation",
                    "classicalBits": list(classical_bits),
                    "entangled": entangled,
                },
                visual_actions=tuple(visual_actions_list),
                code_highlight=CodeHighlight(language="pseudocode", lines=[4, 5]),
                is_terminal=False,
                phase="preparation",
            )
        )
        idx += 1

    # ── Measurements ───────────────────────────────────────────────────
    for m, meas in enumerate(measurements):
        qubit: int = meas["qubit"]
        outcome: int = meas["outcome"]

        # Compute probability of this outcome (Born rule)
        p0, p1 = qubit_probabilities(state, qubit, num_qubits)
        outcome_prob = p0 if outcome == 0 else p1

        # Project and renormalize
        state = project_and_normalize(state, qubit, outcome, num_qubits)
        assert_normalized(state, f"after measuring qubit {qubit} = {outcome}")
        classical_bits.append(outcome)

        probs = measurement_probabilities(state)
        is_last = m == len(measurements) - 1

        steps.append(
            Step(
                index=idx,
                id=f"measure_qubit_{qubit}",
                title=f"Measure Qubit {qubit}",
                explanation=(
                    f"Measuring qubit {qubit}: P({outcome}) = {outcome_prob * 100:.1f}%. "
                    f"Result: {outcome}. The state collapses \u2014 amplitudes inconsistent with "
                    f"qubit {qubit} = {outcome} are set to zero and the state is renormalized."
                ),
                state={
                    "numQubits": num_qubits,
                    "stateVector": _clone_state(state),
                    "probabilities": list(probs),
                    "basisLabels": list(labels),
                    "currentPhase": "measurement",
                    "classicalBits": list(classical_bits),
                    "measuredQubit": qubit,
                    "measuredOutcome": outcome,
                    "outcomeProb": outcome_prob,
                    "entangled": False,
                },
                visual_actions=(
                    VisualAction(
                        type="collapseState",
                        params={
                            "qubit": qubit,
                            "outcome": outcome,
                            "probability": outcome_prob,
                        },
                    ),
                    VisualAction(
                        type="showClassicalBits",
                        params={
                            "bits": list(classical_bits),
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
                ),
                code_highlight=CodeHighlight(language="pseudocode", lines=[7, 8, 9]),
                phase="measurement",
                is_terminal=is_last,
            )
        )
        idx += 1

    return steps
