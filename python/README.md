# eigenvue

The visual learning platform for understanding algorithms, AI architectures, and quantum computing.

`eigenvue.show()` and `eigenvue.jupyter()` render the **same interactive,
animated Canvas visualizations as [eigenvue.web.app](https://eigenvue.web.app)** —
step-by-step playback, synchronized code highlighting, and a live state
inspector — served from a local-only server. No internet connection required.

## Installation

```bash
pip install eigenvue

# For inline visualizations inside Jupyter notebooks:
pip install "eigenvue[jupyter]"
```

## Quick Start

```python
import eigenvue

# List available algorithms (optionally filter by category)
eigenvue.list()
eigenvue.list(category="quantum")

# Open an interactive, animated visualization in your browser
eigenvue.show("binary-search")

# Embed the same interactive visualization inline in a Jupyter notebook
eigenvue.jupyter("self-attention")

# Get the raw step-by-step data programmatically (no server)
steps = eigenvue.steps("dijkstra")
print(f"{len(steps)} steps")

# Provide custom inputs
eigenvue.show("binary-search", inputs={"array": [1, 3, 5, 7, 9], "target": 5})
```

Every algorithm spans four domains — classical algorithms, deep learning,
generative AI, and quantum computing — and renders with a layout purpose-built
for it (array pointers, neural-network diagrams, attention heatmaps, a 3D Bloch
sphere, and more).

## How it works

The Python and JavaScript packages and the web app all share one rendering
engine and one [step-format contract](https://eigenvue.web.app/docs/api-reference/step-format).
`steps()` runs the Python generator; `show()` / `jupyter()` start a lightweight
local server (bound to `127.0.0.1`) that serves the bundled Canvas renderer and
the generated steps. The result is identical to the browser experience.

## Development

```bash
cd python
pip install -e ".[dev]"
pytest
```

## License

MIT
