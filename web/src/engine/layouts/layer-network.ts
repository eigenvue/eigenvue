// =============================================================================
// web/src/engine/layouts/layer-network.ts
//
// Layer Network Layout
//
// Renders a multi-layer neural network as a column-based node-link diagram.
// Supports variable layer sizes, fully connected topology, weight visualization,
// gradient overlays for backpropagation, and signal propagation highlighting.
//
// This layout is used by:
//   - Feedforward Neural Network (forward pass only)
//   - Backpropagation (forward + backward gradient flow)
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

// ── Constants ────────────────────────────────────────────────────────────────────────────────

const NODE_RADIUS = 18;
const NODE_FONT_SIZE = 11;
const LABEL_FONT_SIZE = 10;
const LAYER_LABEL_FONT_SIZE = 11;
const WEIGHT_LINE_MIN = 0.5;
const WEIGHT_LINE_MAX = 3.5;
const GRADIENT_LINE_MIN = 1;
const GRADIENT_LINE_MAX = 5;
const THEME = {
  inputNode: "#1e40af",
  inputStroke: "#3b82f6",
  hiddenNode: "#6d28d9",
  hiddenStroke: "#a78bfa",
  outputNode: "#9333ea",
  outputStroke: "#c084fc",
  activeNode: "#7c3aed",
  activeStroke: "#f472b6",
  weightPositive: "#22c55e",
  weightNegative: "#ef4444",
  weightZero: "#4b5563",
  gradientHigh: "#fb923c",
  gradientLow: "#fdba74",
  gradientArrow: "#f97316",
  signalColor: "#38bdf8",
  valueText: "#f5f3ff",
  labelText: "#94a3b8",
  layerLabel: "#cbd5e1",
} as const;

function nodeColor(layerIdx: number, totalLayers: number, isActive: boolean): string {
  if (isActive) return THEME.activeNode;
  if (layerIdx === 0) return THEME.inputNode;
  if (layerIdx === totalLayers - 1) return THEME.outputNode;
  return THEME.hiddenNode;
}

function nodeStroke(layerIdx: number, totalLayers: number, isActive: boolean): string {
  if (isActive) return THEME.activeStroke;
  if (layerIdx === 0) return THEME.inputStroke;
  if (layerIdx === totalLayers - 1) return THEME.outputStroke;
  return THEME.hiddenStroke;
}

function weightToColor(w: number): string {
  if (Math.abs(w) < 0.01) return THEME.weightZero;
  return w > 0 ? THEME.weightPositive : THEME.weightNegative;
}

function weightToWidth(w: number): number {
  const absW = Math.min(Math.abs(w), 3);
  return WEIGHT_LINE_MIN + (absW / 3) * (WEIGHT_LINE_MAX - WEIGHT_LINE_MIN);
}

function gradientToWidth(g: number): number {
  const absG = Math.min(Math.abs(g), 2);
  return GRADIENT_LINE_MIN + (absG / 2) * (GRADIENT_LINE_MAX - GRADIENT_LINE_MIN);
}

function layerNetworkLayout(
  step: Step,
  canvasSize: CanvasSize,
  _config: Record<string, unknown>,
): PrimitiveScene {
  const primitives: RenderPrimitive[] = [];
  const state = step.state as Record<string, unknown>;

  const layerSizes = (state.layerSizes as number[]) ?? [2, 3, 1];
  const totalLayers = layerSizes.length;
  const activations = state.activations as number[][] | undefined;
  const allWeights = state.weights as number[][][] | undefined;
  const gradients = state.gradients as number[][] | undefined;
  const weightGradients = state.weightGradients as number[][][] | undefined;

  const usableWidth = canvasSize.width - 2 * LAYOUT_PADDING;
  const usableHeight = canvasSize.height - 2 * LAYOUT_PADDING - 40;

  const layerX = (l: number): number =>
    LAYOUT_PADDING + (totalLayers <= 1 ? usableWidth / 2 : l * (usableWidth / (totalLayers - 1)));

  const neuronY = (l: number, j: number): number => {
    const n = layerSizes[l]!;
    if (n <= 1) return LAYOUT_PADDING + usableHeight / 2;
    const topMargin = NODE_RADIUS + 10;
    const span = usableHeight - 2 * topMargin;
    return LAYOUT_PADDING + topMargin + (j / (n - 1)) * span;
  };

  let propagatingFrom = -1;
  let propagatingTo = -1;
  let gradientLayer = -1;
  const activeNeurons = new Set<string>();

  for (const action of step.visualActions) {
    switch (action.type) {
      case "activateNeuron": {
        const a = action as Record<string, unknown>;
        activeNeurons.add(`${a.layer}-${a.index}`);
        break;
      }
      case "propagateSignal": {
        const a = action as Record<string, unknown>;
        propagatingFrom = a.fromLayer as number;
        propagatingTo = a.toLayer as number;
        break;
      }
      case "showGradient": {
        const a = action as Record<string, unknown>;
        gradientLayer = a.layer as number;
        break;
      }
      default:
        break;
    }
  }

  // Draw connections
  for (let l = 1; l < totalLayers; l++) {
    const fromSize = layerSizes[l - 1]!;
    const toSize = layerSizes[l]!;
    for (let j = 0; j < toSize; j++) {
      for (let i = 0; i < fromSize; i++) {
        const w = allWeights?.[l]?.[j]?.[i] ?? 0;
        const wg = weightGradients?.[l]?.[j]?.[i];
        const isForwardActive = propagatingFrom === l - 1 && propagatingTo === l;
        const isGradientActive = gradientLayer === l;
        const conn: ConnectionPrimitive = {
          kind: "connection",
          id: `conn-${l}-${j}-${i}`,
          x1: layerX(l - 1) + NODE_RADIUS,
          y1: neuronY(l - 1, i),
          x2: layerX(l) - NODE_RADIUS,
          y2: neuronY(l, j),
          curveOffset: 0,
          color: isForwardActive
            ? THEME.signalColor
            : isGradientActive
              ? THEME.gradientHigh
              : weightToColor(w),
          lineWidth:
            isGradientActive && wg !== undefined
              ? gradientToWidth(wg)
              : isForwardActive
                ? 2.5
                : weightToWidth(w),
          dashPattern: isGradientActive ? [4, 3] : [],
          arrowHead: isForwardActive ? "end" : isGradientActive ? "start" : "none",
          arrowSize: 5,
          label: "",
          labelFontSize: 0,
          labelColor: "transparent",
          opacity: isForwardActive || isGradientActive ? 0.9 : 0.4,
          zIndex: Z_INDEX.CONNECTION,
        };
        primitives.push(conn);
      }
    }
  }

  // Draw neurons
  for (let l = 0; l < totalLayers; l++) {
    const n = layerSizes[l]!;
    for (let j = 0; j < n; j++) {
      const isActive = activeNeurons.has(`${l}-${j}`);
      const aVal = activations?.[l]?.[j];
      const gVal = gradients?.[l]?.[j];

      let subLabel = "";
      if (gVal !== undefined && gradientLayer >= 0) {
        subLabel = `δ=${gVal.toFixed(3)}`;
      } else if (aVal !== undefined) {
        subLabel = aVal.toFixed(3);
      }

      let mainLabel: string;
      if (l === 0) {
        mainLabel = `x${j}`;
      } else if (l === totalLayers - 1) {
        mainLabel = `ŷ${n > 1 ? j : ""}`;
      } else {
        mainLabel = `h${l}${n > 1 ? `,${j}` : ""}`;
      }

      const node: ElementPrimitive = {
        kind: "element",
        id: `neuron-${l}-${j}`,
        x: layerX(l),
        y: neuronY(l, j),
        width: NODE_RADIUS * 2,
        height: NODE_RADIUS * 2,
        shape: "circle",
        cornerRadius: 0,
        fillColor: nodeColor(l, totalLayers, isActive),
        strokeColor: nodeStroke(l, totalLayers, isActive),
        strokeWidth: isActive ? 2.5 : 1.5,
        label: mainLabel,
        labelFontSize: NODE_FONT_SIZE,
        labelColor: THEME.valueText,
        subLabel,
        subLabelFontSize: LABEL_FONT_SIZE,
        subLabelColor: THEME.valueText,
        rotation: 0,
        opacity: 1,
        zIndex: Z_INDEX.ELEMENT,
      };
      primitives.push(node);
    }
  }

  // Layer labels
  const layerLabelsY = canvasSize.height - LAYOUT_PADDING - 10;
  for (let l = 0; l < totalLayers; l++) {
    const labelText = l === 0 ? "Input" : l === totalLayers - 1 ? "Output" : `Hidden ${l}`;
    const lbl: AnnotationPrimitive = {
      kind: "annotation",
      id: `layer-label-${l}`,
      form: "label",
      x: layerX(l),
      y: layerLabelsY,
      text: labelText,
      fontSize: LAYER_LABEL_FONT_SIZE,
      textColor: THEME.layerLabel,
      color: THEME.layerLabel,
      pointerHeight: 0,
      pointerWidth: 0,
      bracketWidth: 0,
      bracketTickHeight: 0,
      badgePaddingX: 0,
      badgePaddingY: 0,
      opacity: 0.8,
      zIndex: Z_INDEX.ANNOTATION,
    };
    primitives.push(lbl);
  }

  // Loss badge
  const loss = state.loss as number | undefined;
  if (loss !== undefined) {
    const lossBadge: AnnotationPrimitive = {
      kind: "annotation",
      id: "loss-badge",
      form: "badge",
      x: canvasSize.width - LAYOUT_PADDING - 60,
      y: LAYOUT_PADDING + 15,
      text: `Loss: ${loss.toFixed(4)}`,
      fontSize: 11,
      textColor: "#fef2f2",
      color: "#dc2626",
      pointerHeight: 0,
      pointerWidth: 0,
      bracketWidth: 0,
      bracketTickHeight: 0,
      badgePaddingX: 10,
      badgePaddingY: 4,
      opacity: 1,
      zIndex: Z_INDEX.ANNOTATION + 10,
    };
    primitives.push(lossBadge);
  }

  return { primitives };
}

registerLayout({
  name: "layer-network",
  description:
    "Multi-layer fully connected neural network. Neurons as circles in columns, " +
    "connections with weight magnitude encoding. Supports forward propagation " +
    "highlighting and backward gradient flow overlay.",
  layout: layerNetworkLayout,
});
