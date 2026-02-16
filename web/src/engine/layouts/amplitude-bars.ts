// =============================================================================
// web/src/engine/layouts/amplitude-bars.ts
//
// Layout for visualizing quantum state vector probabilities as a bar chart.
// Renders one bar per computational basis state, where bar height equals the
// measurement probability |alpha_k|^2. Supports up to 4 qubits (16 bars).
//
// State fields:
//   - amplitudes: number[][]   (array of [real, imag] tuples)
//   - numQubits: number
//   - labels: string[]         (basis state labels like "|00>")
//   - targetStates: number[]   (optional, indices to highlight)
//
// Also reads visual actions:
//   - "showProbabilities": { probabilities, labels }
//   - "showStateVector":   { amplitudes }
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

const MAX_BARS = 16;
const BAR_GAP_RATIO = 0.3; // fraction of bar+gap that is gap
const Y_AXIS_TICKS = 5; // 0.0, 0.25, 0.50, 0.75, 1.0
const CHART_TOP_MARGIN = 40; // space above chart for percentage labels
const CHART_BOTTOM_MARGIN = 50; // space below chart for basis state labels
const Y_AXIS_LABEL_WIDTH = 45; // space for y-axis labels on the left

const THEME = {
  barFill: "#00ffc8",
  barHighlight: "#ff6b6b",
  barStroke: "#00dba8",
  axisColor: "#4a5568",
  axisLabelColor: "#94a3b8",
  tickColor: "#334155",
  percentColor: "#e2e8f0",
  basisLabelColor: "#cbd5e1",
  titleColor: "#e2e8f0",
  gridLineColor: "#1e293b",
} as const;

// -- Layout Function ----------------------------------------------------------

/**
 * The amplitude-bars layout function.
 *
 * Renders a probability bar chart from quantum state amplitudes.
 * Each bar's height represents the measurement probability |alpha_k|^2
 * for the k-th computational basis state.
 */
function amplitudeBarsLayout(
  step: Step,
  canvasSize: CanvasSize,
  _config: Record<string, unknown>,
): PrimitiveScene {
  const primitives: RenderPrimitive[] = [];
  const state = step.state as Record<string, unknown>;

  // -- Read state -------------------------------------------------------------

  const rawAmplitudes = (state.amplitudes as number[][]) ?? [];
  const numQubits = (state.numQubits as number) ?? 1;
  const rawLabels = (state.labels as string[]) ?? [];
  const targetStates = (state.targetStates as number[]) ?? [];

  // -- Read visual actions for supplementary data -----------------------------

  let probsFromAction: number[] | null = null;
  let labelsFromAction: string[] | null = null;
  let amplitudesFromAction: number[][] | null = null;

  for (const action of step.visualActions) {
    if (action.type === "showProbabilities") {
      const a = action as Record<string, unknown>;
      probsFromAction = (a.probabilities as number[]) ?? null;
      labelsFromAction = (a.labels as string[]) ?? null;
    }
    if (action.type === "showStateVector") {
      const a = action as Record<string, unknown>;
      amplitudesFromAction = (a.amplitudes as number[][]) ?? null;
    }
  }

  // -- Compute probabilities --------------------------------------------------

  // Prefer state amplitudes, then action amplitudes
  const amplitudes: number[][] =
    rawAmplitudes.length > 0 ? rawAmplitudes : (amplitudesFromAction ?? []);

  const numStates = Math.min(amplitudes.length, MAX_BARS);

  // Compute probabilities from amplitudes: |alpha_k|^2 = real^2 + imag^2
  let probabilities: number[];
  if (probsFromAction && probsFromAction.length > 0) {
    probabilities = probsFromAction.slice(0, MAX_BARS);
  } else {
    probabilities = [];
    for (let i = 0; i < numStates; i++) {
      const amp = amplitudes[i];
      if (amp && amp.length >= 2) {
        probabilities.push(amp[0]! * amp[0]! + amp[1]! * amp[1]!);
      } else {
        probabilities.push(0);
      }
    }
  }

  // Default labels if not provided
  const labels: string[] = [];
  const sourceLabels = rawLabels.length > 0 ? rawLabels : (labelsFromAction ?? []);
  for (let i = 0; i < probabilities.length; i++) {
    if (i < sourceLabels.length) {
      labels.push(sourceLabels[i]!);
    } else {
      // Generate binary label for this basis state
      labels.push(`|${i.toString(2).padStart(numQubits, "0")}\u27E9`);
    }
  }

  if (probabilities.length === 0) {
    return { primitives };
  }

  // -- Compute geometry -------------------------------------------------------

  const usableWidth = canvasSize.width - 2 * LAYOUT_PADDING;
  const usableHeight = canvasSize.height - 2 * LAYOUT_PADDING;

  const chartLeft = LAYOUT_PADDING + Y_AXIS_LABEL_WIDTH;
  const chartTop = LAYOUT_PADDING + CHART_TOP_MARGIN;
  const chartWidth = usableWidth - Y_AXIS_LABEL_WIDTH;
  const chartHeight = usableHeight - CHART_TOP_MARGIN - CHART_BOTTOM_MARGIN;

  const chartBottom = chartTop + chartHeight;

  const barCount = probabilities.length;
  const totalBarAreaWidth = chartWidth;
  const barSlotWidth = totalBarAreaWidth / barCount;
  const barWidth = barSlotWidth * (1 - BAR_GAP_RATIO);

  // -- 1. Y-axis line ---------------------------------------------------------

  const yAxis: ConnectionPrimitive = {
    kind: "connection",
    id: "y-axis",
    x1: chartLeft,
    y1: chartTop,
    x2: chartLeft,
    y2: chartBottom,
    curveOffset: 0,
    color: THEME.axisColor,
    lineWidth: 1.5,
    dashPattern: [],
    arrowHead: "none",
    arrowSize: 0,
    label: "",
    labelFontSize: 0,
    labelColor: "transparent",
    opacity: 1,
    zIndex: Z_INDEX.CONNECTION,
  };
  primitives.push(yAxis);

  // -- 2. X-axis line (baseline) ----------------------------------------------

  const xAxis: ConnectionPrimitive = {
    kind: "connection",
    id: "x-axis",
    x1: chartLeft,
    y1: chartBottom,
    x2: chartLeft + chartWidth,
    y2: chartBottom,
    curveOffset: 0,
    color: THEME.axisColor,
    lineWidth: 1.5,
    dashPattern: [],
    arrowHead: "none",
    arrowSize: 0,
    label: "",
    labelFontSize: 0,
    labelColor: "transparent",
    opacity: 1,
    zIndex: Z_INDEX.CONNECTION,
  };
  primitives.push(xAxis);

  // -- 3. Y-axis tick marks and labels (0.0, 0.25, 0.50, 0.75, 1.0) ----------

  for (let t = 0; t < Y_AXIS_TICKS; t++) {
    const fraction = t / (Y_AXIS_TICKS - 1);
    const tickY = chartBottom - fraction * chartHeight;

    // Horizontal grid line
    const gridLine: ConnectionPrimitive = {
      kind: "connection",
      id: `y-grid-${t}`,
      x1: chartLeft,
      y1: tickY,
      x2: chartLeft + chartWidth,
      y2: tickY,
      curveOffset: 0,
      color: THEME.gridLineColor,
      lineWidth: 0.5,
      dashPattern: [4, 4],
      arrowHead: "none",
      arrowSize: 0,
      label: "",
      labelFontSize: 0,
      labelColor: "transparent",
      opacity: t === 0 ? 0 : 0.6, // hide baseline grid (overlaps x-axis)
      zIndex: Z_INDEX.OVERLAY_BACKGROUND + 1,
    };
    primitives.push(gridLine);

    // Y-axis label
    const tickLabel: AnnotationPrimitive = {
      kind: "annotation",
      id: `y-label-${t}`,
      form: "label",
      x: chartLeft - 10,
      y: tickY,
      text: fraction.toFixed(2),
      fontSize: 11,
      textColor: THEME.axisLabelColor,
      color: THEME.axisLabelColor,
      pointerHeight: 0,
      pointerWidth: 0,
      bracketWidth: 0,
      bracketTickHeight: 0,
      badgePaddingX: 0,
      badgePaddingY: 0,
      opacity: 0.8,
      zIndex: Z_INDEX.ANNOTATION,
    };
    primitives.push(tickLabel);
  }

  // -- 4. Probability bars ----------------------------------------------------

  for (let i = 0; i < barCount; i++) {
    const prob = probabilities[i]!;
    const barHeight = Math.max(prob * chartHeight, 1); // minimum 1px for visibility
    const barCenterX = chartLeft + (i + 0.5) * barSlotWidth;
    const barCenterY = chartBottom - barHeight / 2;

    const isTarget = targetStates.includes(i);

    const bar: ElementPrimitive = {
      kind: "element",
      id: `prob-bar-${i}`,
      x: barCenterX,
      y: barCenterY,
      width: barWidth,
      height: barHeight,
      shape: "rect",
      cornerRadius: 0,
      fillColor: isTarget ? THEME.barHighlight : THEME.barFill,
      strokeColor: isTarget ? THEME.barHighlight : THEME.barStroke,
      strokeWidth: 1,
      label: "",
      labelFontSize: 0,
      labelColor: "transparent",
      subLabel: "",
      subLabelFontSize: 0,
      subLabelColor: "transparent",
      rotation: 0,
      opacity: prob < 0.001 ? 0.3 : 1,
      zIndex: Z_INDEX.ELEMENT,
    };
    primitives.push(bar);

    // -- 5. Percentage label above each bar -----------------------------------

    const percentText =
      prob >= 0.01
        ? `${(prob * 100).toFixed(1)}%`
        : prob > 0
          ? `${(prob * 100).toFixed(2)}%`
          : "0%";

    const percentLabel: AnnotationPrimitive = {
      kind: "annotation",
      id: `prob-pct-${i}`,
      form: "label",
      x: barCenterX,
      y: chartBottom - barHeight - 12,
      text: percentText,
      fontSize: barCount > 8 ? 9 : 11,
      textColor: THEME.percentColor,
      color: THEME.percentColor,
      pointerHeight: 0,
      pointerWidth: 0,
      bracketWidth: 0,
      bracketTickHeight: 0,
      badgePaddingX: 0,
      badgePaddingY: 0,
      opacity: prob < 0.001 ? 0.4 : 1,
      zIndex: Z_INDEX.ANNOTATION,
    };
    primitives.push(percentLabel);

    // -- 6. Basis state label below each bar ----------------------------------

    const basisLabel: AnnotationPrimitive = {
      kind: "annotation",
      id: `prob-label-${i}`,
      form: "label",
      x: barCenterX,
      y: chartBottom + 18,
      text: labels[i]!,
      fontSize: barCount > 8 ? 10 : 12,
      textColor: isTarget ? THEME.barHighlight : THEME.basisLabelColor,
      color: isTarget ? THEME.barHighlight : THEME.basisLabelColor,
      pointerHeight: 0,
      pointerWidth: 0,
      bracketWidth: 0,
      bracketTickHeight: 0,
      badgePaddingX: 0,
      badgePaddingY: 0,
      opacity: 1,
      zIndex: Z_INDEX.ANNOTATION,
    };
    primitives.push(basisLabel);
  }

  // -- 7. Y-axis title --------------------------------------------------------

  const yAxisTitle: AnnotationPrimitive = {
    kind: "annotation",
    id: "y-axis-title",
    form: "label",
    x: LAYOUT_PADDING + 5,
    y: chartTop + chartHeight / 2,
    text: "Probability",
    fontSize: 12,
    textColor: THEME.titleColor,
    color: THEME.titleColor,
    pointerHeight: 0,
    pointerWidth: 0,
    bracketWidth: 0,
    bracketTickHeight: 0,
    badgePaddingX: 0,
    badgePaddingY: 0,
    opacity: 0.7,
    zIndex: Z_INDEX.ANNOTATION,
  };
  primitives.push(yAxisTitle);

  // -- 8. Chart title ---------------------------------------------------------

  const numQubitsDisplay = numQubits || Math.ceil(Math.log2(Math.max(barCount, 2)));
  const chartTitle: AnnotationPrimitive = {
    kind: "annotation",
    id: "chart-title",
    form: "label",
    x: chartLeft + chartWidth / 2,
    y: LAYOUT_PADDING + 10,
    text: `Measurement Probabilities (${numQubitsDisplay} qubit${numQubitsDisplay !== 1 ? "s" : ""})`,
    fontSize: 14,
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
  primitives.push(chartTitle);

  return { primitives };
}

// -- Registration -------------------------------------------------------------

registerLayout({
  name: "amplitude-bars",
  description:
    "Bar chart of quantum state vector measurement probabilities. " +
    "One bar per computational basis state, height = |alpha_k|^2.",
  layout: amplitudeBarsLayout,
});
