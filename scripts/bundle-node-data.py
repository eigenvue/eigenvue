"""
Bundle data for the Node.js package.

Copies:
1. Algorithm meta.json files -> node/data/algorithms/

Run from the repository root:
    python scripts/bundle-node-data.py
"""

from __future__ import annotations

import shutil
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
ALGORITHMS_DIR = REPO_ROOT / "algorithms"
DATA_DIR = REPO_ROOT / "node" / "data"

CATEGORIES = ["classical", "deep-learning", "generative-ai"]


def bundle_metadata() -> None:
    """Copy all meta.json files into the node package data directory."""
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


def bundle_web_assets() -> None:
    """Copy the minimal web visualizer into the node package data directory.

    The visualizer files (index.html, styles.css, visualizer.js) are shared
    with the Python package. The source of truth is python/src/eigenvue/data/web/.
    """
    src = REPO_ROOT / "python" / "src" / "eigenvue" / "data" / "web"
    dest = DATA_DIR / "web"
    dest.mkdir(parents=True, exist_ok=True)

    if not src.is_dir():
        print(f"  WARNING: Web assets source not found at {src}")
        return

    count = 0
    for asset in sorted(src.iterdir()):
        if asset.is_file():
            shutil.copy2(asset, dest / asset.name)
            print(f"  Bundled: {asset.name}")
            count += 1

    print(f"  Total: {count} web asset files bundled.")


if __name__ == "__main__":
    print("Bundling data for eigenvue Node package...")
    print(f"  Repo root: {REPO_ROOT}")
    print()
    print("1. Bundling metadata...")
    bundle_metadata()
    print()
    print("2. Preparing web assets...")
    bundle_web_assets()
    print()
    print("Done.")
