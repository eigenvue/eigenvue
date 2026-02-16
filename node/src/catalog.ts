/**
 * Algorithm catalog — discovery and metadata for all available algorithms.
 *
 * Reads the bundled meta.json files that ship with the package and provides
 * a structured listing of available algorithms.
 *
 * MIRRORS: python/src/eigenvue/catalog.py
 */

import fs from "node:fs";
import path from "node:path";

// ── Types ────────────────────────────────────────────────────────────────────

/** Valid algorithm category identifiers. */
export type AlgorithmCategory =
  | "classical"
  | "deep-learning"
  | "generative-ai"
  | "quantum";

const VALID_CATEGORIES: ReadonlySet<string> = new Set([
  "classical",
  "deep-learning",
  "generative-ai",
  "quantum",
]);

/** Options for filtering the algorithm list. */
export interface ListOptions {
  /** Filter by category. If omitted, returns all algorithms. */
  category?: AlgorithmCategory;
}

/** Immutable summary of an algorithm's metadata (matches Python AlgorithmInfo). */
export interface AlgorithmInfo {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly description: string;
  readonly difficulty: string;
  readonly timeComplexity: string;
  readonly spaceComplexity: string;
}

// ── Internal cache ───────────────────────────────────────────────────────────

let catalogCache: AlgorithmInfo[] | null = null;
const metaCache = new Map<string, Record<string, unknown>>();

/**
 * Resolve the path to the bundled data directory.
 * At runtime (after npm install), meta.json files are in <package>/data/algorithms/.
 */
function getDataDir(): string {
  // __dirname points to dist/ after build. data/ is a sibling.
  return path.resolve(__dirname, "..", "data");
}

function loadCatalog(): AlgorithmInfo[] {
  const dataDir = getDataDir();
  const algorithmsDir = path.join(dataDir, "algorithms");

  if (!fs.existsSync(algorithmsDir)) {
    throw new Error(
      `Eigenvue data directory not found at ${algorithmsDir}. ` +
      "This usually means the package was not installed correctly."
    );
  }

  const files = fs.readdirSync(algorithmsDir)
    .filter((f) => f.endsWith(".meta.json"))
    .sort();

  const catalog: AlgorithmInfo[] = [];

  for (const file of files) {
    const content = fs.readFileSync(path.join(algorithmsDir, file), "utf-8");
    const meta = JSON.parse(content) as Record<string, unknown>;

    const algoId = meta["id"] as string;
    metaCache.set(algoId, meta);

    const description = meta["description"] as Record<string, unknown>;
    const complexity = meta["complexity"] as Record<string, unknown>;

    catalog.push({
      id: algoId,
      name: meta["name"] as string,
      category: meta["category"] as string,
      description: description["short"] as string,
      difficulty: complexity["level"] as string,
      timeComplexity: complexity["time"] as string,
      spaceComplexity: complexity["space"] as string,
    });
  }

  catalog.sort((a, b) =>
    a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
  );

  return catalog;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * List available algorithms with their metadata.
 *
 * @param options - Optional filtering options.
 * @returns A list of algorithm metadata objects.
 * @throws {Error} If the category is invalid.
 *
 * @example
 * ```typescript
 * import { list } from "eigenvue";
 *
 * const all = list();
 * const classical = list({ category: "classical" });
 * ```
 */
export function list(options?: ListOptions): AlgorithmInfo[] {
  const category = options?.category;

  if (category !== undefined && !VALID_CATEGORIES.has(category)) {
    throw new Error(
      `Invalid category "${category}". ` +
      `Valid categories: ${[...VALID_CATEGORIES].sort().join(", ")}`
    );
  }

  if (catalogCache === null) {
    catalogCache = loadCatalog();
  }

  if (category === undefined) {
    return [...catalogCache];
  }

  return catalogCache.filter((a) => a.category === category);
}

/**
 * Get the full metadata object for an algorithm.
 * @internal
 */
export function getAlgorithmMeta(algorithmId: string): Record<string, unknown> {
  if (catalogCache === null) {
    catalogCache = loadCatalog();
  }

  const meta = metaCache.get(algorithmId);
  if (!meta) {
    throw new Error(
      `Unknown algorithm "${algorithmId}". Use list() to see available algorithms.`
    );
  }

  return meta;
}

/**
 * Get the default input parameters for an algorithm.
 * @internal
 */
export function getDefaultInputs(algorithmId: string): Record<string, unknown> {
  const meta = getAlgorithmMeta(algorithmId);
  const inputs = meta["inputs"] as Record<string, unknown>;
  return { ...(inputs["defaults"] as Record<string, unknown>) };
}
