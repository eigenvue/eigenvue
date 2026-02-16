/**
 * @fileoverview Tests for genai-math.ts — Generative AI Math Library.
 *
 * Every function is tested for correctness against hand-computed values,
 * postconditions, and edge cases.
 *
 * Mathematical basis: Section 4 and testing strategy from Section 14.1
 * of the Phase 8 specification.
 */

import { describe, it, expect } from "vitest";
import {
  seedRandom,
  matMul,
  transpose,
  scaleMatrix,
  softmax,
  softmaxRows,
  cosineSimilarity,
  vectorAdd,
  layerNorm,
  layerNormRows,
  relu,
  reluMatrix,
  feedForward,
  generateEmbeddings,
  generateWeightMatrix,
  generateBiasVector,
} from "../utils/genai-math";

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Sum of all elements in a 1D array. */
function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

/** Mean of a 1D array. */
function mean(arr: number[]): number {
  return sum(arr) / arr.length;
}

/** Variance of a 1D array (population variance). */
function variance(arr: number[]): number {
  const m = mean(arr);
  return arr.reduce((acc, val) => acc + (val - m) ** 2, 0) / arr.length;
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. Deterministic PRNG
// ══════════════════════════════════════════════════════════════════════════════

describe("seedRandom", () => {
  it("is deterministic for the same seed", () => {
    const rng1 = seedRandom("hello");
    const rng2 = seedRandom("hello");

    const seq1 = Array.from({ length: 10 }, () => rng1());
    const seq2 = Array.from({ length: 10 }, () => rng2());

    expect(seq1).toEqual(seq2);
  });

  it("produces different sequences for different seeds", () => {
    const rng1 = seedRandom("seed-alpha");
    const rng2 = seedRandom("seed-beta");

    const seq1 = Array.from({ length: 10 }, () => rng1());
    const seq2 = Array.from({ length: 10 }, () => rng2());

    // At least one value should differ (overwhelmingly likely).
    const allSame = seq1.every((val, i) => val === seq2[i]);
    expect(allSame).toBe(false);
  });

  it("produces values in [0, 1)", () => {
    const rng = seedRandom("range-test");

    for (let i = 0; i < 1000; i++) {
      const val = rng();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. Matrix Operations
// ══════════════════════════════════════════════════════════════════════════════

describe("matMul", () => {
  it("correctly multiplies identity matrix", () => {
    const I = [
      [1, 0],
      [0, 1],
    ];
    const A = [
      [3, 7],
      [2, 5],
    ];

    expect(matMul(I, A)).toEqual(A);
    expect(matMul(A, I)).toEqual(A);
  });

  it("throws on dimension mismatch", () => {
    const A = [
      [1, 2, 3],
      [4, 5, 6],
    ]; // 2x3
    const B = [
      [1, 2],
      [3, 4],
    ]; // 2x2

    expect(() => matMul(A, B)).toThrow(/dimension mismatch/i);
  });

  it("produces correct shape", () => {
    const A = [
      [1, 2, 3],
      [4, 5, 6],
    ]; // 2x3
    const B = [
      [1, 2],
      [3, 4],
      [5, 6],
    ]; // 3x2

    const C = matMul(A, B); // should be 2x2
    expect(C.length).toBe(2);
    expect(C[0]!.length).toBe(2);
    expect(C[1]!.length).toBe(2);
  });

  it("computes correct values (hand-verified)", () => {
    // [[1,2],[3,4]] x [[5,6],[7,8]] = [[19,22],[43,50]]
    const A = [
      [1, 2],
      [3, 4],
    ];
    const B = [
      [5, 6],
      [7, 8],
    ];

    const C = matMul(A, B);
    expect(C).toEqual([
      [19, 22],
      [43, 50],
    ]);
  });

  it("handles non-square matrices", () => {
    // [1x3] x [3x1] = [1x1]
    const A = [[1, 2, 3]];
    const B = [[4], [5], [6]];

    const C = matMul(A, B);
    // 1*4 + 2*5 + 3*6 = 4 + 10 + 18 = 32
    expect(C).toEqual([[32]]);
  });
});

describe("transpose", () => {
  it("transposes a square matrix", () => {
    const M = [
      [1, 2],
      [3, 4],
    ];
    expect(transpose(M)).toEqual([
      [1, 3],
      [2, 4],
    ]);
  });

  it("transposes a rectangular matrix", () => {
    const M = [
      [1, 2, 3],
      [4, 5, 6],
    ]; // 2x3
    const T = transpose(M); // should be 3x2
    expect(T).toEqual([
      [1, 4],
      [2, 5],
      [3, 6],
    ]);
  });

  it("double transpose returns original", () => {
    const M = [
      [1, 2, 3],
      [4, 5, 6],
    ];
    expect(transpose(transpose(M))).toEqual(M);
  });

  it("transposes a single-row matrix into a column", () => {
    const M = [[1, 2, 3]]; // 1x3
    expect(transpose(M)).toEqual([[1], [2], [3]]); // 3x1
  });
});

describe("scaleMatrix", () => {
  it("scales all elements by the scalar", () => {
    const M = [
      [1, 2],
      [3, 4],
    ];
    expect(scaleMatrix(M, 2)).toEqual([
      [2, 4],
      [6, 8],
    ]);
  });

  it("scaling by 0 produces a zero matrix", () => {
    const M = [
      [5, 10],
      [15, 20],
    ];
    expect(scaleMatrix(M, 0)).toEqual([
      [0, 0],
      [0, 0],
    ]);
  });

  it("scaling by 1 produces the same matrix", () => {
    const M = [
      [3, 7],
      [2, 9],
    ];
    expect(scaleMatrix(M, 1)).toEqual(M);
  });

  it("scaling by negative inverts signs", () => {
    const M = [
      [1, -2],
      [-3, 4],
    ];
    expect(scaleMatrix(M, -1)).toEqual([
      [-1, 2],
      [3, -4],
    ]);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. Softmax
// ══════════════════════════════════════════════════════════════════════════════

describe("softmax", () => {
  it("produces a distribution that sums to 1.0", () => {
    const input = [1.0, 2.0, 3.0, 4.0];
    const result = softmax(input);
    expect(sum(result)).toBeCloseTo(1.0, 6);
  });

  it("is numerically stable with large values", () => {
    // Values like 1000, 1001, 1002 would overflow naive exp().
    const result = softmax([1000, 1001, 1002]);

    // Must still sum to 1.
    expect(sum(result)).toBeCloseTo(1.0, 6);

    // All values should be finite.
    for (const val of result) {
      expect(Number.isFinite(val)).toBe(true);
    }

    // The largest input should have the largest probability.
    expect(result[2]).toBeGreaterThan(result[1]!);
    expect(result[1]).toBeGreaterThan(result[0]!);
  });

  it("handles uniform input", () => {
    const result = softmax([5, 5, 5]);

    // All should be equal: 1/3 each.
    expect(result[0]).toBeCloseTo(1 / 3, 6);
    expect(result[1]).toBeCloseTo(1 / 3, 6);
    expect(result[2]).toBeCloseTo(1 / 3, 6);
  });

  it("all values are non-negative", () => {
    const result = softmax([-10, -5, 0, 5, 10]);
    for (const val of result) {
      expect(val).toBeGreaterThanOrEqual(0);
    }
  });

  it("handles a single element", () => {
    const result = softmax([42]);
    expect(result).toEqual([1]);
  });

  it("throws on empty input", () => {
    expect(() => softmax([])).toThrow();
  });
});

describe("softmaxRows", () => {
  it("applies softmax to each row independently", () => {
    const M = [
      [1, 2, 3],
      [10, 20, 30],
    ];
    const result = softmaxRows(M);

    expect(result.length).toBe(2);

    // Each row should sum to 1.
    for (const row of result) {
      expect(sum(row)).toBeCloseTo(1.0, 6);
    }

    // Each row should be independently computed.
    expect(result[0]).toEqual(softmax([1, 2, 3]));
    expect(result[1]).toEqual(softmax([10, 20, 30]));
  });

  it("handles a single-row matrix", () => {
    const result = softmaxRows([[2, 3, 4]]);
    expect(result.length).toBe(1);
    expect(sum(result[0]!)).toBeCloseTo(1.0, 6);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 4. Vector Operations
// ══════════════════════════════════════════════════════════════════════════════

describe("cosineSimilarity", () => {
  it("returns 1.0 for identical vectors", () => {
    const v = [1, 2, 3, 4, 5];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1.0, 6);
  });

  it("returns -1.0 for opposite vectors", () => {
    const a = [1, 2, 3];
    const b = [-1, -2, -3];
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1.0, 6);
  });

  it("returns 0 for orthogonal vectors", () => {
    const a = [1, 0];
    const b = [0, 1];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0.0, 6);
  });

  it("returns 0 for zero vector", () => {
    const a = [0, 0, 0];
    const b = [1, 2, 3];
    expect(cosineSimilarity(a, b)).toBe(0);
  });

  it("throws for mismatched lengths", () => {
    expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow(/same length/i);
  });

  it("is symmetric", () => {
    const a = [1, 3, 5];
    const b = [2, 4, 6];
    expect(cosineSimilarity(a, b)).toBeCloseTo(cosineSimilarity(b, a), 10);
  });
});

describe("vectorAdd", () => {
  it("adds two vectors element-wise", () => {
    expect(vectorAdd([1, 2, 3], [4, 5, 6])).toEqual([5, 7, 9]);
  });

  it("handles negative values", () => {
    expect(vectorAdd([1, -2, 3], [-1, 2, -3])).toEqual([0, 0, 0]);
  });

  it("adding zero vector is identity", () => {
    const v = [3, 7, 11];
    expect(vectorAdd(v, [0, 0, 0])).toEqual(v);
  });

  it("throws on length mismatch", () => {
    expect(() => vectorAdd([1, 2], [1, 2, 3])).toThrow(/mismatch/i);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 5. Layer Normalization
// ══════════════════════════════════════════════════════════════════════════════

describe("layerNorm", () => {
  it("normalizes to mean~0 and variance~1", () => {
    const input = [2, 4, 6, 8, 10];
    const result = layerNorm(input);

    const m = mean(result);
    const v = variance(result);

    expect(m).toBeCloseTo(0, 5);
    expect(v).toBeCloseTo(1, 3);
  });

  it("handles constant input", () => {
    // When all values are the same, output should be all zeros
    // (each value minus the mean is zero).
    const result = layerNorm([5, 5, 5, 5]);
    for (const val of result) {
      expect(val).toBeCloseTo(0, 5);
    }
  });

  it("returns empty array for empty input", () => {
    expect(layerNorm([])).toEqual([]);
  });

  it("preserves relative ordering", () => {
    const input = [1, 5, 3, 7, 2];
    const result = layerNorm(input);

    // Normalization should not change the relative order.
    for (let i = 0; i < input.length; i++) {
      for (let j = i + 1; j < input.length; j++) {
        if (input[i]! < input[j]!) {
          expect(result[i]).toBeLessThan(result[j]!);
        } else if (input[i]! > input[j]!) {
          expect(result[i]).toBeGreaterThan(result[j]!);
        }
      }
    }
  });
});

describe("layerNormRows", () => {
  it("applies layer normalization to each row independently", () => {
    const M = [
      [2, 4, 6],
      [10, 20, 30],
    ];
    const result = layerNormRows(M);

    expect(result.length).toBe(2);

    // Each row should be normalized independently.
    expect(result[0]).toEqual(layerNorm([2, 4, 6]));
    expect(result[1]).toEqual(layerNorm([10, 20, 30]));

    // Each row should have mean~0.
    for (const row of result) {
      expect(mean(row)).toBeCloseTo(0, 5);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 6. ReLU Activation
// ══════════════════════════════════════════════════════════════════════════════

describe("relu", () => {
  it("passes positive values through", () => {
    expect(relu([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it("zeroes out negative values", () => {
    expect(relu([-1, -2, -3])).toEqual([0, 0, 0]);
  });

  it("handles mixed positive and negative values", () => {
    expect(relu([-3, -1, 0, 1, 3])).toEqual([0, 0, 0, 1, 3]);
  });

  it("passes through zero", () => {
    expect(relu([0])).toEqual([0]);
  });

  it("handles empty input", () => {
    expect(relu([])).toEqual([]);
  });
});

describe("reluMatrix", () => {
  it("applies ReLU element-wise to each row", () => {
    const M = [
      [-1, 2, -3],
      [4, -5, 6],
    ];
    expect(reluMatrix(M)).toEqual([
      [0, 2, 0],
      [4, 0, 6],
    ]);
  });

  it("preserves an all-positive matrix", () => {
    const M = [
      [1, 2],
      [3, 4],
    ];
    expect(reluMatrix(M)).toEqual(M);
  });

  it("zeroes out an all-negative matrix", () => {
    const M = [
      [-1, -2],
      [-3, -4],
    ];
    expect(reluMatrix(M)).toEqual([
      [0, 0],
      [0, 0],
    ]);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 7. Feed-Forward Network
// ══════════════════════════════════════════════════════════════════════════════

describe("feedForward", () => {
  it("produces correct output shape", () => {
    // X: [2, 3], W1: [3, 4], b1: [4], W2: [4, 3], b2: [3]
    // Expected output shape: [2, 3]
    const X = [
      [1, 0, 0],
      [0, 1, 0],
    ];
    const W1 = [
      [0.1, 0.2, 0.3, 0.4],
      [0.5, 0.6, 0.7, 0.8],
      [0.9, 1.0, 1.1, 1.2],
    ];
    const b1 = [0.01, 0.02, 0.03, 0.04];
    const W2 = [
      [0.1, 0.2, 0.3],
      [0.4, 0.5, 0.6],
      [0.7, 0.8, 0.9],
      [1.0, 1.1, 1.2],
    ];
    const b2 = [0.01, 0.02, 0.03];

    const result = feedForward(X, W1, b1, W2, b2);

    expect(result.length).toBe(2);
    expect(result[0]!.length).toBe(3);
    expect(result[1]!.length).toBe(3);
  });

  it("computes correct values for a simple case (smoke test)", () => {
    // Single input, tiny dimensions for hand-verification.
    // X: [1, 2]
    // W1: [2, 2], b1: [2], W2: [2, 2], b2: [2]
    const X = [[1, 2]]; // [1, 2]
    const W1 = [
      [1, 0],
      [0, 1],
    ]; // identity
    const b1 = [0, 0]; // zero bias
    const W2 = [
      [1, 0],
      [0, 1],
    ]; // identity
    const b2 = [0, 0]; // zero bias

    // FFN(x) = ReLU(x * I + 0) * I + 0 = ReLU(x) * I = x (since x > 0)
    const result = feedForward(X, W1, b1, W2, b2);
    expect(result).toEqual([[1, 2]]);
  });

  it("applies ReLU correctly (negative hidden values are zeroed)", () => {
    // X = [[1]]
    // W1 = [[-1]], b1 = [0] => hidden = [[-1]] => ReLU => [[0]]
    // W2 = [[1]], b2 = [5] => output = [[0*1 + 5]] = [[5]]
    const X = [[1]];
    const W1 = [[-1]];
    const b1 = [0];
    const W2 = [[1]];
    const b2 = [5];

    const result = feedForward(X, W1, b1, W2, b2);
    expect(result).toEqual([[5]]);
  });

  it("broadcasts bias vectors correctly", () => {
    // X: [2, 1], W1: [1, 1], b1: [10], W2: [1, 1], b2: [100]
    // Row 1: x=3 => hidden=3*1+10=13 => ReLU=13 => out=13*1+100=113
    // Row 2: x=7 => hidden=7*1+10=17 => ReLU=17 => out=17*1+100=117
    const X = [[3], [7]];
    const W1 = [[1]];
    const b1 = [10];
    const W2 = [[1]];
    const b2 = [100];

    const result = feedForward(X, W1, b1, W2, b2);
    expect(result).toEqual([[113], [117]]);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 8. Embedding and Weight Generation
// ══════════════════════════════════════════════════════════════════════════════

describe("generateEmbeddings", () => {
  it("is deterministic (same tokens/dim produce same result)", () => {
    const tokens = ["hello", "world"];
    const dim = 8;

    const emb1 = generateEmbeddings(tokens, dim);
    const emb2 = generateEmbeddings(tokens, dim);

    expect(emb1).toEqual(emb2);
  });

  it("produces correct shape", () => {
    const tokens = ["the", "cat", "sat"];
    const dim = 16;
    const emb = generateEmbeddings(tokens, dim);

    expect(emb.length).toBe(3);
    for (const row of emb) {
      expect(row.length).toBe(16);
    }
  });

  it("produces values in [-1, 1]", () => {
    const emb = generateEmbeddings(["token1", "token2", "token3"], 32);
    for (const row of emb) {
      for (const val of row) {
        expect(val).toBeGreaterThanOrEqual(-1);
        expect(val).toBeLessThanOrEqual(1);
      }
    }
  });

  it("produces different embeddings for different tokens", () => {
    const emb = generateEmbeddings(["alpha", "beta"], 16);
    // The two embeddings should not be identical.
    const same = emb[0]!.every((val, i) => val === emb[1]![i]);
    expect(same).toBe(false);
  });
});

describe("generateWeightMatrix", () => {
  it("is deterministic (same name/shape produce same result)", () => {
    const w1 = generateWeightMatrix("W_Q", 4, 3);
    const w2 = generateWeightMatrix("W_Q", 4, 3);

    expect(w1).toEqual(w2);
  });

  it("produces correct shape", () => {
    const w = generateWeightMatrix("W_K", 5, 8);
    expect(w.length).toBe(5);
    for (const row of w) {
      expect(row.length).toBe(8);
    }
  });

  it("produces values in [-0.5, 0.5]", () => {
    const w = generateWeightMatrix("W_V", 10, 10);
    for (const row of w) {
      for (const val of row) {
        expect(val).toBeGreaterThanOrEqual(-0.5);
        expect(val).toBeLessThanOrEqual(0.5);
      }
    }
  });

  it("produces different matrices for different names", () => {
    const w1 = generateWeightMatrix("W_Q", 4, 4);
    const w2 = generateWeightMatrix("W_K", 4, 4);

    // Flatten and compare -- should differ.
    const flat1 = w1.flat();
    const flat2 = w2.flat();
    const same = flat1.every((val, i) => val === flat2[i]);
    expect(same).toBe(false);
  });
});

describe("generateBiasVector", () => {
  it("is deterministic (same name/length produce same result)", () => {
    const b1 = generateBiasVector("b_1", 6);
    const b2 = generateBiasVector("b_1", 6);

    expect(b1).toEqual(b2);
  });

  it("produces correct length", () => {
    const b = generateBiasVector("b_2", 12);
    expect(b.length).toBe(12);
  });

  it("produces small values near zero", () => {
    // Values come from (rng() - 0.5) * 200 / 1000 => range [-0.1, 0.1].
    const b = generateBiasVector("b_test", 50);
    for (const val of b) {
      expect(val).toBeGreaterThanOrEqual(-0.1);
      expect(val).toBeLessThanOrEqual(0.1);
    }
  });

  it("produces different vectors for different names", () => {
    const b1 = generateBiasVector("b_1", 8);
    const b2 = generateBiasVector("b_2", 8);

    const same = b1.every((val, i) => val === b2[i]);
    expect(same).toBe(false);
  });
});
