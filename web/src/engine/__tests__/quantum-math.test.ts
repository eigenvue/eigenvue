/**
 * @fileoverview Tests for quantum-math.ts — Quantum Math Library.
 *
 * Every function is tested for correctness against hand-computed values,
 * postconditions, and edge cases. Gate matrices are verified for unitarity.
 *
 * Mathematical basis: Section 4 and Section 5 of the Phase 14 specification.
 */

import { describe, it, expect } from "vitest";
import {
  complex,
  ZERO,
  ONE,
  IMAG,
  complexAdd,
  complexSub,
  complexMul,
  complexDiv,
  complexConj,
  complexNeg,
  complexAbsSq,
  complexAbs,
  complexArg,
  complexExp,
  complexScale,
  complexApproxEqual,
  createZeroState,
  createUniformSuperposition,
  stateVectorNormSq,
  assertNormalized,
  measurementProbabilities,
  qubitProbabilities,
  projectAndNormalize,
  GATE_I,
  GATE_X,
  GATE_Y,
  GATE_Z,
  GATE_H,
  GATE_S,
  GATE_T,
  gateRx,
  gateRy,
  gateRz,
  getStandardGate,
  GATE_CNOT,
  GATE_CZ,
  GATE_SWAP,
  GATE_TOFFOLI,
  applySingleQubitGate,
  applyTwoQubitGate,
  applyGroverOracle,
  applyGroverDiffusion,
  stateToBlochAngles,
  blochAnglesToState,
  blochAnglesToCartesian,
  tensorProduct,
  matrixTensorProduct,
  isUnitary,
  isEntangled,
  basisLabels,
  type Complex,
  type StateVector,
  type GateMatrix,
  NORM_TOLERANCE,
} from "../utils/quantum-math";

// ── Helpers ─────────────────────────────────────────────────────────────────

const SQRT1_2 = Math.SQRT1_2; // 1/√2 ≈ 0.7071067811865476

/** Check complex approximately equal. */
function expectComplex(actual: Complex, expected: Complex, tol = 1e-9) {
  expect(Math.abs(actual[0] - expected[0])).toBeLessThan(tol);
  expect(Math.abs(actual[1] - expected[1])).toBeLessThan(tol);
}

/** Check state vector approximately equal. */
function _expectState(actual: StateVector, expected: StateVector, tol = 1e-9) {
  expect(actual.length).toBe(expected.length);
  for (let i = 0; i < actual.length; i++) {
    expectComplex(actual[i]!, expected[i]!, tol);
  }
}

/** Clone a state vector. */
function _cloneState(state: StateVector): StateVector {
  return state.map(([re, im]) => [re, im] as Complex);
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. Complex Arithmetic
// ══════════════════════════════════════════════════════════════════════════════

describe("complex arithmetic", () => {
  it("complex() creates a complex number", () => {
    expect(complex(3, 4)).toEqual([3, 4]);
  });

  it("constants are correct", () => {
    expect(ZERO).toEqual([0, 0]);
    expect(ONE).toEqual([1, 0]);
    expect(IMAG).toEqual([0, 1]);
  });

  it("adds two complex numbers", () => {
    expectComplex(complexAdd([1, 2], [3, 4]), [4, 6]);
  });

  it("subtracts two complex numbers", () => {
    expectComplex(complexSub([5, 7], [2, 3]), [3, 4]);
  });

  it("multiplies two complex numbers correctly (ac - bd)", () => {
    // (1 + 2i)(3 + 4i) = (3-8) + (4+6)i = -5 + 10i
    expectComplex(complexMul([1, 2], [3, 4]), [-5, 10]);
  });

  it("i² = -1 (critical complex multiplication test)", () => {
    // [0, 1] × [0, 1] = [-1, 0]
    expectComplex(complexMul(IMAG, IMAG), [-1, 0]);
  });

  it("multiplies real numbers correctly", () => {
    expectComplex(complexMul([3, 0], [4, 0]), [12, 0]);
  });

  it("divides complex numbers", () => {
    // (1 + 2i) / (3 + 4i) = (3+8)/(9+16) + (6-4)/(9+16)i = 11/25 + 2/25i
    expectComplex(complexDiv([1, 2], [3, 4]), [11 / 25, 2 / 25]);
  });

  it("throws on division by zero", () => {
    expect(() => complexDiv([1, 0], [0, 0])).toThrow("Complex division by zero");
  });

  it("conjugates correctly", () => {
    expectComplex(complexConj([3, 4]), [3, -4]);
    expectComplex(complexConj([0, -1]), [0, 1]);
  });

  it("negates correctly", () => {
    expectComplex(complexNeg([3, -4]), [-3, 4]);
  });

  it("computes modulus squared", () => {
    // |3 + 4i|² = 9 + 16 = 25
    expect(complexAbsSq([3, 4])).toBe(25);
  });

  it("computes modulus", () => {
    expect(complexAbs([3, 4])).toBe(5);
  });

  it("computes argument (phase angle)", () => {
    expect(complexArg([1, 0])).toBe(0);
    expect(complexArg([0, 1])).toBeCloseTo(Math.PI / 2, 10);
    expect(complexArg([-1, 0])).toBeCloseTo(Math.PI, 10);
    expect(complexArg([0, -1])).toBeCloseTo(-Math.PI / 2, 10);
  });

  it("computes complex exponential via Euler's formula", () => {
    // e^{i·0} = 1
    expectComplex(complexExp(0), [1, 0]);
    // e^{i·π/2} = i
    expectComplex(complexExp(Math.PI / 2), [0, 1], 1e-10);
    // e^{i·π} = -1
    expectComplex(complexExp(Math.PI), [-1, 0], 1e-10);
  });

  it("scales by a real scalar", () => {
    expectComplex(complexScale(2, [3, 4]), [6, 8]);
    expectComplex(complexScale(-1, [3, 4]), [-3, -4]);
  });

  it("checks approximate equality", () => {
    expect(complexApproxEqual([1, 2], [1, 2])).toBe(true);
    expect(complexApproxEqual([1, 2], [1.0000000001, 2])).toBe(true);
    expect(complexApproxEqual([1, 2], [1.01, 2])).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. State Vector Operations
// ══════════════════════════════════════════════════════════════════════════════

describe("state vector operations", () => {
  it("creates the |0⟩ state for 1 qubit", () => {
    const state = createZeroState(1);
    expect(state).toHaveLength(2);
    expectComplex(state[0]!, [1, 0]);
    expectComplex(state[1]!, [0, 0]);
  });

  it("creates the |00⟩ state for 2 qubits", () => {
    const state = createZeroState(2);
    expect(state).toHaveLength(4);
    expectComplex(state[0]!, [1, 0]);
    for (let i = 1; i < 4; i++) {
      expectComplex(state[i]!, [0, 0]);
    }
  });

  it("creates uniform superposition for 2 qubits", () => {
    const state = createUniformSuperposition(2);
    expect(state).toHaveLength(4);
    const amp = 1 / Math.sqrt(4);
    for (const s of state) {
      expectComplex(s, [amp, 0]);
    }
  });

  it("uniform superposition is normalized", () => {
    const state = createUniformSuperposition(3);
    expect(Math.abs(stateVectorNormSq(state) - 1.0)).toBeLessThan(NORM_TOLERANCE);
  });

  it("assertNormalized passes for valid state", () => {
    expect(() => assertNormalized(createZeroState(2))).not.toThrow();
  });

  it("assertNormalized throws for invalid state", () => {
    expect(() =>
      assertNormalized([
        [2, 0],
        [0, 0],
      ]),
    ).toThrow("not normalized");
  });

  it("computes measurement probabilities", () => {
    // |+⟩ = (|0⟩ + |1⟩)/√2
    const state: StateVector = [
      [SQRT1_2, 0],
      [SQRT1_2, 0],
    ];
    const probs = measurementProbabilities(state);
    expect(probs[0]).toBeCloseTo(0.5, 10);
    expect(probs[1]).toBeCloseTo(0.5, 10);
  });

  it("computes qubit probabilities for a 2-qubit system", () => {
    // Bell state |Φ+⟩ = (|00⟩ + |11⟩)/√2
    const state: StateVector = [
      [SQRT1_2, 0],
      [0, 0],
      [0, 0],
      [SQRT1_2, 0],
    ];
    const [p0_0, p0_1] = qubitProbabilities(state, 0, 2);
    expect(p0_0).toBeCloseTo(0.5, 10);
    expect(p0_1).toBeCloseTo(0.5, 10);
  });

  it("projects and normalizes after measurement", () => {
    // |+⟩ → measure 0 → |0⟩
    const state: StateVector = [
      [SQRT1_2, 0],
      [SQRT1_2, 0],
    ];
    const projected = projectAndNormalize(state, 0, 0, 1);
    expectComplex(projected[0]!, [1, 0]);
    expectComplex(projected[1]!, [0, 0]);
    expect(Math.abs(stateVectorNormSq(projected) - 1.0)).toBeLessThan(NORM_TOLERANCE);
  });

  it("projects Bell state correctly", () => {
    // |Φ+⟩ = (|00⟩ + |11⟩)/√2, measure qubit 0 as 0 → |00⟩
    const state: StateVector = [
      [SQRT1_2, 0],
      [0, 0],
      [0, 0],
      [SQRT1_2, 0],
    ];
    const projected = projectAndNormalize(state, 0, 0, 2);
    expectComplex(projected[0]!, [1, 0]); // |00⟩
    expectComplex(projected[1]!, [0, 0]); // |01⟩
    expectComplex(projected[2]!, [0, 0]); // |10⟩
    expectComplex(projected[3]!, [0, 0]); // |11⟩
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. Gate Unitarity
// ══════════════════════════════════════════════════════════════════════════════

describe("gate unitarity", () => {
  it.each([
    ["I", GATE_I],
    ["X", GATE_X],
    ["Y", GATE_Y],
    ["Z", GATE_Z],
    ["H", GATE_H],
    ["S", GATE_S],
    ["T", GATE_T],
    ["CNOT", GATE_CNOT],
    ["CZ", GATE_CZ],
    ["SWAP", GATE_SWAP],
    ["TOFFOLI", GATE_TOFFOLI],
  ] as [string, GateMatrix][])("%s is unitary", (_name, gate) => {
    expect(isUnitary(gate)).toBe(true);
  });

  it("Rx(θ) is unitary for various angles", () => {
    for (const theta of [0, Math.PI / 4, Math.PI / 2, Math.PI, 3.7]) {
      expect(isUnitary(gateRx(theta))).toBe(true);
    }
  });

  it("Ry(θ) is unitary for various angles", () => {
    for (const theta of [0, Math.PI / 4, Math.PI / 2, Math.PI, 2.1]) {
      expect(isUnitary(gateRy(theta))).toBe(true);
    }
  });

  it("Rz(θ) is unitary for various angles", () => {
    for (const theta of [0, Math.PI / 4, Math.PI / 2, Math.PI, 5.5]) {
      expect(isUnitary(gateRz(theta))).toBe(true);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 4. Gate Effects
// ══════════════════════════════════════════════════════════════════════════════

describe("gate effects", () => {
  it("X|0⟩ = |1⟩", () => {
    const state = createZeroState(1);
    applySingleQubitGate(state, GATE_X, 0, 1);
    expectComplex(state[0]!, [0, 0]);
    expectComplex(state[1]!, [1, 0]);
  });

  it("X|1⟩ = |0⟩", () => {
    const state: StateVector = [
      [0, 0],
      [1, 0],
    ];
    applySingleQubitGate(state, GATE_X, 0, 1);
    expectComplex(state[0]!, [1, 0]);
    expectComplex(state[1]!, [0, 0]);
  });

  it("H|0⟩ = |+⟩", () => {
    const state = createZeroState(1);
    applySingleQubitGate(state, GATE_H, 0, 1);
    expectComplex(state[0]!, [SQRT1_2, 0]);
    expectComplex(state[1]!, [SQRT1_2, 0]);
  });

  it("H|1⟩ = |−⟩", () => {
    const state: StateVector = [
      [0, 0],
      [1, 0],
    ];
    applySingleQubitGate(state, GATE_H, 0, 1);
    expectComplex(state[0]!, [SQRT1_2, 0]);
    expectComplex(state[1]!, [-SQRT1_2, 0]);
  });

  it("H² = I (double Hadamard)", () => {
    const state = createZeroState(1);
    applySingleQubitGate(state, GATE_H, 0, 1);
    applySingleQubitGate(state, GATE_H, 0, 1);
    expectComplex(state[0]!, [1, 0]);
    expectComplex(state[1]!, [0, 0]);
  });

  it("Y|0⟩ = i|1⟩", () => {
    const state = createZeroState(1);
    applySingleQubitGate(state, GATE_Y, 0, 1);
    expectComplex(state[0]!, [0, 0]);
    expectComplex(state[1]!, [0, 1]);
  });

  it("Z|+⟩ = |−⟩", () => {
    const state: StateVector = [
      [SQRT1_2, 0],
      [SQRT1_2, 0],
    ];
    applySingleQubitGate(state, GATE_Z, 0, 1);
    expectComplex(state[0]!, [SQRT1_2, 0]);
    expectComplex(state[1]!, [-SQRT1_2, 0]);
  });

  it("S|1⟩ = i|1⟩", () => {
    const state: StateVector = [
      [0, 0],
      [1, 0],
    ];
    applySingleQubitGate(state, GATE_S, 0, 1);
    expectComplex(state[0]!, [0, 0]);
    expectComplex(state[1]!, [0, 1]);
  });

  it("S² = Z", () => {
    const state: StateVector = [
      [0, 0],
      [1, 0],
    ];
    applySingleQubitGate(state, GATE_S, 0, 1);
    applySingleQubitGate(state, GATE_S, 0, 1);
    // S²|1⟩ = Z|1⟩ = -|1⟩
    expectComplex(state[0]!, [0, 0]);
    expectComplex(state[1]!, [-1, 0]);
  });

  it("T² = S", () => {
    const state: StateVector = [
      [0, 0],
      [1, 0],
    ];
    applySingleQubitGate(state, GATE_T, 0, 1);
    applySingleQubitGate(state, GATE_T, 0, 1);
    // T²|1⟩ = S|1⟩ = i|1⟩
    expectComplex(state[0]!, [0, 0]);
    expectComplex(state[1]!, [0, 1]);
  });

  it("preserves normalization after single-qubit gate", () => {
    const state = createZeroState(2);
    applySingleQubitGate(state, GATE_H, 0, 2);
    expect(Math.abs(stateVectorNormSq(state) - 1.0)).toBeLessThan(NORM_TOLERANCE);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 5. Multi-Qubit Gate Application
// ══════════════════════════════════════════════════════════════════════════════

describe("multi-qubit gates", () => {
  it("CNOT creates Bell state from |+0⟩", () => {
    // |00⟩ → H⊗I → |+0⟩ → CNOT → |Φ+⟩
    const state = createZeroState(2);
    applySingleQubitGate(state, GATE_H, 0, 2);
    applyTwoQubitGate(state, GATE_CNOT, 0, 1, 2);
    // |Φ+⟩ = (|00⟩ + |11⟩)/√2
    expectComplex(state[0]!, [SQRT1_2, 0]); // |00⟩
    expectComplex(state[1]!, [0, 0]); // |01⟩
    expectComplex(state[2]!, [0, 0]); // |10⟩
    expectComplex(state[3]!, [SQRT1_2, 0]); // |11⟩
  });

  it("CNOT does not flip when control is 0", () => {
    // |00⟩ → CNOT → |00⟩ (no change)
    const state = createZeroState(2);
    applyTwoQubitGate(state, GATE_CNOT, 0, 1, 2);
    expectComplex(state[0]!, [1, 0]);
    expectComplex(state[1]!, [0, 0]);
    expectComplex(state[2]!, [0, 0]);
    expectComplex(state[3]!, [0, 0]);
  });

  it("CZ applies phase flip on |11⟩", () => {
    // (|00⟩ + |01⟩ + |10⟩ + |11⟩)/2 → CZ → (|00⟩ + |01⟩ + |10⟩ - |11⟩)/2
    const state: StateVector = [
      [0.5, 0],
      [0.5, 0],
      [0.5, 0],
      [0.5, 0],
    ];
    applyTwoQubitGate(state, GATE_CZ, 0, 1, 2);
    expectComplex(state[0]!, [0.5, 0]);
    expectComplex(state[1]!, [0.5, 0]);
    expectComplex(state[2]!, [0.5, 0]);
    expectComplex(state[3]!, [-0.5, 0]);
  });

  it("SWAP exchanges qubit states", () => {
    // |10⟩ → SWAP → |01⟩
    const state: StateVector = [
      [0, 0],
      [0, 0],
      [1, 0],
      [0, 0],
    ];
    applyTwoQubitGate(state, GATE_SWAP, 0, 1, 2);
    expectComplex(state[0]!, [0, 0]); // |00⟩
    expectComplex(state[1]!, [1, 0]); // |01⟩
    expectComplex(state[2]!, [0, 0]); // |10⟩
    expectComplex(state[3]!, [0, 0]); // |11⟩
  });

  it("preserves normalization after two-qubit gate", () => {
    const state = createZeroState(2);
    applySingleQubitGate(state, GATE_H, 0, 2);
    applyTwoQubitGate(state, GATE_CNOT, 0, 1, 2);
    expect(Math.abs(stateVectorNormSq(state) - 1.0)).toBeLessThan(NORM_TOLERANCE);
  });

  it("gate application on specific qubit in 3-qubit system", () => {
    // Apply X to qubit 1 (middle) of |000⟩ → |010⟩
    const state = createZeroState(3);
    applySingleQubitGate(state, GATE_X, 1, 3);
    // |010⟩ = index 2
    expectComplex(state[0]!, [0, 0]); // |000⟩
    expectComplex(state[2]!, [1, 0]); // |010⟩
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 6. Grover's Algorithm Primitives
// ══════════════════════════════════════════════════════════════════════════════

describe("Grover primitives", () => {
  it("oracle negates target amplitude", () => {
    const state: StateVector = [
      [0.5, 0],
      [0.5, 0],
      [0.5, 0],
      [0.5, 0],
    ];
    applyGroverOracle(state, [3]);
    expectComplex(state[0]!, [0.5, 0]);
    expectComplex(state[3]!, [-0.5, 0]);
  });

  it("oracle + diffusion on 2-qubit system with 1 target produces 100%", () => {
    // Canonical Grover: 2 qubits, target = |11⟩ (index 3), 1 iteration
    const state = createUniformSuperposition(2);
    applyGroverOracle(state, [3]);
    applyGroverDiffusion(state);
    // After 1 iteration: target has probability 1.0
    expect(complexAbsSq(state[3]!)).toBeCloseTo(1.0, 6);
    expect(Math.abs(stateVectorNormSq(state) - 1.0)).toBeLessThan(NORM_TOLERANCE);
  });

  it("2 iterations on 3-qubit system gives ~94.5% success", () => {
    const state = createUniformSuperposition(3);
    const target = 5; // |101⟩
    // 2 Grover iterations
    for (let i = 0; i < 2; i++) {
      applyGroverOracle(state, [target]);
      applyGroverDiffusion(state);
    }
    const successProb = complexAbsSq(state[target]!);
    expect(successProb).toBeGreaterThan(0.94);
    expect(successProb).toBeLessThan(0.96);
    expect(Math.abs(stateVectorNormSq(state) - 1.0)).toBeLessThan(NORM_TOLERANCE);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 7. Bloch Sphere Conversions
// ══════════════════════════════════════════════════════════════════════════════

describe("Bloch sphere conversions", () => {
  const namedStates: [string, [Complex, Complex], number, number, number, number, number][] = [
    [
      "|0⟩",
      [
        [1, 0],
        [0, 0],
      ],
      0,
      0,
      0,
      0,
      1,
    ],
    [
      "|1⟩",
      [
        [0, 0],
        [1, 0],
      ],
      Math.PI,
      0,
      0,
      0,
      -1,
    ],
    [
      "|+⟩",
      [
        [SQRT1_2, 0],
        [SQRT1_2, 0],
      ],
      Math.PI / 2,
      0,
      1,
      0,
      0,
    ],
    [
      "|−⟩",
      [
        [SQRT1_2, 0],
        [-SQRT1_2, 0],
      ],
      Math.PI / 2,
      Math.PI,
      -1,
      0,
      0,
    ],
    [
      "|+i⟩",
      [
        [SQRT1_2, 0],
        [0, SQRT1_2],
      ],
      Math.PI / 2,
      Math.PI / 2,
      0,
      1,
      0,
    ],
    [
      "|−i⟩",
      [
        [SQRT1_2, 0],
        [0, -SQRT1_2],
      ],
      Math.PI / 2,
      (3 * Math.PI) / 2,
      0,
      -1,
      0,
    ],
  ];

  it.each(namedStates)(
    "%s has correct Bloch angles and Cartesian coordinates",
    (_label, state, expectedTheta, expectedPhi, expectedX, expectedY, expectedZ) => {
      const { theta, phi } = stateToBlochAngles(state);
      expect(theta).toBeCloseTo(expectedTheta, 8);
      expect(phi).toBeCloseTo(expectedPhi, 8);

      const { x, y, z } = blochAnglesToCartesian(theta, phi);
      expect(x).toBeCloseTo(expectedX, 8);
      expect(y).toBeCloseTo(expectedY, 8);
      expect(z).toBeCloseTo(expectedZ, 8);
    },
  );

  it("round-trips Bloch angles → state → Bloch angles", () => {
    const testCases = [
      { theta: 0, phi: 0 },
      { theta: Math.PI, phi: 0 },
      { theta: Math.PI / 2, phi: 0 },
      { theta: Math.PI / 2, phi: Math.PI / 2 },
      { theta: Math.PI / 3, phi: Math.PI / 4 },
      { theta: 2.5, phi: 4.2 },
    ];

    for (const { theta, phi } of testCases) {
      const state = blochAnglesToState(theta, phi);
      expect(Math.abs(stateVectorNormSq(state) - 1.0)).toBeLessThan(NORM_TOLERANCE);
      const result = stateToBlochAngles(state);
      expect(result.theta).toBeCloseTo(theta, 6);
      // phi is only defined when theta is not 0 or π
      if (theta > 0.001 && theta < Math.PI - 0.001) {
        // Normalize both to [0, 2π) for comparison
        const normPhi = ((phi % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const normResult = ((result.phi % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        expect(normResult).toBeCloseTo(normPhi, 6);
      }
    }
  });

  it("Cartesian coordinates are on the unit sphere", () => {
    for (let t = 0; t <= Math.PI; t += 0.3) {
      for (let p = 0; p < 2 * Math.PI; p += 0.5) {
        const { x, y, z } = blochAnglesToCartesian(t, p);
        expect(x * x + y * y + z * z).toBeCloseTo(1.0, 10);
      }
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 8. Tensor Products
// ══════════════════════════════════════════════════════════════════════════════

describe("tensor products", () => {
  it("tensor product of |0⟩ and |1⟩ gives |01⟩", () => {
    const a: StateVector = [
      [1, 0],
      [0, 0],
    ]; // |0⟩
    const b: StateVector = [
      [0, 0],
      [1, 0],
    ]; // |1⟩
    const result = tensorProduct(a, b);
    expect(result).toHaveLength(4);
    expectComplex(result[0]!, [0, 0]); // |00⟩
    expectComplex(result[1]!, [1, 0]); // |01⟩
    expectComplex(result[2]!, [0, 0]); // |10⟩
    expectComplex(result[3]!, [0, 0]); // |11⟩
  });

  it("H⊗I has correct structure", () => {
    const result = matrixTensorProduct(GATE_H, GATE_I);
    expect(result).toHaveLength(4);
    expect(result[0]).toHaveLength(4);
    expect(isUnitary(result)).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 9. Entanglement Detection
// ══════════════════════════════════════════════════════════════════════════════

describe("entanglement detection", () => {
  it("separable state |00⟩ is NOT entangled", () => {
    const state: StateVector = [
      [1, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ];
    expect(isEntangled(state)).toBe(false);
  });

  it("separable state |+0⟩ is NOT entangled", () => {
    const state: StateVector = [
      [SQRT1_2, 0],
      [0, 0],
      [SQRT1_2, 0],
      [0, 0],
    ];
    expect(isEntangled(state)).toBe(false);
  });

  it("Bell state |Φ+⟩ IS entangled", () => {
    const state: StateVector = [
      [SQRT1_2, 0],
      [0, 0],
      [0, 0],
      [SQRT1_2, 0],
    ];
    expect(isEntangled(state)).toBe(true);
  });

  it("Bell state |Ψ+⟩ IS entangled", () => {
    const state: StateVector = [
      [0, 0],
      [SQRT1_2, 0],
      [SQRT1_2, 0],
      [0, 0],
    ];
    expect(isEntangled(state)).toBe(true);
  });

  it("throws for non-2-qubit state", () => {
    expect(() =>
      isEntangled([
        [1, 0],
        [0, 0],
      ]),
    ).toThrow();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 10. Gate Lookup
// ══════════════════════════════════════════════════════════════════════════════

describe("getStandardGate", () => {
  it("returns correct gates for all standard names", () => {
    expect(getStandardGate("I")).toBe(GATE_I);
    expect(getStandardGate("X")).toBe(GATE_X);
    expect(getStandardGate("Y")).toBe(GATE_Y);
    expect(getStandardGate("Z")).toBe(GATE_Z);
    expect(getStandardGate("H")).toBe(GATE_H);
    expect(getStandardGate("S")).toBe(GATE_S);
    expect(getStandardGate("T")).toBe(GATE_T);
  });

  it("returns parameterized gates with angle", () => {
    const rx = getStandardGate("Rx", Math.PI / 2);
    expect(rx).not.toBeNull();
    expect(isUnitary(rx!)).toBe(true);
  });

  it("returns null for unknown gate", () => {
    expect(getStandardGate("Unknown")).toBeNull();
  });

  it("returns null for parameterized gate without angle", () => {
    expect(getStandardGate("Rx")).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 11. Basis Labels
// ══════════════════════════════════════════════════════════════════════════════

describe("basisLabels", () => {
  it("generates correct labels for 1 qubit", () => {
    expect(basisLabels(1)).toEqual(["|0⟩", "|1⟩"]);
  });

  it("generates correct labels for 2 qubits", () => {
    expect(basisLabels(2)).toEqual(["|00⟩", "|01⟩", "|10⟩", "|11⟩"]);
  });

  it("generates correct labels for 3 qubits", () => {
    const labels = basisLabels(3);
    expect(labels).toHaveLength(8);
    expect(labels[0]).toBe("|000⟩");
    expect(labels[5]).toBe("|101⟩");
    expect(labels[7]).toBe("|111⟩");
  });
});
