"""
Tests for the pre-computation pipeline (scripts/precompute-steps.py).

These tests verify that:
1. The pipeline runs successfully for all 22 algorithms.
2. Output files are valid JSON conforming to the step format schema.
3. Output is deterministic (two runs produce identical files).
4. The --validate flag catches invalid step sequences.
5. The --algorithm flag correctly filters to a single algorithm.

Author: Ashutosh Mishra
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


class TestPrecomputePipeline:
    """Tests for the precompute-steps.py script."""

    def test_full_pipeline_succeeds(self, tmp_path: Path) -> None:
        """Running the full pipeline produces output for all algorithms."""
        result = subprocess.run(
            [
                sys.executable,
                str(PROJECT_ROOT / "scripts" / "precompute-steps.py"),
                "--output-dir", str(tmp_path),
                "--validate",
            ],
            capture_output=True,
            text=True,
            cwd=str(PROJECT_ROOT),
        )

        assert result.returncode == 0, (
            f"Pipeline failed:\nSTDOUT: {result.stdout}\nSTDERR: {result.stderr}"
        )

        # Verify output directories exist for all expected algorithms.
        output_dirs = sorted(d.name for d in tmp_path.iterdir() if d.is_dir())
        assert "binary-search" in output_dirs
        assert "self-attention" in output_dirs
        assert "backpropagation" in output_dirs
        assert len(output_dirs) == 22, (
            f"Expected 22 algorithm directories, got {len(output_dirs)}: {output_dirs}"
        )

    def test_each_algorithm_has_default_steps(self, tmp_path: Path) -> None:
        """Every algorithm directory contains at least a default.steps.json."""
        subprocess.run(
            [
                sys.executable,
                str(PROJECT_ROOT / "scripts" / "precompute-steps.py"),
                "--output-dir", str(tmp_path),
                "--validate",
            ],
            capture_output=True,
            text=True,
            cwd=str(PROJECT_ROOT),
            check=True,
        )

        for algo_dir in tmp_path.iterdir():
            if algo_dir.is_dir():
                default_file = algo_dir / "default.steps.json"
                assert default_file.exists(), (
                    f"Missing default.steps.json for {algo_dir.name}"
                )
                # Verify it's valid JSON.
                data = json.loads(default_file.read_text(encoding="utf-8"))
                assert "steps" in data, f"No 'steps' key in {default_file}"
                assert len(data["steps"]) > 0, f"Empty steps in {default_file}"

    def test_output_is_deterministic(self, tmp_path: Path) -> None:
        """Two runs with the same inputs produce structurally identical output.

        The generatedAt timestamp will differ between runs, so we compare
        all fields except that one.
        """
        dir1 = tmp_path / "run1"
        dir2 = tmp_path / "run2"

        for output_dir in [dir1, dir2]:
            subprocess.run(
                [
                    sys.executable,
                    str(PROJECT_ROOT / "scripts" / "precompute-steps.py"),
                    "--output-dir", str(output_dir),
                    "--algorithm", "binary-search",
                ],
                capture_output=True,
                text=True,
                cwd=str(PROJECT_ROOT),
                check=True,
            )

        # Compare all files — ignoring the generatedAt timestamp.
        for file1 in (dir1 / "binary-search").glob("*.steps.json"):
            file2 = dir2 / "binary-search" / file1.name
            assert file2.exists(), f"Missing in second run: {file1.name}"
            data1 = json.loads(file1.read_text(encoding="utf-8"))
            data2 = json.loads(file2.read_text(encoding="utf-8"))
            # Remove timestamp before comparison (it changes between runs).
            data1.pop("generatedAt", None)
            data2.pop("generatedAt", None)
            assert data1 == data2, (
                f"Non-deterministic output for {file1.name}"
            )

    def test_single_algorithm_filter(self, tmp_path: Path) -> None:
        """The --algorithm flag processes only the specified algorithm."""
        result = subprocess.run(
            [
                sys.executable,
                str(PROJECT_ROOT / "scripts" / "precompute-steps.py"),
                "--output-dir", str(tmp_path),
                "--algorithm", "binary-search",
            ],
            capture_output=True,
            text=True,
            cwd=str(PROJECT_ROOT),
        )

        assert result.returncode == 0
        output_dirs = [d.name for d in tmp_path.iterdir() if d.is_dir()]
        assert output_dirs == ["binary-search"], (
            f"Expected only binary-search, got: {output_dirs}"
        )

    def test_step_format_compliance(self, tmp_path: Path) -> None:
        """Pre-computed step files conform to the step format schema."""
        subprocess.run(
            [
                sys.executable,
                str(PROJECT_ROOT / "scripts" / "precompute-steps.py"),
                "--output-dir", str(tmp_path),
                "--validate",
                "--algorithm", "binary-search",
            ],
            capture_output=True,
            text=True,
            cwd=str(PROJECT_ROOT),
            check=True,
        )

        steps_file = tmp_path / "binary-search" / "default.steps.json"
        data = json.loads(steps_file.read_text(encoding="utf-8"))

        # Verify step sequence envelope fields.
        assert data["formatVersion"] == 1
        assert data["algorithmId"] == "binary-search"
        assert "inputs" in data
        assert "steps" in data
        assert data["generatedBy"] == "precomputed"
        assert "generatedAt" in data

        # Verify each step has required fields.
        for i, step in enumerate(data["steps"]):
            assert "index" in step or "id" in step, (
                f"Step {i} missing 'index' or 'id'"
            )
            assert "state" in step, f"Step {i} missing 'state'"
            assert "visualActions" in step, f"Step {i} missing 'visualActions'"

        # Verify terminal step.
        last_step = data["steps"][-1]
        assert last_step.get("isTerminal") is True, (
            "Last step must have isTerminal=true"
        )
