"""
Tests for the sync-generators.py comparison engine.

These tests verify the deep comparison logic independently of actual
generators, ensuring the sync script correctly detects (and tolerates)
various types of differences.

Author: Ashutosh Mishra
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(PROJECT_ROOT / "scripts"))

# Import comparison functions directly from the sync script.
# The sync-generators.py filename uses hyphens, so we import
# it as a module by manipulating the filename on sys.path.
# The scripts/ directory is already on sys.path above.
import importlib.util

_spec = importlib.util.spec_from_file_location(
    "sync_generators",
    str(PROJECT_ROOT / "scripts" / "sync-generators.py"),
)
_mod = importlib.util.module_from_spec(_spec)  # type: ignore[arg-type]
_spec.loader.exec_module(_mod)  # type: ignore[union-attr]
compare_values = _mod.compare_values
compare_step_sequences = _mod.compare_step_sequences


class TestCompareValues:
    """Unit tests for the deep comparison engine."""

    def test_identical_numbers(self) -> None:
        """Identical numbers produce no errors."""
        errors = compare_values(42, 42, 1e-9, "test")
        assert errors == []

    def test_float_within_tolerance(self) -> None:
        """Floats within tolerance produce no errors."""
        errors = compare_values(1.0000000001, 1.0, 1e-9, "test")
        assert errors == []

    def test_float_outside_tolerance(self) -> None:
        """Floats outside tolerance produce an error."""
        errors = compare_values(1.001, 1.0, 1e-9, "test")
        assert len(errors) == 1
        assert "numeric mismatch" in errors[0]

    def test_int_float_interchangeable(self) -> None:
        """int 5 and float 5.0 are considered equal."""
        errors = compare_values(5, 5.0, 1e-9, "test")
        assert errors == []

    def test_nan_equals_nan(self) -> None:
        """NaN is considered equal to NaN for comparison purposes."""
        errors = compare_values(float("nan"), float("nan"), 1e-9, "test")
        assert errors == []

    def test_string_exact_match(self) -> None:
        """Identical strings produce no errors."""
        errors = compare_values("hello", "hello", 1e-9, "test")
        assert errors == []

    def test_string_mismatch(self) -> None:
        """Different strings produce an error."""
        errors = compare_values("hello", "world", 1e-9, "test")
        assert len(errors) == 1
        assert "string mismatch" in errors[0]

    def test_nested_object_comparison(self) -> None:
        """Deep nested objects are compared correctly."""
        a = {"state": {"array": [1, 2, 3], "left": 0, "right": 2}}
        b = {"state": {"array": [1, 2, 3], "left": 0, "right": 2}}
        errors = compare_values(a, b, 1e-9, "root")
        assert errors == []

    def test_nested_object_deep_mismatch(self) -> None:
        """Mismatches deep in nested objects are reported with full path."""
        a = {"state": {"array": [1, 2, 3]}}
        b = {"state": {"array": [1, 2, 4]}}
        errors = compare_values(a, b, 1e-9, "root")
        assert len(errors) == 1
        assert "root.state.array[2]" in errors[0]

    def test_array_length_mismatch(self) -> None:
        """Different-length arrays produce an error."""
        errors = compare_values([1, 2], [1, 2, 3], 1e-9, "test")
        assert len(errors) == 1
        assert "array length" in errors[0]

    def test_missing_key_in_object(self) -> None:
        """Missing keys in objects produce an error."""
        a = {"x": 1, "y": 2}
        b = {"x": 1}
        errors = compare_values(a, b, 1e-9, "test")
        assert len(errors) == 1
        assert "present in TS but missing in PY" in errors[0]

    def test_extra_key_in_object(self) -> None:
        """Extra keys in the Python output produce an error."""
        a = {"x": 1}
        b = {"x": 1, "y": 2}
        errors = compare_values(a, b, 1e-9, "test")
        assert len(errors) == 1
        assert "present in PY but missing in TS" in errors[0]

    def test_none_equality(self) -> None:
        """None values are considered equal."""
        errors = compare_values(None, None, 1e-9, "test")
        assert errors == []

    def test_bool_comparison(self) -> None:
        """Boolean values are compared exactly."""
        errors = compare_values(True, True, 1e-9, "test")
        assert errors == []
        errors = compare_values(True, False, 1e-9, "test")
        assert len(errors) == 1
        assert "bool mismatch" in errors[0]


class TestCompareStepSequences:
    """Tests for full step sequence comparison."""

    def test_identical_sequences(self) -> None:
        """Identical step sequences produce no errors."""
        steps = [
            {
                "id": "init",
                "state": {"x": 1},
                "visualActions": [{"type": "highlight", "index": 0}],
                "isTerminal": False,
                "codeHighlight": {"language": "python", "lines": [1, 2]},
            },
            {
                "id": "done",
                "state": {"x": 2},
                "visualActions": [],
                "isTerminal": True,
                "codeHighlight": {"language": "python", "lines": [5]},
            },
        ]
        errors = compare_step_sequences(steps, steps, 1e-9)
        assert errors == []

    def test_step_count_mismatch(self) -> None:
        """Different step counts produce an error."""
        ts = [{"id": "a", "state": {}, "visualActions": [], "isTerminal": True}]
        py = [
            {"id": "a", "state": {}, "visualActions": [], "isTerminal": False},
            {"id": "b", "state": {}, "visualActions": [], "isTerminal": True},
        ]
        errors = compare_step_sequences(ts, py, 1e-9)
        assert any("Step count" in e for e in errors)

    def test_step_id_mismatch(self) -> None:
        """Different step IDs produce an error."""
        ts = [{"id": "init", "state": {}, "visualActions": [], "isTerminal": True}]
        py = [{"id": "start", "state": {}, "visualActions": [], "isTerminal": True}]
        errors = compare_step_sequences(ts, py, 1e-9)
        assert any("steps[0].id" in e for e in errors)

    def test_is_terminal_mismatch(self) -> None:
        """Mismatched isTerminal flags produce an error."""
        ts = [{"id": "a", "state": {}, "visualActions": [], "isTerminal": True}]
        py = [{"id": "a", "state": {}, "visualActions": [], "isTerminal": False}]
        errors = compare_step_sequences(ts, py, 1e-9)
        assert any("isTerminal" in e for e in errors)
