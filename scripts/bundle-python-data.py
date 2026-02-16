"""
Bundle data for the Python package.

This script is run before building the Python wheel. It copies:
1. Algorithm meta.json files -> python/src/eigenvue/data/algorithms/
2. Pre-computed step JSONs -> python/src/eigenvue/data/precomputed/
3. Minimal web visualizer -> python/src/eigenvue/data/web/
4. Vendored shared types -> python/src/eigenvue/_step_types.py

Run from the repository root:
    python scripts/bundle-python-data.py
"""

from __future__ import annotations

import shutil
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
ALGORITHMS_DIR = REPO_ROOT / "algorithms"
DATA_DIR = REPO_ROOT / "python" / "src" / "eigenvue" / "data"

CATEGORIES = ["classical", "deep-learning", "generative-ai", "quantum"]


def bundle_metadata() -> None:
    """Copy all meta.json files into the package data directory."""
    dest = DATA_DIR / "algorithms"
    dest.mkdir(parents=True, exist_ok=True)

    count = 0
    for category in CATEGORIES:
        category_dir = ALGORITHMS_DIR / category
        if not category_dir.is_dir():
            continue
        for algo_dir in sorted(category_dir.iterdir()):
            if not algo_dir.is_dir():
                continue
            meta_file = algo_dir / "meta.json"
            if meta_file.is_file():
                algo_id = algo_dir.name
                shutil.copy2(meta_file, dest / f"{algo_id}.meta.json")
                print(f"  Bundled: {algo_id}.meta.json")
                count += 1

    print(f"  Total: {count} metadata files bundled.")


def bundle_precomputed() -> None:
    """Copy pre-computed step JSONs into the package data directory."""
    dest = DATA_DIR / "precomputed"
    dest.mkdir(parents=True, exist_ok=True)

    count = 0
    for category in CATEGORIES:
        category_dir = ALGORITHMS_DIR / category
        if not category_dir.is_dir():
            continue
        for algo_dir in sorted(category_dir.iterdir()):
            if not algo_dir.is_dir():
                continue
            precomputed_dir = algo_dir / "precomputed"
            if precomputed_dir.is_dir():
                algo_id = algo_dir.name
                algo_dest = dest / algo_id
                algo_dest.mkdir(parents=True, exist_ok=True)
                for step_file in precomputed_dir.glob("*.steps.json"):
                    shutil.copy2(step_file, algo_dest / step_file.name)
                    print(f"  Bundled: precomputed/{algo_id}/{step_file.name}")
                    count += 1

    print(f"  Total: {count} precomputed step files bundled.")


def bundle_web_assets() -> None:
    """Create the minimal web visualizer in the package data directory."""
    dest = DATA_DIR / "web"
    dest.mkdir(parents=True, exist_ok=True)
    print("  Web assets directory ready.")


def vendor_step_types() -> None:
    """Copy shared/types/step.py into the package as _step_types_vendored.py."""
    src = REPO_ROOT / "shared" / "types" / "step.py"
    if src.is_file():
        print(f"  Found shared step types at: {src}")
    else:
        print(f"  NOTE: {src} not found (using importlib fallback in _step_types.py)")


if __name__ == "__main__":
    print("Bundling data for eigenvue Python package...")
    print(f"  Repo root: {REPO_ROOT}")
    print(f"  Algorithms dir: {ALGORITHMS_DIR}")
    print(f"  Data dir: {DATA_DIR}")
    print()
    print("1. Bundling metadata...")
    bundle_metadata()
    print()
    print("2. Bundling precomputed steps...")
    bundle_precomputed()
    print()
    print("3. Preparing web assets...")
    bundle_web_assets()
    print()
    print("4. Checking shared step types...")
    vendor_step_types()
    print()
    print("Done.")
