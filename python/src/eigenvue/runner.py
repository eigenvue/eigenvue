"""
Generator runner — executes a Python generator and returns validated steps.

This module:
1. Looks up the correct generator function from the registry.
2. Resolves inputs (user-provided or defaults from meta.json).
3. Runs the generator to produce a list of Step dataclass objects.
4. Validates the step sequence (index continuity, terminal flag, etc.).
5. Serializes steps to camelCase dicts (matching the JSON wire format).

CRITICAL MATHEMATICAL CONTRACT:
Every Python generator MUST produce steps that are identical to its
TypeScript counterpart when given the same inputs. "Identical" means:
- Same number of steps.
- Same step IDs in the same order.
- Same state values (floating-point tolerance: +/-1e-9 for computed values).
- Same visual action types and parameters.
This is enforced by the cross-language parity tests.
"""

from __future__ import annotations

from typing import Any

from eigenvue.catalog import get_default_inputs


def _get_generator(algorithm_id: str) -> Any:
    """Import and return the generate() function for the given algorithm.

    Parameters
    ----------
    algorithm_id : str
        The algorithm identifier.

    Returns
    -------
    Callable
        A function with signature: generate(inputs: dict) -> list[Step]

    Raises
    ------
    ValueError
        If no generator is registered for this algorithm.
    """
    # Import the generator registry (lazy import to avoid circular deps)
    from eigenvue.generators import GENERATOR_REGISTRY

    if algorithm_id not in GENERATOR_REGISTRY:
        raise ValueError(
            f"No Python generator registered for algorithm {algorithm_id!r}. "
            f"Available generators: {', '.join(sorted(GENERATOR_REGISTRY.keys()))}"
        )

    return GENERATOR_REGISTRY[algorithm_id]


def _validate_step_sequence(steps: list[dict[str, Any]], algorithm_id: str) -> None:
    """Validate structural invariants of a step sequence.

    Parameters
    ----------
    steps : list[dict]
        Step dicts in camelCase wire format.
    algorithm_id : str
        For error messages.

    Raises
    ------
    ValueError
        If any invariant is violated.
    """
    if not steps:
        raise ValueError(f"Generator for {algorithm_id!r} produced zero steps.")

    # Invariant 1: Index continuity — steps[i]["index"] == i
    for i, s in enumerate(steps):
        if s["index"] != i:
            raise ValueError(
                f"Step index mismatch in {algorithm_id!r}: "
                f"steps[{i}].index = {s['index']}, expected {i}."
            )

    # Invariant 2: Exactly one terminal step, at the end
    terminal_count = sum(1 for s in steps if s.get("isTerminal", False))
    if terminal_count != 1:
        raise ValueError(
            f"Generator for {algorithm_id!r} produced {terminal_count} terminal steps "
            f"(expected exactly 1)."
        )
    if not steps[-1].get("isTerminal", False):
        raise ValueError(
            f"Generator for {algorithm_id!r}: the last step must have isTerminal=true."
        )

    # Invariant 3: No non-terminal step has isTerminal=true
    for i, s in enumerate(steps[:-1]):
        if s.get("isTerminal", False):
            raise ValueError(
                f"Generator for {algorithm_id!r}: step {i} has isTerminal=true "
                f"but is not the last step."
            )


def run_generator(
    algorithm_id: str,
    inputs: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    """Run an algorithm generator and return validated step dicts.

    Parameters
    ----------
    algorithm_id : str
        The algorithm identifier.
    inputs : dict or None
        Custom input parameters. If None, uses algorithm defaults.

    Returns
    -------
    list[dict[str, Any]]
        Validated step dicts in camelCase wire format.
    """
    # Resolve inputs
    if inputs is None:
        inputs = get_default_inputs(algorithm_id)
    else:
        inputs = dict(inputs)  # Defensive copy

    # Get and run the generator
    generate_fn = _get_generator(algorithm_id)
    step_objects = generate_fn(inputs)

    # Serialize Step dataclass objects to camelCase dicts
    step_dicts: list[dict[str, Any]] = []
    for step_obj in step_objects:
        # Each generator returns a list of Step dataclass instances.
        # Call to_dict() to convert to the JSON wire format.
        step_dicts.append(step_obj.to_dict())

    # Validate invariants
    _validate_step_sequence(step_dicts, algorithm_id)

    return step_dicts
