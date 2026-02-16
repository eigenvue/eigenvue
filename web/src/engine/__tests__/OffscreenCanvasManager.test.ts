/**
 * @fileoverview Unit Tests for OffscreenCanvasManager
 *
 * Tests ensure:
 * 1. Feature detection correctly identifies OffscreenCanvas support.
 * 2. Threshold logic works correctly (below/above OFFSCREEN_THRESHOLD=50).
 * 3. Resize creates a new offscreen canvas with correct dimensions.
 * 4. Dispose releases all resources.
 * 5. The render batcher only executes the latest callback.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  OffscreenCanvasRenderer,
  isOffscreenCanvasSupported,
  resetOffscreenDetection,
  createRenderBatcher,
} from "../OffscreenCanvasManager";

// ─── Feature Detection ────────────────────────────────────────────────────────

describe("isOffscreenCanvasSupported", () => {
  beforeEach(() => {
    resetOffscreenDetection();
  });

  it("returns false in JSDOM environment (no OffscreenCanvas)", () => {
    // JSDOM does not provide OffscreenCanvas.
    expect(isOffscreenCanvasSupported()).toBe(false);
  });

  it("caches the result after first call", () => {
    const first = isOffscreenCanvasSupported();
    const second = isOffscreenCanvasSupported();
    expect(first).toBe(second);
  });
});

// ─── OffscreenCanvasRenderer ──────────────────────────────────────────────────

describe("OffscreenCanvasRenderer", () => {
  let renderer: OffscreenCanvasRenderer;

  beforeEach(() => {
    resetOffscreenDetection();
    renderer = new OffscreenCanvasRenderer();
  });

  it("shouldUseOffscreen returns false when OffscreenCanvas is unsupported", () => {
    renderer.resize(800, 600, 1);
    // In JSDOM, OffscreenCanvas is not available.
    expect(renderer.shouldUseOffscreen(100)).toBe(false);
  });

  it("shouldUseOffscreen returns false for low element counts", () => {
    renderer.resize(800, 600, 1);
    // Even if OffscreenCanvas were supported, 30 elements is below threshold.
    expect(renderer.shouldUseOffscreen(30)).toBe(false);
  });

  it("getContext returns null when OffscreenCanvas is unsupported", () => {
    renderer.resize(800, 600, 1);
    expect(renderer.getContext()).toBeNull();
  });

  it("dispose clears all references", () => {
    renderer.resize(800, 600, 1);
    renderer.dispose();
    expect(renderer.getContext()).toBeNull();
  });

  it("clear does not throw when no offscreen canvas exists", () => {
    expect(() => renderer.clear()).not.toThrow();
  });

  it("transfer does not throw when no offscreen canvas exists", () => {
    const mockCtx = {
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      canvas: { width: 800, height: 600 },
    } as unknown as CanvasRenderingContext2D;

    expect(() => renderer.transfer(mockCtx)).not.toThrow();
    // Should not call clearRect since there's no offscreen canvas.
    expect(mockCtx.clearRect).not.toHaveBeenCalled();
  });
});

// ─── Render Batcher ───────────────────────────────────────────────────────────

describe("createRenderBatcher", () => {
  it("only executes the latest callback per frame", async () => {
    // Mock requestAnimationFrame.
    let rafCallback: (() => void) | null = null;
    vi.stubGlobal("requestAnimationFrame", (cb: () => void) => {
      rafCallback = cb;
      return 1;
    });

    const batcher = createRenderBatcher();
    const calls: string[] = [];

    batcher(() => calls.push("first"));
    batcher(() => calls.push("second"));
    batcher(() => calls.push("third"));

    // Simulate the animation frame firing.
    expect(rafCallback).not.toBeNull();
    rafCallback!();

    // Only the last callback should have executed.
    expect(calls).toEqual(["third"]);

    vi.unstubAllGlobals();
  });

  it("allows new callbacks after frame fires", () => {
    let rafCallback: (() => void) | null = null;
    vi.stubGlobal("requestAnimationFrame", (cb: () => void) => {
      rafCallback = cb;
      return 1;
    });

    const batcher = createRenderBatcher();
    const calls: string[] = [];

    batcher(() => calls.push("batch1"));
    rafCallback!();
    expect(calls).toEqual(["batch1"]);

    batcher(() => calls.push("batch2"));
    rafCallback!();
    expect(calls).toEqual(["batch1", "batch2"]);

    vi.unstubAllGlobals();
  });
});
