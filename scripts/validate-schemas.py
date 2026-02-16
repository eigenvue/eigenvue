"""
JSON Schema Validation — Eigenvue

Validates all meta.json files and test fixtures against their JSON Schemas.
This catches schema drift: if someone modifies a meta.json in a way that
violates the schema (missing required field, wrong type, etc.), this
script fails BEFORE any generator even runs.

USAGE:
    python scripts/validate-schemas.py --meta
    python scripts/validate-schemas.py --fixtures
    python scripts/validate-schemas.py --meta --fixtures

FLAGS:
    --meta       Validate all algorithms/*/meta.json against meta.schema.json.
    --fixtures   Validate all shared/fixtures/*.fixture.json against
                 step-format.schema.json.

EXIT CODES:
    0  All files valid.
    1  One or more files failed validation.

Author: Ashutosh Mishra
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import jsonschema
from jsonschema import Draft202012Validator

PROJECT_ROOT = Path(__file__).resolve().parent.parent


def validate_files_against_schema(
    files: list[Path],
    schema_path: Path,
    label: str,
) -> int:
    """Validate a list of JSON files against a schema.

    Parameters
    ----------
    files : list[Path]
        JSON files to validate.
    schema_path : Path
        Path to the JSON Schema file.
    label : str
        Human-readable label for progress output.

    Returns
    -------
    int
        Number of files that failed validation.
    """
    with open(schema_path, encoding="utf-8") as f:
        schema = json.load(f)

    validator = Draft202012Validator(schema, format_checker=jsonschema.FormatChecker())
    failures = 0

    for file_path in sorted(files):
        rel_path = file_path.relative_to(PROJECT_ROOT)
        try:
            with open(file_path, encoding="utf-8") as f:
                data = json.load(f)
        except json.JSONDecodeError as e:
            print(f"  FAIL {rel_path}: invalid JSON — {e}")
            failures += 1
            continue

        errors = list(validator.iter_errors(data))
        if errors:
            print(f"  FAIL {rel_path}: {len(errors)} schema error(s)")
            for err in errors[:3]:
                path = "/".join(str(p) for p in err.absolute_path) or "/"
                print(f"       /{path}: {err.message}")
            if len(errors) > 3:
                print(f"       ... and {len(errors) - 3} more")
            failures += 1
        else:
            print(f"  OK   {rel_path}")

    return failures


def main() -> int:
    """Entry point."""
    parser = argparse.ArgumentParser(
        description="Validate JSON files against Eigenvue schemas.",
    )
    parser.add_argument(
        "--meta",
        action="store_true",
        help="Validate all meta.json files.",
    )
    parser.add_argument(
        "--fixtures",
        action="store_true",
        help="Validate all fixture files.",
    )
    args = parser.parse_args()

    if not args.meta and not args.fixtures:
        parser.error("Specify --meta and/or --fixtures.")

    total_failures = 0

    if args.meta:
        print("=" * 60)
        print("Validating meta.json files")
        print("=" * 60)

        meta_schema = PROJECT_ROOT / "shared" / "meta.schema.json"
        if not meta_schema.exists():
            print(f"ERROR: Schema not found: {meta_schema}")
            return 1

        meta_files = list((PROJECT_ROOT / "algorithms").rglob("meta.json"))
        if not meta_files:
            print("  WARNING: No meta.json files found.")
        else:
            failures = validate_files_against_schema(meta_files, meta_schema, "meta")
            total_failures += failures
            print(f"\n{len(meta_files) - failures}/{len(meta_files)} passed.\n")

    if args.fixtures:
        print("=" * 60)
        print("Validating fixture files")
        print("=" * 60)

        step_schema = PROJECT_ROOT / "shared" / "step-format.schema.json"
        if not step_schema.exists():
            print(f"ERROR: Schema not found: {step_schema}")
            return 1

        fixture_files = list((PROJECT_ROOT / "shared" / "fixtures").glob("*.fixture.json"))
        if not fixture_files:
            print("  WARNING: No fixture files found.")
        else:
            failures = validate_files_against_schema(fixture_files, step_schema, "fixture")
            total_failures += failures
            print(f"\n{len(fixture_files) - failures}/{len(fixture_files)} passed.\n")

    if total_failures > 0:
        print(f"VALIDATION FAILED: {total_failures} file(s) have schema errors.")
        return 1

    print("ALL FILES VALID.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
