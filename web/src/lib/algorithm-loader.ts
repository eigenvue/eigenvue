/**
 * @fileoverview Algorithm Loader
 *
 * Resolves an algorithm ID to its metadata and step-generation strategy.
 *
 * LOADING STRATEGY:
 * 1. Load the algorithm's meta.json (always required).
 * 2. Attempt to import the TypeScript generator.
 * 3. If a TypeScript generator exists, use it for live generation.
 * 4. If not, fall back to pre-computed step JSON files.
 *
 * This design supports the architecture's "Pre-Computed Steps as a
 * First-Class Strategy" decision (Architecture §5, Decision 4).
 *
 * ALGORITHM REGISTRY:
 * Rather than dynamic file-system scanning (which doesn't work with
 * static site generation), we maintain an explicit registry of available
 * algorithms. Each entry maps an ID to its imports. This registry is
 * extended each time a new algorithm is added.
 */

import type { StepSequence } from "@/shared/types/step";
import type { GeneratorDefinition } from "@/engine/generator";

// ─── Types ───────────────────────────────────────────────────────────────────

/** The full metadata shape loaded from meta.json. */
export interface AlgorithmMeta {
  readonly id: string;
  readonly name: string;
  readonly category: "classical" | "deep-learning" | "generative-ai" | "quantum";
  readonly description: { readonly short: string; readonly long: string };
  readonly complexity: {
    readonly time: string;
    readonly space: string;
    readonly level: "beginner" | "intermediate" | "advanced" | "expert";
  };
  readonly visual: {
    readonly layout: string;
    readonly theme: { readonly primary: string; readonly secondary: string };
    readonly components: Record<string, unknown>;
  };
  readonly inputs: {
    readonly schema: Record<string, unknown>;
    readonly defaults: Record<string, unknown>;
    readonly examples: ReadonlyArray<{
      readonly name: string;
      readonly values: Record<string, unknown>;
    }>;
  };
  readonly code: {
    readonly implementations: Record<string, string>;
    readonly defaultLanguage: string;
  };
  readonly education: {
    readonly keyConcepts: ReadonlyArray<{ readonly title: string; readonly description: string }>;
    readonly pitfalls: ReadonlyArray<{ readonly title: string; readonly description: string }>;
    readonly quiz: ReadonlyArray<{
      readonly question: string;
      readonly options: readonly string[];
      readonly correctIndex: number;
      readonly explanation: string;
    }>;
    readonly resources: ReadonlyArray<{
      readonly title: string;
      readonly url: string;
      readonly type: string;
    }>;
  };
  readonly seo: {
    readonly keywords: readonly string[];
    readonly ogDescription: string;
  };
  readonly prerequisites: readonly string[];
  readonly related: readonly string[];
  readonly author: string;
  readonly version: string;
}

/** The resolved data for an algorithm, ready for the visualizer. */
export interface LoadedAlgorithm {
  readonly meta: AlgorithmMeta;
  /** The TypeScript generator, if available. Null means pre-computed only. */
  readonly generator: GeneratorDefinition<Record<string, unknown>> | null;
  /** Pre-computed step sequences keyed by example name. */
  readonly precomputed: Record<string, StepSequence> | null;
}

// ─── Algorithm Registry ──────────────────────────────────────────────────────

/**
 * Registry entry for a single algorithm.
 * Uses dynamic import() functions so algorithms are code-split automatically.
 * Only the requested algorithm's code is loaded.
 */
interface RegistryEntry {
  meta: () => Promise<AlgorithmMeta>;
  generator: (() => Promise<GeneratorDefinition<Record<string, unknown>>>) | null;
  precomputed: (() => Promise<Record<string, StepSequence>>) | null;
}

/**
 * The algorithm registry. Add new entries here when implementing new algorithms.
 *
 * CONVENTION: Each entry uses dynamic import() for code splitting. The meta.json
 * import returns the default export (the JSON object). The generator import
 * returns the default export (the GeneratorDefinition from createGenerator()).
 */
const ALGORITHM_REGISTRY: Record<string, RegistryEntry> = {
  "binary-search": {
    meta: () =>
      import("@/../../algorithms/classical/binary-search/meta.json").then(
        (m) => m.default as AlgorithmMeta,
      ),
    generator: () =>
      import("@/../../algorithms/classical/binary-search/generator").then(
        (m) => m.default as GeneratorDefinition<Record<string, unknown>>,
      ),
    precomputed: null,
  },
  "bubble-sort": {
    meta: () =>
      import("@/../../algorithms/classical/bubble-sort/meta.json").then(
        (m) => m.default as AlgorithmMeta,
      ),
    generator: () =>
      import("@/../../algorithms/classical/bubble-sort/generator").then(
        (m) => m.default as GeneratorDefinition<Record<string, unknown>>,
      ),
    precomputed: null,
  },
  "quicksort": {
    meta: () =>
      import("@/../../algorithms/classical/quicksort/meta.json").then(
        (m) => m.default as AlgorithmMeta,
      ),
    generator: () =>
      import("@/../../algorithms/classical/quicksort/generator").then(
        (m) => m.default as GeneratorDefinition<Record<string, unknown>>,
      ),
    precomputed: null,
  },
  "merge-sort": {
    meta: () =>
      import("@/../../algorithms/classical/merge-sort/meta.json").then(
        (m) => m.default as AlgorithmMeta,
      ),
    generator: () =>
      import("@/../../algorithms/classical/merge-sort/generator").then(
        (m) => m.default as GeneratorDefinition<Record<string, unknown>>,
      ),
    precomputed: null,
  },
  "bfs": {
    meta: () =>
      import("@/../../algorithms/classical/bfs/meta.json").then(
        (m) => m.default as AlgorithmMeta,
      ),
    generator: () =>
      import("@/../../algorithms/classical/bfs/generator").then(
        (m) => m.default as GeneratorDefinition<Record<string, unknown>>,
      ),
    precomputed: null,
  },
  "dfs": {
    meta: () =>
      import("@/../../algorithms/classical/dfs/meta.json").then(
        (m) => m.default as AlgorithmMeta,
      ),
    generator: () =>
      import("@/../../algorithms/classical/dfs/generator").then(
        (m) => m.default as GeneratorDefinition<Record<string, unknown>>,
      ),
    precomputed: null,
  },
  "dijkstra": {
    meta: () =>
      import("@/../../algorithms/classical/dijkstra/meta.json").then(
        (m) => m.default as AlgorithmMeta,
      ),
    generator: () =>
      import("@/../../algorithms/classical/dijkstra/generator").then(
        (m) => m.default as GeneratorDefinition<Record<string, unknown>>,
      ),
    precomputed: null,
  },

  // ── Phase 8: Generative AI Algorithms ───────────────────────────────────────

  "tokenization-bpe": {
    meta: () =>
      import("@/../../algorithms/generative-ai/tokenization-bpe/meta.json").then(
        (m) => m.default as AlgorithmMeta,
      ),
    generator: () =>
      import("@/../../algorithms/generative-ai/tokenization-bpe/generator").then(
        (m) => m.default as GeneratorDefinition<Record<string, unknown>>,
      ),
    precomputed: null,
  },
  "token-embeddings": {
    meta: () =>
      import("@/../../algorithms/generative-ai/token-embeddings/meta.json").then(
        (m) => m.default as AlgorithmMeta,
      ),
    generator: () =>
      import("@/../../algorithms/generative-ai/token-embeddings/generator").then(
        (m) => m.default as GeneratorDefinition<Record<string, unknown>>,
      ),
    precomputed: null,
  },
  "self-attention": {
    meta: () =>
      import("@/../../algorithms/generative-ai/self-attention/meta.json").then(
        (m) => m.default as AlgorithmMeta,
      ),
    generator: () =>
      import("@/../../algorithms/generative-ai/self-attention/generator").then(
        (m) => m.default as GeneratorDefinition<Record<string, unknown>>,
      ),
    precomputed: null,
  },
  "multi-head-attention": {
    meta: () =>
      import("@/../../algorithms/generative-ai/multi-head-attention/meta.json").then(
        (m) => m.default as AlgorithmMeta,
      ),
    generator: () =>
      import("@/../../algorithms/generative-ai/multi-head-attention/generator").then(
        (m) => m.default as GeneratorDefinition<Record<string, unknown>>,
      ),
    precomputed: null,
  },
  "transformer-block": {
    meta: () =>
      import("@/../../algorithms/generative-ai/transformer-block/meta.json").then(
        (m) => m.default as AlgorithmMeta,
      ),
    generator: () =>
      import("@/../../algorithms/generative-ai/transformer-block/generator").then(
        (m) => m.default as GeneratorDefinition<Record<string, unknown>>,
      ),
    precomputed: null,
  },

  // ── Phase 9: Deep Learning Algorithms ───────────────────────────────────────

  "perceptron": {
    meta: () =>
      import("@/../../algorithms/deep-learning/perceptron/meta.json").then(
        (m) => m.default as AlgorithmMeta,
      ),
    generator: () =>
      import("@/../../algorithms/deep-learning/perceptron/generator").then(
        (m) => m.default as GeneratorDefinition<Record<string, unknown>>,
      ),
    precomputed: null,
  },
  "feedforward-network": {
    meta: () =>
      import("@/../../algorithms/deep-learning/feedforward-network/meta.json").then(
        (m) => m.default as AlgorithmMeta,
      ),
    generator: () =>
      import("@/../../algorithms/deep-learning/feedforward-network/generator").then(
        (m) => m.default as GeneratorDefinition<Record<string, unknown>>,
      ),
    precomputed: null,
  },
  "backpropagation": {
    meta: () =>
      import("@/../../algorithms/deep-learning/backpropagation/meta.json").then(
        (m) => m.default as AlgorithmMeta,
      ),
    generator: () =>
      import("@/../../algorithms/deep-learning/backpropagation/generator").then(
        (m) => m.default as GeneratorDefinition<Record<string, unknown>>,
      ),
    precomputed: null,
  },
  "convolution": {
    meta: () =>
      import("@/../../algorithms/deep-learning/convolution/meta.json").then(
        (m) => m.default as AlgorithmMeta,
      ),
    generator: () =>
      import("@/../../algorithms/deep-learning/convolution/generator").then(
        (m) => m.default as GeneratorDefinition<Record<string, unknown>>,
      ),
    precomputed: null,
  },
  "gradient-descent": {
    meta: () =>
      import("@/../../algorithms/deep-learning/gradient-descent/meta.json").then(
        (m) => m.default as AlgorithmMeta,
      ),
    generator: () =>
      import("@/../../algorithms/deep-learning/gradient-descent/generator").then(
        (m) => m.default as GeneratorDefinition<Record<string, unknown>>,
      ),
    precomputed: null,
  },
};

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Returns a list of all registered algorithm IDs.
 * Used by the catalog page and by Next.js `generateStaticParams()`.
 */
export function getAlgorithmIds(): string[] {
  return Object.keys(ALGORITHM_REGISTRY);
}

/**
 * Loads just the generator for a given algorithm ID.
 * Used by client-side hooks that need the generator without the full metadata.
 *
 * This avoids problematic template-literal dynamic imports (which bundlers
 * cannot statically analyze) by delegating to the registry's static import paths.
 *
 * @param id - The algorithm's URL-safe identifier (e.g., "transformer-block").
 * @returns The generator definition, or null if not found.
 */
export async function loadGenerator(
  id: string,
): Promise<GeneratorDefinition<Record<string, unknown>> | null> {
  const entry = ALGORITHM_REGISTRY[id];
  if (!entry?.generator) return null;
  return entry.generator();
}

/**
 * Loads an algorithm by ID. Returns the metadata, generator, and precomputed data.
 *
 * @param id - The algorithm's URL-safe identifier (e.g., "binary-search").
 * @returns The loaded algorithm, or null if the ID is not registered.
 *
 * @example
 * ```typescript
 * const algo = await loadAlgorithm("binary-search");
 * if (!algo) { notFound(); return; }
 * const { meta, generator } = algo;
 * ```
 */
export async function loadAlgorithm(id: string): Promise<LoadedAlgorithm | null> {
  const entry = ALGORITHM_REGISTRY[id];
  if (!entry) return null;

  const [meta, generator, precomputed] = await Promise.all([
    entry.meta(),
    entry.generator ? entry.generator() : Promise.resolve(null),
    entry.precomputed ? entry.precomputed() : Promise.resolve(null),
  ]);

  return { meta, generator, precomputed };
}
