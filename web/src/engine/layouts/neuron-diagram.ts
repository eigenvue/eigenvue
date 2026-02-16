// =============================================================================
// web/src/engine/layouts/neuron-diagram.ts
//
// Neuron Diagram Layout
//
// Renders a single neuron with inputs, weights, summation, activation function,
// and output. Includes optional activation function curve inset and decision
// boundary visualization.
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

// ── Constants ──────────────────────────────────────────────────────────────────

/** Fraction of canvas width allocated to the main neuron diagram (top section). */
const DIAGRAM_HEIGHT_RATIO = 0.6;

/** Horizontal layout zones (as fractions of usable width). */
const ZONE_INPUTS = 0.15;
const ZONE_SUMMATION = 0.5;
const ZONE_ACTIVATION = 0.7;
const ZONE_OUTPUT = 0.88;

const INPUT_CIRCLE_RADIUS = 22;
const SUMMATION_CIRCLE_RADIUS = 28;
const OUTPUT_CIRCLE_RADIUS = 22;
const ACTIVATION_BOX_WIDTH = 70;
const ACTIVATION_BOX_HEIGHT = 40;
const FONT_SIZE_VALUE = 12;
const FONT_SIZE_LABEL = 11;
const FONT_SIZE_WEIGHT = 10;

const THEME = {
  inputNode: "#1e40af",
  inputNodeStroke: "#3b82f6",
  inputNodeActive: "#60a5fa",
  summationNode: "#7c3aed",
  summationStroke: "#a78bfa",
  activationBox: "#6d28d9",
  activationStroke: "#c084fc",
  outputNode: "#9333ea",
  outputStroke: "#c084fc",
  outputActive: "#e879f9",
  connection: "#6b7280",
  connectionActive: "#a78bfa",
  weightPositive: "#22c55e",
  weightNegative: "#ef4444",
  biasColor: "#f59e0b",
  labelText: "#e2e8f0",
  valueText: "#f5f3ff",
  dimmedText: "#6b7394",
  gradientPositive: "#fb923c",
  gradientNegative: "#38bdf8",
} as const;

function weightColor(w: number): string {
  return w >= 0 ? THEME.weightPositive : THEME.weightNegative;
}

function weightLineWidth(w: number): number {
  const absW = Math.abs(w);
  return Math.min(4, Math.max(1, 1 + absW * 1.5));
}

function neuronDiagramLayout(
  step: Step,
  canvasSize: CanvasSize,
  _config: Record<string, unknown>,
): PrimitiveScene {
  const primitives: RenderPrimitive[] = [];
  const state = step.state as Record<string, unknown>;

  const inputs = (state.inputs as number[]) ?? [];
  const weights = (state.weights as number[]) ?? [];
  const bias = (state.bias as number) ?? 0;
  const z = state.z as number | undefined;
  const activation = state.activation as number | undefined;
  const activationFn = (state.activationFunction as string) ?? "sigmoid";
  const output = state.output as number | undefined;

  const numInputs = inputs.length;
  const usableWidth = canvasSize.width - 2 * LAYOUT_PADDING;
  const diagramHeight = (canvasSize.height - 2 * LAYOUT_PADDING) * DIAGRAM_HEIGHT_RATIO;

  const xAt = (zone: number): number => LAYOUT_PADDING + usableWidth * zone;
  const inputY = (i: number): number => {
    if (numInputs <= 1) return LAYOUT_PADDING + diagramHeight / 2;
    const topMargin = INPUT_CIRCLE_RADIUS + 10;
    const usable = diagramHeight - 2 * topMargin;
    return LAYOUT_PADDING + topMargin + (i / (numInputs - 1)) * usable;
  };
  const centerY = LAYOUT_PADDING + diagramHeight / 2;

  let activeNeuronLayer = -1;
  let activeNeuronIndex = -1;
  let showingPreActivation = false;
  let showingActivationFn = false;

  for (const action of step.visualActions) {
    switch (action.type) {
      case "activateNeuron": {
        const a = action as Record<string, unknown>;
        activeNeuronLayer = a.layer as number;
        activeNeuronIndex = a.index as number;
        break;
      }
      case "showPreActivation":
        showingPreActivation = true;
        break;
      case "showActivationFunction":
        showingActivationFn = true;
        break;
      default:
        break;
    }
  }

  // Input nodes
  for (let i = 0; i < numInputs; i++) {
    const isActive = activeNeuronLayer === 0 && activeNeuronIndex === i;
    const ix = xAt(ZONE_INPUTS);
    const iy = inputY(i);

    const inputNode: ElementPrimitive = {
      kind: "element",
      id: `input-node-${i}`,
      x: ix,
      y: iy,
      width: INPUT_CIRCLE_RADIUS * 2,
      height: INPUT_CIRCLE_RADIUS * 2,
      shape: "circle",
      cornerRadius: 0,
      fillColor: isActive ? THEME.inputNodeActive : THEME.inputNode,
      strokeColor: THEME.inputNodeStroke,
      strokeWidth: isActive ? 2.5 : 1.5,
      label: `x${i}`,
      labelFontSize: FONT_SIZE_LABEL,
      labelColor: THEME.labelText,
      subLabel: inputs[i] !== undefined ? inputs[i]!.toFixed(2) : "",
      subLabelFontSize: FONT_SIZE_VALUE,
      subLabelColor: THEME.valueText,
      rotation: 0,
      opacity: 1,
      zIndex: Z_INDEX.ELEMENT,
    };
    primitives.push(inputNode);
  }

  // Connections: inputs → summation
  const sumX = xAt(ZONE_SUMMATION);
  for (let i = 0; i < numInputs; i++) {
    const w = weights[i] ?? 0;
    const conn: ConnectionPrimitive = {
      kind: "connection",
      id: `weight-conn-${i}`,
      x1: xAt(ZONE_INPUTS) + INPUT_CIRCLE_RADIUS,
      y1: inputY(i),
      x2: sumX - SUMMATION_CIRCLE_RADIUS,
      y2: centerY,
      curveOffset: 0,
      color: weightColor(w),
      lineWidth: weightLineWidth(w),
      dashPattern: [],
      arrowHead: "end",
      arrowSize: 6,
      label: `w${i}=${w.toFixed(2)}`,
      labelFontSize: FONT_SIZE_WEIGHT,
      labelColor: weightColor(w),
      opacity: 0.85,
      zIndex: Z_INDEX.CONNECTION,
    };
    primitives.push(conn);
  }

  // Bias annotation
  const biasAnnotation: AnnotationPrimitive = {
    kind: "annotation",
    id: "bias-label",
    form: "label",
    x: sumX,
    y: centerY + SUMMATION_CIRCLE_RADIUS + 20,
    text: `b = ${bias.toFixed(2)}`,
    fontSize: FONT_SIZE_LABEL,
    textColor: THEME.biasColor,
    color: THEME.biasColor,
    pointerHeight: 12,
    pointerWidth: 8,
    bracketWidth: 0,
    bracketTickHeight: 0,
    badgePaddingX: 0,
    badgePaddingY: 0,
    opacity: 1,
    zIndex: Z_INDEX.ANNOTATION,
  };
  primitives.push(biasAnnotation);

  // Summation node
  const sumNode: ElementPrimitive = {
    kind: "element",
    id: "summation-node",
    x: sumX,
    y: centerY,
    width: SUMMATION_CIRCLE_RADIUS * 2,
    height: SUMMATION_CIRCLE_RADIUS * 2,
    shape: "circle",
    cornerRadius: 0,
    fillColor: THEME.summationNode,
    strokeColor: showingPreActivation ? THEME.activationStroke : THEME.summationStroke,
    strokeWidth: showingPreActivation ? 2.5 : 1.5,
    label: "Σ + b",
    labelFontSize: FONT_SIZE_LABEL,
    labelColor: THEME.valueText,
    subLabel: z !== undefined ? z.toFixed(3) : "",
    subLabelFontSize: FONT_SIZE_VALUE,
    subLabelColor: THEME.valueText,
    rotation: 0,
    opacity: 1,
    zIndex: Z_INDEX.ELEMENT,
  };
  primitives.push(sumNode);

  // Connection: summation → activation
  const actX = xAt(ZONE_ACTIVATION);
  const sumToAct: ConnectionPrimitive = {
    kind: "connection",
    id: "sum-to-activation",
    x1: sumX + SUMMATION_CIRCLE_RADIUS,
    y1: centerY,
    x2: actX - ACTIVATION_BOX_WIDTH / 2,
    y2: centerY,
    curveOffset: 0,
    color: THEME.connectionActive,
    lineWidth: 2,
    dashPattern: [],
    arrowHead: "end",
    arrowSize: 6,
    label: z !== undefined ? `z = ${z.toFixed(3)}` : "",
    labelFontSize: FONT_SIZE_WEIGHT,
    labelColor: THEME.dimmedText,
    opacity: 0.8,
    zIndex: Z_INDEX.CONNECTION,
  };
  primitives.push(sumToAct);

  // Activation function box
  const fnLabel =
    activationFn === "sigmoid"
      ? "σ(z)"
      : activationFn === "relu"
        ? "ReLU(z)"
        : activationFn === "tanh"
          ? "tanh(z)"
          : activationFn === "step"
            ? "step(z)"
            : "f(z)";

  const actBox: ElementPrimitive = {
    kind: "element",
    id: "activation-box",
    x: actX,
    y: centerY,
    width: ACTIVATION_BOX_WIDTH,
    height: ACTIVATION_BOX_HEIGHT,
    shape: "roundedRect",
    cornerRadius: 8,
    fillColor: THEME.activationBox,
    strokeColor: showingActivationFn ? "#f472b6" : THEME.activationStroke,
    strokeWidth: showingActivationFn ? 2.5 : 1.5,
    label: fnLabel,
    labelFontSize: FONT_SIZE_LABEL,
    labelColor: THEME.valueText,
    subLabel: activation !== undefined ? `= ${activation.toFixed(4)}` : "",
    subLabelFontSize: FONT_SIZE_VALUE - 1,
    subLabelColor: THEME.valueText,
    rotation: 0,
    opacity: 1,
    zIndex: Z_INDEX.ELEMENT,
  };
  primitives.push(actBox);

  // Connection: activation → output
  const outX = xAt(ZONE_OUTPUT);
  const actToOut: ConnectionPrimitive = {
    kind: "connection",
    id: "activation-to-output",
    x1: actX + ACTIVATION_BOX_WIDTH / 2,
    y1: centerY,
    x2: outX - OUTPUT_CIRCLE_RADIUS,
    y2: centerY,
    curveOffset: 0,
    color: THEME.connectionActive,
    lineWidth: 2,
    dashPattern: [],
    arrowHead: "end",
    arrowSize: 6,
    label: "",
    labelFontSize: 0,
    labelColor: "transparent",
    opacity: 0.8,
    zIndex: Z_INDEX.CONNECTION,
  };
  primitives.push(actToOut);

  // Output node
  const isOutputActive = activeNeuronLayer === 1 && activeNeuronIndex === 0;
  const outputNode: ElementPrimitive = {
    kind: "element",
    id: "output-node",
    x: outX,
    y: centerY,
    width: OUTPUT_CIRCLE_RADIUS * 2,
    height: OUTPUT_CIRCLE_RADIUS * 2,
    shape: "circle",
    cornerRadius: 0,
    fillColor: isOutputActive ? THEME.outputActive : THEME.outputNode,
    strokeColor: THEME.outputStroke,
    strokeWidth: isOutputActive ? 2.5 : 1.5,
    label: "ŷ",
    labelFontSize: FONT_SIZE_LABEL,
    labelColor: THEME.labelText,
    subLabel: output !== undefined ? output.toFixed(4) : "",
    subLabelFontSize: FONT_SIZE_VALUE,
    subLabelColor: THEME.valueText,
    rotation: 0,
    opacity: 1,
    zIndex: Z_INDEX.ELEMENT,
  };
  primitives.push(outputNode);

  // Phase labels
  const phaseLabelY = LAYOUT_PADDING + diagramHeight + 15;
  const phases = [
    { x: xAt(ZONE_INPUTS), text: "Inputs" },
    { x: xAt((ZONE_INPUTS + ZONE_SUMMATION) / 2), text: "Weighted" },
    { x: xAt(ZONE_SUMMATION), text: "Sum + Bias" },
    { x: xAt(ZONE_ACTIVATION), text: "Activation" },
    { x: xAt(ZONE_OUTPUT), text: "Output" },
  ];
  for (const { x, text } of phases) {
    const lbl: AnnotationPrimitive = {
      kind: "annotation",
      id: `phase-label-${text.toLowerCase().replace(/\s/g, "-")}`,
      form: "label",
      x,
      y: phaseLabelY,
      text,
      fontSize: 10,
      textColor: THEME.dimmedText,
      color: THEME.dimmedText,
      pointerHeight: 0,
      pointerWidth: 0,
      bracketWidth: 0,
      bracketTickHeight: 0,
      badgePaddingX: 0,
      badgePaddingY: 0,
      opacity: 0.7,
      zIndex: Z_INDEX.ANNOTATION,
    };
    primitives.push(lbl);
  }

  // Message from showMessage actions
  for (const action of step.visualActions) {
    if (action.type === "showMessage") {
      const a = action as Record<string, unknown>;
      const msg: AnnotationPrimitive = {
        kind: "annotation",
        id: "message",
        form: "label",
        x: canvasSize.width / 2,
        y: canvasSize.height - LAYOUT_PADDING - 10,
        text: (a.text as string) ?? "",
        fontSize: 13,
        textColor: THEME.labelText,
        color: THEME.labelText,
        pointerHeight: 0,
        pointerWidth: 0,
        bracketWidth: 0,
        bracketTickHeight: 0,
        badgePaddingX: 0,
        badgePaddingY: 0,
        opacity: 1,
        zIndex: Z_INDEX.ANNOTATION,
      };
      primitives.push(msg);
    }
  }

  return { primitives };
}

registerLayout({
  name: "neuron-diagram",
  description:
    "Single neuron with inputs, weights, bias, summation, activation function, " +
    "and output. Optionally shows activation curve and decision boundary.",
  layout: neuronDiagramLayout,
});
