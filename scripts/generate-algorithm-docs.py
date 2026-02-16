#!/usr/bin/env python3
"""
=============================================================================
Eigenvue — Algorithm Reference Documentation Generator

Reads all algorithms/*/meta.json files and generates corresponding .mdx
documentation pages in docs/src/content/docs/algorithms/.

USAGE:
    python scripts/generate-algorithm-docs.py
    python scripts/generate-algorithm-docs.py --algorithm binary-search
    python scripts/generate-algorithm-docs.py --dry-run
    python scripts/generate-algorithm-docs.py --check  # Verify generated files are up to date

HOW IT WORKS:
    1. Scans algorithms/ directory for all meta.json files.
    2. Parses each meta.json and validates required fields.
    3. Generates an .mdx file from the template for each algorithm.
    4. Writes the .mdx files to docs/src/content/docs/algorithms/.

DESIGN NOTES:
    - Generated files ARE checked into version control. This ensures the
      docs build works without running this script first.
    - The --check flag is used in CI to verify that generated files are
      up to date with their meta.json sources. If they diverge, CI fails.
    - The script is idempotent: running it twice produces identical output.
    - Algorithm names in "Related Algorithms" and "Prerequisites" sections
      are resolved by loading all meta.json files first, then looking up
      display names by ID.

EXIT CODES:
    0  Success (generation complete or --check passed).
    1  Error (missing files, stale docs, or invalid meta.json).
=============================================================================
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Root of the monorepo (this script lives in scripts/).
REPO_ROOT = Path(__file__).resolve().parent.parent

# Directory containing algorithm definitions.
ALGORITHMS_DIR = REPO_ROOT / "algorithms"

# Output directory for generated .mdx files.
OUTPUT_DIR = REPO_ROOT / "docs" / "src" / "content" / "docs" / "algorithms"

# Category display names and order.
CATEGORY_LABELS: dict[str, str] = {
    "classical": "Classical",
    "deep-learning": "Deep Learning",
    "generative-ai": "Generative AI",
    "quantum": "Quantum Computing",
}


# ---------------------------------------------------------------------------
# Meta.json Loading
# ---------------------------------------------------------------------------

def load_all_meta() -> dict[str, dict]:
    """
    Load all meta.json files from the algorithms directory.

    Returns:
        A dictionary mapping algorithm ID to parsed meta.json content.
        Example: {"binary-search": {...}, "quicksort": {...}, ...}

    Raises:
        FileNotFoundError: If the algorithms directory does not exist.
        json.JSONDecodeError: If any meta.json file contains invalid JSON.
    """
    all_meta: dict[str, dict] = {}

    if not ALGORITHMS_DIR.exists():
        raise FileNotFoundError(f"Algorithms directory not found: {ALGORITHMS_DIR}")

    # Walk category directories (classical/, deep-learning/, etc.)
    for category_dir in sorted(ALGORITHMS_DIR.iterdir()):
        if not category_dir.is_dir():
            continue

        # Walk algorithm directories within each category.
        for algo_dir in sorted(category_dir.iterdir()):
            if not algo_dir.is_dir():
                continue

            meta_path = algo_dir / "meta.json"
            if not meta_path.exists():
                print(f"  WARNING: No meta.json found in {algo_dir}, skipping.")
                continue

            with open(meta_path, "r", encoding="utf-8") as f:
                meta = json.load(f)

            algo_id = meta.get("id", algo_dir.name)
            all_meta[algo_id] = meta

    return all_meta


# ---------------------------------------------------------------------------
# MDX Generation
# ---------------------------------------------------------------------------

def generate_algorithm_mdx(meta: dict, all_meta: dict[str, dict]) -> str:
    """
    Generate the .mdx content for a single algorithm reference page.

    Args:
        meta: The parsed meta.json content for this algorithm.
        all_meta: All parsed meta.json files (for resolving related/prerequisite names).

    Returns:
        The complete .mdx file content as a string.
    """
    algo_id = meta["id"]
    name = meta["name"]
    category = meta.get("category", "unknown")
    category_label = CATEGORY_LABELS.get(category, category.title())
    description_short = meta.get("description", {}).get("short", "")
    description_long = meta.get("description", {}).get("long", "")
    complexity = meta.get("complexity", {})
    inputs_obj = meta.get("inputs", {})
    code_obj = meta.get("code", {})
    education = meta.get("education", {})
    prerequisites = meta.get("prerequisites", [])
    related = meta.get("related", [])

    lines: list[str] = []

    # -- Frontmatter --------------------------------------------------------
    lines.append("---")
    lines.append(f'title: "{_escape_yaml(name)}"')
    lines.append(f'description: "{_escape_yaml(description_short)}"')
    lines.append("---")
    lines.append("")

    # -- Auto-generation notice ---------------------------------------------
    lines.append(
        "{/* This file is auto-generated by scripts/generate-algorithm-docs.py. */}"
    )
    lines.append(
        "{/* Do not edit manually — changes will be overwritten. */}"
    )
    lines.append(
        "{/* To update, modify the algorithm's meta.json and re-run the script. */}"
    )
    lines.append("")

    # -- Category badge and metadata ----------------------------------------
    lines.append(f"**Category:** {category_label}  ")
    lines.append(
        f"**Difficulty:** {complexity.get('level', 'N/A').title()}  "
    )
    lines.append(
        f"**Time Complexity:** `{complexity.get('time', 'N/A')}`  "
    )
    lines.append(
        f"**Space Complexity:** `{complexity.get('space', 'N/A')}`"
    )
    lines.append("")

    # -- Overview -----------------------------------------------------------
    lines.append("## Overview")
    lines.append("")
    if description_long:
        lines.append(_escape_mdx(description_long))
    else:
        lines.append(_escape_mdx(description_short))
    lines.append("")

    # -- Try It -------------------------------------------------------------
    lines.append("## Try It")
    lines.append("")
    lines.append(
        f"- **Web:** [Open in Eigenvue →](https://eigenvue.web.app/algo/{algo_id})"
    )
    lines.append("- **Python:**")
    lines.append("  ```python")
    lines.append("  import eigenvue")
    lines.append(f'  eigenvue.show("{algo_id}")')
    lines.append("  ```")
    lines.append("")

    # -- Default Inputs -----------------------------------------------------
    defaults = inputs_obj.get("defaults", {})
    if defaults:
        lines.append("## Default Inputs")
        lines.append("")
        lines.append("```json")
        lines.append(json.dumps(defaults, indent=2))
        lines.append("```")
        lines.append("")

    # -- Input Examples -----------------------------------------------------
    examples = inputs_obj.get("examples", [])
    if examples:
        lines.append("## Input Examples")
        lines.append("")
        for example in examples:
            ex_name = example.get("name", "Unnamed")
            ex_values = example.get("values", {})
            lines.append(f"### {ex_name}")
            lines.append("")
            lines.append("```json")
            lines.append(json.dumps(ex_values, indent=2))
            lines.append("```")
            lines.append("")

    # -- Code Implementations -----------------------------------------------
    implementations = code_obj.get("implementations", {})
    if implementations:
        lines.append("## Code")
        lines.append("")

        if "pseudocode" in implementations:
            lines.append("### Pseudocode")
            lines.append("")
            lines.append("```")
            lines.append(implementations["pseudocode"])
            lines.append("```")
            lines.append("")

        if "python" in implementations:
            lines.append("### Python")
            lines.append("")
            lines.append("```python")
            lines.append(implementations["python"])
            lines.append("```")
            lines.append("")

        if "javascript" in implementations:
            lines.append("### JavaScript")
            lines.append("")
            lines.append("```javascript")
            lines.append(implementations["javascript"])
            lines.append("```")
            lines.append("")

    # -- Key Concepts -------------------------------------------------------
    key_concepts = education.get("keyConcepts", [])
    if key_concepts:
        lines.append("## Key Concepts")
        lines.append("")
        for concept in key_concepts:
            lines.append(f"### {concept.get('title', 'Concept')}")
            lines.append("")
            lines.append(_escape_mdx(concept.get("description", "")))
            lines.append("")

    # -- Common Pitfalls ----------------------------------------------------
    pitfalls = education.get("pitfalls", [])
    if pitfalls:
        lines.append("## Common Pitfalls")
        lines.append("")
        for pitfall in pitfalls:
            lines.append(
                f"- **{_escape_mdx(pitfall.get('title', 'Pitfall'))}:** "
                f"{_escape_mdx(pitfall.get('description', ''))}"
            )
        lines.append("")

    # -- Quiz ---------------------------------------------------------------
    quiz = education.get("quiz", [])
    if quiz:
        lines.append("## Quiz")
        lines.append("")
        for i, q in enumerate(quiz, start=1):
            question = q.get("question", "")
            options = q.get("options", [])
            correct_index = q.get("correctIndex", 0)
            explanation = q.get("explanation", "")

            lines.append(f"**Q{i}: {_escape_mdx(question)}**")
            lines.append("")
            for j, opt in enumerate(options):
                prefix = chr(65 + j)  # A, B, C, D
                lines.append(f"- {prefix}) {_escape_mdx(opt)}")
            lines.append("")
            lines.append("<details>")
            lines.append("<summary>Show answer</summary>")
            lines.append("")
            if correct_index < len(options):
                correct_letter = chr(65 + correct_index)
                lines.append(
                    f"**Answer:** {correct_letter}) {_escape_mdx(options[correct_index])}"
                )
            if explanation:
                lines.append("")
                lines.append(_escape_mdx(explanation))
            lines.append("")
            lines.append("</details>")
            lines.append("")

    # -- Further Reading ----------------------------------------------------
    resources = education.get("resources", [])
    if resources:
        lines.append("## Further Reading")
        lines.append("")
        for res in resources:
            res_title = res.get("title", "Resource")
            res_url = res.get("url", "#")
            res_type = res.get("type", "")
            type_suffix = f" ({res_type})" if res_type else ""
            lines.append(f"- [{res_title}]({res_url}){type_suffix}")
        lines.append("")

    # -- Related Algorithms -------------------------------------------------
    if related:
        lines.append("## Related Algorithms")
        lines.append("")
        for rel_id in related:
            rel_meta = all_meta.get(rel_id)
            if rel_meta:
                rel_name = rel_meta["name"]
                lines.append(f"- [{rel_name}](/docs/algorithms/{rel_id}/)")
            else:
                lines.append(f"- {rel_id}")
        lines.append("")

    # -- Prerequisites ------------------------------------------------------
    if prerequisites:
        lines.append("## Prerequisites")
        lines.append("")
        for prereq_id in prerequisites:
            prereq_meta = all_meta.get(prereq_id)
            if prereq_meta:
                prereq_name = prereq_meta["name"]
                lines.append(f"- [{prereq_name}](/docs/algorithms/{prereq_id}/)")
            else:
                lines.append(f"- {prereq_id}")
        lines.append("")

    return "\n".join(lines)


def _escape_yaml(text: str) -> str:
    """Escape characters that would break YAML string values."""
    return text.replace('"', '\\"').replace("\n", " ")


def _escape_mdx(text: str) -> str:
    """Escape angle brackets in plain text to prevent MDX JSX parsing.

    MDX treats bare ``<`` as JSX element openers. In educational text fields
    (pitfalls, quiz questions, etc.) we often have comparison operators like
    ``<`` and ``<=``. This function escapes them to HTML entities so MDX
    renders them as literal characters.
    """
    import re

    # Replace < that is NOT followed by a valid HTML tag name (letter).
    # This preserves intentional HTML like <details> or <summary> while
    # escaping comparison operators like < and <=.
    return re.sub(r"<(?![a-zA-Z/!])", r"&lt;", text)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate algorithm reference .mdx files from meta.json."
    )
    parser.add_argument(
        "--algorithm",
        type=str,
        default=None,
        help="Generate docs for a single algorithm ID only.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print generated content to stdout instead of writing files.",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Verify generated files are up to date (for CI). Exit 1 if stale.",
    )
    args = parser.parse_args()

    print("Loading all meta.json files...")
    all_meta = load_all_meta()
    print(f"  Found {len(all_meta)} algorithm(s).")

    # Filter to a single algorithm if requested.
    if args.algorithm:
        if args.algorithm not in all_meta:
            print(f"ERROR: Algorithm '{args.algorithm}' not found.")
            print(f"Available: {', '.join(sorted(all_meta.keys()))}")
            return 1
        targets = {args.algorithm: all_meta[args.algorithm]}
    else:
        targets = all_meta

    # Ensure the output directory exists.
    if not args.dry_run and not args.check:
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    stale_files: list[str] = []

    for algo_id, meta in sorted(targets.items()):
        print(f"  Generating: {algo_id}.mdx ...")
        content = generate_algorithm_mdx(meta, all_meta)

        output_path = OUTPUT_DIR / f"{algo_id}.mdx"

        if args.dry_run:
            print("=" * 72)
            print(f"FILE: {output_path}")
            print("=" * 72)
            print(content)
            print()
            continue

        if args.check:
            # Compare generated content with existing file.
            if not output_path.exists():
                print(f"    STALE: {output_path} does not exist.")
                stale_files.append(str(output_path))
            else:
                existing_content = output_path.read_text(encoding="utf-8")
                if existing_content != content:
                    print(f"    STALE: {output_path} differs from generated content.")
                    stale_files.append(str(output_path))
                else:
                    print(f"    OK: {output_path} is up to date.")
            continue

        # Write the file.
        output_path.write_text(content, encoding="utf-8")
        print(f"    Wrote: {output_path}")

    # --check mode: report results.
    if args.check:
        if stale_files:
            print()
            print("ERROR: The following generated docs are out of date:")
            for f in stale_files:
                print(f"  - {f}")
            print()
            print("Run 'python scripts/generate-algorithm-docs.py' to regenerate.")
            return 1
        else:
            print()
            print("All generated algorithm docs are up to date.")
            return 0

    print()
    print(f"Done. Generated {len(targets)} algorithm reference page(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
