/**
 * Generator registry — maps algorithm IDs to their TypeScript generator definitions.
 *
 * Each generator lives in algorithms/<category>/<algo>/generator.ts and exports
 * a default GeneratorDefinition. This registry imports them statically and
 * provides lookup by algorithm ID.
 *
 * MIRRORS: python/src/eigenvue/generators/__init__.py
 */

import type { GeneratorDefinition } from "@/engine/generator";

// ── Static imports ───────────────────────────────────────────────────────────
// All generators are imported statically. tsup bundles them into the output.
// The generator code is in the bundle but each generator's function only
// executes when steps() is called.

// Classical
import binarySearchGenerator from "@/algorithms/classical/binary-search/generator";
import bubbleSortGenerator from "@/algorithms/classical/bubble-sort/generator";
import quicksortGenerator from "@/algorithms/classical/quicksort/generator";
import mergeSortGenerator from "@/algorithms/classical/merge-sort/generator";
import bfsGenerator from "@/algorithms/classical/bfs/generator";
import dfsGenerator from "@/algorithms/classical/dfs/generator";
import dijkstraGenerator from "@/algorithms/classical/dijkstra/generator";

// Generative AI
import tokenizationBpeGenerator from "@/algorithms/generative-ai/tokenization-bpe/generator";
import tokenEmbeddingsGenerator from "@/algorithms/generative-ai/token-embeddings/generator";
import selfAttentionGenerator from "@/algorithms/generative-ai/self-attention/generator";
import multiHeadAttentionGenerator from "@/algorithms/generative-ai/multi-head-attention/generator";
import transformerBlockGenerator from "@/algorithms/generative-ai/transformer-block/generator";

// Deep Learning
import perceptronGenerator from "@/algorithms/deep-learning/perceptron/generator";
import feedforwardNetworkGenerator from "@/algorithms/deep-learning/feedforward-network/generator";
import backpropagationGenerator from "@/algorithms/deep-learning/backpropagation/generator";
import convolutionGenerator from "@/algorithms/deep-learning/convolution/generator";
import gradientDescentGenerator from "@/algorithms/deep-learning/gradient-descent/generator";

// Quantum
import qubitBlochSphereGenerator from "@/algorithms/quantum/qubit-bloch-sphere/generator";
import quantumGatesGenerator from "@/algorithms/quantum/quantum-gates/generator";
import superpositionMeasurementGenerator from "@/algorithms/quantum/superposition-measurement/generator";
import groversSearchGenerator from "@/algorithms/quantum/grovers-search/generator";
import quantumTeleportationGenerator from "@/algorithms/quantum/quantum-teleportation/generator";

// ── Registry Map ─────────────────────────────────────────────────────────────

// Each generator has its own specific input type (e.g., BinarySearchInputs,
// BFSInputs). To store them in a single homogeneous map, we erase the input
// type to Record<string, unknown>. This is safe because the runner validates
// inputs against the algorithm's metadata before passing them to the generator.
// The cast is internal-only — the public API returns GeneratorDefinition<Record<string, unknown>>.
type AnyGenerator = GeneratorDefinition<Record<string, unknown>>;

const REGISTRY: ReadonlyMap<string, AnyGenerator> = new Map<string, AnyGenerator>([
  // Classical
  ["binary-search", binarySearchGenerator as AnyGenerator],
  ["bubble-sort", bubbleSortGenerator as AnyGenerator],
  ["quicksort", quicksortGenerator as AnyGenerator],
  ["merge-sort", mergeSortGenerator as AnyGenerator],
  ["bfs", bfsGenerator as AnyGenerator],
  ["dfs", dfsGenerator as AnyGenerator],
  ["dijkstra", dijkstraGenerator as AnyGenerator],
  // Generative AI
  ["tokenization-bpe", tokenizationBpeGenerator as AnyGenerator],
  ["token-embeddings", tokenEmbeddingsGenerator as AnyGenerator],
  ["self-attention", selfAttentionGenerator as AnyGenerator],
  ["multi-head-attention", multiHeadAttentionGenerator as AnyGenerator],
  ["transformer-block", transformerBlockGenerator as AnyGenerator],
  // Deep Learning
  ["perceptron", perceptronGenerator as AnyGenerator],
  ["feedforward-network", feedforwardNetworkGenerator as AnyGenerator],
  ["backpropagation", backpropagationGenerator as AnyGenerator],
  ["convolution", convolutionGenerator as AnyGenerator],
  ["gradient-descent", gradientDescentGenerator as AnyGenerator],
  // Quantum
  ["qubit-bloch-sphere", qubitBlochSphereGenerator as AnyGenerator],
  ["quantum-gates", quantumGatesGenerator as AnyGenerator],
  ["superposition-measurement", superpositionMeasurementGenerator as AnyGenerator],
  ["grovers-search", groversSearchGenerator as AnyGenerator],
  ["quantum-teleportation", quantumTeleportationGenerator as AnyGenerator],
]);

/**
 * Get the GeneratorDefinition for a given algorithm ID.
 *
 * @param algorithmId - The algorithm identifier (e.g., "binary-search").
 * @returns The generator definition for the algorithm.
 * @throws {Error} If no generator is registered for the given ID.
 */
export function getGenerator(algorithmId: string): GeneratorDefinition<Record<string, unknown>> {
  const generator = REGISTRY.get(algorithmId);
  if (!generator) {
    throw new Error(
      `No generator registered for algorithm "${algorithmId}". ` +
      `Available: ${[...REGISTRY.keys()].sort().join(", ")}`
    );
  }
  return generator;
}

/** Check if a generator exists for the given ID. */
export function hasGenerator(algorithmId: string): boolean {
  return REGISTRY.has(algorithmId);
}

/** Get all registered algorithm IDs. */
export function getRegisteredIds(): string[] {
  return [...REGISTRY.keys()].sort();
}
