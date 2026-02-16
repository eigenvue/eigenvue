// =============================================================================
// web/src/engine/layouts/layer-diagram.ts
//
// Layout for the transformer block visualization. Renders a vertical flow
// of sublayer blocks (self-attention → add & norm → FFN → add & norm)
// with residual skip connections.
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

// ── Constants ────────────────────────────────────────────────────────────────

/** Ratio of usable width used for block width. */
const BLOCK_WIDTH_RATIO = 0.45;

/** Fixed height for each sublayer block. */
const BLOCK_HEIGHT = 50;

/** Vertical gap between sublayer blocks. */
const BLOCK_GAP = 20;

/** Corner radius for sublayer blocks. */
const BLOCK_CORNER_RADIUS = 10;

/** Font size for sublayer labels. */
const BLOCK_FONT_SIZE = 13;

/** Arrowhead size for flow arrows. */
const ARROW_SIZE = 8;

/** Horizontal offset for residual skip connections. */
const RESIDUAL_OFFSET = 80;

/** Sublayer definition for the transformer block. */
interface SublayerDef {
  readonly id: string;
  readonly label: string;
  readonly type: "input" | "sublayer" | "operation" | "output";
}

/** The fixed set of sublayers in a transformer encoder block. */
const TRANSFORMER_SUBLAYERS: readonly SublayerDef[] = [
  { id: "input", label: "Input Embeddings", type: "input" },
  { id: "self-attention", label: "Multi-Head Self-Attention", type: "sublayer" },
  { id: "add-norm-1", label: "Add & Layer Norm", type: "operation" },
  { id: "ffn", label: "Feed-Forward Network", type: "sublayer" },
  { id: "add-norm-2", label: "Add & Layer Norm", type: "operation" },
  { id: "output", label: "Output", type: "output" },
] as const;

/** Residual connections: [fromSublayerIdx, toSublayerIdx] */
const RESIDUAL_CONNECTIONS: readonly [number, number][] = [
  [0, 2], // input → add-norm-1
  [2, 4], // add-norm-1 → add-norm-2
];

const THEME = {
  /** Input/output block fill. */
  inputBlock: "#1e293b",
  /** Computation sublayer block fill. */
  sublayerBlock: "#2d1b4e",
  /** Operation (add & norm) block fill. */
  operationBlock: "#1a3a2a",
  /** Output block fill. */
  outputBlock: "#1e293b",
  /** Default block border. */
  blockStroke: "#6b21a8",
  /** Active block fill. */
  activeBlock: "#7c3aed",
  /** Active block border. */
  activeStroke: "#f472b6",
  /** Block label text. */
  blockText: "#f5f3ff",
  /** Sequential flow arrow color. */
  arrow: "#a78bfa",
  /** Residual skip connection color. */
  residualArrow: "#f472b6",
  /** Add symbol color. */
  addSymbol: "#22c55e",
} as const;

/**
 * Returns the fill color for a sublayer block based on its type.
 */
function blockColorForType(type: SublayerDef["type"]): string {
  switch (type) {
    case "input":
      return THEME.inputBlock;
    case "sublayer":
      return THEME.sublayerBlock;
    case "operation":
      return THEME.operationBlock;
    case "output":
      return THEME.outputBlock;
  }
}

// ── Layout Function ──────────────────────────────────────────────────────────

/**
 * The layer-diagram layout function.
 *
 * Expected step.state fields:
 *   - activeSublayer?: string  — ID of the currently active sublayer.
 *
 * Supported visual actions:
 *   - activateSublayer { sublayerId, label } — Highlights the named sublayer block.
 *
 * @param step       — The current Step object.
 * @param canvasSize — Canvas dimensions in CSS pixels.
 * @param _config    — Layout-specific config.
 * @returns A PrimitiveScene.
 */
function layerDiagramLayout(
  step: Step,
  canvasSize: CanvasSize,
  _config: Record<string, unknown>,
): PrimitiveScene {
  const primitives: RenderPrimitive[] = [];

  const usableWidth = canvasSize.width - 2 * LAYOUT_PADDING;
  const usableHeight = canvasSize.height - 2 * LAYOUT_PADDING;

  const sublayers = TRANSFORMER_SUBLAYERS;
  const blockWidth = usableWidth * BLOCK_WIDTH_RATIO;
  const centerX = LAYOUT_PADDING + usableWidth / 2;

  const totalStackHeight = sublayers.length * BLOCK_HEIGHT + (sublayers.length - 1) * BLOCK_GAP;
  const stackStartY = LAYOUT_PADDING + (usableHeight - totalStackHeight) / 2;

  const blockCenterY = (i: number): number =>
    stackStartY + i * (BLOCK_HEIGHT + BLOCK_GAP) + BLOCK_HEIGHT / 2;

  // ── Process visual actions ─────────────────────────────────────────────
  const activeSublayerId: string | null = (() => {
    for (const action of step.visualActions) {
      if (action.type === "activateSublayer") {
        return (action as Record<string, unknown>).sublayerId as string;
      }
    }
    return null;
  })();

  // ── Create sublayer block primitives ───────────────────────────────────
  for (let i = 0; i < sublayers.length; i++) {
    const sub = sublayers[i]!;
    const isActive = sub.id === activeSublayerId;

    const block: ElementPrimitive = {
      kind: "element",
      id: `block-${sub.id}`,
      x: centerX,
      y: blockCenterY(i),
      width: blockWidth,
      height: BLOCK_HEIGHT,
      shape: "roundedRect",
      cornerRadius: BLOCK_CORNER_RADIUS,
      fillColor: isActive ? THEME.activeBlock : blockColorForType(sub.type),
      strokeColor: isActive ? THEME.activeStroke : THEME.blockStroke,
      strokeWidth: isActive ? 2.5 : 1.5,
      label: sub.label,
      labelFontSize: BLOCK_FONT_SIZE,
      labelColor: isActive ? "#ffffff" : THEME.blockText,
      subLabel: "",
      subLabelFontSize: 0,
      subLabelColor: "transparent",
      rotation: 0,
      opacity: 1,
      zIndex: Z_INDEX.ELEMENT,
    };
    primitives.push(block);
  }

  // ── Create sequential flow arrows ──────────────────────────────────────
  for (let i = 0; i < sublayers.length - 1; i++) {
    const startY = blockCenterY(i) + BLOCK_HEIGHT / 2;
    const endY = blockCenterY(i + 1) - BLOCK_HEIGHT / 2;

    const arrow: ConnectionPrimitive = {
      kind: "connection",
      id: `flow-arrow-${i}`,
      x1: centerX,
      y1: startY,
      x2: centerX,
      y2: endY,
      curveOffset: 0,
      color: THEME.arrow,
      lineWidth: 2,
      dashPattern: [],
      arrowHead: "end",
      arrowSize: ARROW_SIZE,
      label: "",
      labelFontSize: 0,
      labelColor: "transparent",
      opacity: 0.8,
      zIndex: Z_INDEX.CONNECTION,
    };
    primitives.push(arrow);
  }

  // ── Create residual skip connections ───────────────────────────────────
  for (const [fromIdx, toIdx] of RESIDUAL_CONNECTIONS) {
    const fromY = blockCenterY(fromIdx);
    const toY = blockCenterY(toIdx);

    // Skip connection goes: right from source → down → left into target
    const skipX = centerX + blockWidth / 2 + RESIDUAL_OFFSET;

    // Top segment: source → right corner
    const seg1: ConnectionPrimitive = {
      kind: "connection",
      id: `residual-${fromIdx}-${toIdx}-top`,
      x1: centerX + blockWidth / 2,
      y1: fromY,
      x2: skipX,
      y2: fromY,
      curveOffset: 0,
      color: THEME.residualArrow,
      lineWidth: 1.5,
      dashPattern: [6, 4],
      arrowHead: "none",
      arrowSize: 0,
      label: "",
      labelFontSize: 0,
      labelColor: "transparent",
      opacity: 0.6,
      zIndex: Z_INDEX.CONNECTION - 1,
    };
    primitives.push(seg1);

    // Vertical segment: right side down
    const seg2: ConnectionPrimitive = {
      kind: "connection",
      id: `residual-${fromIdx}-${toIdx}-vert`,
      x1: skipX,
      y1: fromY,
      x2: skipX,
      y2: toY,
      curveOffset: 0,
      color: THEME.residualArrow,
      lineWidth: 1.5,
      dashPattern: [6, 4],
      arrowHead: "none",
      arrowSize: 0,
      label: "",
      labelFontSize: 0,
      labelColor: "transparent",
      opacity: 0.6,
      zIndex: Z_INDEX.CONNECTION - 1,
    };
    primitives.push(seg2);

    // Bottom segment: right corner → target (with arrowhead)
    const seg3: ConnectionPrimitive = {
      kind: "connection",
      id: `residual-${fromIdx}-${toIdx}-bottom`,
      x1: skipX,
      y1: toY,
      x2: centerX + blockWidth / 2,
      y2: toY,
      curveOffset: 0,
      color: THEME.residualArrow,
      lineWidth: 1.5,
      dashPattern: [6, 4],
      arrowHead: "end",
      arrowSize: 6,
      label: "",
      labelFontSize: 0,
      labelColor: "transparent",
      opacity: 0.6,
      zIndex: Z_INDEX.CONNECTION - 1,
    };
    primitives.push(seg3);

    // "⊕" (add) symbol at the residual merge point
    const addBadge: AnnotationPrimitive = {
      kind: "annotation",
      id: `add-symbol-${toIdx}`,
      form: "badge",
      x: centerX + blockWidth / 2 + 15,
      y: toY - BLOCK_HEIGHT / 2 - 5,
      text: "⊕",
      fontSize: 14,
      textColor: THEME.addSymbol,
      color: "rgba(34, 197, 94, 0.15)",
      pointerHeight: 0,
      pointerWidth: 0,
      bracketWidth: 0,
      bracketTickHeight: 0,
      badgePaddingX: 6,
      badgePaddingY: 3,
      opacity: 0.9,
      zIndex: Z_INDEX.ANNOTATION,
    };
    primitives.push(addBadge);
  }

  return { primitives };
}

// ── Registration ─────────────────────────────────────────────────────────────

registerLayout({
  name: "layer-diagram",
  description:
    "Vertical flow diagram of sublayers in a transformer block with " +
    "residual skip connections. Used for transformer block visualization.",
  layout: layerDiagramLayout,
});
