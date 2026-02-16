// =============================================================================
// web/src/engine/utils/dl-math.ts
//
// Deep Learning Math Utility Library
//
// Pure functions for all mathematical operations used by Phase 9 deep learning
// algorithm generators. Every function is deterministic, side-effect free, and
// uses IEEE 754 double precision.
//
// Mathematical basis: Section 4 of the Phase 9 specification.
//
// CRITICAL CONVENTIONS (do not deviate):
//   - ReLU'(0) = 0 (subgradient convention, matches PyTorch)
//   - MSE gradient includes the (2/k) factor
//   - Adam step counter t starts at 1 (never 0)
//   - Sigmoid + BCE uses combined gradient δ = a - y
//   - Convolution is correlation (no kernel flip)
//   - Weight matrix convention: W[toNeuron][fromNeuron]
//
// Self-registers with the layout registry on module load.
// =============================================================================

// Re-export seedRandom from genai-math for deterministic PRNG.
export { seedRandom } from "./genai-math";

// ─────────────────────────────────────────────────────────────────────────────
// 1. Activation Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sigmoid activation function.
 *
 * σ(z) = 1 / (1 + exp(-z))
 *
 * Range: (0, 1) — output is always strictly between 0 and 1.
 *
 * Numerical stability: For z > 500, return 1.0. For z < -500, return 0.0.
 * This prevents exp(-z) overflow.
 *
 * @param z — Pre-activation value.
 * @returns Activation value in (0, 1).
 */
export function sigmoid(z: number): number {
  // σ(z) = 1 / (1 + exp(-z)) — Section 4.2.1
  if (z > 500) return 1.0;
  if (z < -500) return 0.0;
  return 1 / (1 + Math.exp(-z));
}

/**
 * Sigmoid derivative with respect to z.
 *
 * σ'(z) = σ(z) * (1 - σ(z))
 *
 * Maximum at z = 0 where σ'(0) = 0.25.
 *
 * @param z — Pre-activation value.
 * @returns Derivative value in (0, 0.25].
 */
export function sigmoidDerivative(z: number): number {
  // σ'(z) = σ(z) * (1 - σ(z)) — Section 4.2.1
  const s = sigmoid(z);
  return s * (1 - s);
}

/**
 * ReLU (Rectified Linear Unit) activation function.
 *
 * ReLU(z) = max(0, z)
 *
 * Range: [0, ∞)
 *
 * @param z — Pre-activation value.
 * @returns Activation value ≥ 0.
 */
export function relu(z: number): number {
  // ReLU(z) = max(0, z) — Section 4.2.2
  return Math.max(0, z);
}

/**
 * ReLU derivative with respect to z.
 *
 * ReLU'(z) = 1 if z > 0, 0 if z ≤ 0
 *
 * CONVENTION: ReLU'(0) = 0 (subgradient convention, matches PyTorch default).
 * This choice MUST be consistent everywhere. All test fixtures assume ReLU'(0) = 0.
 *
 * @param z — Pre-activation value.
 * @returns 1 if z > 0, 0 otherwise.
 */
export function reluDerivative(z: number): number {
  // ReLU'(z) = 1 if z > 0, 0 otherwise — Section 4.2.2, Convention: ReLU'(0) = 0
  return z > 0 ? 1 : 0;
}

/**
 * Hyperbolic tangent activation function.
 *
 * tanh(z) = (exp(z) - exp(-z)) / (exp(z) + exp(-z))
 *
 * Range: (-1, 1)
 *
 * Uses Math.tanh() directly for numerical stability.
 *
 * @param z — Pre-activation value.
 * @returns Activation value in (-1, 1).
 */
export function tanh(z: number): number {
  // tanh(z) = (exp(z) - exp(-z)) / (exp(z) + exp(-z)) — Section 4.2.3
  return Math.tanh(z);
}

/**
 * Tanh derivative with respect to z.
 *
 * tanh'(z) = 1 - tanh(z)²
 *
 * @param z — Pre-activation value.
 * @returns Derivative value in (0, 1].
 */
export function tanhDerivative(z: number): number {
  // tanh'(z) = 1 - tanh(z)² — Section 4.2.3
  const t = Math.tanh(z);
  return 1 - t * t;
}

/**
 * Step function (used only for classical perceptron).
 *
 * step(z) = 1 if z >= 0, 0 if z < 0
 *
 * Not differentiable. Used ONLY in the perceptron visualization.
 *
 * @param z — Pre-activation value.
 * @returns 0 or 1.
 */
export function stepFunction(z: number): number {
  // step(z) = 1 if z >= 0, 0 if z < 0 — Section 4.2.4
  return z >= 0 ? 1 : 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Loss Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mean Squared Error loss.
 *
 * L = (1/k) * Σ_{i=0}^{k-1} (ŷ_i - y_i)²
 *
 * @param predictions — Network outputs ŷ.
 * @param targets — Ground truth y. Must have same length as predictions.
 * @returns Scalar loss value ≥ 0.
 */
export function mseLoss(predictions: readonly number[], targets: readonly number[]): number {
  // L = (1/k) * Σ(ŷ_i - y_i)² — Section 4.3.1
  const k = predictions.length;
  let sum = 0;
  for (let i = 0; i < k; i++) {
    const diff = predictions[i]! - targets[i]!;
    sum += diff * diff;
  }
  return sum / k;
}

/**
 * MSE loss gradient with respect to predictions.
 *
 * ∂L/∂ŷ_i = (2/k) * (ŷ_i - y_i)
 *
 * NOTE: Includes the (2/k) factor. This is intentional and required.
 * Some implementations omit this factor — we do NOT.
 *
 * @param predictions — Network outputs ŷ.
 * @param targets — Ground truth y. Must have same length as predictions.
 * @returns Gradient vector, same length as predictions.
 */
export function mseLossGradient(
  predictions: readonly number[],
  targets: readonly number[],
): number[] {
  // ∂L/∂ŷ_i = (2/k) * (ŷ_i - y_i) — Section 4.3.1, CRITICAL: includes 2/k
  const k = predictions.length;
  const factor = 2 / k;
  return predictions.map((pred, i) => factor * (pred - targets[i]!));
}

/**
 * Binary Cross-Entropy loss (single sample, multiple outputs).
 *
 * L = -(1/k) * Σ(y_i * ln(ŷ_i) + (1 - y_i) * ln(1 - ŷ_i))
 *
 * Predictions are clamped to [ε, 1-ε] where ε = 1e-7 to prevent ln(0).
 *
 * @param predictions — Network outputs ŷ (should be in (0,1) after sigmoid).
 * @param targets — Ground truth y (0 or 1). Must have same length.
 * @returns Scalar loss value ≥ 0.
 */
export function bceLoss(predictions: readonly number[], targets: readonly number[]): number {
  // L = -(1/k) * Σ(y * ln(ŷ) + (1-y) * ln(1-ŷ)) — Section 4.3.2
  const EPS = 1e-7;
  const k = predictions.length;
  let sum = 0;
  for (let i = 0; i < k; i++) {
    // Clamp predictions to [ε, 1-ε] to prevent ln(0) = -Infinity
    const p = Math.min(Math.max(predictions[i]!, EPS), 1 - EPS);
    const y = targets[i]!;
    sum += y * Math.log(p) + (1 - y) * Math.log(1 - p);
  }
  return -sum / k;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Linear Algebra
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dot product of two vectors.
 *
 * dot(a, b) = Σ_{i=0}^{n-1} a_i * b_i
 *
 * @param a — First vector.
 * @param b — Second vector. Must have same length as a.
 * @returns Scalar dot product.
 * @throws If vectors have different lengths.
 */
export function dotProduct(a: readonly number[], b: readonly number[]): number {
  // dot(a, b) = Σ a_i * b_i — Section 4.1
  if (a.length !== b.length) {
    throw new Error(`dotProduct: vectors must have same length. Got ${a.length} and ${b.length}.`);
  }
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i]! * b[i]!;
  }
  return sum;
}

/**
 * Matrix-vector multiplication.
 *
 * result = M @ v
 *
 * result[j] = Σ_{i=0}^{cols-1} M[j][i] * v[i]
 *
 * @param M — Matrix of shape [rows, cols].
 * @param v — Vector of length cols.
 * @returns Vector of length rows.
 * @throws If M's column count doesn't match v's length.
 */
export function matVecMul(M: readonly (readonly number[])[], v: readonly number[]): number[] {
  // result[j] = Σ_i M[j][i] * v[i] — Section 4.1 (matrix form z = W @ x + b)
  const rows = M.length;
  if (rows === 0) return [];
  const cols = M[0]!.length;
  if (cols !== v.length) {
    throw new Error(`matVecMul: M has ${cols} columns but v has length ${v.length}.`);
  }
  const result: number[] = new Array(rows);
  for (let j = 0; j < rows; j++) {
    let sum = 0;
    for (let i = 0; i < cols; i++) {
      sum += M[j]![i]! * v[i]!;
    }
    result[j] = sum;
  }
  return result;
}

/**
 * Element-wise vector addition.
 *
 * result[i] = a[i] + b[i]
 *
 * @param a — First vector.
 * @param b — Second vector. Must have same length.
 * @returns Sum vector.
 * @throws If vectors have different lengths.
 */
export function vecAdd(a: readonly number[], b: readonly number[]): number[] {
  // result[i] = a[i] + b[i]
  if (a.length !== b.length) {
    throw new Error(`vecAdd: vectors must have same length. Got ${a.length} and ${b.length}.`);
  }
  return a.map((val, i) => val + b[i]!);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Numerical Gradient (for test verification only)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes numerical gradient using central differences.
 *
 * ∂f/∂θ_i ≈ (f(θ + ε*e_i) - f(θ - ε*e_i)) / (2ε)
 *
 * This is used ONLY in tests to verify analytical gradients.
 * Never call this in generators — it is O(n) function evaluations
 * per gradient element.
 *
 * @param f — Scalar function of a parameter vector.
 * @param theta — Current parameter values.
 * @param eps — Perturbation size. Default: 1e-5.
 * @returns Numerical gradient vector, same length as theta.
 */
export function numericalGradient(
  f: (theta: number[]) => number,
  theta: number[],
  eps: number = 1e-5,
): number[] {
  // ∂f/∂θ_i ≈ (f(θ + ε*e_i) - f(θ - ε*e_i)) / (2ε) — Section 4.8
  const n = theta.length;
  const grad: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const thetaPlus = [...theta];
    const thetaMinus = [...theta];
    thetaPlus[i] = thetaPlus[i]! + eps;
    thetaMinus[i] = thetaMinus[i]! - eps;
    grad[i] = (f(thetaPlus) - f(thetaMinus)) / (2 * eps);
  }
  return grad;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Gradient Descent Optimizers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Stochastic Gradient Descent (SGD) parameter update.
 *
 * θ_{t+1} = θ_t - η * ∇L(θ_t)
 *
 * @param params — Current parameters.
 * @param gradient — Gradient ∇L at current parameters.
 * @param lr — Learning rate η.
 * @returns Updated parameters.
 */
export function sgdStep(
  params: readonly number[],
  gradient: readonly number[],
  lr: number,
): number[] {
  // θ_{t+1} = θ_t - η * ∇L(θ_t) — Section 4.6.1
  return params.map((p, i) => p - lr * gradient[i]!);
}

/**
 * SGD with Momentum parameter update (Sutskever formulation).
 *
 * v_{t+1} = β * v_t + g_t
 * θ_{t+1} = θ_t - η * v_{t+1}
 *
 * NOTE: This is the formulation used by PyTorch's torch.optim.SGD(momentum=β).
 * Some textbooks multiply the gradient by (1-β) — we do NOT.
 *
 * @param params — Current parameters.
 * @param gradient — Gradient g_t at current parameters.
 * @param velocity — Current velocity vector v_t. Initialized to zeros.
 * @param lr — Learning rate η.
 * @param beta — Momentum coefficient β. Default: 0.9.
 * @returns Updated parameters and velocity.
 */
export function momentumStep(
  params: readonly number[],
  gradient: readonly number[],
  velocity: readonly number[],
  lr: number,
  beta: number = 0.9,
): { params: number[]; velocity: number[] } {
  // v_{t+1} = β * v_t + g_t — Section 4.6.2 (Sutskever formulation)
  const newVelocity = velocity.map((v, i) => beta * v + gradient[i]!);
  // θ_{t+1} = θ_t - η * v_{t+1}
  const newParams = params.map((p, i) => p - lr * newVelocity[i]!);
  return { params: newParams, velocity: newVelocity };
}

/**
 * Adam (Adaptive Moment Estimation) parameter update.
 *
 * m_t = β₁ * m_{t-1} + (1 - β₁) * g_t        (first moment estimate)
 * v_t = β₂ * v_{t-1} + (1 - β₂) * g_t²        (second moment estimate)
 * m̂_t = m_t / (1 - β₁^t)                       (bias-corrected first moment)
 * v̂_t = v_t / (1 - β₂^t)                       (bias-corrected second moment)
 * θ_{t+1} = θ_t - η * m̂_t / (√v̂_t + ε)
 *
 * CRITICAL: t must start at 1, NEVER 0. Using t=0 causes 1 - β^0 = 0 → division by zero → NaN.
 *
 * @param params — Current parameters θ_t.
 * @param gradient — Gradient g_t.
 * @param m — First moment estimate m_{t-1}. Initialized to zeros.
 * @param v — Second moment estimate v_{t-1}. Initialized to zeros.
 * @param lr — Learning rate η.
 * @param t — Step number. MUST be ≥ 1.
 * @param beta1 — First moment decay. Default: 0.9.
 * @param beta2 — Second moment decay. Default: 0.999.
 * @param eps — Numerical stability constant. Default: 1e-8.
 * @returns Updated parameters, first moment, and second moment.
 * @throws If t < 1.
 */
export function adamStep(
  params: readonly number[],
  gradient: readonly number[],
  m: readonly number[],
  v: readonly number[],
  lr: number,
  t: number,
  beta1: number = 0.9,
  beta2: number = 0.999,
  eps: number = 1e-8,
): { params: number[]; m: number[]; v: number[] } {
  // INVARIANT: t >= 1 — Section 4.6.3, prevents division by zero
  if (t < 1) {
    throw new Error(
      `adamStep: step counter t must be >= 1, got ${t}. ` +
        `Using t=0 causes 1 - β^0 = 0 → division by zero → NaN.`,
    );
  }

  const n = params.length;
  const newM: number[] = new Array(n);
  const newV: number[] = new Array(n);
  const newParams: number[] = new Array(n);

  // Bias correction denominators
  // 1 - β₁^t and 1 - β₂^t — Section 4.6.3
  const bc1 = 1 - Math.pow(beta1, t);
  const bc2 = 1 - Math.pow(beta2, t);

  for (let i = 0; i < n; i++) {
    const g = gradient[i]!;

    // m_t = β₁ * m_{t-1} + (1 - β₁) * g_t
    newM[i] = beta1 * m[i]! + (1 - beta1) * g;

    // v_t = β₂ * v_{t-1} + (1 - β₂) * g_t² (element-wise squaring, NOT dot product)
    newV[i] = beta2 * v[i]! + (1 - beta2) * g * g;

    // m̂_t = m_t / (1 - β₁^t)
    const mHat = newM[i]! / bc1;

    // v̂_t = v_t / (1 - β₂^t)
    const vHat = newV[i]! / bc2;

    // θ_{t+1} = θ_t - η * m̂_t / (√v̂_t + ε)
    newParams[i] = params[i]! - (lr * mHat) / (Math.sqrt(vHat) + eps);
  }

  return { params: newParams, m: newM, v: newV };
}
