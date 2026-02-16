"""
Local visualization server — serves an interactive viewer in the browser.

This module starts a lightweight Flask server that:
1. Serves a bundled minimal web visualizer (HTML/JS/CSS from data/web/).
2. Exposes a JSON API endpoint returning step data for the requested algorithm.
3. Opens the default browser to the visualization page.
4. Shuts down cleanly when the Python process exits.

The server binds to localhost only — it is NOT exposed to the network.
"""

from __future__ import annotations

import atexit
import json
import socket
import threading
import webbrowser
from typing import Any

from flask import Flask, Response, send_from_directory

from eigenvue.catalog import _get_data_dir, get_algorithm_meta
from eigenvue.runner import run_generator


def _find_free_port() -> int:
    """Find an available TCP port on localhost.

    Returns
    -------
    int
        An available port number.
    """
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        return s.getsockname()[1]


def _create_app(algorithm_id: str, inputs: dict[str, Any] | None) -> Flask:
    """Create the Flask application for serving the visualization.

    Parameters
    ----------
    algorithm_id : str
        The algorithm to visualize.
    inputs : dict or None
        Custom inputs, or None for defaults.

    Returns
    -------
    Flask
        Configured Flask application.
    """
    data_dir = _get_data_dir()
    web_dir = str(data_dir / "web")

    app = Flask(
        __name__,
        static_folder=web_dir,
        static_url_path="/static",
    )

    # Pre-generate steps once at startup (not per-request)
    step_data = run_generator(algorithm_id=algorithm_id, inputs=inputs)
    meta = get_algorithm_meta(algorithm_id)

    @app.route("/")
    def index() -> Response:
        """Serve the main visualization page."""
        return send_from_directory(web_dir, "index.html")

    @app.route("/api/steps")
    def api_steps() -> Response:
        """Return the step sequence as JSON."""
        return Response(
            json.dumps(
                {
                    "algorithmId": algorithm_id,
                    "meta": meta,
                    "steps": step_data,
                },
                ensure_ascii=False,
            ),
            mimetype="application/json",
        )

    @app.route("/api/health")
    def health() -> Response:
        """Health check endpoint for integration tests."""
        return Response(
            json.dumps({"status": "ok", "algorithmId": algorithm_id}),
            mimetype="application/json",
        )

    return app


def launch_server(
    algorithm_id: str,
    inputs: dict[str, Any] | None = None,
    port: int = 0,
    open_browser: bool = True,
) -> None:
    """Start the local visualization server.

    Parameters
    ----------
    algorithm_id : str
        The algorithm identifier.
    inputs : dict or None
        Custom input parameters.
    port : int
        TCP port. 0 = auto-select.
    open_browser : bool
        Whether to open the browser automatically.
    """
    if port == 0:
        port = _find_free_port()

    app = _create_app(algorithm_id, inputs)
    url = f"http://127.0.0.1:{port}"

    # Register cleanup
    shutdown_event = threading.Event()

    def _shutdown() -> None:
        shutdown_event.set()

    atexit.register(_shutdown)

    print(f"Eigenvue: serving {algorithm_id!r} at {url}")
    print("Press Ctrl+C to stop.")

    if open_browser:
        # Delay browser open slightly to allow server startup
        def _open_browser() -> None:
            import time

            time.sleep(0.5)
            webbrowser.open(url)

        threading.Thread(target=_open_browser, daemon=True).start()

    try:
        app.run(
            host="127.0.0.1",
            port=port,
            debug=False,
            use_reloader=False,
        )
    except KeyboardInterrupt:
        print("\nEigenvue: server stopped.")
