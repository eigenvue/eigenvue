// =============================================================================
// web/src/engine/layouts/bloch-sphere.ts
//
// Layout for rendering a pseudo-3D Bloch sphere wireframe on Canvas 2D.
// Draws a wireframe sphere (equator + two meridians) using many short
// ConnectionPrimitive line segments, axis labels, a state vector arrow,
// and small amplitude probability bars below the sphere.
//
// Reads from visual actions:
//   - "rotateBlochSphere": { theta, phi, label }
//   - "showProbabilities": { probabilities, labels }
//   - "showGateMatrix":    { gate, matrix }
//
// Also reads from step.state as fallback:
//   - theta: number   (polar angle, [0, pi])
//   - phi: number     (azimuthal angle, [0, 2*pi))
//   - label: string   (state label)
//   - probabilities: number[]
//   - labels: string[]
//
// 3D to 2D projection uses a cabinet-style oblique projection with
// configurable elevation and azimuth viewing angles.
//
// Self-registers with the layout registry on module load.
// =============================================================================

import type {
  Step,
  CanvasSize,
  PrimitiveScene,
  RenderPrimitive,
  ElementPrimitive,
  ConnectionPrimitive,
  AnnotationPrimitive,
} from "../types";

import { LAYOUT_PADDING, Z_INDEX } from "../types";
import { registerLayout } from "./registry";

// -- Constants ----------------------------------------------------------------

const SPHERE_SEGMENTS = 32; // number of line segments per great circle
const AXIS_OVERSHOOT = 1.15; // axis lines extend past sphere radius

const THEME = {
  wireFront: "#3b82f6",
  wireBack: "#1e40af",
  axisColor: "#64748b",
  axisLabelColor: "#e2e8f0",
  stateVectorColor: "#00ffc8",
  stateVectorDot: "#00ffc8",
  stateLabelColor: "#00ffc8",
  probBarFill: "#00ffc8",
  probBarStroke: "#00dba8",
  probLabelColor: "#cbd5e1",
  probPercentColor: "#e2e8f0",
  titleColor: "#e2e8f0",
  gateInfoColor: "#94a3b8",
} as const;

// -- 3D Projection ------------------------------------------------------------

// Cabinet projection angles
const ELEVATION_ANGLE = -Math.PI / 8; // 22.5 degrees tilt
const AZIMUTH_ANGLE = Math.PI / 6; // 30 degrees rotation

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface ProjectedPoint {
  canvasX: number;
  canvasY: number;
  depth: number;
}

/**
 * Projects a 3D Bloch sphere point to 2D canvas coordinates using
 * a cabinet oblique projection.
 *
 * Steps:
 * 1. Rotate around z-axis by azimuth angle.
 * 2. Rotate around x-axis by elevation angle.
 * 3. Map to canvas coordinates (x -> canvasX, -z -> canvasY).
 *
 * @param p       - 3D point on or inside the Bloch sphere (unit sphere).
 * @param centerX - Canvas x of the sphere center.
 * @param centerY - Canvas y of the sphere center.
 * @param radius  - Sphere radius in CSS pixels.
 * @returns Projected 2D point with depth for visibility sorting.
 */
function project(p: Point3D, centerX: number, centerY: number, radius: number): ProjectedPoint {
  const cosAz = Math.cos(AZIMUTH_ANGLE);
  const sinAz = Math.sin(AZIMUTH_ANGLE);
  const cosEl = Math.cos(ELEVATION_ANGLE);
  const sinEl = Math.sin(ELEVATION_ANGLE);

  // Azimuth rotation around z-axis
  const rx = p.x * cosAz - p.y * sinAz;
  const ry = p.x * sinAz + p.y * cosAz;
  const rz = p.z;

  // Elevation rotation around x-axis
  const ry2 = ry * cosEl - rz * sinEl;
  const rz2 = ry * sinEl + rz * cosEl;

  return {
    canvasX: centerX + rx * radius,
    canvasY: centerY - rz2 * radius, // negate for canvas coords (y increases downward)
    depth: ry2,
  };
}

// -- Layout Function ----------------------------------------------------------

/**
 * The bloch-sphere layout function.
 *
 * Renders a pseudo-3D Bloch sphere wireframe with a state vector arrow,
 * axis labels, and optional probability bars below.
 */
function blochSphereLayout(
  step: Step,
  canvasSize: CanvasSize,
  _config: Record<string, unknown>,
): PrimitiveScene {
  const primitives: RenderPrimitive[] = [];
  const state = step.state as Record<string, unknown>;

  // -- Read visual actions ----------------------------------------------------

  let theta = (state.theta as number) ?? 0;
  let phi = (state.phi as number) ?? 0;
  let stateLabel = (state.label as string) ?? "";
  let probabilities: number[] = (state.probabilities as number[]) ?? [];
  let probLabels: string[] = (state.labels as string[]) ?? [];
  let gateName: string | null = null;

  for (const action of step.visualActions) {
    if (action.type === "rotateBlochSphere") {
      const a = action as Record<string, unknown>;
      theta = (a.theta as number) ?? theta;
      phi = (a.phi as number) ?? phi;
      if (a.label) stateLabel = a.label as string;
    }
    if (action.type === "showProbabilities") {
      const a = action as Record<string, unknown>;
      probabilities = (a.probabilities as number[]) ?? probabilities;
      probLabels = (a.labels as string[]) ?? probLabels;
    }
    if (action.type === "showGateMatrix") {
      const a = action as Record<string, unknown>;
      gateName = (a.gate as string) ?? null;
    }
  }

  // -- Compute geometry -------------------------------------------------------

  const usableWidth = canvasSize.width - 2 * LAYOUT_PADDING;
  const usableHeight = canvasSize.height - 2 * LAYOUT_PADDING;

  // Reserve bottom section for probability bars
  const hasProbBars = probabilities.length > 0;
  const probBarSectionHeight = hasProbBars ? 80 : 0;

  const sphereSectionHeight = usableHeight - probBarSectionHeight;
  const sphereRadius = Math.min(usableWidth, sphereSectionHeight) * 0.38;
  const sphereCenterX = LAYOUT_PADDING + usableWidth / 2;
  const sphereCenterY = LAYOUT_PADDING + sphereSectionHeight / 2;

  // -- Helper: create wireframe segment with front/back differentiation -------

  let segmentCounter = 0;

  /**
   * Generates an array of projected points for a great circle defined by
   * a parametric function.
   */
  function generateCirclePoints(paramFn: (t: number) => Point3D): ProjectedPoint[] {
    const points: ProjectedPoint[] = [];
    const numPoints = SPHERE_SEGMENTS * 2; // double points for smoother curves
    for (let i = 0; i <= numPoints; i++) {
      const t = (i / numPoints) * 2 * Math.PI;
      const p3d = paramFn(t);
      points.push(project(p3d, sphereCenterX, sphereCenterY, sphereRadius));
    }
    return points;
  }

  /**
   * Creates line segment primitives from projected points.
   * Front-facing segments (depth > 0) are solid; back-facing are dashed
   * with lower opacity.
   */
  function addWireframeSegments(points: ProjectedPoint[], idPrefix: string): void {
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i]!;
      const p1 = points[i + 1]!;
      const avgDepth = (p0.depth + p1.depth) / 2;
      const isFront = avgDepth >= 0;

      const segment: ConnectionPrimitive = {
        kind: "connection",
        id: `${idPrefix}-${segmentCounter++}`,
        x1: p0.canvasX,
        y1: p0.canvasY,
        x2: p1.canvasX,
        y2: p1.canvasY,
        curveOffset: 0,
        color: isFront ? THEME.wireFront : THEME.wireBack,
        lineWidth: 1,
        dashPattern: isFront ? [] : [3, 3],
        arrowHead: "none",
        arrowSize: 0,
        label: "",
        labelFontSize: 0,
        labelColor: "transparent",
        opacity: isFront ? 0.6 : 0.2,
        zIndex: isFront ? Z_INDEX.CONNECTION + 1 : Z_INDEX.CONNECTION - 1,
      };
      primitives.push(segment);
    }
  }

  // -- 1. Wireframe sphere: equator -------------------------------------------

  const equatorPoints = generateCirclePoints((t) => ({
    x: Math.cos(t),
    y: Math.sin(t),
    z: 0,
  }));
  addWireframeSegments(equatorPoints, "equator");

  // -- 2. Wireframe sphere: XZ meridian (longitude 0) -------------------------

  const meridianXZPoints = generateCirclePoints((t) => ({
    x: Math.cos(t),
    y: 0,
    z: Math.sin(t),
  }));
  addWireframeSegments(meridianXZPoints, "meridian-xz");

  // -- 3. Wireframe sphere: YZ meridian (longitude 90) ------------------------

  const meridianYZPoints = generateCirclePoints((t) => ({
    x: 0,
    y: Math.cos(t),
    z: Math.sin(t),
  }));
  addWireframeSegments(meridianYZPoints, "meridian-yz");

  // -- 4. Axis lines ----------------------------------------------------------

  // Z-axis (|0> at top, |1> at bottom)
  const zTop = project(
    { x: 0, y: 0, z: AXIS_OVERSHOOT },
    sphereCenterX,
    sphereCenterY,
    sphereRadius,
  );
  const zBottom = project(
    { x: 0, y: 0, z: -AXIS_OVERSHOOT },
    sphereCenterX,
    sphereCenterY,
    sphereRadius,
  );

  const zAxis: ConnectionPrimitive = {
    kind: "connection",
    id: "axis-z",
    x1: zBottom.canvasX,
    y1: zBottom.canvasY,
    x2: zTop.canvasX,
    y2: zTop.canvasY,
    curveOffset: 0,
    color: THEME.axisColor,
    lineWidth: 1,
    dashPattern: [4, 4],
    arrowHead: "none",
    arrowSize: 0,
    label: "",
    labelFontSize: 0,
    labelColor: "transparent",
    opacity: 0.5,
    zIndex: Z_INDEX.CONNECTION,
  };
  primitives.push(zAxis);

  // X-axis (+x at front-right, -x at back-left)
  const xPos = project(
    { x: AXIS_OVERSHOOT, y: 0, z: 0 },
    sphereCenterX,
    sphereCenterY,
    sphereRadius,
  );
  const xNeg = project(
    { x: -AXIS_OVERSHOOT, y: 0, z: 0 },
    sphereCenterX,
    sphereCenterY,
    sphereRadius,
  );

  const xAxis: ConnectionPrimitive = {
    kind: "connection",
    id: "axis-x",
    x1: xNeg.canvasX,
    y1: xNeg.canvasY,
    x2: xPos.canvasX,
    y2: xPos.canvasY,
    curveOffset: 0,
    color: THEME.axisColor,
    lineWidth: 1,
    dashPattern: [4, 4],
    arrowHead: "none",
    arrowSize: 0,
    label: "",
    labelFontSize: 0,
    labelColor: "transparent",
    opacity: 0.5,
    zIndex: Z_INDEX.CONNECTION,
  };
  primitives.push(xAxis);

  // Y-axis
  const yPos = project(
    { x: 0, y: AXIS_OVERSHOOT, z: 0 },
    sphereCenterX,
    sphereCenterY,
    sphereRadius,
  );
  const yNeg = project(
    { x: 0, y: -AXIS_OVERSHOOT, z: 0 },
    sphereCenterX,
    sphereCenterY,
    sphereRadius,
  );

  const yAxis: ConnectionPrimitive = {
    kind: "connection",
    id: "axis-y",
    x1: yNeg.canvasX,
    y1: yNeg.canvasY,
    x2: yPos.canvasX,
    y2: yPos.canvasY,
    curveOffset: 0,
    color: THEME.axisColor,
    lineWidth: 1,
    dashPattern: [4, 4],
    arrowHead: "none",
    arrowSize: 0,
    label: "",
    labelFontSize: 0,
    labelColor: "transparent",
    opacity: 0.5,
    zIndex: Z_INDEX.CONNECTION,
  };
  primitives.push(yAxis);

  // -- 5. Axis labels ---------------------------------------------------------

  // |0> at top of z-axis (north pole)
  const zTopLabel = project(
    { x: 0, y: 0, z: AXIS_OVERSHOOT + 0.15 },
    sphereCenterX,
    sphereCenterY,
    sphereRadius,
  );
  const label0: AnnotationPrimitive = {
    kind: "annotation",
    id: "axis-label-0",
    form: "label",
    x: zTopLabel.canvasX,
    y: zTopLabel.canvasY - 5,
    text: "|0\u27E9",
    fontSize: 14,
    textColor: THEME.axisLabelColor,
    color: THEME.axisLabelColor,
    pointerHeight: 0,
    pointerWidth: 0,
    bracketWidth: 0,
    bracketTickHeight: 0,
    badgePaddingX: 0,
    badgePaddingY: 0,
    opacity: 1,
    zIndex: Z_INDEX.ANNOTATION,
  };
  primitives.push(label0);

  // |1> at bottom of z-axis (south pole)
  const zBottomLabel = project(
    { x: 0, y: 0, z: -(AXIS_OVERSHOOT + 0.15) },
    sphereCenterX,
    sphereCenterY,
    sphereRadius,
  );
  const label1: AnnotationPrimitive = {
    kind: "annotation",
    id: "axis-label-1",
    form: "label",
    x: zBottomLabel.canvasX,
    y: zBottomLabel.canvasY + 10,
    text: "|1\u27E9",
    fontSize: 14,
    textColor: THEME.axisLabelColor,
    color: THEME.axisLabelColor,
    pointerHeight: 0,
    pointerWidth: 0,
    bracketWidth: 0,
    bracketTickHeight: 0,
    badgePaddingX: 0,
    badgePaddingY: 0,
    opacity: 1,
    zIndex: Z_INDEX.ANNOTATION,
  };
  primitives.push(label1);

  // |+> on positive x-axis
  const xPosLabel = project(
    { x: AXIS_OVERSHOOT + 0.15, y: 0, z: 0 },
    sphereCenterX,
    sphereCenterY,
    sphereRadius,
  );
  const labelPlus: AnnotationPrimitive = {
    kind: "annotation",
    id: "axis-label-plus",
    form: "label",
    x: xPosLabel.canvasX + 8,
    y: xPosLabel.canvasY,
    text: "|+\u27E9",
    fontSize: 12,
    textColor: THEME.axisLabelColor,
    color: THEME.axisLabelColor,
    pointerHeight: 0,
    pointerWidth: 0,
    bracketWidth: 0,
    bracketTickHeight: 0,
    badgePaddingX: 0,
    badgePaddingY: 0,
    opacity: 0.7,
    zIndex: Z_INDEX.ANNOTATION,
  };
  primitives.push(labelPlus);

  // |-> on negative x-axis
  const xNegLabel = project(
    { x: -(AXIS_OVERSHOOT + 0.15), y: 0, z: 0 },
    sphereCenterX,
    sphereCenterY,
    sphereRadius,
  );
  const labelMinus: AnnotationPrimitive = {
    kind: "annotation",
    id: "axis-label-minus",
    form: "label",
    x: xNegLabel.canvasX - 8,
    y: xNegLabel.canvasY,
    text: "|-\u27E9",
    fontSize: 12,
    textColor: THEME.axisLabelColor,
    color: THEME.axisLabelColor,
    pointerHeight: 0,
    pointerWidth: 0,
    bracketWidth: 0,
    bracketTickHeight: 0,
    badgePaddingX: 0,
    badgePaddingY: 0,
    opacity: 0.7,
    zIndex: Z_INDEX.ANNOTATION,
  };
  primitives.push(labelMinus);

  // |+i> on positive y-axis
  const yPosLabel = project(
    { x: 0, y: AXIS_OVERSHOOT + 0.15, z: 0 },
    sphereCenterX,
    sphereCenterY,
    sphereRadius,
  );
  const labelPlusI: AnnotationPrimitive = {
    kind: "annotation",
    id: "axis-label-plus-i",
    form: "label",
    x: yPosLabel.canvasX + 8,
    y: yPosLabel.canvasY,
    text: "|+i\u27E9",
    fontSize: 12,
    textColor: THEME.axisLabelColor,
    color: THEME.axisLabelColor,
    pointerHeight: 0,
    pointerWidth: 0,
    bracketWidth: 0,
    bracketTickHeight: 0,
    badgePaddingX: 0,
    badgePaddingY: 0,
    opacity: 0.7,
    zIndex: Z_INDEX.ANNOTATION,
  };
  primitives.push(labelPlusI);

  // |-i> on negative y-axis
  const yNegLabel = project(
    { x: 0, y: -(AXIS_OVERSHOOT + 0.15), z: 0 },
    sphereCenterX,
    sphereCenterY,
    sphereRadius,
  );
  const labelMinusI: AnnotationPrimitive = {
    kind: "annotation",
    id: "axis-label-minus-i",
    form: "label",
    x: yNegLabel.canvasX - 8,
    y: yNegLabel.canvasY,
    text: "|-i\u27E9",
    fontSize: 12,
    textColor: THEME.axisLabelColor,
    color: THEME.axisLabelColor,
    pointerHeight: 0,
    pointerWidth: 0,
    bracketWidth: 0,
    bracketTickHeight: 0,
    badgePaddingX: 0,
    badgePaddingY: 0,
    opacity: 0.7,
    zIndex: Z_INDEX.ANNOTATION,
  };
  primitives.push(labelMinusI);

  // -- 6. State vector arrow --------------------------------------------------

  // Bloch vector from spherical coordinates:
  //   x = sin(theta) * cos(phi)
  //   y = sin(theta) * sin(phi)
  //   z = cos(theta)
  const blochX = Math.sin(theta) * Math.cos(phi);
  const blochY = Math.sin(theta) * Math.sin(phi);
  const blochZ = Math.cos(theta);

  const origin = project({ x: 0, y: 0, z: 0 }, sphereCenterX, sphereCenterY, sphereRadius);
  const tip = project(
    { x: blochX, y: blochY, z: blochZ },
    sphereCenterX,
    sphereCenterY,
    sphereRadius,
  );

  const stateVector: ConnectionPrimitive = {
    kind: "connection",
    id: "state-vector",
    x1: origin.canvasX,
    y1: origin.canvasY,
    x2: tip.canvasX,
    y2: tip.canvasY,
    curveOffset: 0,
    color: THEME.stateVectorColor,
    lineWidth: 2.5,
    dashPattern: [],
    arrowHead: "end",
    arrowSize: 8,
    label: "",
    labelFontSize: 0,
    labelColor: "transparent",
    opacity: 1,
    zIndex: Z_INDEX.ELEMENT + 5,
  };
  primitives.push(stateVector);

  // State vector tip dot
  const tipDot: ElementPrimitive = {
    kind: "element",
    id: "state-vector-tip",
    x: tip.canvasX,
    y: tip.canvasY,
    width: 8,
    height: 8,
    shape: "circle",
    cornerRadius: 0,
    fillColor: THEME.stateVectorDot,
    strokeColor: "transparent",
    strokeWidth: 0,
    label: "",
    labelFontSize: 0,
    labelColor: "transparent",
    subLabel: "",
    subLabelFontSize: 0,
    subLabelColor: "transparent",
    rotation: 0,
    opacity: 1,
    zIndex: Z_INDEX.ELEMENT + 6,
  };
  primitives.push(tipDot);

  // -- 7. State label near the vector tip -------------------------------------

  if (stateLabel) {
    const labelOffset = 15;
    const stateAnnotation: AnnotationPrimitive = {
      kind: "annotation",
      id: "state-label",
      form: "label",
      x: tip.canvasX + labelOffset,
      y: tip.canvasY - labelOffset,
      text: stateLabel,
      fontSize: 13,
      textColor: THEME.stateLabelColor,
      color: THEME.stateLabelColor,
      pointerHeight: 0,
      pointerWidth: 0,
      bracketWidth: 0,
      bracketTickHeight: 0,
      badgePaddingX: 0,
      badgePaddingY: 0,
      opacity: 1,
      zIndex: Z_INDEX.ANNOTATION + 1,
    };
    primitives.push(stateAnnotation);
  }

  // -- 8. Theta/Phi angle display ---------------------------------------------

  const thetaDeg = ((theta * 180) / Math.PI).toFixed(1);
  const phiDeg = ((phi * 180) / Math.PI).toFixed(1);

  const angleInfo: AnnotationPrimitive = {
    kind: "annotation",
    id: "angle-info",
    form: "label",
    x: sphereCenterX,
    y: LAYOUT_PADDING + 15,
    text: `\u03B8 = ${thetaDeg}\u00B0   \u03C6 = ${phiDeg}\u00B0`,
    fontSize: 13,
    textColor: THEME.titleColor,
    color: THEME.titleColor,
    pointerHeight: 0,
    pointerWidth: 0,
    bracketWidth: 0,
    bracketTickHeight: 0,
    badgePaddingX: 0,
    badgePaddingY: 0,
    opacity: 1,
    zIndex: Z_INDEX.ANNOTATION,
  };
  primitives.push(angleInfo);

  // -- 9. Gate name display (if present) --------------------------------------

  if (gateName) {
    const gateInfo: AnnotationPrimitive = {
      kind: "annotation",
      id: "gate-info",
      form: "badge",
      x: sphereCenterX,
      y: LAYOUT_PADDING + 35,
      text: `Gate: ${gateName}`,
      fontSize: 12,
      textColor: THEME.gateInfoColor,
      color: THEME.gateInfoColor,
      pointerHeight: 0,
      pointerWidth: 0,
      bracketWidth: 0,
      bracketTickHeight: 0,
      badgePaddingX: 8,
      badgePaddingY: 4,
      opacity: 0.8,
      zIndex: Z_INDEX.ANNOTATION,
    };
    primitives.push(gateInfo);
  }

  // -- 10. Small amplitude probability bars below the sphere ------------------

  if (hasProbBars) {
    const probSectionTop = LAYOUT_PADDING + sphereSectionHeight + 10;
    const probSectionWidth = usableWidth * 0.6;
    const probSectionLeft = LAYOUT_PADDING + (usableWidth - probSectionWidth) / 2;
    const probBarMaxHeight = 40;
    const probBarCount = Math.min(probabilities.length, 8);
    const probBarSlotWidth = probSectionWidth / probBarCount;
    const probBarWidth = probBarSlotWidth * 0.6;

    // Probability section title
    const probTitle: AnnotationPrimitive = {
      kind: "annotation",
      id: "prob-section-title",
      form: "label",
      x: LAYOUT_PADDING + usableWidth / 2,
      y: probSectionTop - 2,
      text: "Probabilities",
      fontSize: 11,
      textColor: THEME.probLabelColor,
      color: THEME.probLabelColor,
      pointerHeight: 0,
      pointerWidth: 0,
      bracketWidth: 0,
      bracketTickHeight: 0,
      badgePaddingX: 0,
      badgePaddingY: 0,
      opacity: 0.7,
      zIndex: Z_INDEX.ANNOTATION,
    };
    primitives.push(probTitle);

    const probBarBaseline = probSectionTop + probBarMaxHeight + 8;

    for (let i = 0; i < probBarCount; i++) {
      const prob = probabilities[i] ?? 0;
      const barHeight = Math.max(prob * probBarMaxHeight, 1);
      const barCenterX = probSectionLeft + (i + 0.5) * probBarSlotWidth;
      const barCenterY = probBarBaseline - barHeight / 2;

      // Probability bar
      const probBar: ElementPrimitive = {
        kind: "element",
        id: `bloch-prob-bar-${i}`,
        x: barCenterX,
        y: barCenterY,
        width: probBarWidth,
        height: barHeight,
        shape: "rect",
        cornerRadius: 0,
        fillColor: THEME.probBarFill,
        strokeColor: THEME.probBarStroke,
        strokeWidth: 1,
        label: "",
        labelFontSize: 0,
        labelColor: "transparent",
        subLabel: "",
        subLabelFontSize: 0,
        subLabelColor: "transparent",
        rotation: 0,
        opacity: prob < 0.001 ? 0.3 : 0.8,
        zIndex: Z_INDEX.ELEMENT,
      };
      primitives.push(probBar);

      // Percentage above bar
      const pctText = prob >= 0.01 ? `${(prob * 100).toFixed(0)}%` : prob > 0 ? "<1%" : "0%";

      const probPct: AnnotationPrimitive = {
        kind: "annotation",
        id: `bloch-prob-pct-${i}`,
        form: "label",
        x: barCenterX,
        y: probBarBaseline - barHeight - 8,
        text: pctText,
        fontSize: 9,
        textColor: THEME.probPercentColor,
        color: THEME.probPercentColor,
        pointerHeight: 0,
        pointerWidth: 0,
        bracketWidth: 0,
        bracketTickHeight: 0,
        badgePaddingX: 0,
        badgePaddingY: 0,
        opacity: prob < 0.001 ? 0.4 : 0.8,
        zIndex: Z_INDEX.ANNOTATION,
      };
      primitives.push(probPct);

      // Basis label below bar
      const basisText = i < probLabels.length ? probLabels[i]! : `|${i}\u27E9`;
      const probLbl: AnnotationPrimitive = {
        kind: "annotation",
        id: `bloch-prob-label-${i}`,
        form: "label",
        x: barCenterX,
        y: probBarBaseline + 12,
        text: basisText,
        fontSize: 10,
        textColor: THEME.probLabelColor,
        color: THEME.probLabelColor,
        pointerHeight: 0,
        pointerWidth: 0,
        bracketWidth: 0,
        bracketTickHeight: 0,
        badgePaddingX: 0,
        badgePaddingY: 0,
        opacity: 0.8,
        zIndex: Z_INDEX.ANNOTATION,
      };
      primitives.push(probLbl);
    }
  }

  return { primitives };
}

// -- Registration -------------------------------------------------------------

registerLayout({
  name: "bloch-sphere",
  description:
    "Pseudo-3D Bloch sphere wireframe with state vector arrow. " +
    "Visualizes single-qubit pure states on the Bloch sphere.",
  layout: blochSphereLayout,
});
