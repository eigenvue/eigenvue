"""Tests for all 17 algorithm generators.

Every generator must:
1. Run without error using default inputs from meta.json.
2. Produce a non-empty list of Step objects.
3. Have contiguous 0-based indices.
4. Have exactly one terminal step, at the end.
5. Have valid step IDs matching ^[a-z0-9][a-z0-9_-]*$.
6. Serialize cleanly to camelCase dicts via to_dict().
"""

from __future__ import annotations

import re

import eigenvue

# ── Structural validation helpers ──────────────────────────────────────────

STEP_ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9_-]*$")


def _validate_step_sequence(steps: list[dict]) -> None:
    """Validate structural invariants of a step sequence."""
    assert len(steps) > 0, "Generator produced zero steps."

    # Index contiguity
    for i, s in enumerate(steps):
        assert s["index"] == i, f"Step {i} has index={s['index']}"

    # Exactly one terminal step, at the end
    terminal_indices = [i for i, s in enumerate(steps) if s.get("isTerminal")]
    assert len(terminal_indices) == 1, f"Expected 1 terminal step, got {len(terminal_indices)}"
    assert terminal_indices[0] == len(steps) - 1, (
        f"Terminal step at index {terminal_indices[0]}, expected {len(steps) - 1}"
    )

    # All step IDs valid
    for s in steps:
        assert STEP_ID_PATTERN.match(s["id"]), f"Invalid step ID: {s['id']!r}"

    # All steps have required keys
    required_keys = {"index", "id", "title", "explanation", "state",
                     "visualActions", "codeHighlight", "isTerminal"}
    for i, s in enumerate(steps):
        missing = required_keys - s.keys()
        assert not missing, f"Step {i} missing keys: {missing}"

    # codeHighlight has language and lines
    for i, s in enumerate(steps):
        ch = s["codeHighlight"]
        assert "language" in ch, f"Step {i} codeHighlight missing 'language'"
        assert "lines" in ch, f"Step {i} codeHighlight missing 'lines'"
        assert len(ch["lines"]) > 0, f"Step {i} codeHighlight has empty lines"

    # visualActions is a list
    for i, s in enumerate(steps):
        assert isinstance(s["visualActions"], list), (
            f"Step {i} visualActions must be a list, got {type(s['visualActions'])}"
        )


# ── Parametrized test: all generators run with defaults ──────────────────

class TestAllGenerators:
    def test_generator_runs_with_defaults(self, algorithm_id: str) -> None:
        """Every registered generator must run without error on default inputs."""
        steps = eigenvue.steps(algorithm_id)
        _validate_step_sequence(steps)

    def test_generator_step_count_reasonable(self, algorithm_id: str) -> None:
        """Generators should produce a reasonable number of steps (1-500)."""
        steps = eigenvue.steps(algorithm_id)
        assert 1 <= len(steps) <= 500, f"Got {len(steps)} steps for {algorithm_id}"


# ── Category-specific tests ──────────────────────────────────────────────

class TestClassicalGenerators:
    def test_binary_search_finds_target(self) -> None:
        steps = eigenvue.steps("binary-search")
        last_step = steps[-1]
        # Default target is 13 in [1,3,5,7,9,11,13,15,17,19] → found at index 6
        assert last_step["state"]["result"] == 6

    def test_binary_search_not_found(self) -> None:
        steps = eigenvue.steps("binary-search", inputs={"array": [1, 3, 5], "target": 4})
        last_step = steps[-1]
        assert last_step["state"]["result"] == -1

    def test_bubble_sort_sorts_correctly(self) -> None:
        steps = eigenvue.steps("bubble-sort", inputs={"array": [3, 1, 2]})
        last_step = steps[-1]
        assert last_step["state"]["array"] == [1, 2, 3]

    def test_quicksort_sorts_correctly(self) -> None:
        steps = eigenvue.steps("quicksort", inputs={"array": [5, 3, 8, 1, 2]})
        last_step = steps[-1]
        assert last_step["state"]["array"] == [1, 2, 3, 5, 8]

    def test_merge_sort_sorts_correctly(self) -> None:
        steps = eigenvue.steps("merge-sort", inputs={"array": [5, 3, 8, 1, 2]})
        last_step = steps[-1]
        assert last_step["state"]["array"] == [1, 2, 3, 5, 8]

    def test_bfs_finds_path(self) -> None:
        steps = eigenvue.steps("bfs")
        last_step = steps[-1]
        # Default has a start and target; if target found, path should exist
        state = last_step["state"]
        if "path" in state and state["path"] is not None:
            assert len(state["path"]) > 0

    def test_dfs_runs(self) -> None:
        steps = eigenvue.steps("dfs")
        assert len(steps) >= 2  # At least initialize + visit

    def test_dijkstra_runs(self) -> None:
        steps = eigenvue.steps("dijkstra")
        assert len(steps) >= 2


class TestGenAIGenerators:
    def test_tokenization_bpe_runs(self) -> None:
        steps = eigenvue.steps("tokenization-bpe")
        _validate_step_sequence(steps)

    def test_token_embeddings_produces_embeddings(self) -> None:
        steps = eigenvue.steps("token-embeddings")
        _validate_step_sequence(steps)
        # Should have show-tokens step
        assert steps[0]["id"] == "show-tokens"

    def test_self_attention_runs(self) -> None:
        steps = eigenvue.steps("self-attention")
        _validate_step_sequence(steps)
        # Should have complete step at end
        assert steps[-1]["id"] == "complete"

    def test_multi_head_attention_runs(self) -> None:
        steps = eigenvue.steps("multi-head-attention")
        _validate_step_sequence(steps)

    def test_transformer_block_runs(self) -> None:
        steps = eigenvue.steps("transformer-block")
        _validate_step_sequence(steps)


class TestDLGenerators:
    def test_perceptron_has_6_steps(self) -> None:
        steps = eigenvue.steps("perceptron")
        _validate_step_sequence(steps)
        assert len(steps) == 6

    def test_feedforward_network_runs(self) -> None:
        steps = eigenvue.steps("feedforward-network")
        _validate_step_sequence(steps)

    def test_backpropagation_runs(self) -> None:
        steps = eigenvue.steps("backpropagation")
        _validate_step_sequence(steps)
        # Must have forward, loss, backward, and update phases
        phases = {s.get("phase") for s in steps}
        assert "forward" in phases
        assert "loss" in phases
        assert "backward" in phases
        assert "update" in phases

    def test_convolution_runs(self) -> None:
        steps = eigenvue.steps("convolution")
        _validate_step_sequence(steps)

    def test_convolution_output_dimensions(self) -> None:
        inp = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
        kernel = [[1, 0], [0, 1]]
        steps = eigenvue.steps("convolution", inputs={"input": inp, "kernel": kernel})
        last_step = steps[-1]
        output = last_step["state"]["outputGrid"]
        assert len(output) == 2  # 3 - 2 + 1 = 2
        assert len(output[0]) == 2

    def test_gradient_descent_sgd(self) -> None:
        steps = eigenvue.steps("gradient-descent", inputs={
            "startX": 4.0, "startY": 2.0,
            "learningRate": 0.1, "optimizer": "sgd", "numSteps": 5,
        })
        _validate_step_sequence(steps)
        # Loss should decrease for convex surface with SGD
        first_loss = steps[0]["state"]["loss"]
        last_loss = steps[-1]["state"]["loss"]
        assert last_loss < first_loss

    def test_gradient_descent_adam(self) -> None:
        steps = eigenvue.steps("gradient-descent", inputs={
            "startX": 4.0, "startY": 2.0,
            "learningRate": 0.1, "optimizer": "adam", "numSteps": 5,
        })
        _validate_step_sequence(steps)

    def test_gradient_descent_momentum(self) -> None:
        steps = eigenvue.steps("gradient-descent", inputs={
            "startX": 4.0, "startY": 2.0,
            "learningRate": 0.1, "optimizer": "momentum", "numSteps": 5,
        })
        _validate_step_sequence(steps)


# ── Determinism test ─────────────────────────────────────────────────────

class TestDeterminism:
    def test_same_inputs_produce_same_steps(self, algorithm_id: str) -> None:
        """Every generator must be deterministic."""
        steps1 = eigenvue.steps(algorithm_id)
        steps2 = eigenvue.steps(algorithm_id)
        assert len(steps1) == len(steps2)
        for i, (s1, s2) in enumerate(zip(steps1, steps2, strict=True)):
            assert s1["id"] == s2["id"], f"Step {i} IDs differ: {s1['id']} vs {s2['id']}"
            assert s1["state"] == s2["state"], f"Step {i} states differ for {algorithm_id}"
