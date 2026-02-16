// =============================================================================
// web/src/engine/animation/interpolate.ts
//
// Interpolation logic for transitioning individual primitives between two
// states. Handles stable (present in both scenes), entering (new), and
// exiting (removed) primitives.
//
// Mathematical contract:
//   For any numeric property p, the interpolated value at progress t is:
//     p_interp = p_from + (p_to - p_from) * t
//              = p_from * (1 - t) + p_to * t
//
//   For colors, component-wise RGB interpolation is used.
//   For strings, the target value is used instantly (no blending).
//   For arrays (dashPattern, heatmapData), the target value is used instantly.
// =============================================================================

import type {
  PrimitiveTransition,
  RenderPrimitive,
  ElementPrimitive,
  ConnectionPrimitive,
  ContainerPrimitive,
  AnnotationPrimitive,
} from "../types";
import { interpolateColor } from "../color";

/**
 * Interpolates a single primitive transition at the given eased progress.
 *
 * @param transition - The transition plan for this primitive.
 * @param t          - Eased progress in [0, 1].
 * @returns The interpolated primitive, or null if the primitive should not
 *          be rendered (e.g., exiting primitive that has fully faded out).
 */
export function interpolatePrimitive(
  transition: PrimitiveTransition,
  t: number,
): RenderPrimitive | null {
  switch (transition.state) {
    case "stable":
      return interpolateStable(transition.from!, transition.to!, t);

    case "entering":
      return interpolateEntering(transition.to!, t);

    case "exiting":
      return interpolateExiting(transition.from!, t);
  }
}

// ---------------------------------------------------------------------------
// Numeric lerp
// ---------------------------------------------------------------------------

/**
 * Linear interpolation between two numbers.
 *   lerp(a, b, 0) = a
 *   lerp(a, b, 1) = b
 *   lerp(a, b, 0.5) = (a + b) / 2
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ---------------------------------------------------------------------------
// Stable: interpolate from → to
// ---------------------------------------------------------------------------

function interpolateStable(from: RenderPrimitive, to: RenderPrimitive, t: number): RenderPrimitive {
  // Both primitives must be the same kind (enforced by SceneDiffer matching on ID).
  // If somehow they differ in kind, return the target.
  if (from.kind !== to.kind) return to;

  switch (from.kind) {
    case "element":
      return interpolateElement(from, to as typeof from, t);
    case "connection":
      return interpolateConnection(from, to as typeof from, t);
    case "container":
      return interpolateContainer(from, to as typeof from, t);
    case "annotation":
      return interpolateAnnotation(from, to as typeof from, t);
    case "overlay":
      // Overlays transition instantly — no smooth interpolation for grids/heatmaps.
      return t < 0.5 ? from : to;
  }
}

function interpolateElement(
  from: ElementPrimitive,
  to: ElementPrimitive,
  t: number,
): ElementPrimitive {
  return {
    kind: "element",
    id: to.id,
    x: lerp(from.x, to.x, t),
    y: lerp(from.y, to.y, t),
    width: lerp(from.width, to.width, t),
    height: lerp(from.height, to.height, t),
    shape: to.shape,
    cornerRadius: lerp(from.cornerRadius, to.cornerRadius, t),
    fillColor: interpolateColor(from.fillColor, to.fillColor, t),
    strokeColor: interpolateColor(from.strokeColor, to.strokeColor, t),
    strokeWidth: lerp(from.strokeWidth, to.strokeWidth, t),
    label: to.label,
    labelFontSize: lerp(from.labelFontSize, to.labelFontSize, t),
    labelColor: interpolateColor(from.labelColor, to.labelColor, t),
    subLabel: to.subLabel,
    subLabelFontSize: lerp(from.subLabelFontSize, to.subLabelFontSize, t),
    subLabelColor: interpolateColor(from.subLabelColor, to.subLabelColor, t),
    rotation: lerp(from.rotation, to.rotation, t),
    opacity: lerp(from.opacity, to.opacity, t),
    zIndex: to.zIndex,
  };
}

function interpolateConnection(
  from: ConnectionPrimitive,
  to: ConnectionPrimitive,
  t: number,
): ConnectionPrimitive {
  return {
    kind: "connection",
    id: to.id,
    x1: lerp(from.x1, to.x1, t),
    y1: lerp(from.y1, to.y1, t),
    x2: lerp(from.x2, to.x2, t),
    y2: lerp(from.y2, to.y2, t),
    curveOffset: lerp(from.curveOffset, to.curveOffset, t),
    color: interpolateColor(from.color, to.color, t),
    lineWidth: lerp(from.lineWidth, to.lineWidth, t),
    dashPattern: to.dashPattern,
    arrowHead: to.arrowHead,
    arrowSize: lerp(from.arrowSize, to.arrowSize, t),
    label: to.label,
    labelFontSize: lerp(from.labelFontSize, to.labelFontSize, t),
    labelColor: interpolateColor(from.labelColor, to.labelColor, t),
    opacity: lerp(from.opacity, to.opacity, t),
    zIndex: to.zIndex,
  };
}

function interpolateContainer(
  from: ContainerPrimitive,
  to: ContainerPrimitive,
  t: number,
): ContainerPrimitive {
  return {
    kind: "container",
    id: to.id,
    x: lerp(from.x, to.x, t),
    y: lerp(from.y, to.y, t),
    width: lerp(from.width, to.width, t),
    height: lerp(from.height, to.height, t),
    cornerRadius: lerp(from.cornerRadius, to.cornerRadius, t),
    fillColor: interpolateColor(from.fillColor, to.fillColor, t),
    strokeColor: interpolateColor(from.strokeColor, to.strokeColor, t),
    strokeWidth: lerp(from.strokeWidth, to.strokeWidth, t),
    dashPattern: to.dashPattern,
    label: to.label,
    labelFontSize: lerp(from.labelFontSize, to.labelFontSize, t),
    labelColor: interpolateColor(from.labelColor, to.labelColor, t),
    opacity: lerp(from.opacity, to.opacity, t),
    zIndex: to.zIndex,
  };
}

function interpolateAnnotation(
  from: AnnotationPrimitive,
  to: AnnotationPrimitive,
  t: number,
): AnnotationPrimitive {
  return {
    kind: "annotation",
    id: to.id,
    form: to.form,
    x: lerp(from.x, to.x, t),
    y: lerp(from.y, to.y, t),
    text: to.text,
    fontSize: lerp(from.fontSize, to.fontSize, t),
    textColor: interpolateColor(from.textColor, to.textColor, t),
    color: interpolateColor(from.color, to.color, t),
    pointerHeight: lerp(from.pointerHeight, to.pointerHeight, t),
    pointerWidth: lerp(from.pointerWidth, to.pointerWidth, t),
    bracketWidth: lerp(from.bracketWidth, to.bracketWidth, t),
    bracketTickHeight: lerp(from.bracketTickHeight, to.bracketTickHeight, t),
    badgePaddingX: lerp(from.badgePaddingX, to.badgePaddingX, t),
    badgePaddingY: lerp(from.badgePaddingY, to.badgePaddingY, t),
    opacity: lerp(from.opacity, to.opacity, t),
    zIndex: to.zIndex,
  };
}

// ---------------------------------------------------------------------------
// Entering: fade in from transparent
// ---------------------------------------------------------------------------

function interpolateEntering(to: RenderPrimitive, t: number): RenderPrimitive {
  // Create a copy with opacity scaled by progress.
  // At t=0, opacity=0 (invisible). At t=1, opacity = to.opacity (fully visible).
  return setOpacity(to, to.opacity * t);
}

// ---------------------------------------------------------------------------
// Exiting: fade out to transparent
// ---------------------------------------------------------------------------

function interpolateExiting(from: RenderPrimitive, t: number): RenderPrimitive | null {
  // At t=0, opacity = from.opacity (fully visible). At t=1, opacity=0.
  const opacity = from.opacity * (1 - t);
  if (opacity <= 0.01) return null; // Skip drawing near-invisible primitives.
  return setOpacity(from, opacity);
}

// ---------------------------------------------------------------------------
// Utility: set opacity on any primitive
// ---------------------------------------------------------------------------

function setOpacity(primitive: RenderPrimitive, opacity: number): RenderPrimitive {
  // Spread operator creates a shallow copy with the overridden opacity.
  return { ...primitive, opacity } as RenderPrimitive;
}
