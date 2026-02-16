/**
 * Starfield — ambient animated background using Canvas 2D.
 *
 * Renders a fixed, full-viewport canvas behind all page content.
 * Stars are small white dots at varying opacities that drift slowly upward,
 * creating a subtle parallax sense of depth.
 *
 * Performance requirements:
 * - Must maintain 60fps on a mid-range device (e.g., 2020 laptop with integrated GPU)
 * - Star count scales with viewport area, capped at MAX_STARS
 * - Uses requestAnimationFrame with no forced reflows
 * - Pauses when the tab is not visible (visibilitychange event)
 * - Respects prefers-reduced-motion (renders static frame, no animation)
 *
 * Mathematical model:
 * - Each star has (x, y) in canvas coordinates, a radius, an opacity, and a speed.
 * - On each frame, y decreases by speed × deltaTime. When y < -radius, wrap to bottom.
 * - Stars at higher opacity are "closer" and move faster (parallax depth).
 * - No physics, no gravity, no interaction. Pure decorative drift.
 */

"use client";

import { useEffect, useRef, useCallback } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/** ─── Configuration Constants ─── */

/** Maximum number of stars regardless of viewport size. */
const MAX_STARS = 200;

/**
 * Star density: stars per 1,000,000 pixels of viewport area.
 * At 1920×1080 (≈2M px), this yields ≈ 2 * 100 = 200 stars.
 * At 375×667 (≈250K px), this yields ≈ 0.25 * 100 = 25 stars.
 */
const STARS_PER_MILLION_PX = 100;

/** Minimum and maximum star radius in CSS pixels. */
const MIN_RADIUS = 0.3;
const MAX_RADIUS = 1.5;

/** Minimum and maximum star opacity (0-1). */
const MIN_OPACITY = 0.15;
const MAX_OPACITY = 0.6;

/**
 * Speed range in pixels per second.
 * Brighter (higher opacity) stars move faster to simulate depth.
 */
const MIN_SPEED = 3;   // px/s — distant (dim) stars
const MAX_SPEED = 12;  // px/s — closer (bright) stars

interface Star {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  speed: number;
}

/**
 * Generate a random float in [min, max].
 * Uses Math.random() — no cryptographic requirement for visual effects.
 */
function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Create a single star with random properties within the defined ranges.
 * The star's speed is linearly interpolated from its opacity:
 *   speed = MIN_SPEED + (opacity - MIN_OPACITY) / (MAX_OPACITY - MIN_OPACITY) * (MAX_SPEED - MIN_SPEED)
 *
 * This ensures brighter stars are faster (parallax depth effect).
 */
function createStar(canvasWidth: number, canvasHeight: number): Star {
  const opacity = randomInRange(MIN_OPACITY, MAX_OPACITY);
  /** Linear interpolation factor: 0 (dimmest) to 1 (brightest) */
  const opacityFactor = (opacity - MIN_OPACITY) / (MAX_OPACITY - MIN_OPACITY);

  return {
    x: Math.random() * canvasWidth,
    y: Math.random() * canvasHeight,
    radius: randomInRange(MIN_RADIUS, MAX_RADIUS),
    opacity,
    speed: MIN_SPEED + opacityFactor * (MAX_SPEED - MIN_SPEED),
  };
}

/** Default star color RGB (dark mode). */
const DEFAULT_STAR_COLOR = "240, 242, 248";

export function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const starColorRef = useRef<string>(DEFAULT_STAR_COLOR);
  const prefersReducedMotion = useReducedMotion();

  /**
   * Initialize stars based on current canvas dimensions.
   * Called on mount and on resize.
   */
  const initializeStars = useCallback((width: number, height: number) => {
    const area = width * height;
    const count = Math.min(
      MAX_STARS,
      Math.round((area / 1_000_000) * STARS_PER_MILLION_PX)
    );
    starsRef.current = Array.from({ length: count }, () =>
      createStar(width, height)
    );
  }, []);

  /**
   * Render a single frame: clear canvas, draw all stars.
   * If animating, update positions based on elapsed time (deltaTime).
   */
  const renderFrame = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number, deltaTime: number) => {
      ctx.clearRect(0, 0, width, height);

      for (const star of starsRef.current) {
        if (!prefersReducedMotion && deltaTime > 0) {
          /**
           * Move star upward. Multiply speed by deltaTime (in seconds)
           * for frame-rate-independent movement.
           */
          star.y -= star.speed * deltaTime;

          /**
           * Wrap: when star moves above top edge, reset to bottom.
           * Randomize x position on wrap for natural appearance.
           */
          if (star.y < -star.radius) {
            star.y = height + star.radius;
            star.x = Math.random() * width;
          }
        }

        /** Draw star as a filled circle using theme-aware color. */
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${starColorRef.current}, ${star.opacity})`;
        ctx.fill();
      }
    },
    [prefersReducedMotion]
  );

  /**
   * Watch for theme changes on <html> to update star color.
   * Reads the --starfield-color and --starfield-opacity CSS custom properties.
   */
  useEffect(() => {
    const updateStarColor = () => {
      const style = getComputedStyle(document.documentElement);
      starColorRef.current =
        style.getPropertyValue("--starfield-color").trim() || DEFAULT_STAR_COLOR;

      // Also update canvas opacity for theme
      if (canvasRef.current) {
        const opacity = style.getPropertyValue("--starfield-opacity").trim();
        canvasRef.current.style.opacity = opacity || "1";
      }
    };

    updateStarColor();

    const observer = new MutationObserver(updateStarColor);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    /**
     * Set canvas dimensions to match the window, accounting for devicePixelRatio
     * for sharp rendering on retina/HiDPI displays.
     *
     * The canvas element's CSS size is 100vw × 100vh (set via className).
     * The canvas buffer size is CSS size × devicePixelRatio.
     * The context is scaled so drawing coordinates match CSS pixels.
     */
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);

      initializeStars(width, height);

      /** Render one frame immediately after resize (for reduced-motion users). */
      renderFrame(ctx, width, height, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    /** If reduced motion is preferred, do not start the animation loop. */
    if (prefersReducedMotion) {
      return () => window.removeEventListener("resize", resize);
    }

    /**
     * Animation loop using requestAnimationFrame.
     * Computes deltaTime from the previous frame for frame-rate-independent movement.
     * Clamps deltaTime to 100ms to prevent large jumps when tab regains focus.
     */
    let isTabVisible = true;

    const animate = (timestamp: number) => {
      if (!isTabVisible) {
        lastTimeRef.current = timestamp;
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      /** deltaTime in seconds, clamped to 0.1s max */
      const deltaTime = Math.min(
        (timestamp - (lastTimeRef.current || timestamp)) / 1000,
        0.1
      );
      lastTimeRef.current = timestamp;

      renderFrame(ctx, window.innerWidth, window.innerHeight, deltaTime);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    /** Pause animation when tab is hidden to save battery/CPU. */
    const handleVisibility = () => {
      isTabVisible = document.visibilityState === "visible";
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [prefersReducedMotion, initializeStars, renderFrame]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 -z-10 h-screen w-screen transition-opacity duration-slow"
      /**
       * aria-hidden: this is a purely decorative element.
       * Screen readers should ignore it completely.
       */
      aria-hidden="true"
    />
  );
}
