"""
Generator registry — maps algorithm IDs to their Python generate() functions.

Each generator module exposes a ``generate(inputs: dict) -> list[Step]`` function.
This registry imports all generators lazily and provides a lookup dict.

ADDING A NEW GENERATOR:
1. Create the module in the appropriate subdirectory.
2. Add the import and registry entry below.
3. Run the cross-language parity test to verify identical output.
"""

from __future__ import annotations

import importlib
from collections.abc import Callable
from typing import Any

# ── Lazy import approach ─────────────────────────────────────────────────────
# We define a registry that lazily imports generators on first access.
# This avoids loading all 17 generators (and their math dependencies)
# at package import time.

_REGISTRY_MAP: dict[str, tuple[str, str]] = {
    # (algorithm_id -> (module_path, function_name))
    # Classical
    "binary-search": ("eigenvue.generators.classical.binary_search", "generate"),
    "bubble-sort": ("eigenvue.generators.classical.bubble_sort", "generate"),
    "quicksort": ("eigenvue.generators.classical.quicksort", "generate"),
    "merge-sort": ("eigenvue.generators.classical.merge_sort", "generate"),
    "bfs": ("eigenvue.generators.classical.bfs", "generate"),
    "dfs": ("eigenvue.generators.classical.dfs", "generate"),
    "dijkstra": ("eigenvue.generators.classical.dijkstra", "generate"),
    # Generative AI
    "tokenization-bpe": ("eigenvue.generators.generative_ai.tokenization_bpe", "generate"),
    "token-embeddings": ("eigenvue.generators.generative_ai.token_embeddings", "generate"),
    "self-attention": ("eigenvue.generators.generative_ai.self_attention", "generate"),
    "multi-head-attention": (
        "eigenvue.generators.generative_ai.multi_head_attention",
        "generate",
    ),
    "transformer-block": ("eigenvue.generators.generative_ai.transformer_block", "generate"),
    # Deep Learning
    "perceptron": ("eigenvue.generators.deep_learning.perceptron", "generate"),
    "feedforward-network": ("eigenvue.generators.deep_learning.feedforward_network", "generate"),
    "backpropagation": ("eigenvue.generators.deep_learning.backpropagation", "generate"),
    "convolution": ("eigenvue.generators.deep_learning.convolution", "generate"),
    "gradient-descent": ("eigenvue.generators.deep_learning.gradient_descent", "generate"),
}

_loaded_generators: dict[str, Callable[..., Any]] = {}


class _GeneratorRegistry:
    """Lazy-loading generator registry that behaves like a dict.

    Generators are imported only when first accessed, avoiding the cost
    of loading all 17 modules at import time.
    """

    def __contains__(self, key: str) -> bool:
        """Check if an algorithm ID has a registered generator."""
        return key in _REGISTRY_MAP

    def __getitem__(self, key: str) -> Callable[..., Any]:
        """Get the generate() function for an algorithm ID."""
        if key not in _REGISTRY_MAP:
            raise KeyError(f"No generator registered for {key!r}")

        if key not in _loaded_generators:
            module_path, func_name = _REGISTRY_MAP[key]
            module = importlib.import_module(module_path)
            _loaded_generators[key] = getattr(module, func_name)

        return _loaded_generators[key]

    def keys(self) -> set[str]:
        """Return all registered algorithm IDs."""
        return set(_REGISTRY_MAP.keys())


GENERATOR_REGISTRY = _GeneratorRegistry()
