/**
 * catalog-types.ts — TypeScript types specific to the catalog page UI.
 *
 * These types define the catalog's filter state, sort options, and
 * display configuration. They are separate from the AlgorithmMeta type
 * (which is a cross-platform data contract) because they are purely
 * a web UI concern.
 *
 * See Phase7_Implementation.md §4 — Type Definitions.
 */

import { type AlgorithmCategory, type DifficultyLevel } from "@/shared/types/step";

// ——————————————————————————————————————————————————
// FILTER STATE
// ——————————————————————————————————————————————————

/**
 * The "all" sentinel value for the category filter.
 * When active, no category filtering is applied.
 */
export type CategoryFilter = AlgorithmCategory | "all";

/**
 * The complete filter + sort state for the catalog page.
 * Every field here maps to a URL query parameter.
 *
 * INVARIANTS:
 * - `category` is "all" or a valid AlgorithmCategory string.
 * - `difficulties` is a Set of 0–4 DifficultyLevel values.
 *   An empty set means "show all difficulties" (no filtering).
 * - `searchQuery` is a trimmed, lowercased string. Empty string means no search.
 * - `sortBy` is one of the recognized SortOption values.
 */
export interface CatalogFilterState {
  readonly category: CategoryFilter;
  readonly difficulties: ReadonlySet<DifficultyLevel>;
  readonly searchQuery: string;
  readonly sortBy: SortOption;
}

// ——————————————————————————————————————————————————
// SORT OPTIONS
// ——————————————————————————————————————————————————

/**
 * Available sort orders for the catalog.
 *
 * "name-asc"       — Alphabetical A→Z by display name.
 * "name-desc"      — Alphabetical Z→A by display name.
 * "difficulty-asc" — Beginner → Expert.
 * "difficulty-desc"— Expert → Beginner.
 */
export type SortOption = "name-asc" | "name-desc" | "difficulty-asc" | "difficulty-desc";

/**
 * Human-readable labels for each sort option.
 * Used in the SortSelector dropdown.
 */
export const SORT_OPTION_LABELS: Record<SortOption, string> = {
  "name-asc": "Name (A → Z)",
  "name-desc": "Name (Z → A)",
  "difficulty-asc": "Difficulty (Easiest first)",
  "difficulty-desc": "Difficulty (Hardest first)",
} as const;

// ——————————————————————————————————————————————————
// DEFAULTS
// ——————————————————————————————————————————————————

/**
 * Default filter state when the catalog page loads without URL params.
 */
export const DEFAULT_CATALOG_STATE: CatalogFilterState = {
  category: "all",
  difficulties: new Set<DifficultyLevel>(),
  searchQuery: "",
  sortBy: "name-asc",
} as const;

// ——————————————————————————————————————————————————
// DIFFICULTY SORT WEIGHT
// ——————————————————————————————————————————————————

/**
 * Numeric weight for each difficulty level, used for deterministic sorting.
 *
 * MATHEMATICAL INVARIANT:
 *   DIFFICULTY_WEIGHT["beginner"] < DIFFICULTY_WEIGHT["intermediate"]
 *     < DIFFICULTY_WEIGHT["advanced"] < DIFFICULTY_WEIGHT["expert"]
 *
 * These weights are arbitrary but must be strictly ordered. Using integers
 * 0–3 ensures no floating-point comparison ambiguity.
 */
export const DIFFICULTY_WEIGHT: Record<DifficultyLevel, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
  expert: 3,
} as const;
