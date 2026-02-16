"""
GenAI Mathematics Utility Library — Python mirror of genai-math.ts.

Pure functions for all mathematical operations used by generative AI generators.

CRITICAL PARITY CONTRACT:
Every function in this module MUST produce results identical to its
TypeScript counterpart in ``web/src/engine/utils/genai-math.ts``.
The cross-language parity tests enforce this with +/-1e-9 tolerance
for floating-point values.

KEY DESIGN RULES:
1. Every function is PURE (no side effects, no mutable state except the PRNG).
2. Every function is DETERMINISTIC given the same PRNG seed.
3. The PRNG algorithm is Mulberry32 with DJB2 string hash, matching the
   TypeScript implementation EXACTLY.
4. NO use of Python's ``random`` module. ALL randomness comes from seed_random().
5. NO use of NumPy. This module uses plain Python arithmetic for exact
   parity with TypeScript's plain-JavaScript arithmetic.

MATHEMATICAL OPERATIONS:
- Matrix multiplication (mat_mul)
- Matrix transpose (transpose)
- Row-wise softmax with numerical stability (softmax_rows)
- Scalar matrix scaling (scale_matrix)
- Cosine similarity (cosine_similarity)
- L2 norm (l2_norm)
- Dot product (dot_product)
- Vector addition (vector_add)
- Layer normalization (layer_norm, layer_norm_rows)
- ReLU activation (relu_vec, relu_matrix)
- Feed-forward network (feed_forward)
- Deterministic embedding generation (generate_embeddings)
- Deterministic weight matrix generation (generate_weight_matrix)
- Deterministic bias vector generation (generate_bias_vector)
"""

from __future__ import annotations

import math
from collections.abc import Callable

# ── Seeded PRNG ──────────────────────────────────────────────────────────────
# PARITY CRITICAL: Must match the TypeScript implementation in genai-math.ts.
# TypeScript uses:
#   1. DJB2 hash to convert string seed -> 32-bit integer
#   2. Mulberry32 PRNG for generating floats in [0, 1)
# Python's integers are arbitrary precision, so we must use bitwise masks
# to simulate 32-bit signed integer overflow behavior.


def _to_int32(x: int) -> int:
    """Convert a Python integer to a signed 32-bit integer (JS `| 0` behavior).

    Parameters
    ----------
    x : int
        Any Python integer.

    Returns
    -------
    int
        Value in [-2^31, 2^31 - 1].
    """
    x = x & 0xFFFFFFFF
    if x >= 0x80000000:
        return x - 0x100000000
    return x


def _to_uint32(x: int) -> int:
    """Convert a Python integer to an unsigned 32-bit integer (JS `>>> 0`).

    Parameters
    ----------
    x : int
        Any Python integer.

    Returns
    -------
    int
        Value in [0, 2^32 - 1].
    """
    return x & 0xFFFFFFFF


def _math_imul(a: int, b: int) -> int:
    """Emulate JavaScript's Math.imul() — 32-bit integer multiplication.

    Parameters
    ----------
    a : int
        First operand.
    b : int
        Second operand.

    Returns
    -------
    int
        Signed 32-bit result of a * b.
    """
    # Perform multiplication and truncate to 32 bits
    return _to_int32(a * b)


def seed_random(seed: str) -> Callable[[], float]:
    """Create a seeded pseudo-random number generator.

    PARITY CRITICAL: This MUST match the TypeScript ``seedRandom()`` in
    ``genai-math.ts`` exactly. The TypeScript implementation uses:
    1. DJB2 hash to convert the string seed to a 32-bit integer.
    2. Mulberry32 PRNG to generate floats in [0, 1).

    Parameters
    ----------
    seed : str
        Any string seed. Same seed always produces the same sequence.

    Returns
    -------
    Callable[[], float]
        A function that returns the next pseudo-random float in [0, 1)
        each time it is called.

    Examples
    --------
    >>> rng = seed_random("test")
    >>> val = rng()
    >>> 0.0 <= val < 1.0
    True
    """
    # Step 1: DJB2 hash — convert string to 32-bit integer
    # PARITY CRITICAL: Must match TypeScript's djb2 hash exactly
    hash_val = 5381
    for i in range(len(seed)):
        # hash = ((hash << 5) + hash + seed.charCodeAt(i)) | 0
        hash_val = _to_int32((hash_val << 5) + hash_val + ord(seed[i]))

    # Step 2: Mulberry32 PRNG
    # PARITY CRITICAL: Must match TypeScript's mulberry32 exactly
    state = [_to_int32(hash_val)]

    def next_float() -> float:
        """Return the next pseudo-random float in [0, 1)."""
        # state = (state + 0x6d2b79f5) | 0
        state[0] = _to_int32(state[0] + 0x6D2B79F5)
        # let t = Math.imul(state ^ (state >>> 15), 1 | state)
        t = _math_imul(state[0] ^ (_to_uint32(state[0]) >> 15), 1 | state[0])
        # t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        t = _to_int32(t + _math_imul(t ^ (_to_uint32(t) >> 7), 61 | t)) ^ t
        # return ((t ^ (t >>> 14)) >>> 0) / 4294967296
        return _to_uint32(t ^ (_to_uint32(t) >> 14)) / 4294967296

    return next_float


# ── Matrix Operations ────────────────────────────────────────────────────────


def mat_mul(a: list[list[float]], b: list[list[float]]) -> list[list[float]]:
    """Matrix multiplication: C = A x B.

    Uses naive O(m*k*n) triple-loop for exact parity with TypeScript.

    Parameters
    ----------
    a : list[list[float]]
        Matrix A with shape [m, k].
    b : list[list[float]]
        Matrix B with shape [k, n].

    Returns
    -------
    list[list[float]]
        Result matrix C with shape [m, n].
        C[i][j] = Sigma_{p=0}^{k-1} A[i][p] * B[p][j]

    Raises
    ------
    ValueError
        If inner dimensions do not match (A's columns != B's rows).
    """
    m = len(a)
    if m == 0:
        return []

    k = len(a[0])
    if k == 0:
        return [[] for _ in range(m)]

    if len(b) != k:
        raise ValueError(
            f"mat_mul: inner dimensions mismatch — A has {k} columns but B has {len(b)} rows."
        )

    n = len(b[0]) if k > 0 else 0

    # C[i][j] = Sigma_p A[i][p] * B[p][j]
    result: list[list[float]] = []
    for i in range(m):
        row: list[float] = []
        for j in range(n):
            total = 0.0
            for p in range(k):
                total += a[i][p] * b[p][j]
            row.append(total)
        result.append(row)

    return result


def transpose(matrix: list[list[float]]) -> list[list[float]]:
    """Transpose a 2D matrix.

    Parameters
    ----------
    matrix : list[list[float]]
        Input matrix with shape [m, n].

    Returns
    -------
    list[list[float]]
        Transposed matrix with shape [n, m].
        result[j][i] = matrix[i][j]
    """
    if not matrix:
        return []
    m = len(matrix)
    n = len(matrix[0])
    result: list[list[float]] = [[0.0] * m for _ in range(n)]
    for i in range(m):
        for j in range(n):
            result[j][i] = matrix[i][j]
    return result


def scale_matrix(matrix: list[list[float]], scalar: float) -> list[list[float]]:
    """Multiply every element of a matrix by a scalar.

    Parameters
    ----------
    matrix : list[list[float]]
        Input matrix.
    scalar : float
        Scaling factor.

    Returns
    -------
    list[list[float]]
        New matrix where result[i][j] = matrix[i][j] * scalar.
    """
    return [[val * scalar for val in row] for row in matrix]


# ── Softmax ──────────────────────────────────────────────────────────────────


def softmax(z: list[float]) -> list[float]:
    """Compute the softmax of a 1D vector.

    Uses the numerically stable formulation:
        softmax(x_i) = exp(x_i - max(x)) / Sigma_j exp(x_j - max(x))

    INVARIANT: sum(result) = 1.0 within +/-1e-9. All values >= 0.

    Parameters
    ----------
    z : list[float]
        Input vector of any length >= 1.

    Returns
    -------
    list[float]
        Probability distribution (same length as z, sums to 1).

    Raises
    ------
    ValueError
        If z is empty.
    """
    if len(z) == 0:
        raise ValueError("softmax: input vector must be non-empty.")

    # Numerical stability: subtract the maximum value before exponentiating
    max_val = max(z)
    exps = [math.exp(val - max_val) for val in z]
    sum_exps = sum(exps)

    # Guard against sum = 0 (happens if all values are -Infinity)
    if sum_exps == 0:
        n = len(z)
        return [1.0 / n] * n

    return [e / sum_exps for e in exps]


def softmax_rows(matrix: list[list[float]]) -> list[list[float]]:
    """Apply softmax independently to each row of a matrix.

    INVARIANT: For each row i: abs(sum(row) - 1.0) <= 1e-9.

    Parameters
    ----------
    matrix : list[list[float]]
        Input matrix with shape [m, n].

    Returns
    -------
    list[list[float]]
        Matrix of same shape where each row is a probability distribution.
    """
    return [softmax(row) for row in matrix]


# ── Vector Operations ────────────────────────────────────────────────────────


def dot_product(a: list[float], b: list[float]) -> float:
    """Compute the dot product of two vectors.

    Parameters
    ----------
    a : list[float]
        First vector.
    b : list[float]
        Second vector (must be same length as ``a``).

    Returns
    -------
    float
        Scalar dot product: Sigma_i a[i] * b[i]

    Raises
    ------
    ValueError
        If vectors have different lengths.
    """
    if len(a) != len(b):
        raise ValueError(f"dot_product: vectors must be same length ({len(a)} vs {len(b)}).")
    total = 0.0
    for i in range(len(a)):
        total += a[i] * b[i]
    return total


def l2_norm(vec: list[float]) -> float:
    """Compute the L2 (Euclidean) norm of a vector.

    Parameters
    ----------
    vec : list[float]
        Input vector.

    Returns
    -------
    float
        ||vec||_2 = sqrt(Sigma_i vec[i]^2)
    """
    return math.sqrt(sum(v * v for v in vec))


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two vectors.

    cos_sim(a, b) = (a . b) / (||a||_2 x ||b||_2)

    Parameters
    ----------
    a : list[float]
        First vector.
    b : list[float]
        Second vector (same length as ``a``).

    Returns
    -------
    float
        Cosine similarity in [-1, 1]. Returns 0.0 if either vector
        has near-zero norm.
    """
    if len(a) != len(b):
        raise ValueError(
            f"cosine_similarity: vectors must have same length. Got {len(a)} and {len(b)}."
        )
    dot = 0.0
    norm_a_sq = 0.0
    norm_b_sq = 0.0
    for i in range(len(a)):
        dot += a[i] * b[i]
        norm_a_sq += a[i] * a[i]
        norm_b_sq += b[i] * b[i]

    norm_a = math.sqrt(norm_a_sq)
    norm_b = math.sqrt(norm_b_sq)

    # Guard against zero vectors (matches TypeScript threshold)
    if norm_a < 1e-12 or norm_b < 1e-12:
        return 0.0

    return dot / (norm_a * norm_b)


def vector_add(a: list[float], b: list[float]) -> list[float]:
    """Add two vectors element-wise.

    Parameters
    ----------
    a : list[float]
        First vector.
    b : list[float]
        Second vector (must be same length).

    Returns
    -------
    list[float]
        result[i] = a[i] + b[i]

    Raises
    ------
    ValueError
        If vectors have different lengths.
    """
    if len(a) != len(b):
        raise ValueError(f"vector_add: length mismatch ({len(a)} vs {len(b)}).")
    return [a[i] + b[i] for i in range(len(a))]


# ── Layer Normalization ──────────────────────────────────────────────────────


def layer_norm(x: list[float]) -> list[float]:
    """Apply layer normalization to a 1D vector (simplified, no gamma/beta).

    output[i] = (x[i] - mean) / sqrt(variance + epsilon)

    Where:
        mean     = (1/d) x Sigma x[i]
        variance = (1/d) x Sigma (x[i] - mean)^2
        epsilon  = 1e-5

    Parameters
    ----------
    x : list[float]
        Input vector.

    Returns
    -------
    list[float]
        Normalized vector (same length).
    """
    d = len(x)
    if d == 0:
        return []

    epsilon = 1e-5
    mean = sum(x) / d
    variance = sum((val - mean) ** 2 for val in x) / d
    std_dev = math.sqrt(variance + epsilon)

    return [(val - mean) / std_dev for val in x]


def layer_norm_rows(matrix: list[list[float]]) -> list[list[float]]:
    """Apply layer normalization to each row of a matrix.

    Parameters
    ----------
    matrix : list[list[float]]
        Input matrix.

    Returns
    -------
    list[list[float]]
        Normalized matrix.
    """
    return [layer_norm(row) for row in matrix]


# ── ReLU Activation ──────────────────────────────────────────────────────────


def relu_vec(x: list[float]) -> list[float]:
    """Apply ReLU element-wise to a vector.

    ReLU(x) = max(0, x)

    Parameters
    ----------
    x : list[float]
        Input vector.

    Returns
    -------
    list[float]
        Vector with ReLU applied.
    """
    return [max(0.0, val) for val in x]


def relu_matrix(matrix: list[list[float]]) -> list[list[float]]:
    """Apply ReLU element-wise to a 2D matrix.

    Parameters
    ----------
    matrix : list[list[float]]
        Input matrix.

    Returns
    -------
    list[list[float]]
        Matrix with ReLU applied.
    """
    return [relu_vec(row) for row in matrix]


# ── Feed-Forward Network ─────────────────────────────────────────────────────


def feed_forward(
    x: list[list[float]],
    w1: list[list[float]],
    b1: list[float],
    w2: list[list[float]],
    b2: list[float],
) -> list[list[float]]:
    """Apply a two-layer feed-forward network.

    FFN(x) = ReLU(x x W_1 + b_1) x W_2 + b_2

    Parameters
    ----------
    x : list[list[float]]
        Input matrix [seq_len, d_model].
    w1 : list[list[float]]
        First weight matrix [d_model, d_ff].
    b1 : list[float]
        First bias vector [d_ff].
    w2 : list[list[float]]
        Second weight matrix [d_ff, d_model].
    b2 : list[float]
        Second bias vector [d_model].

    Returns
    -------
    list[list[float]]
        Output matrix [seq_len, d_model].
    """
    # Step 1: X x W_1
    hidden = mat_mul(x, w1)

    # Step 2: + b_1 (broadcast bias to each row)
    hidden = [[val + b1[j] for j, val in enumerate(row)] for row in hidden]

    # Step 3: ReLU
    hidden = relu_matrix(hidden)

    # Step 4: x W_2
    output = mat_mul(hidden, w2)

    # Step 5: + b_2 (broadcast bias to each row)
    output = [[val + b2[j] for j, val in enumerate(row)] for row in output]

    return output


# ── Embedding and Weight Generation Helpers ──────────────────────────────────


def generate_embeddings(tokens: list[str], dim: int) -> list[list[float]]:
    """Generate deterministic pseudo-random embeddings for a list of tokens.

    PARITY CRITICAL: Must match TypeScript ``generateEmbeddings()`` exactly.
    Each token's embedding is generated using seedRandom(`embedding-{token}`)
    and values are rounded to 3 decimal places: Math.round((rng() * 2 - 1) * 1000) / 1000.

    Parameters
    ----------
    tokens : list[str]
        List of token strings.
    dim : int
        Embedding dimension.

    Returns
    -------
    list[list[float]]
        Matrix of shape [len(tokens), dim]. Each row is a token's embedding.
    """
    result: list[list[float]] = []
    for token in tokens:
        rng = seed_random(f"embedding-{token}")
        embedding = [round((rng() * 2 - 1) * 1000) / 1000 for _ in range(dim)]
        result.append(embedding)
    return result


def generate_weight_matrix(name: str, rows: int, cols: int) -> list[list[float]]:
    """Generate a deterministic pseudo-random weight matrix.

    PARITY CRITICAL: Must match TypeScript ``generateWeightMatrix()`` exactly.
    Uses seedRandom(`weight-{name}`) and values are rounded:
    Math.round((rng() - 0.5) * 1000) / 1000.

    Parameters
    ----------
    name : str
        Matrix identifier (e.g., "W_Q", "W_K", "W_V").
    rows : int
        Number of rows.
    cols : int
        Number of columns.

    Returns
    -------
    list[list[float]]
        Matrix of shape [rows, cols] with values in [-0.5, 0.5].
    """
    rng = seed_random(f"weight-{name}")
    matrix: list[list[float]] = []
    for _ in range(rows):
        row = [round((rng() - 0.5) * 1000) / 1000 for _ in range(cols)]
        matrix.append(row)
    return matrix


def generate_bias_vector(name: str, length: int) -> list[float]:
    """Generate a deterministic pseudo-random bias vector.

    PARITY CRITICAL: Must match TypeScript ``generateBiasVector()`` exactly.
    Uses seedRandom(`bias-{name}`) and values are:
    Math.round((rng() - 0.5) * 200) / 1000.

    Parameters
    ----------
    name : str
        Bias identifier (e.g., "b_1", "b_2").
    length : int
        Vector length.

    Returns
    -------
    list[float]
        Bias vector.
    """
    rng = seed_random(f"bias-{name}")
    return [round((rng() - 0.5) * 200) / 1000 for _ in range(length)]
