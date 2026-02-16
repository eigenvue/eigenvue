"""
Eigenvue — The visual learning platform for understanding algorithms.

Usage::

    import eigenvue

    # List all available algorithms
    eigenvue.list()

    # List algorithms by category
    eigenvue.list(category="classical")

    # Open a visualization in your default browser
    eigenvue.show("binary-search")

    # Open with custom inputs
    eigenvue.show("binary-search", inputs={"array": [2, 4, 6, 8, 10], "target": 6})

    # Get step data for programmatic inspection
    steps = eigenvue.steps("self-attention")

    # Display in a Jupyter notebook
    eigenvue.jupyter("self-attention")
"""

from __future__ import annotations

__version__ = "1.0.1"

from typing import Any

from eigenvue.catalog import AlgorithmInfo, list_algorithms
from eigenvue.runner import run_generator


def list(category: str | None = None) -> list[AlgorithmInfo]:
    """List available algorithms with their metadata.

    Parameters
    ----------
    category : str or None, optional
        Filter by category. Valid values: "classical", "deep-learning",
        "generative-ai", "quantum". If None, returns all algorithms.

    Returns
    -------
    list[AlgorithmInfo]
        A list of algorithm metadata objects, each with fields:
        ``id``, ``name``, ``category``, ``description``, ``difficulty``,
        ``time_complexity``, ``space_complexity``.

    Raises
    ------
    ValueError
        If ``category`` is not a valid category string.

    Examples
    --------
    >>> import eigenvue
    >>> all_algos = eigenvue.list()
    >>> classical = eigenvue.list(category="classical")
    >>> for algo in classical:
    ...     print(f"{algo.name} -- {algo.time_complexity}")
    """
    return list_algorithms(category=category)


def show(
    algorithm_id: str,
    inputs: dict[str, Any] | None = None,
    *,
    port: int = 0,
    open_browser: bool = True,
) -> None:
    """Launch an interactive visualization in the browser.

    Starts a lightweight local server and opens the visualization in the
    default web browser. The server shuts down when the Python process exits
    or when Ctrl+C is pressed.

    Parameters
    ----------
    algorithm_id : str
        The algorithm identifier (e.g., "binary-search", "self-attention").
        Use ``eigenvue.list()`` to see all available IDs.
    inputs : dict or None, optional
        Custom input parameters for the algorithm. If None, uses the
        algorithm's default inputs from its metadata.
    port : int, optional
        TCP port for the local server. Default 0 selects a random
        available port.
    open_browser : bool, optional
        Whether to automatically open the default browser. Default True.

    Raises
    ------
    ValueError
        If ``algorithm_id`` is not a recognized algorithm.
    TypeError
        If ``inputs`` contains values that are not JSON-serializable.

    Examples
    --------
    >>> eigenvue.show("binary-search")
    >>> eigenvue.show("self-attention", inputs={"tokens": ["I", "love", "AI"], "embeddingDim": 4})
    """
    # Import lazily to avoid slow startup if user only needs steps()
    from eigenvue.server import launch_server

    launch_server(
        algorithm_id=algorithm_id,
        inputs=inputs,
        port=port,
        open_browser=open_browser,
    )


def steps(
    algorithm_id: str,
    inputs: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    """Generate and return the step sequence for an algorithm.

    Each step is a dictionary matching the Eigenvue step format (camelCase
    keys for JSON compatibility). This is useful for:
    - Programmatic inspection of algorithm behavior
    - Exporting steps to JSON for external tools
    - Testing and verification

    Parameters
    ----------
    algorithm_id : str
        The algorithm identifier (e.g., "binary-search", "self-attention").
    inputs : dict or None, optional
        Custom input parameters. If None, uses defaults from metadata.

    Returns
    -------
    list[dict[str, Any]]
        Ordered list of step dictionaries. Each step has keys:
        ``index``, ``id``, ``title``, ``explanation``, ``state``,
        ``visualActions``, ``codeHighlight``, ``isTerminal``, and
        optionally ``phase``.

    Raises
    ------
    ValueError
        If ``algorithm_id`` is not recognized.

    Examples
    --------
    >>> steps = eigenvue.steps("binary-search", inputs={"array": [1, 3, 5, 7], "target": 5})
    >>> len(steps)
    5
    >>> steps[-1]["isTerminal"]
    True
    """
    return run_generator(algorithm_id=algorithm_id, inputs=inputs)


def jupyter(
    algorithm_id: str,
    inputs: dict[str, Any] | None = None,
    *,
    width: str = "100%",
    height: str = "600px",
) -> Any:
    """Display an interactive visualization in a Jupyter notebook.

    Returns an IFrame widget that embeds a local visualization server.
    Works in JupyterLab, Jupyter Notebook, and Google Colab.

    Parameters
    ----------
    algorithm_id : str
        The algorithm identifier.
    inputs : dict or None, optional
        Custom input parameters. If None, uses defaults.
    width : str, optional
        CSS width for the IFrame. Default "100%".
    height : str, optional
        CSS height for the IFrame. Default "600px".

    Returns
    -------
    IPython.display.IFrame
        An IFrame widget that can be displayed in a Jupyter cell.

    Raises
    ------
    ImportError
        If IPython is not installed. Install with: ``pip install eigenvue[jupyter]``
    ValueError
        If ``algorithm_id`` is not recognized.

    Examples
    --------
    In a Jupyter notebook cell::

        import eigenvue
        eigenvue.jupyter("self-attention")
    """
    from eigenvue._jupyter import create_jupyter_widget

    return create_jupyter_widget(
        algorithm_id=algorithm_id,
        inputs=inputs,
        width=width,
        height=height,
    )


# ── Module-level exports ─────────────────────────────────────────────────────
# These are the ONLY public symbols. Everything else is implementation detail.

__all__ = [
    "AlgorithmInfo",
    "__version__",
    "jupyter",
    "list",
    "show",
    "steps",
]
