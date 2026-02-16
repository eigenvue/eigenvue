"""
Cross-language parity tests -- Python vs TypeScript generators.

These tests load the shared test fixtures (which encode expected outputs
from the TypeScript generators) and verify that the Python generators
produce identical results.

THIS IS THE MOST IMPORTANT TEST FILE IN PHASE 11.

If these tests pass, the Python package is mathematically equivalent
to the web application. If they fail, something is wrong with either
the Python generator logic or the math library.

TOLERANCE: +/-1e-9 for floating-point values. This accounts for IEEE 754
double-precision arithmetic differences between JavaScript and Python,
which should be negligible since both use 64-bit doubles.

FIXTURE FORMATS:
  The shared fixtures use two structural patterns:

  Pattern A (classical algorithms):
    "expected" wrapper with "stepCount", "terminalStepId", "stepIds",
    and "keyStates" using stepIndex/field/value.

  Pattern B (DL / GenAI algorithms):
    Top-level "expectedStepCount", "keyStates" using stepId/state,
    and optional "invariants" for mathematical postconditions.
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

import pytest

from eigenvue.runner import run_generator

# ── Constants ────────────────────────────────────────────────────────────────

TOLERANCE = 1e-9

ALL_ALGORITHMS: list[tuple[str, str]] = [
    # (category_dir_name, algorithm_id)
    ("classical", "binary-search"),
    ("classical", "bubble-sort"),
    ("classical", "quicksort"),
    ("classical", "merge-sort"),
    ("classical", "bfs"),
    ("classical", "dfs"),
    ("classical", "dijkstra"),
    ("generative-ai", "tokenization-bpe"),
    ("generative-ai", "token-embeddings"),
    ("generative-ai", "self-attention"),
    ("generative-ai", "multi-head-attention"),
    ("generative-ai", "transformer-block"),
    ("deep-learning", "perceptron"),
    ("deep-learning", "feedforward-network"),
    ("deep-learning", "backpropagation"),
    ("deep-learning", "convolution"),
    ("deep-learning", "gradient-descent"),
]


# ── Fixture loading ──────────────────────────────────────────────────────────


def _get_algorithms_dir() -> Path:
    """Resolve the path to the repository's algorithms/ directory."""
    # python/tests/test_cross_language_parity.py -> python -> eigenvue repo root
    tests_dir = Path(__file__).resolve().parent
    python_dir = tests_dir.parent
    repo_root = python_dir.parent
    algorithms_dir = repo_root / "algorithms"

    if not algorithms_dir.is_dir():
        pytest.skip(
            f"Algorithms directory not found at {algorithms_dir}. "
            "Cross-language parity tests require the full repository."
        )

    return algorithms_dir


def load_all_fixtures(category: str, algo_id: str) -> list[dict[str, Any]]:
    """Load all fixture JSON files for a given algorithm.

    Parameters
    ----------
    category : str
        Category directory name (e.g., "classical", "deep-learning").
    algo_id : str
        Algorithm identifier (e.g., "binary-search").

    Returns
    -------
    list[dict]
        List of parsed fixture dicts, each with an added "_fixture_name" key.
    """
    algorithms_dir = _get_algorithms_dir()
    fixture_dir = algorithms_dir / category / algo_id / "tests"

    if not fixture_dir.is_dir():
        return []

    fixtures: list[dict[str, Any]] = []
    for fixture_path in sorted(fixture_dir.glob("*.fixture.json")):
        with open(fixture_path, encoding="utf-8") as f:
            data: dict[str, Any] = json.load(f)
        data["_fixture_name"] = fixture_path.stem.replace(".fixture", "")
        fixtures.append(data)

    return fixtures


# ── Recursive comparison with float tolerance ────────────────────────────────


def assert_values_close(
    actual: Any,
    expected: Any,
    tolerance: float = TOLERANCE,
    path: str = "",
) -> None:
    """Recursively compare two JSON-like values with floating-point tolerance.

    This is the CORE comparison function for cross-language parity.
    It handles nested dicts, lists, and scalar values.

    Parameters
    ----------
    actual : Any
        Value produced by the Python generator.
    expected : Any
        Value from the fixture (TypeScript reference).
    tolerance : float
        Maximum allowed absolute difference for floats.
    path : str
        Dot-separated path for error messages (e.g., "steps[0].state.mid").

    Raises
    ------
    AssertionError
        If any value differs beyond tolerance.
    """
    if isinstance(expected, dict):
        assert isinstance(actual, dict), (
            f"Type mismatch at {path}: expected dict, got {type(actual).__name__}"
        )
        for key in expected:
            assert key in actual, (
                f"Missing key at {path}: expected key {key!r} not found in actual. "
                f"Actual keys: {sorted(actual.keys())}"
            )
            assert_values_close(
                actual[key], expected[key], tolerance, f"{path}.{key}" if path else key
            )

    elif isinstance(expected, list):
        assert isinstance(actual, list), (
            f"Type mismatch at {path}: expected list, got {type(actual).__name__}"
        )
        assert len(actual) == len(expected), (
            f"Length mismatch at {path}: actual={len(actual)}, expected={len(expected)}"
        )
        for i, (a, e) in enumerate(zip(actual, expected)):
            assert_values_close(a, e, tolerance, f"{path}[{i}]")

    elif isinstance(expected, float):
        assert isinstance(actual, (int, float)), (
            f"Type mismatch at {path}: expected number, got {type(actual).__name__}"
        )
        actual_f = float(actual)
        assert not math.isnan(actual_f), f"NaN at {path}"
        assert not math.isinf(actual_f), f"Infinity at {path}"
        assert abs(actual_f - expected) <= tolerance, (
            f"Float mismatch at {path}: actual={actual_f}, expected={expected}, "
            f"diff={abs(actual_f - expected)}, tolerance={tolerance}"
        )

    elif isinstance(expected, int):
        if isinstance(actual, float):
            # Allow float-to-int comparison for values like 6.0 == 6
            assert abs(actual - expected) <= tolerance, (
                f"Numeric mismatch at {path}: actual={actual}, expected={expected}"
            )
        else:
            assert actual == expected, (
                f"Value mismatch at {path}: actual={actual!r}, expected={expected!r}"
            )

    elif isinstance(expected, bool):
        assert actual == expected, (
            f"Bool mismatch at {path}: actual={actual!r}, expected={expected!r}"
        )

    elif isinstance(expected, str):
        assert actual == expected, (
            f"String mismatch at {path}: actual={actual!r}, expected={expected!r}"
        )

    elif expected is None:
        assert actual is None, (
            f"Null mismatch at {path}: expected None, got {actual!r}"
        )

    else:
        assert actual == expected, (
            f"Value mismatch at {path}: actual={actual!r}, expected={expected!r}"
        )


# ── Invariant checkers ───────────────────────────────────────────────────────


def _check_no_nan_or_infinity(steps: list[dict[str, Any]], path: str) -> None:
    """Assert no NaN or Infinity values exist in any step state."""

    def _scan(value: Any, loc: str) -> None:
        if isinstance(value, float):
            assert not math.isnan(value), f"NaN found at {loc}"
            assert not math.isinf(value), f"Infinity found at {loc}"
        elif isinstance(value, dict):
            for k, v in value.items():
                _scan(v, f"{loc}.{k}")
        elif isinstance(value, list):
            for i, v in enumerate(value):
                _scan(v, f"{loc}[{i}]")

    for i, step in enumerate(steps):
        _scan(step.get("state", {}), f"{path}/steps[{i}].state")


def _check_attention_weights_sum_to_one(
    steps: list[dict[str, Any]], path: str, tol: float = 1e-6
) -> None:
    """Assert that attention weight matrix rows each sum to 1.0."""
    for i, step in enumerate(steps):
        state = step.get("state", {})
        weights = state.get("attentionWeights")
        if weights is None:
            continue
        if not isinstance(weights, list) or not weights:
            continue
        # Check if it's a 2D matrix
        if isinstance(weights[0], list):
            for row_idx, row in enumerate(weights):
                row_sum = sum(row)
                assert abs(row_sum - 1.0) <= tol, (
                    f"{path}/steps[{i}].state.attentionWeights[{row_idx}] "
                    f"sums to {row_sum}, expected 1.0 (+/-{tol})"
                )
                for val in row:
                    assert val >= -tol, (
                        f"{path}/steps[{i}].state.attentionWeights[{row_idx}] "
                        f"has negative weight: {val}"
                    )


def _check_layer_norm_postconditions(
    steps: list[dict[str, Any]], path: str
) -> None:
    """Assert layer norm outputs have mean ~0 and variance ~1."""
    for i, step in enumerate(steps):
        state = step.get("state", {})
        for key in ("layerNormOutput", "norm1Output", "norm2Output"):
            matrix = state.get(key)
            if matrix is None or not isinstance(matrix, list):
                continue
            if not matrix or not isinstance(matrix[0], list):
                continue
            for row_idx, row in enumerate(matrix):
                if not row:
                    continue
                d = len(row)
                mean = sum(row) / d
                variance = sum((v - mean) ** 2 for v in row) / d
                assert abs(mean) < 1e-4, (
                    f"{path}/steps[{i}].state.{key}[{row_idx}]: "
                    f"mean={mean}, expected ~0"
                )
                assert abs(variance - 1.0) < 0.1, (
                    f"{path}/steps[{i}].state.{key}[{row_idx}]: "
                    f"variance={variance}, expected ~1"
                )


def _check_residual_connections(
    steps: list[dict[str, Any]], path: str, tol: float = 1e-9
) -> None:
    """Assert residual connections are correct: output = input + sublayer."""
    for i, step in enumerate(steps):
        state = step.get("state", {})
        for prefix in ("residual1", "residual2"):
            res_input = state.get(f"{prefix}Input")
            res_sublayer = state.get(f"{prefix}Sublayer")
            res_output = state.get(f"{prefix}Output")
            if res_input is None or res_sublayer is None or res_output is None:
                continue
            if not isinstance(res_input, list):
                continue
            for row_idx in range(len(res_input)):
                if not isinstance(res_input[row_idx], list):
                    continue
                for col_idx in range(len(res_input[row_idx])):
                    expected_val = res_input[row_idx][col_idx] + res_sublayer[row_idx][col_idx]
                    actual_val = res_output[row_idx][col_idx]
                    assert abs(actual_val - expected_val) <= tol, (
                        f"{path}/steps[{i}].state.{prefix}Output"
                        f"[{row_idx}][{col_idx}]: "
                        f"actual={actual_val}, expected={expected_val}"
                    )


# ── Test class ───────────────────────────────────────────────────────────────


def _find_step_by_id(
    steps: list[dict[str, Any]], step_id: str
) -> dict[str, Any] | None:
    """Find the first step with the given ID, or None."""
    for step in steps:
        if step.get("id") == step_id:
            return step
    return None


@pytest.mark.parametrize("category,algo_id", ALL_ALGORITHMS)
class TestCrossLanguageParity:
    """Verify Python generators match TypeScript for every fixture."""

    def test_all_fixtures(self, category: str, algo_id: str) -> None:
        """For each fixture, Python output matches expected output."""
        fixtures = load_all_fixtures(category, algo_id)
        assert len(fixtures) > 0, f"No fixtures found for {category}/{algo_id}"

        for fixture in fixtures:
            fixture_name = fixture["_fixture_name"]
            inputs = fixture["inputs"]
            label = f"{algo_id}/{fixture_name}"

            # Run the Python generator
            py_steps = run_generator(algo_id, inputs)

            # ── Check step count ─────────────────────────────────────────
            expected_count = fixture.get("expectedStepCount")
            if expected_count is None and "expected" in fixture:
                expected_count = fixture["expected"].get("stepCount")

            if expected_count is not None:
                assert len(py_steps) == expected_count, (
                    f"{label}: step count mismatch "
                    f"(actual={len(py_steps)}, expected={expected_count})"
                )

            # ── Check terminal step ID ───────────────────────────────────
            expected_terminal_id = None
            if "expected" in fixture:
                expected_terminal_id = fixture["expected"].get("terminalStepId")

            if expected_terminal_id is not None:
                assert py_steps[-1]["id"] == expected_terminal_id, (
                    f"{label}: terminal step ID mismatch "
                    f"(actual={py_steps[-1]['id']!r}, "
                    f"expected={expected_terminal_id!r})"
                )

            # ── Check step ID sequence (Pattern A: expected.stepIds) ─────
            expected_step_ids = None
            if "expected" in fixture:
                expected_step_ids = fixture["expected"].get("stepIds")
            if expected_step_ids is None:
                expected_step_ids = fixture.get("expectedStepIds")

            if expected_step_ids is not None:
                actual_ids = [s["id"] for s in py_steps]
                assert actual_ids == expected_step_ids, (
                    f"{label}: step ID sequence mismatch\n"
                    f"  actual:   {actual_ids}\n"
                    f"  expected: {expected_step_ids}"
                )

            # ── Check key states ─────────────────────────────────────────
            key_states = fixture.get("keyStates")
            if key_states is None and "expected" in fixture:
                key_states = fixture["expected"].get("keyStates")

            if key_states is not None:
                for ks in key_states:
                    # Skip entries that only have "checks" (invariant checks)
                    if "checks" in ks and "state" not in ks and "field" not in ks:
                        continue

                    if "stepIndex" in ks:
                        # Pattern A: stepIndex + field + value
                        step_idx = ks["stepIndex"]
                        assert step_idx < len(py_steps), (
                            f"{label}: fixture references step {step_idx} "
                            f"but only {len(py_steps)} steps were generated"
                        )
                        step_state = py_steps[step_idx]["state"]
                        field = ks["field"]
                        assert field in step_state, (
                            f"{label}: step {step_idx} state missing "
                            f"field {field!r}. "
                            f"Available: {sorted(step_state.keys())}"
                        )
                        assert_values_close(
                            step_state[field],
                            ks["value"],
                            tolerance=TOLERANCE,
                            path=f"{label}/steps[{step_idx}].state.{field}",
                        )

                    elif "stepId" in ks and "state" in ks:
                        # Pattern B: stepId + state (partial match)
                        step_id = ks["stepId"]
                        step = _find_step_by_id(py_steps, step_id)
                        assert step is not None, (
                            f"{label}: no step with id={step_id!r} found. "
                            f"Available IDs: "
                            f"{[s['id'] for s in py_steps]}"
                        )
                        assert_values_close(
                            step["state"],
                            ks["state"],
                            tolerance=TOLERANCE,
                            path=f"{label}/step[id={step_id}].state",
                        )

            # ── Check result fields (Pattern A classical) ────────────────
            if "expected" in fixture:
                expected = fixture["expected"]

                if "result" in expected:
                    last_state = py_steps[-1]["state"]
                    assert "result" in last_state, (
                        f"{label}: last step state missing 'result'"
                    )
                    assert_values_close(
                        last_state["result"],
                        expected["result"],
                        tolerance=TOLERANCE,
                        path=f"{label}/terminal.state.result",
                    )

                if "sortedArray" in expected:
                    last_state = py_steps[-1]["state"]
                    assert "array" in last_state, (
                        f"{label}: last step state missing 'array'"
                    )
                    assert last_state["array"] == expected["sortedArray"], (
                        f"{label}: sorted array mismatch\n"
                        f"  actual:   {last_state['array']}\n"
                        f"  expected: {expected['sortedArray']}"
                    )

                if "shortestPathCost" in expected:
                    last_state = py_steps[-1]["state"]
                    cost_key = None
                    for candidate in ("shortestPathCost", "totalCost", "cost"):
                        if candidate in last_state:
                            cost_key = candidate
                            break
                    if cost_key is not None:
                        assert_values_close(
                            last_state[cost_key],
                            expected["shortestPathCost"],
                            tolerance=TOLERANCE,
                            path=f"{label}/terminal.state.{cost_key}",
                        )

                if "path" in expected and expected["path"] is not None:
                    last_state = py_steps[-1]["state"]
                    path_key = None
                    for candidate in ("path", "shortestPath"):
                        if candidate in last_state:
                            path_key = candidate
                            break
                    if path_key is not None and last_state[path_key] is not None:
                        assert last_state[path_key] == expected["path"], (
                            f"{label}: path mismatch\n"
                            f"  actual:   {last_state[path_key]}\n"
                            f"  expected: {expected['path']}"
                        )

                if "pathLength" in expected:
                    last_state = py_steps[-1]["state"]
                    for candidate in ("pathLength", "path"):
                        if candidate in last_state:
                            if candidate == "path" and isinstance(last_state[candidate], list):
                                actual_len = len(last_state[candidate]) - 1
                                assert actual_len == expected["pathLength"], (
                                    f"{label}: path length mismatch "
                                    f"(actual={actual_len}, "
                                    f"expected={expected['pathLength']})"
                                )
                            elif candidate == "pathLength":
                                assert_values_close(
                                    last_state[candidate],
                                    expected["pathLength"],
                                    tolerance=TOLERANCE,
                                    path=f"{label}/terminal.state.pathLength",
                                )
                            break

            # ── Check invariants ─────────────────────────────────────────
            invariants = fixture.get("invariants", {})

            if invariants.get("noNaNOrInfinity"):
                _check_no_nan_or_infinity(py_steps, label)

            if invariants.get("attentionWeightRowsSumToOne"):
                _check_attention_weights_sum_to_one(py_steps, label)

            if invariants.get("allWeightsNonNegative"):
                # Already checked within _check_attention_weights_sum_to_one
                pass

            if invariants.get("residualConnectionsCorrect"):
                _check_residual_connections(py_steps, label)

            if invariants.get("layerNormMeanApproxZero") or invariants.get(
                "layerNormVarianceApproxOne"
            ):
                _check_layer_norm_postconditions(py_steps, label)

            # ── Check attention weight checks from keyStates ─────────────
            if key_states is not None:
                for ks in key_states:
                    if "checks" not in ks:
                        continue
                    checks = ks["checks"]
                    step_id = ks.get("stepId")
                    if step_id is None:
                        continue
                    step = _find_step_by_id(py_steps, step_id)
                    if step is None:
                        continue
                    state = step["state"]
                    tol = checks.get("tolerance", 1e-6)
                    if "attentionWeightsRowSum" in checks:
                        weights = state.get("attentionWeights")
                        if weights and isinstance(weights, list):
                            if isinstance(weights[0], list):
                                for row_idx, row in enumerate(weights):
                                    row_sum = sum(row)
                                    assert abs(row_sum - checks["attentionWeightsRowSum"]) <= tol, (
                                        f"{label}/step[id={step_id}].state"
                                        f".attentionWeights[{row_idx}] "
                                        f"sums to {row_sum}, expected "
                                        f"{checks['attentionWeightsRowSum']} "
                                        f"(+/-{tol})"
                                    )


# ── Structural parity tests ──────────────────────────────────────────────────


@pytest.mark.parametrize("category,algo_id", ALL_ALGORITHMS)
class TestStructuralParity:
    """Verify structural properties of Python generator output."""

    def test_terminal_step_is_last(self, category: str, algo_id: str) -> None:
        """The last step (and only the last) must have isTerminal=true."""
        fixtures = load_all_fixtures(category, algo_id)
        for fixture in fixtures:
            py_steps = run_generator(algo_id, fixture["inputs"])

            assert py_steps[-1]["isTerminal"] is True, (
                f"{algo_id}/{fixture['_fixture_name']}: "
                "last step is not terminal"
            )
            for i, step in enumerate(py_steps[:-1]):
                assert step.get("isTerminal") is not True, (
                    f"{algo_id}/{fixture['_fixture_name']}: "
                    f"step {i} ({step['id']}) is terminal but not last"
                )

    def test_index_continuity(self, category: str, algo_id: str) -> None:
        """Step indices must be contiguous starting from 0."""
        fixtures = load_all_fixtures(category, algo_id)
        for fixture in fixtures:
            py_steps = run_generator(algo_id, fixture["inputs"])

            for i, step in enumerate(py_steps):
                assert step["index"] == i, (
                    f"{algo_id}/{fixture['_fixture_name']}: "
                    f"step {i} has index={step['index']}"
                )

    def test_determinism(self, category: str, algo_id: str) -> None:
        """Running the same fixture inputs twice must produce identical steps."""
        fixtures = load_all_fixtures(category, algo_id)
        if not fixtures:
            pytest.skip(f"No fixtures for {algo_id}")

        # Use first fixture only (determinism check doesn't need all)
        fixture = fixtures[0]
        steps1 = run_generator(algo_id, fixture["inputs"])
        steps2 = run_generator(algo_id, fixture["inputs"])

        assert len(steps1) == len(steps2), (
            f"{algo_id}: non-deterministic step count "
            f"({len(steps1)} vs {len(steps2)})"
        )
        for i, (s1, s2) in enumerate(zip(steps1, steps2)):
            assert s1["id"] == s2["id"], (
                f"{algo_id}: step {i} ID differs ({s1['id']} vs {s2['id']})"
            )
            assert_values_close(
                s1["state"],
                s2["state"],
                tolerance=0.0,
                path=f"{algo_id}/determinism/steps[{i}].state",
            )
