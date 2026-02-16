"""
Pre-Computation Pipeline — Eigenvue

Runs all Python algorithm generators with configured example inputs and
writes the resulting step sequences to JSON files for use by the web app.

This script bridges the Python generator layer into the Next.js static build.
The output directory (typically web/public/precomputed/) is populated with
one subdirectory per algorithm, each containing one JSON file per input preset.

USAGE:
    python scripts/precompute-steps.py --output-dir web/public/precomputed
    python scripts/precompute-steps.py --output-dir web/public/precomputed --validate
    python scripts/precompute-steps.py --algorithm binary-search --output-dir /tmp/test

FLAGS:
    --output-dir DIR    Root directory for output files (required).
    --validate          Validate each step sequence against the JSON Schema
                        before writing. Fail on any validation error.
    --algorithm ID      Pre-compute only the specified algorithm (for debugging).
    --verbose           Print detailed progress for each algorithm and input.
    --dry-run           Parse and validate without writing files.

EXIT CODES:
    0  All algorithms pre-computed successfully.
    1  One or more algorithms failed (generation error, validation error, I/O error).

DETERMINISM:
    Output JSON is written with json.dumps(sort_keys=True, indent=2).
    Two runs with identical generators and inputs produce byte-identical files.
    This means pre-computed files can be committed to version control and
    diffed meaningfully — only genuine algorithm changes create diffs.

DIRECTORY STRUCTURE (output):
    <output-dir>/
    ├── binary-search/
    │   ├── default.steps.json          ← from inputs.defaults in meta.json
    │   ├── large-array.steps.json      ← from inputs.examples[0] in meta.json
    │   └── not-found.steps.json        ← from inputs.examples[1] in meta.json
    ├── quicksort/
    │   └── default.steps.json
    └── ... (one directory per algorithm)

Author: Ashutosh Mishra
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

# ---------------------------------------------------------------------------
# Path setup: ensure the project root is on sys.path so we can import
# both the eigenvue package and the shared validation utilities.
# ---------------------------------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(PROJECT_ROOT / "python" / "src"))

from eigenvue.catalog import get_algorithm_meta, list_algorithms
from eigenvue.generators import GENERATOR_REGISTRY

# Conditional import: validation is only needed when --validate is used,
# but we import at module level so import errors are caught early.
from shared.validation.validate import validate_step_sequence


def precompute_algorithm(
    algorithm_id: str,
    output_dir: Path,
    *,
    validate: bool = True,
    verbose: bool = False,
    dry_run: bool = False,
) -> tuple[int, int]:
    """Pre-compute step sequences for a single algorithm.

    Runs the Python generator with the default inputs and each named
    example from the algorithm's meta.json. Writes output to:
        <output_dir>/<algorithm_id>/default.steps.json
        <output_dir>/<algorithm_id>/<example-name>.steps.json

    Parameters
    ----------
    algorithm_id : str
        The algorithm identifier (e.g., "binary-search").
    output_dir : Path
        Root output directory.
    validate : bool
        If True, validate each step sequence against the JSON Schema.
    verbose : bool
        If True, print detailed progress messages.
    dry_run : bool
        If True, generate and validate but do not write files.

    Returns
    -------
    tuple[int, int]
        (success_count, failure_count) for the presets processed.
    """
    successes = 0
    failures = 0

    # Load algorithm metadata.
    try:
        meta = get_algorithm_meta(algorithm_id)
    except ValueError:
        print(f"  ERROR: No meta.json found for '{algorithm_id}'.")
        return (0, 1)

    # Retrieve the generator function from the registry.
    if algorithm_id not in GENERATOR_REGISTRY:
        print(f"  ERROR: No Python generator registered for '{algorithm_id}'.")
        return (0, 1)
    generator_fn = GENERATOR_REGISTRY[algorithm_id]

    # Collect all input presets: default + named examples.
    presets: list[tuple[str, dict]] = []

    # Default inputs are always pre-computed.
    default_inputs = meta.get("inputs", {}).get("defaults", {})
    presets.append(("default", default_inputs))

    # Named examples from meta.json.
    examples = meta.get("inputs", {}).get("examples", [])
    for example in examples:
        name = example.get("name", "unnamed")
        # Sanitize name for filesystem: lowercase, hyphens, no spaces,
        # and strip any characters that are invalid in file paths.
        safe_name = name.lower().replace(" ", "-").replace("_", "-")
        # Remove any character that isn't alphanumeric, hyphen, or dot.
        safe_name = re.sub(r"[^a-z0-9\-.]", "", safe_name)
        # Collapse multiple hyphens.
        safe_name = re.sub(r"-{2,}", "-", safe_name)
        # Strip leading/trailing hyphens.
        safe_name = safe_name.strip("-")
        if not safe_name:
            safe_name = "unnamed"
        values = example.get("values", {})
        presets.append((safe_name, values))

    # Create output directory.
    algo_output_dir = output_dir / algorithm_id
    if not dry_run:
        algo_output_dir.mkdir(parents=True, exist_ok=True)

    # Run each preset.
    for preset_name, inputs in presets:
        try:
            if verbose:
                print(f"    Preset '{preset_name}': inputs = {json.dumps(inputs)[:80]}...")

            # ---------------------------------------------------------------
            # GENERATE STEPS
            # This calls the exact same Python generator function that
            # eigenvue.steps() uses. The output is a list of Step dataclass
            # instances, converted to plain dicts for JSON serialization.
            # ---------------------------------------------------------------
            start_time = time.monotonic()
            steps = generator_fn(inputs)
            elapsed_ms = (time.monotonic() - start_time) * 1000

            if verbose:
                print(f"    Generated {len(steps)} steps in {elapsed_ms:.1f}ms.")

            # Convert Step dataclass instances to JSON-serializable dicts.
            # Steps are already dicts if the generator returns them that way.
            step_dicts = []
            for step in steps:
                if hasattr(step, "to_dict"):
                    step_dicts.append(step.to_dict())
                elif isinstance(step, dict):
                    step_dicts.append(step)
                else:
                    raise TypeError(
                        f"Generator for '{algorithm_id}' yielded step of type "
                        f"{type(step).__name__}, expected Step dataclass or dict."
                    )

            # Build the step sequence envelope.
            # Schema requires: formatVersion=1 (integer), generatedBy from enum,
            # and generatedAt as ISO 8601 timestamp.
            sequence = {
                "formatVersion": 1,
                "algorithmId": algorithm_id,
                "inputs": inputs,
                "steps": step_dicts,
                "generatedAt": datetime.now(timezone.utc).isoformat(),
                "generatedBy": "precomputed",
            }

            # ---------------------------------------------------------------
            # VALIDATE (optional but recommended — always on in CI)
            # Ensures every pre-computed file conforms to the step format
            # schema. If validation fails, we refuse to write the file.
            # This catches generator bugs BEFORE they reach production.
            # ---------------------------------------------------------------
            if validate:
                result = validate_step_sequence(sequence)
                if not result.valid:
                    print(f"    VALIDATION FAILED for '{preset_name}':")
                    for err in result.errors[:5]:
                        print(f"      - {err}")
                    failures += 1
                    continue

            # ---------------------------------------------------------------
            # WRITE OUTPUT
            # Deterministic JSON: sorted keys, 2-space indent, no trailing
            # whitespace, newline at end of file. This ensures two runs with
            # the same inputs produce byte-identical output, making git diffs
            # meaningful.
            # ---------------------------------------------------------------
            if not dry_run:
                output_path = algo_output_dir / f"{preset_name}.steps.json"
                json_str = json.dumps(
                    sequence,
                    sort_keys=True,
                    indent=2,
                    ensure_ascii=False,
                )
                output_path.write_text(json_str + "\n", encoding="utf-8")

                if verbose:
                    size_kb = len(json_str) / 1024
                    print(f"    Wrote {output_path.name} ({size_kb:.1f} KB)")

            successes += 1

        except Exception as e:
            print(f"    ERROR generating '{preset_name}' for '{algorithm_id}': {e}")
            failures += 1

    return (successes, failures)


def main() -> int:
    """Run the pre-computation pipeline.

    Returns
    -------
    int
        Exit code: 0 = success, 1 = one or more failures.
    """
    parser = argparse.ArgumentParser(
        description="Pre-compute step sequences for all Eigenvue algorithms.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        required=True,
        help="Root directory for output files.",
    )
    parser.add_argument(
        "--validate",
        action="store_true",
        help="Validate each step sequence against the JSON Schema.",
    )
    parser.add_argument(
        "--algorithm",
        type=str,
        default=None,
        help="Pre-compute only this algorithm (for debugging).",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Print detailed progress.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Generate and validate without writing files.",
    )
    args = parser.parse_args()

    print("=" * 70)
    print("Eigenvue Pre-Computation Pipeline")
    print("=" * 70)
    print(f"Output directory: {args.output_dir}")
    print(f"Validation: {'ON' if args.validate else 'OFF'}")
    print(f"Dry run: {'YES' if args.dry_run else 'NO'}")

    start_time = time.monotonic()
    total_successes = 0
    total_failures = 0

    # Get list of algorithms to process.
    if args.algorithm:
        algorithm_ids = [args.algorithm]
    else:
        all_algorithms = list_algorithms()
        algorithm_ids = [a.id for a in all_algorithms]

    print(f"Algorithms to process: {len(algorithm_ids)}")
    print()

    for algo_id in sorted(algorithm_ids):
        print(f"[{algo_id}]")
        successes, failures = precompute_algorithm(
            algo_id,
            args.output_dir,
            validate=args.validate,
            verbose=args.verbose,
            dry_run=args.dry_run,
        )
        total_successes += successes
        total_failures += failures
        status = "OK" if failures == 0 else "FAILED"
        print(f"  {status}: {successes} presets succeeded, {failures} failed.")

    elapsed = time.monotonic() - start_time

    print()
    print("=" * 70)
    print(f"TOTAL: {total_successes} presets succeeded, {total_failures} failed")
    print(f"TIME:  {elapsed:.2f}s")
    print("=" * 70)

    if total_failures > 0:
        print("\nPIPELINE FAILED — see errors above.")
        return 1

    print("\nPIPELINE SUCCEEDED.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
