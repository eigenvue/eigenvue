"""
Qubit States & Bloch Sphere — Step Generator (Python mirror of generator.ts).

Generates a step-by-step visualization of single-qubit states on the
Bloch sphere. Walks through a sequence of named qubit states, computing
Bloch sphere coordinates and measurement probabilities for each.

CROSS-LANGUAGE PARITY: Must produce identical steps to the TypeScript version.
"""

from __future__ import annotations

from typing import Any

from eigenvue._step_types import CodeHighlight, Step, VisualAction
from eigenvue.math_utils.quantum_math import (
    Complex,
    StateVector,
    assert_normalized,
    bloch_angles_to_cartesian,
    complex_abs_sq,
    get_standard_gate,
    state_to_bloch_angles,
)


def _format_complex(z: Complex) -> str:
    """Format a complex number for display in explanations."""
    re, im = z
    if abs(im) < 1e-10:
        return f"{re:.4f}"
    if abs(re) < 1e-10:
        return f"{im:.4f}i"
    sign = "+" if im >= 0 else "\u2212"
    return f"{re:.4f} {sign} {abs(im):.4f}i"


def generate(inputs: dict[str, Any]) -> list[Step]:
    """Generate qubit Bloch sphere visualization steps."""
    state_sequence: list[dict[str, Any]] = list(inputs["stateSequence"])
    steps: list[Step] = []
    idx = 0

    # ── Step 0: Introduction ─────────────────────────────────────────
    steps.append(
        Step(
            index=idx,
            id="introduction",
            title="What is a Qubit?",
            explanation=(
                "A classical bit is either 0 or 1. A qubit can be in a superposition: "
                "|ψ⟩ = α₀|0⟩ + α₁|1⟩, where α₀ and α₁ are complex numbers satisfying "
                "|α₀|² + |α₁|² = 1. The Bloch sphere represents all possible single-qubit states."
            ),
            state={
                "stateSequence": list(state_sequence),
                "currentIndex": -1,
                "alpha0": [1, 0],
                "alpha1": [0, 0],
                "theta": 0,
                "phi": 0,
                "blochX": 0,
                "blochY": 0,
                "blochZ": 1,
                "probZero": 1,
                "probOne": 0,
            },
            visual_actions=(
                VisualAction(
                    type="rotateBlochSphere",
                    params={"theta": 0, "phi": 0, "label": "|0⟩"},
                ),
                VisualAction(
                    type="showProbabilities",
                    params={"probabilities": [1, 0], "labels": ["|0⟩", "|1⟩"]},
                ),
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=[1, 2]),
            is_terminal=False,
            phase="introduction",
        )
    )
    idx += 1

    # ── Steps 1..N: Show each state ──────────────────────────────────
    for i, entry in enumerate(state_sequence):
        amps = entry["amplitudes"]
        a0_re, a0_im, a1_re, a1_im = amps[0], amps[1], amps[2], amps[3]
        alpha0: Complex = (a0_re, a0_im)
        alpha1: Complex = (a1_re, a1_im)
        state_vec: StateVector = [alpha0, alpha1]

        assert_normalized(state_vec, f'state "{entry["label"]}"')

        theta, phi = state_to_bloch_angles((alpha0, alpha1))
        bloch_x, bloch_y, bloch_z = bloch_angles_to_cartesian(theta, phi)

        prob_zero = complex_abs_sq(alpha0)
        prob_one = complex_abs_sq(alpha1)

        visual_actions: list[VisualAction] = [
            VisualAction(
                type="rotateBlochSphere",
                params={"theta": theta, "phi": phi, "label": entry["label"]},
            ),
            VisualAction(
                type="showProbabilities",
                params={
                    "probabilities": [prob_zero, prob_one],
                    "labels": ["|0⟩", "|1⟩"],
                },
            ),
        ]

        gate = entry.get("gate")
        if gate:
            gate_matrix = get_standard_gate(gate)
            if gate_matrix is not None:
                visual_actions.append(
                    VisualAction(
                        type="showGateMatrix",
                        params={
                            "gate": gate,
                            "matrix": [[list(c) for c in row] for row in gate_matrix],
                        },
                    )
                )

        if gate:
            explanation = (
                f"Applying {gate} gate produces state {entry['label']}. "
                f"α₀ = {_format_complex(alpha0)}, α₁ = {_format_complex(alpha1)}. "
                f"P(|0⟩) = {prob_zero * 100:.1f}%, P(|1⟩) = {prob_one * 100:.1f}%."
            )
        else:
            explanation = (
                f"State: {entry['label']}. "
                f"α₀ = {_format_complex(alpha0)}, α₁ = {_format_complex(alpha1)}. "
                f"P(|0⟩) = {prob_zero * 100:.1f}%, P(|1⟩) = {prob_one * 100:.1f}%."
            )

        title = f"Apply {gate} → {entry['label']}" if gate else f"State: {entry['label']}"

        steps.append(
            Step(
                index=idx,
                id=f"show_state_{i}",
                title=title,
                explanation=explanation,
                state={
                    "stateSequence": list(state_sequence),
                    "currentIndex": i,
                    "alpha0": list(alpha0),
                    "alpha1": list(alpha1),
                    "theta": theta,
                    "phi": phi,
                    "blochX": bloch_x,
                    "blochY": bloch_y,
                    "blochZ": bloch_z,
                    "probZero": prob_zero,
                    "probOne": prob_one,
                    "gate": gate if gate else None,
                },
                visual_actions=tuple(visual_actions),
                code_highlight=CodeHighlight(
                    language="pseudocode", lines=[5, 6] if gate else [3, 4]
                ),
                phase="exploration",
                is_terminal=(i == len(state_sequence) - 1),
            )
        )
        idx += 1

    return steps
