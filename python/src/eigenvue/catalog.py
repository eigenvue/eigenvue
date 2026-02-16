"""
Algorithm catalog — discovery and metadata for all available algorithms.

This module reads the bundled ``meta.json`` files that ship with the package
and provides a structured listing of available algorithms.

IMPLEMENTATION NOTES:
- Metadata is loaded lazily on first call, then cached.
- The bundled JSON files are copies of the ``algorithms/*/meta.json`` files
  from the repository, placed into ``data/algorithms/`` by the build script
  ``scripts/bundle-python-data.py``.
- This module NEVER imports or depends on the generators. It only reads JSON.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from importlib import resources
from pathlib import Path
from typing import Any

# ── Valid categories (must match TypeScript AlgorithmCategory type) ──────────
VALID_CATEGORIES = frozenset({"classical", "deep-learning", "generative-ai", "quantum"})


@dataclass(frozen=True, slots=True)
class AlgorithmInfo:
    """Immutable summary of an algorithm's metadata.

    This is the public type returned by ``eigenvue.list()``.
    It exposes the most useful fields from ``meta.json`` without
    requiring the user to parse nested JSON.

    Attributes
    ----------
    id : str
        URL-safe identifier (e.g., "binary-search").
    name : str
        Human-readable display name (e.g., "Binary Search").
    category : str
        One of: "classical", "deep-learning", "generative-ai", "quantum".
    description : str
        Short description (<=80 characters).
    difficulty : str
        One of: "beginner", "intermediate", "advanced", "expert".
    time_complexity : str
        Big-O time complexity (e.g., "O(log n)").
    space_complexity : str
        Big-O space complexity (e.g., "O(1)").
    """

    id: str
    name: str
    category: str
    description: str
    difficulty: str
    time_complexity: str
    space_complexity: str

    def __repr__(self) -> str:
        """Provide a readable repr for REPL and notebook display."""
        return (
            f"AlgorithmInfo(id={self.id!r}, name={self.name!r}, "
            f"category={self.category!r}, difficulty={self.difficulty!r})"
        )


# ── Internal cache ───────────────────────────────────────────────────────────

_catalog_cache: list[AlgorithmInfo] | None = None
_meta_cache: dict[str, dict[str, Any]] = {}


def _get_data_dir() -> Path:
    """Resolve the path to the bundled data directory.

    Returns
    -------
    Path
        Absolute path to ``eigenvue/data/``.

    Raises
    ------
    FileNotFoundError
        If the data directory is missing (bad installation).
    """
    # Use importlib.resources for reliable package data access
    # This works for both installed packages and editable installs.
    try:
        data_ref = resources.files("eigenvue") / "data"
        # resources.files returns a Traversable; convert to Path
        data_path = Path(str(data_ref))
    except (TypeError, FileNotFoundError):
        # Fallback: resolve relative to this file
        data_path = Path(__file__).parent / "data"

    if not data_path.is_dir():
        raise FileNotFoundError(
            f"Eigenvue data directory not found at {data_path}. "
            "This usually means the package was not installed correctly. "
            "Try: pip install --force-reinstall eigenvue"
        )
    return data_path


def _load_catalog() -> list[AlgorithmInfo]:
    """Load all algorithm metadata from bundled JSON files.

    Returns a sorted list of AlgorithmInfo objects (sorted by category,
    then by name).

    This function is called once and the result is cached.
    """
    data_dir = _get_data_dir()
    algorithms_dir = data_dir / "algorithms"

    if not algorithms_dir.is_dir():
        raise FileNotFoundError(f"Algorithms metadata directory not found at {algorithms_dir}.")

    catalog: list[AlgorithmInfo] = []

    for meta_file in sorted(algorithms_dir.glob("*.meta.json")):
        with open(meta_file, encoding="utf-8") as f:
            meta: dict[str, Any] = json.load(f)

        # Cache the full metadata for later use by the runner
        algo_id: str = meta["id"]
        _meta_cache[algo_id] = meta

        # Extract the fields we expose publicly
        info = AlgorithmInfo(
            id=algo_id,
            name=meta["name"],
            category=meta["category"],
            description=meta["description"]["short"],
            difficulty=meta["complexity"]["level"],
            time_complexity=meta["complexity"]["time"],
            space_complexity=meta["complexity"]["space"],
        )
        catalog.append(info)

    # Sort: category alphabetically, then name alphabetically within category
    catalog.sort(key=lambda a: (a.category, a.name))
    return catalog


def list_algorithms(category: str | None = None) -> list[AlgorithmInfo]:
    """Return the list of available algorithms, optionally filtered.

    Parameters
    ----------
    category : str or None
        If provided, only return algorithms in this category.

    Returns
    -------
    list[AlgorithmInfo]
        Sorted list of algorithm metadata.

    Raises
    ------
    ValueError
        If ``category`` is not a valid category string.
    """
    global _catalog_cache

    if category is not None and category not in VALID_CATEGORIES:
        raise ValueError(
            f"Invalid category {category!r}. "
            f"Valid categories: {', '.join(sorted(VALID_CATEGORIES))}"
        )

    if _catalog_cache is None:
        _catalog_cache = _load_catalog()

    if category is None:
        return list(_catalog_cache)  # Return a copy

    return [a for a in _catalog_cache if a.category == category]


def get_algorithm_meta(algorithm_id: str) -> dict[str, Any]:
    """Get the full metadata dict for an algorithm.

    Parameters
    ----------
    algorithm_id : str
        The algorithm identifier.

    Returns
    -------
    dict
        The complete meta.json contents.

    Raises
    ------
    ValueError
        If the algorithm ID is not recognized.
    """
    global _catalog_cache

    # Ensure catalog is loaded
    if _catalog_cache is None:
        _catalog_cache = _load_catalog()

    if algorithm_id not in _meta_cache:
        raise ValueError(
            f"Unknown algorithm {algorithm_id!r}. Use eigenvue.list() to see available algorithms."
        )

    return _meta_cache[algorithm_id]


def get_default_inputs(algorithm_id: str) -> dict[str, Any]:
    """Get the default input parameters for an algorithm.

    Parameters
    ----------
    algorithm_id : str
        The algorithm identifier.

    Returns
    -------
    dict
        Default input values from the algorithm's metadata.
    """
    meta = get_algorithm_meta(algorithm_id)
    return dict(meta["inputs"]["defaults"])
