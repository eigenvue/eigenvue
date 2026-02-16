/**
 * @fileoverview Tests for CanvasManager.
 *
 * Tests the Canvas 2D context lifecycle: construction, DPI scaling,
 * size reporting, and cleanup. Uses a mock HTMLCanvasElement since
 * jsdom does not provide a real Canvas 2D context.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CanvasManager } from "../canvas/CanvasManager";

// ---------------------------------------------------------------------------
// Mock canvas and context
// ---------------------------------------------------------------------------

function createMockContext(): CanvasRenderingContext2D {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    setTransform: vi.fn(),
    fillStyle: "",
  } as unknown as CanvasRenderingContext2D;
}

function createMockCanvas(ctxOverride?: CanvasRenderingContext2D | null): HTMLCanvasElement {
  const ctx = ctxOverride === undefined ? createMockContext() : ctxOverride;
  const canvas = {
    getContext: vi.fn().mockReturnValue(ctx),
    getBoundingClientRect: vi.fn().mockReturnValue({
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      right: 800,
      bottom: 600,
    }),
    width: 0,
    height: 0,
  } as unknown as HTMLCanvasElement;
  return canvas;
}

// ---------------------------------------------------------------------------
// Mock globals
// ---------------------------------------------------------------------------

let mockObserverDisconnect: ReturnType<typeof vi.fn>;
let mockObserverObserve: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockObserverDisconnect = vi.fn();
  mockObserverObserve = vi.fn();

  vi.stubGlobal(
    "ResizeObserver",
    class MockResizeObserver {
      constructor(_callback: ResizeObserverCallback) {}
      observe = mockObserverObserve;
      unobserve = vi.fn();
      disconnect = mockObserverDisconnect;
    },
  );

  vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());

  // Default DPR.
  Object.defineProperty(window, "devicePixelRatio", {
    value: 1,
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CanvasManager", () => {
  describe("constructor", () => {
    it("throws if getContext('2d') returns null", () => {
      const canvas = createMockCanvas(null);

      expect(() => new CanvasManager(canvas)).toThrow("Failed to get Canvas 2D rendering context.");
    });

    it("succeeds with a valid 2D context", () => {
      const canvas = createMockCanvas();

      expect(() => new CanvasManager(canvas)).not.toThrow();
    });

    it("observes the canvas for resize events", () => {
      const canvas = createMockCanvas();
      new CanvasManager(canvas);

      expect(mockObserverObserve).toHaveBeenCalledWith(canvas);
    });

    it("sets physical canvas dimensions based on DPI", () => {
      Object.defineProperty(window, "devicePixelRatio", { value: 2 });

      const canvas = createMockCanvas();
      new CanvasManager(canvas);

      // CSS size is 800×600, DPR is 2, so physical should be 1600×1200.
      expect(canvas.width).toBe(1600);
      expect(canvas.height).toBe(1200);
    });
  });

  describe("getSize", () => {
    it("returns CSS pixel dimensions", () => {
      const canvas = createMockCanvas();
      const manager = new CanvasManager(canvas);

      const size = manager.getSize();

      expect(size.width).toBe(800);
      expect(size.height).toBe(600);
    });

    it("returns a copy (not a reference to internal state)", () => {
      const canvas = createMockCanvas();
      const manager = new CanvasManager(canvas);

      const size1 = manager.getSize();
      const size2 = manager.getSize();

      expect(size1).not.toBe(size2);
      expect(size1).toEqual(size2);
    });
  });

  describe("getContext", () => {
    it("returns the 2D rendering context", () => {
      const ctx = createMockContext();
      const canvas = createMockCanvas(ctx);
      const manager = new CanvasManager(canvas);

      expect(manager.getContext()).toBe(ctx);
    });
  });

  describe("renderOnce", () => {
    it("calls the callback with context and size", () => {
      const ctx = createMockContext();
      const canvas = createMockCanvas(ctx);
      const manager = new CanvasManager(canvas);

      const callback = vi.fn();
      manager.renderOnce(callback);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(ctx, { width: 800, height: 600 });
    });

    it("clears the canvas before rendering", () => {
      const ctx = createMockContext();
      const canvas = createMockCanvas(ctx);
      const manager = new CanvasManager(canvas);

      const callback = vi.fn();
      manager.renderOnce(callback);

      expect(ctx.clearRect).toHaveBeenCalled();
    });
  });

  describe("dispose", () => {
    it("disconnects the ResizeObserver", () => {
      const canvas = createMockCanvas();
      const manager = new CanvasManager(canvas);

      manager.dispose();

      expect(mockObserverDisconnect).toHaveBeenCalledTimes(1);
    });

    it("cancels the render loop if active", () => {
      const canvas = createMockCanvas();
      const manager = new CanvasManager(canvas);

      manager.startRenderLoop(vi.fn());
      manager.dispose();

      expect(mockObserverDisconnect).toHaveBeenCalled();
    });
  });
});
