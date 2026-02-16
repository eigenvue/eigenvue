// =============================================================================
// web/src/engine/animation/SceneDiffer.ts
//
// Produces a SceneTransitionPlan by matching primitives between a source
// and target PrimitiveScene. Matching is done by primitive `id`.
//
// Algorithmic complexity: O(N + M) where N and M are the number of
// primitives in the source and target scenes respectively, since we use
// Map lookups (O(1) amortized per lookup).
// =============================================================================

import type {
  PrimitiveScene,
  SceneTransitionPlan,
  PrimitiveTransition,
  RenderPrimitive,
} from "../types";

/**
 * Diffs two PrimitiveScenes and produces a transition plan.
 *
 * For each unique primitive ID across both scenes:
 *   - Present in both → "stable" (interpolate from source to target).
 *   - Present only in target → "entering" (fade in).
 *   - Present only in source → "exiting" (fade out).
 *
 * @param source - The scene currently displayed (step N).
 * @param target - The scene to transition to (step N+1).
 * @returns A SceneTransitionPlan with one PrimitiveTransition per unique ID.
 */
export function diffScenes(source: PrimitiveScene, target: PrimitiveScene): SceneTransitionPlan {
  // Build index maps for O(1) lookup by ID.
  const sourceMap = new Map<string, RenderPrimitive>();
  for (const p of source.primitives) {
    sourceMap.set(p.id, p);
  }

  const targetMap = new Map<string, RenderPrimitive>();
  for (const p of target.primitives) {
    targetMap.set(p.id, p);
  }

  const transitions: PrimitiveTransition[] = [];

  // Process all target primitives: either stable or entering.
  for (const [id, toPrimitive] of targetMap) {
    const fromPrimitive = sourceMap.get(id) ?? null;

    if (fromPrimitive !== null) {
      // Present in both scenes → stable.
      transitions.push({
        id,
        state: "stable",
        from: fromPrimitive,
        to: toPrimitive,
      });
    } else {
      // Present only in target → entering.
      transitions.push({
        id,
        state: "entering",
        from: null,
        to: toPrimitive,
      });
    }
  }

  // Process source-only primitives: exiting.
  for (const [id, fromPrimitive] of sourceMap) {
    if (!targetMap.has(id)) {
      transitions.push({
        id,
        state: "exiting",
        from: fromPrimitive,
        to: null,
      });
    }
  }

  return { transitions };
}
