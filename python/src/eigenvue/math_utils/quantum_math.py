"""
Quantum Math Library — Python mirror of quantum-math.ts.

All quantum mathematical operations for Phase 14 generators.
This library is the SINGLE SOURCE OF TRUTH for quantum arithmetic
in the Python package. The TypeScript version
(``web/src/engine/utils/quantum-math.ts``) is the canonical reference;
this file is a line-for-line mirror.

CONVENTIONS:
- Complex numbers are (real, imaginary) tuples — NOT Python's built-in ``complex``.
- State vectors use big-endian (MSB-first) basis ordering.
- Gate matrices are row-major 2D lists of complex tuples.
- All angles are in radians.
- Tolerance for normalization checks: +/-1e-9.

PARITY CRITICAL: Every function here must match the TypeScript version exactly.
Same function names (snake_case), same constants, same algorithms, same
accumulation order. Cross-language parity tests enforce +/-1e-9 tolerance.

NO NUMPY. This module is pure Python for zero external dependencies.
"""

from __future__ import annotations

import math

# ── Type Aliases ─────────────────────────────────────────────────────────────

Complex = tuple[float, float]
"""A complex number as (real, imaginary)."""

StateVector = list[Complex]
"""A quantum state vector: list of 2^n complex amplitudes."""

GateMatrix = list[list[Complex]]
"""A quantum gate matrix: 2D list of complex numbers."""

# ── Constants ────────────────────────────────────────────────────────────────

NORM_TOLERANCE: float = 1e-9
"""Normalization tolerance for state vector checks."""

EPSILON: float = 1e-10
"""Near-zero threshold for floating-point comparisons."""

ZERO: Complex = (0.0, 0.0)
"""Complex zero: 0 + 0i."""

ONE: Complex = (1.0, 0.0)
"""Complex one: 1 + 0i."""

IMAG: Complex = (0.0, 1.0)
"""Imaginary unit: 0 + 1i."""


# ── Complex Arithmetic ──────────────────────────────────────────────────────


def complex_num(re: float, im: float) -> Complex:
    """Create a complex number from real and imaginary parts."""
    return (re, im)


def complex_add(a: Complex, b: Complex) -> Complex:
    """Add two complex numbers: (a+bi) + (c+di) = (a+c) + (b+d)i."""
    return (a[0] + b[0], a[1] + b[1])


def complex_sub(a: Complex, b: Complex) -> Complex:
    """Subtract complex numbers: a - b."""
    return (a[0] - b[0], a[1] - b[1])


def complex_mul(a: Complex, b: Complex) -> Complex:
    """Multiply two complex numbers: (ac - bd) + (ad + bc)i."""
    return (
        a[0] * b[0] - a[1] * b[1],  # real: ac - bd
        a[0] * b[1] + a[1] * b[0],  # imag: ad + bc
    )


def complex_div(a: Complex, b: Complex) -> Complex:
    """Divide complex numbers: a / b.

    Raises
    ------
    ValueError
        If ``b`` is zero (|b|² < EPSILON).
    """
    denominator = b[0] * b[0] + b[1] * b[1]
    if denominator < EPSILON:
        raise ValueError("Complex division by zero")
    return (
        (a[0] * b[0] + a[1] * b[1]) / denominator,
        (a[1] * b[0] - a[0] * b[1]) / denominator,
    )


def complex_conj(a: Complex) -> Complex:
    """Complex conjugate: conj(a + bi) = a - bi."""
    return (a[0], -a[1])


def complex_neg(a: Complex) -> Complex:
    """Negate: -(a + bi) = -a - bi."""
    return (-a[0], -a[1])


def complex_abs_sq(a: Complex) -> float:
    """Modulus squared: |a + bi|² = a² + b²."""
    return a[0] * a[0] + a[1] * a[1]


def complex_abs(a: Complex) -> float:
    """Modulus: |a + bi| = sqrt(a² + b²)."""
    return math.sqrt(complex_abs_sq(a))


def complex_arg(a: Complex) -> float:
    """Phase angle (argument): arg(a + bi) = atan2(b, a). Range: (-π, π]."""
    return math.atan2(a[1], a[0])


def complex_exp(phi: float) -> Complex:
    """Complex exponential: e^{iφ} = cos(φ) + i·sin(φ)."""
    return (math.cos(phi), math.sin(phi))


def complex_scale(scalar: float, z: Complex) -> Complex:
    """Multiply a complex number by a real scalar."""
    return (scalar * z[0], scalar * z[1])


def complex_approx_equal(a: Complex, b: Complex, tolerance: float = NORM_TOLERANCE) -> bool:
    """Check if two complex numbers are approximately equal."""
    return abs(a[0] - b[0]) < tolerance and abs(a[1] - b[1]) < tolerance


# ── State Vector Operations ─────────────────────────────────────────────────


def create_zero_state(num_qubits: int) -> StateVector:
    """Create the |0...0⟩ state for n qubits."""
    dim = 1 << num_qubits
    state: StateVector = [(0.0, 0.0)] * dim
    state[0] = (1.0, 0.0)
    return state


def create_uniform_superposition(num_qubits: int) -> StateVector:
    """Create a uniform superposition state: H^{⊗n} |0...0⟩."""
    dim = 1 << num_qubits
    amp = 1.0 / math.sqrt(dim)
    return [(amp, 0.0)] * dim


def state_vector_norm_sq(state: StateVector) -> float:
    """Compute the norm squared of a state vector: sum |a_k|^2."""
    total = 0.0
    for amp in state:
        total += complex_abs_sq(amp)
    return total


def assert_normalized(state: StateVector, context: str = "") -> None:
    """Verify that a state vector is normalized.

    Raises
    ------
    ValueError
        If |norm² - 1.0| > NORM_TOLERANCE.
    """
    norm_sq = state_vector_norm_sq(state)
    if abs(norm_sq - 1.0) > NORM_TOLERANCE:
        ctx = f" ({context})" if context else ""
        raise ValueError(
            f"State vector not normalized{ctx}: norm² = {norm_sq}, expected 1.0 ± {NORM_TOLERANCE}"
        )


def measurement_probabilities(state: StateVector) -> list[float]:
    """Compute measurement probabilities: |a_k|^2 for each basis state."""
    return [complex_abs_sq(amp) for amp in state]


def qubit_probabilities(state: StateVector, qubit: int, num_qubits: int) -> tuple[float, float]:
    """Compute probability of measuring a specific qubit as 0 or 1.

    Returns
    -------
    tuple[float, float]
        (P(0), P(1)) probabilities.
    """
    p0 = 0.0
    p1 = 0.0
    bit_position = num_qubits - 1 - qubit
    for k, amp in enumerate(state):
        bit_val = (k >> bit_position) & 1
        prob = complex_abs_sq(amp)
        if bit_val == 0:
            p0 += prob
        else:
            p1 += prob
    return (p0, p1)


def project_and_normalize(
    state: StateVector, qubit: int, outcome: int, num_qubits: int
) -> StateVector:
    """Project and renormalize after measuring a qubit.

    Parameters
    ----------
    state
        The state vector (NOT mutated; returns a new list).
    qubit
        0-based qubit index being measured.
    outcome
        Measurement result: 0 or 1.
    num_qubits
        Total number of qubits.

    Returns
    -------
    StateVector
        The post-measurement state vector (normalized).
    """
    bit_position = num_qubits - 1 - qubit
    prob = 0.0
    for k, amp in enumerate(state):
        if ((k >> bit_position) & 1) == outcome:
            prob += complex_abs_sq(amp)
    if prob < EPSILON:
        raise ValueError(
            f"Cannot project: probability of qubit {qubit} = {outcome} is {prob} (effectively zero)"
        )
    norm_factor = 1.0 / math.sqrt(prob)
    new_state: StateVector = []
    for k, amp in enumerate(state):
        if ((k >> bit_position) & 1) == outcome:
            new_state.append(complex_scale(norm_factor, amp))
        else:
            new_state.append((0.0, 0.0))
    return new_state


# ── Standard Gate Matrices ──────────────────────────────────────────────────

GATE_I: GateMatrix = [
    [(1.0, 0.0), (0.0, 0.0)],
    [(0.0, 0.0), (1.0, 0.0)],
]
"""Identity gate."""

GATE_X: GateMatrix = [
    [(0.0, 0.0), (1.0, 0.0)],
    [(1.0, 0.0), (0.0, 0.0)],
]
"""Pauli-X (NOT / Bit Flip) gate."""

GATE_Y: GateMatrix = [
    [(0.0, 0.0), (0.0, -1.0)],
    [(0.0, 1.0), (0.0, 0.0)],
]
"""Pauli-Y gate."""

GATE_Z: GateMatrix = [
    [(1.0, 0.0), (0.0, 0.0)],
    [(0.0, 0.0), (-1.0, 0.0)],
]
"""Pauli-Z (Phase Flip) gate."""

_SQRT1_2 = 1.0 / math.sqrt(2.0)
"""1/√2, matching JS Math.SQRT1_2 ≈ 0.7071067811865476."""

GATE_H: GateMatrix = [
    [(_SQRT1_2, 0.0), (_SQRT1_2, 0.0)],
    [(_SQRT1_2, 0.0), (-_SQRT1_2, 0.0)],
]
"""Hadamard gate. Uses 1/√2 = math.sqrt(0.5)."""

GATE_S: GateMatrix = [
    [(1.0, 0.0), (0.0, 0.0)],
    [(0.0, 0.0), (0.0, 1.0)],
]
"""Phase gate (S)."""

GATE_T: GateMatrix = [
    [(1.0, 0.0), (0.0, 0.0)],
    [(0.0, 0.0), (_SQRT1_2, _SQRT1_2)],
]
"""T gate (π/8 gate). T = diag(1, e^{iπ/4})."""


def gate_rx(theta: float) -> GateMatrix:
    """Rotation gate Rx(θ)."""
    c = math.cos(theta / 2)
    s = math.sin(theta / 2)
    return [
        [(c, 0.0), (0.0, -s)],
        [(0.0, -s), (c, 0.0)],
    ]


def gate_ry(theta: float) -> GateMatrix:
    """Rotation gate Ry(θ)."""
    c = math.cos(theta / 2)
    s = math.sin(theta / 2)
    return [
        [(c, 0.0), (-s, 0.0)],
        [(s, 0.0), (c, 0.0)],
    ]


def gate_rz(theta: float) -> GateMatrix:
    """Rotation gate Rz(θ)."""
    c = math.cos(theta / 2)
    s = math.sin(theta / 2)
    return [
        [(c, -s), (0.0, 0.0)],
        [(0.0, 0.0), (c, s)],
    ]


def get_standard_gate(name: str, angle: float | None = None) -> GateMatrix | None:
    """Look up a named gate. Returns the matrix or None if not recognized."""
    gates: dict[str, GateMatrix] = {
        "I": GATE_I,
        "X": GATE_X,
        "Y": GATE_Y,
        "Z": GATE_Z,
        "H": GATE_H,
        "S": GATE_S,
        "T": GATE_T,
    }
    if name in gates:
        return gates[name]
    if name == "Rx" and angle is not None:
        return gate_rx(angle)
    if name == "Ry" and angle is not None:
        return gate_ry(angle)
    if name == "Rz" and angle is not None:
        return gate_rz(angle)
    return None


# ── Multi-Qubit Gates ───────────────────────────────────────────────────────

GATE_CNOT: GateMatrix = [
    [(1.0, 0.0), (0.0, 0.0), (0.0, 0.0), (0.0, 0.0)],
    [(0.0, 0.0), (1.0, 0.0), (0.0, 0.0), (0.0, 0.0)],
    [(0.0, 0.0), (0.0, 0.0), (0.0, 0.0), (1.0, 0.0)],
    [(0.0, 0.0), (0.0, 0.0), (1.0, 0.0), (0.0, 0.0)],
]
"""CNOT gate (4x4)."""

GATE_CZ: GateMatrix = [
    [(1.0, 0.0), (0.0, 0.0), (0.0, 0.0), (0.0, 0.0)],
    [(0.0, 0.0), (1.0, 0.0), (0.0, 0.0), (0.0, 0.0)],
    [(0.0, 0.0), (0.0, 0.0), (1.0, 0.0), (0.0, 0.0)],
    [(0.0, 0.0), (0.0, 0.0), (0.0, 0.0), (-1.0, 0.0)],
]
"""CZ gate (4x4)."""

GATE_SWAP: GateMatrix = [
    [(1.0, 0.0), (0.0, 0.0), (0.0, 0.0), (0.0, 0.0)],
    [(0.0, 0.0), (0.0, 0.0), (1.0, 0.0), (0.0, 0.0)],
    [(0.0, 0.0), (1.0, 0.0), (0.0, 0.0), (0.0, 0.0)],
    [(0.0, 0.0), (0.0, 0.0), (0.0, 0.0), (1.0, 0.0)],
]
"""SWAP gate (4x4)."""


def _make_toffoli() -> GateMatrix:
    """Construct the Toffoli (CCNOT) 8x8 gate matrix."""
    m: GateMatrix = [[(1.0, 0.0) if i == j else (0.0, 0.0) for j in range(8)] for i in range(8)]
    # Swap rows 6 and 7 (|110⟩ ↔ |111⟩)
    m[6] = [(1.0, 0.0) if j == 7 else (0.0, 0.0) for j in range(8)]
    m[7] = [(1.0, 0.0) if j == 6 else (0.0, 0.0) for j in range(8)]
    return m


GATE_TOFFOLI: GateMatrix = _make_toffoli()
"""Toffoli gate (CCNOT, 8x8)."""


# ── Gate Application ────────────────────────────────────────────────────────


def apply_single_qubit_gate(
    state: StateVector,
    gate: GateMatrix,
    qubit: int,
    num_qubits: int,
) -> None:
    """Apply a single-qubit gate to a specific qubit. MUTATES state in place."""
    dim = 1 << num_qubits
    bit_position = num_qubits - 1 - qubit
    step_size = 1 << bit_position

    for i in range(dim):
        if (i >> bit_position) & 1:
            continue

        idx0 = i
        idx1 = i | step_size

        a0 = state[idx0]
        a1 = state[idx1]

        state[idx0] = complex_add(complex_mul(gate[0][0], a0), complex_mul(gate[0][1], a1))
        state[idx1] = complex_add(complex_mul(gate[1][0], a0), complex_mul(gate[1][1], a1))


def apply_two_qubit_gate(
    state: StateVector,
    gate: GateMatrix,
    qubit0: int,
    qubit1: int,
    num_qubits: int,
) -> None:
    """Apply a two-qubit gate to specific qubits. MUTATES state in place."""
    dim = 1 << num_qubits
    bit0 = num_qubits - 1 - qubit0
    bit1 = num_qubits - 1 - qubit1

    processed = bytearray(dim)

    for i in range(dim):
        if processed[i]:
            continue

        base = i & ~((1 << bit0) | (1 << bit1))

        indices = [
            base,  # q0=0, q1=0 → gate row/col 0
            base | (1 << bit1),  # q0=0, q1=1 → gate row/col 1
            base | (1 << bit0),  # q0=1, q1=0 → gate row/col 2
            base | (1 << bit0) | (1 << bit1),  # q0=1, q1=1 → gate row/col 3
        ]

        amps = [state[idx] for idx in indices]

        for r in range(4):
            new_amp: Complex = (0.0, 0.0)
            for c in range(4):
                new_amp = complex_add(new_amp, complex_mul(gate[r][c], amps[c]))
            state[indices[r]] = new_amp

        for idx in indices:
            processed[idx] = 1


def apply_grover_oracle(state: StateVector, targets: list[int]) -> None:
    """Apply the Grover oracle: negate target state amplitudes. MUTATES state."""
    for t in targets:
        state[t] = complex_neg(state[t])


def apply_grover_diffusion(state: StateVector) -> None:
    """Apply the Grover diffusion operator: reflect about the mean. MUTATES state."""
    n = len(state)
    mean_re = 0.0
    mean_im = 0.0
    for amp in state:
        mean_re += amp[0]
        mean_im += amp[1]
    mean_re /= n
    mean_im /= n

    for k in range(n):
        state[k] = (2 * mean_re - state[k][0], 2 * mean_im - state[k][1])


# ── Bloch Sphere Coordinates ────────────────────────────────────────────────


def normalize_angle(angle: float) -> float:
    """Normalize an angle to [0, 2π)."""
    result = angle % (2 * math.pi)
    if result < 0:
        result += 2 * math.pi
    return result


def state_to_bloch_angles(
    state: tuple[Complex, Complex],
) -> tuple[float, float]:
    """Convert a single-qubit state vector to Bloch sphere angles (θ, φ).

    Returns
    -------
    tuple[float, float]
        (theta, phi) in radians. theta ∈ [0, π], phi ∈ [0, 2π).
    """
    alpha0, alpha1 = state

    abs_alpha0 = min(1.0, max(0.0, complex_abs(alpha0)))
    theta = 2 * math.acos(abs_alpha0)

    if abs_alpha0 < EPSILON:
        return (math.pi, normalize_angle(complex_arg(alpha1)))
    if complex_abs(alpha1) < EPSILON:
        return (0.0, 0.0)

    phi = complex_arg(alpha1) - complex_arg(alpha0)
    phi = normalize_angle(phi)

    return (theta, phi)


def bloch_angles_to_state(theta: float, phi: float) -> tuple[Complex, Complex]:
    """Convert Bloch sphere angles to a state vector.

    |ψ⟩ = cos(θ/2)|0⟩ + e^{iφ}sin(θ/2)|1⟩
    """
    alpha0: Complex = (math.cos(theta / 2), 0.0)
    alpha1: Complex = complex_scale(math.sin(theta / 2), complex_exp(phi))
    return (alpha0, alpha1)


def bloch_angles_to_cartesian(theta: float, phi: float) -> tuple[float, float, float]:
    """Convert Bloch angles to Cartesian coordinates (x, y, z)."""
    return (
        math.sin(theta) * math.cos(phi),
        math.sin(theta) * math.sin(phi),
        math.cos(theta),
    )


# ── Tensor Product ──────────────────────────────────────────────────────────


def tensor_product(a: StateVector, b: StateVector) -> StateVector:
    """Compute the tensor (Kronecker) product of two state vectors."""
    result: StateVector = []
    for ai in a:
        for bj in b:
            result.append(complex_mul(ai, bj))
    return result


def matrix_tensor_product(a: GateMatrix, b: GateMatrix) -> GateMatrix:
    """Compute the tensor (Kronecker) product of two gate matrices."""
    m = len(a)
    n = len(a[0])
    p = len(b)
    q = len(b[0])
    result: GateMatrix = [[(0.0, 0.0) for _ in range(n * q)] for _ in range(m * p)]
    for i in range(m):
        for j in range(n):
            for k in range(p):
                for l in range(q):
                    result[i * p + k][j * q + l] = complex_mul(a[i][j], b[k][l])
    return result


# ── Verification Utilities ──────────────────────────────────────────────────


def is_unitary(matrix: GateMatrix, tolerance: float = NORM_TOLERANCE) -> bool:
    """Verify that a matrix is unitary: U x U-dagger = I."""
    d = len(matrix)
    for i in range(d):
        for j in range(d):
            total: Complex = (0.0, 0.0)
            for k in range(d):
                total = complex_add(total, complex_mul(matrix[i][k], complex_conj(matrix[j][k])))
            expected: Complex = (1.0, 0.0) if i == j else (0.0, 0.0)
            if not complex_approx_equal(total, expected, tolerance):
                return False
    return True


def is_entangled(state: StateVector) -> bool:
    """Check if a 2-qubit state is entangled (determinant condition).

    Raises
    ------
    ValueError
        If state does not have exactly 4 elements.
    """
    if len(state) != 4:
        raise ValueError("is_entangled only works for 2-qubit states (4 amplitudes)")
    product1 = complex_mul(state[0], state[3])  # a00 * a11
    product2 = complex_mul(state[1], state[2])  # a01 * a10
    return not complex_approx_equal(product1, product2, 1e-9)


def basis_labels(num_qubits: int) -> list[str]:
    """Generate basis state labels for n qubits: ["|00⟩", "|01⟩", ...]."""
    dim = 1 << num_qubits
    return [f"|{k:0{num_qubits}b}⟩" for k in range(dim)]
