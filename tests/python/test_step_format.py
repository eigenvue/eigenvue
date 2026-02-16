"""
Unit tests for the Eigenvue step format — Python types and validation.

Test groups:
1. Dataclass construction and validation.
2. Serialization round-trips (to_dict / from_dict).
3. Schema + semantic validation on golden fixtures.
4. Edge case rejection.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import pytest

from shared.types.step import (
    STEP_FORMAT_VERSION,
    CodeHighlight,
    VisualAction,
    Step,
    StepSequence,
    QuizQuestion,
    _snake_to_camel,
    _camel_to_snake,
)
from shared.validation.validate import validate_step_sequence, validate_meta

# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

FIXTURES_DIR = Path(__file__).parent.parent.parent / "shared" / "fixtures"


def load_fixture(name: str) -> dict:
    """Load a JSON fixture file."""
    with open(FIXTURES_DIR / name, "r", encoding="utf-8") as f:
        return json.load(f)


# ─────────────────────────────────────────────────────────────────────────────
# 1. VERSION CONSTANT
# ─────────────────────────────────────────────────────────────────────────────


def test_step_format_version():
    """Version constant must be 1."""
    assert STEP_FORMAT_VERSION == 1


# ─────────────────────────────────────────────────────────────────────────────
# 2. NAMING CONVENTION UTILITIES
# ─────────────────────────────────────────────────────────────────────────────


class TestSnakeToCamel:
    def test_single_word(self):
        assert _snake_to_camel("id") == "id"

    def test_two_words(self):
        assert _snake_to_camel("is_terminal") == "isTerminal"

    def test_three_words(self):
        assert _snake_to_camel("visual_actions_list") == "visualActionsList"

    def test_already_camel(self):
        # Single word, no underscores — should pass through.
        assert _snake_to_camel("index") == "index"


class TestCamelToSnake:
    def test_single_word(self):
        assert _camel_to_snake("id") == "id"

    def test_two_words(self):
        assert _camel_to_snake("isTerminal") == "is_terminal"

    def test_three_words(self):
        assert _camel_to_snake("visualActionsList") == "visual_actions_list"


# ─────────────────────────────────────────────────────────────────────────────
# 3. DATACLASS CONSTRUCTION
# ─────────────────────────────────────────────────────────────────────────────


class TestCodeHighlight:
    def test_valid_construction(self):
        ch = CodeHighlight(language="pseudocode", lines=(1, 2, 3))
        assert ch.language == "pseudocode"
        assert ch.lines == (1, 2, 3)

    def test_empty_language_raises(self):
        with pytest.raises(ValueError, match="non-empty string"):
            CodeHighlight(language="", lines=(1,))

    def test_empty_lines_raises(self):
        with pytest.raises(ValueError, match="non-empty sequence"):
            CodeHighlight(language="python", lines=())

    def test_zero_line_number_raises(self):
        with pytest.raises(ValueError, match="positive integers"):
            CodeHighlight(language="python", lines=(0,))

    def test_negative_line_number_raises(self):
        with pytest.raises(ValueError, match="positive integers"):
            CodeHighlight(language="python", lines=(-1,))

    def test_round_trip(self):
        original = CodeHighlight(language="python", lines=(5, 6))
        reconstructed = CodeHighlight.from_dict(original.to_dict())
        assert reconstructed == original


class TestVisualAction:
    def test_valid_construction(self):
        action = VisualAction(type="highlightElement", params={"index": 3, "color": "highlight"})
        assert action.type == "highlightElement"
        assert action.params["index"] == 3

    def test_empty_type_raises(self):
        with pytest.raises(ValueError, match="non-empty string"):
            VisualAction(type="")

    def test_round_trip(self):
        original = VisualAction(type="movePointer", params={"id": "left", "to": 0})
        d = original.to_dict()
        assert d == {"type": "movePointer", "id": "left", "to": 0}
        reconstructed = VisualAction.from_dict(d)
        assert reconstructed == original


class TestStep:
    def _make_step(self, **overrides) -> Step:
        defaults = {
            "index": 0,
            "id": "test-step",
            "title": "Test Step",
            "explanation": "A test step.",
            "state": {"x": 1},
            "visual_actions": (),
            "code_highlight": CodeHighlight(language="pseudocode", lines=(1,)),
            "is_terminal": True,
        }
        defaults.update(overrides)
        return Step(**defaults)

    def test_valid_construction(self):
        step = self._make_step()
        assert step.index == 0
        assert step.is_terminal is True

    def test_negative_index_raises(self):
        with pytest.raises(ValueError, match="non-negative integer"):
            self._make_step(index=-1)

    def test_invalid_id_raises(self):
        with pytest.raises(ValueError, match="must match"):
            self._make_step(id="Invalid ID!")

    def test_empty_title_raises(self):
        with pytest.raises(ValueError, match="non-empty string"):
            self._make_step(title="")

    def test_empty_explanation_raises(self):
        with pytest.raises(ValueError, match="non-empty string"):
            self._make_step(explanation="")

    def test_round_trip(self):
        original = self._make_step(
            visual_actions=(
                VisualAction(type="highlightElement", params={"index": 0}),
            ),
            phase="search",
        )
        d = original.to_dict()
        reconstructed = Step.from_dict(d)
        assert reconstructed.index == original.index
        assert reconstructed.id == original.id
        assert reconstructed.phase == original.phase
        assert len(reconstructed.visual_actions) == 1
        assert reconstructed.visual_actions[0].type == "highlightElement"


class TestStepSequence:
    def _make_step(self, index: int, is_terminal: bool) -> Step:
        return Step(
            index=index,
            id=f"step-{index}",
            title=f"Step {index}",
            explanation=f"Explanation for step {index}.",
            state={"i": index},
            visual_actions=(),
            code_highlight=CodeHighlight(language="pseudocode", lines=(index + 1,)),
            is_terminal=is_terminal,
        )

    def test_valid_single_step(self):
        seq = StepSequence(
            format_version=1,
            algorithm_id="test",
            inputs={},
            steps=(self._make_step(0, True),),
            generated_at="2026-02-14T00:00:00.000Z",
            generated_by="python",
        )
        assert len(seq.steps) == 1

    def test_valid_multi_step(self):
        seq = StepSequence(
            format_version=1,
            algorithm_id="test",
            inputs={},
            steps=(
                self._make_step(0, False),
                self._make_step(1, False),
                self._make_step(2, True),
            ),
            generated_at="2026-02-14T00:00:00.000Z",
            generated_by="python",
        )
        assert len(seq.steps) == 3

    def test_wrong_version_raises(self):
        with pytest.raises(ValueError, match="format_version"):
            StepSequence(
                format_version=99,
                algorithm_id="test",
                inputs={},
                steps=(self._make_step(0, True),),
                generated_at="2026-02-14T00:00:00.000Z",
                generated_by="python",
            )

    def test_empty_steps_raises(self):
        with pytest.raises(ValueError, match="at least one step"):
            StepSequence(
                format_version=1,
                algorithm_id="test",
                inputs={},
                steps=(),
                generated_at="2026-02-14T00:00:00.000Z",
                generated_by="python",
            )

    def test_index_mismatch_raises(self):
        bad_step = Step(
            index=5,  # Should be 0
            id="step-0", title="T", explanation="E",
            state={}, visual_actions=(),
            code_highlight=CodeHighlight(language="pseudocode", lines=(1,)),
            is_terminal=True,
        )
        with pytest.raises(ValueError, match="position 0 has index=5"):
            StepSequence(
                format_version=1, algorithm_id="test", inputs={},
                steps=(bad_step,),
                generated_at="2026-02-14T00:00:00.000Z", generated_by="python",
            )

    def test_no_terminal_raises(self):
        with pytest.raises(ValueError, match="is_terminal=True"):
            StepSequence(
                format_version=1, algorithm_id="test", inputs={},
                steps=(self._make_step(0, False),),
                generated_at="2026-02-14T00:00:00.000Z", generated_by="python",
            )

    def test_premature_terminal_raises(self):
        with pytest.raises(ValueError, match="not the last step"):
            StepSequence(
                format_version=1, algorithm_id="test", inputs={},
                steps=(self._make_step(0, True), self._make_step(1, True)),
                generated_at="2026-02-14T00:00:00.000Z", generated_by="python",
            )

    def test_round_trip(self):
        seq = StepSequence(
            format_version=1,
            algorithm_id="binary-search",
            inputs={"array": [1, 2, 3], "target": 2},
            steps=(
                self._make_step(0, False),
                self._make_step(1, True),
            ),
            generated_at="2026-02-14T00:00:00.000Z",
            generated_by="python",
        )
        d = seq.to_dict()
        reconstructed = StepSequence.from_dict(d)
        assert reconstructed.algorithm_id == seq.algorithm_id
        assert len(reconstructed.steps) == 2


class TestQuizQuestion:
    def test_valid(self):
        q = QuizQuestion(
            question="What is O(log n)?",
            options=("Linear", "Logarithmic", "Constant"),
            correct_index=1,
            explanation="Logarithmic growth.",
        )
        assert q.correct_index == 1

    def test_too_few_options_raises(self):
        with pytest.raises(ValueError, match="at least 2"):
            QuizQuestion(
                question="Q", options=("Only one",),
                correct_index=0, explanation="E",
            )

    def test_out_of_bounds_index_raises(self):
        with pytest.raises(ValueError, match="range"):
            QuizQuestion(
                question="Q", options=("A", "B"),
                correct_index=5, explanation="E",
            )

    def test_negative_index_raises(self):
        with pytest.raises(ValueError, match="range"):
            QuizQuestion(
                question="Q", options=("A", "B"),
                correct_index=-1, explanation="E",
            )


# ─────────────────────────────────────────────────────────────────────────────
# 4. VALIDATION: GOLDEN FIXTURES
# ─────────────────────────────────────────────────────────────────────────────


VALID_FIXTURES = [
    "binary-search-found.fixture.json",
    "binary-search-not-found.fixture.json",
    "single-element.fixture.json",
    "minimal-valid.fixture.json",
]


@pytest.mark.parametrize("fixture_name", VALID_FIXTURES)
def test_valid_fixtures_pass_validation(fixture_name: str):
    """All golden fixtures must pass both schema and semantic validation."""
    data = load_fixture(fixture_name)
    result = validate_step_sequence(data)
    assert result.valid, f"Expected valid but got errors: {result.errors}"
    assert len(result.errors) == 0


# ─────────────────────────────────────────────────────────────────────────────
# 5. VALIDATION: EDGE CASES (must fail)
# ─────────────────────────────────────────────────────────────────────────────


def _load_edge_cases():
    raw = load_fixture("edge-cases.fixture.json")
    return raw["cases"]


@pytest.mark.parametrize("case", _load_edge_cases(), ids=lambda c: c["name"])
def test_edge_cases_are_rejected(case):
    """All edge cases must be rejected with errors matching expected substrings."""
    result = validate_step_sequence(case["data"])
    assert not result.valid, f"Expected invalid but validation passed for {case['name']}"
    assert len(result.errors) > 0

    for substring in case["expectedErrorSubstrings"]:
        found = any(substring.lower() in err.lower() for err in result.errors)
        assert found, (
            f"Expected error containing '{substring}' for case '{case['name']}', "
            f"but errors were: {result.errors}"
        )


# ─────────────────────────────────────────────────────────────────────────────
# 6. ATTENTION WEIGHTS PRECISION
# ─────────────────────────────────────────────────────────────────────────────


def test_attention_weights_exact():
    """Weights summing to exactly 1.0 should pass."""
    data = load_fixture("minimal-valid.fixture.json")
    # Inject an attention action into the single step.
    data["steps"][0]["visualActions"] = [
        {"type": "showAttentionWeights", "queryIdx": 0, "weights": [0.25, 0.25, 0.25, 0.25]}
    ]
    result = validate_step_sequence(data)
    assert result.valid, f"Errors: {result.errors}"


def test_attention_weights_ieee754_tolerance():
    """Weights that sum to slightly more than 1.0 should pass within tolerance."""
    # Construct weights whose math.fsum is definitively != 1.0 but within
    # the validator's ±1e-6 tolerance. A deviation of 1e-10 is well above
    # 1 ULP at 1.0 (~2.2e-16), so math.fsum preserves it reliably.
    weights = [0.5, 0.5 + 1e-10]
    total = math.fsum(weights)
    assert total != 1.0, "Sanity check: sum should deviate from 1.0"
    assert abs(total - 1.0) < 1e-6, "But it should be within tolerance"

    data = load_fixture("minimal-valid.fixture.json")
    data["steps"][0]["visualActions"] = [
        {"type": "showAttentionWeights", "queryIdx": 0, "weights": weights}
    ]
    result = validate_step_sequence(data)
    assert result.valid, f"Errors: {result.errors}"


def test_attention_weights_rejected_when_off():
    """Weights summing to 0.9 should be rejected."""
    data = load_fixture("minimal-valid.fixture.json")
    data["steps"][0]["visualActions"] = [
        {"type": "showAttentionWeights", "queryIdx": 0, "weights": [0.5, 0.3, 0.1]}
    ]
    result = validate_step_sequence(data)
    assert not result.valid
    assert any("weights sum to" in err for err in result.errors)
