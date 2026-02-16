// =============================================================================
// web/src/engine/animation/AnimationManager.ts
//
// Orchestrates animated transitions between PrimitiveScenes. Manages the
// requestAnimationFrame loop and produces interpolated frames.
//
// Lifecycle:
//   1. Call transitionTo(targetScene) to start a transition.
//   2. The manager diffs the current scene and target, then animates.
//   3. On each frame, the onFrame callback is invoked with the interpolated scene.
//   4. When the transition completes, the current scene becomes the target.
//
// If transitionTo() is called while a transition is in progress, the current
// interpolated state becomes the new source and the transition restarts.
// =============================================================================

import type { PrimitiveScene, AnimationConfig, RenderPrimitive } from "../types";

import { DEFAULT_ANIMATION_DURATION_MS } from "../types";
import { diffScenes } from "./SceneDiffer";
import { interpolatePrimitive } from "./interpolate";
import { easeInOutCubic } from "./easing";

/**
 * Manages animated transitions between PrimitiveScenes using
 * requestAnimationFrame and property interpolation.
 */
export class AnimationManager {
  /** The scene currently displayed (or the source of the current transition). */
  private currentScene: PrimitiveScene = { primitives: [] };

  /** The target scene we're transitioning toward (null if idle). */
  private targetScene: PrimitiveScene | null = null;

  /** Animation configuration. */
  private config: AnimationConfig;

  /** Callback invoked on every frame with the scene to render. */
  private onFrame: (scene: PrimitiveScene) => void;

  /** Timestamp when the current transition started (from performance.now()). */
  private transitionStartTime = 0;

  /** ID from requestAnimationFrame, used for cancellation. */
  private rafId: number | null = null;

  /** Whether a transition is currently in progress. */
  private isAnimating = false;

  constructor(onFrame: (scene: PrimitiveScene) => void, config?: Partial<AnimationConfig>) {
    this.onFrame = onFrame;
    this.config = {
      durationMs: config?.durationMs ?? DEFAULT_ANIMATION_DURATION_MS,
      easing: config?.easing ?? easeInOutCubic,
    };
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Starts a transition to the given target scene.
   *
   * If a transition is already in progress, the current interpolated state
   * becomes the new source, and the transition restarts from there.
   *
   * If duration is 0, the target is applied instantly (no animation).
   */
  transitionTo(target: PrimitiveScene): void {
    if (this.config.durationMs <= 0) {
      // Instant jump: no animation.
      this.currentScene = target;
      this.targetScene = null;
      this.isAnimating = false;
      this.cancelAnimation();
      this.onFrame(target);
      return;
    }

    // If currently animating, snapshot the interpolated state as the new source.
    if (this.isAnimating && this.targetScene) {
      this.currentScene = this.getInterpolatedScene(performance.now());
    }

    this.targetScene = target;
    this.transitionStartTime = performance.now();
    this.isAnimating = true;

    // Start the animation loop if not already running.
    if (this.rafId === null) {
      this.tick(performance.now());
    }
  }

  /**
   * Immediately jumps to the given scene without animation.
   * Cancels any in-progress transition.
   */
  jumpTo(scene: PrimitiveScene): void {
    this.cancelAnimation();
    this.currentScene = scene;
    this.targetScene = null;
    this.isAnimating = false;
    this.onFrame(scene);
  }

  /**
   * Returns the scene currently being displayed.
   * If animating, returns the latest interpolated scene.
   */
  getCurrentScene(): PrimitiveScene {
    if (this.isAnimating && this.targetScene) {
      return this.getInterpolatedScene(performance.now());
    }
    return this.currentScene;
  }

  /**
   * Updates the animation configuration. Takes effect on the next transition.
   */
  updateConfig(config: Partial<AnimationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Cleans up: cancels any pending animation frame.
   * Call this when the component unmounts.
   */
  dispose(): void {
    this.cancelAnimation();
  }

  // -------------------------------------------------------------------------
  // Animation Loop
  // -------------------------------------------------------------------------

  /**
   * The core animation tick. Called on each requestAnimationFrame.
   */
  private tick = (now: number): void => {
    this.rafId = null;

    if (!this.isAnimating || !this.targetScene) {
      return;
    }

    const elapsed = now - this.transitionStartTime;
    const rawProgress = Math.min(elapsed / this.config.durationMs, 1);

    if (rawProgress >= 1) {
      // Transition complete.
      this.currentScene = this.targetScene;
      this.targetScene = null;
      this.isAnimating = false;
      this.onFrame(this.currentScene);
      return;
    }

    // Produce the interpolated frame and invoke the callback.
    const scene = this.getInterpolatedScene(now);
    this.onFrame(scene);

    // Schedule the next frame.
    this.rafId = requestAnimationFrame(this.tick);
  };

  // -------------------------------------------------------------------------
  // Interpolation
  // -------------------------------------------------------------------------

  /**
   * Produces an interpolated PrimitiveScene at the given timestamp.
   */
  private getInterpolatedScene(now: number): PrimitiveScene {
    if (!this.targetScene) return this.currentScene;

    const elapsed = now - this.transitionStartTime;
    const rawProgress = Math.min(Math.max(elapsed / this.config.durationMs, 0), 1);
    const easedProgress = this.config.easing(rawProgress);

    const plan = diffScenes(this.currentScene, this.targetScene);
    const interpolatedPrimitives: RenderPrimitive[] = [];

    for (const transition of plan.transitions) {
      const interpolated = interpolatePrimitive(transition, easedProgress);
      if (interpolated !== null) {
        interpolatedPrimitives.push(interpolated);
      }
    }

    return { primitives: interpolatedPrimitives };
  }

  // -------------------------------------------------------------------------
  // Utility
  // -------------------------------------------------------------------------

  private cancelAnimation(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
