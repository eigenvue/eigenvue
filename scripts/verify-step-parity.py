"""
Cross-Language Step Parity Verification

This script ensures that the Python and TypeScript type definitions
produce IDENTICAL JSON output for the same logical step sequences.

It works by:
1. Loading each golden fixture (which is already in camelCase JSON format).
2. Deserializing it into Python dataclasses via from_dict().
3. Re-serializing it via to_dict().
4. Comparing the re-serialized output to the original JSON.

If the round-trip produces identical JSON, the Python dataclasses are
proven to be wire-compatible with the TypeScript interfaces.

Usage:
    python scripts/verify-step-parity.py

Exit codes:
    0 — All fixtures round-trip cleanly.
    1 — At least one fixture failed.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

# Ensure the shared module is importable.
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from shared.types.step import StepSequence


def normalize_json(obj: object) -> str:
    """Serialize to deterministic JSON for comparison.

    Uses sorted keys and consistent indentation so that
    semantically identical objects always produce identical strings.
    """
    return json.dumps(obj, sort_keys=True, indent=2, ensure_ascii=False)


def verify_fixture(fixture_path: Path) -> bool:
    """Verify that a fixture round-trips through Python dataclasses.

    Args:
        fixture_path: Path to a .fixture.json file.

    Returns:
        True if the round-trip produces identical JSON, False otherwise.
    """
    with open(fixture_path, "r", encoding="utf-8") as f:
        original_data = json.load(f)

    # The fixture file may contain a top-level "description" key that is
    # not part of the StepSequence schema. We need to extract just the
    # StepSequence fields.
    sequence_keys = {
        "formatVersion", "algorithmId", "inputs", "steps",
        "generatedAt", "generatedBy",
    }
    sequence_data = {k: v for k, v in original_data.items() if k in sequence_keys}

    # Round-trip: JSON → Python dataclass → JSON
    try:
        sequence = StepSequence.from_dict(sequence_data)
        round_tripped = sequence.to_dict()
    except Exception as e:
        print(f"  FAIL: Exception during round-trip: {e}")
        return False

    original_normalized = normalize_json(sequence_data)
    round_trip_normalized = normalize_json(round_tripped)

    if original_normalized == round_trip_normalized:
        return True
    else:
        print(f"  FAIL: Round-trip mismatch.")
        # Show first difference for debugging.
        orig_lines = original_normalized.splitlines()
        rt_lines = round_trip_normalized.splitlines()
        for i, (a, b) in enumerate(zip(orig_lines, rt_lines)):
            if a != b:
                print(f"  First diff at line {i + 1}:")
                print(f"    Original:     {a}")
                print(f"    Round-trip:   {b}")
                break
        return False


def main() -> int:
    """Run parity verification on all valid fixtures.

    Returns:
        0 if all pass, 1 if any fail.
    """
    fixtures_dir = PROJECT_ROOT / "shared" / "fixtures"
    valid_fixtures = [
        "binary-search-found.fixture.json",
        "binary-search-not-found.fixture.json",
        "single-element.fixture.json",
        "minimal-valid.fixture.json",
    ]

    all_passed = True

    print("=" * 60)
    print("Cross-Language Step Parity Verification")
    print("=" * 60)

    for name in valid_fixtures:
        path = fixtures_dir / name
        print(f"\nVerifying: {name}")

        if not path.exists():
            print(f"  SKIP: File not found at {path}")
            all_passed = False
            continue

        if verify_fixture(path):
            print(f"  PASS")
        else:
            all_passed = False

    print("\n" + "=" * 60)
    if all_passed:
        print("ALL FIXTURES PASSED")
    else:
        print("SOME FIXTURES FAILED")
    print("=" * 60)

    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
