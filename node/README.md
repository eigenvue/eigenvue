# Eigenvue

**The visual learning platform for understanding algorithms, AI architectures, and quantum computing.**

[![npm version](https://img.shields.io/npm/v/eigenvue.svg)](https://www.npmjs.com/package/eigenvue)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/eigenvue/eigenvue/blob/main/LICENSE)

Eigenvue provides step-by-step algorithm visualizations for classical CS, deep learning, and generative AI algorithms. Use it as a library in your Node.js projects, or as a CLI tool.

## Installation

```bash
npm install eigenvue
```

Requires Node.js >= 18.

## Quick Start

### List Available Algorithms

```typescript
import { list } from "eigenvue";

// List all 22 algorithms
const algorithms = list();
console.log(algorithms);

// Filter by category
const classical = list({ category: "classical" });
const deepLearning = list({ category: "deep-learning" });
const generativeAi = list({ category: "generative-ai" });
```

### Generate Step-by-Step Data

```typescript
import { steps } from "eigenvue";

// Generate steps with default inputs
const result = steps("binary-search");
console.log(`${result.steps.length} steps generated`);

// Generate steps with custom inputs
const custom = steps("binary-search", {
  array: [1, 3, 5, 7, 9],
  target: 5,
});
```

Each step includes state data, visual actions, and code highlights that you can use to build custom visualizations.

### Open Interactive Visualization

```typescript
import { show } from "eigenvue";

// Opens in your default browser
show("binary-search");

// Custom port and inputs
show("self-attention", {
  port: 8080,
  inputs: { tokens: ["I", "love", "AI"] },
});
```

## CLI Usage

```bash
# List all algorithms
npx eigenvue list

# Filter by category
npx eigenvue list --category classical

# Open interactive visualization
npx eigenvue show binary-search

# Print step data as JSON
npx eigenvue steps binary-search

# Version and help
npx eigenvue --version
npx eigenvue --help
```

## Available Algorithms

### Classical (7)

Binary Search, Breadth-First Search, Bubble Sort, Depth-First Search, Dijkstra's Shortest Path, Merge Sort, QuickSort

### Deep Learning (5)

Backpropagation, Convolution (2D), Feedforward Neural Network, Gradient Descent, Perceptron

### Generative AI (5)

BPE Tokenization, Multi-Head Attention, Self-Attention, Token Embeddings, Transformer Block

## API Reference

### `list(options?): AlgorithmInfo[]`

List available algorithms with metadata.

- `options.category` — Filter by category: `"classical"`, `"deep-learning"`, `"generative-ai"`, or `"quantum"`.

### `steps(algorithmId, inputs?): StepSequence`

Generate the step-by-step sequence for an algorithm.

- `algorithmId` — Algorithm identifier (e.g., `"binary-search"`).
- `inputs` — Custom input parameters. Uses defaults from metadata if omitted.

### `show(algorithmId, options?): void`

Launch an interactive visualization in the browser.

- `algorithmId` — Algorithm identifier.
- `options.port` — TCP port (default: auto-select).
- `options.openBrowser` — Whether to open the browser (default: `true`).
- `options.inputs` — Custom input parameters.

## Links

- [Web App](https://eigenvue.web.app/)
- [GitHub](https://github.com/eigenvue/eigenvue)
- [Contributing](https://github.com/eigenvue/eigenvue/blob/main/CONTRIBUTING.md)

## License

MIT
