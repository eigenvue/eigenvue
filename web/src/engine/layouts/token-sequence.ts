// =============================================================================
// web/src/engine/layouts/token-sequence.ts
//
// Layout for token-based generative AI visualizations: tokenization (BPE),
// token embeddings, and simple attention arc views.
//
// Renders a horizontal row of token chips with optional attention arcs above
// and embedding mini-bar-charts below.
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

/** Maximum width of a single token chip in CSS pixels. */
const MAX_CHIP_WIDTH = 100;

/** Minimum width of a single token chip. */
const MIN_CHIP_WIDTH = 50;

/** Fixed height of token chips. */
const CHIP_HEIGHT = 40;

/** Horizontal gap between adjacent chips. */
const CHIP_GAP = 12;

/** Vertical ratio for the token row center (0.0 = top, 1.0 = bottom). */
const TOKEN_ROW_VERTICAL_RATIO = 0.45;

/** Gap between the bottom of token chips and the top of embedding bars. */
const BAR_TOP_GAP = 20;

/** Corner radius for token chips. */
const CHIP_CORNER_RADIUS = 8;

/** Font size for token text inside chips. */
const CHIP_FONT_SIZE = 14;

/** Font size for token index sub-labels. */
const CHIP_INDEX_FONT_SIZE = 11;

/** Maximum height for individual embedding bars. */
const MAX_BAR_HEIGHT = 50;

/** Width of each individual bar in the mini bar chart. */
const MINI_BAR_WIDTH = 4;

/** Gap between mini bars in the embedding chart. */
const MINI_BAR_GAP = 1;

/** Maximum height for attention arcs. */
const ARC_MAX_HEIGHT = 80;

/** Ratio of distance used for arc height. */
const ARC_HEIGHT_RATIO = 0.4;

/** Minimum arc line width. */
const ARC_MIN_WIDTH = 0.5;

/** Maximum arc line width. */
const ARC_MAX_WIDTH = 4.0;

/** Minimum arc opacity. */
const ARC_MIN_OPACITY = 0.1;

/** Maximum arc opacity. */
const ARC_MAX_OPACITY = 0.9;

const THEME = {
  /** Default token chip fill. */
  chipDefault:     "#2d1b4e",
  /** Token chip stroke/border. */
  chipStroke:      "#6b21a8",
  /** Token text color. */
  chipText:        "#f5f3ff",
  /** Index sub-label text. */
  chipIndex:       "#a78bfa",
  /** Highlighted token chip fill. */
  chipHighlight:   "#7c3aed",
  /** Active/selected token chip fill. */
  chipActive:      "#f472b6",
  /** Merge indicator glow. */
  mergeGlow:       "#f9a8d4",
  /** Attention arc default color. */
  arcDefault:      "#c084fc",
  /** Attention arc strong weight color. */
  arcStrong:       "#f472b6",
  /** Embedding bar positive value color. */
  barPositive:     "#a78bfa",
  /** Embedding bar negative value color. */
  barNegative:     "#f472b6",
  /** Message text color. */
  message:         "#e9d5ff",
} as const;

// ── Helper: Linear Interpolation ─────────────────────────────────────────────

/**
 * Linearly interpolates between two values.
 *
 * @param a - Start value (when t = 0).
 * @param b - End value (when t = 1).
 * @param t - Interpolation factor, clamped to [0, 1].
 * @returns The interpolated value: a + (b - a) * clamp(t, 0, 1).
 */
function lerp(a: number, b: number, t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return a + (b - a) * clamped;
}

// ── Layout Function ──────────────────────────────────────────────────────────

/**
 * The token-sequence layout function.
 *
 * Expected step.state fields:
 *   - tokens: string[]         — The current token sequence.
 *   - sourceText?: string      — The original source text (for BPE).
 *   - embeddings?: number[][]  — Embedding vectors per token (optional).
 *
 * Processes all GenAI-specific visual actions listed in Section 5.5.
 *
 * @param step       — The current Step object.
 * @param canvasSize — Canvas dimensions in CSS pixels.
 * @param _config    — Layout-specific config (reserved for future use).
 * @returns A PrimitiveScene containing all primitives to draw.
 */
function tokenSequenceLayout(
  step: Step,
  canvasSize: CanvasSize,
  _config: Record<string, unknown>,
): PrimitiveScene {
  const primitives: RenderPrimitive[] = [];

  // ── Extract state ──────────────────────────────────────────────────────
  const state = step.state as Record<string, unknown>;
  const tokens: string[] = (state.tokens as string[]) ?? [];
  const seqLen = tokens.length;

  if (seqLen === 0) {
    return { primitives: [] };
  }

  // ── Compute geometry ───────────────────────────────────────────────────
  const usableWidth = canvasSize.width - 2 * LAYOUT_PADDING;
  const usableHeight = canvasSize.height - 2 * LAYOUT_PADDING;

  const chipWidth = Math.max(
    MIN_CHIP_WIDTH,
    Math.min(MAX_CHIP_WIDTH, (usableWidth - (seqLen - 1) * CHIP_GAP) / seqLen),
  );
  const totalRowWidth = seqLen * chipWidth + (seqLen - 1) * CHIP_GAP;
  const rowStartX = LAYOUT_PADDING + (usableWidth - totalRowWidth) / 2;
  const rowCenterY = LAYOUT_PADDING + usableHeight * TOKEN_ROW_VERTICAL_RATIO;

  /**
   * Returns the center x-coordinate of the token chip at index i.
   * Formula: rowStartX + i * (chipWidth + CHIP_GAP) + chipWidth / 2
   */
  const chipCenterX = (i: number): number =>
    rowStartX + i * (chipWidth + CHIP_GAP) + chipWidth / 2;
  const chipCenterY = rowCenterY;

  // ── Process visual actions ─────────────────────────────────────────────
  const chipColors = new Array<string>(seqLen).fill(THEME.chipDefault);
  const chipOpacities = new Array<number>(seqLen).fill(1);

  /** Attention weights: attentionArcs[queryIdx] = weights[] */
  const attentionArcs = new Map<number, number[]>();

  /** Merge indicators: [leftIndex, rightIndex, resultText] */
  const merges: Array<[number, number, string]> = [];

  /** Embedding data: embeddingData[tokenIdx] = values[] */
  const embeddingData = new Map<number, number[]>();

  /** Similarity connections: [tokenA, tokenB, score] */
  const similarities: Array<[number, number, number]> = [];

  let messageText = "";

  for (const action of step.visualActions) {
    switch (action.type) {
      case "highlightToken": {
        const idx = (action as Record<string, unknown>).index as number;
        if (idx >= 0 && idx < seqLen) {
          chipColors[idx] = THEME.chipHighlight;
        }
        break;
      }

      case "mergeTokens": {
        const left = (action as Record<string, unknown>).leftIndex as number;
        const right = (action as Record<string, unknown>).rightIndex as number;
        const result = (action as Record<string, unknown>).result as string;
        merges.push([left, right, result]);
        if (left >= 0 && left < seqLen) chipColors[left] = THEME.chipActive;
        if (right >= 0 && right < seqLen) chipColors[right] = THEME.chipActive;
        break;
      }

      case "showAttentionWeights": {
        const queryIdx = (action as Record<string, unknown>).queryIdx as number;
        const weights = (action as Record<string, unknown>).weights as number[];
        attentionArcs.set(queryIdx, weights);
        if (queryIdx >= 0 && queryIdx < seqLen) {
          chipColors[queryIdx] = THEME.chipActive;
        }
        break;
      }

      case "showEmbedding": {
        const tokenIndex = (action as Record<string, unknown>).tokenIndex as number;
        const values = (action as Record<string, unknown>).values as number[];
        embeddingData.set(tokenIndex, values);
        break;
      }

      case "showSimilarity": {
        const tokenA = (action as Record<string, unknown>).tokenA as number;
        const tokenB = (action as Record<string, unknown>).tokenB as number;
        const score = (action as Record<string, unknown>).score as number;
        similarities.push([tokenA, tokenB, score]);
        break;
      }

      case "showMessage": {
        messageText = ((action as Record<string, unknown>).text as string) ?? "";
        break;
      }

      default:
        // Open vocabulary — silently ignore unrecognized action types.
        break;
    }
  }

  // ── Create token chip primitives ───────────────────────────────────────
  for (let i = 0; i < seqLen; i++) {
    const chip: ElementPrimitive = {
      kind: "element",
      id: `token-chip-${i}`,
      x: chipCenterX(i),
      y: chipCenterY,
      width: chipWidth,
      height: CHIP_HEIGHT,
      shape: "roundedRect",
      cornerRadius: CHIP_CORNER_RADIUS,
      fillColor: chipColors[i]!,
      strokeColor: THEME.chipStroke,
      strokeWidth: 1.5,
      label: tokens[i]!,
      labelFontSize: CHIP_FONT_SIZE,
      labelColor: THEME.chipText,
      subLabel: `${i}`,
      subLabelFontSize: CHIP_INDEX_FONT_SIZE,
      subLabelColor: THEME.chipIndex,
      rotation: 0,
      opacity: chipOpacities[i]!,
      zIndex: Z_INDEX.ELEMENT,
    };
    primitives.push(chip);
  }

  // ── Create attention arc primitives ────────────────────────────────────
  for (const [queryIdx, weights] of attentionArcs) {
    for (let keyIdx = 0; keyIdx < weights.length; keyIdx++) {
      const weight = weights[keyIdx]!;

      // Skip negligible weights to reduce visual clutter.
      if (weight < 0.01) continue;

      const startX = chipCenterX(queryIdx);
      const endX = chipCenterX(keyIdx);
      const topY = chipCenterY - CHIP_HEIGHT / 2; // top edge of chips

      // Self-attention (query == key) is shown as a small loop.
      // For non-self connections, arc curves above the token row.
      const distance = Math.abs(endX - startX);
      const arcHeight =
        queryIdx === keyIdx
          ? 20 // small loop for self-attention
          : Math.min(ARC_MAX_HEIGHT, distance * ARC_HEIGHT_RATIO);

      // ConnectionPrimitive with curveOffset for the arc.
      // curveOffset is NEGATIVE to curve ABOVE the line (since y increases downward).
      const arc: ConnectionPrimitive = {
        kind: "connection",
        id: `attn-arc-${queryIdx}-${keyIdx}`,
        x1: startX,
        y1: topY,
        x2: endX,
        y2: topY,
        curveOffset: -arcHeight, // negative = curve upward
        color: weight > 0.3 ? THEME.arcStrong : THEME.arcDefault,
        lineWidth: lerp(ARC_MIN_WIDTH, ARC_MAX_WIDTH, weight),
        dashPattern: [],
        arrowHead: "end",
        arrowSize: weight > 0.15 ? 6 : 0, // only show arrowhead for visible arcs
        label: weight >= 0.1 ? weight.toFixed(2) : "", // label weights ≥ 10%
        labelFontSize: 10,
        labelColor: THEME.message,
        opacity: lerp(ARC_MIN_OPACITY, ARC_MAX_OPACITY, weight),
        zIndex: Z_INDEX.CONNECTION,
      };
      primitives.push(arc);
    }
  }

  // ── Create merge indicator primitives ──────────────────────────────────
  for (const [leftIdx, rightIdx, resultText] of merges) {
    if (leftIdx < 0 || rightIdx >= seqLen) continue;

    const bracketLeft = chipCenterX(leftIdx) - chipWidth / 4;
    const bracketRight = chipCenterX(rightIdx) + chipWidth / 4;
    const bracketY = chipCenterY + CHIP_HEIGHT / 2 + 10;

    const bracket: AnnotationPrimitive = {
      kind: "annotation",
      id: `merge-bracket-${leftIdx}-${rightIdx}`,
      form: "bracket",
      x: bracketLeft,
      y: bracketY,
      text: `→ "${resultText}"`,
      fontSize: 11,
      textColor: THEME.mergeGlow,
      color: THEME.mergeGlow,
      pointerHeight: 0,
      pointerWidth: 0,
      bracketWidth: bracketRight - bracketLeft,
      bracketTickHeight: 6,
      badgePaddingX: 0,
      badgePaddingY: 0,
      opacity: 1,
      zIndex: Z_INDEX.ANNOTATION,
    };
    primitives.push(bracket);
  }

  // ── Create embedding bar chart primitives ──────────────────────────────
  for (const [tokenIdx, values] of embeddingData) {
    if (tokenIdx < 0 || tokenIdx >= seqLen) continue;

    const barZoneTop = chipCenterY + CHIP_HEIGHT / 2 + BAR_TOP_GAP;
    const maxVal = Math.max(...values.map(Math.abs), 1e-9); // avoid division by zero
    const barChartWidth = values.length * (MINI_BAR_WIDTH + MINI_BAR_GAP) - MINI_BAR_GAP;
    const barStartX = chipCenterX(tokenIdx) - barChartWidth / 2;

    for (let d = 0; d < values.length; d++) {
      const val = values[d]!;
      const normalizedHeight = (Math.abs(val) / maxVal) * MAX_BAR_HEIGHT;
      const isPositive = val >= 0;
      const barX = barStartX + d * (MINI_BAR_WIDTH + MINI_BAR_GAP) + MINI_BAR_WIDTH / 2;

      // Bars extend upward (positive) or downward (negative) from the baseline.
      const baselineY = barZoneTop + MAX_BAR_HEIGHT;
      const barY = isPositive
        ? baselineY - normalizedHeight / 2
        : baselineY + normalizedHeight / 2;

      const bar: ElementPrimitive = {
        kind: "element",
        id: `emb-bar-${tokenIdx}-${d}`,
        x: barX,
        y: barY,
        width: MINI_BAR_WIDTH,
        height: normalizedHeight,
        shape: "rect",
        cornerRadius: 0,
        fillColor: isPositive ? THEME.barPositive : THEME.barNegative,
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
        zIndex: Z_INDEX.ELEMENT - 1, // behind token chips
      };
      primitives.push(bar);
    }
  }

  // ── Create similarity connection primitives ────────────────────────────
  for (const [tokenA, tokenB, score] of similarities) {
    if (tokenA < 0 || tokenA >= seqLen || tokenB < 0 || tokenB >= seqLen) continue;

    const conn: ConnectionPrimitive = {
      kind: "connection",
      id: `similarity-${tokenA}-${tokenB}`,
      x1: chipCenterX(tokenA),
      y1: chipCenterY + CHIP_HEIGHT / 2 + 5,
      x2: chipCenterX(tokenB),
      y2: chipCenterY + CHIP_HEIGHT / 2 + 5,
      curveOffset: 30, // curve below
      color: score > 0.5 ? THEME.arcStrong : THEME.arcDefault,
      lineWidth: lerp(1, 3, Math.abs(score)),
      dashPattern: [4, 4],
      arrowHead: "none",
      arrowSize: 0,
      label: `sim: ${score.toFixed(3)}`,
      labelFontSize: 10,
      labelColor: THEME.message,
      opacity: 0.7,
      zIndex: Z_INDEX.CONNECTION,
    };
    primitives.push(conn);
  }

  // ── Message annotation ─────────────────────────────────────────────────
  if (messageText !== "") {
    const msg: AnnotationPrimitive = {
      kind: "annotation",
      id: "message",
      form: "label",
      x: canvasSize.width / 2,
      y: canvasSize.height - LAYOUT_PADDING - 10,
      text: messageText,
      fontSize: 13,
      textColor: THEME.message,
      color: THEME.message,
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
  name: "token-sequence",
  description:
    "Horizontal token row with attention arcs above and embedding bars below. " +
    "Used for tokenization (BPE), token embeddings, and simple attention views.",
  layout: tokenSequenceLayout,
});
