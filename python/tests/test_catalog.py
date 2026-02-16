"""Tests for the algorithm catalog and metadata loading."""

from __future__ import annotations

from eigenvue.catalog import (
    AlgorithmInfo,
    get_algorithm_meta,
    get_default_inputs,
    list_algorithms,
)


class TestListAlgorithms:
    def test_returns_17_algorithms(self) -> None:
        result = list_algorithms()
        assert len(result) == 17

    def test_sorted_by_category_then_name(self) -> None:
        result = list_algorithms()
        keys = [(a.category, a.name) for a in result]
        assert keys == sorted(keys)

    def test_returns_copies(self) -> None:
        r1 = list_algorithms()
        r2 = list_algorithms()
        assert r1 is not r2

    def test_all_categories_present(self) -> None:
        result = list_algorithms()
        categories = {a.category for a in result}
        assert "classical" in categories
        assert "deep-learning" in categories
        assert "generative-ai" in categories


class TestGetAlgorithmMeta:
    def test_returns_dict(self) -> None:
        meta = get_algorithm_meta("binary-search")
        assert isinstance(meta, dict)

    def test_has_required_fields(self) -> None:
        meta = get_algorithm_meta("binary-search")
        assert "id" in meta
        assert "name" in meta
        assert "category" in meta
        assert "inputs" in meta
        assert "defaults" in meta["inputs"]

    def test_unknown_algorithm_raises(self) -> None:
        import pytest

        with pytest.raises(ValueError, match="Unknown algorithm"):
            get_algorithm_meta("nonexistent")


class TestGetDefaultInputs:
    def test_returns_dict(self, algorithm_id: str) -> None:
        defaults = get_default_inputs(algorithm_id)
        assert isinstance(defaults, dict)
        assert len(defaults) > 0

    def test_binary_search_defaults(self) -> None:
        defaults = get_default_inputs("binary-search")
        assert "array" in defaults
        assert "target" in defaults
        assert isinstance(defaults["array"], list)

    def test_self_attention_defaults(self) -> None:
        defaults = get_default_inputs("self-attention")
        assert "tokens" in defaults
        assert "embeddingDim" in defaults


class TestAlgorithmInfo:
    def test_frozen(self) -> None:
        import pytest

        info = AlgorithmInfo(
            id="test", name="Test", category="classical",
            description="Test algorithm", difficulty="beginner",
            time_complexity="O(n)", space_complexity="O(1)",
        )
        with pytest.raises(AttributeError):
            info.id = "changed"  # type: ignore[misc]

    def test_repr(self) -> None:
        info = AlgorithmInfo(
            id="test", name="Test", category="classical",
            description="Test algorithm", difficulty="beginner",
            time_complexity="O(n)", space_complexity="O(1)",
        )
        r = repr(info)
        assert "test" in r
        assert "Test" in r
        assert "classical" in r
