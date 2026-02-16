"""
Grover's Search Algorithm — Step Generator (Python mirror of generator.ts).

Demonstrates quantum search via amplitude amplification.
The oracle marks target states (sign flip), and the diffusion operator
amplifies their probability through interference.

MATHEMATICAL CORRECTNESS:
  - Optimal iterations: R = floor(pi/4 * sqrt(N/M))
  - 2 qubits, 1 target: R = 1, P(target) = 1.0 exactly
  - 3 qubits, 1 target: R = 2, P(target) ~ 0.9453
  - Normalization verified after every oracle + diffusion

STATE SNAPSHOT SAFETY:
  Every step produces fresh arrays and objects via _clone_state() and
  list copies. No mutable references escape into step snapshots.

CROSS-LANGUAGE PARITY: Must produce identical steps to the TypeScript version.
"""

from __future__ import annotations

import math
from typing import Any

from eigenvue._step_types import CodeHighlight, Step, VisualAction
from eigenvue.math_utils.quantum_math import (
    GATE_H,
    StateVector,
    apply_grover_diffusion,
    apply_grover_oracle,
    apply_single_qubit_gate,
    assert_normalized,
    basis_labels,
    complex_abs_sq,
    create_zero_state,
    measurement_probabilities,
)


def _clone_state(state: StateVector) -> list[list[float]]:
    """Deep copy a state vector (create fresh [re, im] lists)."""
    return [list(amp) for amp in state]


def generate(inputs: dict[str, Any]) -> list[Step]:
    """Generate Grover's search algorithm visualization steps."""
    num_qubits: int = inputs["numQubits"]
    targets: list[int] = list(inputs["targets"])
    n = 1 << num_qubits
    m = len(targets)
    labels = basis_labels(num_qubits)
    target_labels = ", ".join(labels[t] for t in targets)

    # Optimal number of Grover iterations
    r = math.floor((math.pi / 4) * math.sqrt(n / m))

    steps: list[Step] = []
    idx = 0

    # ── Step 0: Initialize ─────────────────────────────────────────
    state = create_zero_state(num_qubits)

    success_prob = sum(complex_abs_sq(state[t]) for t in targets)

    steps.append(
        Step(
            index=idx,
            id="initialize",
            title="Initialize Quantum Register",
            explanation=(
                f"Starting with {num_qubits} qubits in |{'0' * num_qubits}\u27e9. "
                f"Searching for target{'s' if m > 1 else ''} {target_labels} among {n} items. "
                f"Grover's algorithm will need {r} iteration{'s' if r != 1 else ''}."
            ),
            state={
                "numQubits": num_qubits,
                "targets": list(targets),
                "stateVector": _clone_state(state),
                "probabilities": list(measurement_probabilities(state)),
                "basisLabels": list(labels),
                "iteration": 0,
                "totalIterations": r,
                "phase": "initialize",
                "successProbability": success_prob,
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
                        "targetStates": list(targets),
                    },
                ),
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=[1, 2]),
            is_terminal=False,
            phase="initialization",
        )
    )
    idx += 1

    # ── Step 1: Hadamard on all qubits -> uniform superposition ─────
    for q in range(num_qubits):
        apply_single_qubit_gate(state, GATE_H, q, num_qubits)
    assert_normalized(state, "after Hadamard on all qubits")

    had_probs = measurement_probabilities(state)
    had_success = sum(complex_abs_sq(state[t]) for t in targets)

    steps.append(
        Step(
            index=idx,
            id="hadamard_all",
            title="Create Uniform Superposition",
            explanation=(
                f"Applied Hadamard (H) to all {num_qubits} qubits. Every basis state now has equal "
                f"probability {1 / n * 100:.1f}%. All {n} items are equally likely \u2014 "
                f"we haven't searched yet. Will perform {r} Grover iteration{'s' if r != 1 else ''}."
            ),
            state={
                "numQubits": num_qubits,
                "targets": list(targets),
                "stateVector": _clone_state(state),
                "probabilities": list(had_probs),
                "basisLabels": list(labels),
                "iteration": 0,
                "totalIterations": r,
                "phase": "hadamard",
                "successProbability": had_success,
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
                        "probabilities": list(had_probs),
                        "labels": list(labels),
                        "targetStates": list(targets),
                    },
                ),
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=[4, 5]),
            is_terminal=False,
            phase="superposition",
        )
    )
    idx += 1

    # ── Grover iterations ──────────────────────────────────────────
    for iteration in range(1, r + 1):
        # Oracle: negate target amplitudes
        apply_grover_oracle(state, list(targets))
        assert_normalized(state, f"after oracle iteration {iteration}")

        oracle_probs = measurement_probabilities(state)
        oracle_success = sum(complex_abs_sq(state[t]) for t in targets)

        steps.append(
            Step(
                index=idx,
                id=f"oracle_{iteration}",
                title=f"Iteration {iteration}: Oracle",
                explanation=(
                    f"The oracle flipped the sign of target state{'s' if m > 1 else ''} {target_labels}. "
                    f"The probabilities haven't changed \u2014 the oracle's power is in the phase, not the probability. "
                    f"The negative amplitude will cause constructive interference in the next step."
                ),
                state={
                    "numQubits": num_qubits,
                    "targets": list(targets),
                    "stateVector": _clone_state(state),
                    "probabilities": list(oracle_probs),
                    "basisLabels": list(labels),
                    "iteration": iteration,
                    "totalIterations": r,
                    "phase": "oracle",
                    "successProbability": oracle_success,
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
                            "probabilities": list(oracle_probs),
                            "labels": list(labels),
                            "targetStates": list(targets),
                        },
                    ),
                ),
                code_highlight=CodeHighlight(language="pseudocode", lines=[8, 9]),
                is_terminal=False,
                phase="grover_iteration",
            )
        )
        idx += 1

        # Diffusion: reflect about mean
        apply_grover_diffusion(state)
        assert_normalized(state, f"after diffusion iteration {iteration}")

        diff_probs = measurement_probabilities(state)
        diff_success = sum(complex_abs_sq(state[t]) for t in targets)

        last_iter_note = (
            f" After {r} iteration{'s' if r != 1 else ''}, the target is maximally amplified."
            if iteration == r
            else ""
        )

        steps.append(
            Step(
                index=idx,
                id=f"diffusion_{iteration}",
                title=f"Iteration {iteration}: Diffusion",
                explanation=(
                    f"The diffusion operator reflected all amplitudes about the mean, amplifying the "
                    f"target{'s' if m > 1 else ''}. Target probability is now {diff_success * 100:.1f}%."
                    f"{last_iter_note}"
                ),
                state={
                    "numQubits": num_qubits,
                    "targets": list(targets),
                    "stateVector": _clone_state(state),
                    "probabilities": list(diff_probs),
                    "basisLabels": list(labels),
                    "iteration": iteration,
                    "totalIterations": r,
                    "phase": "diffusion",
                    "successProbability": diff_success,
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
                            "probabilities": list(diff_probs),
                            "labels": list(labels),
                            "targetStates": list(targets),
                        },
                    ),
                ),
                code_highlight=CodeHighlight(language="pseudocode", lines=[11, 12]),
                is_terminal=False,
                phase="grover_iteration",
            )
        )
        idx += 1

    # ── Final Step: Measure ────────────────────────────────────────
    final_probs = measurement_probabilities(state)
    final_success = sum(complex_abs_sq(state[t]) for t in targets)

    steps.append(
        Step(
            index=idx,
            id="measure",
            title="Measurement Result",
            explanation=(
                f"Measurement would yield target {target_labels} with {final_success * 100:.1f}% probability. "
                f"Grover's algorithm found the target in {r} iteration{'s' if r != 1 else ''} \u2014 "
                f"a classical search would need up to {n} checks."
            ),
            state={
                "numQubits": num_qubits,
                "targets": list(targets),
                "stateVector": _clone_state(state),
                "probabilities": list(final_probs),
                "basisLabels": list(labels),
                "iteration": r,
                "totalIterations": r,
                "phase": "measure",
                "successProbability": final_success,
            },
            visual_actions=(
                VisualAction(
                    type="showProbabilities",
                    params={
                        "probabilities": list(final_probs),
                        "labels": list(labels),
                        "targetStates": list(targets),
                    },
                ),
                VisualAction(
                    type="showMessage",
                    params={
                        "text": f"Target found: {target_labels} ({final_success * 100:.1f}% probability)",
                        "messageType": "success",
                    },
                ),
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=[14, 15]),
            phase="result",
            is_terminal=True,
        )
    )

    return steps
