/**
 * ============================================================================
 * EIGENVUE — Quantum Math Library
 * ============================================================================
 *
 * All quantum mathematical operations for Phase 14 generators.
 * This library is the SINGLE SOURCE OF TRUTH for quantum arithmetic.
 * The Python mirror (quantum_math.py) must produce identical results.
 *
 * CONVENTIONS:
 * - Complex numbers are [real, imaginary] tuples.
 * - State vectors use big-endian (MSB-first) basis ordering.
 * - Gate matrices are row-major 2D arrays of complex numbers.
 * - All angles are in radians.
 * - Tolerance for normalization checks: ±1e-9.
 *
 * PARITY CRITICAL: Every function in this file must match
 * Python quantum_math.py exactly. Same function names (in snake_case),
 * same constants, same algorithms, same accumulation order.
 *
 * REFERENCES:
 * - Nielsen & Chuang, "Quantum Computation and Quantum Information" (2010)
 * - Qiskit Textbook (qiskit.org/textbook)
 * ============================================================================
 */

// ─── Type Definitions ───────────────────────────────────────────────────────

/**
 * A complex number represented as a 2-element tuple: [real, imaginary].
 *
 * CONVENTION:
 *   complex(a, b) is stored as [a, b] and represents a + bi
 *   where i = sqrt(-1).
 *
 * Examples:
 *   [1, 0]    → 1 + 0i = 1        (purely real)
 *   [0, 1]    → 0 + 1i = i        (purely imaginary)
 *   [0.707, 0.707] → (1+i)/√2     (complex)
 */
export type Complex = [number, number];

/** A quantum state vector: array of 2^n complex amplitudes. */
export type StateVector = Complex[];

/** A quantum gate matrix: 2D array of complex numbers. */
export type GateMatrix = Complex[][];

/** Normalization tolerance for state vector checks. */
export const NORM_TOLERANCE = 1e-9;

/** Near-zero threshold for floating-point comparisons. */
export const EPSILON = 1e-10;

// ─── Complex Arithmetic ─────────────────────────────────────────────────────

/**
 * Create a complex number from real and imaginary parts.
 * Convenience function for readability.
 *
 * @param re - Real part.
 * @param im - Imaginary part.
 * @returns Complex number [re, im].
 */
export function complex(re: number, im: number): Complex {
  return [re, im];
}

/** Complex zero: 0 + 0i. */
export const ZERO: Complex = [0, 0];

/** Complex one: 1 + 0i. */
export const ONE: Complex = [1, 0];

/** Imaginary unit: 0 + 1i. */
export const IMAG: Complex = [0, 1];

/**
 * Add two complex numbers.
 *
 * FORMULA: (a + bi) + (c + di) = (a+c) + (b+d)i
 *
 * @param a - First complex number.
 * @param b - Second complex number.
 * @returns Sum a + b.
 */
export function complexAdd(a: Complex, b: Complex): Complex {
  return [a[0] + b[0], a[1] + b[1]];
}

/**
 * Subtract complex numbers: a - b.
 *
 * FORMULA: (a + bi) - (c + di) = (a-c) + (b-d)i
 *
 * @param a - First complex number.
 * @param b - Second complex number.
 * @returns Difference a - b.
 */
export function complexSub(a: Complex, b: Complex): Complex {
  return [a[0] - b[0], a[1] - b[1]];
}

/**
 * Multiply two complex numbers.
 *
 * FORMULA: (a + bi)(c + di) = (ac - bd) + (ad + bc)i
 *
 * CRITICAL: The real part is ac - bd (MINUS), not ac + bd.
 * This comes from i² = -1:
 *   (a + bi)(c + di) = ac + adi + bci + bdi²
 *                    = ac + adi + bci - bd
 *                    = (ac - bd) + (ad + bc)i
 *
 * Verification: complexMul([0,1], [0,1]) must return [-1, 0] (i² = -1).
 *
 * @param a - First complex number.
 * @param b - Second complex number.
 * @returns Product a × b.
 */
export function complexMul(a: Complex, b: Complex): Complex {
  return [
    a[0] * b[0] - a[1] * b[1], // real: ac - bd
    a[0] * b[1] + a[1] * b[0], // imag: ad + bc
  ];
}

/**
 * Divide complex numbers: a / b.
 *
 * FORMULA: (a+bi)/(c+di) = ((ac+bd) + (bc-ad)i) / (c² + d²)
 *
 * @param a - Numerator.
 * @param b - Denominator.
 * @returns Quotient a / b.
 * @throws Error if b is zero (|b|² < EPSILON).
 */
export function complexDiv(a: Complex, b: Complex): Complex {
  const denominator = b[0] * b[0] + b[1] * b[1];
  if (denominator < EPSILON) {
    throw new Error("Complex division by zero");
  }
  return [(a[0] * b[0] + a[1] * b[1]) / denominator, (a[1] * b[0] - a[0] * b[1]) / denominator];
}

/**
 * Complex conjugate: conj(a + bi) = a - bi.
 *
 * @param a - Complex number.
 * @returns Conjugate of a.
 */
export function complexConj(a: Complex): Complex {
  return [a[0], -a[1]];
}

/**
 * Negate: -(a + bi) = -a - bi.
 *
 * @param a - Complex number.
 * @returns Negation of a.
 */
export function complexNeg(a: Complex): Complex {
  return [-a[0], -a[1]];
}

/**
 * Modulus squared: |a + bi|² = a² + b².
 * Avoids unnecessary sqrt — used for Born rule probability computation.
 *
 * @param a - Complex number.
 * @returns |a|² = Re(a)² + Im(a)².
 */
export function complexAbsSq(a: Complex): number {
  return a[0] * a[0] + a[1] * a[1];
}

/**
 * Modulus: |a + bi| = sqrt(a² + b²).
 *
 * @param a - Complex number.
 * @returns |a|.
 */
export function complexAbs(a: Complex): number {
  return Math.sqrt(complexAbsSq(a));
}

/**
 * Phase angle (argument): arg(a + bi) = atan2(b, a).
 * Range: (-π, π].
 *
 * @param a - Complex number.
 * @returns Phase angle in radians.
 */
export function complexArg(a: Complex): number {
  return Math.atan2(a[1], a[0]);
}

/**
 * Complex exponential via Euler's formula: e^{iφ} = cos(φ) + i·sin(φ).
 *
 * @param phi - Angle in radians.
 * @returns Complex number [cos(φ), sin(φ)].
 */
export function complexExp(phi: number): Complex {
  return [Math.cos(phi), Math.sin(phi)];
}

/**
 * Multiply a complex number by a real scalar.
 *
 * @param scalar - Real scalar value.
 * @param z - Complex number.
 * @returns scalar × z.
 */
export function complexScale(scalar: number, z: Complex): Complex {
  return [scalar * z[0], scalar * z[1]];
}

/**
 * Check if two complex numbers are approximately equal.
 *
 * @param a - First complex number.
 * @param b - Second complex number.
 * @param tolerance - Maximum allowed difference per component. Default: 1e-9.
 * @returns true if |Re(a)-Re(b)| < tolerance AND |Im(a)-Im(b)| < tolerance.
 */
export function complexApproxEqual(
  a: Complex,
  b: Complex,
  tolerance: number = NORM_TOLERANCE,
): boolean {
  return Math.abs(a[0] - b[0]) < tolerance && Math.abs(a[1] - b[1]) < tolerance;
}

// ─── State Vector Operations ────────────────────────────────────────────────

/**
 * Create the |0...0⟩ state for n qubits.
 * All amplitudes are [0, 0] except index 0 which is [1, 0].
 *
 * @param numQubits - Number of qubits (n). State vector has 2^n amplitudes.
 * @returns State vector representing |0...0⟩.
 */
export function createZeroState(numQubits: number): StateVector {
  const dim = 1 << numQubits; // 2^n
  const state: StateVector = Array.from({ length: dim }, () => [0, 0] as Complex);
  state[0] = [1, 0];
  return state;
}

/**
 * Create a uniform superposition state: H^{⊗n} |0...0⟩.
 * Every amplitude is [1/√(2^n), 0].
 *
 * @param numQubits - Number of qubits (n).
 * @returns State vector with uniform amplitudes.
 */
export function createUniformSuperposition(numQubits: number): StateVector {
  const dim = 1 << numQubits;
  const amp: number = 1.0 / Math.sqrt(dim);
  return Array.from({ length: dim }, () => [amp, 0] as Complex);
}

/**
 * Compute the norm squared of a state vector: Σ |α_k|².
 * Must equal 1.0 for valid quantum states.
 *
 * @param state - State vector.
 * @returns Σ |α_k|².
 */
export function stateVectorNormSq(state: StateVector): number {
  let sum = 0;
  for (const amp of state) {
    sum += complexAbsSq(amp);
  }
  return sum;
}

/**
 * Verify that a state vector is normalized.
 *
 * @param state - State vector to verify.
 * @param context - Optional context string for error messages.
 * @throws Error if |norm² - 1.0| > NORM_TOLERANCE.
 */
export function assertNormalized(state: StateVector, context: string = ""): void {
  const normSq = stateVectorNormSq(state);
  if (Math.abs(normSq - 1.0) > NORM_TOLERANCE) {
    throw new Error(
      `State vector not normalized${context ? ` (${context})` : ""}: ` +
        `norm² = ${normSq}, expected 1.0 ± ${NORM_TOLERANCE}`,
    );
  }
}

/**
 * Compute measurement probabilities from a state vector.
 * Each probability is |α_k|².
 *
 * POSTCONDITION: Σ probabilities = 1.0 ± NORM_TOLERANCE.
 *
 * @param state - Normalized state vector.
 * @returns Array of probabilities, one per basis state.
 */
export function measurementProbabilities(state: StateVector): number[] {
  return state.map(complexAbsSq);
}

/**
 * Compute the probability of measuring a specific qubit as 0 or 1.
 *
 * P(qubit q = value m) = Σ_{k: bit q of k equals m} |α_k|²
 *
 * @param state - The state vector.
 * @param qubit - 0-based qubit index (big-endian: 0 is MSB).
 * @param numQubits - Total number of qubits.
 * @returns [P(0), P(1)] probabilities.
 */
export function qubitProbabilities(
  state: StateVector,
  qubit: number,
  numQubits: number,
): [number, number] {
  let p0 = 0;
  let p1 = 0;
  const bitPosition = numQubits - 1 - qubit; // Convert big-endian index to bit position
  for (let k = 0; k < state.length; k++) {
    const bitVal = (k >> bitPosition) & 1;
    const prob = complexAbsSq(state[k]!);
    if (bitVal === 0) {
      p0 += prob;
    } else {
      p1 += prob;
    }
  }
  return [p0, p1];
}

/**
 * Project and renormalize a state vector after measuring a qubit.
 *
 * Sets amplitudes inconsistent with the measurement outcome to zero,
 * then divides all remaining amplitudes by sqrt(P(outcome)).
 *
 * @param state - The state vector (NOT mutated; returns a new array).
 * @param qubit - 0-based qubit index being measured.
 * @param outcome - Measurement result: 0 or 1.
 * @param numQubits - Total number of qubits.
 * @returns The post-measurement state vector (normalized).
 */
export function projectAndNormalize(
  state: StateVector,
  qubit: number,
  outcome: 0 | 1,
  numQubits: number,
): StateVector {
  const bitPosition = numQubits - 1 - qubit;
  // Compute probability of this outcome
  let prob = 0;
  for (let k = 0; k < state.length; k++) {
    if (((k >> bitPosition) & 1) === outcome) {
      prob += complexAbsSq(state[k]!);
    }
  }
  if (prob < EPSILON) {
    throw new Error(
      `Cannot project: probability of qubit ${qubit} = ${outcome} is ${prob} (effectively zero)`,
    );
  }
  const normFactor = 1.0 / Math.sqrt(prob);
  const newState: StateVector = state.map((amp, k) => {
    if (((k >> bitPosition) & 1) === outcome) {
      return complexScale(normFactor, amp);
    }
    return [0, 0] as Complex;
  });
  return newState;
}

// ─── Standard Gate Matrices ─────────────────────────────────────────────────

/**
 * Identity gate.
 * I = [[1, 0], [0, 1]]
 * Effect: no change. I|ψ⟩ = |ψ⟩.
 */
export const GATE_I: GateMatrix = [
  [
    [1, 0],
    [0, 0],
  ],
  [
    [0, 0],
    [1, 0],
  ],
];

/**
 * Pauli-X (NOT / Bit Flip) gate.
 * X = [[0, 1], [1, 0]]
 * Effect: X|0⟩ = |1⟩, X|1⟩ = |0⟩.
 * Bloch sphere: rotation by π around x-axis.
 */
export const GATE_X: GateMatrix = [
  [
    [0, 0],
    [1, 0],
  ],
  [
    [1, 0],
    [0, 0],
  ],
];

/**
 * Pauli-Y gate.
 * Y = [[0, -i], [i, 0]]
 * Effect: Y|0⟩ = i|1⟩, Y|1⟩ = -i|0⟩.
 * Bloch sphere: rotation by π around y-axis.
 */
export const GATE_Y: GateMatrix = [
  [
    [0, 0],
    [0, -1],
  ],
  [
    [0, 1],
    [0, 0],
  ],
];

/**
 * Pauli-Z (Phase Flip) gate.
 * Z = [[1, 0], [0, -1]]
 * Effect: Z|0⟩ = |0⟩, Z|1⟩ = -|1⟩.
 * Bloch sphere: rotation by π around z-axis.
 */
export const GATE_Z: GateMatrix = [
  [
    [1, 0],
    [0, 0],
  ],
  [
    [0, 0],
    [-1, 0],
  ],
];

/**
 * Hadamard gate.
 * H = (1/√2) [[1, 1], [1, -1]]
 * Effect: H|0⟩ = |+⟩ = (|0⟩+|1⟩)/√2, H|1⟩ = |−⟩ = (|0⟩−|1⟩)/√2.
 * Bloch sphere: rotation by π around (x+z)/√2 axis.
 *
 * PARITY CRITICAL: Uses Math.SQRT1_2 (IEEE 754: 0.7071067811865476).
 */
export const GATE_H: GateMatrix = (() => {
  const s = Math.SQRT1_2; // 1/√2, exact IEEE 754 representation
  return [
    [
      [s, 0],
      [s, 0],
    ],
    [
      [s, 0],
      [-s, 0],
    ],
  ];
})();

/**
 * Phase gate (S).
 * S = [[1, 0], [0, i]]
 * Effect: S|1⟩ = i|1⟩. S² = Z.
 * Bloch sphere: rotation by π/2 around z-axis.
 */
export const GATE_S: GateMatrix = [
  [
    [1, 0],
    [0, 0],
  ],
  [
    [0, 0],
    [0, 1],
  ],
];

/**
 * T gate (π/8 gate).
 * T = [[1, 0], [0, e^{iπ/4}]]
 * Where e^{iπ/4} = cos(π/4) + i·sin(π/4) = (1+i)/√2.
 * Effect: T|1⟩ = e^{iπ/4}|1⟩. T² = S.
 * Bloch sphere: rotation by π/4 around z-axis.
 *
 * PARITY CRITICAL: cos(π/4) = sin(π/4) = 1/√2 = Math.SQRT1_2.
 */
export const GATE_T: GateMatrix = (() => {
  const c = Math.SQRT1_2; // cos(π/4) = 1/√2
  const s = Math.SQRT1_2; // sin(π/4) = 1/√2
  return [
    [
      [1, 0],
      [0, 0],
    ],
    [
      [0, 0],
      [c, s],
    ],
  ];
})();

/**
 * Rotation gate Rx(θ).
 *
 * Rx(θ) = [[cos(θ/2), -i·sin(θ/2)],
 *          [-i·sin(θ/2), cos(θ/2)]]
 *
 * @param theta - Rotation angle in radians.
 * @returns 2×2 gate matrix.
 */
export function gateRx(theta: number): GateMatrix {
  const c = Math.cos(theta / 2);
  const s = Math.sin(theta / 2);
  return [
    [
      [c, 0],
      [0, -s],
    ],
    [
      [0, -s],
      [c, 0],
    ],
  ];
}

/**
 * Rotation gate Ry(θ).
 *
 * Ry(θ) = [[cos(θ/2), -sin(θ/2)],
 *          [sin(θ/2),  cos(θ/2)]]
 *
 * @param theta - Rotation angle in radians.
 * @returns 2×2 gate matrix.
 */
export function gateRy(theta: number): GateMatrix {
  const c = Math.cos(theta / 2);
  const s = Math.sin(theta / 2);
  return [
    [
      [c, 0],
      [-s, 0],
    ],
    [
      [s, 0],
      [c, 0],
    ],
  ];
}

/**
 * Rotation gate Rz(θ).
 *
 * Rz(θ) = [[e^{-iθ/2}, 0],
 *          [0, e^{iθ/2}]]
 *
 * @param theta - Rotation angle in radians.
 * @returns 2×2 gate matrix.
 */
export function gateRz(theta: number): GateMatrix {
  const c = Math.cos(theta / 2);
  const s = Math.sin(theta / 2);
  return [
    [
      [c, -s],
      [0, 0],
    ],
    [
      [0, 0],
      [c, s],
    ],
  ];
}

/**
 * Look up a named gate. Returns the matrix or null if not a standard gate.
 *
 * @param name - Gate identifier ("I", "X", "Y", "Z", "H", "S", "T", "Rx", "Ry", "Rz").
 * @param angle - Optional rotation angle for parameterized gates (Rx, Ry, Rz).
 * @returns Gate matrix, or null if not recognized.
 */
export function getStandardGate(name: string, angle?: number): GateMatrix | null {
  switch (name) {
    case "I":
      return GATE_I;
    case "X":
      return GATE_X;
    case "Y":
      return GATE_Y;
    case "Z":
      return GATE_Z;
    case "H":
      return GATE_H;
    case "S":
      return GATE_S;
    case "T":
      return GATE_T;
    case "Rx":
      return angle !== undefined ? gateRx(angle) : null;
    case "Ry":
      return angle !== undefined ? gateRy(angle) : null;
    case "Rz":
      return angle !== undefined ? gateRz(angle) : null;
    default:
      return null;
  }
}

// ─── Multi-Qubit Gates ──────────────────────────────────────────────────────

/**
 * CNOT gate (4×4): control=first qubit (row bit 1), target=second qubit (row bit 0).
 *
 * Basis state mapping (big-endian):
 *   |00⟩ → |00⟩, |01⟩ → |01⟩, |10⟩ → |11⟩, |11⟩ → |10⟩
 *
 * PARITY CRITICAL: This matrix assumes control=qubit0, target=qubit1
 * in the gate's internal ordering. When applying to specific qubits,
 * the applyTwoQubitGate function handles the mapping.
 */
export const GATE_CNOT: GateMatrix = [
  [
    [1, 0],
    [0, 0],
    [0, 0],
    [0, 0],
  ],
  [
    [0, 0],
    [1, 0],
    [0, 0],
    [0, 0],
  ],
  [
    [0, 0],
    [0, 0],
    [0, 0],
    [1, 0],
  ],
  [
    [0, 0],
    [0, 0],
    [1, 0],
    [0, 0],
  ],
];

/**
 * CZ gate (4×4). Symmetric: CZ(q0, q1) = CZ(q1, q0).
 *
 * Basis state mapping:
 *   |00⟩ → |00⟩, |01⟩ → |01⟩, |10⟩ → |10⟩, |11⟩ → −|11⟩
 */
export const GATE_CZ: GateMatrix = [
  [
    [1, 0],
    [0, 0],
    [0, 0],
    [0, 0],
  ],
  [
    [0, 0],
    [1, 0],
    [0, 0],
    [0, 0],
  ],
  [
    [0, 0],
    [0, 0],
    [1, 0],
    [0, 0],
  ],
  [
    [0, 0],
    [0, 0],
    [0, 0],
    [-1, 0],
  ],
];

/**
 * SWAP gate (4×4).
 *
 * Basis state mapping:
 *   |00⟩ → |00⟩, |01⟩ → |10⟩, |10⟩ → |01⟩, |11⟩ → |11⟩
 */
export const GATE_SWAP: GateMatrix = [
  [
    [1, 0],
    [0, 0],
    [0, 0],
    [0, 0],
  ],
  [
    [0, 0],
    [0, 0],
    [1, 0],
    [0, 0],
  ],
  [
    [0, 0],
    [1, 0],
    [0, 0],
    [0, 0],
  ],
  [
    [0, 0],
    [0, 0],
    [0, 0],
    [1, 0],
  ],
];

/**
 * Toffoli gate (CCNOT, 8×8): identity with rows 6 and 7 swapped.
 * control1=qubit 0, control2=qubit 1, target=qubit 2.
 *
 * Basis state mapping:
 *   |110⟩ → |111⟩, |111⟩ → |110⟩ (both controls=1, target flips).
 *   All other states unchanged.
 */
export const GATE_TOFFOLI: GateMatrix = (() => {
  const m: GateMatrix = Array.from({ length: 8 }, (_, i) =>
    Array.from({ length: 8 }, (_, j) => (i === j ? ([1, 0] as Complex) : ([0, 0] as Complex))),
  );
  // Swap rows 6 and 7 (|110⟩ ↔ |111⟩)
  m[6] = Array.from({ length: 8 }, (_, j) => (j === 7 ? [1, 0] : [0, 0]) as Complex);
  m[7] = Array.from({ length: 8 }, (_, j) => (j === 6 ? [1, 0] : [0, 0]) as Complex);
  return m;
})();

// ─── Gate Application ───────────────────────────────────────────────────────

/**
 * Apply a single-qubit gate to a specific qubit in an n-qubit state vector.
 *
 * For a single-qubit gate on qubit q in an n-qubit system, we iterate over
 * 2^(n-1) pairs of amplitudes and apply the 2×2 gate matrix to each pair.
 *
 * PARITY CRITICAL: Bit position calculation uses big-endian convention:
 *   bitPosition = numQubits - 1 - qubit
 *
 * @param state - State vector of length 2^n. MUTATED IN PLACE for performance.
 * @param gate - 2×2 gate matrix.
 * @param qubit - 0-based target qubit (big-endian: 0 is MSB).
 * @param numQubits - Total number of qubits.
 */
export function applySingleQubitGate(
  state: StateVector,
  gate: GateMatrix,
  qubit: number,
  numQubits: number,
): void {
  const dim = 1 << numQubits;
  const bitPosition = numQubits - 1 - qubit; // Bit position for this qubit
  const stepSize = 1 << bitPosition; // Distance between paired amplitudes

  // Iterate over pairs: for each pair, one index has bit=0, the other has bit=1
  for (let i = 0; i < dim; i++) {
    // Only process indices where the target bit is 0 (avoid double-processing)
    if ((i >> bitPosition) & 1) continue;

    const idx0 = i; // Index with target qubit = 0
    const idx1 = i | stepSize; // Index with target qubit = 1

    // Apply 2×2 matrix: [new0, new1] = gate × [state[idx0], state[idx1]]
    const a0 = state[idx0]!;
    const a1 = state[idx1]!;

    state[idx0] = complexAdd(complexMul(gate[0]![0]!, a0), complexMul(gate[0]![1]!, a1));
    state[idx1] = complexAdd(complexMul(gate[1]![0]!, a0), complexMul(gate[1]![1]!, a1));
  }
}

/**
 * Apply a two-qubit gate to specific qubits in an n-qubit state vector.
 *
 * For a 2-qubit gate on qubits [q0, q1], we iterate over 2^(n-2) groups
 * of 4 amplitudes and apply the 4×4 gate matrix to each group.
 *
 * The gate's internal qubit ordering is:
 *   row/col index bit 1 = qubit0, bit 0 = qubit1.
 *
 * @param state - State vector (MUTATED IN PLACE).
 * @param gate - 4×4 gate matrix.
 * @param qubit0 - First qubit (e.g., control for CNOT).
 * @param qubit1 - Second qubit (e.g., target for CNOT).
 * @param numQubits - Total number of qubits.
 */
export function applyTwoQubitGate(
  state: StateVector,
  gate: GateMatrix,
  qubit0: number,
  qubit1: number,
  numQubits: number,
): void {
  const dim = 1 << numQubits;
  const bit0 = numQubits - 1 - qubit0; // Bit position for qubit0
  const bit1 = numQubits - 1 - qubit1; // Bit position for qubit1

  // Track which indices we've already processed
  const processed = new Uint8Array(dim);

  for (let i = 0; i < dim; i++) {
    if (processed[i]) continue;

    // Compute the 4 indices by setting bits at bit0 and bit1 to all combinations
    const base = i & ~((1 << bit0) | (1 << bit1)); // Clear both target bits

    const indices = [
      base, // q0=0, q1=0 → gate row/col 0
      base | (1 << bit1), // q0=0, q1=1 → gate row/col 1
      base | (1 << bit0), // q0=1, q1=0 → gate row/col 2
      base | (1 << bit0) | (1 << bit1), // q0=1, q1=1 → gate row/col 3
    ];

    // Read the 4 amplitudes
    const amps: Complex[] = indices.map((idx) => [...state[idx]!] as Complex);

    // Apply 4×4 gate matrix
    for (let r = 0; r < 4; r++) {
      let newAmp: Complex = [0, 0];
      for (let c = 0; c < 4; c++) {
        newAmp = complexAdd(newAmp, complexMul(gate[r]![c]!, amps[c]!));
      }
      state[indices[r]!] = newAmp;
    }

    // Mark all 4 as processed
    for (const idx of indices) {
      processed[idx] = 1;
    }
  }
}

/**
 * Apply the Grover oracle: negate the amplitude of the target state(s).
 *
 * U_f|x⟩ = (-1)^{f(x)}|x⟩
 * For each target index t: state[t] = -state[t].
 *
 * @param state - State vector (MUTATED IN PLACE).
 * @param targets - Array of target basis state indices to negate.
 */
export function applyGroverOracle(state: StateVector, targets: number[]): void {
  for (const t of targets) {
    state[t] = complexNeg(state[t]!);
  }
}

/**
 * Apply the Grover diffusion operator: reflect about the uniform superposition.
 *
 * FORMULA:
 *   mean = (1/N) × Σ α_k   (COMPLEX mean — both real and imaginary parts)
 *   α'_k = 2 × mean - α_k
 *
 * @param state - State vector (MUTATED IN PLACE).
 */
export function applyGroverDiffusion(state: StateVector): void {
  const n = state.length;
  // Compute complex mean
  let meanRe = 0;
  let meanIm = 0;
  for (const amp of state) {
    meanRe += amp[0];
    meanIm += amp[1];
  }
  meanRe /= n;
  meanIm /= n;

  // Reflect each amplitude about the mean
  for (let k = 0; k < n; k++) {
    state[k] = [2 * meanRe - state[k]![0], 2 * meanIm - state[k]![1]];
  }
}

// ─── Bloch Sphere Coordinates ───────────────────────────────────────────────

/**
 * Normalize an angle to [0, 2π).
 *
 * @param angle - Angle in radians.
 * @returns Equivalent angle in [0, 2π).
 */
export function normalizeAngle(angle: number): number {
  let result = angle % (2 * Math.PI);
  if (result < 0) result += 2 * Math.PI;
  return result;
}

/**
 * Convert a single-qubit state vector to Bloch sphere angles (θ, φ).
 *
 * Uses the canonical form where α₀ is real and non-negative.
 * |ψ⟩ = cos(θ/2)|0⟩ + e^{iφ}sin(θ/2)|1⟩
 *
 * Edge cases:
 * - |α₀| ≈ 0 (state ≈ |1⟩): θ = π, φ = arg(α₁)
 * - |α₁| ≈ 0 (state ≈ |0⟩): θ = 0, φ = 0 (arbitrary)
 * - |α₀| clamped to [0,1] before acos to prevent NaN
 *
 * @param state - Two-element state vector [α₀, α₁].
 * @returns { theta, phi } in radians. theta ∈ [0, π], phi ∈ [0, 2π).
 */
export function stateToBlochAngles(state: [Complex, Complex]): {
  theta: number;
  phi: number;
} {
  const [alpha0, alpha1] = state;

  // Clamp |α₀| to [0, 1] to prevent NaN from acos due to floating-point drift
  const absAlpha0 = Math.min(1.0, Math.max(0.0, complexAbs(alpha0)));

  // θ = 2 × acos(|α₀|)
  const theta = 2 * Math.acos(absAlpha0);

  // Handle edge cases for φ
  if (absAlpha0 < EPSILON) {
    // State is essentially |1⟩ — φ is the phase of α₁
    return { theta: Math.PI, phi: normalizeAngle(complexArg(alpha1)) };
  }
  if (complexAbs(alpha1) < EPSILON) {
    // State is essentially |0⟩ — φ is undefined, set to 0
    return { theta: 0, phi: 0 };
  }

  // φ = arg(α₁) - arg(α₀)
  let phi = complexArg(alpha1) - complexArg(alpha0);
  phi = normalizeAngle(phi);

  return { theta, phi };
}

/**
 * Convert Bloch sphere angles to a state vector.
 *
 * |ψ⟩ = cos(θ/2)|0⟩ + e^{iφ}sin(θ/2)|1⟩
 *
 * @param theta - Polar angle in radians, range [0, π].
 * @param phi - Azimuthal angle in radians, range [0, 2π).
 * @returns Two-element state vector [α₀, α₁].
 */
export function blochAnglesToState(theta: number, phi: number): [Complex, Complex] {
  const alpha0: Complex = [Math.cos(theta / 2), 0]; // Real and non-negative
  const alpha1: Complex = complexScale(Math.sin(theta / 2), complexExp(phi));
  return [alpha0, alpha1];
}

/**
 * Convert Bloch angles to Cartesian coordinates for rendering.
 *
 * x = sin(θ) × cos(φ)
 * y = sin(θ) × sin(φ)
 * z = cos(θ)
 *
 * These satisfy x² + y² + z² = 1 (point on the unit sphere).
 *
 * @param theta - Polar angle in radians.
 * @param phi - Azimuthal angle in radians.
 * @returns Cartesian coordinates { x, y, z }.
 */
export function blochAnglesToCartesian(
  theta: number,
  phi: number,
): { x: number; y: number; z: number } {
  return {
    x: Math.sin(theta) * Math.cos(phi),
    y: Math.sin(theta) * Math.sin(phi),
    z: Math.cos(theta),
  };
}

// ─── Tensor Product ─────────────────────────────────────────────────────────

/**
 * Compute the tensor (Kronecker) product of two state vectors.
 *
 * |a⟩ ⊗ |b⟩: result[i × len(b) + j] = a[i] × b[j]
 *
 * @param a - First state vector.
 * @param b - Second state vector.
 * @returns Tensor product state vector.
 */
export function tensorProduct(a: StateVector, b: StateVector): StateVector {
  const result: StateVector = [];
  for (const ai of a) {
    for (const bj of b) {
      result.push(complexMul(ai, bj));
    }
  }
  return result;
}

/**
 * Compute the tensor (Kronecker) product of two gate matrices.
 *
 * (A ⊗ B)_{(i*p+k), (j*q+l)} = A_{i,j} × B_{k,l}
 * Where A is m×n, B is p×q, result is (m*p) × (n*q).
 *
 * @param a - First gate matrix.
 * @param b - Second gate matrix.
 * @returns Tensor product gate matrix.
 */
export function matrixTensorProduct(a: GateMatrix, b: GateMatrix): GateMatrix {
  const m = a.length;
  const n = a[0]!.length;
  const p = b.length;
  const q = b[0]!.length;
  const result: GateMatrix = Array.from({ length: m * p }, () =>
    Array.from({ length: n * q }, () => [0, 0] as Complex),
  );
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      for (let k = 0; k < p; k++) {
        for (let l = 0; l < q; l++) {
          result[i * p + k]![j * q + l] = complexMul(a[i]![j]!, b[k]![l]!);
        }
      }
    }
  }
  return result;
}

// ─── Verification Utilities ─────────────────────────────────────────────────

/**
 * Verify that a matrix is unitary: U × U† = I.
 *
 * Computes (U × U†)[i][j] = Σ_k U[i][k] × conj(U[j][k])
 * and checks that the result equals the identity matrix within tolerance.
 *
 * @param matrix - Square gate matrix.
 * @param tolerance - Maximum allowed deviation per element. Default: 1e-9.
 * @returns true if the matrix is unitary within tolerance.
 */
export function isUnitary(matrix: GateMatrix, tolerance: number = NORM_TOLERANCE): boolean {
  const d = matrix.length;
  for (let i = 0; i < d; i++) {
    for (let j = 0; j < d; j++) {
      // Compute (U × U†)[i][j] = Σ_k U[i][k] × conj(U[j][k])
      let sum: Complex = [0, 0];
      for (let k = 0; k < d; k++) {
        sum = complexAdd(sum, complexMul(matrix[i]![k]!, complexConj(matrix[j]![k]!)));
      }
      const expected: Complex = i === j ? [1, 0] : [0, 0];
      if (!complexApproxEqual(sum, expected, tolerance)) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Check if a 2-qubit state is entangled.
 *
 * A state [α₀₀, α₀₁, α₁₀, α₁₁] is separable iff α₀₀×α₁₁ = α₀₁×α₁₀
 * (determinant condition — the 2×2 amplitude matrix has rank 1).
 *
 * @param state - 4-element state vector (2 qubits).
 * @returns true if the state is entangled (NOT separable).
 * @throws Error if state does not have exactly 4 elements.
 */
export function isEntangled(state: StateVector): boolean {
  if (state.length !== 4) {
    throw new Error("isEntangled only works for 2-qubit states (4 amplitudes)");
  }
  const product1 = complexMul(state[0]!, state[3]!); // α₀₀ × α₁₁
  const product2 = complexMul(state[1]!, state[2]!); // α₀₁ × α₁₀
  return !complexApproxEqual(product1, product2, 1e-9);
}

/**
 * Generate basis state labels for n qubits.
 * Returns ["|00...0⟩", "|00...1⟩", ..., "|11...1⟩"].
 *
 * @param numQubits - Number of qubits.
 * @returns Array of basis state label strings.
 */
export function basisLabels(numQubits: number): string[] {
  const dim = 1 << numQubits;
  return Array.from({ length: dim }, (_, k) => `|${k.toString(2).padStart(numQubits, "0")}⟩`);
}
