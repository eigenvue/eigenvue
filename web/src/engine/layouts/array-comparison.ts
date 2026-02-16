// =============================================================================
// web/src/engine/layouts/array-comparison.ts
//
// Layout for sorting algorithms (Bubble Sort, QuickSort, Merge Sort).
// Extends the array-with-pointers visual language with swap arcs, comparison
// indicators, pivot markers, partition boundaries, and an optional auxiliary
// array row for merge operations.
//
// Self-registers with the layout registry on module load.
//
// Visual action contract:
//   highlightElement  { index: number, color?: string }
//   movePointer       { id: string, to: number }
//   highlightRange    { from: number, to: number, color?: string }
//   dimRange          { from: number, to: number }
//   swapElements      { i: number, j: number }
//   compareElements   { i: number, j: number, result: "gt" | "lt" | "eq" }
//   markPivot         { index: number }
//   setPartition      { index: number }
//   setAuxiliary      { array: (number | null)[] }
//   highlightAuxiliary { index: number, color?: string }
//   showMessage       { text: string, messageType?: "info" | "success" | "error" }
//   markSorted        { indices: number[] }
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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum cell width in CSS pixels. */
const MAX_CELL_WIDTH = 72;

/** Minimum cell width in CSS pixels. Below this, values become unreadable. */
const MIN_CELL_WIDTH = 36;

/** Maximum cell height in CSS pixels. */
const MAX_CELL_HEIGHT = 56;

/** Fraction of usable height allocated to cell height. */
const CELL_HEIGHT_RATIO = 0.14;

/**
 * Vertical position of the MAIN array top edge as a fraction of usable height.
 * 0.35 leaves generous room above for pointers and swap arcs.
 */
const MAIN_ARRAY_VERTICAL_RATIO = 0.35;

/** Gap between main array bottom and auxiliary array top, in CSS pixels. */
const AUX_ARRAY_GAP = 50;

/** Gap between array top edge and pointer tips, in CSS pixels. */
const POINTER_GAP = 14;

/** Height of pointer triangles. */
const POINTER_HEIGHT = 12;

/** Base width of pointer triangles. */
const POINTER_WIDTH = 14;

/** Font size for cell value labels. */
const CELL_LABEL_FONT_SIZE = 15;

/** Font size for index sub-labels below cells. */
const INDEX_LABEL_FONT_SIZE = 11;

/** Font size for pointer name labels above triangles. */
const POINTER_LABEL_FONT_SIZE = 12;

/** Corner radius for cell rounded rectangles. */
const CELL_CORNER_RADIUS = 6;

/** Line width for swap arc connections. */
const SWAP_ARC_LINE_WIDTH = 2.5;

/** Line width for comparison connections. */
const COMPARE_LINE_WIDTH = 2;

/** Partition line dash pattern: [dash, gap]. */
const PARTITION_DASH: number[] = [6, 4];

/** Partition line width. */
const PARTITION_LINE_WIDTH = 1.5;

/**
 * Theme colors for the array-comparison layout.
 *
 * Inherits the base palette from array-with-pointers for visual consistency
 * across all classical algorithm visualizations. Extends with sorting-specific
 * colors: swap arcs, comparison lines, pivot marker.
 */
const THEME = {
  // --- Base (shared with array-with-pointers) ---
  cellDefault: "#1e293b",
  cellStroke: "#475569",
  cellLabel: "#f1f5f9",
  cellSubLabel: "#94a3b8",
  highlight: "#38bdf8",
  highlightAlt: "#818cf8",
  rangeHighlight: "rgba(30, 64, 175, 0.2)",
  dimmed: "#0f172a",
  found: "#22c55e",
  pointer: "#f59e0b",
  pointerLabel: "#fbbf24",
  message: "#cbd5e1",

  // --- Sorting-specific ---
  swapArc: "#f472b6",
  compareLine: "#60a5fa",
  compareResult: "#fbbf24",
  pivot: "#c084fc",
  pivotLabel: "#f5f3ff",
  partition: "rgba(148, 163, 184, 0.3)",
  auxCell: "#1e293b",
  auxCellActive: "#0ea5e9",
  sorted: "#22c55e",
} as const;

// ---------------------------------------------------------------------------
// Color Resolution Helper
// ---------------------------------------------------------------------------

/**
 * Resolves a color name from visual actions to a CSS color string.
 * Supports named theme keys and pass-through of raw CSS color strings.
 *
 * @param colorValue - A theme key (e.g., "highlight") or a CSS color string.
 * @returns A CSS color string.
 */
function resolveColor(colorValue: string): string {
  const themeMap: Record<string, string> = {
    highlight: THEME.highlight,
    highlightAlt: THEME.highlightAlt,
    rangeHighlight: THEME.rangeHighlight,
    dimmed: THEME.dimmed,
    found: THEME.found,
    sorted: THEME.sorted,
    swap: THEME.swapArc,
    pivot: THEME.pivot,
    compare: THEME.compareLine,
  };
  return themeMap[colorValue] ?? colorValue;
}

// ---------------------------------------------------------------------------
// Layout Function
// ---------------------------------------------------------------------------

/**
 * The array-comparison layout function.
 *
 * Expected step.state fields:
 *   - array: number[]                  — The array being sorted.
 *   - auxiliary?: (number | null)[]    — Optional auxiliary/merge buffer.
 *
 * All visual actions are optional. Unknown action types are ignored
 * per the open-vocabulary contract.
 *
 * @param step       - The current Step object.
 * @param canvasSize - Canvas dimensions in CSS pixels.
 * @param _config    - Layout-specific config (reserved for future use).
 * @returns A PrimitiveScene ready for rendering.
 */
function arrayComparisonLayout(
  step: Step,
  canvasSize: CanvasSize,
  _config: Record<string, unknown>,
): PrimitiveScene {
  const primitives: RenderPrimitive[] = [];

  // --- Extract state ---
  const state = step.state as Record<string, unknown>;
  const array: number[] = (state.array as number[]) ?? [];
  const N = array.length;

  if (N === 0) {
    return { primitives: [] };
  }

  // --- Compute geometry ---
  const usableWidth = canvasSize.width - 2 * LAYOUT_PADDING;
  const usableHeight = canvasSize.height - 2 * LAYOUT_PADDING;

  const cellWidth = Math.max(MIN_CELL_WIDTH, Math.min(MAX_CELL_WIDTH, usableWidth / N));
  const cellHeight = Math.min(MAX_CELL_HEIGHT, usableHeight * CELL_HEIGHT_RATIO);
  const totalArrayWidth = cellWidth * N;

  // Center the array horizontally within the usable area.
  const arrayStartX = LAYOUT_PADDING + (usableWidth - totalArrayWidth) / 2;

  // Position the main array vertically.
  const mainArrayTopY = LAYOUT_PADDING + usableHeight * MAIN_ARRAY_VERTICAL_RATIO;

  /**
   * Returns the center X coordinate for the cell at index `i`.
   * Formula: left edge of array + i cells + half a cell.
   */
  const cellCenterX = (i: number): number => arrayStartX + i * cellWidth + cellWidth / 2;

  /** The center Y coordinate for all main array cells (they share a row). */
  const mainCellCenterY = mainArrayTopY + cellHeight / 2;

  // --- Process visual actions ---
  const cellColors = new Array<string>(N).fill(THEME.cellDefault);
  const cellOpacities = new Array<number>(N).fill(1);
  const sortedSet = new Set<number>();
  const pointers = new Map<string, number>();
  const swaps: Array<{ i: number; j: number }> = [];
  const compares: Array<{ i: number; j: number; result: string }> = [];
  let pivotIndex = -1;
  let partitionIndex = -1;
  let auxArray: (number | null)[] | null =
    (state.auxiliary as (number | null)[] | undefined) ?? null;
  const auxColors: Map<number, string> = new Map();
  let messageText = "";
  let messageType: "info" | "success" | "error" = "info";

  for (const action of step.visualActions) {
    const a = action as Record<string, unknown>;

    switch (action.type) {
      case "highlightElement": {
        const idx = a.index as number;
        const color = (a.color as string) ?? "highlight";
        if (idx >= 0 && idx < N) {
          cellColors[idx] = resolveColor(color);
        }
        break;
      }

      case "movePointer": {
        pointers.set(a.id as string, a.to as number);
        break;
      }

      case "highlightRange": {
        const from = a.from as number;
        const to = a.to as number;
        const color = (a.color as string) ?? "rangeHighlight";
        for (let i = Math.max(0, from); i <= Math.min(N - 1, to); i++) {
          if (cellColors[i] === THEME.cellDefault) {
            cellColors[i] = resolveColor(color);
          }
        }
        break;
      }

      case "dimRange": {
        const from = a.from as number;
        const to = a.to as number;
        for (let i = Math.max(0, from); i <= Math.min(N - 1, to); i++) {
          cellColors[i] = THEME.dimmed;
          cellOpacities[i] = 0.4;
        }
        break;
      }

      case "swapElements": {
        const i = a.i as number;
        const j = a.j as number;
        if (i >= 0 && i < N && j >= 0 && j < N && i !== j) {
          swaps.push({ i: Math.min(i, j), j: Math.max(i, j) });
        }
        break;
      }

      case "compareElements": {
        const i = a.i as number;
        const j = a.j as number;
        const result = (a.result as string) ?? "";
        if (i >= 0 && i < N && j >= 0 && j < N) {
          compares.push({ i, j, result });
        }
        break;
      }

      case "markPivot": {
        pivotIndex = a.index as number;
        break;
      }

      case "setPartition": {
        partitionIndex = a.index as number;
        break;
      }

      case "setAuxiliary": {
        auxArray = (a.array as (number | null)[]) ?? null;
        break;
      }

      case "highlightAuxiliary": {
        const idx = a.index as number;
        const color = (a.color as string) ?? "highlight";
        auxColors.set(idx, resolveColor(color));
        break;
      }

      case "markSorted": {
        const indices = (a.indices as number[]) ?? [];
        for (const idx of indices) {
          if (idx >= 0 && idx < N) {
            sortedSet.add(idx);
          }
        }
        break;
      }

      case "showMessage": {
        messageText = (a.text as string) ?? "";
        messageType = (a.messageType as typeof messageType) ?? "info";
        break;
      }

      default:
        // Open vocabulary: ignore unrecognized action types.
        break;
    }
  }

  // Apply sorted coloring (lowest priority — individual highlights override).
  for (const idx of sortedSet) {
    if (cellColors[idx] === THEME.cellDefault) {
      cellColors[idx] = THEME.sorted;
    }
  }

  // --- Emit main array cell elements ---
  for (let i = 0; i < N; i++) {
    const element: ElementPrimitive = {
      kind: "element",
      id: `cell-${i}`,
      x: cellCenterX(i),
      y: mainCellCenterY,
      width: cellWidth - 2,
      height: cellHeight,
      shape: "roundedRect",
      cornerRadius: CELL_CORNER_RADIUS,
      fillColor: cellColors[i]!,
      strokeColor: THEME.cellStroke,
      strokeWidth: 1,
      label: String(array[i]),
      labelFontSize: CELL_LABEL_FONT_SIZE,
      labelColor: THEME.cellLabel,
      subLabel: String(i),
      subLabelFontSize: INDEX_LABEL_FONT_SIZE,
      subLabelColor: THEME.cellSubLabel,
      rotation: 0,
      opacity: cellOpacities[i]!,
      zIndex: Z_INDEX.ELEMENT,
    };
    primitives.push(element);
  }

  // --- Emit swap arcs ---
  for (let s = 0; s < swaps.length; s++) {
    const { i, j } = swaps[s]!;

    /**
     * Swap arc geometry:
     *   Start and end at the top-center of the two cells.
     *   curveOffset is negative (arc curves upward, above the array).
     *   Magnitude scales with horizontal distance for visual clarity.
     *
     *   curveOffset = -(cellWidth × (j - i) × 0.3 + 20)
     *
     *   At minimum distance (j - i = 1): offset = -(cellWidth × 0.3 + 20)
     *   This guarantees a visible arc even for adjacent elements.
     */
    const offset = -(cellWidth * (j - i) * 0.3 + 20);

    const conn: ConnectionPrimitive = {
      kind: "connection",
      id: `swap-arc-${s}`,
      x1: cellCenterX(i),
      y1: mainArrayTopY,
      x2: cellCenterX(j),
      y2: mainArrayTopY,
      curveOffset: offset,
      color: THEME.swapArc,
      lineWidth: SWAP_ARC_LINE_WIDTH,
      dashPattern: [],
      arrowHead: "both",
      arrowSize: 7,
      label: "",
      labelFontSize: 0,
      labelColor: "",
      opacity: 1,
      zIndex: Z_INDEX.CONNECTION,
    };
    primitives.push(conn);
  }

  // --- Emit comparison lines ---
  for (let c = 0; c < compares.length; c++) {
    const { i, j, result } = compares[c]!;

    const resultSymbol =
      result === "gt" || result === "greater"
        ? ">"
        : result === "lt" || result === "less"
          ? "<"
          : result === "eq" || result === "equal"
            ? "="
            : "?";

    const conn: ConnectionPrimitive = {
      kind: "connection",
      id: `compare-line-${c}`,
      x1: cellCenterX(i),
      y1: mainArrayTopY,
      x2: cellCenterX(j),
      y2: mainArrayTopY,
      curveOffset: -(cellWidth * Math.abs(j - i) * 0.2 + 15),
      color: THEME.compareLine,
      lineWidth: COMPARE_LINE_WIDTH,
      dashPattern: [4, 3],
      arrowHead: "none",
      arrowSize: 0,
      label: resultSymbol,
      labelFontSize: 14,
      labelColor: THEME.compareResult,
      opacity: 0.9,
      zIndex: Z_INDEX.CONNECTION,
    };
    primitives.push(conn);
  }

  // --- Emit pointer annotations ---
  const sortedPointers = [...pointers.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  // Stagger pointers that target the same cell.
  const targetGroups = new Map<number, string[]>();
  for (const [id, targetIdx] of sortedPointers) {
    if (!targetGroups.has(targetIdx)) {
      targetGroups.set(targetIdx, []);
    }
    targetGroups.get(targetIdx)!.push(id);
  }

  const STAGGER_OFFSET = POINTER_HEIGHT + POINTER_LABEL_FONT_SIZE + 8;

  for (const [id, targetIdx] of sortedPointers) {
    if (targetIdx < 0 || targetIdx >= N) continue;

    const group = targetGroups.get(targetIdx)!;
    const staggerLevel = group.indexOf(id);

    const tipX = cellCenterX(targetIdx);
    const tipY = mainArrayTopY - POINTER_GAP - staggerLevel * STAGGER_OFFSET;

    const annotation: AnnotationPrimitive = {
      kind: "annotation",
      id: `pointer-${id}`,
      form: "pointer",
      x: tipX,
      y: tipY,
      text: id,
      fontSize: POINTER_LABEL_FONT_SIZE,
      textColor: THEME.pointerLabel,
      color: THEME.pointer,
      pointerHeight: POINTER_HEIGHT,
      pointerWidth: POINTER_WIDTH,
      bracketWidth: 0,
      bracketTickHeight: 0,
      badgePaddingX: 0,
      badgePaddingY: 0,
      opacity: 1,
      zIndex: Z_INDEX.ANNOTATION,
    };
    primitives.push(annotation);
  }

  // --- Pivot badge ---
  if (pivotIndex >= 0 && pivotIndex < N) {
    const badge: AnnotationPrimitive = {
      kind: "annotation",
      id: "badge-pivot",
      form: "badge",
      x: cellCenterX(pivotIndex),
      y: mainArrayTopY + cellHeight + INDEX_LABEL_FONT_SIZE + 24,
      text: "pivot",
      fontSize: 11,
      textColor: THEME.pivotLabel,
      color: THEME.pivot,
      pointerHeight: 0,
      pointerWidth: 0,
      bracketWidth: 0,
      bracketTickHeight: 0,
      badgePaddingX: 8,
      badgePaddingY: 4,
      opacity: 1,
      zIndex: Z_INDEX.ANNOTATION,
    };
    primitives.push(badge);
  }

  // --- Partition boundary ---
  if (partitionIndex >= 0 && partitionIndex < N) {
    /**
     * Partition line position:
     *   X = right edge of the cell at partitionIndex + 1px gap.
     *   Drawn as a dashed vertical line spanning from the pointer area
     *   down through the array.
     */
    const lineX = arrayStartX + (partitionIndex + 1) * cellWidth;
    const lineTopY = mainArrayTopY - POINTER_GAP - STAGGER_OFFSET;
    const lineBottomY = mainArrayTopY + cellHeight + 20;

    const partLine: ConnectionPrimitive = {
      kind: "connection",
      id: "partition-line",
      x1: lineX,
      y1: lineTopY,
      x2: lineX,
      y2: lineBottomY,
      curveOffset: 0,
      color: THEME.partition,
      lineWidth: PARTITION_LINE_WIDTH,
      dashPattern: PARTITION_DASH,
      arrowHead: "none",
      arrowSize: 0,
      label: "",
      labelFontSize: 0,
      labelColor: "",
      opacity: 1,
      zIndex: Z_INDEX.CONNECTION - 1,
    };
    primitives.push(partLine);
  }

  // --- Auxiliary array row (for Merge Sort) ---
  if (auxArray !== null && auxArray.length > 0) {
    const auxTopY = mainArrayTopY + cellHeight + AUX_ARRAY_GAP;
    const auxCenterY = auxTopY + cellHeight / 2;

    // Label for the auxiliary row.
    const auxLabel: AnnotationPrimitive = {
      kind: "annotation",
      id: "aux-label",
      form: "label",
      x: arrayStartX - 10,
      y: auxCenterY,
      text: "aux",
      fontSize: 11,
      textColor: THEME.cellSubLabel,
      color: THEME.cellSubLabel,
      pointerHeight: 0,
      pointerWidth: 0,
      bracketWidth: 0,
      bracketTickHeight: 0,
      badgePaddingX: 0,
      badgePaddingY: 0,
      opacity: 0.7,
      zIndex: Z_INDEX.ANNOTATION,
    };
    primitives.push(auxLabel);

    for (let i = 0; i < auxArray.length && i < N; i++) {
      const val = auxArray[i];
      const hasValue = val !== null && val !== undefined;
      const overrideColor = auxColors.get(i);

      const auxElement: ElementPrimitive = {
        kind: "element",
        id: `aux-cell-${i}`,
        x: cellCenterX(i),
        y: auxCenterY,
        width: cellWidth - 2,
        height: cellHeight,
        shape: "roundedRect",
        cornerRadius: CELL_CORNER_RADIUS,
        fillColor: overrideColor ?? (hasValue ? THEME.auxCellActive : THEME.auxCell),
        strokeColor: THEME.cellStroke,
        strokeWidth: 1,
        label: hasValue ? String(val) : "",
        labelFontSize: CELL_LABEL_FONT_SIZE,
        labelColor: THEME.cellLabel,
        subLabel: "",
        subLabelFontSize: 0,
        subLabelColor: "",
        rotation: 0,
        opacity: hasValue ? 1 : 0.3,
        zIndex: Z_INDEX.ELEMENT,
      };
      primitives.push(auxElement);
    }
  }

  // --- Message ---
  if (messageText !== "") {
    // Resolve message color from the type set during visual-action processing.
    // Use Record lookup to avoid TypeScript narrowing issue (TS2367) — the
    // compiler cannot prove that the for-loop body ever executes the
    // "showMessage" case, so it narrows messageType to its initial "info".
    const MESSAGE_COLORS: Record<string, string> = {
      success: THEME.found,
      error: "#ef4444",
      info: THEME.message,
    };
    const msgColor = MESSAGE_COLORS[messageType] ?? THEME.message;

    const msgLabel: AnnotationPrimitive = {
      kind: "annotation",
      id: "message",
      form: "label",
      x: canvasSize.width / 2,
      y: canvasSize.height - LAYOUT_PADDING - 10,
      text: messageText,
      fontSize: 14,
      textColor: msgColor,
      color: msgColor,
      pointerHeight: 0,
      pointerWidth: 0,
      bracketWidth: 0,
      bracketTickHeight: 0,
      badgePaddingX: 0,
      badgePaddingY: 0,
      opacity: 1,
      zIndex: Z_INDEX.ANNOTATION,
    };
    primitives.push(msgLabel);
  }

  return { primitives };
}

// ---------------------------------------------------------------------------
// Self-Registration
// ---------------------------------------------------------------------------

registerLayout({
  name: "array-comparison",
  description:
    "Array layout with swap arcs, comparison indicators, pivot markers, " +
    "partition lines, and optional auxiliary array. Used by sorting algorithms.",
  layout: arrayComparisonLayout,
});
