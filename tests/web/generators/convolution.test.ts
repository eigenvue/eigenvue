/**
 * @fileoverview Convolution Generator — Unit Tests
 *
 * Validates step structure, algorithmic correctness, and edge cases.
 * Tests the 2D Convolution generator from the cross-platform test location.
 */

import { describe, it, expect } from "vitest";
import { runGenerator } from "@/engine/generator";
import convolutionGenerator from "../../../algorithms/deep-learning/convolution/generator";

import identityFixture from "../../../algorithms/deep-learning/convolution/tests/identity-kernel.fixture.json";
import edgeFixture from "../../../algorithms/deep-learning/convolution/tests/edge-detection.fixture.json";
import blurFixture from "../../../algorithms/deep-learning/convolution/tests/blur-kernel.fixture.json";

/** Helper: run generator and return steps array. */
function run(inputs: { input: number[][]; kernel: number[][] }) {
  return runGenerator(convolutionGenerator, inputs).steps;
}

/** Helper: validate structural invariants on any step array. */
function validateStepStructure(steps: readonly any[]) {
  expect(steps.length).toBeGreaterThan(0);

  // Indices are 0-based and contiguous.
  steps.forEach((s, i) => {
    expect(s.index).toBe(i);
  });

  // Last step is terminal.
  expect(steps[steps.length - 1].isTerminal).toBe(true);

  // No non-last step is terminal.
  for (let i = 0; i < steps.length - 1; i++) {
    expect(steps[i].isTerminal).toBe(false);
  }

  // All steps have required fields with correct types.
  for (const s of steps) {
    expect(typeof s.id).toBe("string");
    expect(typeof s.title).toBe("string");
    expect(typeof s.explanation).toBe("string");
    expect(Array.isArray(s.visualActions)).toBe(true);
    expect(s.state).toBeDefined();
  }
}

/** Helper: recursively check no NaN or Infinity in any state value. */
function hasNoNaNOrInfinity(obj: unknown): boolean {
  if (typeof obj === "number") return isFinite(obj);
  if (Array.isArray(obj)) return obj.every(hasNoNaNOrInfinity);
  if (obj && typeof obj === "object")
    return Object.values(obj).every(hasNoNaNOrInfinity);
  return true;
}

describe("Convolution Generator", () => {
  // ── Step Structure Validation ─────────────────────────────────────────

  it("validates step structure for identity-kernel fixture", () => {
    const steps = run(
      identityFixture.inputs as { input: number[][]; kernel: number[][] },
    );
    validateStepStructure(steps);
  });

  it("validates step structure for edge-detection fixture", () => {
    const steps = run(
      edgeFixture.inputs as { input: number[][]; kernel: number[][] },
    );
    validateStepStructure(steps);
  });

  it("validates step structure for blur-kernel fixture", () => {
    const steps = run(
      blurFixture.inputs as { input: number[][]; kernel: number[][] },
    );
    validateStepStructure(steps);
  });

  // ── Step Count ────────────────────────────────────────────────────────

  it("step count = 11 for identity-kernel fixture (show-input + 9 conv steps + complete)", () => {
    const steps = run(
      identityFixture.inputs as { input: number[][]; kernel: number[][] },
    );
    expect(steps.length).toBe(11);
  });

  it("step count = 11 for edge-detection fixture", () => {
    const steps = run(
      edgeFixture.inputs as { input: number[][]; kernel: number[][] },
    );
    expect(steps.length).toBe(11);
  });

  it("step count = 11 for blur-kernel fixture", () => {
    const steps = run(
      blurFixture.inputs as { input: number[][]; kernel: number[][] },
    );
    expect(steps.length).toBe(11);
  });

  // ── Output Dimensions ─────────────────────────────────────────────────

  it("output dimensions match (H - kH + 1) x (W - kW + 1) for identity", () => {
    const inputs = identityFixture.inputs as {
      input: number[][];
      kernel: number[][];
    };
    const steps = run(inputs);
    const lastStep = steps[steps.length - 1]!;
    const state = lastStep.state as Record<string, unknown>;
    const outputGrid = state.outputGrid as number[][];

    const expectedH = inputs.input.length - inputs.kernel.length + 1;
    const expectedW = inputs.input[0]!.length - inputs.kernel[0]!.length + 1;

    expect(outputGrid.length).toBe(expectedH);
    expect(outputGrid[0]!.length).toBe(expectedW);
  });

  it("output dimensions match (H - kH + 1) x (W - kW + 1) for edge-detection", () => {
    const inputs = edgeFixture.inputs as {
      input: number[][];
      kernel: number[][];
    };
    const steps = run(inputs);
    const lastStep = steps[steps.length - 1]!;
    const state = lastStep.state as Record<string, unknown>;
    const outputGrid = state.outputGrid as number[][];

    const expectedH = inputs.input.length - inputs.kernel.length + 1;
    const expectedW = inputs.input[0]!.length - inputs.kernel[0]!.length + 1;

    expect(outputGrid.length).toBe(expectedH);
    expect(outputGrid[0]!.length).toBe(expectedW);
  });

  it("output dimensions match (H - kH + 1) x (W - kW + 1) for blur", () => {
    const inputs = blurFixture.inputs as {
      input: number[][];
      kernel: number[][];
    };
    const steps = run(inputs);
    const lastStep = steps[steps.length - 1]!;
    const state = lastStep.state as Record<string, unknown>;
    const outputGrid = state.outputGrid as number[][];

    const expectedH = inputs.input.length - inputs.kernel.length + 1;
    const expectedW = inputs.input[0]!.length - inputs.kernel[0]!.length + 1;

    expect(outputGrid.length).toBe(expectedH);
    expect(outputGrid[0]!.length).toBe(expectedW);
  });

  // ── Identity Kernel ───────────────────────────────────────────────────

  it("identity kernel: output[r][c] === input[r][c] for all cells", () => {
    const inputs = identityFixture.inputs as {
      input: number[][];
      kernel: number[][];
    };
    const steps = run(inputs);
    const lastStep = steps[steps.length - 1]!;
    const state = lastStep.state as Record<string, unknown>;
    const outputGrid = state.outputGrid as number[][];

    // Identity kernel [[1]] means output equals input (same dimensions for 1x1 kernel)
    for (let r = 0; r < outputGrid.length; r++) {
      for (let c = 0; c < outputGrid[r]!.length; c++) {
        expect(outputGrid[r]![c]).toBe(inputs.input[r]![c]);
      }
    }
  });

  // ── Edge Detection ────────────────────────────────────────────────────

  it("edge detection: center cell output (conv-1-1) sum = 0", () => {
    const steps = run(
      edgeFixture.inputs as { input: number[][]; kernel: number[][] },
    );
    // conv-1-1 is the center of the 3x3 output
    const convStep = steps.find((s: any) => s.id === "conv-1-1")!;
    expect(convStep).toBeDefined();
    const state = convStep.state as Record<string, unknown>;
    expect(state.sum).toBe(0);
  });

  // ── Blur Kernel ───────────────────────────────────────────────────────

  it("blur kernel: conv-0-0 sum = 3.0 (0.25*(1+2+4+5))", () => {
    const steps = run(
      blurFixture.inputs as { input: number[][]; kernel: number[][] },
    );
    const convStep = steps.find((s: any) => s.id === "conv-0-0")!;
    expect(convStep).toBeDefined();
    const state = convStep.state as Record<string, unknown>;
    expect(state.sum).toBeCloseTo(3.0, 10);
  });

  // ── Each Conv Step Has Correct Sum ────────────────────────────────────

  it("each conv step has correct sum in state", () => {
    const inputs = blurFixture.inputs as {
      input: number[][];
      kernel: number[][];
    };
    const steps = run(inputs);

    const H = inputs.input.length;
    const W = inputs.input[0]!.length;
    const kH = inputs.kernel.length;
    const kW = inputs.kernel[0]!.length;
    const outH = H - kH + 1;
    const outW = W - kW + 1;

    for (let r = 0; r < outH; r++) {
      for (let c = 0; c < outW; c++) {
        const convStep = steps.find(
          (s: any) => s.id === `conv-${r}-${c}`,
        )!;
        expect(convStep).toBeDefined();
        const state = convStep.state as Record<string, unknown>;

        // Manually compute expected sum
        let expectedSum = 0;
        for (let kr = 0; kr < kH; kr++) {
          for (let kc = 0; kc < kW; kc++) {
            expectedSum +=
              inputs.input[r + kr]![c + kc]! * inputs.kernel[kr]![kc]!;
          }
        }

        expect(state.sum).toBeCloseTo(expectedSum, 10);
      }
    }
  });

  // ── Terminal Step ─────────────────────────────────────────────────────

  it("terminal step id = 'complete'", () => {
    const steps = run(
      identityFixture.inputs as { input: number[][]; kernel: number[][] },
    );
    expect(steps[steps.length - 1].id).toBe("complete");
  });

  // ── Determinism ───────────────────────────────────────────────────────

  it("is deterministic: running twice produces identical steps", () => {
    const inputs = edgeFixture.inputs as {
      input: number[][];
      kernel: number[][];
    };
    const steps1 = run(inputs);
    const steps2 = run(inputs);

    expect(steps1.length).toBe(steps2.length);
    for (let i = 0; i < steps1.length; i++) {
      expect(steps1[i]!.id).toBe(steps2[i]!.id);
      expect(steps1[i]!.state).toEqual(steps2[i]!.state);
    }
  });

  // ── No NaN or Infinity ────────────────────────────────────────────────

  it("has no NaN or Infinity in any state values (identity)", () => {
    const steps = run(
      identityFixture.inputs as { input: number[][]; kernel: number[][] },
    );
    for (const s of steps) {
      expect(hasNoNaNOrInfinity(s.state)).toBe(true);
    }
  });

  it("has no NaN or Infinity in any state values (edge-detection)", () => {
    const steps = run(
      edgeFixture.inputs as { input: number[][]; kernel: number[][] },
    );
    for (const s of steps) {
      expect(hasNoNaNOrInfinity(s.state)).toBe(true);
    }
  });

  it("has no NaN or Infinity in any state values (blur)", () => {
    const steps = run(
      blurFixture.inputs as { input: number[][]; kernel: number[][] },
    );
    for (const s of steps) {
      expect(hasNoNaNOrInfinity(s.state)).toBe(true);
    }
  });
});
