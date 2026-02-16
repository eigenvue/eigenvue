"""
Eigenvue Validation Utilities — Python

Provides two layers of validation for step sequences and algorithm metadata:

1. Schema validation — structural conformance against JSON Schema.
2. Semantic validation — invariants that JSON Schema cannot express.

Usage:
    from shared.validation.validate import validate_step_sequence, validate_meta

    result = validate_step_sequence(parsed_json)
    if not result.valid:
        for error in result.errors:
            print(error)
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import jsonschema
from jsonschema import Draft202012Validator, ValidationError

# ─────────────────────────────────────────────────────────────────────────────
# CONSTANTS
# ─────────────────────────────────────────────────────────────────────────────

_SCHEMA_DIR = Path(__file__).parent.parent
_STEP_FORMAT_SCHEMA_PATH = _SCHEMA_DIR / "step-format.schema.json"
_META_SCHEMA_PATH = _SCHEMA_DIR / "meta.schema.json"

# ─────────────────────────────────────────────────────────────────────────────
# SCHEMA LOADING (loaded once at module import time)
# ─────────────────────────────────────────────────────────────────────────────

def _load_schema(path: Path) -> dict[str, Any]:
    """Load and parse a JSON Schema file.

    Args:
        path: Absolute or relative path to the .schema.json file.

    Returns:
        Parsed JSON Schema as a dict.

    Raises:
        FileNotFoundError: If the schema file does not exist.
        json.JSONDecodeError: If the file is not valid JSON.
    """
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


_STEP_FORMAT_SCHEMA: dict[str, Any] = _load_schema(_STEP_FORMAT_SCHEMA_PATH)
_META_SCHEMA: dict[str, Any] = _load_schema(_META_SCHEMA_PATH)

# Pre-compile validators for performance (schema is checked once, reused).
_step_format_validator = Draft202012Validator(_STEP_FORMAT_SCHEMA, format_checker=jsonschema.FormatChecker())
_meta_validator = Draft202012Validator(_META_SCHEMA, format_checker=jsonschema.FormatChecker())

# ─────────────────────────────────────────────────────────────────────────────
# RESULT TYPE
# ─────────────────────────────────────────────────────────────────────────────

@dataclass(frozen=True, slots=True)
class ValidationResult:
    """Result of a validation operation.

    Attributes:
        valid: True if the input passed all checks.
        errors: List of human-readable error messages. Empty if valid is True.
    """
    valid: bool
    errors: tuple[str, ...] = field(default_factory=tuple)


# ─────────────────────────────────────────────────────────────────────────────
# STEP SEQUENCE VALIDATION
# ─────────────────────────────────────────────────────────────────────────────

# Floating-point tolerance for attention weight sums and individual weights.
_FLOAT_TOLERANCE = 1e-6


def validate_step_sequence(data: Any) -> ValidationResult:
    """Validate a step sequence against JSON Schema and semantic invariants.

    Checks performed:
    - JSON Schema structural validation (fields, types, patterns).
    - Index contiguity: steps[i]["index"] == i for all i.
    - Terminal step: exactly one, and it is the last step.
    - Attention weights sum to 1.0 (±1e-6) and each weight is in [0, 1].
    - HighlightRange/DimRange: from <= to.
    - CompareElements result is one of "less", "greater", "equal".
    - UpdateBarChart labels length matches values length.

    Args:
        data: A parsed JSON object (dict) to validate.

    Returns:
        ValidationResult with valid=True if all checks pass,
        or valid=False with a list of all errors found.
    """
    errors: list[str] = []

    # ── Layer 1: JSON Schema ──

    schema_errors = list(_step_format_validator.iter_errors(data))
    if schema_errors:
        for err in schema_errors:
            path = "/".join(str(p) for p in err.absolute_path) or "/"
            errors.append(f"Schema ({err.validator}): /{path} {err.message}")
        # Schema failures may make semantic checks unsafe — return early.
        return ValidationResult(valid=False, errors=tuple(errors))

    # ── Layer 2: Semantic validation ──

    steps: list[dict[str, Any]] = data["steps"]

    # 2a. Index contiguity
    for i, step in enumerate(steps):
        if step["index"] != i:
            errors.append(
                f"Semantic: steps[{i}].index is {step['index']}, expected {i}. "
                f"Step indices must be contiguous and 0-based."
            )

    # 2b. Terminal step — exactly one, at the end
    terminal_indices = [i for i, s in enumerate(steps) if s["isTerminal"]]

    if len(terminal_indices) == 0:
        errors.append(
            "Semantic: No step has isTerminal=true. The last step must be terminal."
        )
    elif len(terminal_indices) > 1:
        errors.append(
            f"Semantic: Multiple steps have isTerminal=true at indices "
            f"{terminal_indices}. Only the last step may be terminal."
        )
    elif terminal_indices[0] != len(steps) - 1:
        errors.append(
            f"Semantic: isTerminal=true is at index {terminal_indices[0]}, "
            f"but the last step is at index {len(steps) - 1}. "
            f"Only the last step may be terminal."
        )

    # 2c. Attention weights: sum to 1.0 ±1e-6, each in [0, 1]
    for i, step in enumerate(steps):
        for j, action in enumerate(step["visualActions"]):
            if action["type"] == "showAttentionWeights":
                weights = action.get("weights", [])
                if isinstance(weights, list) and len(weights) > 0:
                    weight_sum = math.fsum(weights)  # fsum for maximum precision
                    if abs(weight_sum - 1.0) > _FLOAT_TOLERANCE:
                        errors.append(
                            f"Semantic: steps[{i}].visualActions[{j}] "
                            f"(showAttentionWeights) weights sum to {weight_sum}, "
                            f"expected 1.0 (tolerance ±{_FLOAT_TOLERANCE}). "
                            f"This indicates a mathematical error in the softmax computation."
                        )
                    for k, w in enumerate(weights):
                        if w < -_FLOAT_TOLERANCE or w > 1.0 + _FLOAT_TOLERANCE:
                            errors.append(
                                f"Semantic: steps[{i}].visualActions[{j}] "
                                f"(showAttentionWeights) weights[{k}] = {w}, "
                                f"expected value in [0, 1]."
                            )

    # 2d. HighlightRange / DimRange: from <= to
    for i, step in enumerate(steps):
        for j, action in enumerate(step["visualActions"]):
            if action["type"] in ("highlightRange", "dimRange"):
                from_val = action.get("from")
                to_val = action.get("to")
                if (
                    from_val is not None
                    and to_val is not None
                    and from_val > to_val
                ):
                    errors.append(
                        f"Semantic: steps[{i}].visualActions[{j}] ({action['type']}) "
                        f"has from={from_val} > to={to_val}. 'from' must be <= 'to'."
                    )

    # 2e. CompareElements result
    for i, step in enumerate(steps):
        for j, action in enumerate(step["visualActions"]):
            if action["type"] == "compareElements":
                result = action.get("result")
                if result not in ("less", "greater", "equal"):
                    errors.append(
                        f"Semantic: steps[{i}].visualActions[{j}] (compareElements) "
                        f'result="{result}", expected "less" | "greater" | "equal".'
                    )

    # 2f. UpdateBarChart labels/values length match
    for i, step in enumerate(steps):
        for j, action in enumerate(step["visualActions"]):
            if action["type"] == "updateBarChart":
                values = action.get("values", [])
                labels = action.get("labels")
                if labels is not None and len(values) != len(labels):
                    errors.append(
                        f"Semantic: steps[{i}].visualActions[{j}] (updateBarChart) "
                        f"has {len(values)} values but {len(labels)} labels. "
                        f"If labels are provided, their count must match values."
                    )

    return ValidationResult(valid=len(errors) == 0, errors=tuple(errors))


# ─────────────────────────────────────────────────────────────────────────────
# ALGORITHM METADATA VALIDATION
# ─────────────────────────────────────────────────────────────────────────────

def validate_meta(data: Any) -> ValidationResult:
    """Validate an algorithm's meta.json against JSON Schema and semantic invariants.

    Checks performed:
    - JSON Schema structural validation.
    - Quiz correctIndex within options bounds.
    - defaultLanguage exists in implementations.

    Args:
        data: A parsed JSON object (dict) to validate.

    Returns:
        ValidationResult with valid=True if all checks pass.
    """
    errors: list[str] = []

    # ── Layer 1: JSON Schema ──

    schema_errors = list(_meta_validator.iter_errors(data))
    if schema_errors:
        for err in schema_errors:
            path = "/".join(str(p) for p in err.absolute_path) or "/"
            errors.append(f"Schema ({err.validator}): /{path} {err.message}")
        return ValidationResult(valid=False, errors=tuple(errors))

    # ── Layer 2: Semantic validation ──

    # 2a. Quiz correctIndex within bounds
    for i, q in enumerate(data["education"]["quiz"]):
        options = q["options"]
        correct_index = q["correctIndex"]
        if correct_index < 0 or correct_index >= len(options):
            errors.append(
                f"Semantic: education.quiz[{i}].correctIndex is {correct_index}, "
                f"but options has {len(options)} items. "
                f"Must be in [0, {len(options) - 1}]."
            )

    # 2b. defaultLanguage must be a key in implementations
    default_lang = data["code"]["defaultLanguage"]
    implementations = data["code"]["implementations"]
    if default_lang not in implementations:
        errors.append(
            f'Semantic: code.defaultLanguage is "{default_lang}" '
            f"but it is not a key in code.implementations. "
            f"Available: [{', '.join(implementations.keys())}]."
        )

    return ValidationResult(valid=len(errors) == 0, errors=tuple(errors))
