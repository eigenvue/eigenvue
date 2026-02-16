"""Tests for the eigenvue public API."""

from __future__ import annotations

import eigenvue
from eigenvue.catalog import AlgorithmInfo


class TestVersion:
    def test_version_is_string(self) -> None:
        assert isinstance(eigenvue.__version__, str)

    def test_version_format(self) -> None:
        parts = eigenvue.__version__.split(".")
        assert len(parts) == 3
        assert all(p.isdigit() for p in parts)


class TestList:
    def test_list_returns_list(self) -> None:
        result = eigenvue.list()
        assert isinstance(result, list)

    def test_list_has_22_algorithms(self) -> None:
        result = eigenvue.list()
        assert len(result) == 22

    def test_list_returns_algorithm_info(self) -> None:
        result = eigenvue.list()
        for item in result:
            assert isinstance(item, AlgorithmInfo)

    def test_list_filter_classical(self) -> None:
        result = eigenvue.list(category="classical")
        assert len(result) == 7
        assert all(a.category == "classical" for a in result)

    def test_list_filter_generative_ai(self) -> None:
        result = eigenvue.list(category="generative-ai")
        assert len(result) == 5
        assert all(a.category == "generative-ai" for a in result)

    def test_list_filter_deep_learning(self) -> None:
        result = eigenvue.list(category="deep-learning")
        assert len(result) == 5
        assert all(a.category == "deep-learning" for a in result)

    def test_list_invalid_category_raises(self) -> None:
        import pytest

        with pytest.raises(ValueError, match="Invalid category"):
            eigenvue.list(category="nonexistent")

    def test_algorithm_info_fields(self) -> None:
        result = eigenvue.list()
        for algo in result:
            assert algo.id
            assert algo.name
            assert algo.category in {"classical", "deep-learning", "generative-ai", "quantum"}
            assert algo.description
            assert algo.difficulty in {"beginner", "intermediate", "advanced", "expert"}
            assert algo.time_complexity
            assert algo.space_complexity


class TestSteps:
    def test_steps_returns_list(self) -> None:
        result = eigenvue.steps("binary-search")
        assert isinstance(result, list)
        assert len(result) > 0

    def test_steps_are_dicts(self) -> None:
        result = eigenvue.steps("binary-search")
        for step in result:
            assert isinstance(step, dict)

    def test_steps_have_required_keys(self) -> None:
        result = eigenvue.steps("binary-search")
        required_keys = {
            "index",
            "id",
            "title",
            "explanation",
            "state",
            "visualActions",
            "codeHighlight",
            "isTerminal",
        }
        for step in result:
            assert required_keys.issubset(step.keys()), (
                f"Missing keys: {required_keys - step.keys()}"
            )

    def test_steps_unknown_algorithm_raises(self) -> None:
        import pytest

        with pytest.raises(ValueError):
            eigenvue.steps("nonexistent-algorithm")
