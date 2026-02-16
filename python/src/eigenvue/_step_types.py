"""
Vendored step types from shared/types/step.py.

This file re-exports the Step, VisualAction, and CodeHighlight
dataclasses from the shared repository types. During development,
it imports from the shared directory. In a built package, the types
are copied into this file by the build script.

WHY VENDOR: The shared/types/step.py lives in the monorepo's shared/
directory, which is not inside the Python package tree. The build script
copies it here so it ships with the pip-installed package.
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
from typing import Any

# ── Locate and load the shared step types ────────────────────────────────────
# The shared/types/step.py cannot be imported with a normal import statement
# because `types` shadows Python's built-in types module. Instead, we use
# importlib to load the module from its file path directly.

_STEP_MODULE_NAME = "_eigenvue_step_types_shared"


def _load_step_module() -> Any:
    """Load shared/types/step.py using importlib to avoid naming conflicts."""
    # Try multiple candidate paths to find the shared types
    candidates = [
        # From python/src/eigenvue/ → eigenvue/shared/types/step.py
        Path(__file__).resolve().parent.parent.parent.parent / "shared" / "types" / "step.py",
        # Alternative: from eigenvue root
        Path(__file__).resolve().parent.parent.parent.parent.parent
        / "shared"
        / "types"
        / "step.py",
    ]

    for step_file in candidates:
        if step_file.is_file():
            spec = importlib.util.spec_from_file_location(_STEP_MODULE_NAME, step_file)
            if spec is not None and spec.loader is not None:
                module = importlib.util.module_from_spec(spec)
                sys.modules[_STEP_MODULE_NAME] = module
                spec.loader.exec_module(module)
                return module

    raise ImportError(
        "Cannot import Eigenvue step types. Searched paths:\n"
        + "\n".join(f"  - {p}" for p in candidates)
        + "\nIf you're developing locally, ensure the shared/types/ directory exists. "
        "If you installed via pip, the package may be corrupted — try reinstalling."
    )


_step_mod = _load_step_module()

Step = _step_mod.Step
VisualAction = _step_mod.VisualAction
CodeHighlight = _step_mod.CodeHighlight
StepSequence = _step_mod.StepSequence
STEP_FORMAT_VERSION = _step_mod.STEP_FORMAT_VERSION

__all__ = [
    "STEP_FORMAT_VERSION",
    "CodeHighlight",
    "Step",
    "StepSequence",
    "VisualAction",
]
