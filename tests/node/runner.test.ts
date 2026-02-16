import { describe, expect, it } from "vitest";
import { steps } from "../../node/src/runner";
import { list } from "../../node/src/catalog";

describe("runner", () => {
  describe("steps()", () => {
    it("returns a valid StepSequence for binary-search", () => {
      const result = steps("binary-search");

      expect(result).toHaveProperty("formatVersion");
      expect(result).toHaveProperty("algorithmId", "binary-search");
      expect(result).toHaveProperty("inputs");
      expect(result).toHaveProperty("steps");
      expect(result.steps.length).toBeGreaterThan(0);
    });

    it("produces contiguous step indices", () => {
      const result = steps("binary-search");
      for (let i = 0; i < result.steps.length; i++) {
        expect(result.steps[i]!.index).toBe(i);
      }
    });

    it("marks only the last step as terminal", () => {
      const result = steps("binary-search");
      const lastStep = result.steps[result.steps.length - 1]!;
      expect(lastStep.isTerminal).toBe(true);

      // No other step should be terminal
      for (let i = 0; i < result.steps.length - 1; i++) {
        expect(result.steps[i]!.isTerminal).toBe(false);
      }
    });

    it("accepts custom inputs", () => {
      const result = steps("binary-search", {
        array: [1, 3, 5],
        target: 3,
      });
      expect(result.steps.length).toBeGreaterThan(0);
      expect(result.inputs).toEqual({ array: [1, 3, 5], target: 3 });
    });

    it("throws for a nonexistent algorithm", () => {
      expect(() => steps("nonexistent")).toThrow(/nonexistent/);
    });

    it("generates steps for all 22 algorithms with default inputs", () => {
      const algorithms = list();
      expect(algorithms).toHaveLength(22);

      for (const algo of algorithms) {
        const result = steps(algo.id);

        expect(result.steps.length).toBeGreaterThan(0);

        // Last step must be terminal
        const lastStep = result.steps[result.steps.length - 1]!;
        expect(lastStep.isTerminal).toBe(true);

        // Step indices must be contiguous
        for (let i = 0; i < result.steps.length; i++) {
          expect(result.steps[i]!.index).toBe(i);
        }
      }
    });
  });
});
