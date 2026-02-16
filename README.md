<div align="center">

<!-- Replace with actual logo when available: ![Eigenvue](assets/logo.png) -->
# [Eigenvue](https://eigenvue.web.app/)

**The visual learning platform for understanding algorithms, AI architectures, and quantum computing.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Status: Under Construction](https://img.shields.io/badge/Status-Under%20Construction-orange.svg)](#under-construction)

[Website](https://eigenvue.web.app/) | [Contributing](CONTRIBUTING.md) | [License](LICENSE)

</div>

---

## About

Eigenvue is an interactive, visual learning platform that brings algorithms to life through rich canvas-based animations and step-by-step walkthroughs. It spans classical computer science, deep learning, generative AI, and quantum computing -- providing a unified environment where learners can explore, experiment with, and truly understand the mechanics behind each algorithm.

## Algorithm Domains

Eigenvue organizes its content into four algorithm domains:

| Domain | Color | Description |
|--------|-------|-------------|
| **Classical** | Blue | Foundational algorithms -- sorting, searching, graph traversal, dynamic programming, and more. |
| **Deep Learning** | Purple | Neural network architectures -- CNNs, RNNs, transformers, attention mechanisms, and training pipelines. |
| **Generative AI** | Pink | Generative models -- GANs, VAEs, diffusion models, and large language model internals. |
| **Quantum Computing** | Cyan | Quantum algorithms -- qubit operations, quantum gates, Shor's algorithm, Grover's search, and quantum circuits. |

## Under Construction

Eigenvue is currently in **pre-release development**. The project structure, APIs, and visual components are actively evolving and are not yet stable. Expect breaking changes, incomplete features, and rough edges. Contributions and feedback are welcome, but please be aware that the project is not yet ready for production use.

## Quick Start

### Web Application

```bash
cd web
npm install
npm run dev
```

The development server will start at `http://localhost:3000`.

### Python Package

```bash
cd python
pip install -e ".[dev]"
pytest
```

### Node Package

```bash
npm install eigenvue
```

Or for development:

```bash
cd node
npm install
python ../scripts/bundle-node-data.py
npm run build
npm test
```

## Project Structure

```
eigenvue/
  algorithms/    # Algorithm definitions and metadata (shared across platforms)
  web/           # Next.js web application (TypeScript, Canvas 2D, Tailwind CSS)
  python/        # Python package for algorithm engines and utilities
  node/          # npm package (TypeScript, zero runtime dependencies)
  shared/        # Shared types, schemas, and constants
  scripts/       # Build, codegen, and maintenance scripts
  tests/         # Cross-platform integration tests
```

## Tech Stack

- **Frontend:** Next.js, TypeScript, Canvas 2D, Tailwind CSS
- **Backend / Engines:** Python 3.10+
- **Monorepo:** Single repository with coordinated web and Python packages

## Contributing

Contributions are welcome! Please read the [Contributing Guide](CONTRIBUTING.md) before submitting pull requests.

## License

This project is licensed under the [MIT License](LICENSE).
