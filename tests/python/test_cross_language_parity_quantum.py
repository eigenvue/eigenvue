"""
Cross-language parity tests: compare Python quantum generators against
TypeScript-produced fixture JSON files.

For each of the 5 quantum algorithms:
- Load fixture JSON with expected inputs and key states.
- Run the Python generator with the same inputs.
- Compare key numerical values (amplitudes, probabilities, Bloch angles) within +-1e-9.

FIXTURE FORMAT:
  Each fixture JSON has:
    inputs: dict — the inputs to pass to the generator.
    expected: dict — contains keyStates, terminalStepId, etc.

Fixture input keys match the generator interface directly.
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

import pytest

from eigenvue.generators.quantum.qubit_bloch_sphere import generate as generate_bloch
from eigenvue.generators.quantum.quantum_gates import generate as generate_gates
from eigenvue.generators.quantum.grovers_search import generate as generate_grover
from eigenvue.generators.quantum.quantum_teleportation import (
    generate as generate_teleportation,
)
from eigenvue.generators.quantum.superposition_measurement import (
    generate as generate_superposition,
)

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
FIXTURES_DIR = PROJECT_ROOT / "algorithms" / "quantum"

TOL = 1e-9


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────


def load_fixture(algo: str, name: str) -> dict:
    """Load a fixture JSON file from algorithms/quantum/<algo>/tests/<name>.fixture.json."""
    path = FIXTURES_DIR / algo / "tests" / f"{name}.fixture.json"
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _find_step_by_id(steps, step_id: str):
    """Find a step object by its id. Returns None if not found."""
    for step in steps:
        if step.id == step_id:
            return step
    return None


def _assert_amplitudes_match(
    actual_sv: list,
    expected_amps: list[list[float]],
    context: str,
    tol: float = TOL,
):
    """Assert that a state vector matches expected amplitudes within tolerance."""
    assert len(actual_sv) == len(expected_amps), (
        f"{context}: state vector length mismatch: "
        f"got {len(actual_sv)}, expected {len(expected_amps)}"
    )
    for i, (actual, expected) in enumerate(zip(actual_sv, expected_amps)):
        actual_re = actual[0] if isinstance(actual, (list, tuple)) else actual[0]
        actual_im = actual[1] if isinstance(actual, (list, tuple)) else actual[1]
        exp_re, exp_im = expected[0], expected[1]
        assert actual_re == pytest.approx(exp_re, abs=tol), (
            f"{context}[{i}] real: got {actual_re}, expected {exp_re}"
        )
        assert actual_im == pytest.approx(exp_im, abs=tol), (
            f"{context}[{i}] imag: got {actual_im}, expected {exp_im}"
        )


def _assert_float_match(actual: float, expected: float, context: str, tol: float = TOL):
    """Assert that a float value matches within tolerance."""
    assert actual == pytest.approx(expected, abs=tol), (
        f"{context}: got {actual}, expected {expected}"
    )


# ─────────────────────────────────────────────────────────────────────────────
# 1. QUBIT BLOCH SPHERE PARITY
# ─────────────────────────────────────────────────────────────────────────────


class TestBlochSphereParity:
    """Cross-language parity tests for qubit Bloch sphere generator."""

    @pytest.mark.parametrize(
        "fixture_name",
        ["basis-states", "superposition", "arbitrary-state"],
    )
    def test_fixture(self, fixture_name: str):
        """Load fixture, run Python generator, compare key states."""
        fixture = load_fixture("qubit-bloch-sphere", fixture_name)
        inputs = fixture["inputs"]
        expected = fixture["expected"]

        steps = generate_bloch(inputs)

        # Verify step count if specified
        if "stepCount" in expected:
            assert len(steps) == expected["stepCount"], (
                f"Step count mismatch: got {len(steps)}, expected {expected['stepCount']}"
            )

        # Verify terminal step id
        assert steps[-1].id == expected["terminalStepId"], (
            f"Terminal step id mismatch: got {steps[-1].id}, expected {expected['terminalStepId']}"
        )

        # Verify key states
        for key_state in expected.get("keyStates", []):
            step_id = key_state["stepId"]
            step = _find_step_by_id(steps, step_id)
            assert step is not None, f"Step '{step_id}' not found in generated steps"
            state = step.state

            # Compare Bloch angles
            if "theta" in key_state:
                _assert_float_match(state["theta"], key_state["theta"], f"{step_id}.theta")
            if "phi" in key_state:
                _assert_float_match(state["phi"], key_state["phi"], f"{step_id}.phi")

            # Compare Bloch cartesian
            if "blochX" in key_state:
                _assert_float_match(state["blochX"], key_state["blochX"], f"{step_id}.blochX")
            if "blochY" in key_state:
                _assert_float_match(state["blochY"], key_state["blochY"], f"{step_id}.blochY")
            if "blochZ" in key_state:
                _assert_float_match(state["blochZ"], key_state["blochZ"], f"{step_id}.blochZ")

            # Compare probabilities
            if "probZero" in key_state:
                _assert_float_match(
                    state["probZero"], key_state["probZero"], f"{step_id}.probZero"
                )
            if "probOne" in key_state:
                _assert_float_match(
                    state["probOne"], key_state["probOne"], f"{step_id}.probOne"
                )


# ─────────────────────────────────────────────────────────────────────────────
# 2. QUANTUM GATES PARITY
# ─────────────────────────────────────────────────────────────────────────────


class TestQuantumGatesParity:
    """Cross-language parity tests for quantum gates generator."""

    @pytest.mark.parametrize(
        "fixture_name",
        ["single-qubit-gates", "hadamard-sequence", "cnot-gate"],
    )
    def test_fixture(self, fixture_name: str):
        """Load fixture, run Python generator, compare key states."""
        fixture = load_fixture("quantum-gates", fixture_name)
        raw_inputs = fixture["inputs"]
        expected = fixture["expected"]

        steps = generate_gates(raw_inputs)

        # Verify terminal step
        assert steps[-1].id == expected["terminalStepId"], (
            f"Terminal step id mismatch: got {steps[-1].id}, expected {expected['terminalStepId']}"
        )

        # Verify key states
        for key_state in expected.get("keyStates", []):
            step_id = key_state["stepId"]
            step = _find_step_by_id(steps, step_id)
            assert step is not None, f"Step '{step_id}' not found in generated steps"

            if "amplitudes" in key_state:
                _assert_amplitudes_match(
                    step.state["stateVector"],
                    key_state["amplitudes"],
                    f"{fixture_name}/{step_id}",
                )


# ─────────────────────────────────────────────────────────────────────────────
# 3. GROVER'S SEARCH PARITY
# ─────────────────────────────────────────────────────────────────────────────


class TestGroversParity:
    """Cross-language parity tests for Grover's search generator."""

    @pytest.mark.parametrize(
        "fixture_name",
        ["two-qubit-search", "three-qubit-search", "multi-target-search"],
    )
    def test_fixture(self, fixture_name: str):
        """Load fixture, run Python generator, compare key states."""
        fixture = load_fixture("grovers-search", fixture_name)
        inputs = fixture["inputs"]
        expected = fixture["expected"]

        steps = generate_grover(inputs)

        # Verify optimal iterations if specified
        if "optimalIterations" in expected:
            # The total iterations is stored in the state
            assert steps[-1].state["totalIterations"] == expected["optimalIterations"], (
                f"Optimal iterations mismatch"
            )

        # Verify key states by matching step IDs.
        # Fixture uses step IDs like "superposition", "after_oracle_0", "after_diffusion_0"
        # Python generator uses: "hadamard_all", "oracle_1", "diffusion_1"
        for key_state in expected.get("keyStates", []):
            fixture_step_id = key_state["stepId"]

            # Map fixture step IDs to Python generator step IDs
            if fixture_step_id == "superposition":
                py_step_id = "hadamard_all"
            elif fixture_step_id.startswith("after_oracle_"):
                iter_num = int(fixture_step_id.split("_")[-1]) + 1
                py_step_id = f"oracle_{iter_num}"
            elif fixture_step_id.startswith("after_diffusion_"):
                iter_num = int(fixture_step_id.split("_")[-1]) + 1
                py_step_id = f"diffusion_{iter_num}"
            else:
                py_step_id = fixture_step_id

            step = _find_step_by_id(steps, py_step_id)
            assert step is not None, (
                f"Step '{py_step_id}' (fixture: '{fixture_step_id}') not found. "
                f"Available: {[s.id for s in steps]}"
            )

            if "amplitudes" in key_state:
                _assert_amplitudes_match(
                    step.state["stateVector"],
                    key_state["amplitudes"],
                    f"{fixture_name}/{fixture_step_id}",
                )

        # Verify final success probability if specified
        if "finalSuccessProbability" in expected:
            fsp = expected["finalSuccessProbability"]
            final_state = steps[-1].state
            min_prob = fsp["minProbability"]

            if "targetIndex" in fsp:
                # Single target
                target_idx = fsp["targetIndex"]
                target_prob = final_state["probabilities"][target_idx]
                assert target_prob >= min_prob, (
                    f"Target probability {target_prob:.4f} < {min_prob} for {fixture_name}"
                )
            elif "targetIndices" in fsp:
                # Multiple targets
                total_prob = sum(
                    final_state["probabilities"][t] for t in fsp["targetIndices"]
                )
                assert total_prob >= min_prob, (
                    f"Combined target probability {total_prob:.4f} < {min_prob} for {fixture_name}"
                )


# ─────────────────────────────────────────────────────────────────────────────
# 4. QUANTUM TELEPORTATION PARITY
# ─────────────────────────────────────────────────────────────────────────────


class TestTeleportationParity:
    """Cross-language parity tests for quantum teleportation generator."""

    @pytest.mark.parametrize(
        "fixture_name",
        ["teleport-zero", "teleport-one", "teleport-superposition"],
    )
    def test_fixture(self, fixture_name: str):
        """Load fixture, run Python generator, compare key states."""
        fixture = load_fixture("quantum-teleportation", fixture_name)
        raw_inputs = fixture["inputs"]
        expected = fixture["expected"]

        steps = generate_teleportation(raw_inputs)

        # Verify terminal step
        assert steps[-1].id == expected["terminalStepId"], (
            f"Terminal step id mismatch: got {steps[-1].id}, expected {expected['terminalStepId']}"
        )

        # Verify key states
        for key_state in expected.get("keyStates", []):
            fixture_step_id = key_state["stepId"]

            if fixture_step_id == "verification":
                step = _find_step_by_id(steps, "verification")
                assert step is not None, "Verification step not found"
                final_state = step.state

                if "bobBlochAngles" in key_state:
                    bob_angles = key_state["bobBlochAngles"]
                    angle_tol = bob_angles.get("tolerance", TOL)

                    _assert_float_match(
                        final_state["bobTheta"],
                        bob_angles["theta"],
                        f"{fixture_name}/verification.bobTheta",
                        tol=angle_tol,
                    )
                    _assert_float_match(
                        final_state["bobPhi"],
                        bob_angles["phi"],
                        f"{fixture_name}/verification.bobPhi",
                        tol=angle_tol,
                    )

            elif fixture_step_id == "initial_state":
                # The initial_state corresponds to the "initialize" step
                step = _find_step_by_id(steps, "initialize")
                assert step is not None, "Initialize step not found"

                if "aliceState" in key_state:
                    alice = key_state["aliceState"]
                    _assert_float_match(
                        step.state["originalTheta"],
                        alice["theta"],
                        f"{fixture_name}/initial.theta",
                    )
                    _assert_float_match(
                        step.state["originalPhi"],
                        alice["phi"],
                        f"{fixture_name}/initial.phi",
                    )


# ─────────────────────────────────────────────────────────────────────────────
# 5. SUPERPOSITION & MEASUREMENT PARITY
# ─────────────────────────────────────────────────────────────────────────────


class TestSuperpositionParity:
    """Cross-language parity tests for superposition & measurement generator."""

    @pytest.mark.parametrize(
        "fixture_name",
        ["single-qubit-measure", "bell-state-measure", "multi-qubit-measure"],
    )
    def test_fixture(self, fixture_name: str):
        """Load fixture, run Python generator, compare key states."""
        fixture = load_fixture("superposition-measurement", fixture_name)
        inputs = fixture["inputs"]
        expected = fixture["expected"]

        steps = generate_superposition(inputs)

        # Verify key states.
        # Fixture step IDs like "after_preparation" and "after_measurement_0" need
        # to be mapped to the Python generator's step IDs.
        for key_state in expected.get("keyStates", []):
            fixture_step_id = key_state["stepId"]

            # Map fixture step IDs to Python generator step IDs
            if fixture_step_id == "after_preparation":
                # The last preparation step: "prepare_gate_{N-1}"
                prep_steps = [s for s in steps if s.id.startswith("prepare_gate_")]
                assert len(prep_steps) > 0, "No preparation steps found"
                step = prep_steps[-1]
            elif fixture_step_id.startswith("after_measurement_"):
                # Map "after_measurement_0" -> "measure_qubit_{qubit}"
                meas_idx = int(fixture_step_id.split("_")[-1])
                meas_qubit = inputs["measurements"][meas_idx]["qubit"]
                py_step_id = f"measure_qubit_{meas_qubit}"
                step = _find_step_by_id(steps, py_step_id)
                assert step is not None, (
                    f"Step '{py_step_id}' (fixture: '{fixture_step_id}') not found. "
                    f"Available: {[s.id for s in steps]}"
                )
            else:
                step = _find_step_by_id(steps, fixture_step_id)
                assert step is not None, (
                    f"Step '{fixture_step_id}' not found. "
                    f"Available: {[s.id for s in steps]}"
                )

            # Compare amplitudes
            if "amplitudes" in key_state:
                _assert_amplitudes_match(
                    step.state["stateVector"],
                    key_state["amplitudes"],
                    f"{fixture_name}/{fixture_step_id}",
                )

            # Compare probabilities
            if "probabilities" in key_state:
                actual_probs = step.state["probabilities"]
                expected_probs = key_state["probabilities"]
                for i, (ap, ep) in enumerate(zip(actual_probs, expected_probs)):
                    _assert_float_match(
                        ap, ep,
                        f"{fixture_name}/{fixture_step_id}.probabilities[{i}]",
                    )

            # Compare entanglement flag
            if "isEntangled" in key_state:
                assert step.state.get("entangled") == key_state["isEntangled"], (
                    f"{fixture_name}/{fixture_step_id}: entangled mismatch"
                )

            # Compare measured bits
            if "measuredBits" in key_state:
                assert step.state.get("classicalBits") == key_state["measuredBits"], (
                    f"{fixture_name}/{fixture_step_id}: classicalBits mismatch"
                )
