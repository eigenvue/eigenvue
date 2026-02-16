"""Tests for math utility libraries (genai_math and dl_math)."""

from __future__ import annotations

from eigenvue.math_utils.dl_math import (
    adam_step,
    bce_loss,
    mat_vec_mul,
    momentum_step,
    mse_loss,
    mse_loss_gradient,
    relu,
    relu_derivative,
    sgd_step,
    sigmoid,
    sigmoid_derivative,
    step_function,
    tanh_activation,
    tanh_derivative,
    vec_add,
)
from eigenvue.math_utils.genai_math import (
    cosine_similarity,
    dot_product,
    generate_bias_vector,
    generate_embeddings,
    generate_weight_matrix,
    l2_norm,
    layer_norm,
    mat_mul,
    relu_vec,
    scale_matrix,
    seed_random,
    softmax,
    softmax_rows,
    transpose,
    vector_add,
)

# ── PRNG Tests ───────────────────────────────────────────────────────────

class TestSeedRandom:
    def test_deterministic(self) -> None:
        rng1 = seed_random("test")
        rng2 = seed_random("test")
        for _ in range(100):
            assert rng1() == rng2()

    def test_in_range(self) -> None:
        rng = seed_random("hello")
        for _ in range(1000):
            val = rng()
            assert 0.0 <= val < 1.0

    def test_different_seeds_different_values(self) -> None:
        rng1 = seed_random("seed-a")
        rng2 = seed_random("seed-b")
        # At least one of the first 10 values should differ
        vals1 = [rng1() for _ in range(10)]
        vals2 = [rng2() for _ in range(10)]
        assert vals1 != vals2

    def test_empty_seed(self) -> None:
        rng = seed_random("")
        val = rng()
        assert 0.0 <= val < 1.0


# ── Matrix Operations ────────────────────────────────────────────────────

class TestMatMul:
    def test_identity(self) -> None:
        a = [[1, 0], [0, 1]]
        b = [[3, 4], [5, 6]]
        result = mat_mul(a, b)
        assert result == [[3, 4], [5, 6]]

    def test_2x3_times_3x2(self) -> None:
        a = [[1, 2, 3], [4, 5, 6]]
        b = [[7, 8], [9, 10], [11, 12]]
        result = mat_mul(a, b)
        assert result == [[58, 64], [139, 154]]

    def test_dimension_mismatch_raises(self) -> None:
        import pytest
        with pytest.raises(ValueError, match="inner dimensions"):
            mat_mul([[1, 2]], [[1, 2]])  # 1x2 * 1x2 fails


class TestTranspose:
    def test_2x3(self) -> None:
        m = [[1, 2, 3], [4, 5, 6]]
        result = transpose(m)
        assert result == [[1, 4], [2, 5], [3, 6]]

    def test_empty(self) -> None:
        assert transpose([]) == []


class TestScaleMatrix:
    def test_scale_by_2(self) -> None:
        m = [[1, 2], [3, 4]]
        assert scale_matrix(m, 2) == [[2, 4], [6, 8]]


# ── Softmax ──────────────────────────────────────────────────────────────

class TestSoftmax:
    def test_sums_to_one(self) -> None:
        result = softmax([1.0, 2.0, 3.0])
        assert abs(sum(result) - 1.0) < 1e-9

    def test_all_positive(self) -> None:
        result = softmax([-1.0, 0.0, 1.0])
        assert all(v >= 0 for v in result)

    def test_uniform_input(self) -> None:
        result = softmax([1.0, 1.0, 1.0])
        for v in result:
            assert abs(v - 1 / 3) < 1e-9

    def test_numerical_stability(self) -> None:
        result = softmax([1000.0, 1001.0, 1002.0])
        assert abs(sum(result) - 1.0) < 1e-9

    def test_empty_raises(self) -> None:
        import pytest
        with pytest.raises(ValueError):
            softmax([])


class TestSoftmaxRows:
    def test_each_row_sums_to_one(self) -> None:
        result = softmax_rows([[1, 2, 3], [4, 5, 6]])
        for row in result:
            assert abs(sum(row) - 1.0) < 1e-9


# ── Vector Operations ────────────────────────────────────────────────────

class TestDotProduct:
    def test_basic(self) -> None:
        assert dot_product([1, 2, 3], [4, 5, 6]) == 32

    def test_orthogonal(self) -> None:
        assert dot_product([1, 0], [0, 1]) == 0

    def test_length_mismatch_raises(self) -> None:
        import pytest
        with pytest.raises(ValueError):
            dot_product([1, 2], [1, 2, 3])


class TestL2Norm:
    def test_unit_vector(self) -> None:
        assert abs(l2_norm([1, 0, 0]) - 1.0) < 1e-9

    def test_3_4_5_triangle(self) -> None:
        assert abs(l2_norm([3, 4]) - 5.0) < 1e-9


class TestCosineSimilarity:
    def test_identical_vectors(self) -> None:
        assert abs(cosine_similarity([1, 2, 3], [1, 2, 3]) - 1.0) < 1e-9

    def test_orthogonal_vectors(self) -> None:
        assert abs(cosine_similarity([1, 0], [0, 1])) < 1e-9

    def test_opposite_vectors(self) -> None:
        assert abs(cosine_similarity([1, 0], [-1, 0]) + 1.0) < 1e-9


class TestVectorAdd:
    def test_basic(self) -> None:
        assert vector_add([1, 2], [3, 4]) == [4, 6]


# ── Layer Normalization ──────────────────────────────────────────────────

class TestLayerNorm:
    def test_output_mean_near_zero(self) -> None:
        result = layer_norm([1.0, 2.0, 3.0, 4.0])
        mean = sum(result) / len(result)
        assert abs(mean) < 1e-6

    def test_output_variance_near_one(self) -> None:
        result = layer_norm([1.0, 2.0, 3.0, 4.0])
        mean = sum(result) / len(result)
        variance = sum((v - mean) ** 2 for v in result) / len(result)
        assert abs(variance - 1.0) < 1e-3  # epsilon=1e-5 causes slight deviation


# ── ReLU ─────────────────────────────────────────────────────────────────

class TestReLU:
    def test_positive(self) -> None:
        assert relu_vec([1.0, 2.0, 3.0]) == [1.0, 2.0, 3.0]

    def test_negative(self) -> None:
        assert relu_vec([-1.0, -2.0, -3.0]) == [0.0, 0.0, 0.0]

    def test_mixed(self) -> None:
        assert relu_vec([-1.0, 0.0, 1.0]) == [0.0, 0.0, 1.0]


# ── Embedding Generation ────────────────────────────────────────────────

class TestGenerateEmbeddings:
    def test_shape(self) -> None:
        result = generate_embeddings(["hello", "world"], 4)
        assert len(result) == 2
        assert all(len(row) == 4 for row in result)

    def test_deterministic(self) -> None:
        r1 = generate_embeddings(["test"], 4)
        r2 = generate_embeddings(["test"], 4)
        assert r1 == r2

    def test_values_in_range(self) -> None:
        result = generate_embeddings(["token"], 16)
        for row in result:
            for val in row:
                assert -1.0 <= val <= 1.0


class TestGenerateWeightMatrix:
    def test_shape(self) -> None:
        result = generate_weight_matrix("W_Q", 4, 3)
        assert len(result) == 4
        assert all(len(row) == 3 for row in result)

    def test_deterministic(self) -> None:
        r1 = generate_weight_matrix("test", 3, 3)
        r2 = generate_weight_matrix("test", 3, 3)
        assert r1 == r2


class TestGenerateBiasVector:
    def test_shape(self) -> None:
        result = generate_bias_vector("b_1", 4)
        assert len(result) == 4

    def test_deterministic(self) -> None:
        r1 = generate_bias_vector("test", 4)
        r2 = generate_bias_vector("test", 4)
        assert r1 == r2


# ══════════════════════════════════════════════════════════════════════════
# DL Math Tests
# ══════════════════════════════════════════════════════════════════════════

class TestSigmoid:
    def test_zero(self) -> None:
        assert abs(sigmoid(0) - 0.5) < 1e-9

    def test_large_positive(self) -> None:
        assert abs(sigmoid(100) - 1.0) < 1e-6

    def test_large_negative(self) -> None:
        assert abs(sigmoid(-100)) < 1e-6

    def test_overflow_guard(self) -> None:
        assert sigmoid(1000) == 1.0
        assert sigmoid(-1000) == 0.0


class TestSigmoidDerivative:
    def test_max_at_zero(self) -> None:
        assert abs(sigmoid_derivative(0) - 0.25) < 1e-9

    def test_positive(self) -> None:
        assert sigmoid_derivative(0) > 0
        assert sigmoid_derivative(2) > 0


class TestReLUDL:
    def test_positive(self) -> None:
        assert relu(5.0) == 5.0

    def test_negative(self) -> None:
        assert relu(-5.0) == 0.0

    def test_zero(self) -> None:
        assert relu(0.0) == 0.0


class TestReLUDerivative:
    def test_positive(self) -> None:
        assert relu_derivative(5.0) == 1.0

    def test_negative(self) -> None:
        assert relu_derivative(-5.0) == 0.0

    def test_zero_convention(self) -> None:
        """ReLU'(0) = 0 by convention (matches PyTorch)."""
        assert relu_derivative(0.0) == 0.0


class TestTanh:
    def test_zero(self) -> None:
        assert abs(tanh_activation(0)) < 1e-9

    def test_range(self) -> None:
        assert -1 < tanh_activation(1.0) < 1
        assert -1 < tanh_activation(-1.0) < 1


class TestTanhDerivative:
    def test_at_zero(self) -> None:
        assert abs(tanh_derivative(0) - 1.0) < 1e-9


class TestStepFunction:
    def test_positive(self) -> None:
        assert step_function(1.0) == 1.0

    def test_negative(self) -> None:
        assert step_function(-1.0) == 0.0

    def test_zero(self) -> None:
        assert step_function(0.0) == 1.0


# ── Loss Functions ───────────────────────────────────────────────────────

class TestMSELoss:
    def test_perfect_prediction(self) -> None:
        assert mse_loss([1.0, 2.0], [1.0, 2.0]) == 0.0

    def test_simple_case(self) -> None:
        # MSE = (1/2)((3-1)^2 + (4-2)^2) = (1/2)(4+4) = 4.0
        assert abs(mse_loss([3.0, 4.0], [1.0, 2.0]) - 4.0) < 1e-9


class TestMSELossGradient:
    def test_perfect_prediction(self) -> None:
        grad = mse_loss_gradient([1.0, 2.0], [1.0, 2.0])
        assert all(abs(g) < 1e-9 for g in grad)

    def test_includes_2_over_k(self) -> None:
        # dL/dy_hat_i = (2/k)(y_hat_i - y_i)
        # k=2, pred=[3,4], target=[1,2]
        # grad = (2/2)*[3-1, 4-2] = [2, 2]
        grad = mse_loss_gradient([3.0, 4.0], [1.0, 2.0])
        assert abs(grad[0] - 2.0) < 1e-9
        assert abs(grad[1] - 2.0) < 1e-9


class TestBCELoss:
    def test_perfect_prediction(self) -> None:
        # Near-perfect predictions should give near-zero loss
        loss = bce_loss([0.999, 0.001], [1.0, 0.0])
        assert loss < 0.01

    def test_bad_prediction(self) -> None:
        loss = bce_loss([0.5, 0.5], [1.0, 0.0])
        assert loss > 0.5


# ── Linear Algebra (DL) ─────────────────────────────────────────────────

class TestMatVecMul:
    def test_identity(self) -> None:
        result = mat_vec_mul([[1, 0], [0, 1]], [3.0, 4.0])
        assert result == [3.0, 4.0]

    def test_2x3(self) -> None:
        result = mat_vec_mul([[1, 2, 3], [4, 5, 6]], [1.0, 1.0, 1.0])
        assert result == [6.0, 15.0]


class TestVecAddDL:
    def test_basic(self) -> None:
        assert vec_add([1, 2], [3, 4]) == [4, 6]


# ── Optimizers ───────────────────────────────────────────────────────────

class TestSGDStep:
    def test_basic_update(self) -> None:
        params = [1.0, 2.0]
        grad = [0.5, 1.0]
        result = sgd_step(params, grad, lr=0.1)
        assert abs(result[0] - 0.95) < 1e-9
        assert abs(result[1] - 1.9) < 1e-9


class TestMomentumStep:
    def test_first_step(self) -> None:
        params = [1.0, 2.0]
        grad = [0.5, 1.0]
        velocity = [0.0, 0.0]
        new_params, new_vel = momentum_step(params, grad, velocity, lr=0.1)
        # v = 0.9*0 + 0.5 = 0.5, p = 1.0 - 0.1*0.5 = 0.95
        assert abs(new_params[0] - 0.95) < 1e-9
        assert abs(new_vel[0] - 0.5) < 1e-9


class TestAdamStep:
    def test_t_must_be_positive(self) -> None:
        import pytest
        with pytest.raises(ValueError, match="t must be >= 1"):
            adam_step([1.0], [0.5], [0.0], [0.0], lr=0.001, t=0)

    def test_basic_step(self) -> None:
        params = [1.0]
        grad = [0.5]
        m = [0.0]
        v = [0.0]
        new_params, new_m, new_v = adam_step(params, grad, m, v, lr=0.001, t=1)
        assert len(new_params) == 1
        assert len(new_m) == 1
        assert len(new_v) == 1
        # Params should move towards 0 (gradient is positive)
        assert new_params[0] < params[0]
