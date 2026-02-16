/**
 * @fileoverview GeneratorRunner — Unit Tests
 *
 * Tests the GeneratorRunner independently of any specific algorithm,
 * using mock generators. Validates:
 * - Correct StepSequence production for valid generators.
 * - Validation of step format invariants (empty, multiple terminals, etc.).
 * - Visual action validation (range, attention weights, bar chart).
 * - Max step limit enforcement.
 * - Error wrapping for generator runtime failures.
 */

import { describe, it, expect } from "vitest";
import { runGenerator, GeneratorError, createGenerator } from "../index";
import type { StepBuilderFn, StepInput } from "../types";
import type { Step } from "@/shared/types/step";

// ─── Helper: create a minimal valid step input ──────────────────────────────

function makeStepInput(overrides: Partial<StepInput> = {}): StepInput {
  return {
    id: "test-step",
    title: "Test Step",
    explanation: "A test step.",
    state: { value: 1 },
    visualActions: [],
    codeHighlight: { language: "pseudocode", lines: [1] },
    ...overrides,
  };
}

// ─── Valid Generator Tests ──────────────────────────────────────────────────

describe("GeneratorRunner — Valid Generators", () => {
  it("produces a valid StepSequence for a single-step generator", () => {
    const gen = createGenerator<Record<string, unknown>>({
      id: "test-algo",
      *generate(_inputs, step) {
        yield step(makeStepInput({ isTerminal: true }));
      },
    });

    const result = runGenerator(gen, {});

    expect(result.formatVersion).toBe(1);
    expect(result.algorithmId).toBe("test-algo");
    expect(result.generatedBy).toBe("typescript");
    expect(result.generatedAt).toBeTruthy();
    expect(result.steps.length).toBe(1);
    expect(result.steps[0]!.index).toBe(0);
    expect(result.steps[0]!.isTerminal).toBe(true);
  });

  it("assigns contiguous indices to multi-step generators", () => {
    const gen = createGenerator<Record<string, unknown>>({
      id: "multi-step",
      *generate(_inputs, step) {
        yield step(makeStepInput({ id: "step-a" }));
        yield step(makeStepInput({ id: "step-b" }));
        yield step(makeStepInput({ id: "step-c", isTerminal: true }));
      },
    });

    const result = runGenerator(gen, {});

    expect(result.steps.length).toBe(3);
    result.steps.forEach((s, i) => {
      expect(s.index).toBe(i);
    });
  });

  it("passes inputs through to the StepSequence", () => {
    const gen = createGenerator<{ x: number }>({
      id: "pass-inputs",
      *generate(inputs, step) {
        yield step(makeStepInput({ state: { x: inputs.x }, isTerminal: true }));
      },
    });

    const result = runGenerator(gen, { x: 42 });

    expect(result.inputs).toEqual({ x: 42 });
    expect(result.steps[0]!.state.x).toBe(42);
  });
});

// ─── Validation Error Tests ─────────────────────────────────────────────────

describe("GeneratorRunner — Validation Errors", () => {
  it("throws for empty generator (zero steps)", () => {
    const gen = createGenerator<Record<string, unknown>>({
      id: "empty-gen",
      *generate() {
        // Yields nothing.
      },
    });

    expect(() => runGenerator(gen, {})).toThrow(GeneratorError);
    expect(() => runGenerator(gen, {})).toThrow("zero steps");
  });

  it("throws when no terminal step exists", () => {
    const gen = createGenerator<Record<string, unknown>>({
      id: "no-terminal",
      *generate(_inputs, step) {
        yield step(makeStepInput()); // isTerminal defaults to false
      },
    });

    expect(() => runGenerator(gen, {})).toThrow(GeneratorError);
    expect(() => runGenerator(gen, {})).toThrow("No terminal step");
  });

  it("throws when multiple terminal steps exist", () => {
    const gen = createGenerator<Record<string, unknown>>({
      id: "multi-terminal",
      *generate(_inputs, step) {
        yield step(makeStepInput({ id: "term-1", isTerminal: true }));
        yield step(makeStepInput({ id: "term-2", isTerminal: true }));
      },
    });

    expect(() => runGenerator(gen, {})).toThrow(GeneratorError);
    expect(() => runGenerator(gen, {})).toThrow("Multiple terminal steps");
  });

  it("throws when terminal step is not the last step", () => {
    const gen = createGenerator<Record<string, unknown>>({
      id: "mid-terminal",
      *generate(_inputs, step) {
        yield step(makeStepInput({ id: "step-a", isTerminal: true }));
        yield step(makeStepInput({ id: "step-b" }));
      },
    });

    expect(() => runGenerator(gen, {})).toThrow(GeneratorError);
    // It will detect multiple terminals (first is terminal, last is not)
    // or terminal not at last position.
  });

  it("throws for invalid step ID format", () => {
    const gen = createGenerator<Record<string, unknown>>({
      id: "bad-step-id",
      *generate(_inputs, step) {
        yield step(makeStepInput({ id: "Invalid ID!", isTerminal: true }));
      },
    });

    expect(() => runGenerator(gen, {})).toThrow(GeneratorError);
    expect(() => runGenerator(gen, {})).toThrow("Invalid step ID");
  });

  it("throws for empty step title", () => {
    const gen = createGenerator<Record<string, unknown>>({
      id: "empty-title",
      *generate(_inputs, step) {
        yield step(makeStepInput({ title: "", isTerminal: true }));
      },
    });

    expect(() => runGenerator(gen, {})).toThrow(GeneratorError);
    expect(() => runGenerator(gen, {})).toThrow("title must not be empty");
  });

  it("throws for invalid code highlight line numbers", () => {
    const gen = createGenerator<Record<string, unknown>>({
      id: "bad-lines",
      *generate(_inputs, step) {
        yield step(makeStepInput({
          codeHighlight: { language: "pseudocode", lines: [0] },
          isTerminal: true,
        }));
      },
    });

    expect(() => runGenerator(gen, {})).toThrow(GeneratorError);
    expect(() => runGenerator(gen, {})).toThrow("positive integers");
  });
});

// ─── Max Step Limit ─────────────────────────────────────────────────────────

describe("GeneratorRunner — Max Step Limit", () => {
  it("enforces max step limit", () => {
    const gen = createGenerator<Record<string, unknown>>({
      id: "infinite-gen",
      *generate(_inputs, step) {
        let i = 0;
        while (true) {
          yield step(makeStepInput({ id: `step-${i}` }));
          i++;
        }
      },
    });

    expect(() => runGenerator(gen, {}, { maxSteps: 5 })).toThrow(GeneratorError);
    expect(() => runGenerator(gen, {}, { maxSteps: 5 })).toThrow("exceeded maximum step limit");
  });
});

// ─── Visual Action Validation ───────────────────────────────────────────────

describe("GeneratorRunner — Visual Action Validation", () => {
  it("throws when highlightRange has from > to", () => {
    const gen = createGenerator<Record<string, unknown>>({
      id: "bad-range",
      *generate(_inputs, step) {
        yield step(makeStepInput({
          visualActions: [{ type: "highlightRange", from: 5, to: 2 }],
          isTerminal: true,
        }));
      },
    });

    expect(() => runGenerator(gen, {})).toThrow(GeneratorError);
    expect(() => runGenerator(gen, {})).toThrow("must be <=");
  });

  it("throws when dimRange has from > to", () => {
    const gen = createGenerator<Record<string, unknown>>({
      id: "bad-dim",
      *generate(_inputs, step) {
        yield step(makeStepInput({
          visualActions: [{ type: "dimRange", from: 3, to: 1 }],
          isTerminal: true,
        }));
      },
    });

    expect(() => runGenerator(gen, {})).toThrow(GeneratorError);
  });

  it("throws when attention weights do not sum to 1.0", () => {
    const gen = createGenerator<Record<string, unknown>>({
      id: "bad-weights",
      *generate(_inputs, step) {
        yield step(makeStepInput({
          visualActions: [{
            type: "showAttentionWeights",
            queryIdx: 0,
            weights: [0.3, 0.3, 0.3], // sums to 0.9, not 1.0
          }],
          isTerminal: true,
        }));
      },
    });

    expect(() => runGenerator(gen, {})).toThrow(GeneratorError);
    expect(() => runGenerator(gen, {})).toThrow("must sum to 1.0");
  });

  it("accepts attention weights that sum to 1.0 within tolerance", () => {
    const gen = createGenerator<Record<string, unknown>>({
      id: "ok-weights",
      *generate(_inputs, step) {
        // These values sum to exactly 1.0 in IEEE 754.
        yield step(makeStepInput({
          visualActions: [{
            type: "showAttentionWeights",
            queryIdx: 0,
            weights: [0.25, 0.25, 0.25, 0.25],
          }],
          isTerminal: true,
        }));
      },
    });

    // Should NOT throw.
    const result = runGenerator(gen, {});
    expect(result.steps.length).toBe(1);
  });

  it("throws when attention weight is outside [0, 1]", () => {
    const gen = createGenerator<Record<string, unknown>>({
      id: "bad-weight-range",
      *generate(_inputs, step) {
        yield step(makeStepInput({
          visualActions: [{
            type: "showAttentionWeights",
            queryIdx: 0,
            weights: [1.5, -0.5],
          }],
          isTerminal: true,
        }));
      },
    });

    expect(() => runGenerator(gen, {})).toThrow(GeneratorError);
    expect(() => runGenerator(gen, {})).toThrow("outside [0, 1]");
  });

  it("throws when compareElements result is invalid", () => {
    const gen = createGenerator<Record<string, unknown>>({
      id: "bad-compare",
      *generate(_inputs, step) {
        yield step(makeStepInput({
          visualActions: [{ type: "compareElements", i: 0, j: 1, result: "invalid" }],
          isTerminal: true,
        }));
      },
    });

    expect(() => runGenerator(gen, {})).toThrow(GeneratorError);
  });

  it("throws when updateBarChart labels and values length mismatch", () => {
    const gen = createGenerator<Record<string, unknown>>({
      id: "bad-bar",
      *generate(_inputs, step) {
        yield step(makeStepInput({
          visualActions: [{
            type: "updateBarChart",
            values: [1, 2, 3],
            labels: ["a", "b"],
          }],
          isTerminal: true,
        }));
      },
    });

    expect(() => runGenerator(gen, {})).toThrow(GeneratorError);
    expect(() => runGenerator(gen, {})).toThrow("labels.length");
  });

  it("silently ignores unknown visual action types", () => {
    const gen = createGenerator<Record<string, unknown>>({
      id: "unknown-action",
      *generate(_inputs, step) {
        yield step(makeStepInput({
          visualActions: [{ type: "futureQuantumAction", data: 42 }],
          isTerminal: true,
        }));
      },
    });

    // Should NOT throw.
    const result = runGenerator(gen, {});
    expect(result.steps.length).toBe(1);
  });
});

// ─── Error Wrapping ─────────────────────────────────────────────────────────

describe("GeneratorRunner — Error Wrapping", () => {
  it("wraps unexpected generator errors with context", () => {
    const gen = createGenerator<Record<string, unknown>>({
      id: "throw-gen",
      *generate(_inputs, step) {
        yield step(makeStepInput());
        throw new Error("Something broke");
      },
    });

    expect(() => runGenerator(gen, {})).toThrow(GeneratorError);
    try {
      runGenerator(gen, {});
    } catch (e) {
      const err = e as GeneratorError;
      expect(err.algorithmId).toBe("throw-gen");
      expect(err.message).toContain("Something broke");
    }
  });

  it("preserves GeneratorError cause chain", () => {
    const gen = createGenerator<Record<string, unknown>>({
      id: "cause-gen",
      *generate(_inputs, step) {
        throw new TypeError("type error");
      },
    });

    try {
      runGenerator(gen, {});
    } catch (e) {
      const err = e as GeneratorError;
      expect(err.cause).toBeInstanceOf(TypeError);
    }
  });
});
