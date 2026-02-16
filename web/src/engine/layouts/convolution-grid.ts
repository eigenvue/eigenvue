// =============================================================================
// web/src/engine/layouts/convolution-grid.ts
//
// Convolution Grid Layout
//
// Renders three side-by-side grids: input, kernel, and output feature map.
// Highlights the current kernel position on the input, shows element-wise
// products, and fills output cells as they are computed.
//
// Used by the Convolution algorithm visualization.
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

const CELL_SIZE = 48;
const CELL_GAP = 2;
const GRID_SPACING = 60;
const LABEL_OFFSET = 25;
const FONT_SIZE_VALUE = 11;
const FONT_SIZE_LABEL = 12;
const FONT_SIZE_GRID_TITLE = 13;

const THEME = {
  inputCell:        "#1e293b",
  inputStroke:      "#334155",
  kernelCell:       "#1e293b",
  kernelStroke:     "#f59e0b",
  outputCell:       "#1e293b",
  outputStroke:     "#334155",
  outputFilled:     "#065f46",
  outputFilledStroke: "#22c55e",
  highlightCell:    "#1e3a5f",
  highlightStroke:  "#38bdf8",
  productOverlay:   "#7c3aed",
  valueText:        "#e2e8f0",
  labelText:        "#94a3b8",
  titleText:        "#e2e8f0",
  sumBadge:         "#22c55e",
  sumBadgeText:     "#ffffff",
} as const;

/**
 * Maps a cell value to a background color for heatmap-style visualization.
 * Negative → blue tint, zero → dark, positive → warm tint.
 */
function cellValueColor(value: number): string {
  if (value === 0) return THEME.inputCell;
  const absV = Math.min(Math.abs(value), 10);
  const intensity = Math.round((absV / 10) * 60);
  if (value > 0) return `rgb(${30 + intensity}, ${40 + intensity}, ${50})`;
  return `rgb(${30}, ${40}, ${50 + intensity})`;
}

// ── Layout Function ──────────────────────────────────────────────────────────

function convolutionGridLayout(
  step: Step,
  canvasSize: CanvasSize,
  _config: Record<string, unknown>,
): PrimitiveScene {
  const primitives: RenderPrimitive[] = [];
  const state = step.state as Record<string, unknown>;

  const inputGrid = (state.inputGrid as number[][]) ?? [];
  const kernel = (state.kernel as number[][]) ?? [];
  const outputGrid = (state.outputGrid as number[][]) ?? [];
  const currentRow = state.currentRow as number | undefined;
  const currentCol = state.currentCol as number | undefined;
  const products = state.products as number[][] | undefined;
  const sum = state.sum as number | undefined;

  const H = inputGrid.length;
  const W = H > 0 ? inputGrid[0]!.length : 0;
  const kH = kernel.length;
  const kW = kH > 0 ? kernel[0]!.length : 0;
  const outH = outputGrid.length;
  const outW = outH > 0 ? outputGrid[0]!.length : 0;

  // Compute grid pixel dimensions
  const inputPixelW = W * (CELL_SIZE + CELL_GAP) - CELL_GAP;
  const kernelPixelW = kW * (CELL_SIZE + CELL_GAP) - CELL_GAP;
  const outputPixelW = outW * (CELL_SIZE + CELL_GAP) - CELL_GAP;

  const totalWidth = inputPixelW + GRID_SPACING + kernelPixelW + GRID_SPACING + outputPixelW;
  const usableWidth = canvasSize.width - 2 * LAYOUT_PADDING;
  const startX = LAYOUT_PADDING + Math.max(0, (usableWidth - totalWidth) / 2);

  const gridTopY = LAYOUT_PADDING + LABEL_OFFSET + 10;

  const inputStartX = startX;
  const kernelStartX = inputStartX + inputPixelW + GRID_SPACING;
  const outputStartX = kernelStartX + kernelPixelW + GRID_SPACING;

  // Parse visual actions
  let highlightRow = -1;
  let highlightCol = -1;
  let highlightKH = 0;
  let highlightKW = 0;
  let showProducts = false;
  let writeRow = -1;
  let writeCol = -1;

  for (const action of step.visualActions) {
    switch (action.type) {
      case "highlightKernelPosition": {
        const a = action as Record<string, unknown>;
        highlightRow = a.row as number;
        highlightCol = a.col as number;
        highlightKH = a.kernelHeight as number;
        highlightKW = a.kernelWidth as number;
        break;
      }
      case "showConvolutionProducts":
        showProducts = true;
        break;
      case "writeOutputCell": {
        const a = action as Record<string, unknown>;
        writeRow = a.row as number;
        writeCol = a.col as number;
        break;
      }
      default:
        break;
    }
  }

  // ── Input Grid ──────────────────────────────────────────────────────────

  // Title
  const inputTitle: AnnotationPrimitive = {
    kind: "annotation",
    id: "title-input",
    form: "label",
    x: inputStartX + inputPixelW / 2,
    y: LAYOUT_PADDING + 5,
    text: `Input (${H}×${W})`,
    fontSize: FONT_SIZE_GRID_TITLE,
    textColor: THEME.titleText,
    color: THEME.titleText,
    pointerHeight: 0, pointerWidth: 0,
    bracketWidth: 0, bracketTickHeight: 0,
    badgePaddingX: 0, badgePaddingY: 0,
    opacity: 1,
    zIndex: Z_INDEX.ANNOTATION,
  };
  primitives.push(inputTitle);

  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const value = inputGrid[r]?.[c] ?? 0;
      const cx = inputStartX + c * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2;
      const cy = gridTopY + r * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2;

      // Check if this cell is under the kernel highlight
      const isHighlighted = highlightRow >= 0 &&
        r >= highlightRow && r < highlightRow + highlightKH &&
        c >= highlightCol && c < highlightCol + highlightKW;

      const cell: ElementPrimitive = {
        kind: "element",
        id: `input-cell-${r}-${c}`,
        x: cx, y: cy,
        width: CELL_SIZE, height: CELL_SIZE,
        shape: "roundedRect",
        cornerRadius: 4,
        fillColor: isHighlighted ? THEME.highlightCell : cellValueColor(value),
        strokeColor: isHighlighted ? THEME.highlightStroke : THEME.inputStroke,
        strokeWidth: isHighlighted ? 2 : 1,
        label: value.toString(),
        labelFontSize: FONT_SIZE_VALUE,
        labelColor: THEME.valueText,
        subLabel: "",
        subLabelFontSize: 0,
        subLabelColor: "transparent",
        rotation: 0,
        opacity: 1,
        zIndex: Z_INDEX.ELEMENT,
      };
      primitives.push(cell);

      // Overlay product values on highlighted cells
      if (isHighlighted && showProducts && products) {
        const kr = r - highlightRow;
        const kc = c - highlightCol;
        const prodVal = products[kr]?.[kc];
        if (prodVal !== undefined) {
          const prodLabel: AnnotationPrimitive = {
            kind: "annotation",
            id: `product-${r}-${c}`,
            form: "badge",
            x: cx + CELL_SIZE / 2 - 5,
            y: cy - CELL_SIZE / 2 + 5,
            text: prodVal.toFixed(1),
            fontSize: 9,
            textColor: "#ffffff",
            color: THEME.productOverlay,
            pointerHeight: 0, pointerWidth: 0,
            bracketWidth: 0, bracketTickHeight: 0,
            badgePaddingX: 3, badgePaddingY: 1,
            opacity: 0.9,
            zIndex: Z_INDEX.ANNOTATION + 5,
          };
          primitives.push(prodLabel);
        }
      }
    }
  }

  // ── Kernel Grid ─────────────────────────────────────────────────────────

  const kernelTitle: AnnotationPrimitive = {
    kind: "annotation",
    id: "title-kernel",
    form: "label",
    x: kernelStartX + kernelPixelW / 2,
    y: LAYOUT_PADDING + 5,
    text: `Kernel (${kH}×${kW})`,
    fontSize: FONT_SIZE_GRID_TITLE,
    textColor: THEME.titleText,
    color: THEME.titleText,
    pointerHeight: 0, pointerWidth: 0,
    bracketWidth: 0, bracketTickHeight: 0,
    badgePaddingX: 0, badgePaddingY: 0,
    opacity: 1,
    zIndex: Z_INDEX.ANNOTATION,
  };
  primitives.push(kernelTitle);

  for (let kr = 0; kr < kH; kr++) {
    for (let kc = 0; kc < kW; kc++) {
      const value = kernel[kr]?.[kc] ?? 0;
      const cx = kernelStartX + kc * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2;
      const cy = gridTopY + kr * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2;

      const cell: ElementPrimitive = {
        kind: "element",
        id: `kernel-cell-${kr}-${kc}`,
        x: cx, y: cy,
        width: CELL_SIZE, height: CELL_SIZE,
        shape: "roundedRect",
        cornerRadius: 4,
        fillColor: cellValueColor(value),
        strokeColor: THEME.kernelStroke,
        strokeWidth: 1.5,
        label: value.toString(),
        labelFontSize: FONT_SIZE_VALUE,
        labelColor: THEME.valueText,
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

  // ── Output Grid ─────────────────────────────────────────────────────────

  const outputTitle: AnnotationPrimitive = {
    kind: "annotation",
    id: "title-output",
    form: "label",
    x: outputStartX + outputPixelW / 2,
    y: LAYOUT_PADDING + 5,
    text: `Output (${outH}×${outW})`,
    fontSize: FONT_SIZE_GRID_TITLE,
    textColor: THEME.titleText,
    color: THEME.titleText,
    pointerHeight: 0, pointerWidth: 0,
    bracketWidth: 0, bracketTickHeight: 0,
    badgePaddingX: 0, badgePaddingY: 0,
    opacity: 1,
    zIndex: Z_INDEX.ANNOTATION,
  };
  primitives.push(outputTitle);

  for (let r = 0; r < outH; r++) {
    for (let c = 0; c < outW; c++) {
      const value = outputGrid[r]?.[c] ?? 0;
      const cx = outputStartX + c * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2;
      const cy = gridTopY + r * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2;

      const isJustWritten = writeRow === r && writeCol === c;
      const isFilled = value !== 0 || isJustWritten;

      const cell: ElementPrimitive = {
        kind: "element",
        id: `output-cell-${r}-${c}`,
        x: cx, y: cy,
        width: CELL_SIZE, height: CELL_SIZE,
        shape: "roundedRect",
        cornerRadius: 4,
        fillColor: isFilled ? THEME.outputFilled : THEME.outputCell,
        strokeColor: isJustWritten ? THEME.outputFilledStroke
          : isFilled ? THEME.outputFilledStroke
          : THEME.outputStroke,
        strokeWidth: isJustWritten ? 2.5 : 1,
        label: isFilled ? value.toString() : "",
        labelFontSize: FONT_SIZE_VALUE,
        labelColor: THEME.valueText,
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

  // ── Sum Badge ───────────────────────────────────────────────────────────

  if (sum !== undefined && currentRow !== undefined && currentCol !== undefined) {
    const sumBadge: AnnotationPrimitive = {
      kind: "annotation",
      id: "sum-badge",
      form: "badge",
      x: kernelStartX + kernelPixelW / 2,
      y: gridTopY + kH * (CELL_SIZE + CELL_GAP) + 15,
      text: `Σ = ${sum}`,
      fontSize: 12,
      textColor: THEME.sumBadgeText,
      color: THEME.sumBadge,
      pointerHeight: 0, pointerWidth: 0,
      bracketWidth: 0, bracketTickHeight: 0,
      badgePaddingX: 10, badgePaddingY: 4,
      opacity: 1,
      zIndex: Z_INDEX.ANNOTATION + 10,
    };
    primitives.push(sumBadge);
  }

  // ── Operator Labels ─────────────────────────────────────────────────────

  const operatorY = gridTopY + Math.max(H, kH, outH) * (CELL_SIZE + CELL_GAP) / 2;

  const starLabel: AnnotationPrimitive = {
    kind: "annotation",
    id: "operator-star",
    form: "label",
    x: inputStartX + inputPixelW + GRID_SPACING / 2,
    y: operatorY,
    text: "⊛",
    fontSize: 24,
    textColor: THEME.labelText,
    color: THEME.labelText,
    pointerHeight: 0, pointerWidth: 0,
    bracketWidth: 0, bracketTickHeight: 0,
    badgePaddingX: 0, badgePaddingY: 0,
    opacity: 0.8,
    zIndex: Z_INDEX.ANNOTATION,
  };
  primitives.push(starLabel);

  const equalsLabel: AnnotationPrimitive = {
    kind: "annotation",
    id: "operator-equals",
    form: "label",
    x: kernelStartX + kernelPixelW + GRID_SPACING / 2,
    y: operatorY,
    text: "=",
    fontSize: 24,
    textColor: THEME.labelText,
    color: THEME.labelText,
    pointerHeight: 0, pointerWidth: 0,
    bracketWidth: 0, bracketTickHeight: 0,
    badgePaddingX: 0, badgePaddingY: 0,
    opacity: 0.8,
    zIndex: Z_INDEX.ANNOTATION,
  };
  primitives.push(equalsLabel);

  return { primitives };
}

registerLayout({
  name: "convolution-grid",
  description:
    "Three side-by-side grids (input, kernel, output) for visualizing 2D convolution. " +
    "Highlights the kernel window on the input, shows element-wise products, and fills " +
    "output cells as they are computed.",
  layout: convolutionGridLayout,
});
