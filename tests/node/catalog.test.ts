import { describe, expect, it } from "vitest";
import { list } from "../../node/src/catalog";
import type { AlgorithmInfo } from "../../node/src/catalog";

describe("catalog", () => {
  describe("list()", () => {
    it("returns a non-empty array", () => {
      const result = list();
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it("returns exactly 17 algorithms", () => {
      const result = list();
      expect(result).toHaveLength(17);
    });

    it("returns 7 classical algorithms", () => {
      const result = list({ category: "classical" });
      expect(result).toHaveLength(7);
      for (const algo of result) {
        expect(algo.category).toBe("classical");
      }
    });

    it("returns 5 deep-learning algorithms", () => {
      const result = list({ category: "deep-learning" });
      expect(result).toHaveLength(5);
      for (const algo of result) {
        expect(algo.category).toBe("deep-learning");
      }
    });

    it("returns 5 generative-ai algorithms", () => {
      const result = list({ category: "generative-ai" });
      expect(result).toHaveLength(5);
      for (const algo of result) {
        expect(algo.category).toBe("generative-ai");
      }
    });

    it("throws on invalid category", () => {
      expect(() => list({ category: "invalid" as never })).toThrow(
        /Invalid category "invalid"/,
      );
    });

    it("returns AlgorithmInfo objects with all required fields", () => {
      const result = list();
      for (const algo of result) {
        expect(algo).toHaveProperty("id");
        expect(algo).toHaveProperty("name");
        expect(algo).toHaveProperty("category");
        expect(algo).toHaveProperty("description");
        expect(algo).toHaveProperty("difficulty");
        expect(algo).toHaveProperty("timeComplexity");
        expect(algo).toHaveProperty("spaceComplexity");

        // Verify types are strings
        expect(typeof algo.id).toBe("string");
        expect(typeof algo.name).toBe("string");
        expect(typeof algo.category).toBe("string");
        expect(typeof algo.description).toBe("string");
        expect(typeof algo.difficulty).toBe("string");
        expect(typeof algo.timeComplexity).toBe("string");
        expect(typeof algo.spaceComplexity).toBe("string");

        // Verify non-empty
        expect(algo.id.length).toBeGreaterThan(0);
        expect(algo.name.length).toBeGreaterThan(0);
      }
    });

    it("returns results sorted by category, then by name", () => {
      const result = list();
      for (let i = 1; i < result.length; i++) {
        const prev = result[i - 1]!;
        const curr = result[i]!;
        const categoryOrder = prev.category.localeCompare(curr.category);
        if (categoryOrder === 0) {
          expect(prev.name.localeCompare(curr.name)).toBeLessThanOrEqual(0);
        } else {
          expect(categoryOrder).toBeLessThan(0);
        }
      }
    });

    it("returns a copy (not a reference to the internal cache)", () => {
      const result1 = list();
      const result2 = list();
      expect(result1).not.toBe(result2);
      expect(result1).toEqual(result2);
    });

    it("includes known algorithms", () => {
      const result = list();
      const ids = result.map((a: AlgorithmInfo) => a.id);
      expect(ids).toContain("binary-search");
      expect(ids).toContain("bubble-sort");
      expect(ids).toContain("self-attention");
      expect(ids).toContain("backpropagation");
    });
  });
});
