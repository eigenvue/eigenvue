/**
 * @fileoverview Unit tests for the Eigenvue step format types and validation.
 *
 * Tests are organized into four groups:
 * 1. TypeScript type construction — verifies interfaces compile and enforce shapes.
 * 2. Schema validation — verifies JSON Schema catches structural issues.
 * 3. Semantic validation — verifies custom invariant checks.
 * 4. Fixture validation — all golden fixtures pass validation.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { STEP_FORMAT_VERSION } from "../../shared/types/step";
import {
  validateStepSequence,
  validateAlgorithmMeta,
} from "../../shared/validation/validate";

// ── Helpers ──

function loadFixture(name: string): unknown {
  const path = resolve(__dirname, "../../shared/fixtures", name);
  return JSON.parse(readFileSync(path, "utf-8"));
}

function loadEdgeCases(): Array<{
  name: string;
  data: unknown;
  expectedErrorSubstrings: string[];
}> {
  const raw = loadFixture("edge-cases.fixture.json") as {
    cases: Array<{
      name: string;
      data: unknown;
      expectedErrorSubstrings: string[];
    }>;
  };
  return raw.cases;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. VERSION CONSTANT
// ─────────────────────────────────────────────────────────────────────────────

describe("STEP_FORMAT_VERSION", () => {
  it("should be 1", () => {
    expect(STEP_FORMAT_VERSION).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. VALID FIXTURES — all must pass
// ─────────────────────────────────────────────────────────────────────────────

describe("Valid fixtures pass validation", () => {
  const validFixtures = [
    "binary-search-found.fixture.json",
    "binary-search-not-found.fixture.json",
    "single-element.fixture.json",
    "minimal-valid.fixture.json",
  ];

  for (const fixtureName of validFixtures) {
    it(`validates ${fixtureName}`, () => {
      const data = loadFixture(fixtureName);
      const result = validateStepSequence(data);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. EDGE CASES — all must fail with expected errors
// ─────────────────────────────────────────────────────────────────────────────

describe("Edge cases are correctly rejected", () => {
  const cases = loadEdgeCases();

  for (const testCase of cases) {
    it(`rejects: ${testCase.name}`, () => {
      const result = validateStepSequence(testCase.data);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      // Verify that at least one error contains each expected substring.
      for (const substring of testCase.expectedErrorSubstrings) {
        const found = result.errors.some((err) =>
          err.toLowerCase().includes(substring.toLowerCase())
        );
        expect(found).toBe(true);
      }
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. SPECIFIC SEMANTIC CHECKS
// ─────────────────────────────────────────────────────────────────────────────

describe("Semantic: index contiguity", () => {
  it("rejects steps where index does not match position", () => {
    const data = {
      formatVersion: 1,
      algorithmId: "test",
      inputs: {},
      steps: [
        {
          index: 0, id: "s0", title: "T", explanation: "E",
          state: {}, visualActions: [],
          codeHighlight: { language: "pseudocode", lines: [1] },
          isTerminal: false,
        },
        {
          index: 5, // WRONG — should be 1
          id: "s1", title: "T", explanation: "E",
          state: {}, visualActions: [],
          codeHighlight: { language: "pseudocode", lines: [2] },
          isTerminal: true,
        },
      ],
      generatedAt: "2026-02-14T00:00:00.000Z",
      generatedBy: "precomputed",
    };

    const result = validateStepSequence(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("index"))).toBe(true);
  });
});

describe("Semantic: attention weights precision", () => {
  it("accepts weights that sum to exactly 1.0", () => {
    const data = {
      formatVersion: 1,
      algorithmId: "test",
      inputs: {},
      steps: [
        {
          index: 0, id: "s0", title: "T", explanation: "E",
          state: {},
          visualActions: [
            { type: "showAttentionWeights", queryIdx: 0, weights: [0.25, 0.25, 0.25, 0.25] },
          ],
          codeHighlight: { language: "pseudocode", lines: [1] },
          isTerminal: true,
        },
      ],
      generatedAt: "2026-02-14T00:00:00.000Z",
      generatedBy: "precomputed",
    };

    const result = validateStepSequence(data);
    expect(result.valid).toBe(true);
  });

  it("accepts weights within tolerance of 1.0", () => {
    // 0.1 + 0.2 = 0.30000000000000004 in IEEE 754.
    // Total: 0.1 + 0.2 + 0.3 + 0.4 = 1.0000000000000002 — within 1e-6.
    const data = {
      formatVersion: 1,
      algorithmId: "test",
      inputs: {},
      steps: [
        {
          index: 0, id: "s0", title: "T", explanation: "E",
          state: {},
          visualActions: [
            { type: "showAttentionWeights", queryIdx: 0, weights: [0.1, 0.2, 0.3, 0.4] },
          ],
          codeHighlight: { language: "pseudocode", lines: [1] },
          isTerminal: true,
        },
      ],
      generatedAt: "2026-02-14T00:00:00.000Z",
      generatedBy: "precomputed",
    };

    const result = validateStepSequence(data);
    expect(result.valid).toBe(true);
  });

  it("rejects weights that clearly do not sum to 1.0", () => {
    const data = {
      formatVersion: 1,
      algorithmId: "test",
      inputs: {},
      steps: [
        {
          index: 0, id: "s0", title: "T", explanation: "E",
          state: {},
          visualActions: [
            { type: "showAttentionWeights", queryIdx: 0, weights: [0.5, 0.3, 0.1] },
          ],
          codeHighlight: { language: "pseudocode", lines: [1] },
          isTerminal: true,
        },
      ],
      generatedAt: "2026-02-14T00:00:00.000Z",
      generatedBy: "precomputed",
    };

    const result = validateStepSequence(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("weights sum to"))).toBe(true);
  });
});

describe("Semantic: highlightRange from <= to", () => {
  it("rejects from > to", () => {
    const data = {
      formatVersion: 1,
      algorithmId: "test",
      inputs: {},
      steps: [
        {
          index: 0, id: "s0", title: "T", explanation: "E",
          state: {},
          visualActions: [
            { type: "highlightRange", from: 5, to: 2 },
          ],
          codeHighlight: { language: "pseudocode", lines: [1] },
          isTerminal: true,
        },
      ],
      generatedAt: "2026-02-14T00:00:00.000Z",
      generatedBy: "precomputed",
    };

    const result = validateStepSequence(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("from=5 > to=2"))).toBe(true);
  });
});
