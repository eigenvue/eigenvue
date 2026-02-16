// =============================================================================
// web/src/engine/animation/index.ts
//
// Barrel export for the animation subsystem.
// =============================================================================

export { AnimationManager } from "./AnimationManager";
export { diffScenes } from "./SceneDiffer";
export { interpolatePrimitive } from "./interpolate";
export {
  easeLinear,
  easeInQuad,
  easeOutQuad,
  easeInOutQuad,
  easeInCubic,
  easeOutCubic,
  easeInOutCubic,
  easeOutBack,
} from "./easing";
