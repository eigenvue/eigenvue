// =============================================================================
// web/src/engine/primitives/PrimitiveRenderer.ts
//
// Draws a PrimitiveScene to a Canvas 2D rendering context. Stateless — no
// instance, no constructor, no side effects beyond the canvas writes.
//
// Every drawing function follows the same contract:
//   1. Save the context state (ctx.save()).
//   2. Apply the primitive's opacity and transforms.
//   3. Draw.
//   4. Restore the context state (ctx.restore()).
//
// This ensures that each primitive's rendering is fully isolated and cannot
// leak state (e.g., transform, clip, globalAlpha) to subsequent primitives.
// =============================================================================

import type {
  PrimitiveScene,
  RenderPrimitive,
  ElementPrimitive,
  ConnectionPrimitive,
  ContainerPrimitive,
  AnnotationPrimitive,
  OverlayPrimitive,
  CanvasSize,
} from "../types";

import { LABEL_FONT_FAMILY, UI_FONT_FAMILY } from "../types";
import { interpolateColor } from "../color";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Renders an entire PrimitiveScene to a 2D canvas context.
 *
 * Steps:
 *   1. Sort primitives by zIndex (stable sort preserves insertion order for ties).
 *   2. Draw each primitive according to its `kind`.
 *
 * The context is assumed to be pre-scaled for DPI by the CanvasManager.
 * The context is NOT cleared — the caller (CanvasManager) handles clearing.
 *
 * @param ctx   - The 2D rendering context.
 * @param scene - The scene to draw.
 * @param _size - Canvas size in CSS pixels (reserved for future use, e.g., clipping).
 */
export function renderScene(
  ctx: CanvasRenderingContext2D,
  scene: PrimitiveScene,
  _size: CanvasSize,
): void {
  // Stable sort by zIndex. Array.prototype.sort is stable in all modern engines
  // (ES2019+ spec requirement).
  const sorted = [...scene.primitives].sort((a, b) => getZIndex(a) - getZIndex(b));

  for (const primitive of sorted) {
    // Skip fully transparent primitives to save draw calls.
    if (getOpacity(primitive) <= 0) continue;

    switch (primitive.kind) {
      case "element":
        drawElement(ctx, primitive);
        break;
      case "connection":
        drawConnection(ctx, primitive);
        break;
      case "container":
        drawContainer(ctx, primitive);
        break;
      case "annotation":
        drawAnnotation(ctx, primitive);
        break;
      case "overlay":
        drawOverlay(ctx, primitive);
        break;
      default: {
        // Exhaustive check: TypeScript will error here if a new kind is
        // added to the RenderPrimitive union without a corresponding case.
        const _exhaustive: never = primitive;
        console.warn(`Unknown primitive kind: ${(_exhaustive as RenderPrimitive).kind}`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Helper: Extract common fields
// ---------------------------------------------------------------------------

function getZIndex(p: RenderPrimitive): number {
  return p.zIndex;
}

function getOpacity(p: RenderPrimitive): number {
  return p.opacity;
}

// ---------------------------------------------------------------------------
// Element Rendering
// ---------------------------------------------------------------------------

/**
 * Draws an ElementPrimitive.
 *
 * The element is drawn centered at (x, y). If rotation is nonzero,
 * the canvas is rotated around (x, y) before drawing.
 *
 * Drawing order:
 *   1. Fill shape
 *   2. Stroke shape
 *   3. Label (centered inside)
 *   4. Sub-label (centered below)
 */
function drawElement(ctx: CanvasRenderingContext2D, el: ElementPrimitive): void {
  ctx.save();
  ctx.globalAlpha = el.opacity;

  // Translate to center, apply rotation.
  ctx.translate(el.x, el.y);
  if (el.rotation !== 0) {
    ctx.rotate(el.rotation);
  }

  // Half-dimensions for drawing centered shapes.
  const hw = el.width / 2;
  const hh = el.height / 2;

  // -- Shape path --
  ctx.beginPath();
  switch (el.shape) {
    case "rect":
      ctx.rect(-hw, -hh, el.width, el.height);
      break;

    case "roundedRect": {
      // Clamp corner radius to half the smaller dimension to prevent artifacts.
      const r = Math.min(el.cornerRadius, hw, hh);
      roundedRectPath(ctx, -hw, -hh, el.width, el.height, r);
      break;
    }

    case "circle":
      // Ellipse inscribed in the bounding box.
      ctx.ellipse(0, 0, hw, hh, 0, 0, Math.PI * 2);
      break;

    case "diamond":
      // Rhombus inscribed in the bounding box: four vertices at edge midpoints.
      ctx.moveTo(0, -hh); // Top
      ctx.lineTo(hw, 0); // Right
      ctx.lineTo(0, hh); // Bottom
      ctx.lineTo(-hw, 0); // Left
      ctx.closePath();
      break;
  }

  // -- Fill --
  if (el.fillColor !== "transparent") {
    ctx.fillStyle = el.fillColor;
    ctx.fill();
  }

  // -- Stroke --
  if (el.strokeColor !== "transparent" && el.strokeWidth > 0) {
    ctx.strokeStyle = el.strokeColor;
    ctx.lineWidth = el.strokeWidth;
    ctx.stroke();
  }

  // -- Label (inside the element) --
  if (el.label !== "") {
    ctx.fillStyle = el.labelColor;
    ctx.font = `${el.labelFontSize}px ${LABEL_FONT_FAMILY}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(el.label, 0, 0);
  }

  // -- Sub-label (below the element, in the un-rotated frame) --
  // We need to undo rotation for the sub-label so it reads horizontally.
  if (el.subLabel !== "") {
    if (el.rotation !== 0) {
      ctx.rotate(-el.rotation);
    }
    ctx.fillStyle = el.subLabelColor;
    ctx.font = `${el.subLabelFontSize}px ${LABEL_FONT_FAMILY}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    // Position below the element's bounding box, with a small gap.
    const gap = 6;
    ctx.fillText(el.subLabel, 0, hh + gap);
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Connection Rendering
// ---------------------------------------------------------------------------

/**
 * Draws a ConnectionPrimitive.
 *
 * If curveOffset is 0, draws a straight line from (x1,y1) to (x2,y2).
 * Otherwise, draws a quadratic Bézier curve with the control point computed
 * as described in the ConnectionPrimitive type definition.
 *
 * Arrowheads are drawn as filled triangles at the endpoint(s).
 */
function drawConnection(ctx: CanvasRenderingContext2D, conn: ConnectionPrimitive): void {
  ctx.save();
  ctx.globalAlpha = conn.opacity;
  ctx.strokeStyle = conn.color;
  ctx.lineWidth = conn.lineWidth;

  if (conn.dashPattern.length > 0) {
    ctx.setLineDash(conn.dashPattern);
  }

  // Compute the control point for the Bézier curve.
  const midX = (conn.x1 + conn.x2) / 2;
  const midY = (conn.y1 + conn.y2) / 2;
  const dx = conn.x2 - conn.x1;
  const dy = conn.y2 - conn.y1;
  const len = Math.sqrt(dx * dx + dy * dy);

  let cpX = midX;
  let cpY = midY;

  if (conn.curveOffset !== 0 && len > 0) {
    // Unit normal perpendicular to the line, pointing LEFT of the direction.
    // Rotating the direction vector (dx, dy) by -90° gives (-dy, dx).
    // Normalizing: (-dy/len, dx/len).
    const nx = -dy / len;
    const ny = dx / len;
    cpX = midX + nx * conn.curveOffset;
    cpY = midY + ny * conn.curveOffset;
  }

  // -- Draw the line/curve --
  ctx.beginPath();
  ctx.moveTo(conn.x1, conn.y1);

  if (conn.curveOffset !== 0 && len > 0) {
    ctx.quadraticCurveTo(cpX, cpY, conn.x2, conn.y2);
  } else {
    ctx.lineTo(conn.x2, conn.y2);
  }

  ctx.stroke();
  ctx.setLineDash([]); // Reset dash pattern.

  // -- Arrowheads --
  if (conn.arrowHead === "end" || conn.arrowHead === "both") {
    // Arrow at the end point (x2, y2).
    // Direction: from control point (or start point) toward end point.
    const fromX = conn.curveOffset !== 0 && len > 0 ? cpX : conn.x1;
    const fromY = conn.curveOffset !== 0 && len > 0 ? cpY : conn.y1;
    drawArrowhead(ctx, fromX, fromY, conn.x2, conn.y2, conn.arrowSize, conn.color);
  }

  if (conn.arrowHead === "start" || conn.arrowHead === "both") {
    // Arrow at the start point (x1, y1).
    const fromX = conn.curveOffset !== 0 && len > 0 ? cpX : conn.x2;
    const fromY = conn.curveOffset !== 0 && len > 0 ? cpY : conn.y2;
    drawArrowhead(ctx, fromX, fromY, conn.x1, conn.y1, conn.arrowSize, conn.color);
  }

  // -- Label at midpoint --
  if (conn.label !== "") {
    // For curved connections, the visual midpoint of a quadratic Bézier at t=0.5 is:
    //   B(0.5) = 0.25*P0 + 0.5*CP + 0.25*P2
    // This gives a point that lies on the curve.
    let labelX: number;
    let labelY: number;

    if (conn.curveOffset !== 0 && len > 0) {
      labelX = 0.25 * conn.x1 + 0.5 * cpX + 0.25 * conn.x2;
      labelY = 0.25 * conn.y1 + 0.5 * cpY + 0.25 * conn.y2;
    } else {
      labelX = midX;
      labelY = midY;
    }

    ctx.fillStyle = conn.labelColor;
    ctx.font = `${conn.labelFontSize}px ${UI_FONT_FAMILY}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    // Position label slightly above the line/curve midpoint.
    ctx.fillText(conn.label, labelX, labelY - 4);
  }

  ctx.restore();
}

/**
 * Draws an arrowhead (filled triangle) at point (tipX, tipY), pointing in
 * the direction from (fromX, fromY) toward (tipX, tipY).
 *
 * The arrowhead has two flanking vertices, each `size` pixels from the tip,
 * spread at ±π/6 radians (30°) from the reversed direction vector.
 *
 * Geometry:
 *   angle = atan2(tipY - fromY, tipX - fromX)    (direction of the arrow)
 *   flankAngle = π/6                               (30° half-spread)
 *   leftVertex  = tip + size * direction(angle + π - flankAngle)
 *   rightVertex = tip + size * direction(angle + π + flankAngle)
 */
function drawArrowhead(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  tipX: number,
  tipY: number,
  size: number,
  color: string,
): void {
  const angle = Math.atan2(tipY - fromY, tipX - fromX);
  const flankAngle = Math.PI / 6; // 30 degrees

  const lx = tipX + size * Math.cos(angle + Math.PI - flankAngle);
  const ly = tipY + size * Math.sin(angle + Math.PI - flankAngle);
  const rx = tipX + size * Math.cos(angle + Math.PI + flankAngle);
  const ry = tipY + size * Math.sin(angle + Math.PI + flankAngle);

  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(lx, ly);
  ctx.lineTo(rx, ry);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

// ---------------------------------------------------------------------------
// Container Rendering
// ---------------------------------------------------------------------------

/**
 * Draws a ContainerPrimitive.
 *
 * Containers are simple rounded rectangles with optional labels.
 * They are typically drawn at low z-index, behind the elements they contain.
 */
function drawContainer(ctx: CanvasRenderingContext2D, cont: ContainerPrimitive): void {
  ctx.save();
  ctx.globalAlpha = cont.opacity;

  const hw = cont.width / 2;
  const hh = cont.height / 2;
  const x = cont.x - hw;
  const y = cont.y - hh;
  const r = Math.min(cont.cornerRadius, hw, hh);

  // -- Shape --
  ctx.beginPath();
  roundedRectPath(ctx, x, y, cont.width, cont.height, r);

  if (cont.fillColor !== "transparent") {
    ctx.fillStyle = cont.fillColor;
    ctx.fill();
  }

  if (cont.strokeColor !== "transparent" && cont.strokeWidth > 0) {
    ctx.strokeStyle = cont.strokeColor;
    ctx.lineWidth = cont.strokeWidth;
    if (cont.dashPattern.length > 0) {
      ctx.setLineDash(cont.dashPattern);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // -- Label at top-center --
  if (cont.label !== "") {
    ctx.fillStyle = cont.labelColor;
    ctx.font = `${cont.labelFontSize}px ${UI_FONT_FAMILY}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // Position at the top edge of the container.
    ctx.fillText(cont.label, cont.x, cont.y - hh);
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Annotation Rendering
// ---------------------------------------------------------------------------

/**
 * Draws an AnnotationPrimitive based on its `form`.
 */
function drawAnnotation(ctx: CanvasRenderingContext2D, ann: AnnotationPrimitive): void {
  ctx.save();
  ctx.globalAlpha = ann.opacity;

  switch (ann.form) {
    case "pointer":
      drawPointerAnnotation(ctx, ann);
      break;
    case "bracket":
      drawBracketAnnotation(ctx, ann);
      break;
    case "label":
      drawLabelAnnotation(ctx, ann);
      break;
    case "badge":
      drawBadgeAnnotation(ctx, ann);
      break;
  }

  ctx.restore();
}

/**
 * Draws a downward-pointing triangle (▼) with its tip at (x, y).
 *
 * Triangle vertices:
 *   Tip:   (x, y)
 *   Left:  (x - pointerWidth/2, y - pointerHeight)
 *   Right: (x + pointerWidth/2, y - pointerHeight)
 *
 * The text label is drawn centered above the triangle base.
 */
function drawPointerAnnotation(ctx: CanvasRenderingContext2D, ann: AnnotationPrimitive): void {
  const halfW = ann.pointerWidth / 2;

  // Draw the triangle.
  ctx.beginPath();
  ctx.moveTo(ann.x, ann.y); // Tip
  ctx.lineTo(ann.x - halfW, ann.y - ann.pointerHeight); // Left base
  ctx.lineTo(ann.x + halfW, ann.y - ann.pointerHeight); // Right base
  ctx.closePath();
  ctx.fillStyle = ann.color;
  ctx.fill();

  // Draw the label above the triangle.
  if (ann.text !== "") {
    ctx.fillStyle = ann.textColor;
    ctx.font = `bold ${ann.fontSize}px ${UI_FONT_FAMILY}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    const labelGap = 4;
    ctx.fillText(ann.text, ann.x, ann.y - ann.pointerHeight - labelGap);
  }
}

/**
 * Draws a horizontal bracket: ┌─────────┐ with optional text above.
 *
 * (x, y) is the left end. The bracket extends to (x + bracketWidth, y).
 * Ticks extend downward by bracketTickHeight at each end.
 */
function drawBracketAnnotation(ctx: CanvasRenderingContext2D, ann: AnnotationPrimitive): void {
  ctx.strokeStyle = ann.color;
  ctx.lineWidth = 2;

  ctx.beginPath();
  // Left tick (downward).
  ctx.moveTo(ann.x, ann.y + ann.bracketTickHeight);
  ctx.lineTo(ann.x, ann.y);
  // Horizontal bar.
  ctx.lineTo(ann.x + ann.bracketWidth, ann.y);
  // Right tick (downward).
  ctx.lineTo(ann.x + ann.bracketWidth, ann.y + ann.bracketTickHeight);
  ctx.stroke();

  // Label centered above the bracket.
  if (ann.text !== "") {
    ctx.fillStyle = ann.textColor;
    ctx.font = `${ann.fontSize}px ${UI_FONT_FAMILY}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    const labelGap = 4;
    ctx.fillText(ann.text, ann.x + ann.bracketWidth / 2, ann.y - labelGap);
  }
}

/**
 * Draws a free-floating text label centered at (x, y).
 */
function drawLabelAnnotation(ctx: CanvasRenderingContext2D, ann: AnnotationPrimitive): void {
  if (ann.text === "") return;

  ctx.fillStyle = ann.textColor;
  ctx.font = `${ann.fontSize}px ${UI_FONT_FAMILY}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(ann.text, ann.x, ann.y);
}

/**
 * Draws a badge (pill-shaped rounded rectangle) with text centered at (x, y).
 *
 * The pill dimensions are computed from the text measurement plus padding.
 */
function drawBadgeAnnotation(ctx: CanvasRenderingContext2D, ann: AnnotationPrimitive): void {
  if (ann.text === "") return;

  ctx.font = `bold ${ann.fontSize}px ${UI_FONT_FAMILY}`;
  const metrics = ctx.measureText(ann.text);
  const textWidth = metrics.width;
  const textHeight = ann.fontSize; // Approximate.

  const pillW = textWidth + ann.badgePaddingX * 2;
  const pillH = textHeight + ann.badgePaddingY * 2;
  const r = pillH / 2; // Fully rounded ends.

  const pillX = ann.x - pillW / 2;
  const pillY = ann.y - pillH / 2;

  // Draw pill background.
  ctx.beginPath();
  roundedRectPath(ctx, pillX, pillY, pillW, pillH, r);
  ctx.fillStyle = ann.color;
  ctx.fill();

  // Draw text.
  ctx.fillStyle = ann.textColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(ann.text, ann.x, ann.y);
}

// ---------------------------------------------------------------------------
// Overlay Rendering
// ---------------------------------------------------------------------------

/**
 * Draws an OverlayPrimitive based on its `overlayType`.
 */
function drawOverlay(ctx: CanvasRenderingContext2D, ov: OverlayPrimitive): void {
  ctx.save();
  ctx.globalAlpha = ov.opacity;

  switch (ov.overlayType) {
    case "grid":
      drawGridOverlay(ctx, ov);
      break;
    case "heatmap":
      drawHeatmapOverlay(ctx, ov);
      break;
  }

  ctx.restore();
}

/**
 * Draws a grid of lines within the overlay region.
 */
function drawGridOverlay(ctx: CanvasRenderingContext2D, ov: OverlayPrimitive): void {
  if (ov.gridSpacing <= 0) return;

  ctx.strokeStyle = ov.gridColor;
  ctx.lineWidth = ov.gridLineWidth;

  ctx.beginPath();

  // Vertical lines.
  for (let x = ov.x; x <= ov.x + ov.width; x += ov.gridSpacing) {
    ctx.moveTo(x, ov.y);
    ctx.lineTo(x, ov.y + ov.height);
  }

  // Horizontal lines.
  for (let y = ov.y; y <= ov.y + ov.height; y += ov.gridSpacing) {
    ctx.moveTo(ov.x, y);
    ctx.lineTo(ov.x + ov.width, y);
  }

  ctx.stroke();
}

/**
 * Draws a heatmap within the overlay region.
 *
 * Each cell in heatmapData[row][col] is drawn as a filled rectangle.
 * Color is linearly interpolated between heatmapColorLow and heatmapColorHigh.
 */
function drawHeatmapOverlay(ctx: CanvasRenderingContext2D, ov: OverlayPrimitive): void {
  if (ov.heatmapData.length === 0) return;

  const rows = ov.heatmapData.length;
  const cols = ov.heatmapData[0]!.length;
  if (cols === 0) return;

  const cellW = ov.width / cols;
  const cellH = ov.height / rows;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // Clamp value to [0, 1] for safety.
      const value = Math.max(0, Math.min(1, ov.heatmapData[row]![col]!));
      const color = interpolateColor(ov.heatmapColorLow, ov.heatmapColorHigh, value);

      ctx.fillStyle = color;
      ctx.fillRect(ov.x + col * cellW, ov.y + row * cellH, cellW, cellH);
    }
  }
}

// ---------------------------------------------------------------------------
// Shared Drawing Utility: Rounded Rectangle Path
// ---------------------------------------------------------------------------

/**
 * Traces a rounded rectangle path on the context. Does NOT fill or stroke.
 * The caller must call ctx.fill() and/or ctx.stroke() afterward.
 *
 * Uses arcTo for each corner. The path starts at the top-left, going clockwise.
 *
 * @param ctx    - The 2D context.
 * @param x      - Top-left x.
 * @param y      - Top-left y.
 * @param width  - Rectangle width.
 * @param height - Rectangle height.
 * @param radius - Corner radius. Clamped to min(width/2, height/2) before use.
 */
function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2);

  ctx.moveTo(x + r, y);
  // Top edge and top-right corner.
  ctx.arcTo(x + width, y, x + width, y + r, r);
  // Right edge and bottom-right corner.
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
  // Bottom edge and bottom-left corner.
  ctx.arcTo(x, y + height, x, y + height - r, r);
  // Left edge and top-left corner.
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}
