/**
 * Tests for the algorithm registry module.
 *
 * These tests verify:
 * 1. All meta.json files load without errors.
 * 2. All loaded algorithms pass validation.
 * 3. No duplicate IDs exist.
 * 4. getAllAlgorithms() returns a frozen, sorted array.
 * 5. getAlgorithmById() finds and returns correct entries.
 * 6. getAlgorithmsByCategory() returns correct subsets.
 * 7. Category counts are mathematically consistent.
 *
 * See Phase7_Implementation.md §25.1 — Unit Tests: Algorithm Registry.
 */

import { describe, it, expect } from "vitest";
import {
  getAllAlgorithms,
  getAlgorithmById,
  getAlgorithmsByCategory,
  getAlgorithmCount,
} from "@/lib/algorithm-registry";

describe("algorithm-registry", () => {
  const all = getAllAlgorithms();

  it("loads at least one algorithm", () => {
    expect(all.length).toBeGreaterThan(0);
  });

  it("returns a frozen array (no mutation possible)", () => {
    expect(Object.isFrozen(all)).toBe(true);
  });

  it("is sorted alphabetically by name", () => {
    for (let i = 1; i < all.length; i++) {
      const cmp = all[i - 1].name.localeCompare(all[i].name, "en", {
        sensitivity: "base",
      });
      expect(cmp).toBeLessThanOrEqual(0);
    }
  });

  it("has no duplicate IDs", () => {
    const ids = all.map((a) => a.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("every algorithm has a valid category", () => {
    const validCategories = new Set(["classical", "deep-learning", "generative-ai", "quantum"]);
    for (const algo of all) {
      expect(validCategories.has(algo.category)).toBe(true);
    }
  });

  it("getAlgorithmById returns correct algorithm", () => {
    for (const algo of all) {
      expect(getAlgorithmById(algo.id)).toBe(algo);
    }
  });

  it("getAlgorithmById returns undefined for non-existent ID", () => {
    expect(getAlgorithmById("nonexistent-algorithm-xyz")).toBeUndefined();
  });

  it("category counts sum to total count", () => {
    const categories = ["classical", "deep-learning", "generative-ai", "quantum"] as const;
    let sum = 0;
    for (const cat of categories) {
      sum += getAlgorithmsByCategory(cat).length;
    }
    expect(sum).toBe(getAlgorithmCount());
  });
});
