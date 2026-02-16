"""
Deep Learning Mathematics Utility Library — Python mirror of dl-math.ts.

Pure functions for all mathematical operations used by Phase 9
(deep learning) generators.

CRITICAL PARITY CONTRACT:
Every function MUST produce results identical to its TypeScript counterpart
in ``web/src/engine/utils/dl-math.ts``. Enforced by cross-language tests.

CRITICAL CONVENTIONS (do not deviate):
- ReLU'(0) = 0 (subgradient convention, matches PyTorch)
- MSE gradient includes the (2/k) factor
- Adam step counter t starts at 1 (never 0)
- Sigmoid + BCE uses combined gradient delta = a - y
- Convolution is correlation (no kernel flip)
- Weight matrix convention: W[toNeuron][fromNeuron]

RULES:
- Every function is PURE (no side effects).
- Every function is DETERMINISTIC.
- NO use of NumPy. Plain Python arithmetic for exact parity.
- NO use of Python's ``random`` module. Randomness comes from
  ``genai_math.seed_random()``.
"""

from __future__ import annotations

import math

# ── Activation Functions ─────────────────────────────────────────────────────


def sigmoid(z: float) -> float:
    """Sigmoid activation function.

    sigma(z) = 1 / (1 + exp(-z))

    Parameters
    ----------
    z : float
        Pre-activation value.

    Returns
    -------
    float
        Value in (0, 1).
    """
    # Guard against overflow: matches TypeScript implementation
    if z > 500:
        return 1.0
    if z < -500:
        return 0.0
    return 1.0 / (1.0 + math.exp(-z))


def sigmoid_derivative(z: float) -> float:
    """Derivative of sigmoid, computed from pre-activation z.

    sigma'(z) = sigma(z) x (1 - sigma(z))

    Parameters
    ----------
    z : float
        Pre-activation value.

    Returns
    -------
    float
        Derivative value in (0, 0.25].
    """
    s = sigmoid(z)
    return s * (1.0 - s)


def relu(z: float) -> float:
    """ReLU activation function.

    ReLU(z) = max(0, z)

    Parameters
    ----------
    z : float
        Pre-activation value.

    Returns
    -------
    float
        Value in [0, infinity).
    """
    return max(0.0, z)


def relu_derivative(z: float) -> float:
    """Derivative of ReLU.

    ReLU'(z) = 1 if z > 0, else 0

    CONVENTION: ReLU'(0) = 0 (matches PyTorch default AND TypeScript).

    Parameters
    ----------
    z : float
        Pre-activation value.

    Returns
    -------
    float
        0.0 or 1.0.
    """
    return 1.0 if z > 0 else 0.0


def tanh_activation(z: float) -> float:
    """Tanh activation function.

    tanh(z) = (exp(z) - exp(-z)) / (exp(z) + exp(-z))

    Parameters
    ----------
    z : float
        Pre-activation value.

    Returns
    -------
    float
        Value in (-1, 1).
    """
    return math.tanh(z)


def tanh_derivative(z: float) -> float:
    """Derivative of tanh.

    tanh'(z) = 1 - tanh(z)^2

    Parameters
    ----------
    z : float
        Pre-activation value.

    Returns
    -------
    float
        Derivative value in (0, 1].
    """
    t = math.tanh(z)
    return 1.0 - t * t


def step_function(z: float) -> float:
    """Step activation function (classical perceptron).

    step(z) = 1 if z >= 0, else 0

    NOT differentiable. Only used in the perceptron visualization.

    Parameters
    ----------
    z : float
        Pre-activation value.

    Returns
    -------
    float
        0.0 or 1.0.
    """
    return 1.0 if z >= 0 else 0.0


# ── Loss Functions ───────────────────────────────────────────────────────────


def mse_loss(predictions: list[float], targets: list[float]) -> float:
    """Mean Squared Error loss.

    L = (1/k) x Sigma(y_hat_i - y_i)^2

    Parameters
    ----------
    predictions : list[float]
        Network outputs, length k.
    targets : list[float]
        Ground truth values, length k.

    Returns
    -------
    float
        Loss value >= 0.

    Raises
    ------
    ValueError
        If lengths differ.
    """
    if len(predictions) != len(targets):
        raise ValueError(
            f"mse_loss: predictions length ({len(predictions)}) "
            f"must equal targets length ({len(targets)})."
        )
    k = len(predictions)
    if k == 0:
        return 0.0
    total = 0.0
    for i in range(k):
        diff = predictions[i] - targets[i]
        total += diff * diff
    return total / k


def mse_loss_gradient(predictions: list[float], targets: list[float]) -> list[float]:
    """Gradient of MSE loss with respect to predictions.

    dL/dy_hat_i = (2/k) x (y_hat_i - y_i)

    CRITICAL: Includes the (2/k) factor. This is intentional.

    Parameters
    ----------
    predictions : list[float]
        Network outputs.
    targets : list[float]
        Ground truth values (same length).

    Returns
    -------
    list[float]
        Array of gradients, same length as predictions.
    """
    k = len(predictions)
    factor = 2.0 / k
    return [factor * (predictions[i] - targets[i]) for i in range(k)]


def bce_loss(predictions: list[float], targets: list[float]) -> float:
    """Binary Cross-Entropy loss.

    L = -(1/k) x Sigma(y_i x ln(y_hat_i) + (1 - y_i) x ln(1 - y_hat_i))

    Predictions are clamped to [eps, 1-eps] where eps = 1e-7 to prevent ln(0).

    Parameters
    ----------
    predictions : list[float]
        Network outputs in (0, 1), length k.
    targets : list[float]
        Binary target values {0, 1}, length k.

    Returns
    -------
    float
        Loss value >= 0.
    """
    eps = 1e-7
    k = len(predictions)
    total = 0.0
    for i in range(k):
        # Clamp predictions to [eps, 1-eps] to prevent ln(0)
        p = min(max(predictions[i], eps), 1.0 - eps)
        y = targets[i]
        total += y * math.log(p) + (1.0 - y) * math.log(1.0 - p)
    return -total / k


# ── Linear Algebra ───────────────────────────────────────────────────────────


def dot_product(a: list[float], b: list[float]) -> float:
    """Dot product of two vectors.

    dot(a, b) = Sigma a_i x b_i

    Parameters
    ----------
    a : list[float]
        First vector.
    b : list[float]
        Second vector (same length as a).

    Returns
    -------
    float
        Scalar dot product.
    """
    if len(a) != len(b):
        raise ValueError(f"dot_product: vectors must be same length ({len(a)} vs {len(b)}).")
    total = 0.0
    for i in range(len(a)):
        total += a[i] * b[i]
    return total


def mat_vec_mul(m: list[list[float]], v: list[float]) -> list[float]:
    """Matrix-vector multiplication: result = M @ v.

    result[j] = Sigma_{i=0}^{cols-1} M[j][i] x v[i]

    Parameters
    ----------
    m : list[list[float]]
        2D matrix, shape [rows, cols].
    v : list[float]
        1D vector, length cols.

    Returns
    -------
    list[float]
        1D vector, length rows.
    """
    if not m:
        return []
    cols = len(m[0])
    if len(v) != cols:
        raise ValueError(
            f"mat_vec_mul: matrix columns ({cols}) must equal vector length ({len(v)})."
        )
    result: list[float] = []
    for row in m:
        total = 0.0
        for i in range(cols):
            total += row[i] * v[i]
        result.append(total)
    return result


def vec_add(a: list[float], b: list[float]) -> list[float]:
    """Element-wise vector addition.

    Parameters
    ----------
    a : list[float]
        First vector.
    b : list[float]
        Second vector (same length).

    Returns
    -------
    list[float]
        Sum vector.
    """
    if len(a) != len(b):
        raise ValueError(f"vec_add: vectors must have same length. Got {len(a)} and {len(b)}.")
    return [a[i] + b[i] for i in range(len(a))]


# ── Gradient Descent Optimizers ──────────────────────────────────────────────


def sgd_step(
    params: list[float],
    gradient: list[float],
    lr: float,
) -> list[float]:
    """Stochastic Gradient Descent (SGD) parameter update.

    theta_{t+1} = theta_t - eta x nabla_L(theta_t)

    Parameters
    ----------
    params : list[float]
        Current parameters.
    gradient : list[float]
        Gradient at current parameters.
    lr : float
        Learning rate eta.

    Returns
    -------
    list[float]
        Updated parameters.
    """
    return [p - lr * gradient[i] for i, p in enumerate(params)]


def momentum_step(
    params: list[float],
    gradient: list[float],
    velocity: list[float],
    lr: float,
    beta: float = 0.9,
) -> tuple[list[float], list[float]]:
    """SGD with Momentum parameter update (Sutskever formulation).

    v_{t+1} = beta x v_t + g_t
    theta_{t+1} = theta_t - eta x v_{t+1}

    Parameters
    ----------
    params : list[float]
        Current parameters.
    gradient : list[float]
        Gradient g_t at current parameters.
    velocity : list[float]
        Current velocity vector v_t.
    lr : float
        Learning rate eta.
    beta : float
        Momentum coefficient. Default: 0.9.

    Returns
    -------
    tuple[list[float], list[float]]
        (Updated parameters, Updated velocity).
    """
    new_velocity = [beta * velocity[i] + gradient[i] for i in range(len(params))]
    new_params = [params[i] - lr * new_velocity[i] for i in range(len(params))]
    return new_params, new_velocity


def adam_step(
    params: list[float],
    gradient: list[float],
    m: list[float],
    v: list[float],
    lr: float,
    t: int,
    beta1: float = 0.9,
    beta2: float = 0.999,
    eps: float = 1e-8,
) -> tuple[list[float], list[float], list[float]]:
    """Adam (Adaptive Moment Estimation) parameter update.

    m_t = beta1 x m_{t-1} + (1 - beta1) x g_t
    v_t = beta2 x v_{t-1} + (1 - beta2) x g_t^2
    m_hat_t = m_t / (1 - beta1^t)
    v_hat_t = v_t / (1 - beta2^t)
    theta_{t+1} = theta_t - lr x m_hat_t / (sqrt(v_hat_t) + eps)

    CRITICAL: t must start at 1, NEVER 0.

    Parameters
    ----------
    params : list[float]
        Current parameters theta_t.
    gradient : list[float]
        Gradient g_t.
    m : list[float]
        First moment estimate m_{t-1}.
    v : list[float]
        Second moment estimate v_{t-1}.
    lr : float
        Learning rate.
    t : int
        Step number. MUST be >= 1.
    beta1 : float
        First moment decay. Default: 0.9.
    beta2 : float
        Second moment decay. Default: 0.999.
    eps : float
        Numerical stability constant. Default: 1e-8.

    Returns
    -------
    tuple[list[float], list[float], list[float]]
        (Updated params, Updated first moment, Updated second moment).

    Raises
    ------
    ValueError
        If t < 1.
    """
    if t < 1:
        raise ValueError(
            f"adam_step: step counter t must be >= 1, got {t}. "
            "Using t=0 causes 1 - beta^0 = 0 -> division by zero -> NaN."
        )

    n = len(params)
    new_m: list[float] = [0.0] * n
    new_v: list[float] = [0.0] * n
    new_params: list[float] = [0.0] * n

    # Bias correction denominators
    bc1 = 1.0 - beta1**t
    bc2 = 1.0 - beta2**t

    for i in range(n):
        g = gradient[i]
        # m_t = beta1 * m_{t-1} + (1 - beta1) * g_t
        new_m[i] = beta1 * m[i] + (1.0 - beta1) * g
        # v_t = beta2 * v_{t-1} + (1 - beta2) * g_t^2
        new_v[i] = beta2 * v[i] + (1.0 - beta2) * g * g
        # Bias-corrected estimates
        m_hat = new_m[i] / bc1
        v_hat = new_v[i] / bc2
        # Parameter update
        new_params[i] = params[i] - lr * m_hat / (math.sqrt(v_hat) + eps)

    return new_params, new_m, new_v
