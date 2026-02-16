"""
=============================================================================
Tests for scripts/generate-algorithm-docs.py

Validates that the algorithm reference documentation generator:
  1. Correctly loads all meta.json files.
  2. Generates valid MDX content with required sections.
  3. Produces deterministic output (idempotent).
  4. Handles missing optional fields gracefully.
  5. Resolves related/prerequisite algorithm names correctly.
=============================================================================
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import pytest

# Import the generator script which uses hyphens in its filename.
SCRIPTS_DIR = Path(__file__).resolve().parent.parent.parent / "scripts"
_spec = importlib.util.spec_from_file_location(
    "generate_algorithm_docs",
    SCRIPTS_DIR / "generate-algorithm-docs.py",
)
generate_algorithm_docs = importlib.util.module_from_spec(_spec)
sys.modules["generate_algorithm_docs"] = generate_algorithm_docs
_spec.loader.exec_module(generate_algorithm_docs)


class TestLoadAllMeta:
    """Tests for the load_all_meta() function."""

    def test_loads_existing_algorithms(self) -> None:
        """Verify that load_all_meta finds all 22 algorithms."""
        from generate_algorithm_docs import load_all_meta

        all_meta = load_all_meta()

        # We expect exactly 22 algorithms from Phases 5, 6, 8, 9, and 14.
        assert len(all_meta) == 22, (
            f"Expected 22 algorithms, got {len(all_meta)}. "
            f"Found: {sorted(all_meta.keys())}"
        )

    def test_all_required_ids_present(self) -> None:
        """Verify that every expected algorithm ID is present."""
        from generate_algorithm_docs import load_all_meta

        all_meta = load_all_meta()

        expected_ids = {
            "binary-search", "bubble-sort", "quicksort", "merge-sort",
            "bfs", "dfs", "dijkstra",
            "perceptron", "feedforward-network", "backpropagation",
            "convolution", "gradient-descent",
            "tokenization-bpe", "token-embeddings", "self-attention",
            "multi-head-attention", "transformer-block",
            "qubit-bloch-sphere", "quantum-gates", "superposition-measurement",
            "grovers-search", "quantum-teleportation",
        }

        actual_ids = set(all_meta.keys())
        missing = expected_ids - actual_ids
        assert not missing, f"Missing algorithm IDs: {missing}"

    def test_every_meta_has_required_fields(self) -> None:
        """Verify that each meta.json has the minimum required fields."""
        from generate_algorithm_docs import load_all_meta

        all_meta = load_all_meta()

        for algo_id, meta in all_meta.items():
            assert "id" in meta, f"{algo_id}: missing 'id' field"
            assert "name" in meta, f"{algo_id}: missing 'name' field"
            assert "category" in meta, f"{algo_id}: missing 'category' field"
            assert "description" in meta, f"{algo_id}: missing 'description' field"
            assert "short" in meta["description"], (
                f"{algo_id}: missing 'description.short' field"
            )


class TestGenerateAlgorithmMdx:
    """Tests for the generate_algorithm_mdx() function."""

    def test_contains_frontmatter(self) -> None:
        """Generated MDX must start with valid YAML frontmatter."""
        from generate_algorithm_docs import generate_algorithm_mdx, load_all_meta

        all_meta = load_all_meta()
        meta = all_meta["binary-search"]
        content = generate_algorithm_mdx(meta, all_meta)

        assert content.startswith("---"), "MDX must start with frontmatter delimiter"
        # Second '---' closes the frontmatter.
        second_delimiter = content.index("---", 3)
        assert second_delimiter > 3, "Frontmatter must have a closing delimiter"

    def test_contains_required_sections(self) -> None:
        """Generated MDX must include Overview, Try It sections."""
        from generate_algorithm_docs import generate_algorithm_mdx, load_all_meta

        all_meta = load_all_meta()
        meta = all_meta["binary-search"]
        content = generate_algorithm_mdx(meta, all_meta)

        assert "## Overview" in content
        assert "## Try It" in content
        assert "eigenvue.show" in content

    def test_idempotent(self) -> None:
        """Running generation twice produces identical output."""
        from generate_algorithm_docs import generate_algorithm_mdx, load_all_meta

        all_meta = load_all_meta()
        meta = all_meta["binary-search"]

        content_1 = generate_algorithm_mdx(meta, all_meta)
        content_2 = generate_algorithm_mdx(meta, all_meta)

        assert content_1 == content_2, "Generation must be deterministic"

    def test_all_algorithms_generate_without_error(self) -> None:
        """Every algorithm's meta.json must produce valid MDX without exceptions."""
        from generate_algorithm_docs import generate_algorithm_mdx, load_all_meta

        all_meta = load_all_meta()

        for algo_id, meta in all_meta.items():
            # This should not raise any exceptions.
            content = generate_algorithm_mdx(meta, all_meta)
            assert len(content) > 100, (
                f"Generated content for {algo_id} is suspiciously short: "
                f"{len(content)} chars"
            )

    def test_auto_generation_notice_present(self) -> None:
        """Generated files must contain the auto-generation notice."""
        from generate_algorithm_docs import generate_algorithm_mdx, load_all_meta

        all_meta = load_all_meta()
        meta = all_meta["binary-search"]
        content = generate_algorithm_mdx(meta, all_meta)

        assert "auto-generated" in content.lower()

    def test_related_algorithms_resolved(self) -> None:
        """Related algorithm IDs should be resolved to display names."""
        from generate_algorithm_docs import generate_algorithm_mdx, load_all_meta

        all_meta = load_all_meta()
        meta = all_meta["binary-search"]
        content = generate_algorithm_mdx(meta, all_meta)

        # binary-search has related: ["bubble-sort", "quicksort", "merge-sort"]
        if meta.get("related"):
            assert "## Related Algorithms" in content

    def test_quiz_section_uses_details_tag(self) -> None:
        """Quiz answers should use <details> for progressive disclosure."""
        from generate_algorithm_docs import generate_algorithm_mdx, load_all_meta

        all_meta = load_all_meta()
        meta = all_meta["binary-search"]
        content = generate_algorithm_mdx(meta, all_meta)

        if meta.get("education", {}).get("quiz"):
            assert "<details>" in content
            assert "<summary>Show answer</summary>" in content

    def test_category_label_displayed(self) -> None:
        """The category should be displayed as a human-readable label."""
        from generate_algorithm_docs import generate_algorithm_mdx, load_all_meta

        all_meta = load_all_meta()
        meta = all_meta["binary-search"]
        content = generate_algorithm_mdx(meta, all_meta)

        assert "**Category:** Classical" in content
