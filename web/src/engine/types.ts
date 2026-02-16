// =============================================================================
// web/src/engine/types.ts
//
// All type definitions for the Eigenvue rendering engine.
// This file is the single source of truth. Every other engine file imports
// from here. No circular dependencies.
//
// Conventions:
//   - All coordinates are in CSS pixels (see Section 3 of the Phase 4 spec).
//   - All angles are in radians, clockwise from the positive x-axis.
//   - All colors are CSS color strings (hex, rgb, rgba, hsl, or named).
//   - All IDs are non-empty strings, unique within a single PrimitiveScene.
// =============================================================================

// Re-export the Step type from the shared types package (Phase 3).
// Adjust this import path to match your actual Phase 3 output.
import type { Step, VisualAction, CodeHighlight } from "../../../shared/types";
export type { Step, VisualAction, CodeHighlight };

// ---------------------------------------------------------------------------
// 1. Render Primitive Types
// ---------------------------------------------------------------------------

/**
 * The discriminated union of all visual primitive types the renderer knows
 * how to draw. Each variant has a `kind` field for discrimination.
 *
 * Every primitive has:
 *   - `id`:      Stable identifier used for animation diffing. Must be unique
 *                within a PrimitiveScene. Layouts must produce the same ID for
 *                the "same" logical element across consecutive steps.
 *   - `zIndex`:  Drawing order. Lower values are drawn first (behind).
 *                Ties are broken by array insertion order.
 *   - `opacity`: Float in [0, 1]. Applied via `ctx.globalAlpha`.
 */
export type RenderPrimitive =
  | ElementPrimitive
  | ConnectionPrimitive
  | ContainerPrimitive
  | AnnotationPrimitive
  | OverlayPrimitive;

// ---------------------------------------------------------------------------
// 1a. Element Primitive
// ---------------------------------------------------------------------------

/** Supported shapes for Element primitives. */
export type ElementShape = "rect" | "roundedRect" | "circle" | "diamond";

/**
 * An Element is a discrete, positioned item: an array cell, a graph node,
 * a neuron, a token chip, a qubit marker.
 *
 * The (x, y) is the CENTER of the element.
 */
export interface ElementPrimitive {
  readonly kind: "element";
  readonly id: string;

  /** Center x-coordinate in CSS pixels. */
  x: number;
  /** Center y-coordinate in CSS pixels. */
  y: number;
  /** Width of the bounding box in CSS pixels. */
  width: number;
  /** Height of the bounding box in CSS pixels. */
  height: number;

  /**
   * The shape to draw.
   *   - "rect":        Sharp-cornered rectangle.
   *   - "roundedRect": Rectangle with `cornerRadius` rounding.
   *   - "circle":      Ellipse inscribed in the bounding box.
   *                     For a true circle, ensure width === height.
   *   - "diamond":     Rotated square (rhombus) inscribed in the bounding box.
   */
  shape: ElementShape;

  /** Corner radius for "roundedRect" shape. Ignored for other shapes. CSS pixels. */
  cornerRadius: number;

  /** Fill color. CSS color string. Use "transparent" for no fill. */
  fillColor: string;
  /** Stroke (border) color. CSS color string. Use "transparent" for no stroke. */
  strokeColor: string;
  /** Stroke width in CSS pixels. Set to 0 for no stroke. */
  strokeWidth: number;

  /**
   * Primary label displayed INSIDE the element (typically the value).
   * Empty string "" means no label is drawn.
   */
  label: string;
  /** Font size for the label in CSS pixels. */
  labelFontSize: number;
  /** Label text color. CSS color string. */
  labelColor: string;

  /**
   * Secondary label displayed BELOW the element (typically an index or name).
   * Empty string "" means no sub-label is drawn.
   */
  subLabel: string;
  /** Font size for the sub-label in CSS pixels. */
  subLabelFontSize: number;
  /** Sub-label text color. CSS color string. */
  subLabelColor: string;

  /** Clockwise rotation in radians. 0 = no rotation. */
  rotation: number;

  /** Opacity in [0, 1]. 0 = invisible, 1 = fully opaque. */
  opacity: number;
  /** Drawing order. Lower = behind. */
  zIndex: number;
}

// ---------------------------------------------------------------------------
// 1b. Connection Primitive
// ---------------------------------------------------------------------------

/** Where to draw an arrowhead on a connection. */
export type ArrowHead = "none" | "end" | "start" | "both";

/**
 * A Connection is a line or curve between two points. Used for graph edges,
 * neural network weights, attention arcs.
 *
 * The connection is drawn from (x1, y1) to (x2, y2).
 * An optional `curveOffset` bends the line into a quadratic Bézier curve.
 */
export interface ConnectionPrimitive {
  readonly kind: "connection";
  readonly id: string;

  /** Start point x. CSS pixels. */
  x1: number;
  /** Start point y. CSS pixels. */
  y1: number;
  /** End point x. CSS pixels. */
  x2: number;
  /** End point y. CSS pixels. */
  y2: number;

  /**
   * Perpendicular offset for the Bézier control point, in CSS pixels.
   *
   * The control point is computed as the midpoint of (x1,y1)→(x2,y2),
   * displaced perpendicular to the line by this amount.
   *
   * Positive = offset to the LEFT of the direction from start to end.
   * Zero = straight line (no curve).
   *
   * Mathematical definition of the control point:
   *   midX = (x1 + x2) / 2
   *   midY = (y1 + y2) / 2
   *   dx = x2 - x1
   *   dy = y2 - y1
   *   len = sqrt(dx² + dy²)
   *   // Unit normal perpendicular to the line (rotated 90° counter-clockwise):
   *   nx = -dy / len
   *   ny =  dx / len
   *   controlX = midX + nx * curveOffset
   *   controlY = midY + ny * curveOffset
   *
   * If len === 0, the control point equals the midpoint (degenerate case).
   */
  curveOffset: number;

  /** Stroke color. CSS color string. */
  color: string;
  /** Stroke width in CSS pixels. */
  lineWidth: number;

  /**
   * Dash pattern. Empty array = solid line.
   * Example: [6, 4] draws 6px dash, 4px gap, repeating.
   */
  dashPattern: number[];

  /** Where to draw arrowheads. */
  arrowHead: ArrowHead;
  /**
   * Size of the arrowhead in CSS pixels. This is the length of each
   * side of the arrowhead triangle, measured from the tip.
   */
  arrowSize: number;

  /**
   * Optional label drawn at the midpoint of the connection.
   * Empty string "" means no label.
   */
  label: string;
  /** Font size for the connection label. CSS pixels. */
  labelFontSize: number;
  /** Label text color. CSS color string. */
  labelColor: string;

  /** Opacity in [0, 1]. */
  opacity: number;
  /** Drawing order. */
  zIndex: number;
}

// ---------------------------------------------------------------------------
// 1c. Container Primitive
// ---------------------------------------------------------------------------

/**
 * A Container is a visual grouping box drawn around a region. It does NOT
 * own or contain child primitives in a parent-child tree. It is simply a
 * rectangle with an optional label, drawn at its z-index. Layouts are
 * responsible for positioning child elements inside the container's bounds.
 *
 * The (x, y) is the CENTER of the container.
 */
export interface ContainerPrimitive {
  readonly kind: "container";
  readonly id: string;

  /** Center x. CSS pixels. */
  x: number;
  /** Center y. CSS pixels. */
  y: number;
  /** Width. CSS pixels. */
  width: number;
  /** Height. CSS pixels. */
  height: number;

  /** Corner radius for rounded corners. CSS pixels. */
  cornerRadius: number;

  /** Fill color. Use "transparent" for no fill. */
  fillColor: string;
  /** Stroke color. */
  strokeColor: string;
  /** Stroke width. CSS pixels. */
  strokeWidth: number;

  /** Dash pattern for the border. Empty array = solid. */
  dashPattern: number[];

  /**
   * Optional label drawn at the TOP-CENTER of the container, vertically
   * centered on the top edge.
   */
  label: string;
  /** Label font size. CSS pixels. */
  labelFontSize: number;
  /** Label text color. */
  labelColor: string;

  /** Opacity in [0, 1]. */
  opacity: number;
  /** Drawing order. */
  zIndex: number;
}

// ---------------------------------------------------------------------------
// 1d. Annotation Primitive
// ---------------------------------------------------------------------------

/**
 * The visual form of an annotation.
 *   - "pointer":  A downward-pointing triangle above a point (like ▼).
 *   - "bracket":  A horizontal bracket spanning a range.
 *   - "label":    A free-floating text label at a position.
 *   - "badge":    A small rounded-rect pill with text (e.g., "pivot").
 */
export type AnnotationForm = "pointer" | "bracket" | "label" | "badge";

/**
 * An Annotation is a visual indicator attached to a coordinate.
 *
 * For "pointer": (x, y) is the TIP of the triangle. The triangle points
 *   downward from above. The triangle base is at y - pointerHeight, centered
 *   on x with a base width of pointerWidth.
 *
 * For "bracket": (x, y) is the LEFT end of the bracket. The bracket extends
 *   rightward to x + bracketWidth. The bracket is drawn at vertical position y.
 *
 * For "label": (x, y) is the CENTER of the text.
 *
 * For "badge": (x, y) is the CENTER of the pill shape.
 */
export interface AnnotationPrimitive {
  readonly kind: "annotation";
  readonly id: string;

  /** Form of the annotation. */
  form: AnnotationForm;

  /** Anchor point x. CSS pixels. Meaning depends on `form` (see above). */
  x: number;
  /** Anchor point y. CSS pixels. Meaning depends on `form` (see above). */
  y: number;

  /** Text to display. For "pointer" and "bracket", displayed above/below the shape. */
  text: string;
  /** Font size. CSS pixels. */
  fontSize: number;
  /** Text color. CSS color string. */
  textColor: string;

  /** Primary color of the annotation shape. CSS color string. */
  color: string;

  // -- Pointer-specific --
  /** Height of the pointer triangle in CSS pixels. Default: 10. */
  pointerHeight: number;
  /** Base width of the pointer triangle in CSS pixels. Default: 12. */
  pointerWidth: number;

  // -- Bracket-specific --
  /** Total horizontal width of the bracket in CSS pixels. */
  bracketWidth: number;
  /** Height of the bracket's vertical ticks at each end. CSS pixels. Default: 6. */
  bracketTickHeight: number;

  // -- Badge-specific --
  /** Horizontal padding inside the badge pill. CSS pixels. Default: 8. */
  badgePaddingX: number;
  /** Vertical padding inside the badge pill. CSS pixels. Default: 4. */
  badgePaddingY: number;

  /** Opacity in [0, 1]. */
  opacity: number;
  /** Drawing order. */
  zIndex: number;
}

// ---------------------------------------------------------------------------
// 1e. Overlay Primitive
// ---------------------------------------------------------------------------

/**
 * An Overlay is a full-canvas or region-based visual effect.
 * Currently supports grid backgrounds and heatmap overlays.
 * Additional overlay types will be added in future phases.
 *
 * (x, y) is the TOP-LEFT corner of the overlay region.
 */
export type OverlayType = "grid" | "heatmap";

export interface OverlayPrimitive {
  readonly kind: "overlay";
  readonly id: string;
  readonly overlayType: OverlayType;

  /** Top-left x of the overlay region. CSS pixels. */
  x: number;
  /** Top-left y of the overlay region. CSS pixels. */
  y: number;
  /** Width of the overlay region. CSS pixels. */
  width: number;
  /** Height of the overlay region. CSS pixels. */
  height: number;

  // -- Grid-specific --
  /** Spacing between grid lines. CSS pixels. */
  gridSpacing: number;
  /** Grid line color. CSS color string. */
  gridColor: string;
  /** Grid line width. CSS pixels. */
  gridLineWidth: number;

  // -- Heatmap-specific --
  /**
   * 2D array of normalized values in [0, 1] for heatmap rendering.
   * heatmapData[row][col]. Rows map to y, columns map to x.
   * Each cell is rendered as a rectangle within the overlay region.
   * Cell size: (width / cols) × (height / rows).
   *
   * Colors are interpolated between heatmapColorLow (value=0)
   * and heatmapColorHigh (value=1).
   */
  heatmapData: number[][];
  /** Color at heatmap value 0. CSS color string. */
  heatmapColorLow: string;
  /** Color at heatmap value 1. CSS color string. */
  heatmapColorHigh: string;

  /** Opacity in [0, 1]. */
  opacity: number;
  /** Drawing order. */
  zIndex: number;
}

// ---------------------------------------------------------------------------
// 2. Primitive Scene
// ---------------------------------------------------------------------------

/**
 * A PrimitiveScene is the complete set of primitives to render for one frame.
 * It is the output of a layout function and the input to the renderer.
 */
export interface PrimitiveScene {
  /** All primitives in the scene. Order does not matter; zIndex determines draw order. */
  readonly primitives: readonly RenderPrimitive[];
}

// ---------------------------------------------------------------------------
// 3. Layout System Types
// ---------------------------------------------------------------------------

/**
 * The canvas dimensions available for drawing, in CSS pixels.
 * Provided by the CanvasManager to layout functions.
 */
export interface CanvasSize {
  readonly width: number;
  readonly height: number;
}

/**
 * A LayoutFunction transforms a Step into a PrimitiveScene.
 *
 * It is a PURE function: given the same arguments, it always returns the
 * same PrimitiveScene. No side effects, no canvas access.
 *
 * @param step       - The current step object from the algorithm generator.
 * @param canvasSize - The available canvas dimensions in CSS pixels.
 * @param config     - Layout-specific configuration from meta.json `visual.components`.
 *                     The layout defines the shape of this object.
 * @returns A PrimitiveScene containing all primitives to draw.
 */
export type LayoutFunction = (
  step: Step,
  canvasSize: CanvasSize,
  config: Record<string, unknown>,
) => PrimitiveScene;

/**
 * Metadata registered with a layout for documentation and validation.
 */
export interface LayoutRegistration {
  /** The unique name of this layout, matching values in meta.json `visual.layout`. */
  readonly name: string;
  /** A short human-readable description. */
  readonly description: string;
  /** The layout function. */
  readonly layout: LayoutFunction;
}

// ---------------------------------------------------------------------------
// 4. Animation Types
// ---------------------------------------------------------------------------

/**
 * The lifecycle state of a primitive during an animated transition.
 *
 *   - "stable":   Exists in both the source and target scene. Interpolate.
 *   - "entering": Exists only in the target scene. Fade in from opacity 0.
 *   - "exiting":  Exists only in the source scene. Fade out to opacity 0.
 */
export type TransitionState = "stable" | "entering" | "exiting";

/**
 * An interpolation plan for a single primitive.
 */
export interface PrimitiveTransition {
  /** The primitive's ID. */
  readonly id: string;
  /** The lifecycle state. */
  readonly state: TransitionState;
  /** The primitive in the source scene (null if entering). */
  readonly from: RenderPrimitive | null;
  /** The primitive in the target scene (null if exiting). */
  readonly to: RenderPrimitive | null;
}

/**
 * A complete transition plan between two scenes.
 */
export interface SceneTransitionPlan {
  readonly transitions: readonly PrimitiveTransition[];
}

/**
 * An easing function maps a linear progress value t ∈ [0, 1] to an
 * eased value, also typically in [0, 1] but allowed to overshoot
 * for spring-like easings.
 *
 * Mathematical contract:
 *   easing(0) = 0
 *   easing(1) = 1
 *   easing is continuous on [0, 1]
 */
export type EasingFunction = (t: number) => number;

/**
 * Configuration for the AnimationManager.
 */
export interface AnimationConfig {
  /** Duration of a step transition in milliseconds. Default: 400. */
  readonly durationMs: number;
  /** Easing function for transitions. Default: easeInOutCubic. */
  readonly easing: EasingFunction;
}

// ---------------------------------------------------------------------------
// 5. Canvas Manager Types
// ---------------------------------------------------------------------------

/**
 * Callback invoked on every animation frame by the CanvasManager's render loop.
 *
 * @param ctx  - The 2D rendering context, already scaled for DPI.
 * @param size - The current canvas size in CSS pixels.
 */
export type RenderCallback = (ctx: CanvasRenderingContext2D, size: CanvasSize) => void;

// ---------------------------------------------------------------------------
// 6. Constants
// ---------------------------------------------------------------------------

/** Standard padding inside the canvas used by layouts. CSS pixels. */
export const LAYOUT_PADDING = 40;

/** Default animation duration in milliseconds. */
export const DEFAULT_ANIMATION_DURATION_MS = 400;

/** Default font family for element labels. */
export const LABEL_FONT_FAMILY = "'JetBrains Mono', 'Fira Code', monospace";

/** Default font family for annotations and UI text. */
export const UI_FONT_FAMILY =
  "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif";

/** Z-index constants for layer ordering. */
export const Z_INDEX = {
  /** Background overlays (grids, heatmaps). */
  OVERLAY_BACKGROUND: 0,
  /** Containers (grouping boxes). */
  CONTAINER: 10,
  /** Connections (edges, arcs). */
  CONNECTION: 20,
  /** Elements (nodes, bars, cells). */
  ELEMENT: 30,
  /** Annotations (pointers, brackets, labels). */
  ANNOTATION: 40,
  /** Foreground overlays. */
  OVERLAY_FOREGROUND: 50,
} as const;
