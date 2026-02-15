# Contributing to Eigenvue

Thank you for your interest in contributing to Eigenvue! This guide will help you get set up and explain the workflows we follow.

## Prerequisites

Before you begin, make sure you have the following installed:

- **Node.js** 22 or later
- **npm** (comes with Node.js)
- **Python** 3.10 or later
- **Git**

## Development Setup

### Web Application

```bash
cd web
npm install
npm run dev
```

This starts the Next.js development server at `http://localhost:3000` with hot reloading enabled.

### Python Package

```bash
cd python
pip install -e ".[dev]"
pytest
```

This installs the Python package in editable mode with all development dependencies and runs the test suite to verify everything is working.

## Git Branching Strategy

- **`main`** -- The primary branch. Should always be in a stable, releasable state.
- **Feature branches** -- All development work happens on feature branches created from `main`. Use descriptive names such as `feature/add-quicksort-visualization` or `fix/canvas-rendering-bug`.

### Conventional Commits

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification. Each commit message should be structured as:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

Common types:

| Type | Purpose |
|------|---------|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation changes |
| `style` | Code style changes (formatting, no logic change) |
| `refactor` | Code restructuring without changing behavior |
| `test` | Adding or updating tests |
| `chore` | Build, CI, or tooling changes |

Examples:

```
feat(web): add binary search visualization component
fix(python): correct off-by-one error in merge sort engine
docs: update README with new project structure
```

## Code Style

### Web (TypeScript / JavaScript)

- **ESLint** for linting
- **Prettier** for formatting

Run the linter and formatter:

```bash
cd web
npm run lint
npm run format
```

### Python

- **Ruff** for linting and formatting

Run Ruff:

```bash
cd python
ruff check .
ruff format .
```

## Testing

### Web

We use **Vitest** for unit and integration tests:

```bash
cd web
npm run test
```

### Python

We use **pytest** for the Python test suite:

```bash
cd python
pytest
```

## How to Add a New Algorithm

Adding a new algorithm to Eigenvue generally involves the following steps:

1. **Define the algorithm metadata** in the `algorithms/` directory, including its domain (Classical, Deep Learning, Generative AI, or Quantum Computing), name, description, and complexity information.

2. **Implement the algorithm engine** in the `python/` package if the algorithm requires a computational backend.

3. **Create the visualization component** in the `web/` application, using Canvas 2D to render the step-by-step animation.

4. **Write tests** for both the engine logic (pytest) and the visualization component (Vitest).

5. **Update documentation** as needed to reflect the new addition.

A more detailed guide for adding algorithms will be provided as the project matures.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## Questions?

If you have questions about contributing, feel free to open a discussion or issue on the repository.
