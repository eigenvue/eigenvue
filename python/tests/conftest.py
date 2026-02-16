"""Shared test fixtures for Eigenvue test suite."""

from __future__ import annotations

import pytest

# ── Algorithm IDs by category ────────────────────────────────────────────────

CLASSICAL_IDS = [
    "binary-search",
    "bubble-sort",
    "quicksort",
    "merge-sort",
    "bfs",
    "dfs",
    "dijkstra",
]

GENAI_IDS = [
    "tokenization-bpe",
    "token-embeddings",
    "self-attention",
    "multi-head-attention",
    "transformer-block",
]

DL_IDS = [
    "perceptron",
    "feedforward-network",
    "backpropagation",
    "convolution",
    "gradient-descent",
]

ALL_ALGORITHM_IDS = CLASSICAL_IDS + GENAI_IDS + DL_IDS


@pytest.fixture(params=ALL_ALGORITHM_IDS)
def algorithm_id(request: pytest.FixtureRequest) -> str:
    """Parametrized fixture yielding every registered algorithm ID."""
    return request.param


@pytest.fixture(params=CLASSICAL_IDS)
def classical_id(request: pytest.FixtureRequest) -> str:
    """Parametrized fixture for classical algorithm IDs."""
    return request.param


@pytest.fixture(params=GENAI_IDS)
def genai_id(request: pytest.FixtureRequest) -> str:
    """Parametrized fixture for GenAI algorithm IDs."""
    return request.param


@pytest.fixture(params=DL_IDS)
def dl_id(request: pytest.FixtureRequest) -> str:
    """Parametrized fixture for deep learning algorithm IDs."""
    return request.param
