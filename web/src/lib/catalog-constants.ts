/**
 * catalog-constants.ts — Static configuration data for the catalog page.
 *
 * Contains category metadata, difficulty metadata, and display-related
 * constants. No runtime computation — this is pure data.
 *
 * USAGE: Imported by catalog components for rendering category tabs,
 * difficulty filters, and empty states.
 *
 * See Phase7_Implementation.md §6 — Catalog Constants & Configuration.
 */

import { type AlgorithmCategory, type DifficultyLevel } from "@/shared/types/step";

// ——————————————————————————————————————————————————
// CATEGORY METADATA
// ——————————————————————————————————————————————————

/**
 * Display metadata for each algorithm category.
 *
 * Includes the information needed to render category tabs, badges,
 * headers, and empty states. Color tokens reference the design system
 * defined in Phase 2 (tailwind.config.ts).
 *
 * NOTE: The `slug` field is the URL segment used in category landing
 * page routes (/algorithms/[category]). It matches the AlgorithmCategory
 * string value for classical, deep-learning, and generative-ai, and
 * is "quantum" for quantum computing.
 */
export interface CategoryDisplayInfo {
  /** The AlgorithmCategory enum value. */
  readonly id: AlgorithmCategory;
  /** URL-safe slug for routing. Matches the category string. */
  readonly slug: string;
  /** Human-readable display name. */
  readonly label: string;
  /** Short description shown on category landing pages. */
  readonly description: string;
  /**
   * Tailwind CSS class token for this category's accent color.
   * Used for badge colors, icon tinting, border accents.
   *
   * @example "classical" → text-classical, bg-classical-muted, border-classical/20
   */
  readonly colorToken: string;
  /**
   * Badge category key for the <Badge> component (Phase 2).
   * Maps to the categoryStyles lookup in Badge.tsx.
   */
  readonly badgeCategory: "classical" | "deeplearning" | "genai" | "quantum";
  /** Icon identifier. Maps to a Lucide icon name or a custom SVG. */
  readonly icon: string;
  /**
   * Whether this category has any algorithms available in v1.
   * Controls "Coming Soon" badge and empty state rendering.
   */
  readonly isAvailable: boolean;
}

/**
 * Ordered array of all categories. Order determines:
 * - Tab display order in the CategoryFilterBar
 * - Category card order on the main catalog page
 * - Navigation link order in the footer
 *
 * IMPORTANT: This array includes ALL categories, including those
 * without algorithms (quantum in v1). The `isAvailable` flag
 * distinguishes them.
 */
export const CATEGORIES: readonly CategoryDisplayInfo[] = [
  {
    id: "classical",
    slug: "classical",
    label: "Classical Algorithms",
    description: "Sorting, searching, and graph algorithms — the foundation of computer science.",
    colorToken: "classical",
    badgeCategory: "classical",
    icon: "Layers",
    isAvailable: true,
  },
  {
    id: "deep-learning",
    slug: "deep-learning",
    label: "Deep Learning",
    description:
      "Neural networks, backpropagation, and gradient descent — how machines learn from data.",
    colorToken: "deeplearning",
    badgeCategory: "deeplearning",
    icon: "Brain",
    isAvailable: true,
  },
  {
    id: "generative-ai",
    slug: "generative-ai",
    label: "Generative AI",
    description:
      "Tokenization, embeddings, attention, and transformers — the building blocks of modern AI.",
    colorToken: "genai",
    badgeCategory: "genai",
    icon: "Sparkles",
    isAvailable: true,
  },
  {
    id: "quantum",
    slug: "quantum",
    label: "Quantum Computing",
    description:
      "Qubits, gates, entanglement, and quantum algorithms — computing beyond classical limits.",
    colorToken: "quantum",
    badgeCategory: "quantum",
    icon: "Atom",
    isAvailable: true,
  },
] as const;

/**
 * Lookup map: category slug → CategoryDisplayInfo.
 * Used for O(1) access by the [category] dynamic route.
 */
export const CATEGORY_BY_SLUG: ReadonlyMap<string, CategoryDisplayInfo> = new Map(
  CATEGORIES.map((cat) => [cat.slug, cat]),
);

/**
 * Lookup map: AlgorithmCategory value → CategoryDisplayInfo.
 * Used for rendering category badges and icons on algorithm cards.
 */
export const CATEGORY_BY_ID: ReadonlyMap<AlgorithmCategory, CategoryDisplayInfo> = new Map(
  CATEGORIES.map((cat) => [cat.id, cat]),
);

/**
 * Valid category slugs for Next.js generateStaticParams.
 */
export const ALL_CATEGORY_SLUGS: readonly string[] = CATEGORIES.map((cat) => cat.slug);

// ——————————————————————————————————————————————————
// DIFFICULTY METADATA
// ——————————————————————————————————————————————————

export interface DifficultyDisplayInfo {
  readonly id: DifficultyLevel;
  readonly label: string;
  /**
   * Tailwind text color class for the difficulty label.
   * Color intensity increases with difficulty for visual clarity.
   */
  readonly colorClass: string;
  /**
   * Tailwind background color class for the difficulty chip.
   */
  readonly bgClass: string;
}

/**
 * Ordered array of difficulty levels, from easiest to hardest.
 * Order is critical — it determines:
 * - Filter chip display order
 * - Sort direction for "difficulty-asc" and "difficulty-desc"
 *
 * INVARIANT: DIFFICULTIES[i] is easier than DIFFICULTIES[i+1].
 */
export const DIFFICULTIES: readonly DifficultyDisplayInfo[] = [
  {
    id: "beginner",
    label: "Beginner",
    colorClass: "text-difficulty-beginner",
    bgClass: "bg-difficulty-beginner-bg",
  },
  {
    id: "intermediate",
    label: "Intermediate",
    colorClass: "text-difficulty-intermediate",
    bgClass: "bg-difficulty-intermediate-bg",
  },
  {
    id: "advanced",
    label: "Advanced",
    colorClass: "text-difficulty-advanced",
    bgClass: "bg-difficulty-advanced-bg",
  },
  {
    id: "expert",
    label: "Expert",
    colorClass: "text-difficulty-expert",
    bgClass: "bg-difficulty-expert-bg",
  },
] as const;

/**
 * Lookup map: DifficultyLevel → DifficultyDisplayInfo.
 */
export const DIFFICULTY_BY_ID: ReadonlyMap<DifficultyLevel, DifficultyDisplayInfo> = new Map(
  DIFFICULTIES.map((diff) => [diff.id, diff]),
);

// ——————————————————————————————————————————————————
// SEARCH CONFIGURATION
// ——————————————————————————————————————————————————

/**
 * Debounce delay in milliseconds for the search input.
 *
 * At 250ms, a user typing at normal speed (5 chars/sec) will see
 * results update after the last keystroke with minimal perceived lag.
 * Value must be >=150ms (below this, frequent re-filtering causes jank
 * on large catalogs) and <=500ms (above this, the UI feels unresponsive).
 */
export const SEARCH_DEBOUNCE_MS = 250;

/**
 * Minimum number of characters before search is applied.
 * Below this threshold, the search query is ignored.
 * At 0, even a single character triggers filtering (intentional —
 * users often search for "BFS" or "DFS" which are 3 characters).
 */
export const SEARCH_MIN_LENGTH = 0;
