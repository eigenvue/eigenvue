"""
Eigenvue Step Format — Python Definitions

This module defines the universal contract between algorithm generators
and the rendering engine, mirrored from the TypeScript definitions in step.ts.

VERSION: 1.0.0

RULES:
- All types must be JSON-serializable (no lambdas, no classes with methods, no circular refs).
- Field names use snake_case in Python. The JSON wire format uses camelCase.
  Conversion functions are provided: to_dict() → camelCase JSON, from_dict() → snake_case Python.
- Visual action types are an open string vocabulary, NOT a closed set.
- Step indices are 0-based and contiguous (no gaps).
- The last step in any sequence MUST have is_terminal == True.

MATHEMATICAL INVARIANTS:
- ShowAttentionWeightsAction.weights MUST sum to 1.0 within ±1e-6 tolerance.
- QuizQuestion.correct_index MUST satisfy: 0 <= correct_index < len(options).
- Step.index MUST equal its position in the step list: steps[i].index == i.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field, asdict
from typing import Any, Literal

# ─────────────────────────────────────────────────────────────────────────────
# COMPLEX NUMBER TYPE (Phase 14 — Quantum)
# ─────────────────────────────────────────────────────────────────────────────

# A complex number is represented as a tuple of (real, imaginary).
# This matches the TypeScript Complex type: [number, number].
# PARITY CRITICAL: Both languages use [real, imaginary] tuples.
Complex = tuple[float, float]
"""Complex number as (real, imaginary) tuple, matching TypeScript [number, number]."""

# ─────────────────────────────────────────────────────────────────────────────
# QUANTUM VISUAL ACTION TYPES (Phase 14)
# ─────────────────────────────────────────────────────────────────────────────
# Quantum visual actions use the existing VisualAction(type=..., params={...})
# pattern. The type strings are camelCase for JSON wire format parity:
#
#   "applyGate"          — Apply a quantum gate. params: gate, qubits, angle?
#   "showStateVector"    — Show state vector. params: amplitudes, numQubits
#   "rotateBlochSphere"  — Show Bloch sphere point. params: theta, phi, label?
#   "showProbabilities"  — Show probabilities. params: probabilities, labels
#   "collapseState"      — Collapse on measurement. params: qubit, result, probability
#   "showEntanglement"   — Show entanglement. params: qubit1, qubit2, bellState?
#   "highlightQubitWire" — Highlight wire. params: qubitIndex, color?
#   "showClassicalBits"  — Show classical bits. params: bits
#   "showGateMatrix"     — Show gate matrix. params: gate, matrix
#
# Example usage in Python generators:
#   VisualAction(type="applyGate", params={"gate": "H", "qubits": [0]})
#   VisualAction(type="showStateVector", params={
#       "amplitudes": [[0.707, 0.0], [0.707, 0.0]],
#       "numQubits": 1,
#   })

# ─────────────────────────────────────────────────────────────────────────────
# STEP FORMAT VERSION
# ─────────────────────────────────────────────────────────────────────────────

STEP_FORMAT_VERSION: int = 1
"""
The current major version of the step format.
Increment this ONLY when making breaking changes to the Step dataclass.
"""

# ─────────────────────────────────────────────────────────────────────────────
# NAMING CONVENTION UTILITIES
# ─────────────────────────────────────────────────────────────────────────────

def _snake_to_camel(name: str) -> str:
    """Convert a snake_case name to camelCase.

    This is used when serializing Python dataclasses to the JSON wire format,
    which uses camelCase to match the TypeScript definitions.

    Args:
        name: A snake_case identifier (e.g., "is_terminal", "visual_actions").

    Returns:
        The camelCase equivalent (e.g., "isTerminal", "visualActions").

    Examples:
        >>> _snake_to_camel("is_terminal")
        'isTerminal'
        >>> _snake_to_camel("visual_actions")
        'visualActions'
        >>> _snake_to_camel("id")
        'id'
        >>> _snake_to_camel("format_version")
        'formatVersion'
    """
    components = name.split("_")
    return components[0] + "".join(x.title() for x in components[1:])


def _camel_to_snake(name: str) -> str:
    """Convert a camelCase name to snake_case.

    This is used when deserializing JSON (camelCase) into Python dataclasses
    (snake_case).

    Args:
        name: A camelCase identifier (e.g., "isTerminal", "visualActions").

    Returns:
        The snake_case equivalent (e.g., "is_terminal", "visual_actions").

    Examples:
        >>> _camel_to_snake("isTerminal")
        'is_terminal'
        >>> _camel_to_snake("visualActions")
        'visual_actions'
        >>> _camel_to_snake("id")
        'id'
        >>> _camel_to_snake("formatVersion")
        'format_version'
    """
    # Insert underscore before each uppercase letter, then lowercase everything.
    result = re.sub(r"([A-Z])", r"_\1", name)
    return result.lower().lstrip("_")


def _convert_keys_to_camel(obj: Any) -> Any:
    """Recursively convert all dict keys from snake_case to camelCase.

    Handles nested dicts and lists. Non-dict/list values pass through unchanged.

    Args:
        obj: Any JSON-serializable value.

    Returns:
        The same structure with all dict keys converted to camelCase.
    """
    if isinstance(obj, dict):
        return {_snake_to_camel(k): _convert_keys_to_camel(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_convert_keys_to_camel(item) for item in obj]
    return obj


def _convert_keys_to_snake(obj: Any) -> Any:
    """Recursively convert all dict keys from camelCase to snake_case.

    Handles nested dicts and lists. Non-dict/list values pass through unchanged.

    Args:
        obj: Any JSON-serializable value.

    Returns:
        The same structure with all dict keys converted to snake_case.
    """
    if isinstance(obj, dict):
        return {_camel_to_snake(k): _convert_keys_to_snake(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_convert_keys_to_snake(item) for item in obj]
    return obj


# ─────────────────────────────────────────────────────────────────────────────
# CODE HIGHLIGHT
# ─────────────────────────────────────────────────────────────────────────────

@dataclass(frozen=True, slots=True)
class CodeHighlight:
    """Identifies which lines of source code correspond to the current step.

    Attributes:
        language: Which language tab to highlight (e.g., "pseudocode", "python").
        lines: 1-indexed line numbers to highlight. Must be non-empty.
                All values must be positive integers (>= 1).
    """

    language: str
    lines: tuple[int, ...]

    def __post_init__(self) -> None:
        """Validate invariants after initialization."""
        if not self.language:
            raise ValueError("CodeHighlight.language must be a non-empty string.")
        if not self.lines:
            raise ValueError("CodeHighlight.lines must be a non-empty sequence.")
        for line in self.lines:
            if not isinstance(line, int) or line < 1:
                raise ValueError(
                    f"CodeHighlight.lines values must be positive integers (>= 1), got {line!r}."
                )

    def to_dict(self) -> dict[str, Any]:
        """Serialize to a camelCase JSON-compatible dict."""
        return {"language": self.language, "lines": list(self.lines)}

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> CodeHighlight:
        """Deserialize from a camelCase JSON dict.

        Args:
            data: Dict with keys "language" (str) and "lines" (list of int).

        Returns:
            A validated CodeHighlight instance.
        """
        return cls(language=data["language"], lines=tuple(data["lines"]))


# ─────────────────────────────────────────────────────────────────────────────
# VISUAL ACTION
# ─────────────────────────────────────────────────────────────────────────────

@dataclass(frozen=True, slots=True)
class VisualAction:
    """A single instruction telling the renderer what to display for this step.

    Visual actions are an OPEN vocabulary. The `type` field is a plain string,
    not a closed enum. Renderers MUST silently ignore action types they do not
    recognize.

    Attributes:
        type: Action type identifier in camelCase (e.g., "highlightElement").
        params: Action-specific parameters. All values must be JSON-serializable.
    """

    type: str
    params: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        """Validate that type is non-empty."""
        if not self.type:
            raise ValueError("VisualAction.type must be a non-empty string.")

    def to_dict(self) -> dict[str, Any]:
        """Serialize to a flat camelCase JSON-compatible dict.

        The output merges `type` with all `params` keys into a single flat dict,
        matching the TypeScript VisualAction interface shape.

        Returns:
            A flat dict like {"type": "highlightElement", "index": 3, "color": "highlight"}.
        """
        result: dict[str, Any] = {"type": self.type}
        result.update(self.params)
        return result

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> VisualAction:
        """Deserialize from a flat camelCase JSON dict.

        Extracts "type" and treats all other keys as params.

        Args:
            data: Flat dict with at least a "type" key.

        Returns:
            A VisualAction instance.
        """
        action_type = data["type"]
        params = {k: v for k, v in data.items() if k != "type"}
        return cls(type=action_type, params=params)


# ─────────────────────────────────────────────────────────────────────────────
# STEP
# ─────────────────────────────────────────────────────────────────────────────

# Regex for validating step IDs: lowercase alphanumeric, hyphens, underscores.
# Must start with a letter or digit.
_STEP_ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9_-]*$")


@dataclass(frozen=True, slots=True)
class Step:
    """A single step in an algorithm's execution trace.

    INVARIANTS (enforced by __post_init__ validation):
    1. index >= 0
    2. id matches ^[a-z0-9][a-z0-9_-]*$
    3. title is non-empty
    4. explanation is non-empty
    5. code_highlight is a valid CodeHighlight
    6. visual_actions is a (possibly empty) tuple of VisualAction

    The positional invariant (steps[i].index == i) and the terminal invariant
    (exactly one terminal step, at the end) are validated at the SEQUENCE level,
    not per-step, because a single Step doesn't know its position in the array.

    Attributes:
        index: 0-based position in the step sequence.
        id: Template identifier (e.g., "compare_mid"). Not globally unique.
        title: Short human-readable heading (≤80 chars recommended).
        explanation: Plain-language narration of what's happening.
        state: Snapshot of all algorithm variables. JSON-serializable.
        visual_actions: Ordered rendering instructions.
        code_highlight: Maps this step to source code lines.
        is_terminal: True if and only if this is the final step.
        phase: Optional grouping label for UI phase indicators.
    """

    index: int
    id: str
    title: str
    explanation: str
    state: dict[str, Any]
    visual_actions: tuple[VisualAction, ...]
    code_highlight: CodeHighlight
    is_terminal: bool
    phase: str | None = None

    def __post_init__(self) -> None:
        """Validate per-step invariants."""
        if not isinstance(self.index, int) or self.index < 0:
            raise ValueError(f"Step.index must be a non-negative integer, got {self.index!r}.")
        if not _STEP_ID_PATTERN.match(self.id):
            raise ValueError(
                f"Step.id must match ^[a-z0-9][a-z0-9_-]*$, got {self.id!r}."
            )
        if not self.title:
            raise ValueError("Step.title must be a non-empty string.")
        if not self.explanation:
            raise ValueError("Step.explanation must be a non-empty string.")

    def to_dict(self) -> dict[str, Any]:
        """Serialize to a camelCase JSON-compatible dict.

        Returns:
            A dict matching the JSON wire format (camelCase keys).
        """
        result: dict[str, Any] = {
            "index": self.index,
            "id": self.id,
            "title": self.title,
            "explanation": self.explanation,
            "state": self.state,
            "visualActions": [action.to_dict() for action in self.visual_actions],
            "codeHighlight": self.code_highlight.to_dict(),
            "isTerminal": self.is_terminal,
        }
        if self.phase is not None:
            result["phase"] = self.phase
        return result

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Step:
        """Deserialize from a camelCase JSON dict.

        Args:
            data: Dict matching the JSON wire format.

        Returns:
            A validated Step instance.
        """
        return cls(
            index=data["index"],
            id=data["id"],
            title=data["title"],
            explanation=data["explanation"],
            state=data["state"],
            visual_actions=tuple(
                VisualAction.from_dict(action) for action in data["visualActions"]
            ),
            code_highlight=CodeHighlight.from_dict(data["codeHighlight"]),
            is_terminal=data["isTerminal"],
            phase=data.get("phase"),
        )


# ─────────────────────────────────────────────────────────────────────────────
# STEP SEQUENCE
# ─────────────────────────────────────────────────────────────────────────────

@dataclass(frozen=True, slots=True)
class StepSequence:
    """A complete, validated sequence of steps produced by a generator.

    INVARIANTS (enforced by __post_init__ validation):
    1. format_version == STEP_FORMAT_VERSION
    2. algorithm_id is non-empty and URL-safe.
    3. steps is non-empty.
    4. steps[i].index == i for all i.
    5. steps[-1].is_terminal is True.
    6. No step other than the last has is_terminal == True.

    Attributes:
        format_version: Must equal STEP_FORMAT_VERSION.
        algorithm_id: The algorithm this sequence was generated for.
        inputs: The input parameters that produced this sequence.
        steps: Ordered tuple of Step objects.
        generated_at: ISO 8601 timestamp.
        generated_by: Which generator produced this ("typescript" | "python" | "precomputed").
    """

    format_version: int
    algorithm_id: str
    inputs: dict[str, Any]
    steps: tuple[Step, ...]
    generated_at: str
    generated_by: Literal["typescript", "python", "precomputed"]

    def __post_init__(self) -> None:
        """Validate all sequence-level invariants.

        Raises:
            ValueError: If any invariant is violated, with a precise message.
        """
        # 1. Version check
        if self.format_version != STEP_FORMAT_VERSION:
            raise ValueError(
                f"StepSequence.format_version must be {STEP_FORMAT_VERSION}, "
                f"got {self.format_version}."
            )

        # 2. Algorithm ID format
        if not re.match(r"^[a-z0-9][a-z0-9-]*$", self.algorithm_id):
            raise ValueError(
                f"StepSequence.algorithm_id must match ^[a-z0-9][a-z0-9-]*$, "
                f"got {self.algorithm_id!r}."
            )

        # 3. Non-empty steps
        if not self.steps:
            raise ValueError("StepSequence.steps must contain at least one step.")

        # 4. Index contiguity: steps[i].index == i
        for i, step in enumerate(self.steps):
            if step.index != i:
                raise ValueError(
                    f"Step at position {i} has index={step.index}. "
                    f"Expected index={i} (steps[i].index must equal i)."
                )

        # 5. Terminal step must be last
        if not self.steps[-1].is_terminal:
            raise ValueError(
                "The last step must have is_terminal=True. "
                f"Got is_terminal={self.steps[-1].is_terminal} at index {len(self.steps) - 1}."
            )

        # 6. No premature terminal steps
        for i, step in enumerate(self.steps[:-1]):
            if step.is_terminal:
                raise ValueError(
                    f"Step at index {i} has is_terminal=True, but it is not the last step. "
                    f"Only the final step (index {len(self.steps) - 1}) may be terminal."
                )

    def to_dict(self) -> dict[str, Any]:
        """Serialize to a camelCase JSON-compatible dict.

        Returns:
            A dict matching the JSON wire format.
        """
        return {
            "formatVersion": self.format_version,
            "algorithmId": self.algorithm_id,
            "inputs": self.inputs,
            "steps": [step.to_dict() for step in self.steps],
            "generatedAt": self.generated_at,
            "generatedBy": self.generated_by,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> StepSequence:
        """Deserialize from a camelCase JSON dict.

        Args:
            data: Dict matching the JSON wire format.

        Returns:
            A validated StepSequence instance.

        Raises:
            ValueError: If any invariant is violated.
            KeyError: If required fields are missing.
        """
        return cls(
            format_version=data["formatVersion"],
            algorithm_id=data["algorithmId"],
            inputs=data["inputs"],
            steps=tuple(Step.from_dict(step) for step in data["steps"]),
            generated_at=data["generatedAt"],
            generated_by=data["generatedBy"],
        )


# ─────────────────────────────────────────────────────────────────────────────
# ALGORITHM METADATA TYPES
# ─────────────────────────────────────────────────────────────────────────────

# These are defined for use in the Python package. They mirror the TypeScript
# AlgorithmMeta interface. In practice, meta.json files are validated by
# JSON Schema (meta.schema.json), but these dataclasses provide type safety
# when meta is loaded into Python code.

@dataclass(frozen=True, slots=True)
class EducationEntry:
    """A key concept or common pitfall.

    Attributes:
        title: Short title for the concept/pitfall.
        description: Explanation text (supports markdown).
    """
    title: str
    description: str

    def to_dict(self) -> dict[str, Any]:
        """Serialize to a JSON-compatible dict."""
        return {"title": self.title, "description": self.description}

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> EducationEntry:
        """Deserialize from a JSON dict."""
        return cls(title=data["title"], description=data["description"])


@dataclass(frozen=True, slots=True)
class QuizQuestion:
    """A self-assessment quiz question.

    INVARIANT: 0 <= correct_index < len(options)

    Attributes:
        question: The question text.
        options: Answer options (minimum 2).
        correct_index: 0-based index of the correct option.
        explanation: Explanation shown after answering.
    """
    question: str
    options: tuple[str, ...]
    correct_index: int
    explanation: str

    def __post_init__(self) -> None:
        """Validate quiz question invariants."""
        if len(self.options) < 2:
            raise ValueError(
                f"QuizQuestion must have at least 2 options, got {len(self.options)}."
            )
        if not (0 <= self.correct_index < len(self.options)):
            raise ValueError(
                f"QuizQuestion.correct_index ({self.correct_index}) must be "
                f"in range [0, {len(self.options)})."
            )

    def to_dict(self) -> dict[str, Any]:
        """Serialize to a camelCase JSON-compatible dict."""
        return {
            "question": self.question,
            "options": list(self.options),
            "correctIndex": self.correct_index,
            "explanation": self.explanation,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> QuizQuestion:
        """Deserialize from a camelCase JSON dict."""
        return cls(
            question=data["question"],
            options=tuple(data["options"]),
            correct_index=data["correctIndex"],
            explanation=data["explanation"],
        )


@dataclass(frozen=True, slots=True)
class ResourceLink:
    """An external learning resource.

    Attributes:
        title: Display title for the link.
        url: Full URL.
        type: Resource type for icon selection.
    """
    title: str
    url: str
    type: Literal["article", "video", "paper", "course", "documentation", "interactive"]

    def to_dict(self) -> dict[str, Any]:
        """Serialize to a JSON-compatible dict."""
        return {"title": self.title, "url": self.url, "type": self.type}

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> ResourceLink:
        """Deserialize from a JSON dict."""
        return cls(title=data["title"], url=data["url"], type=data["type"])


@dataclass(frozen=True, slots=True)
class InputExample:
    """A named input preset.

    Attributes:
        name: Display name (e.g., "Large Sorted Array").
        values: Parameter values matching the algorithm's input schema.
    """
    name: str
    values: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        """Serialize to a JSON-compatible dict."""
        return {"name": self.name, "values": self.values}

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> InputExample:
        """Deserialize from a JSON dict."""
        return cls(name=data["name"], values=data["values"])
