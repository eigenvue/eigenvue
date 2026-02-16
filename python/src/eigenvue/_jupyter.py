"""
Jupyter integration — embed Eigenvue visualizations in notebook cells.

Uses an IFrame to embed the local server's visualization page.
Compatible with: JupyterLab, Jupyter Notebook, Google Colab.
"""

from __future__ import annotations

import threading
from typing import Any


def create_jupyter_widget(
    algorithm_id: str,
    inputs: dict[str, Any] | None = None,
    width: str = "100%",
    height: str = "600px",
) -> Any:
    """Create an IFrame widget for Jupyter notebook display.

    Starts a local server in a background thread and returns an IFrame
    pointing to it.

    Parameters
    ----------
    algorithm_id : str
        The algorithm identifier.
    inputs : dict or None
        Custom inputs.
    width : str
        CSS width for the IFrame.
    height : str
        CSS height for the IFrame.

    Returns
    -------
    IPython.display.IFrame
        An IFrame widget.

    Raises
    ------
    ImportError
        If IPython is not installed.
    """
    try:
        from IPython.display import IFrame
    except ImportError:
        raise ImportError(
            "IPython is required for Jupyter integration. "
            "Install it with: pip install eigenvue[jupyter]"
        ) from None

    from eigenvue.server import _create_app, _find_free_port

    port = _find_free_port()
    app = _create_app(algorithm_id, inputs)

    # Start the server in a daemon thread (auto-stops when kernel stops)
    server_thread = threading.Thread(
        target=lambda: app.run(
            host="127.0.0.1",
            port=port,
            debug=False,
            use_reloader=False,
        ),
        daemon=True,
        name=f"eigenvue-server-{algorithm_id}",
    )
    server_thread.start()

    # Give the server a moment to start
    import time

    time.sleep(0.3)

    url = f"http://127.0.0.1:{port}"
    return IFrame(url, width=width, height=height)
