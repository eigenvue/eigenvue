/**
 * @fileoverview Tests for AnimationManager.
 *
 * The AnimationManager orchestrates animated transitions between scenes
 * using requestAnimationFrame. These tests mock rAF and performance.now()
 * to verify transition behavior synchronously.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AnimationManager } from "../animation/AnimationManager";
import type { PrimitiveScene, ElementPrimitive } from "../types";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeElement(overrides: Partial<ElementPrimitive> = {}): ElementPrimitive {
  return {
    kind: "element",
    id: "cell-0",
    x: 100,
    y: 100,
    width: 50,
    height: 50,
    shape: "rect",
    cornerRadius: 4,
    fillColor: "#ff0000",
    strokeColor: "#000000",
    strokeWidth: 2,
    label: "A",
    labelFontSize: 14,
    labelColor: "#ffffff",
    subLabel: "0",
    subLabelFontSize: 10,
    subLabelColor: "#666666",
    rotation: 0,
    opacity: 1,
    zIndex: 30,
    ...overrides,
  };
}

function makeScene(primitives: PrimitiveScene["primitives"]): PrimitiveScene {
  return { primitives };
}

// ---------------------------------------------------------------------------
// Mock setup for requestAnimationFrame / performance.now
// ---------------------------------------------------------------------------

let mockTime: number;
let rafCallbacks: Map<number, (time: number) => void>;
let nextRafId: number;

function setupMocks(): void {
  mockTime = 0;
  rafCallbacks = new Map();
  nextRafId = 1;

  vi.stubGlobal("performance", {
    now: () => mockTime,
  });

  vi.stubGlobal("requestAnimationFrame", (cb: (time: number) => void) => {
    const id = nextRafId++;
    rafCallbacks.set(id, cb);
    return id;
  });

  vi.stubGlobal("cancelAnimationFrame", (id: number) => {
    rafCallbacks.delete(id);
  });
}

/** Advance time and fire all pending rAF callbacks. */
function advanceTime(ms: number): void {
  mockTime += ms;
  // Copy to avoid mutation during iteration.
  const callbacks = new Map(rafCallbacks);
  rafCallbacks.clear();
  for (const [, cb] of callbacks) {
    cb(mockTime);
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AnimationManager", () => {
  beforeEach(() => {
    setupMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // =========================================================================
  // jumpTo
  // =========================================================================
  describe("jumpTo", () => {
    it("calls onFrame immediately with the given scene", () => {
      const onFrame = vi.fn();
      const manager = new AnimationManager(onFrame);

      const scene = makeScene([makeElement({ x: 200 })]);
      manager.jumpTo(scene);

      expect(onFrame).toHaveBeenCalledTimes(1);
      expect(onFrame).toHaveBeenCalledWith(scene);
    });

    it("cancels any in-progress transition", () => {
      const onFrame = vi.fn();
      const manager = new AnimationManager(onFrame, { durationMs: 400 });

      const scene1 = makeScene([makeElement({ x: 100 })]);
      const scene2 = makeScene([makeElement({ x: 200 })]);
      const scene3 = makeScene([makeElement({ x: 300 })]);

      manager.jumpTo(scene1);
      onFrame.mockClear();

      // Start a transition.
      manager.transitionTo(scene2);

      // Partway through, jump to scene3.
      advanceTime(100);
      onFrame.mockClear();

      manager.jumpTo(scene3);

      expect(onFrame).toHaveBeenCalledTimes(1);
      expect(onFrame).toHaveBeenCalledWith(scene3);

      // No further callbacks after the jump (rAF should be cancelled).
      onFrame.mockClear();
      advanceTime(500);
      expect(onFrame).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // transitionTo with durationMs: 0 (instant)
  // =========================================================================
  describe("transitionTo with durationMs: 0", () => {
    it("applies target instantly without animation", () => {
      const onFrame = vi.fn();
      const manager = new AnimationManager(onFrame, { durationMs: 0 });

      const scene = makeScene([makeElement({ x: 200 })]);
      manager.transitionTo(scene);

      expect(onFrame).toHaveBeenCalledTimes(1);
      expect(onFrame).toHaveBeenCalledWith(scene);

      // No rAF callbacks should be pending.
      expect(rafCallbacks.size).toBe(0);
    });
  });

  // =========================================================================
  // transitionTo with animation
  // =========================================================================
  describe("transitionTo with animation", () => {
    it("calls onFrame with intermediate scenes during transition", () => {
      const onFrame = vi.fn();
      const manager = new AnimationManager(onFrame, { durationMs: 400 });

      const scene1 = makeScene([makeElement({ id: "cell-0", x: 100 })]);
      const scene2 = makeScene([makeElement({ id: "cell-0", x: 200 })]);

      manager.jumpTo(scene1);
      onFrame.mockClear();

      manager.transitionTo(scene2);

      // First frame is called immediately in the tick.
      expect(onFrame).toHaveBeenCalledTimes(1);

      // Advance partway.
      advanceTime(200);
      expect(onFrame.mock.calls.length).toBeGreaterThanOrEqual(2);

      // The intermediate scene should have interpolated x.
      const intermediateScene = onFrame.mock.calls[onFrame.mock.calls.length - 1]![0] as PrimitiveScene;
      const elem = intermediateScene.primitives[0] as ElementPrimitive;
      expect(elem.x).toBeGreaterThan(100);
      expect(elem.x).toBeLessThan(200);
    });

    it("completes transition and delivers final target scene", () => {
      const onFrame = vi.fn();
      const manager = new AnimationManager(onFrame, { durationMs: 400 });

      const scene1 = makeScene([makeElement({ id: "cell-0", x: 100 })]);
      const scene2 = makeScene([makeElement({ id: "cell-0", x: 200 })]);

      manager.jumpTo(scene1);
      onFrame.mockClear();

      manager.transitionTo(scene2);

      // Advance past the entire duration.
      advanceTime(200);
      advanceTime(200);
      advanceTime(100); // Extra to ensure completion.

      // The last call should be the final target scene.
      const lastCall = onFrame.mock.calls[onFrame.mock.calls.length - 1]![0] as PrimitiveScene;
      const elem = lastCall.primitives[0] as ElementPrimitive;
      expect(elem.x).toBe(200);
    });

    it("stops calling onFrame after transition completes", () => {
      const onFrame = vi.fn();
      const manager = new AnimationManager(onFrame, { durationMs: 100 });

      const scene1 = makeScene([makeElement({ id: "cell-0", x: 100 })]);
      const scene2 = makeScene([makeElement({ id: "cell-0", x: 200 })]);

      manager.jumpTo(scene1);
      onFrame.mockClear();

      manager.transitionTo(scene2);

      // Complete the transition.
      advanceTime(50);
      advanceTime(60);

      const callCountAfterComplete = onFrame.mock.calls.length;

      // No more frames should fire.
      advanceTime(500);
      expect(onFrame.mock.calls.length).toBe(callCountAfterComplete);
    });
  });

  // =========================================================================
  // dispose
  // =========================================================================
  describe("dispose", () => {
    it("cancels pending animation frames", () => {
      const onFrame = vi.fn();
      const manager = new AnimationManager(onFrame, { durationMs: 400 });

      const scene1 = makeScene([makeElement({ id: "cell-0", x: 100 })]);
      const scene2 = makeScene([makeElement({ id: "cell-0", x: 200 })]);

      manager.jumpTo(scene1);
      manager.transitionTo(scene2);

      // A rAF callback is now pending.
      const callCountBeforeDispose = onFrame.mock.calls.length;

      manager.dispose();

      // Advancing time should not produce more frames.
      advanceTime(500);
      expect(onFrame.mock.calls.length).toBe(callCountBeforeDispose);
    });
  });

  // =========================================================================
  // getCurrentScene
  // =========================================================================
  describe("getCurrentScene", () => {
    it("returns the current scene after jumpTo", () => {
      const onFrame = vi.fn();
      const manager = new AnimationManager(onFrame);

      const scene = makeScene([makeElement({ x: 300 })]);
      manager.jumpTo(scene);

      expect(manager.getCurrentScene()).toBe(scene);
    });

    it("returns empty scene initially", () => {
      const onFrame = vi.fn();
      const manager = new AnimationManager(onFrame);

      const current = manager.getCurrentScene();
      expect(current.primitives).toEqual([]);
    });
  });

  // =========================================================================
  // updateConfig
  // =========================================================================
  describe("updateConfig", () => {
    it("changes duration for future transitions", () => {
      const onFrame = vi.fn();
      const manager = new AnimationManager(onFrame, { durationMs: 400 });

      // Update to instant.
      manager.updateConfig({ durationMs: 0 });

      const scene1 = makeScene([makeElement({ id: "cell-0", x: 100 })]);
      const scene2 = makeScene([makeElement({ id: "cell-0", x: 200 })]);

      manager.jumpTo(scene1);
      onFrame.mockClear();

      manager.transitionTo(scene2);

      // Should be instant now.
      expect(onFrame).toHaveBeenCalledTimes(1);
      expect(onFrame).toHaveBeenCalledWith(scene2);
      expect(rafCallbacks.size).toBe(0);
    });
  });
});
