// =============================================================================
// web/src/engine/canvas/CanvasManager.ts
//
// Manages the Canvas 2D rendering context lifecycle: DPI-aware sizing,
// resize observation, per-frame clearing, and the render loop.
//
// Usage:
//   const manager = new CanvasManager(canvasElement);
//   manager.startRenderLoop((ctx, size) => { ... draw ... });
//   // On cleanup:
//   manager.dispose();
//
// DPI scaling is fully transparent to consumers. The provided ctx is
// pre-scaled so all drawing operations use CSS pixel coordinates.
// =============================================================================

import type { CanvasSize, RenderCallback } from "../types";

/**
 * Manages a `<canvas>` element's 2D context with DPI-aware sizing,
 * resize observation, and render loop orchestration.
 */
export class CanvasManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private resizeObserver: ResizeObserver;

  /** Current canvas size in CSS pixels. */
  private size: CanvasSize = { width: 0, height: 0 };

  /** The current device pixel ratio. */
  private dpr: number = 1;

  /** The render callback provided by the consumer. */
  private renderCallback: RenderCallback | null = null;

  /** requestAnimationFrame ID for the render loop. */
  private rafId: number | null = null;

  /** Whether the render loop is active. */
  private isRunning = false;

  /** Flag set when a resize occurs, to trigger re-render. */
  private needsResize = true;

  /** Background color used when clearing the canvas. */
  private backgroundColor = "transparent";

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to get Canvas 2D rendering context.");
    }
    this.ctx = ctx;

    // Observe resize events on the canvas element.
    this.resizeObserver = new ResizeObserver(this.handleResize);
    this.resizeObserver.observe(canvas);

    // Initial sizing.
    this.updateSize();
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Returns the 2D rendering context, pre-scaled for DPI.
   */
  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  /**
   * Returns the current canvas size in CSS pixels.
   */
  getSize(): CanvasSize {
    return { ...this.size };
  }

  /**
   * Sets the background color used when clearing the canvas.
   * Default: "transparent".
   */
  setBackgroundColor(color: string): void {
    this.backgroundColor = color;
  }

  /**
   * Starts the render loop. The callback is invoked on every animation frame
   * with the DPI-scaled context and current CSS pixel size.
   */
  startRenderLoop(callback: RenderCallback): void {
    this.renderCallback = callback;
    this.isRunning = true;
    this.scheduleFrame();
  }

  /**
   * Stops the render loop.
   */
  stopRenderLoop(): void {
    this.isRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * Triggers a single render outside the render loop.
   * Useful for static scenes that don't need continuous rendering.
   */
  renderOnce(callback: RenderCallback): void {
    this.updateSize();
    this.clear();
    callback(this.ctx, this.size);
  }

  /**
   * Cleans up all resources. Call when the component unmounts.
   */
  dispose(): void {
    this.stopRenderLoop();
    this.resizeObserver.disconnect();
  }

  // -------------------------------------------------------------------------
  // Sizing
  // -------------------------------------------------------------------------

  /**
   * Reads the canvas element's CSS dimensions, computes physical pixel
   * dimensions, and applies the DPI scaling transform.
   */
  private updateSize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = window.devicePixelRatio || 1;

    const cssWidth = rect.width;
    const cssHeight = rect.height;

    // Set the canvas element's physical (backing store) dimensions.
    this.canvas.width = Math.round(cssWidth * this.dpr);
    this.canvas.height = Math.round(cssHeight * this.dpr);

    // Reset the transform and apply DPI scaling.
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.size = { width: cssWidth, height: cssHeight };
    this.needsResize = false;
  }

  // -------------------------------------------------------------------------
  // Clearing
  // -------------------------------------------------------------------------

  /**
   * Clears the entire canvas. Called before every render frame.
   */
  private clear(): void {
    this.ctx.save();
    // Reset transform to physical pixels for a clean clear.
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.backgroundColor !== "transparent") {
      this.ctx.fillStyle = this.backgroundColor;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    this.ctx.restore();
    // Restore the DPI scaling transform.
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  // -------------------------------------------------------------------------
  // Render Loop
  // -------------------------------------------------------------------------

  private scheduleFrame(): void {
    if (!this.isRunning) return;
    this.rafId = requestAnimationFrame(this.onFrame);
  }

  private onFrame = (_timestamp: number): void => {
    this.rafId = null;

    if (!this.isRunning || !this.renderCallback) return;

    if (this.needsResize) {
      this.updateSize();
    }

    this.clear();
    this.renderCallback(this.ctx, this.size);

    this.scheduleFrame();
  };

  // -------------------------------------------------------------------------
  // Resize Handling
  // -------------------------------------------------------------------------

  private handleResize = (_entries: ResizeObserverEntry[]): void => {
    this.needsResize = true;
  };
}
