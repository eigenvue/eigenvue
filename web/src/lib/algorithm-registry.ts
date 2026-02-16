/**
 * algorithm-registry.ts — Loads and indexes all algorithm meta.json files.
 *
 * This module is the data backbone of the catalog page. It provides:
 * 1. getAllAlgorithms()         — flat array of all AlgorithmMeta, sorted by name
 * 2. getAlgorithmById()        — single lookup by ID
 * 3. getAlgorithmsByCategory() — filtered by category string
 * 4. getPopulatedCategories()  — unique list of categories present in the registry
 * 5. getAlgorithmCount()       — total count (useful for stats)
 * 6. getAllAlgorithmIds()       — all IDs for generateStaticParams
 *
 * IMPORTANT: This module reads from the filesystem. It is intended for use
 * in server components, generateStaticParams, and generateMetadata only.
 * Client components receive the data as props — they never call these
 * functions directly.
 *
 * DATA INTEGRITY:
 * - Every meta.json MUST conform to the AlgorithmMeta interface (Phase 3).
 * - IDs are validated to be unique. Duplicate IDs cause a build-time error.
 * - The registry is frozen after construction — no mutation is possible.
 *
 * See Phase7_Implementation.md §3 — Data Layer.
 */

import { type AlgorithmMeta, type AlgorithmCategory } from '@/shared/types/step';
import fs from 'node:fs';
import path from 'node:path';

/** Root directory containing all algorithm category folders. */
const ALGORITHMS_ROOT = path.resolve(process.cwd(), '../algorithms');

/**
 * Recursively finds all meta.json files under the algorithms root.
 *
 * Directory structure expected:
 *   algorithms/
 *   ├── classical/
 *   │   ├── binary-search/
 *   │   │   └── meta.json
 *   │   ├── quicksort/
 *   │   │   └── meta.json
 *   │   └── ...
 *   ├── deep-learning/
 *   │   └── ...
 *   └── generative-ai/
 *       └── ...
 *
 * @returns Array of absolute paths to meta.json files.
 */
function discoverMetaFiles(): string[] {
  const metaFiles: string[] = [];

  if (!fs.existsSync(ALGORITHMS_ROOT)) {
    console.warn(
      `[algorithm-registry] Algorithms directory not found at ${ALGORITHMS_ROOT}. ` +
      `Returning empty registry. This is expected during initial development.`
    );
    return metaFiles;
  }

  const categoryDirs = fs
    .readdirSync(ALGORITHMS_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory());

  for (const categoryDir of categoryDirs) {
    const categoryPath = path.join(ALGORITHMS_ROOT, categoryDir.name);
    const algorithmDirs = fs
      .readdirSync(categoryPath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory());

    for (const algoDir of algorithmDirs) {
      const metaPath = path.join(categoryPath, algoDir.name, 'meta.json');
      if (fs.existsSync(metaPath)) {
        metaFiles.push(metaPath);
      }
    }
  }

  return metaFiles;
}

/**
 * Loads a single meta.json file and validates its structure.
 *
 * Validation checks (fail-fast at build time):
 * 1. File must parse as valid JSON.
 * 2. `id` field must be a non-empty string matching /^[a-z0-9][a-z0-9-]*$/.
 * 3. `category` must be a recognized AlgorithmCategory.
 * 4. `complexity.level` must be a recognized DifficultyLevel.
 * 5. `description.short` must be ≤80 characters.
 *
 * @param filePath — Absolute path to the meta.json file.
 * @returns Parsed and validated AlgorithmMeta object.
 * @throws Error with descriptive message if validation fails.
 */
function loadAndValidateMeta(filePath: string): AlgorithmMeta {
  const raw = fs.readFileSync(filePath, 'utf-8');

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `[algorithm-registry] Invalid JSON in ${filePath}: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  const meta = parsed as AlgorithmMeta;

  // --- Validation: id ---
  if (typeof meta.id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(meta.id)) {
    throw new Error(
      `[algorithm-registry] Invalid id "${meta.id}" in ${filePath}. ` +
      `Must match /^[a-z0-9][a-z0-9-]*$/.`
    );
  }

  // --- Validation: category ---
  const validCategories: AlgorithmCategory[] = [
    'classical',
    'deep-learning',
    'generative-ai',
    'quantum',
  ];
  if (!validCategories.includes(meta.category)) {
    throw new Error(
      `[algorithm-registry] Invalid category "${meta.category}" in ${filePath}. ` +
      `Must be one of: ${validCategories.join(', ')}.`
    );
  }

  // --- Validation: difficulty level ---
  const validLevels = ['beginner', 'intermediate', 'advanced', 'expert'];
  if (!validLevels.includes(meta.complexity.level)) {
    throw new Error(
      `[algorithm-registry] Invalid difficulty level "${meta.complexity.level}" in ${filePath}. ` +
      `Must be one of: ${validLevels.join(', ')}.`
    );
  }

  // --- Validation: short description length ---
  if (meta.description.short.length > 80) {
    throw new Error(
      `[algorithm-registry] Short description exceeds 80 chars (${meta.description.short.length}) ` +
      `in ${filePath}: "${meta.description.short}".`
    );
  }

  return meta;
}

/** Cached registry — built once per process (Next.js build or dev server start). */
let _cachedAlgorithms: AlgorithmMeta[] | null = null;
let _cachedById: Map<string, AlgorithmMeta> | null = null;

/**
 * Builds (or returns cached) the complete algorithm registry.
 *
 * UNIQUENESS INVARIANT: No two algorithms may share the same `id`.
 * If a duplicate is detected, this function throws at build time.
 *
 * SORT ORDER: Algorithms are sorted alphabetically by `name` (case-insensitive).
 * This provides a stable, deterministic order for rendering and snapshot tests.
 */
function buildRegistry(): {
  algorithms: readonly AlgorithmMeta[];
  byId: ReadonlyMap<string, AlgorithmMeta>;
} {
  if (_cachedAlgorithms && _cachedById) {
    return { algorithms: _cachedAlgorithms, byId: _cachedById };
  }

  const metaFiles = discoverMetaFiles();
  const algorithms: AlgorithmMeta[] = [];
  const byId = new Map<string, AlgorithmMeta>();

  for (const filePath of metaFiles) {
    const meta = loadAndValidateMeta(filePath);

    // --- Uniqueness check ---
    if (byId.has(meta.id)) {
      throw new Error(
        `[algorithm-registry] Duplicate algorithm ID "${meta.id}" found. ` +
        `Each algorithm must have a globally unique id.`
      );
    }

    algorithms.push(meta);
    byId.set(meta.id, meta);
  }

  /**
   * Sort alphabetically by display name. Uses localeCompare for correct
   * Unicode ordering (handles accented characters, etc.).
   */
  algorithms.sort((a, b) =>
    a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })
  );

  _cachedAlgorithms = Object.freeze(algorithms) as AlgorithmMeta[];
  _cachedById = byId;

  return { algorithms: _cachedAlgorithms, byId: _cachedById };
}

// ——————————————————————————————————————————————————
// PUBLIC API
// ——————————————————————————————————————————————————

/**
 * Returns all registered algorithms, sorted alphabetically by name.
 * Safe to call multiple times — result is cached and frozen.
 */
export function getAllAlgorithms(): readonly AlgorithmMeta[] {
  return buildRegistry().algorithms;
}

/**
 * Returns a single algorithm by its unique ID.
 * Returns undefined if the ID is not found.
 *
 * @param id — URL-safe algorithm identifier (e.g., "binary-search").
 */
export function getAlgorithmById(id: string): AlgorithmMeta | undefined {
  return buildRegistry().byId.get(id);
}

/**
 * Returns all algorithms in a specific category, maintaining sort order.
 *
 * @param category — One of "classical", "deep-learning", "generative-ai", "quantum".
 */
export function getAlgorithmsByCategory(
  category: AlgorithmCategory
): readonly AlgorithmMeta[] {
  return getAllAlgorithms().filter((algo) => algo.category === category);
}

/**
 * Returns all unique categories that have at least one algorithm.
 * Useful for determining which filter tabs to enable.
 */
export function getPopulatedCategories(): AlgorithmCategory[] {
  const categories = new Set<AlgorithmCategory>();
  for (const algo of getAllAlgorithms()) {
    categories.add(algo.category);
  }
  return Array.from(categories);
}

/**
 * Returns the total number of registered algorithms.
 */
export function getAlgorithmCount(): number {
  return getAllAlgorithms().length;
}

/**
 * Returns algorithm IDs for Next.js `generateStaticParams`.
 * Used by the `/algo/[id]` route to pre-render all algorithm pages.
 */
export function getAllAlgorithmIds(): string[] {
  return getAllAlgorithms().map((algo) => algo.id);
}
