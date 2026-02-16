// =============================================================================
// web/src/engine/layouts/loss-landscape.ts
//
// Layout for visualizing gradient descent on a loss landscape. Renders a
// contour plot (GRID_RESOLUTION x GRID_RESOLUTION colored cells) with an
// optimizer trajectory overlay, current/start position markers, minimum
// marker, gradient arrow, and an info bar.
//
// Supports surface types: "quadratic" (a*x^2 + b*y^2) and "rosenbrock"
// ((a - x)^2 + b*(y - x^2)^2).
// Supports optimizers: "sgd", "momentum", "adam".
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

const GRID_RESOLUTION = 50;
const PLOT_HEIGHT_RATIO = 0.8;
const CONTOUR_CORNER_RADIUS = 0;
const TRAJECTORY_LINE_WIDTH = 2.5;
const GRADIENT_ARROW_LENGTH = 30;
const MARKER_RADIUS = 6;
const START_MARKER_RADIUS = 5;
const MINIMUM_MARKER_SIZE = 10;

const THEME = {
  contourLow: "#0f172a",
  contourMid: "#1e40af",
  contourHigh: "#f59e0b",
  contourVeryHigh: "#fef3c7",
  sgdTrajectory: "#ef4444",
  momentumTrajectory: "#22c55e",
  adamTrajectory: "#3b82f6",
  currentPosition: "#ffffff",
  startPosition: "#94a3b8",
  minimum: "#facc15",
  gradientArrow: "#f472b6",
  infoText: "#e2e8f0",
  labelText: "#94a3b8",
} as const;

// -- Color Helpers ------------------------------------------------------------

/**
 * Parses a 6-digit hex color string into [R, G, B] components.
 */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.startsWith("#") ? hex.slice(1) : hex;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/**
 * Converts [R, G, B] components back to a 6-digit hex color string.
 */
function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (v: number) => clamp(v).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Linearly interpolates between two hex color strings.
 *
 * @param a - Start hex color.
 * @param b - End hex color.
 * @param t - Interpolation factor in [0, 1].
 * @returns Interpolated hex color string.
 */
function interpolateHex(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

/**
 * Maps a loss value to a color using a logarithmic 4-stop gradient.
 *
 * The log scale ensures that low-loss regions (near the minimum) have
 * good color differentiation while high-loss regions do not blow out.
 *
 * Gradient stops:
 *   t in [0.0, 0.3) -- contourLow  -> contourMid
 *   t in [0.3, 0.7) -- contourMid  -> contourHigh
 *   t in [0.7, 1.0] -- contourHigh -> contourVeryHigh
 *
 * @param loss    - The loss value at this grid cell.
 * @param maxLoss - The maximum loss across the entire grid.
 * @returns CSS hex color string.
 */
function lossToColor(loss: number, maxLoss: number): string {
  if (maxLoss <= 0) return THEME.contourLow;
  const logLoss = Math.log1p(loss);
  const logMax = Math.log1p(maxLoss);
  const t = Math.min(logLoss / logMax, 1);
  if (t < 0.3) {
    const s = t / 0.3;
    return interpolateHex(THEME.contourLow, THEME.contourMid, s);
  } else if (t < 0.7) {
    const s = (t - 0.3) / 0.4;
    return interpolateHex(THEME.contourMid, THEME.contourHigh, s);
  } else {
    const s = (t - 0.7) / 0.3;
    return interpolateHex(THEME.contourHigh, THEME.contourVeryHigh, s);
  }
}

/**
 * Returns the trajectory color for a given optimizer.
 */
function trajectoryColor(optimizer: string): string {
  switch (optimizer) {
    case "sgd":
      return THEME.sgdTrajectory;
    case "momentum":
      return THEME.momentumTrajectory;
    case "adam":
      return THEME.adamTrajectory;
    default:
      return THEME.sgdTrajectory;
  }
}

// -- Surface Functions --------------------------------------------------------

/**
 * Computes the loss at (x, y) for the given surface type and parameters.
 *
 *   quadratic:   a * x^2 + b * y^2
 *   rosenbrock:  (a - x)^2 + b * (y - x^2)^2
 */
function computeLoss(
  x: number,
  y: number,
  surfaceType: string,
  surfaceParams: { a?: number; b?: number },
): number {
  const a = surfaceParams.a ?? 1;
  const b = surfaceParams.b ?? 1;
  if (surfaceType === "rosenbrock") {
    return (a - x) ** 2 + b * (y - x * x) ** 2;
  }
  // Default: quadratic
  return a * x * x + b * y * y;
}

// -- Layout Function ----------------------------------------------------------

/**
 * The loss-landscape layout function.
 *
 * Expected step.state fields:
 *   - parameters: number[]          - Current [x, y] position in parameter space.
 *   - loss: number                  - Current loss value.
 *   - gradient: number[]            - Gradient [dx, dy] at current position.
 *   - trajectory: Array<{parameters: number[], loss: number}>
 *                                   - History of positions visited.
 *   - optimizer: string             - "sgd", "momentum", or "adam".
 *   - learningRate: number          - Current learning rate.
 *   - stepNumber: number            - Current optimization step number.
 *   - surfaceType: string           - "quadratic" or "rosenbrock".
 *   - surfaceParams: {a?: number, b?: number}
 *                                   - Surface-specific parameters.
 *   - xRange: [number, number]      - Parameter space x-axis range.
 *   - yRange: [number, number]      - Parameter space y-axis range.
 *   - minimum: number[]             - Known minimum position [x, y].
 */
function lossLandscapeLayout(
  step: Step,
  canvasSize: CanvasSize,
  _config: Record<string, unknown>,
): PrimitiveScene {
  const primitives: RenderPrimitive[] = [];
  const state = step.state as Record<string, unknown>;

  // -- Read state -------------------------------------------------------------

  const parameters = (state.parameters as number[]) ?? [0, 0];
  const loss = (state.loss as number) ?? 0;
  const gradient = (state.gradient as number[]) ?? [0, 0];
  const trajectory = (state.trajectory as Array<{ parameters: number[]; loss: number }>) ?? [];
  const optimizer = (state.optimizer as string) ?? "sgd";
  const learningRate = (state.learningRate as number) ?? 0.01;
  const stepNumber = (state.stepNumber as number) ?? 0;
  const surfaceType = (state.surfaceType as string) ?? "quadratic";
  const surfaceParams = (state.surfaceParams as { a?: number; b?: number }) ?? {};
  const xRange = (state.xRange as [number, number]) ?? [-3, 3];
  const yRange = (state.yRange as [number, number]) ?? [-3, 3];
  const minimum = (state.minimum as number[]) ?? [0, 0];

  // -- Compute geometry -------------------------------------------------------

  const usableWidth = canvasSize.width - 2 * LAYOUT_PADDING;
  const usableHeight = canvasSize.height - 2 * LAYOUT_PADDING;

  const plotWidth = usableWidth;
  const plotHeight = usableHeight * PLOT_HEIGHT_RATIO;

  const plotLeft = LAYOUT_PADDING;
  const plotTop = LAYOUT_PADDING;

  const cellWidth = plotWidth / GRID_RESOLUTION;
  const cellHeight = plotHeight / GRID_RESOLUTION;

  // Info bar lives below the plot area
  const infoBarY = plotTop + plotHeight + 20;

  // -- Coordinate mapping -----------------------------------------------------

  /**
   * Maps parameter-space x to canvas x coordinate.
   */
  const paramToCanvasX = (px: number): number => {
    const t = (px - xRange[0]) / (xRange[1] - xRange[0]);
    return plotLeft + t * plotWidth;
  };

  /**
   * Maps parameter-space y to canvas y coordinate.
   * Note: canvas y increases downward, but parameter space y increases upward,
   * so we invert.
   */
  const paramToCanvasY = (py: number): number => {
    const t = (py - yRange[0]) / (yRange[1] - yRange[0]);
    return plotTop + (1 - t) * plotHeight;
  };

  // -- 1. Contour plot (GRID_RESOLUTION x GRID_RESOLUTION cells) -------------

  // First pass: compute all loss values to find maximum for color scaling.
  const lossGrid: number[][] = [];
  let maxLoss = 0;

  for (let r = 0; r < GRID_RESOLUTION; r++) {
    lossGrid[r] = [];
    for (let c = 0; c < GRID_RESOLUTION; c++) {
      // Map grid cell center to parameter space
      const px = xRange[0] + ((c + 0.5) / GRID_RESOLUTION) * (xRange[1] - xRange[0]);
      const py = yRange[1] - ((r + 0.5) / GRID_RESOLUTION) * (yRange[1] - yRange[0]);

      const cellLoss = computeLoss(px, py, surfaceType, surfaceParams);
      lossGrid[r]![c] = cellLoss;
      if (cellLoss > maxLoss) maxLoss = cellLoss;
    }
  }

  // Second pass: create colored rect primitives.
  for (let r = 0; r < GRID_RESOLUTION; r++) {
    for (let c = 0; c < GRID_RESOLUTION; c++) {
      const cellLoss = lossGrid[r]![c]!;
      const cx = plotLeft + (c + 0.5) * cellWidth;
      const cy = plotTop + (r + 0.5) * cellHeight;

      const cell: ElementPrimitive = {
        kind: "element",
        id: `contour-${r}-${c}`,
        x: cx,
        y: cy,
        // Add 0.5 to avoid sub-pixel gaps between cells
        width: cellWidth + 0.5,
        height: cellHeight + 0.5,
        shape: "rect",
        cornerRadius: CONTOUR_CORNER_RADIUS,
        fillColor: lossToColor(cellLoss, maxLoss),
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
        zIndex: Z_INDEX.OVERLAY_BACKGROUND,
      };
      primitives.push(cell);
    }
  }

  // -- 2. Trajectory segments -------------------------------------------------

  const trajColor = trajectoryColor(optimizer);

  if (trajectory.length > 1) {
    for (let i = 0; i < trajectory.length - 1; i++) {
      const from = trajectory[i]!;
      const to = trajectory[i + 1]!;

      const x1 = paramToCanvasX(from.parameters[0]!);
      const y1 = paramToCanvasY(from.parameters[1]!);
      const x2 = paramToCanvasX(to.parameters[0]!);
      const y2 = paramToCanvasY(to.parameters[1]!);

      const segment: ConnectionPrimitive = {
        kind: "connection",
        id: `traj-segment-${i}`,
        x1,
        y1,
        x2,
        y2,
        curveOffset: 0,
        color: trajColor,
        lineWidth: TRAJECTORY_LINE_WIDTH,
        dashPattern: [],
        arrowHead: "none",
        arrowSize: 0,
        label: "",
        labelFontSize: 0,
        labelColor: "transparent",
        opacity: 1,
        zIndex: Z_INDEX.CONNECTION,
      };
      primitives.push(segment);
    }
  }

  // -- 3. Start position marker (gray circle) ---------------------------------

  if (trajectory.length > 0) {
    const startParams = trajectory[0]!.parameters;
    const startX = paramToCanvasX(startParams[0]!);
    const startY = paramToCanvasY(startParams[1]!);

    const startMarker: ElementPrimitive = {
      kind: "element",
      id: "start-pos",
      x: startX,
      y: startY,
      width: START_MARKER_RADIUS * 2,
      height: START_MARKER_RADIUS * 2,
      shape: "circle",
      cornerRadius: 0,
      fillColor: THEME.startPosition,
      strokeColor: "transparent",
      strokeWidth: 0,
      label: "",
      labelFontSize: 0,
      labelColor: "transparent",
      subLabel: "",
      subLabelFontSize: 0,
      subLabelColor: "transparent",
      rotation: 0,
      opacity: 0.8,
      zIndex: Z_INDEX.ELEMENT + 1,
    };
    primitives.push(startMarker);
  }

  // -- 4. Minimum marker (yellow diamond) -------------------------------------

  const minX = paramToCanvasX(minimum[0]!);
  const minY = paramToCanvasY(minimum[1]!);

  const minimumMarker: ElementPrimitive = {
    kind: "element",
    id: "minimum-marker",
    x: minX,
    y: minY,
    width: MINIMUM_MARKER_SIZE,
    height: MINIMUM_MARKER_SIZE,
    shape: "diamond",
    cornerRadius: 0,
    fillColor: THEME.minimum,
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
    zIndex: Z_INDEX.ELEMENT + 2,
  };
  primitives.push(minimumMarker);

  // -- 5. Current position marker (white circle) ------------------------------

  const curX = paramToCanvasX(parameters[0]!);
  const curY = paramToCanvasY(parameters[1]!);

  const currentMarker: ElementPrimitive = {
    kind: "element",
    id: "current-pos",
    x: curX,
    y: curY,
    width: MARKER_RADIUS * 2,
    height: MARKER_RADIUS * 2,
    shape: "circle",
    cornerRadius: 0,
    fillColor: THEME.currentPosition,
    strokeColor: trajColor,
    strokeWidth: 2,
    label: "",
    labelFontSize: 0,
    labelColor: "transparent",
    subLabel: "",
    subLabelFontSize: 0,
    subLabelColor: "transparent",
    rotation: 0,
    opacity: 1,
    zIndex: Z_INDEX.ELEMENT + 3,
  };
  primitives.push(currentMarker);

  // -- 6. Gradient arrow at current position ----------------------------------

  const gx = gradient[0] ?? 0;
  const gy = gradient[1] ?? 0;
  const gradMag = Math.sqrt(gx * gx + gy * gy);

  if (gradMag > 1e-8) {
    // Normalize gradient and scale to arrow length.
    // The gradient points in the direction of steepest ascent, so
    // we draw it in the negative gradient direction (descent direction).
    const scale = GRADIENT_ARROW_LENGTH / gradMag;
    // In parameter space, descent direction is -gradient.
    // Canvas x maps directly to param x, but canvas y is inverted relative
    // to param y.
    const arrowDx = -gx * scale;
    const arrowDy = gy * scale; // Inverted because canvas y is flipped

    const arrowEndX = curX + arrowDx;
    const arrowEndY = curY + arrowDy;

    const gradientArrow: ConnectionPrimitive = {
      kind: "connection",
      id: "gradient-arrow",
      x1: curX,
      y1: curY,
      x2: arrowEndX,
      y2: arrowEndY,
      curveOffset: 0,
      color: THEME.gradientArrow,
      lineWidth: 2,
      dashPattern: [],
      arrowHead: "end",
      arrowSize: 8,
      label: "",
      labelFontSize: 0,
      labelColor: "transparent",
      opacity: 0.9,
      zIndex: Z_INDEX.ELEMENT + 4,
    };
    primitives.push(gradientArrow);
  }

  // -- 7. Info bar below the plot ---------------------------------------------

  const optimizerDisplay = optimizer.toUpperCase();
  const lossDisplay = loss < 0.001 ? loss.toExponential(2) : loss.toFixed(4);
  const lrDisplay = learningRate < 0.001 ? learningRate.toExponential(2) : learningRate.toFixed(4);

  const infoItems = [
    `Step: ${stepNumber}`,
    `Loss: ${lossDisplay}`,
    `LR: ${lrDisplay}`,
    `Optimizer: ${optimizerDisplay}`,
  ];

  const totalInfoWidth = usableWidth;
  const itemWidth = totalInfoWidth / infoItems.length;

  for (let i = 0; i < infoItems.length; i++) {
    const infoLabel: AnnotationPrimitive = {
      kind: "annotation",
      id: `info-${i}`,
      form: "label",
      x: plotLeft + (i + 0.5) * itemWidth,
      y: infoBarY,
      text: infoItems[i]!,
      fontSize: 13,
      textColor: THEME.infoText,
      color: THEME.infoText,
      pointerHeight: 0,
      pointerWidth: 0,
      bracketWidth: 0,
      bracketTickHeight: 0,
      badgePaddingX: 0,
      badgePaddingY: 0,
      opacity: 1,
      zIndex: Z_INDEX.ANNOTATION,
    };
    primitives.push(infoLabel);
  }

  // -- 8. Axis labels ---------------------------------------------------------

  // X-axis range labels
  const xMinLabel: AnnotationPrimitive = {
    kind: "annotation",
    id: "x-axis-min",
    form: "label",
    x: plotLeft,
    y: plotTop + plotHeight + 10,
    text: xRange[0].toFixed(1),
    fontSize: 10,
    textColor: THEME.labelText,
    color: THEME.labelText,
    pointerHeight: 0,
    pointerWidth: 0,
    bracketWidth: 0,
    bracketTickHeight: 0,
    badgePaddingX: 0,
    badgePaddingY: 0,
    opacity: 0.7,
    zIndex: Z_INDEX.ANNOTATION,
  };
  primitives.push(xMinLabel);

  const xMaxLabel: AnnotationPrimitive = {
    kind: "annotation",
    id: "x-axis-max",
    form: "label",
    x: plotLeft + plotWidth,
    y: plotTop + plotHeight + 10,
    text: xRange[1].toFixed(1),
    fontSize: 10,
    textColor: THEME.labelText,
    color: THEME.labelText,
    pointerHeight: 0,
    pointerWidth: 0,
    bracketWidth: 0,
    bracketTickHeight: 0,
    badgePaddingX: 0,
    badgePaddingY: 0,
    opacity: 0.7,
    zIndex: Z_INDEX.ANNOTATION,
  };
  primitives.push(xMaxLabel);

  // Y-axis range labels
  const yMinLabel: AnnotationPrimitive = {
    kind: "annotation",
    id: "y-axis-min",
    form: "label",
    x: plotLeft - 15,
    y: plotTop + plotHeight,
    text: yRange[0].toFixed(1),
    fontSize: 10,
    textColor: THEME.labelText,
    color: THEME.labelText,
    pointerHeight: 0,
    pointerWidth: 0,
    bracketWidth: 0,
    bracketTickHeight: 0,
    badgePaddingX: 0,
    badgePaddingY: 0,
    opacity: 0.7,
    zIndex: Z_INDEX.ANNOTATION,
  };
  primitives.push(yMinLabel);

  const yMaxLabel: AnnotationPrimitive = {
    kind: "annotation",
    id: "y-axis-max",
    form: "label",
    x: plotLeft - 15,
    y: plotTop,
    text: yRange[1].toFixed(1),
    fontSize: 10,
    textColor: THEME.labelText,
    color: THEME.labelText,
    pointerHeight: 0,
    pointerWidth: 0,
    bracketWidth: 0,
    bracketTickHeight: 0,
    badgePaddingX: 0,
    badgePaddingY: 0,
    opacity: 0.7,
    zIndex: Z_INDEX.ANNOTATION,
  };
  primitives.push(yMaxLabel);

  return { primitives };
}

// -- Registration -------------------------------------------------------------

registerLayout({
  name: "loss-landscape",
  description:
    "2D contour plot of a loss function with optimizer trajectory. " +
    "Supports SGD, Momentum, and Adam optimizer paths.",
  layout: lossLandscapeLayout,
});
