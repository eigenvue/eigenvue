// =============================================================================
// web/src/engine/utils/genai-math.ts
//
// Mathematical utility functions for Generative AI algorithm generators.
// Every function is PURE — no side effects, no mutable state.
//
// All operations use IEEE 754 double precision (JavaScript `number`).
// Numerical stability is prioritized over raw performance.
//
// CRITICAL: These functions implement the EXACT formulae from Section 4 of
// the Phase 8 specification. Any deviation is a bug.
// =============================================================================

// ─────────────────────────────────────────────────────────────────────────────
// 1. Deterministic PRNG
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a seeded pseudo-random number generator based on a string seed.
 * Uses a simple mulberry32 PRNG for deterministic, reproducible sequences.
 *
 * The hash function converts the seed string to a 32-bit integer, and the
 * PRNG generates floats in [0, 1) from that seed.
 *
 * @param seed — Any string. Same seed always produces the same sequence.
 * @returns A function that returns the next pseudo-random number in [0, 1).
 */
export function seedRandom(seed: string): () => number {
  // Convert string to 32-bit hash using djb2.
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) + hash + seed.charCodeAt(i)) | 0;
  }

  // Mulberry32 PRNG.
  let state = hash | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Matrix Operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Multiplies two 2D matrices.
 *
 * C[i][j] = Σ_{k=0}^{p-1} A[i][k] × B[k][j]
 *
 * @param A — Matrix of shape [m, p].
 * @param B — Matrix of shape [p, n].
 * @returns Matrix C of shape [m, n].
 * @throws If inner dimensions do not match.
 */
export function matMul(A: number[][], B: number[][]): number[][] {
  const m = A.length;
  const p = A[0]?.length ?? 0;
  const p2 = B.length;
  const n = B[0]?.length ?? 0;

  if (p !== p2) {
    throw new Error(
      `matMul dimension mismatch: A is [${m}, ${p}], B is [${p2}, ${n}]. ` +
        `Inner dimensions ${p} and ${p2} must match.`,
    );
  }

  const C: number[][] = Array.from({ length: m }, () => new Array<number>(n).fill(0));

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      let sum = 0;
      for (let k = 0; k < p; k++) {
        sum += A[i]![k]! * B[k]![j]!;
      }
      C[i]![j] = sum;
    }
  }

  return C;
}

/**
 * Transposes a 2D matrix.
 *
 * result[j][i] = M[i][j]
 *
 * @param M — Matrix of shape [m, n].
 * @returns Transposed matrix of shape [n, m].
 */
export function transpose(M: number[][]): number[][] {
  const m = M.length;
  const n = M[0]?.length ?? 0;
  const result: number[][] = Array.from({ length: n }, () => new Array<number>(m).fill(0));
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      result[j]![i] = M[i]![j]!;
    }
  }
  return result;
}

/**
 * Scales every element of a matrix by a scalar factor.
 *
 * result[i][j] = M[i][j] × scalar
 *
 * @param M      — Input matrix.
 * @param scalar — Scaling factor.
 * @returns New matrix with same shape.
 */
export function scaleMatrix(M: number[][], scalar: number): number[][] {
  return M.map((row) => row.map((val) => val * scalar));
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Softmax
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes the softmax of a 1D vector.
 *
 * Uses the numerically stable formulation:
 *   m = max(z)
 *   softmax(z)_i = exp(z_i - m) / Σ exp(z_j - m)
 *
 * POSTCONDITION: sum(result) = 1.0 within ±1e-6.
 * POSTCONDITION: every result[i] >= 0.
 *
 * @param z — Input vector of any length ≥ 1.
 * @returns Probability distribution (same length as z, sums to 1).
 * @throws If z is empty.
 */
export function softmax(z: number[]): number[] {
  if (z.length === 0) throw new Error("softmax: input vector must be non-empty.");

  // Numerical stability: subtract the maximum value before exponentiating.
  const maxVal = Math.max(...z);
  const exps = z.map((val) => Math.exp(val - maxVal));
  const sumExps = exps.reduce((a, b) => a + b, 0);

  // Guard against sum = 0 (happens if all values are -Infinity).
  if (sumExps === 0) {
    return new Array(z.length).fill(1 / z.length);
  }

  return exps.map((e) => e / sumExps);
}

/**
 * Applies softmax to each row of a 2D matrix independently.
 *
 * POSTCONDITION: For each row i: sum(result[i]) = 1.0 within ±1e-6.
 *
 * @param M — Matrix of shape [m, n].
 * @returns Matrix of shape [m, n] where each row is a probability distribution.
 */
export function softmaxRows(M: number[][]): number[][] {
  return M.map((row) => softmax(row));
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Vector Operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes the cosine similarity between two vectors.
 *
 * cosineSimilarity = (a · b) / (‖a‖ × ‖b‖)
 *
 * @param a — First vector.
 * @param b — Second vector. Must have the same length as a.
 * @returns Cosine similarity in [-1, 1]. Returns 0 if either vector is zero.
 * @throws If vectors have different lengths.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(
      `cosineSimilarity: vectors must have same length. Got ${a.length} and ${b.length}.`,
    );
  }

  let dot = 0;
  let normASq = 0;
  let normBSq = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    normASq += a[i]! * a[i]!;
    normBSq += b[i]! * b[i]!;
  }

  const normA = Math.sqrt(normASq);
  const normB = Math.sqrt(normBSq);

  // Guard against zero vectors.
  if (normA < 1e-12 || normB < 1e-12) return 0;

  return dot / (normA * normB);
}

/**
 * Adds two vectors element-wise.
 *
 * result[i] = a[i] + b[i]
 *
 * @throws If vectors have different lengths.
 */
export function vectorAdd(a: number[], b: number[]): number[] {
  if (a.length !== b.length) {
    throw new Error(`vectorAdd: length mismatch (${a.length} vs ${b.length}).`);
  }
  return a.map((val, i) => val + b[i]!);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Layer Normalization
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Applies layer normalization to a 1D vector (simplified, no gamma/beta).
 *
 * output[i] = (x[i] - mean) / sqrt(variance + epsilon)
 *
 * Where:
 *   mean     = (1/d) × Σ x[i]
 *   variance = (1/d) × Σ (x[i] - mean)²
 *   epsilon  = 1e-5
 *
 * POSTCONDITION: mean(output) ≈ 0 (within ±1e-6).
 * POSTCONDITION: variance(output) ≈ 1 (within ±1e-4).
 *
 * @param x — Input vector.
 * @returns Normalized vector (same length).
 */
export function layerNorm(x: number[]): number[] {
  const d = x.length;
  if (d === 0) return [];

  const EPSILON = 1e-5;

  const mean = x.reduce((sum, val) => sum + val, 0) / d;
  const variance = x.reduce((sum, val) => sum + (val - mean) ** 2, 0) / d;
  const stdDev = Math.sqrt(variance + EPSILON);

  return x.map((val) => (val - mean) / stdDev);
}

/**
 * Applies layer normalization to each row of a matrix.
 */
export function layerNormRows(M: number[][]): number[][] {
  return M.map((row) => layerNorm(row));
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. ReLU Activation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Applies ReLU (Rectified Linear Unit) element-wise.
 *
 * ReLU(x) = max(0, x)
 */
export function relu(x: number[]): number[] {
  return x.map((val) => Math.max(0, val));
}

/**
 * Applies ReLU element-wise to a 2D matrix.
 */
export function reluMatrix(M: number[][]): number[][] {
  return M.map((row) => relu(row));
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Feed-Forward Network
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Applies a two-layer feed-forward network to each row of the input.
 *
 * FFN(x) = ReLU(x × W_1 + b_1) × W_2 + b_2
 *
 * @param X   — Input matrix [seqLen, d_model].
 * @param W1  — First weight matrix [d_model, d_ff].
 * @param b1  — First bias vector [d_ff].
 * @param W2  — Second weight matrix [d_ff, d_model].
 * @param b2  — Second bias vector [d_model].
 * @returns Output matrix [seqLen, d_model].
 */
export function feedForward(
  X: number[][],
  W1: number[][],
  b1: number[],
  W2: number[][],
  b2: number[],
): number[][] {
  // Step 1: X × W_1
  let hidden = matMul(X, W1);

  // Step 2: + b_1 (broadcast bias to each row)
  hidden = hidden.map((row) => row.map((val, j) => val + b1[j]!));

  // Step 3: ReLU
  hidden = reluMatrix(hidden);

  // Step 4: × W_2
  let output = matMul(hidden, W2);

  // Step 5: + b_2 (broadcast bias to each row)
  output = output.map((row) => row.map((val, j) => val + b2[j]!));

  return output;
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Embedding and Weight Generation Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates deterministic embedding vectors from token strings.
 *
 * Each token's embedding is derived from its string content using a seeded PRNG,
 * ensuring reproducible results across runs.
 *
 * @param tokens — Array of token strings.
 * @param dim    — Embedding dimension.
 * @returns Matrix of shape [tokens.length, dim].
 */
export function generateEmbeddings(tokens: string[], dim: number): number[][] {
  return tokens.map((token) => {
    const rng = seedRandom(`embedding-${token}`);
    return Array.from({ length: dim }, () => Math.round((rng() * 2 - 1) * 1000) / 1000);
  });
}

/**
 * Generates a deterministic weight matrix from a seed name.
 *
 * Values are in [-0.5, 0.5] to mimic Xavier initialization scale.
 *
 * @param name — Seed name (e.g., "W_Q", "W_K", "W_V").
 * @param rows — Number of rows.
 * @param cols — Number of columns.
 * @returns Matrix of shape [rows, cols].
 */
export function generateWeightMatrix(name: string, rows: number, cols: number): number[][] {
  const rng = seedRandom(`weight-${name}`);
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => Math.round((rng() - 0.5) * 1000) / 1000),
  );
}

/**
 * Generates a deterministic bias vector from a seed name.
 *
 * Values are small (near zero) to mimic standard initialization.
 *
 * @param name — Seed name (e.g., "b_1", "b_2").
 * @param length — Vector length.
 * @returns Vector of the given length.
 */
export function generateBiasVector(name: string, length: number): number[] {
  const rng = seedRandom(`bias-${name}`);
  return Array.from({ length }, () => Math.round((rng() - 0.5) * 200) / 1000);
}
