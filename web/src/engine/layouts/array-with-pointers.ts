// =============================================================================
// web/src/engine/layouts/array-with-pointers.ts
//
// Layout for array-based algorithms with named pointers (binary search,
// linear search). Renders array cells as rounded rectangles with value
// labels, index sub-labels, and triangular pointer annotations.
//
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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum cell width in CSS pixels. Prevents excessively wide cells on large canvases. */
const MAX_CELL_WIDTH = 80;

/** Maximum cell height in CSS pixels. */
const MAX_CELL_HEIGHT = 60;

/** Minimum cell width. Below this, values become unreadable. */
const MIN_CELL_WIDTH = 36;

/** Ratio of the usable height allocated to cell height. */
const CELL_HEIGHT_RATIO = 0.18;

/**
 * Vertical position of the array's top edge within the usable area,
 * as a ratio of usable height. 0.45 places it just above center,
 * leaving room for pointers above and sub-labels below.
 */
const ARRAY_VERTICAL_RATIO = 0.45;

/** Gap between the array top edge and pointer tips, in CSS pixels. */
const POINTER_GAP = 14;

/** Height of pointer triangles. */
const POINTER_HEIGHT = 12;

/** Base width of pointer triangles. */
const POINTER_WIDTH = 14;

/** Font size for cell value labels. */
const CELL_LABEL_FONT_SIZE = 16;

/** Font size for index sub-labels. */
const INDEX_LABEL_FONT_SIZE = 11;

/** Font size for pointer name labels. */
const POINTER_LABEL_FONT_SIZE = 12;

/** Corner radius for cell rounded rectangles. */
const CELL_CORNER_RADIUS = 6;

/** Gap between the cell bottom edge and index sub-labels. */
const SUBLABEL_GAP = 6;

/** Theme colors. See Visual Specification above. */
const THEME = {
  cellDefault: "#1e293b",
  cellStroke: "#475569",
  cellLabel: "#f1f5f9",
  cellSubLabel: "#94a3b8",
  highlight: "#38bdf8",
  highlightAlt: "#818cf8",
  rangeHighlight: "rgba(30, 64, 175, 0.2)",
  dimmed: "#0f172a",
  found: "#22c55e",
  notFound: "#ef4444",
  pointer: "#f59e0b",
  pointerLabel: "#fbbf24",
  message: "#cbd5e1",
} as const;

// ---------------------------------------------------------------------------
// Layout Function
// ---------------------------------------------------------------------------

/**
 * The array-with-pointers layout function.
 *
 * Expected step.state fields:
 *   - array: number[]    — The array being visualized.
 *
 * Expected visual actions (all optional):
 *   - highlightElement { index, color? }
 *   - movePointer { id, to }
 *   - highlightRange { from, to, color? }
 *   - dimRange { from, to }
 *   - markFound { index }
 *   - markNotFound
 *   - showMessage { text, type? }
 *
 * @param step       - The current Step object.
 * @param canvasSize - Canvas dimensions in CSS pixels.
 * @param _config    - Layout-specific config (unused for this layout currently).
 * @returns A PrimitiveScene.
 */
function arrayWithPointersLayout(
  step: Step,
  canvasSize: CanvasSize,
  _config: Record<string, unknown>,
): PrimitiveScene {
  const primitives: RenderPrimitive[] = [];

  // -- Extract array from state --
  const array: number[] = ((step.state as Record<string, unknown>).array as number[]) ?? [];
  const N = array.length;

  if (N === 0) {
    return { primitives: [] };
  }

  // -- Compute geometry --
  const usableWidth = canvasSize.width - 2 * LAYOUT_PADDING;
  const usableHeight = canvasSize.height - 2 * LAYOUT_PADDING;

  const cellWidth = Math.max(MIN_CELL_WIDTH, Math.min(MAX_CELL_WIDTH, usableWidth / N));
  const cellHeight = Math.min(MAX_CELL_HEIGHT, usableHeight * CELL_HEIGHT_RATIO);
  const totalArrayWidth = cellWidth * N;

  // Center the array horizontally.
  const arrayStartX = LAYOUT_PADDING + (usableWidth - totalArrayWidth) / 2;

  // Position the array vertically.
  const arrayTopY = LAYOUT_PADDING + usableHeight * ARRAY_VERTICAL_RATIO;

  // Helper: center coordinates for cell at index i.
  const cellCenterX = (i: number): number => arrayStartX + i * cellWidth + cellWidth / 2;
  const cellCenterY = arrayTopY + cellHeight / 2;

  // -- Process visual actions to determine per-cell state --
  const cellColors = new Array<string>(N).fill(THEME.cellDefault);
  const cellOpacities = new Array<number>(N).fill(1);
  const pointers = new Map<string, number>(); // pointer id → array index
  let foundIndex = -1;
  let notFoundFlag = false;
  let messageText = "";
  let messageType: "info" | "success" | "error" = "info";

  for (const action of step.visualActions) {
    switch (action.type) {
      case "highlightElement": {
        const idx = (action as Record<string, unknown>).index as number;
        const color = ((action as Record<string, unknown>).color as string) ?? "highlight";
        if (idx >= 0 && idx < N) {
          cellColors[idx] = resolveColor(color);
        }
        break;
      }

      case "movePointer": {
        const id = (action as Record<string, unknown>).id as string;
        const to = (action as Record<string, unknown>).to as number;
        pointers.set(id, to);
        break;
      }

      case "highlightRange": {
        const from = (action as Record<string, unknown>).from as number;
        const to = (action as Record<string, unknown>).to as number;
        const color = ((action as Record<string, unknown>).color as string) ?? "rangeHighlight";
        for (let i = Math.max(0, from); i <= Math.min(N - 1, to); i++) {
          // Only apply range highlight if cell hasn't been individually highlighted.
          if (cellColors[i] === THEME.cellDefault) {
            cellColors[i] = resolveColor(color);
          }
        }
        break;
      }

      case "dimRange": {
        const from = (action as Record<string, unknown>).from as number;
        const to = (action as Record<string, unknown>).to as number;
        for (let i = Math.max(0, from); i <= Math.min(N - 1, to); i++) {
          cellColors[i] = THEME.dimmed;
          cellOpacities[i] = 0.4;
        }
        break;
      }

      case "markFound": {
        const idx = (action as Record<string, unknown>).index as number;
        if (idx >= 0 && idx < N) {
          cellColors[idx] = THEME.found;
          foundIndex = idx;
        }
        break;
      }

      case "markNotFound": {
        notFoundFlag = true;
        break;
      }

      case "showMessage": {
        messageText = ((action as Record<string, unknown>).text as string) ?? "";
        messageType =
          ((action as Record<string, unknown>).messageType as typeof messageType) ?? "info";
        break;
      }

      default:
        // Unknown action type — ignore (open vocabulary contract).
        break;
    }
  }

  // -- Create Element primitives for each array cell --
  for (let i = 0; i < N; i++) {
    const element: ElementPrimitive = {
      kind: "element",
      id: `cell-${i}`,
      x: cellCenterX(i),
      y: cellCenterY,
      width: cellWidth - 2, // 2px gap between cells
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

  // -- Create Annotation primitives for pointers --
  // Sort pointer entries for deterministic rendering order.
  const sortedPointers = [...pointers.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  // When multiple pointers target the same cell, stagger them vertically.
  // Build a map of targetIndex → list of pointer IDs to compute stagger offsets.
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

    // Determine stagger level (0 = closest to array, higher = farther above).
    const group = targetGroups.get(targetIdx)!;
    const staggerLevel = group.indexOf(id);

    const tipX = cellCenterX(targetIdx);
    const tipY = arrayTopY - POINTER_GAP - staggerLevel * STAGGER_OFFSET;

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

  // -- "Found" badge --
  if (foundIndex >= 0) {
    const badge: AnnotationPrimitive = {
      kind: "annotation",
      id: "badge-found",
      form: "badge",
      x: cellCenterX(foundIndex),
      y: arrayTopY + cellHeight + SUBLABEL_GAP + INDEX_LABEL_FONT_SIZE + 20,
      text: "Found!",
      fontSize: 13,
      textColor: "#ffffff",
      color: THEME.found,
      pointerHeight: 0,
      pointerWidth: 0,
      bracketWidth: 0,
      bracketTickHeight: 0,
      badgePaddingX: 10,
      badgePaddingY: 5,
      opacity: 1,
      zIndex: Z_INDEX.ANNOTATION,
    };
    primitives.push(badge);
  }

  // -- "Not Found" label --
  if (notFoundFlag) {
    const label: AnnotationPrimitive = {
      kind: "annotation",
      id: "label-not-found",
      form: "label",
      x: canvasSize.width / 2,
      y: arrayTopY + cellHeight + SUBLABEL_GAP + INDEX_LABEL_FONT_SIZE + 30,
      text: "Target Not Found",
      fontSize: 16,
      textColor: THEME.notFound,
      color: THEME.notFound,
      pointerHeight: 0,
      pointerWidth: 0,
      bracketWidth: 0,
      bracketTickHeight: 0,
      badgePaddingX: 0,
      badgePaddingY: 0,
      opacity: 1,
      zIndex: Z_INDEX.ANNOTATION,
    };
    primitives.push(label);
  }

  // -- Message --
  if (messageText !== "") {
    const mt = messageType as "info" | "success" | "error";
    const msgColor: string =
      mt === "success" ? THEME.found : mt === "error" ? THEME.notFound : THEME.message;

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
// Color Resolution Helper
// ---------------------------------------------------------------------------

/**
 * Resolves a color name from visual actions to a CSS color string.
 * Supports both named theme keys and raw CSS color strings.
 */
function resolveColor(colorValue: string): string {
  const themeMap: Record<string, string> = {
    highlight: THEME.highlight,
    highlightAlt: THEME.highlightAlt,
    rangeHighlight: THEME.rangeHighlight,
    dimmed: THEME.dimmed,
    found: THEME.found,
    notFound: THEME.notFound,
  };

  return themeMap[colorValue] ?? colorValue;
}

// ---------------------------------------------------------------------------
// Self-Registration
// ---------------------------------------------------------------------------

registerLayout({
  name: "array-with-pointers",
  description:
    "Horizontal array of cells with named pointer annotations. " +
    "Used by binary search, linear search, and similar array algorithms.",
  layout: arrayWithPointersLayout,
});
