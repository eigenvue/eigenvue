"""
Unit tests for all 5 Python quantum generators.

For each generator:
1. Call generate with default/minimal inputs.
2. Verify the result is a list of Step objects.
3. Verify step count > 0.
4. Verify last step is terminal (is_terminal == True).
5. Verify all steps have required fields (id, title, explanation, visual_actions, state).
6. For Grover's: verify the state at the end has high probability on target.
7. For teleportation: verify Bob's final state matches Alice's original.
"""

from __future__ import annotations

import math

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

TOL = 1e-9


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────


def _assert_valid_steps(steps, min_count: int = 1):
    """Validate common step structure across all generators."""
    assert isinstance(steps, list), "generate() must return a list"
    assert len(steps) >= min_count, f"Expected at least {min_count} steps, got {len(steps)}"

    for i, step in enumerate(steps):
        # Step must have the core attributes
        assert hasattr(step, "id"), f"Step {i} missing 'id'"
        assert hasattr(step, "title"), f"Step {i} missing 'title'"
        assert hasattr(step, "explanation"), f"Step {i} missing 'explanation'"
        assert hasattr(step, "visual_actions"), f"Step {i} missing 'visual_actions'"
        assert hasattr(step, "state"), f"Step {i} missing 'state'"
        assert hasattr(step, "is_terminal"), f"Step {i} missing 'is_terminal'"

        # id and title must be non-empty strings
        assert isinstance(step.id, str) and len(step.id) > 0, f"Step {i}: id must be non-empty"
        assert isinstance(step.title, str) and len(step.title) > 0, (
            f"Step {i}: title must be non-empty"
        )
        assert isinstance(step.explanation, str) and len(step.explanation) > 0, (
            f"Step {i}: explanation must be non-empty"
        )

        # state must be a dict
        assert isinstance(step.state, dict), f"Step {i}: state must be a dict"

        # index must match position
        assert step.index == i, f"Step {i}: index is {step.index}, expected {i}"

    # Last step must be terminal
    assert steps[-1].is_terminal, "Last step must be terminal (is_terminal=True)"

    # Non-last steps must NOT be terminal
    for i, step in enumerate(steps[:-1]):
        assert not step.is_terminal, f"Step {i} is terminal but is not the last step"


# ─────────────────────────────────────────────────────────────────────────────
# 1. QUBIT BLOCH SPHERE GENERATOR
# ─────────────────────────────────────────────────────────────────────────────


class TestQubitBlochSphere:
    """Tests for the qubit Bloch sphere step generator."""

    def test_basic_states(self):
        """Generate steps for |0> and |1> basis states."""
        inputs = {
            "stateSequence": [
                {"label": "|0>", "amplitudes": [1, 0, 0, 0]},
                {"label": "|1>", "amplitudes": [0, 0, 1, 0], "gate": "X"},
            ]
        }
        steps = generate_bloch(inputs)
        _assert_valid_steps(steps, min_count=3)  # intro + 2 states

    def test_step_count_matches_sequence(self):
        """Number of steps = 1 (intro) + len(stateSequence)."""
        inputs = {
            "stateSequence": [
                {"label": "|0>", "amplitudes": [1, 0, 0, 0]},
            ]
        }
        steps = generate_bloch(inputs)
        assert len(steps) == 2  # 1 intro + 1 state

    def test_introduction_step(self):
        """First step should be the introduction."""
        inputs = {
            "stateSequence": [
                {"label": "|0>", "amplitudes": [1, 0, 0, 0]},
            ]
        }
        steps = generate_bloch(inputs)
        assert steps[0].id == "introduction"
        assert steps[0].is_terminal is False

    def test_bloch_angles_in_state(self):
        """State dict should contain theta, phi, blochX, blochY, blochZ."""
        inputs = {
            "stateSequence": [
                {"label": "|0>", "amplitudes": [1, 0, 0, 0]},
            ]
        }
        steps = generate_bloch(inputs)
        state = steps[1].state
        assert "theta" in state
        assert "phi" in state
        assert "blochX" in state
        assert "blochY" in state
        assert "blochZ" in state
        # |0> should be at north pole
        assert state["theta"] == pytest.approx(0.0, abs=TOL)
        assert state["blochZ"] == pytest.approx(1.0, abs=TOL)

    def test_superposition_state(self):
        """H|0> = |+> should have theta=pi/2, blochX=1."""
        s2 = 1.0 / math.sqrt(2)
        inputs = {
            "stateSequence": [
                {"label": "|+>", "amplitudes": [s2, 0, s2, 0], "gate": "H"},
            ]
        }
        steps = generate_bloch(inputs)
        state = steps[1].state
        assert state["theta"] == pytest.approx(math.pi / 2, abs=TOL)
        assert state["blochX"] == pytest.approx(1.0, abs=TOL)
        assert state["probZero"] == pytest.approx(0.5, abs=TOL)
        assert state["probOne"] == pytest.approx(0.5, abs=TOL)


# ─────────────────────────────────────────────────────────────────────────────
# 2. QUANTUM GATES GENERATOR
# ─────────────────────────────────────────────────────────────────────────────


class TestQuantumGates:
    """Tests for the quantum gates step generator."""

    def test_single_gate(self):
        """Apply X gate to 1 qubit."""
        inputs = {
            "numQubits": 1,
            "gates": [{"gate": "X", "qubits": [0]}],
        }
        steps = generate_gates(inputs)
        _assert_valid_steps(steps, min_count=2)  # init + 1 gate

    def test_step_count_matches_gates(self):
        """Number of steps = 1 (init) + len(gates)."""
        inputs = {
            "numQubits": 1,
            "gates": [
                {"gate": "H", "qubits": [0]},
                {"gate": "H", "qubits": [0]},
            ],
        }
        steps = generate_gates(inputs)
        assert len(steps) == 3  # 1 init + 2 gates

    def test_initialization_step(self):
        """First step should initialize the register."""
        inputs = {
            "numQubits": 2,
            "gates": [{"gate": "H", "qubits": [0]}],
        }
        steps = generate_gates(inputs)
        assert steps[0].id == "initialize"
        state = steps[0].state
        assert state["numQubits"] == 2
        # Initial probabilities: 100% on |00>
        assert state["probabilities"][0] == pytest.approx(1.0, abs=TOL)

    def test_h_then_h_returns_to_zero(self):
        """H^2 = I: state vector should return to |0>."""
        inputs = {
            "numQubits": 1,
            "gates": [
                {"gate": "H", "qubits": [0]},
                {"gate": "H", "qubits": [0]},
            ],
        }
        steps = generate_gates(inputs)
        final_sv = steps[-1].state["stateVector"]
        assert final_sv[0] == pytest.approx([1.0, 0.0], abs=TOL)
        assert final_sv[1] == pytest.approx([0.0, 0.0], abs=TOL)

    def test_cnot_creates_bell_state(self):
        """H on qubit 0 then CNOT(0,1) creates Bell state."""
        inputs = {
            "numQubits": 2,
            "gates": [
                {"gate": "H", "qubits": [0]},
                {"gate": "CNOT", "qubits": [0, 1]},
            ],
        }
        steps = generate_gates(inputs)
        final_sv = steps[-1].state["stateVector"]
        s2 = 1.0 / math.sqrt(2)
        assert final_sv[0] == pytest.approx([s2, 0.0], abs=TOL)
        assert final_sv[1] == pytest.approx([0.0, 0.0], abs=TOL)
        assert final_sv[2] == pytest.approx([0.0, 0.0], abs=TOL)
        assert final_sv[3] == pytest.approx([s2, 0.0], abs=TOL)

    def test_state_vector_normalized_after_each_gate(self):
        """State vectors in all steps should be normalized."""
        inputs = {
            "numQubits": 1,
            "gates": [
                {"gate": "H", "qubits": [0]},
                {"gate": "T", "qubits": [0]},
                {"gate": "H", "qubits": [0]},
            ],
        }
        steps = generate_gates(inputs)
        for step in steps:
            sv = step.state["stateVector"]
            norm_sq = sum(a[0] ** 2 + a[1] ** 2 for a in sv)
            assert norm_sq == pytest.approx(1.0, abs=TOL), (
                f"State not normalized at step {step.id}"
            )


# ─────────────────────────────────────────────────────────────────────────────
# 3. GROVER'S SEARCH GENERATOR
# ─────────────────────────────────────────────────────────────────────────────


class TestGroversSearch:
    """Tests for the Grover's search step generator."""

    def test_2_qubit_single_target(self):
        """2-qubit Grover search for |11>: 1 iteration gives 100%."""
        inputs = {"numQubits": 2, "targets": [3]}
        steps = generate_grover(inputs)
        _assert_valid_steps(steps, min_count=4)  # init + hadamard + oracle + diffusion + measure

    def test_last_step_is_measure(self):
        """Terminal step should be the measurement result."""
        inputs = {"numQubits": 2, "targets": [3]}
        steps = generate_grover(inputs)
        assert steps[-1].id == "measure"
        assert steps[-1].is_terminal is True

    def test_success_probability_high(self):
        """2 qubits, 1 target: final success probability should be ~1.0."""
        inputs = {"numQubits": 2, "targets": [3]}
        steps = generate_grover(inputs)
        final_state = steps[-1].state
        assert final_state["successProbability"] == pytest.approx(1.0, abs=TOL)

    def test_3_qubit_success_probability(self):
        """3 qubits, 1 target: final success probability should be > 0.94."""
        inputs = {"numQubits": 3, "targets": [5]}
        steps = generate_grover(inputs)
        final_state = steps[-1].state
        assert final_state["successProbability"] > 0.94

    def test_uniform_superposition_step(self):
        """After Hadamard, all amplitudes should be equal."""
        inputs = {"numQubits": 2, "targets": [3]}
        steps = generate_grover(inputs)
        # Step 1 should be hadamard_all
        had_step = steps[1]
        assert had_step.id == "hadamard_all"
        sv = had_step.state["stateVector"]
        for amp in sv:
            assert amp == pytest.approx([0.5, 0.0], abs=TOL)

    def test_multi_target_search(self):
        """3-qubit search with 2 targets should converge."""
        inputs = {"numQubits": 3, "targets": [2, 6]}
        steps = generate_grover(inputs)
        _assert_valid_steps(steps)
        final_state = steps[-1].state
        # Combined probability of targets should be high
        assert final_state["successProbability"] > 0.9


# ─────────────────────────────────────────────────────────────────────────────
# 4. QUANTUM TELEPORTATION GENERATOR
# ─────────────────────────────────────────────────────────────────────────────


class TestQuantumTeleportation:
    """Tests for the quantum teleportation step generator."""

    def test_teleport_zero(self):
        """Teleport |0>: Bob should end up at north pole (theta=0)."""
        inputs = {
            "teleportState": {"theta": 0, "phi": 0, "label": "|0>"},
            "aliceMeasurements": {"qubit0": 0, "qubit1": 0},
        }
        steps = generate_teleportation(inputs)
        _assert_valid_steps(steps, min_count=5)

    def test_terminal_is_verification(self):
        """Last step should be the verification step."""
        inputs = {
            "teleportState": {"theta": 0, "phi": 0, "label": "|0>"},
            "aliceMeasurements": {"qubit0": 0, "qubit1": 0},
        }
        steps = generate_teleportation(inputs)
        assert steps[-1].id == "verification"
        assert steps[-1].is_terminal is True

    def test_bob_matches_alice_zero(self):
        """After teleporting |0>, Bob's Bloch angles should match."""
        inputs = {
            "teleportState": {"theta": 0, "phi": 0, "label": "|0>"},
            "aliceMeasurements": {"qubit0": 0, "qubit1": 0},
        }
        steps = generate_teleportation(inputs)
        final_state = steps[-1].state
        assert final_state["bobTheta"] == pytest.approx(0.0, abs=1e-6)

    def test_bob_matches_alice_one(self):
        """After teleporting |1>, Bob's Bloch angles should match theta=pi."""
        inputs = {
            "teleportState": {"theta": math.pi, "phi": 0, "label": "|1>"},
            "aliceMeasurements": {"qubit0": 1, "qubit1": 1},
        }
        steps = generate_teleportation(inputs)
        final_state = steps[-1].state
        assert final_state["bobTheta"] == pytest.approx(math.pi, abs=1e-6)

    def test_bob_matches_alice_superposition(self):
        """After teleporting |+>, Bob's Bloch angles should match theta=pi/2, phi=0."""
        inputs = {
            "teleportState": {"theta": math.pi / 2, "phi": 0, "label": "|+>"},
            "aliceMeasurements": {"qubit0": 0, "qubit1": 1},
        }
        steps = generate_teleportation(inputs)
        final_state = steps[-1].state
        assert final_state["bobTheta"] == pytest.approx(math.pi / 2, abs=1e-6)
        assert final_state["bobPhi"] == pytest.approx(0.0, abs=1e-6)

    def test_teleportation_success_flag(self):
        """Final state should have teleportationSuccess=True."""
        inputs = {
            "teleportState": {"theta": 0, "phi": 0, "label": "|0>"},
            "aliceMeasurements": {"qubit0": 0, "qubit1": 0},
        }
        steps = generate_teleportation(inputs)
        assert steps[-1].state["teleportationSuccess"] is True

    def test_all_measurement_outcomes(self):
        """Teleportation works for all 4 measurement outcomes."""
        for m0 in [0, 1]:
            for m1 in [0, 1]:
                inputs = {
                    "teleportState": {"theta": math.pi / 3, "phi": math.pi / 4, "label": "test"},
                    "aliceMeasurements": {"qubit0": m0, "qubit1": m1},
                }
                steps = generate_teleportation(inputs)
                final_state = steps[-1].state
                assert final_state["bobTheta"] == pytest.approx(math.pi / 3, abs=1e-6), (
                    f"Failed for m0={m0}, m1={m1}"
                )
                assert final_state["bobPhi"] == pytest.approx(math.pi / 4, abs=1e-6), (
                    f"Failed for m0={m0}, m1={m1}"
                )


# ─────────────────────────────────────────────────────────────────────────────
# 5. SUPERPOSITION & MEASUREMENT GENERATOR
# ─────────────────────────────────────────────────────────────────────────────


class TestSuperpositionMeasurement:
    """Tests for the superposition and measurement step generator."""

    def test_single_qubit_measure(self):
        """Prepare H|0> and measure -> collapse to deterministic state."""
        inputs = {
            "numQubits": 1,
            "preparationGates": [{"gate": "H", "qubits": [0]}],
            "measurements": [{"qubit": 0, "outcome": 0}],
        }
        steps = generate_superposition(inputs)
        _assert_valid_steps(steps, min_count=3)  # init + prep + measure

    def test_step_count(self):
        """steps = 1 (init) + len(preparationGates) + len(measurements)."""
        inputs = {
            "numQubits": 2,
            "preparationGates": [
                {"gate": "H", "qubits": [0]},
                {"gate": "CNOT", "qubits": [0, 1]},
            ],
            "measurements": [
                {"qubit": 0, "outcome": 0},
                {"qubit": 1, "outcome": 0},
            ],
        }
        steps = generate_superposition(inputs)
        assert len(steps) == 5  # 1 init + 2 prep + 2 measure

    def test_collapsed_state_after_measurement(self):
        """After measuring qubit 0 = 0 in |+>, state should be |0>."""
        inputs = {
            "numQubits": 1,
            "preparationGates": [{"gate": "H", "qubits": [0]}],
            "measurements": [{"qubit": 0, "outcome": 0}],
        }
        steps = generate_superposition(inputs)
        final_sv = steps[-1].state["stateVector"]
        assert final_sv[0] == pytest.approx([1.0, 0.0], abs=TOL)
        assert final_sv[1] == pytest.approx([0.0, 0.0], abs=TOL)

    def test_bell_state_measurement_correlation(self):
        """Measuring qubit 0 of Bell state as 0 collapses qubit 1 to 0 too."""
        inputs = {
            "numQubits": 2,
            "preparationGates": [
                {"gate": "H", "qubits": [0]},
                {"gate": "CNOT", "qubits": [0, 1]},
            ],
            "measurements": [
                {"qubit": 0, "outcome": 0},
                {"qubit": 1, "outcome": 0},
            ],
        }
        steps = generate_superposition(inputs)
        final_sv = steps[-1].state["stateVector"]
        # Should be |00> with certainty
        assert final_sv[0] == pytest.approx([1.0, 0.0], abs=TOL)
        for i in range(1, 4):
            assert final_sv[i] == pytest.approx([0.0, 0.0], abs=TOL)

    def test_classical_bits_accumulate(self):
        """Classical bits should accumulate with each measurement."""
        inputs = {
            "numQubits": 2,
            "preparationGates": [
                {"gate": "H", "qubits": [0]},
                {"gate": "CNOT", "qubits": [0, 1]},
            ],
            "measurements": [
                {"qubit": 0, "outcome": 0},
                {"qubit": 1, "outcome": 0},
            ],
        }
        steps = generate_superposition(inputs)
        # Find measurement steps
        measure_steps = [s for s in steps if s.state.get("currentPhase") == "measurement"]
        assert len(measure_steps) == 2
        assert measure_steps[0].state["classicalBits"] == [0]
        assert measure_steps[1].state["classicalBits"] == [0, 0]

    def test_normalized_throughout(self):
        """State vectors should be normalized at every step."""
        inputs = {
            "numQubits": 2,
            "preparationGates": [
                {"gate": "H", "qubits": [0]},
                {"gate": "CNOT", "qubits": [0, 1]},
            ],
            "measurements": [
                {"qubit": 0, "outcome": 0},
                {"qubit": 1, "outcome": 0},
            ],
        }
        steps = generate_superposition(inputs)
        for step in steps:
            sv = step.state["stateVector"]
            norm_sq = sum(a[0] ** 2 + a[1] ** 2 for a in sv)
            assert norm_sq == pytest.approx(1.0, abs=TOL), (
                f"State not normalized at step {step.id}"
            )
