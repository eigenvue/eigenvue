"""
Unit tests for the quantum math library (Python mirror of quantum-math.ts).

Test groups:
1. Complex arithmetic: add, sub, mul, div, conj, neg, abs_sq, abs, arg, exp, scale.
2. Critical identity: i^2 = -1.
3. State vector operations: create_zero_state, create_uniform_superposition,
   state_vector_norm_sq, assert_normalized, measurement_probabilities,
   qubit_probabilities, project_and_normalize.
4. Gate unitarity: all standard gates pass is_unitary().
5. Gate effects: X|0> = |1>, H|0> = |+>, H^2 = I, CNOT creates Bell state.
6. Grover primitives: oracle + diffusion on 2 qubits gives 100% on target.
7. Bloch sphere: 6 named states produce correct (theta, phi, x, y, z).
8. Entanglement detection: |00> NOT entangled, Bell state IS entangled.
"""

from __future__ import annotations

import math

import pytest

from eigenvue.math_utils.quantum_math import (
    # Complex arithmetic
    complex_add,
    complex_sub,
    complex_mul,
    complex_div,
    complex_conj,
    complex_neg,
    complex_abs_sq,
    complex_abs,
    complex_arg,
    complex_exp,
    complex_scale,
    # State vector operations
    create_zero_state,
    create_uniform_superposition,
    state_vector_norm_sq,
    assert_normalized,
    measurement_probabilities,
    qubit_probabilities,
    project_and_normalize,
    # Gate matrices
    GATE_I,
    GATE_X,
    GATE_Y,
    GATE_Z,
    GATE_H,
    GATE_S,
    GATE_T,
    GATE_CNOT,
    GATE_CZ,
    GATE_SWAP,
    GATE_TOFFOLI,
    # Parameterized gates
    gate_rx,
    gate_ry,
    gate_rz,
    # Gate application
    apply_single_qubit_gate,
    apply_two_qubit_gate,
    apply_grover_oracle,
    apply_grover_diffusion,
    # Bloch sphere
    state_to_bloch_angles,
    bloch_angles_to_cartesian,
    # Verification
    is_unitary,
    is_entangled,
    # Constants
    ZERO,
    ONE,
    IMAG,
)

TOL = 1e-9

# ─────────────────────────────────────────────────────────────────────────────
# 1. COMPLEX ARITHMETIC
# ─────────────────────────────────────────────────────────────────────────────


class TestComplexArithmetic:
    """Tests for all complex number operations."""

    def test_add_real(self):
        assert complex_add((1.0, 0.0), (2.0, 0.0)) == pytest.approx((3.0, 0.0), abs=TOL)

    def test_add_imaginary(self):
        assert complex_add((0.0, 1.0), (0.0, 2.0)) == pytest.approx((0.0, 3.0), abs=TOL)

    def test_add_mixed(self):
        assert complex_add((1.0, 2.0), (3.0, 4.0)) == pytest.approx((4.0, 6.0), abs=TOL)

    def test_sub(self):
        assert complex_sub((5.0, 3.0), (2.0, 1.0)) == pytest.approx((3.0, 2.0), abs=TOL)

    def test_sub_negative_result(self):
        assert complex_sub((1.0, 1.0), (2.0, 3.0)) == pytest.approx((-1.0, -2.0), abs=TOL)

    def test_mul_real(self):
        assert complex_mul((2.0, 0.0), (3.0, 0.0)) == pytest.approx((6.0, 0.0), abs=TOL)

    def test_mul_ac_minus_bd(self):
        """Verify the ac-bd rule: (a+bi)(c+di) = (ac-bd) + (ad+bc)i."""
        # (2+3i)(4+5i) = (8-15) + (10+12)i = -7 + 22i
        result = complex_mul((2.0, 3.0), (4.0, 5.0))
        assert result == pytest.approx((-7.0, 22.0), abs=TOL)

    def test_mul_imaginary(self):
        """Multiplying two purely imaginary numbers: (0+2i)(0+3i) = -6+0i."""
        result = complex_mul((0.0, 2.0), (0.0, 3.0))
        assert result == pytest.approx((-6.0, 0.0), abs=TOL)

    def test_div_real(self):
        result = complex_div((6.0, 0.0), (2.0, 0.0))
        assert result == pytest.approx((3.0, 0.0), abs=TOL)

    def test_div_complex(self):
        # (1+2i)/(3+4i) = (1+2i)(3-4i) / (9+16) = (3+8 + (6-4)i) / 25
        #               = (11 + 2i) / 25 = 0.44 + 0.08i
        result = complex_div((1.0, 2.0), (3.0, 4.0))
        assert result == pytest.approx((11.0 / 25.0, 2.0 / 25.0), abs=TOL)

    def test_div_by_zero_raises(self):
        with pytest.raises(ValueError, match="division by zero"):
            complex_div((1.0, 0.0), (0.0, 0.0))

    def test_conj(self):
        assert complex_conj((3.0, 4.0)) == pytest.approx((3.0, -4.0), abs=TOL)

    def test_conj_real(self):
        assert complex_conj((5.0, 0.0)) == pytest.approx((5.0, 0.0), abs=TOL)

    def test_neg(self):
        assert complex_neg((3.0, -4.0)) == pytest.approx((-3.0, 4.0), abs=TOL)

    def test_abs_sq(self):
        # |3+4i|^2 = 9+16 = 25
        assert complex_abs_sq((3.0, 4.0)) == pytest.approx(25.0, abs=TOL)

    def test_abs(self):
        assert complex_abs((3.0, 4.0)) == pytest.approx(5.0, abs=TOL)

    def test_abs_zero(self):
        assert complex_abs((0.0, 0.0)) == pytest.approx(0.0, abs=TOL)

    def test_arg_positive_real(self):
        assert complex_arg((1.0, 0.0)) == pytest.approx(0.0, abs=TOL)

    def test_arg_positive_imaginary(self):
        assert complex_arg((0.0, 1.0)) == pytest.approx(math.pi / 2, abs=TOL)

    def test_arg_negative_real(self):
        assert complex_arg((-1.0, 0.0)) == pytest.approx(math.pi, abs=TOL)

    def test_exp_zero(self):
        """e^{i*0} = 1."""
        result = complex_exp(0.0)
        assert result == pytest.approx((1.0, 0.0), abs=TOL)

    def test_exp_pi_over_2(self):
        """e^{i*pi/2} = i."""
        result = complex_exp(math.pi / 2)
        assert result == pytest.approx((0.0, 1.0), abs=TOL)

    def test_exp_pi(self):
        """e^{i*pi} = -1 (Euler's formula)."""
        result = complex_exp(math.pi)
        assert result == pytest.approx((-1.0, 0.0), abs=TOL)

    def test_scale_positive(self):
        assert complex_scale(3.0, (2.0, 5.0)) == pytest.approx((6.0, 15.0), abs=TOL)

    def test_scale_negative(self):
        assert complex_scale(-1.0, (2.0, 3.0)) == pytest.approx((-2.0, -3.0), abs=TOL)

    def test_scale_zero(self):
        assert complex_scale(0.0, (2.0, 3.0)) == pytest.approx((0.0, 0.0), abs=TOL)


# ─────────────────────────────────────────────────────────────────────────────
# 2. CRITICAL IDENTITY: i^2 = -1
# ─────────────────────────────────────────────────────────────────────────────


class TestISquared:
    """The most fundamental identity in complex arithmetic."""

    def test_i_squared_equals_negative_one(self):
        """i * i = -1: complex_mul((0,1), (0,1)) must equal (-1, 0)."""
        result = complex_mul((0.0, 1.0), (0.0, 1.0))
        assert result == pytest.approx((-1.0, 0.0), abs=TOL)

    def test_using_IMAG_constant(self):
        """Same test using the IMAG constant."""
        result = complex_mul(IMAG, IMAG)
        assert result == pytest.approx((-1.0, 0.0), abs=TOL)


# ─────────────────────────────────────────────────────────────────────────────
# 3. STATE VECTOR OPERATIONS
# ─────────────────────────────────────────────────────────────────────────────


class TestStateVectorOperations:
    """Tests for state vector creation and manipulation."""

    def test_create_zero_state_1_qubit(self):
        state = create_zero_state(1)
        assert len(state) == 2
        assert state[0] == pytest.approx((1.0, 0.0), abs=TOL)
        assert state[1] == pytest.approx((0.0, 0.0), abs=TOL)

    def test_create_zero_state_2_qubits(self):
        state = create_zero_state(2)
        assert len(state) == 4
        assert state[0] == pytest.approx((1.0, 0.0), abs=TOL)
        for i in range(1, 4):
            assert state[i] == pytest.approx((0.0, 0.0), abs=TOL)

    def test_create_zero_state_3_qubits(self):
        state = create_zero_state(3)
        assert len(state) == 8
        assert state[0] == pytest.approx((1.0, 0.0), abs=TOL)

    def test_create_uniform_superposition_1_qubit(self):
        state = create_uniform_superposition(1)
        amp = 1.0 / math.sqrt(2)
        assert len(state) == 2
        assert state[0] == pytest.approx((amp, 0.0), abs=TOL)
        assert state[1] == pytest.approx((amp, 0.0), abs=TOL)

    def test_create_uniform_superposition_2_qubits(self):
        state = create_uniform_superposition(2)
        amp = 0.5
        assert len(state) == 4
        for s in state:
            assert s == pytest.approx((amp, 0.0), abs=TOL)

    def test_state_vector_norm_sq_zero_state(self):
        state = create_zero_state(2)
        assert state_vector_norm_sq(state) == pytest.approx(1.0, abs=TOL)

    def test_state_vector_norm_sq_uniform(self):
        state = create_uniform_superposition(3)
        assert state_vector_norm_sq(state) == pytest.approx(1.0, abs=TOL)

    def test_assert_normalized_passes(self):
        """assert_normalized should not raise for a normalized state."""
        state = create_zero_state(2)
        assert_normalized(state)  # Should not raise

    def test_assert_normalized_raises_on_unnormalized(self):
        """assert_normalized should raise ValueError for unnormalized state."""
        state = [(2.0, 0.0), (0.0, 0.0)]
        with pytest.raises(ValueError, match="not normalized"):
            assert_normalized(state)

    def test_measurement_probabilities_zero_state(self):
        state = create_zero_state(2)
        probs = measurement_probabilities(state)
        assert probs == pytest.approx([1.0, 0.0, 0.0, 0.0], abs=TOL)

    def test_measurement_probabilities_uniform(self):
        state = create_uniform_superposition(2)
        probs = measurement_probabilities(state)
        assert probs == pytest.approx([0.25, 0.25, 0.25, 0.25], abs=TOL)

    def test_qubit_probabilities_zero_state(self):
        state = create_zero_state(2)
        p0, p1 = qubit_probabilities(state, 0, 2)
        assert p0 == pytest.approx(1.0, abs=TOL)
        assert p1 == pytest.approx(0.0, abs=TOL)

    def test_qubit_probabilities_uniform(self):
        state = create_uniform_superposition(2)
        p0, p1 = qubit_probabilities(state, 0, 2)
        assert p0 == pytest.approx(0.5, abs=TOL)
        assert p1 == pytest.approx(0.5, abs=TOL)

    def test_project_and_normalize_zero_state(self):
        state = create_zero_state(2)
        projected = project_and_normalize(state, 0, 0, 2)
        assert projected[0] == pytest.approx((1.0, 0.0), abs=TOL)
        assert projected[1] == pytest.approx((0.0, 0.0), abs=TOL)
        assert projected[2] == pytest.approx((0.0, 0.0), abs=TOL)
        assert projected[3] == pytest.approx((0.0, 0.0), abs=TOL)

    def test_project_and_normalize_bell_state(self):
        """Projecting qubit 0 of a Bell state onto |0> collapses to |00>."""
        s2 = 1.0 / math.sqrt(2)
        bell = [(s2, 0.0), (0.0, 0.0), (0.0, 0.0), (s2, 0.0)]
        projected = project_and_normalize(bell, 0, 0, 2)
        assert projected[0] == pytest.approx((1.0, 0.0), abs=TOL)
        assert projected[1] == pytest.approx((0.0, 0.0), abs=TOL)
        assert projected[2] == pytest.approx((0.0, 0.0), abs=TOL)
        assert projected[3] == pytest.approx((0.0, 0.0), abs=TOL)

    def test_project_and_normalize_raises_zero_prob(self):
        """Projecting onto an impossible outcome should raise."""
        state = create_zero_state(1)
        with pytest.raises(ValueError, match="Cannot project"):
            project_and_normalize(state, 0, 1, 1)


# ─────────────────────────────────────────────────────────────────────────────
# 4. GATE UNITARITY
# ─────────────────────────────────────────────────────────────────────────────


class TestGateUnitarity:
    """All standard gates must satisfy U x U^dag = I."""

    @pytest.mark.parametrize(
        "gate_name, gate_matrix",
        [
            ("GATE_I", GATE_I),
            ("GATE_X", GATE_X),
            ("GATE_Y", GATE_Y),
            ("GATE_Z", GATE_Z),
            ("GATE_H", GATE_H),
            ("GATE_S", GATE_S),
            ("GATE_T", GATE_T),
            ("GATE_CNOT", GATE_CNOT),
            ("GATE_CZ", GATE_CZ),
            ("GATE_SWAP", GATE_SWAP),
            ("GATE_TOFFOLI", GATE_TOFFOLI),
            ("gate_rx(pi/4)", gate_rx(math.pi / 4)),
            ("gate_ry(pi/4)", gate_ry(math.pi / 4)),
            ("gate_rz(pi/4)", gate_rz(math.pi / 4)),
        ],
    )
    def test_gate_is_unitary(self, gate_name: str, gate_matrix):
        assert is_unitary(gate_matrix), f"{gate_name} is not unitary"


# ─────────────────────────────────────────────────────────────────────────────
# 5. GATE EFFECTS
# ─────────────────────────────────────────────────────────────────────────────


class TestGateEffects:
    """Verify specific quantum gate transformations."""

    def test_x_gate_on_zero(self):
        """X|0> = |1>."""
        state = create_zero_state(1)
        apply_single_qubit_gate(state, GATE_X, 0, 1)
        assert state[0] == pytest.approx((0.0, 0.0), abs=TOL)
        assert state[1] == pytest.approx((1.0, 0.0), abs=TOL)

    def test_h_gate_on_zero(self):
        """H|0> = |+> = (|0> + |1>) / sqrt(2)."""
        state = create_zero_state(1)
        apply_single_qubit_gate(state, GATE_H, 0, 1)
        s2 = 1.0 / math.sqrt(2)
        assert state[0] == pytest.approx((s2, 0.0), abs=TOL)
        assert state[1] == pytest.approx((s2, 0.0), abs=TOL)

    def test_h_squared_is_identity(self):
        """H^2 = I: applying H twice returns to the original state."""
        state = create_zero_state(1)
        apply_single_qubit_gate(state, GATE_H, 0, 1)
        apply_single_qubit_gate(state, GATE_H, 0, 1)
        assert state[0] == pytest.approx((1.0, 0.0), abs=TOL)
        assert state[1] == pytest.approx((0.0, 0.0), abs=TOL)

    def test_cnot_creates_bell_state(self):
        """H on qubit 0, then CNOT(0,1) creates Bell state |Phi+>."""
        state = create_zero_state(2)
        apply_single_qubit_gate(state, GATE_H, 0, 2)
        apply_two_qubit_gate(state, GATE_CNOT, 0, 1, 2)
        s2 = 1.0 / math.sqrt(2)
        # Bell state: (|00> + |11>) / sqrt(2)
        assert state[0] == pytest.approx((s2, 0.0), abs=TOL)
        assert state[1] == pytest.approx((0.0, 0.0), abs=TOL)
        assert state[2] == pytest.approx((0.0, 0.0), abs=TOL)
        assert state[3] == pytest.approx((s2, 0.0), abs=TOL)

    def test_x_gate_on_one(self):
        """X|1> = |0>."""
        state = [(0.0, 0.0), (1.0, 0.0)]  # |1>
        apply_single_qubit_gate(state, GATE_X, 0, 1)
        assert state[0] == pytest.approx((1.0, 0.0), abs=TOL)
        assert state[1] == pytest.approx((0.0, 0.0), abs=TOL)

    def test_z_gate_on_one(self):
        """Z|1> = -|1>."""
        state = [(0.0, 0.0), (1.0, 0.0)]  # |1>
        apply_single_qubit_gate(state, GATE_Z, 0, 1)
        assert state[0] == pytest.approx((0.0, 0.0), abs=TOL)
        assert state[1] == pytest.approx((-1.0, 0.0), abs=TOL)

    def test_s_gate_on_one(self):
        """S|1> = i|1>."""
        state = [(0.0, 0.0), (1.0, 0.0)]  # |1>
        apply_single_qubit_gate(state, GATE_S, 0, 1)
        assert state[0] == pytest.approx((0.0, 0.0), abs=TOL)
        assert state[1] == pytest.approx((0.0, 1.0), abs=TOL)

    def test_swap_gate(self):
        """SWAP|01> = |10>."""
        state = [(0.0, 0.0), (1.0, 0.0), (0.0, 0.0), (0.0, 0.0)]  # |01>
        apply_two_qubit_gate(state, GATE_SWAP, 0, 1, 2)
        assert state[0] == pytest.approx((0.0, 0.0), abs=TOL)
        assert state[1] == pytest.approx((0.0, 0.0), abs=TOL)
        assert state[2] == pytest.approx((1.0, 0.0), abs=TOL)
        assert state[3] == pytest.approx((0.0, 0.0), abs=TOL)


# ─────────────────────────────────────────────────────────────────────────────
# 6. GROVER PRIMITIVES
# ─────────────────────────────────────────────────────────────────────────────


class TestGroverPrimitives:
    """Oracle + diffusion on 2 qubits gives 100% probability on target."""

    def test_grover_2_qubit_single_target(self):
        """2-qubit Grover with target |11> (index 3): 1 iteration -> 100%."""
        num_qubits = 2
        targets = [3]
        state = create_zero_state(num_qubits)

        # Create uniform superposition
        for q in range(num_qubits):
            apply_single_qubit_gate(state, GATE_H, q, num_qubits)

        # Verify uniform superposition
        for amp in state:
            assert amp == pytest.approx((0.5, 0.0), abs=TOL)

        # Oracle: negate target
        apply_grover_oracle(state, targets)
        assert state[3] == pytest.approx((-0.5, 0.0), abs=TOL)

        # Diffusion: reflect about mean
        apply_grover_diffusion(state)

        # After 1 iteration, target has probability 1.0
        probs = measurement_probabilities(state)
        assert probs[3] == pytest.approx(1.0, abs=TOL)
        for i in [0, 1, 2]:
            assert probs[i] == pytest.approx(0.0, abs=TOL)

    def test_grover_2_qubit_target_zero(self):
        """2-qubit Grover with target |00> (index 0): 1 iteration -> 100%."""
        num_qubits = 2
        targets = [0]
        state = create_zero_state(num_qubits)

        for q in range(num_qubits):
            apply_single_qubit_gate(state, GATE_H, q, num_qubits)

        apply_grover_oracle(state, targets)
        apply_grover_diffusion(state)

        probs = measurement_probabilities(state)
        assert probs[0] == pytest.approx(1.0, abs=TOL)


# ─────────────────────────────────────────────────────────────────────────────
# 7. BLOCH SPHERE
# ─────────────────────────────────────────────────────────────────────────────


class TestBlochSphere:
    """6 named single-qubit states produce correct Bloch sphere coordinates."""

    @pytest.mark.parametrize(
        "name, alpha0, alpha1, expected_theta, expected_phi, expected_x, expected_y, expected_z",
        [
            # |0> -> north pole
            ("|0>", (1.0, 0.0), (0.0, 0.0), 0.0, 0.0, 0.0, 0.0, 1.0),
            # |1> -> south pole
            ("|1>", (0.0, 0.0), (1.0, 0.0), math.pi, 0.0, 0.0, 0.0, -1.0),
            # |+> = (|0> + |1>)/sqrt(2) -> +x axis
            (
                "|+>",
                (1.0 / math.sqrt(2), 0.0),
                (1.0 / math.sqrt(2), 0.0),
                math.pi / 2,
                0.0,
                1.0,
                0.0,
                0.0,
            ),
            # |-> = (|0> - |1>)/sqrt(2) -> -x axis
            (
                "|->",
                (1.0 / math.sqrt(2), 0.0),
                (-1.0 / math.sqrt(2), 0.0),
                math.pi / 2,
                math.pi,
                -1.0,
                0.0,
                0.0,
            ),
            # |+i> = (|0> + i|1>)/sqrt(2) -> +y axis
            (
                "|+i>",
                (1.0 / math.sqrt(2), 0.0),
                (0.0, 1.0 / math.sqrt(2)),
                math.pi / 2,
                math.pi / 2,
                0.0,
                1.0,
                0.0,
            ),
            # |-i> = (|0> - i|1>)/sqrt(2) -> -y axis
            (
                "|-i>",
                (1.0 / math.sqrt(2), 0.0),
                (0.0, -1.0 / math.sqrt(2)),
                math.pi / 2,
                3 * math.pi / 2,
                0.0,
                -1.0,
                0.0,
            ),
        ],
    )
    def test_named_state(
        self,
        name,
        alpha0,
        alpha1,
        expected_theta,
        expected_phi,
        expected_x,
        expected_y,
        expected_z,
    ):
        theta, phi = state_to_bloch_angles((alpha0, alpha1))
        assert theta == pytest.approx(expected_theta, abs=TOL), f"{name}: theta mismatch"
        assert phi == pytest.approx(expected_phi, abs=TOL), f"{name}: phi mismatch"

        x, y, z = bloch_angles_to_cartesian(theta, phi)
        assert x == pytest.approx(expected_x, abs=TOL), f"{name}: x mismatch"
        assert y == pytest.approx(expected_y, abs=TOL), f"{name}: y mismatch"
        assert z == pytest.approx(expected_z, abs=TOL), f"{name}: z mismatch"


# ─────────────────────────────────────────────────────────────────────────────
# 8. ENTANGLEMENT DETECTION
# ─────────────────────────────────────────────────────────────────────────────


class TestEntanglementDetection:
    """Verify is_entangled correctly classifies product vs. entangled states."""

    def test_zero_state_not_entangled(self):
        """|00> is a product state, NOT entangled."""
        state = create_zero_state(2)
        assert not is_entangled(state)

    def test_product_state_not_entangled(self):
        """|01> is a product state, NOT entangled."""
        state = [(0.0, 0.0), (1.0, 0.0), (0.0, 0.0), (0.0, 0.0)]
        assert not is_entangled(state)

    def test_bell_state_is_entangled(self):
        """Bell state (|00> + |11>)/sqrt(2) IS entangled."""
        s2 = 1.0 / math.sqrt(2)
        bell = [(s2, 0.0), (0.0, 0.0), (0.0, 0.0), (s2, 0.0)]
        assert is_entangled(bell)

    def test_bell_psi_plus_is_entangled(self):
        """Bell state (|01> + |10>)/sqrt(2) IS entangled."""
        s2 = 1.0 / math.sqrt(2)
        psi_plus = [(0.0, 0.0), (s2, 0.0), (s2, 0.0), (0.0, 0.0)]
        assert is_entangled(psi_plus)

    def test_plus_zero_not_entangled(self):
        """|+0> = (|00> + |10>)/sqrt(2) is a product state, NOT entangled."""
        s2 = 1.0 / math.sqrt(2)
        plus_zero = [(s2, 0.0), (0.0, 0.0), (s2, 0.0), (0.0, 0.0)]
        assert not is_entangled(plus_zero)

    def test_wrong_size_raises(self):
        """is_entangled only works for 2-qubit states (4 amplitudes)."""
        with pytest.raises(ValueError, match="2-qubit"):
            is_entangled(create_zero_state(1))
