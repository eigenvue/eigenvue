/**
 * @fileoverview Sandbox Runtime Unit Tests
 *
 * Tests the core sandbox runtime: step() function validation,
 * utils helpers, console capture, and state management.
 */

import { describe, it, expect } from "vitest";
import { createSandboxRuntime } from "../sandbox-runtime";

const DEFAULT_CONFIG = { maxSteps: 500, maxStateSizeBytes: 1_048_576 };

describe("createSandboxRuntime", () => {
  describe("step() function", () => {
    it("creates a step with auto-incremented index", () => {
      const runtime = createSandboxRuntime(DEFAULT_CONFIG);

      runtime.step({
        title: "Step 0",
        explanation: "First step",
        state: { x: 1 },
        visualActions: [],
      });

      runtime.step({
        title: "Step 1",
        explanation: "Second step",
        state: { x: 2 },
        visualActions: [],
      });

      const steps = runtime.getSteps();
      expect(steps).toHaveLength(2);
      expect(steps[0]!.index).toBe(0);
      expect(steps[1]!.index).toBe(1);
    });

    it("auto-generates step IDs", () => {
      const runtime = createSandboxRuntime(DEFAULT_CONFIG);

      runtime.step({
        title: "Test",
        explanation: "test",
        state: {},
        visualActions: [],
      });

      const steps = runtime.getSteps();
      expect(steps[0]!.id).toBe("user_step_0");
    });

    it("deep-clones state via JSON serialization round-trip", () => {
      const runtime = createSandboxRuntime(DEFAULT_CONFIG);
      const arr = [1, 2, 3];

      runtime.step({
        title: "Test",
        explanation: "test",
        state: { array: arr },
        visualActions: [],
      });

      // Mutating the original array should NOT affect the step's state.
      arr.push(4);

      const steps = runtime.getSteps();
      expect(steps[0]!.state).toEqual({ array: [1, 2, 3] });
    });

    it("deep-clones visualActions", () => {
      const runtime = createSandboxRuntime(DEFAULT_CONFIG);
      const actions = [{ type: "highlightElement", index: 0 }];

      runtime.step({
        title: "Test",
        explanation: "test",
        state: {},
        visualActions: actions,
      });

      // Mutating the original actions should NOT affect the step.
      actions.push({ type: "foo", index: 1 });

      const steps = runtime.getSteps();
      expect(steps[0]!.visualActions).toHaveLength(1);
    });

    it("sets empty code highlight for user-generated steps", () => {
      const runtime = createSandboxRuntime(DEFAULT_CONFIG);

      runtime.step({
        title: "Test",
        explanation: "test",
        state: {},
        visualActions: [],
      });

      const steps = runtime.getSteps();
      expect(steps[0]!.codeHighlight).toEqual({
        language: "javascript",
        lines: [],
      });
    });

    it("handles isTerminal flag correctly", () => {
      const runtime = createSandboxRuntime(DEFAULT_CONFIG);

      runtime.step({
        title: "Step 0",
        explanation: "not terminal",
        state: {},
        visualActions: [],
      });

      runtime.step({
        title: "Step 1",
        explanation: "terminal",
        state: {},
        visualActions: [],
        isTerminal: true,
      });

      const steps = runtime.getSteps();
      expect(steps[0]!.isTerminal).toBe(false);
      expect(steps[1]!.isTerminal).toBe(true);
    });

    it("handles optional phase field", () => {
      const runtime = createSandboxRuntime(DEFAULT_CONFIG);

      runtime.step({
        title: "Test",
        explanation: "test",
        state: {},
        visualActions: [],
        phase: "initialization",
      });

      const steps = runtime.getSteps();
      expect(steps[0]!.phase).toBe("initialization");
    });
  });

  describe("step() validation", () => {
    it("throws when step limit is exceeded", () => {
      const runtime = createSandboxRuntime({ maxSteps: 2, maxStateSizeBytes: 1_048_576 });

      runtime.step({ title: "1", explanation: "", state: {}, visualActions: [] });
      runtime.step({ title: "2", explanation: "", state: {}, visualActions: [] });

      expect(() =>
        runtime.step({ title: "3", explanation: "", state: {}, visualActions: [] }),
      ).toThrow("Step limit exceeded");
    });

    it("throws for empty title", () => {
      const runtime = createSandboxRuntime(DEFAULT_CONFIG);

      expect(() =>
        runtime.step({ title: "", explanation: "", state: {}, visualActions: [] }),
      ).toThrow("title must be a non-empty string");
    });

    it("throws for title exceeding 200 characters", () => {
      const runtime = createSandboxRuntime(DEFAULT_CONFIG);
      const longTitle = "a".repeat(201);

      expect(() =>
        runtime.step({ title: longTitle, explanation: "", state: {}, visualActions: [] }),
      ).toThrow("title exceeds 200 characters");
    });

    it("throws for non-string explanation", () => {
      const runtime = createSandboxRuntime(DEFAULT_CONFIG);

      expect(() =>
        runtime.step({
          title: "T",
          explanation: 42 as unknown as string,
          state: {},
          visualActions: [],
        }),
      ).toThrow("explanation must be a string");
    });

    it("throws for non-JSON-serializable state", () => {
      const runtime = createSandboxRuntime(DEFAULT_CONFIG);
      const circular: Record<string, unknown> = {};
      circular["self"] = circular;

      expect(() =>
        runtime.step({ title: "T", explanation: "", state: circular, visualActions: [] }),
      ).toThrow("not JSON-serializable");
    });

    it("throws when state exceeds size limit", () => {
      const runtime = createSandboxRuntime({ maxSteps: 500, maxStateSizeBytes: 100 });
      const bigState = { data: "x".repeat(200) };

      expect(() =>
        runtime.step({ title: "T", explanation: "", state: bigState, visualActions: [] }),
      ).toThrow("state size");
    });

    it("throws for non-array visualActions", () => {
      const runtime = createSandboxRuntime(DEFAULT_CONFIG);

      expect(() =>
        runtime.step({
          title: "T",
          explanation: "",
          state: {},
          visualActions: "not-an-array" as unknown as [],
        }),
      ).toThrow("visualActions must be an array");
    });

    it("throws for invalid visual action (missing type)", () => {
      const runtime = createSandboxRuntime(DEFAULT_CONFIG);

      expect(() =>
        runtime.step({
          title: "T",
          explanation: "",
          state: {},
          visualActions: [{ notType: "foo" } as unknown as { type: string }],
        }),
      ).toThrow('string "type" property');
    });
  });

  describe("terminate()", () => {
    it("causes subsequent step() calls to throw", () => {
      const runtime = createSandboxRuntime(DEFAULT_CONFIG);
      runtime.terminate();

      expect(() =>
        runtime.step({ title: "T", explanation: "", state: {}, visualActions: [] }),
      ).toThrow("__SANDBOX_TERMINATED__");
    });
  });

  describe("getSteps()", () => {
    it("returns a copy of the steps array", () => {
      const runtime = createSandboxRuntime(DEFAULT_CONFIG);

      runtime.step({ title: "T", explanation: "", state: {}, visualActions: [] });

      const steps1 = runtime.getSteps();
      const steps2 = runtime.getSteps();
      expect(steps1).not.toBe(steps2);
      expect(steps1).toEqual(steps2);
    });
  });

  describe("getTotalStateSizeBytes()", () => {
    it("tracks cumulative state size", () => {
      const runtime = createSandboxRuntime(DEFAULT_CONFIG);

      runtime.step({
        title: "T",
        explanation: "",
        state: { data: "hello" },
        visualActions: [],
      });

      expect(runtime.getTotalStateSizeBytes()).toBeGreaterThan(0);

      runtime.step({
        title: "T",
        explanation: "",
        state: { data: "world" },
        visualActions: [],
      });

      // Second step adds more bytes.
      expect(runtime.getTotalStateSizeBytes()).toBeGreaterThan(10);
    });
  });

  describe("utils", () => {
    it("deepClone creates independent copies", () => {
      const runtime = createSandboxRuntime(DEFAULT_CONFIG);
      const original = { nested: { value: [1, 2, 3] } };
      const cloned = runtime.utils.deepClone(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.nested).not.toBe(original.nested);

      cloned.nested.value.push(4);
      expect(original.nested.value).toEqual([1, 2, 3]);
    });

    it("range produces correct sequences", () => {
      const runtime = createSandboxRuntime(DEFAULT_CONFIG);

      expect(runtime.utils.range(0, 5)).toEqual([0, 1, 2, 3, 4]);
      expect(runtime.utils.range(2, 10, 3)).toEqual([2, 5, 8]);
      expect(runtime.utils.range(5, 0, -1)).toEqual([5, 4, 3, 2, 1]);
      expect(runtime.utils.range(5, 5)).toEqual([]);
    });

    it("range throws for step 0", () => {
      const runtime = createSandboxRuntime(DEFAULT_CONFIG);
      expect(() => runtime.utils.range(0, 10, 0)).toThrow("step cannot be 0");
    });

    it("createMatrix has correct dimensions", () => {
      const runtime = createSandboxRuntime(DEFAULT_CONFIG);
      const matrix = runtime.utils.createMatrix(3, 4);

      expect(matrix).toHaveLength(3);
      for (const row of matrix) {
        expect(row).toHaveLength(4);
        for (const cell of row) {
          expect(cell).toBe(0);
        }
      }
    });

    it("createMatrix with custom fill value", () => {
      const runtime = createSandboxRuntime(DEFAULT_CONFIG);
      const matrix = runtime.utils.createMatrix(2, 2, "x");

      expect(matrix).toEqual([
        ["x", "x"],
        ["x", "x"],
      ]);
    });

    it("createMatrix rows are independent arrays", () => {
      const runtime = createSandboxRuntime(DEFAULT_CONFIG);
      const matrix = runtime.utils.createMatrix(2, 3, 0);

      matrix[0]![1] = 99;
      expect(matrix[1]![1]).toBe(0);
    });

    it("createMatrix deep-clones non-primitive fill values", () => {
      const runtime = createSandboxRuntime(DEFAULT_CONFIG);
      const matrix = runtime.utils.createMatrix(2, 2, [0, 0]);

      // Mutating one cell should NOT affect other cells.
      (matrix[0]![0] as number[])[0] = 99;
      expect((matrix[0]![1] as number[])[0]).toBe(0);
      expect((matrix[1]![0] as number[])[0]).toBe(0);
      expect((matrix[1]![1] as number[])[0]).toBe(0);
    });

    it("createMatrix deep-clones object fill values", () => {
      const runtime = createSandboxRuntime(DEFAULT_CONFIG);
      const matrix = runtime.utils.createMatrix(2, 2, { value: 0 });

      // Each cell should be an independent object.
      (matrix[0]![0] as { value: number }).value = 42;
      expect((matrix[0]![1] as { value: number }).value).toBe(0);
      expect((matrix[1]![0] as { value: number }).value).toBe(0);
    });

    it("shuffle is deterministic with same seed", () => {
      const runtime = createSandboxRuntime(DEFAULT_CONFIG);
      const arr1 = [1, 2, 3, 4, 5];
      const arr2 = [1, 2, 3, 4, 5];

      runtime.utils.shuffle(arr1, 42);
      runtime.utils.shuffle(arr2, 42);
      expect(arr1).toEqual(arr2);
    });

    it("shuffle produces different results with different seeds", () => {
      const runtime = createSandboxRuntime(DEFAULT_CONFIG);
      const arr1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const arr2 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      runtime.utils.shuffle(arr1, 42);
      runtime.utils.shuffle(arr2, 123);
      expect(arr1).not.toEqual(arr2);
    });

    it("randomInt returns value in range", () => {
      const runtime = createSandboxRuntime(DEFAULT_CONFIG);
      const result = runtime.utils.randomInt(1, 10);

      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(10);
    });

    it("randomInt is deterministic across runtimes with same seed", () => {
      const runtime1 = createSandboxRuntime(DEFAULT_CONFIG);
      const runtime2 = createSandboxRuntime(DEFAULT_CONFIG);
      const r1 = runtime1.utils.randomInt(1, 100, 42);
      const r2 = runtime2.utils.randomInt(1, 100, 42);
      expect(r1).toBe(r2);
    });

    it("randomInt produces a sequence with same seed on sequential calls", () => {
      const runtime = createSandboxRuntime(DEFAULT_CONFIG);
      const r1 = runtime.utils.randomInt(1, 100, 42);
      const r2 = runtime.utils.randomInt(1, 100, 42);
      // Sequential calls advance the shared PRNG, producing different values.
      expect(r1).not.toBe(r2);
    });

    it("randomInt resets PRNG when seed changes", () => {
      const runtime1 = createSandboxRuntime(DEFAULT_CONFIG);
      const runtime2 = createSandboxRuntime(DEFAULT_CONFIG);
      // First call with seed 42 on both runtimes should be identical.
      runtime1.utils.randomInt(1, 100, 42);
      // Switch to seed 99 and back to 42 — should start fresh sequence.
      runtime1.utils.randomInt(1, 100, 99);
      const afterSwitch = runtime1.utils.randomInt(1, 100, 42);
      const fresh = runtime2.utils.randomInt(1, 100, 42);
      expect(afterSwitch).toBe(fresh);
    });

    it("formatNumber formats correctly", () => {
      const runtime = createSandboxRuntime(DEFAULT_CONFIG);

      expect(runtime.utils.formatNumber(3.14159)).toBe("3.14");
      expect(runtime.utils.formatNumber(3.14159, 4)).toBe("3.1416");
      expect(runtime.utils.formatNumber(42, 0)).toBe("42");
    });
  });

  describe("console capture", () => {
    it("captures console.log calls", () => {
      const runtime = createSandboxRuntime(DEFAULT_CONFIG);

      runtime.console.log("hello", 42);
      runtime.console.warn("warning!");
      runtime.console.error("error!");
      runtime.console.info("info");

      const logs = runtime.getConsoleLogs();
      expect(logs).toHaveLength(4);
      expect(logs[0]).toEqual({ level: "log", args: ["hello", 42] });
      expect(logs[1]).toEqual({ level: "warn", args: ["warning!"] });
      expect(logs[2]).toEqual({ level: "error", args: ["error!"] });
      expect(logs[3]).toEqual({ level: "info", args: ["info"] });
    });
  });
});
