// =============================================================================
// web/src/engine/layouts/attention-heatmap.ts
//
// Layout for attention weight visualization as a heatmap grid.
// Rows = query tokens, Columns = key tokens.
// Cell color intensity encodes the attention weight.
//
// Used by: self-attention, multi-head attention.
// Self-registers with the layout registry on module load.
// =============================================================================

import type {
  Step,
  CanvasSize,
  PrimitiveScene,
  RenderPrimitive,
  ElementPrimitive,
  AnnotationPrimitive,
} from "../types";

import { LAYOUT_PADDING, Z_INDEX } from "../types";
import { registerLayout } from "./registry";
import { interpolateColor } from "../color";

// ── Constants ────────────────────────────────────────────────────────────────

/** Width reserved for row (query) labels on the left. */
const HEADER_LABEL_WIDTH = 80;

/** Height reserved for column (key) labels at the top. */
const HEADER_LABEL_HEIGHT = 50;

/** Height reserved for the legend area at the bottom. */
const LEGEND_HEIGHT = 30;

/** Minimum cell size in CSS pixels. */
const MIN_CELL_SIZE = 30;

/** Maximum cell size in CSS pixels. */
const MAX_CELL_SIZE = 80;

/** Font size for weight values inside cells. */
const CELL_FONT_SIZE = 11;

/** Font size for row/column header labels. */
const HEADER_FONT_SIZE = 12;

/** Corner radius for heatmap cells. */
const CELL_CORNER_RADIUS = 2;

/** Small gap between cells for readability. */
const CELL_GAP = 2;

const THEME = {
  /** Heatmap color for weight = 0. */
  heatLow: "#1e1040",
  /** Heatmap color for weight = 1. */
  heatHigh: "#f472b6",
  /** Heatmap mid-range color (for 3-stop gradient). */
  heatMid: "#7c3aed",
  /** Cell text color (weight value). */
  cellText: "#f5f3ff",
  /** Header text color. */
  headerText: "#c4b5fd",
  /** Highlighted row/column header. */
  headerHighlight: "#f472b6",
  /** Active cell outline. */
  cellActiveStroke: "#fbbf24",
  /** Legend text. */
  legendText: "#a78bfa",
} as const;

// ── Heatmap Color Function ───────────────────────────────────────────────────

/**
 * Computes the heatmap color for a given attention weight.
 *
 * Uses a 3-stop gradient:
 *   weight 0.0 → heatLow  (dark purple)
 *   weight 0.5 → heatMid  (violet)
 *   weight 1.0 → heatHigh (pink)
 *
 * This produces better perceptual differentiation than a 2-stop gradient
 * because human vision perceives lightness changes nonlinearly.
 *
 * @param weight — Attention weight in [0, 1]. Clamped for safety.
 * @returns CSS color string.
 */
function heatmapColor(weight: number): string {
  const w = Math.max(0, Math.min(1, weight));
  if (w <= 0.5) {
    return interpolateColor(THEME.heatLow, THEME.heatMid, w / 0.5);
  }
  return interpolateColor(THEME.heatMid, THEME.heatHigh, (w - 0.5) / 0.5);
}

// ── Layout Function ──────────────────────────────────────────────────────────

/**
 * The attention-heatmap layout function.
 *
 * Expected step.state fields:
 *   - tokens: string[]                   — Token sequence.
 *   - attentionWeights?: number[][]      — Full attention weight matrix [seqLen × seqLen].
 *                                          Each row sums to 1.0.
 *   - attentionScores?: number[][]       — Raw scores before softmax (optional).
 *   - activeHead?: number                — Currently active head index (for MHA).
 *   - totalHeads?: number                — Total number of heads (for MHA label).
 *
 * @param step       — The current Step object.
 * @param canvasSize — Canvas dimensions in CSS pixels.
 * @param _config    — Layout-specific config.
 * @returns A PrimitiveScene.
 */
function attentionHeatmapLayout(
  step: Step,
  canvasSize: CanvasSize,
  _config: Record<string, unknown>,
): PrimitiveScene {
  const primitives: RenderPrimitive[] = [];
  const state = step.state as Record<string, unknown>;
  const tokens: string[] = (state.tokens as string[]) ?? [];
  const seqLen = tokens.length;

  if (seqLen === 0) return { primitives: [] };

  // ── Compute geometry ───────────────────────────────────────────────────
  const usableWidth = canvasSize.width - 2 * LAYOUT_PADDING;
  const usableHeight = canvasSize.height - 2 * LAYOUT_PADDING;

  const gridWidth = usableWidth - HEADER_LABEL_WIDTH;
  const gridHeight = usableHeight - HEADER_LABEL_HEIGHT - LEGEND_HEIGHT;

  const cellWidth = Math.max(MIN_CELL_SIZE, Math.min(MAX_CELL_SIZE, gridWidth / seqLen));
  const cellHeight = Math.max(MIN_CELL_SIZE, Math.min(MAX_CELL_SIZE, gridHeight / seqLen));

  const gridLeft = LAYOUT_PADDING + HEADER_LABEL_WIDTH;
  const gridTop = LAYOUT_PADDING + HEADER_LABEL_HEIGHT;

  const cellCenterX = (col: number): number => gridLeft + col * cellWidth + cellWidth / 2;
  const cellCenterY = (row: number): number => gridTop + row * cellHeight + cellHeight / 2;

  // ── Process visual actions to extract matrix data ──────────────────────
  let weightMatrix: number[][] | null = null;
  let highlightedQueryIdx = -1;
  let messageText = "";

  // First check state for pre-computed matrix
  if (state.attentionWeights) {
    weightMatrix = state.attentionWeights as number[][];
  }

  for (const action of step.visualActions) {
    switch (action.type) {
      case "showFullAttentionMatrix": {
        weightMatrix = (action as Record<string, unknown>).weights as number[][];
        break;
      }
      case "showAttentionWeights": {
        highlightedQueryIdx = (action as Record<string, unknown>).queryIdx as number;
        break;
      }
      case "showMessage": {
        messageText = ((action as Record<string, unknown>).text as string) ?? "";
        break;
      }
      default:
        break;
    }
  }

  // ── Column headers (key tokens) ────────────────────────────────────────
  for (let col = 0; col < seqLen; col++) {
    const header: AnnotationPrimitive = {
      kind: "annotation",
      id: `col-header-${col}`,
      form: "label",
      x: cellCenterX(col),
      y: LAYOUT_PADDING + HEADER_LABEL_HEIGHT / 2,
      text: tokens[col]!,
      fontSize: HEADER_FONT_SIZE,
      textColor: THEME.headerText,
      color: THEME.headerText,
      pointerHeight: 0,
      pointerWidth: 0,
      bracketWidth: 0,
      bracketTickHeight: 0,
      badgePaddingX: 0,
      badgePaddingY: 0,
      opacity: 1,
      zIndex: Z_INDEX.ANNOTATION,
    };
    primitives.push(header);
  }

  // ── Row headers (query tokens) ─────────────────────────────────────────
  for (let row = 0; row < seqLen; row++) {
    const isHighlighted = row === highlightedQueryIdx;
    const header: AnnotationPrimitive = {
      kind: "annotation",
      id: `row-header-${row}`,
      form: "label",
      x: LAYOUT_PADDING + HEADER_LABEL_WIDTH / 2,
      y: cellCenterY(row),
      text: tokens[row]!,
      fontSize: HEADER_FONT_SIZE,
      textColor: isHighlighted ? THEME.headerHighlight : THEME.headerText,
      color: isHighlighted ? THEME.headerHighlight : THEME.headerText,
      pointerHeight: 0,
      pointerWidth: 0,
      bracketWidth: 0,
      bracketTickHeight: 0,
      badgePaddingX: 0,
      badgePaddingY: 0,
      opacity: 1,
      zIndex: Z_INDEX.ANNOTATION,
    };
    primitives.push(header);
  }

  // ── Heatmap cells ──────────────────────────────────────────────────────
  if (weightMatrix && weightMatrix.length === seqLen) {
    for (let row = 0; row < seqLen; row++) {
      const rowWeights = weightMatrix[row]!;
      for (let col = 0; col < seqLen; col++) {
        const weight = rowWeights[col] ?? 0;
        const isHighlightedRow = row === highlightedQueryIdx;

        const cell: ElementPrimitive = {
          kind: "element",
          id: `heatmap-cell-${row}-${col}`,
          x: cellCenterX(col),
          y: cellCenterY(row),
          width: cellWidth - CELL_GAP,
          height: cellHeight - CELL_GAP,
          shape: "roundedRect",
          cornerRadius: CELL_CORNER_RADIUS,
          fillColor: heatmapColor(weight),
          strokeColor: isHighlightedRow ? THEME.cellActiveStroke : "transparent",
          strokeWidth: isHighlightedRow ? 2 : 0,
          label: weight.toFixed(2),
          labelFontSize: CELL_FONT_SIZE,
          labelColor: THEME.cellText,
          subLabel: "",
          subLabelFontSize: 0,
          subLabelColor: "transparent",
          rotation: 0,
          opacity: 1,
          zIndex: Z_INDEX.ELEMENT,
        };
        primitives.push(cell);
      }
    }
  }

  // ── "Query" and "Key" axis labels ──────────────────────────────────────
  const keyLabel: AnnotationPrimitive = {
    kind: "annotation",
    id: "key-axis-label",
    form: "label",
    x: gridLeft + (seqLen * cellWidth) / 2,
    y: LAYOUT_PADDING + 10,
    text: "Key →",
    fontSize: 11,
    textColor: THEME.legendText,
    color: THEME.legendText,
    pointerHeight: 0,
    pointerWidth: 0,
    bracketWidth: 0,
    bracketTickHeight: 0,
    badgePaddingX: 0,
    badgePaddingY: 0,
    opacity: 0.7,
    zIndex: Z_INDEX.ANNOTATION,
  };
  primitives.push(keyLabel);

  const queryLabel: AnnotationPrimitive = {
    kind: "annotation",
    id: "query-axis-label",
    form: "label",
    x: LAYOUT_PADDING + 12,
    y: gridTop + (seqLen * cellHeight) / 2,
    text: "Query ↓",
    fontSize: 11,
    textColor: THEME.legendText,
    color: THEME.legendText,
    pointerHeight: 0,
    pointerWidth: 0,
    bracketWidth: 0,
    bracketTickHeight: 0,
    badgePaddingX: 0,
    badgePaddingY: 0,
    opacity: 0.7,
    zIndex: Z_INDEX.ANNOTATION,
  };
  primitives.push(queryLabel);

  // ── Active head badge (for multi-head attention) ───────────────────────
  const activeHead = state.activeHead as number | undefined;
  const totalHeads = state.totalHeads as number | undefined;
  if (activeHead !== undefined && totalHeads !== undefined) {
    const headBadge: AnnotationPrimitive = {
      kind: "annotation",
      id: "head-badge",
      form: "badge",
      x: canvasSize.width - LAYOUT_PADDING - 50,
      y: LAYOUT_PADDING + 15,
      text: `Head ${activeHead + 1}/${totalHeads}`,
      fontSize: 11,
      textColor: "#f5f3ff",
      color: THEME.heatMid,
      pointerHeight: 0,
      pointerWidth: 0,
      bracketWidth: 0,
      bracketTickHeight: 0,
      badgePaddingX: 10,
      badgePaddingY: 4,
      opacity: 1,
      zIndex: Z_INDEX.ANNOTATION + 10,
    };
    primitives.push(headBadge);
  }

  // ── Message ────────────────────────────────────────────────────────────
  if (messageText !== "") {
    const msg: AnnotationPrimitive = {
      kind: "annotation",
      id: "message",
      form: "label",
      x: canvasSize.width / 2,
      y: canvasSize.height - LAYOUT_PADDING - 10,
      text: messageText,
      fontSize: 13,
      textColor: THEME.legendText,
      color: THEME.legendText,
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

  return { primitives };
}

// ── Registration ─────────────────────────────────────────────────────────────

registerLayout({
  name: "attention-heatmap",
  description:
    "Attention weight matrix as a heatmap grid. Rows = query tokens, " +
    "columns = key tokens. Cell color encodes attention weight magnitude.",
  layout: attentionHeatmapLayout,
});
