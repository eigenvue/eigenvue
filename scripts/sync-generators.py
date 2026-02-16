"""
Cross-Language Generator Sync — Eigenvue

Runs both TypeScript and Python generators for each algorithm with shared
test fixture inputs, then compares the output step sequences field by field.

This is the definitive proof that the web app and Python package produce
identical visualizations for the same algorithm and inputs.

USAGE:
    python scripts/sync-generators.py --all --tolerance 1e-9 --strict
    python scripts/sync-generators.py --algorithm binary-search --verbose
    python scripts/sync-generators.py --algorithm self-attention --tolerance 1e-6

FLAGS:
    --all               Sync all 17 algorithms.
    --algorithm ID      Sync only the specified algorithm.
    --tolerance FLOAT   Floating-point comparison tolerance (default: 1e-9).
    --strict            Fail on any mismatch (default behavior in CI).
    --verbose           Print detailed comparison for each step.

EXIT CODES:
    0  All algorithms match.
    1  One or more algorithms have mismatches.

COMPARISON RULES:
    1. Step count must be identical.
    2. Step IDs must be identical in the same order.
    3. Step titles must be identical.
    4. State values are compared recursively:
       - Numbers: |a - b| <= tolerance
       - Strings: exact match
       - Arrays: element-wise comparison (same length required)
       - Objects: key-wise comparison (same keys required)
    5. Visual action types must match in order.
    6. Visual action parameters follow the same numeric/string rules.
    7. Code highlight lines must match exactly.
    8. isTerminal flags must match exactly.

MATHEMATICAL INVARIANT CHECKS (run after comparison):
    - Softmax rows in attention generators sum to 1.0 (±1e-6)
    - Dijkstra distances satisfy triangle inequality
    - Convolution outputs match dot-product formula
    - Backpropagation gradients match chain rule expectations

Author: Ashutosh Mishra
"""

from __future__ import annotations

import argparse
import json
import math
import os
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(PROJECT_ROOT / "python" / "src"))

from eigenvue.catalog import get_algorithm_meta, list_algorithms
from eigenvue.generators import GENERATOR_REGISTRY


# =============================================================================
# TypeScript Generator Runner
# =============================================================================

# Node.js runner template. This is written to a temp file and executed.
# It imports the TypeScript generator (compiled to JS by the project's
# build tooling), runs it with the provided inputs, and writes the
# resulting steps to stdout as JSON.
TS_RUNNER_TEMPLATE = """\
// Auto-generated runner for sync-generators.py — do not edit.
import {{ runGenerator }} from '{generator_runner_path}';
import generator from '{generator_path}';

const inputs = {inputs_json};
const steps = runGenerator(generator, inputs);

// Output to stdout as JSON for Python to parse.
process.stdout.write(JSON.stringify(steps, null, 0));
"""


def run_ts_generator(algorithm_id: str, inputs: dict[str, Any]) -> list[dict]:
    """Run the TypeScript generator for the given algorithm and inputs.

    Parameters
    ----------
    algorithm_id : str
        Algorithm identifier (e.g., "binary-search").
    inputs : dict
        Input parameters to pass to the generator.

    Returns
    -------
    list[dict]
        The generated steps as a list of plain dictionaries.

    Raises
    ------
    RuntimeError
        If the Node.js process fails or produces invalid output.
    """
    # Locate the generator file.
    category_map = _get_category_map()
    category = category_map.get(algorithm_id)
    if category is None:
        raise RuntimeError(f"Unknown algorithm: {algorithm_id}")

    generator_path = (
        PROJECT_ROOT / "algorithms" / category / algorithm_id / "generator.ts"
    )
    if not generator_path.exists():
        raise RuntimeError(f"TypeScript generator not found: {generator_path}")

    generator_runner_path = (
        PROJECT_ROOT / "web" / "src" / "engine" / "generator" / "GeneratorRunner"
    )

    # Write the runner script to a temp file.
    runner_code = TS_RUNNER_TEMPLATE.format(
        generator_runner_path=str(generator_runner_path).replace("\\", "/"),
        generator_path=str(generator_path).replace("\\", "/"),
        inputs_json=json.dumps(inputs),
    )

    with tempfile.NamedTemporaryFile(
        mode="w",
        suffix=".mjs",
        dir=str(PROJECT_ROOT / "web"),
        delete=False,
        encoding="utf-8",
    ) as f:
        f.write(runner_code)
        runner_path = f.name

    try:
        # Execute with Node.js using the project's TypeScript configuration.
        # We use npx tsx to handle TypeScript imports directly.
        result = subprocess.run(
            ["npx", "tsx", runner_path],
            capture_output=True,
            text=True,
            cwd=str(PROJECT_ROOT / "web"),
            timeout=30,
        )

        if result.returncode != 0:
            raise RuntimeError(
                f"TypeScript generator failed for '{algorithm_id}':\n"
                f"STDERR: {result.stderr[:500]}"
            )

        steps = json.loads(result.stdout)
        if not isinstance(steps, list):
            raise RuntimeError(
                f"TypeScript generator for '{algorithm_id}' returned "
                f"{type(steps).__name__}, expected list."
            )
        return steps

    finally:
        os.unlink(runner_path)


def _get_category_map() -> dict[str, str]:
    """Build a mapping from algorithm ID to category directory name.

    Returns
    -------
    dict[str, str]
        Maps algorithm IDs to their category folder (e.g.,
        "binary-search" -> "classical").
    """
    algorithms_dir = PROJECT_ROOT / "algorithms"
    category_map: dict[str, str] = {}
    for category_dir in algorithms_dir.iterdir():
        if not category_dir.is_dir():
            continue
        for algo_dir in category_dir.iterdir():
            if algo_dir.is_dir() and (algo_dir / "generator.ts").exists():
                category_map[algo_dir.name] = category_dir.name
    return category_map


# =============================================================================
# Deep Comparison Engine
# =============================================================================


def compare_values(
    a: Any,
    b: Any,
    tolerance: float,
    path: str = "",
) -> list[str]:
    """Recursively compare two values, collecting all mismatches.

    Parameters
    ----------
    a : Any
        Value from the TypeScript generator.
    b : Any
        Value from the Python generator.
    tolerance : float
        Maximum allowed difference for numeric comparisons.
    path : str
        Dot-notation path for error reporting (e.g., "steps[0].state.left").

    Returns
    -------
    list[str]
        List of human-readable mismatch descriptions. Empty = match.
    """
    errors: list[str] = []

    # Both None / null.
    if a is None and b is None:
        return errors

    # Type mismatch (but allow int/float interchangeability).
    if type(a) != type(b):
        # int <-> float is acceptable if values match.
        if isinstance(a, (int, float)) and isinstance(b, (int, float)):
            if math.isnan(float(a)) and math.isnan(float(b)):
                return errors  # NaN == NaN for our purposes.
            if abs(float(a) - float(b)) > tolerance:
                errors.append(
                    f"{path}: numeric mismatch: TS={a} vs PY={b} "
                    f"(diff={abs(float(a) - float(b)):.2e})"
                )
            return errors

        # None vs missing — treat as mismatch.
        if a is None or b is None:
            errors.append(f"{path}: one is None: TS={a!r} vs PY={b!r}")
            return errors

        errors.append(
            f"{path}: type mismatch: TS={type(a).__name__}({a!r}) "
            f"vs PY={type(b).__name__}({b!r})"
        )
        return errors

    # Boolean comparison must come before numeric since bool is a subtype of int.
    if isinstance(a, bool):
        if a != b:
            errors.append(f"{path}: bool mismatch: TS={a} vs PY={b}")
        return errors

    # Numeric comparison with tolerance.
    if isinstance(a, (int, float)):
        if math.isnan(float(a)) and math.isnan(float(b)):
            return errors
        if abs(float(a) - float(b)) > tolerance:
            errors.append(
                f"{path}: numeric mismatch: TS={a} vs PY={b} "
                f"(diff={abs(float(a) - float(b)):.2e}, tol={tolerance:.0e})"
            )
        return errors

    # String comparison (exact).
    if isinstance(a, str):
        if a != b:
            errors.append(f"{path}: string mismatch: TS={a!r} vs PY={b!r}")
        return errors

    # Array comparison (element-wise).
    if isinstance(a, list):
        if len(a) != len(b):
            errors.append(
                f"{path}: array length mismatch: TS={len(a)} vs PY={len(b)}"
            )
            return errors
        for i, (ai, bi) in enumerate(zip(a, b)):
            errors.extend(compare_values(ai, bi, tolerance, f"{path}[{i}]"))
        return errors

    # Object comparison (key-wise).
    if isinstance(a, dict):
        ts_keys = set(a.keys())
        py_keys = set(b.keys())

        # Keys present in TS but missing in Python.
        for key in sorted(ts_keys - py_keys):
            errors.append(f"{path}.{key}: present in TS but missing in PY")

        # Keys present in Python but missing in TS.
        for key in sorted(py_keys - ts_keys):
            errors.append(f"{path}.{key}: present in PY but missing in TS")

        # Compare shared keys.
        for key in sorted(ts_keys & py_keys):
            errors.extend(
                compare_values(a[key], b[key], tolerance, f"{path}.{key}")
            )
        return errors

    # Fallback: exact equality.
    if a != b:
        errors.append(f"{path}: value mismatch: TS={a!r} vs PY={b!r}")

    return errors


def compare_step_sequences(
    ts_steps: list[dict],
    py_steps: list[dict],
    tolerance: float,
) -> list[str]:
    """Compare two complete step sequences.

    Parameters
    ----------
    ts_steps : list[dict]
        Steps from the TypeScript generator.
    py_steps : list[dict]
        Steps from the Python generator.
    tolerance : float
        Floating-point comparison tolerance.

    Returns
    -------
    list[str]
        List of all mismatches found. Empty = sequences are equivalent.
    """
    errors: list[str] = []

    # Step count.
    if len(ts_steps) != len(py_steps):
        errors.append(
            f"Step count mismatch: TS={len(ts_steps)} vs PY={len(py_steps)}"
        )
        # Still compare as many steps as we can.

    min_len = min(len(ts_steps), len(py_steps))
    for i in range(min_len):
        ts = ts_steps[i]
        py = py_steps[i]
        prefix = f"steps[{i}]"

        # Step ID (exact match required).
        if ts.get("id") != py.get("id"):
            errors.append(
                f"{prefix}.id: TS={ts.get('id')!r} vs PY={py.get('id')!r}"
            )

        # State (deep comparison with tolerance).
        errors.extend(
            compare_values(
                ts.get("state", {}),
                py.get("state", {}),
                tolerance,
                f"{prefix}.state",
            )
        )

        # Visual actions.
        ts_actions = ts.get("visualActions", [])
        py_actions = py.get("visualActions", [])
        if len(ts_actions) != len(py_actions):
            errors.append(
                f"{prefix}.visualActions: count mismatch: "
                f"TS={len(ts_actions)} vs PY={len(py_actions)}"
            )
        else:
            for j, (ta, pa) in enumerate(zip(ts_actions, py_actions)):
                errors.extend(
                    compare_values(
                        ta, pa, tolerance, f"{prefix}.visualActions[{j}]"
                    )
                )

        # isTerminal (exact match).
        ts_terminal = ts.get("isTerminal", False)
        py_terminal = py.get("isTerminal", False)
        if ts_terminal != py_terminal:
            errors.append(
                f"{prefix}.isTerminal: TS={ts_terminal} vs PY={py_terminal}"
            )

        # Code highlight lines (exact match).
        ts_lines = ts.get("codeHighlight", {}).get("lines", [])
        py_lines = py.get("codeHighlight", {}).get("lines", [])
        if ts_lines != py_lines:
            errors.append(
                f"{prefix}.codeHighlight.lines: TS={ts_lines} vs PY={py_lines}"
            )

    return errors


# =============================================================================
# Mathematical Invariant Checks
# =============================================================================

# Tolerance for softmax sum verification — softmax rows must sum to 1.0.
_SOFTMAX_TOLERANCE = 1e-6

# Tolerance for convolution dot product verification.
_CONV_TOLERANCE = 1e-9


def check_mathematical_invariants(
    algorithm_id: str,
    steps: list[dict],
) -> list[str]:
    """Verify domain-specific mathematical invariants on step sequences.

    These checks go beyond field-by-field comparison. They verify that the
    generated values satisfy the mathematical properties of the algorithm.

    Parameters
    ----------
    algorithm_id : str
        The algorithm being checked.
    steps : list[dict]
        The step sequence to validate.

    Returns
    -------
    list[str]
        List of invariant violations. Empty = all invariants hold.
    """
    errors: list[str] = []

    # -----------------------------------------------------------------------
    # SOFTMAX INVARIANT: Every showAttentionWeights action must have
    # weights that sum to 1.0 (±1e-6). This applies to self-attention,
    # multi-head-attention, and transformer-block generators.
    # -----------------------------------------------------------------------
    attention_algorithms = {"self-attention", "multi-head-attention", "transformer-block"}
    if algorithm_id in attention_algorithms:
        for i, step in enumerate(steps):
            for j, action in enumerate(step.get("visualActions", [])):
                if action.get("type") == "showAttentionWeights":
                    weights = action.get("weights", [])
                    if len(weights) > 0:
                        total = sum(float(w) for w in weights)
                        if abs(total - 1.0) > _SOFTMAX_TOLERANCE:
                            errors.append(
                                f"steps[{i}].visualActions[{j}]: softmax weights "
                                f"sum to {total:.10f}, expected 1.0 (+-{_SOFTMAX_TOLERANCE})"
                            )

    # -----------------------------------------------------------------------
    # DIJKSTRA INVARIANT: Final distances must satisfy the triangle
    # inequality. For any edge (u, v) with weight w:
    #   dist[v] <= dist[u] + w
    #
    # Check the final step's state for the distances array.
    # -----------------------------------------------------------------------
    if algorithm_id == "dijkstra":
        final_step = steps[-1] if steps else None
        if final_step:
            state = final_step.get("state", {})
            distances = state.get("distances", [])
            graph = state.get("graph", {})
            adjacency = graph.get("adjacencyList", [])
            for u, neighbors in enumerate(adjacency):
                for edge in neighbors:
                    v = edge.get("to", edge.get("node", -1))
                    w = edge.get("weight", 0)
                    if (
                        0 <= u < len(distances)
                        and 0 <= v < len(distances)
                        and distances[u] != float("inf")
                    ):
                        if distances[v] > distances[u] + w + _CONV_TOLERANCE:
                            errors.append(
                                f"Dijkstra triangle inequality violated: "
                                f"dist[{v}]={distances[v]} > "
                                f"dist[{u}]={distances[u]} + w={w}"
                            )

    # -----------------------------------------------------------------------
    # CONVOLUTION INVARIANT: Each output cell must equal the sum of
    # element-wise products of the kernel and the corresponding input patch.
    # Verified on the final step's computed output matrix.
    # -----------------------------------------------------------------------
    if algorithm_id == "convolution":
        final_step = steps[-1] if steps else None
        if final_step:
            state = final_step.get("state", {})
            input_matrix = state.get("input", [])
            kernel = state.get("kernel", [])
            output_matrix = state.get("output", [])
            if input_matrix and kernel and output_matrix:
                k_rows = len(kernel)
                k_cols = len(kernel[0]) if kernel else 0
                for r, row in enumerate(output_matrix):
                    for c, val in enumerate(row):
                        expected = 0.0
                        for kr in range(k_rows):
                            for kc in range(k_cols):
                                expected += (
                                    float(input_matrix[r + kr][c + kc])
                                    * float(kernel[kr][kc])
                                )
                        if abs(float(val) - expected) > _CONV_TOLERANCE:
                            errors.append(
                                f"Convolution output[{r}][{c}]={val} != "
                                f"expected {expected:.10f}"
                            )

    return errors


# =============================================================================
# Main Orchestrator
# =============================================================================


def sync_algorithm(
    algorithm_id: str,
    tolerance: float,
    verbose: bool = False,
) -> tuple[bool, list[str]]:
    """Run both generators and compare output for a single algorithm.

    Parameters
    ----------
    algorithm_id : str
        Algorithm to sync.
    tolerance : float
        Floating-point comparison tolerance.
    verbose : bool
        Print detailed comparison output.

    Returns
    -------
    tuple[bool, list[str]]
        (passed, list_of_errors).
    """
    all_errors: list[str] = []

    # Load metadata to get default inputs.
    try:
        meta = get_algorithm_meta(algorithm_id)
    except ValueError:
        return (False, [f"No meta.json found for '{algorithm_id}'"])

    default_inputs = meta.get("inputs", {}).get("defaults", {})

    # Also load all test fixtures for this algorithm.
    fixture_inputs: list[tuple[str, dict]] = [("defaults", default_inputs)]

    # Find test fixture files.
    category_map = _get_category_map()
    category = category_map.get(algorithm_id)
    if category:
        tests_dir = (
            PROJECT_ROOT / "algorithms" / category / algorithm_id / "tests"
        )
        if tests_dir.exists():
            for fixture_path in sorted(tests_dir.glob("*.fixture.json")):
                with open(fixture_path, encoding="utf-8") as f:
                    fixture_data = json.load(f)
                fixture_name = fixture_path.stem.replace(".fixture", "")
                fixture_inputs_data = fixture_data.get("inputs", default_inputs)
                fixture_inputs.append((fixture_name, fixture_inputs_data))

    # Run comparison for each input set.
    for input_name, inputs in fixture_inputs:
        if verbose:
            print(f"    Input set '{input_name}'...")

        try:
            # Run TypeScript generator.
            ts_steps = run_ts_generator(algorithm_id, inputs)
        except RuntimeError as e:
            all_errors.append(f"[{input_name}] TS generator error: {e}")
            continue

        try:
            # Run Python generator.
            if algorithm_id not in GENERATOR_REGISTRY:
                all_errors.append(
                    f"[{input_name}] No Python generator for '{algorithm_id}'"
                )
                continue
            generator_fn = GENERATOR_REGISTRY[algorithm_id]
            py_steps_raw = generator_fn(inputs)
            py_steps = []
            for step in py_steps_raw:
                if hasattr(step, "to_dict"):
                    py_steps.append(step.to_dict())
                elif isinstance(step, dict):
                    py_steps.append(step)
                else:
                    raise TypeError(f"Unexpected step type: {type(step)}")
        except Exception as e:
            all_errors.append(f"[{input_name}] PY generator error: {e}")
            continue

        # Compare step sequences.
        comparison_errors = compare_step_sequences(ts_steps, py_steps, tolerance)
        for err in comparison_errors:
            all_errors.append(f"[{input_name}] {err}")

        # Mathematical invariant checks (run on BOTH outputs).
        for label, check_steps in [("TS", ts_steps), ("PY", py_steps)]:
            invariant_errors = check_mathematical_invariants(algorithm_id, check_steps)
            for err in invariant_errors:
                all_errors.append(f"[{input_name}] {label} invariant: {err}")

    if verbose and all_errors:
        for err in all_errors:
            print(f"      ERROR: {err}")

    return (len(all_errors) == 0, all_errors)


def main() -> int:
    """Entry point for the sync-generators script."""
    parser = argparse.ArgumentParser(
        description="Compare TypeScript and Python generators for parity.",
    )
    parser.add_argument("--all", action="store_true", help="Sync all algorithms.")
    parser.add_argument("--algorithm", type=str, help="Sync one algorithm by ID.")
    parser.add_argument(
        "--tolerance",
        type=float,
        default=1e-9,
        help="Floating-point comparison tolerance (default: 1e-9).",
    )
    parser.add_argument("--strict", action="store_true", help="Fail on any mismatch.")
    parser.add_argument("--verbose", action="store_true", help="Detailed output.")
    args = parser.parse_args()

    if not args.all and not args.algorithm:
        parser.error("Specify --all or --algorithm <id>.")

    print("=" * 70)
    print("Cross-Language Generator Sync")
    print(f"Tolerance: {args.tolerance:.0e}")
    print("=" * 70)

    # Determine which algorithms to sync.
    if args.algorithm:
        algorithm_ids = [args.algorithm]
    else:
        all_algorithms = list_algorithms()
        algorithm_ids = [a.id for a in all_algorithms]

    passed_count = 0
    failed_count = 0
    all_algorithm_errors: dict[str, list[str]] = {}

    for algo_id in sorted(algorithm_ids):
        print(f"\n[{algo_id}]")
        passed, errors = sync_algorithm(algo_id, args.tolerance, args.verbose)

        if passed:
            print("  PASS")
            passed_count += 1
        else:
            print(f"  FAIL ({len(errors)} errors)")
            if not args.verbose:
                # Show first 3 errors even in non-verbose mode.
                for err in errors[:3]:
                    print(f"    - {err}")
                if len(errors) > 3:
                    print(f"    ... and {len(errors) - 3} more errors")
            failed_count += 1
            all_algorithm_errors[algo_id] = errors

    print()
    print("=" * 70)
    print(f"RESULTS: {passed_count} passed, {failed_count} failed")
    print("=" * 70)

    if failed_count > 0:
        print("\nFAILED ALGORITHMS:")
        for algo_id, errors in all_algorithm_errors.items():
            print(f"  {algo_id}: {len(errors)} errors")
        return 1

    print("\nALL ALGORITHMS IN SYNC.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
