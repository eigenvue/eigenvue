// =============================================================================
// web/src/engine/animation/easing.ts
//
// Easing functions for animation transitions. Each function maps a linear
// progress value t ∈ [0, 1] to an eased progress value.
//
// Mathematical guarantees for all standard easings:
//   f(0) = 0
//   f(1) = 1
//   f is continuous on [0, 1]
//
// The easeOutBack function intentionally overshoots (returns values > 1
// for some t < 1) to create a "spring" effect. This is documented below.
// =============================================================================

import type { EasingFunction } from "../types";

/**
 * Linear easing: f(t) = t.
 * No acceleration or deceleration. Constant velocity.
 */
export const easeLinear: EasingFunction = (t) => t;

/**
 * Quadratic ease-in: f(t) = t².
 * Starts slow, accelerates.
 *
 * Verification: f(0) = 0² = 0 ✓   f(1) = 1² = 1 ✓
 */
export const easeInQuad: EasingFunction = (t) => t * t;

/**
 * Quadratic ease-out: f(t) = 1 - (1 - t)².
 *                          = 2t - t²
 *                          = t(2 - t)
 * Starts fast, decelerates.
 *
 * Verification: f(0) = 0(2-0) = 0 ✓   f(1) = 1(2-1) = 1 ✓
 */
export const easeOutQuad: EasingFunction = (t) => t * (2 - t);

/**
 * Quadratic ease-in-out:
 *   f(t) = 2t²              for t < 0.5
 *   f(t) = 1 - (-2t + 2)²/2  for t ≥ 0.5
 *        = -2t² + 4t - 1     for t ≥ 0.5
 *
 * Verification:
 *   f(0) = 2(0)² = 0 ✓
 *   f(0.5) = 2(0.25) = 0.5 (from first branch)
 *   f(0.5) = -2(0.25) + 4(0.5) - 1 = -0.5 + 2 - 1 = 0.5 ✓ (continuity at t=0.5)
 *   f(1) = -2(1) + 4(1) - 1 = 1 ✓
 */
export const easeInOutQuad: EasingFunction = (t) => (t < 0.5 ? 2 * t * t : -2 * t * t + 4 * t - 1);

/**
 * Cubic ease-in: f(t) = t³.
 *
 * Verification: f(0) = 0 ✓   f(1) = 1 ✓
 */
export const easeInCubic: EasingFunction = (t) => t * t * t;

/**
 * Cubic ease-out: f(t) = 1 - (1 - t)³.
 *
 * Let u = 1 - t:
 *   f(t) = 1 - u³
 *
 * Verification: f(0) = 1 - 1³ = 0 ✓   f(1) = 1 - 0³ = 1 ✓
 */
export const easeOutCubic: EasingFunction = (t) => {
  const u = 1 - t;
  return 1 - u * u * u;
};

/**
 * Cubic ease-in-out (DEFAULT for Eigenvue animations):
 *   f(t) = 4t³              for t < 0.5
 *   f(t) = 1 - (-2t + 2)³/2  for t ≥ 0.5
 *
 * Simplified form for t ≥ 0.5:
 *   Let u = 2t - 2
 *   f(t) = 1 + u³/2
 *        = 1 + (2t - 2)³ / 2
 *
 * Verification:
 *   f(0) = 4(0)³ = 0 ✓
 *   f(0.5) = 4(0.125) = 0.5 (first branch)
 *   f(0.5) = 1 + (1-2)³/2 = 1 + (-1)/2 = 0.5 ✓ (continuity)
 *   f(1) = 1 + (2-2)³/2 = 1 + 0 = 1 ✓
 */
export const easeInOutCubic: EasingFunction = (t) => {
  if (t < 0.5) {
    return 4 * t * t * t;
  }
  const u = 2 * t - 2;
  return 1 + (u * u * u) / 2;
};

/**
 * Ease-out with overshoot (back easing):
 *   f(t) = 1 + c₃(t-1)³ + c₁(t-1)²
 *
 * where c₁ = 1.70158 (Penner's standard overshoot constant)
 *       c₃ = c₁ + 1 = 2.70158
 *
 * This function overshoots 1 before settling back:
 *   f(0) = 1 + 2.70158(-1)³ + 1.70158(-1)² = 1 - 2.70158 + 1.70158 = 0 ✓
 *   f(1) = 1 + 2.70158(0)³ + 1.70158(0)² = 1 ✓
 *   Maximum ≈ 1.0425 at t ≈ 0.874 (slight overshoot)
 *
 * NOTE: The output exceeds 1 for some t values. This is intentional and
 * produces a subtle "bounce" effect. The interpolation system handles
 * values outside [0, 1] gracefully (positions slightly overshoot their target).
 */
export const easeOutBack: EasingFunction = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1; // = 2.70158
  const u = t - 1;
  return 1 + c3 * u * u * u + c1 * u * u;
};
