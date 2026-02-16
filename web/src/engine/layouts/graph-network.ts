// =============================================================================
// web/src/engine/layouts/graph-network.ts
//
// Layout for graph algorithms (BFS, DFS, Dijkstra). Renders nodes as circles,
// edges as lines/arcs with optional arrowheads and weight labels. Supports
// node visitation coloring, edge highlighting, path tracing, and auxiliary
// data structure displays (queue, stack, priority queue, distance table).
//
// All generators SHOULD provide fixed (x, y) positions for deterministic,
// reproducible layouts. A circular fallback is provided for nodes without
// positions.
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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Node circle radius in CSS pixels. */
const NODE_RADIUS = 24;

/** Font size for node labels. */
const NODE_LABEL_FONT_SIZE = 15;

/** Font size for node sub-labels (distances, etc.). */
const NODE_SUB_LABEL_FONT_SIZE = 10;

/** Default edge line width. */
const EDGE_LINE_WIDTH = 2;

/** Highlighted/traversed edge line width. */
const EDGE_HIGHLIGHT_LINE_WIDTH = 3;

/** Path edge line width (result path). */
const EDGE_PATH_LINE_WIDTH = 3.5;

/** Arrowhead size for directed edges. */
const ARROW_SIZE = 10;

/** Edge weight label font size. */
const EDGE_WEIGHT_FONT_SIZE = 12;

/** Padding inside the graph area (prevents nodes from touching canvas edges). */
const GRAPH_PADDING = 40;

/** Height reserved for the data structure display at the bottom. */
const DATA_STRUCTURE_HEIGHT = 60;

/** Glow ring radius extension beyond the node. */
const GLOW_RING_EXTENSION = 6;

/** Glow ring line width. */
const GLOW_RING_LINE_WIDTH = 3;

/**
 * When two nodes have edges in both directions (A→B and B→A),
 * the edges are offset by this amount perpendicular to the line
 * to avoid overlap.
 *
 * Mathematical basis: for a bidirectional pair, each edge is shifted
 * ±BIDIRECTIONAL_OFFSET from the center line, creating visual separation.
 */
const BIDIRECTIONAL_OFFSET = 12;

const THEME = {
  // --- Node colors ---
  nodeDefault:   "#1e293b",
  nodeStroke:    "#475569",
  nodeLabel:     "#f1f5f9",
  nodeSubLabel:  "#94a3b8",
  nodeVisited:   "#38bdf8",
  nodeCurrent:   "#fbbf24",
  nodeInQueue:   "#818cf8",
  nodePath:      "#22c55e",
  nodeStart:     "#f59e0b",

  // --- Edge colors ---
  edgeDefault:   "#475569",
  edgeHighlight: "#60a5fa",
  edgePath:      "#22c55e",
  edgeWeight:    "#94a3b8",
  edgeArrow:     "#64748b",

  // --- Data structure display ---
  dsBackground:  "rgba(12, 16, 33, 0.8)",
  dsBorder:      "rgba(160, 168, 192, 0.15)",
  dsLabel:       "#94a3b8",
  dsItemBg:      "#1e293b",
  dsItemText:    "#f1f5f9",

  // --- General ---
  message:       "#cbd5e1",
  glowRing:      "rgba(251, 191, 36, 0.3)",
} as const;

// ---------------------------------------------------------------------------
// Helper Types
// ---------------------------------------------------------------------------

interface NodeInfo {
  id: string;
  label: string;
  pixelX: number;
  pixelY: number;
  color: string;
  subLabel: string;
  opacity: number;
  isCurrent: boolean;
  isOnPath: boolean;
}

interface EdgeInfo {
  from: string;
  to: string;
  weight: number | null;
  directed: boolean;
  color: string;
  lineWidth: number;
  isOnPath: boolean;
}

// ---------------------------------------------------------------------------
// Color Resolution
// ---------------------------------------------------------------------------

function resolveNodeColor(colorValue: string): string {
  const map: Record<string, string> = {
    visited:  THEME.nodeVisited,
    current:  THEME.nodeCurrent,
    inQueue:  THEME.nodeInQueue,
    path:     THEME.nodePath,
    start:    THEME.nodeStart,
    default:  THEME.nodeDefault,
  };
  return map[colorValue] ?? colorValue;
}

function resolveEdgeColor(colorValue: string): string {
  const map: Record<string, string> = {
    highlight: THEME.edgeHighlight,
    path:      THEME.edgePath,
    default:   THEME.edgeDefault,
  };
  return map[colorValue] ?? colorValue;
}

// ---------------------------------------------------------------------------
// Layout Function
// ---------------------------------------------------------------------------

/**
 * The graph-network layout function.
 *
 * Expected step.state fields:
 *   - nodes: Array<{ id, label?, x?, y? }>
 *   - edges: Array<{ from, to, weight?, directed? }>
 *   - dataStructure?: { type, label, items }
 *   - distances?: Record<string, number | "∞">
 *   - predecessors?: Record<string, string | null>
 *
 * @param step       - The current Step object.
 * @param canvasSize - Canvas dimensions in CSS pixels.
 * @param _config    - Layout-specific config (reserved for future use).
 * @returns A PrimitiveScene ready for rendering.
 */
function graphNetworkLayout(
  step: Step,
  canvasSize: CanvasSize,
  _config: Record<string, unknown>,
): PrimitiveScene {
  const primitives: RenderPrimitive[] = [];
  const state = step.state as Record<string, unknown>;

  // --- Extract graph data from state ---
  const rawNodes = (state.nodes as Array<Record<string, unknown>>) ?? [];
  const rawEdges = (state.edges as Array<Record<string, unknown>>) ?? [];
  const dataStructure = state.dataStructure as
    | { type: string; label: string; items: string[] }
    | undefined;
  const distances = (state.distances as Record<string, number | string>) ?? {};

  if (rawNodes.length === 0) {
    return { primitives: [] };
  }

  // --- Compute drawing area ---
  const usableWidth = canvasSize.width - 2 * LAYOUT_PADDING;
  const usableHeight = canvasSize.height - 2 * LAYOUT_PADDING;

  const hasDsDisplay = dataStructure !== undefined || Object.keys(distances).length > 0;
  const dsReserved = hasDsDisplay ? DATA_STRUCTURE_HEIGHT : 0;

  const graphAreaWidth = usableWidth - 2 * GRAPH_PADDING;
  const graphAreaHeight = usableHeight - 2 * GRAPH_PADDING - dsReserved;
  const graphOriginX = LAYOUT_PADDING + GRAPH_PADDING;
  const graphOriginY = LAYOUT_PADDING + GRAPH_PADDING;

  // --- Build node info with pixel positions ---
  const N = rawNodes.length;
  const nodeMap = new Map<string, NodeInfo>();

  for (let k = 0; k < N; k++) {
    const raw = rawNodes[k]!;
    const id = raw.id as string;

    // Resolve normalized position → pixel position.
    let normX = raw.x as number | undefined;
    let normY = raw.y as number | undefined;

    if (normX === undefined || normY === undefined) {
      // Circular fallback layout.
      // angle = 2π × k / N - π/2  (start at top, clockwise)
      const angle = (2 * Math.PI * k) / N - Math.PI / 2;
      normX = 0.5 + 0.4 * Math.cos(angle);
      normY = 0.5 + 0.4 * Math.sin(angle);
    }

    const pixelX = graphOriginX + normX * graphAreaWidth;
    const pixelY = graphOriginY + normY * graphAreaHeight;

    nodeMap.set(id, {
      id,
      label: (raw.label as string) ?? id,
      pixelX,
      pixelY,
      color: THEME.nodeDefault,
      subLabel: "",
      opacity: 1,
      isCurrent: false,
      isOnPath: false,
    });
  }

  // --- Build edge info ---
  const edgeInfos: EdgeInfo[] = rawEdges.map((raw) => ({
    from: raw.from as string,
    to: raw.to as string,
    weight: (raw.weight as number) ?? null,
    directed: (raw.directed as boolean) ?? false,
    color: THEME.edgeDefault,
    lineWidth: EDGE_LINE_WIDTH,
    isOnPath: false,
  }));

  // Build a set of edge keys for bidirectional detection.
  // Key format: "A->B" — if both "A->B" and "B->A" exist, they are bidirectional.
  const edgeKeySet = new Set<string>();
  for (const e of edgeInfos) {
    edgeKeySet.add(`${e.from}->${e.to}`);
  }

  // --- Process visual actions ---
  let currentNodeId: string | null = null;
  const pathNodeSet = new Set<string>();
  const pathEdgeSet = new Set<string>(); // "from->to"

  for (const action of step.visualActions) {
    const a = action as Record<string, unknown>;

    switch (action.type) {
      case "visitNode": {
        const nodeId = a.nodeId as string;
        const color = (a.color as string) ?? "visited";
        const node = nodeMap.get(nodeId);
        if (node) {
          node.color = resolveNodeColor(color);
        }
        break;
      }

      case "highlightEdge": {
        const from = a.from as string;
        const to = a.to as string;
        const color = (a.color as string) ?? "highlight";
        for (const e of edgeInfos) {
          // Match edge in either direction for undirected graphs.
          if (
            (e.from === from && e.to === to) ||
            (!e.directed && e.from === to && e.to === from)
          ) {
            e.color = resolveEdgeColor(color);
            e.lineWidth = EDGE_HIGHLIGHT_LINE_WIDTH;
          }
        }
        break;
      }

      case "updateNodeValue": {
        const nodeId = a.nodeId as string;
        const value = a.value as string | number;
        const node = nodeMap.get(nodeId);
        if (node) {
          node.subLabel = String(value);
        }
        break;
      }

      case "setCurrentNode": {
        currentNodeId = a.nodeId as string;
        const node = nodeMap.get(currentNodeId);
        if (node) {
          node.isCurrent = true;
          node.color = THEME.nodeCurrent;
        }
        break;
      }

      case "markPath": {
        const nodeIds = (a.nodeIds as string[]) ?? [];
        for (const nid of nodeIds) {
          pathNodeSet.add(nid);
          const node = nodeMap.get(nid);
          if (node) {
            node.isOnPath = true;
            node.color = THEME.nodePath;
          }
        }
        // Mark edges along the path.
        for (let p = 0; p < nodeIds.length - 1; p++) {
          const fromId = nodeIds[p]!;
          const toId = nodeIds[p + 1]!;
          pathEdgeSet.add(`${fromId}->${toId}`);
          pathEdgeSet.add(`${toId}->${fromId}`); // Mark both directions.
          for (const e of edgeInfos) {
            if (
              (e.from === fromId && e.to === toId) ||
              (e.from === toId && e.to === fromId)
            ) {
              e.color = THEME.edgePath;
              e.lineWidth = EDGE_PATH_LINE_WIDTH;
              e.isOnPath = true;
            }
          }
        }
        break;
      }

      case "updateDistance": {
        const nodeId = a.nodeId as string;
        const value = a.value as string | number;
        const node = nodeMap.get(nodeId);
        if (node) {
          node.subLabel = String(value);
        }
        break;
      }

      case "showMessage": {
        // Handled separately below.
        break;
      }

      default:
        break;
    }
  }

  // Apply distance values as sub-labels (if not already set by updateNodeValue).
  for (const [nodeId, dist] of Object.entries(distances)) {
    const node = nodeMap.get(nodeId);
    if (node && node.subLabel === "") {
      node.subLabel = String(dist);
    }
  }

  // --- Emit edge primitives ---
  // Edges are drawn first (lower z-index) so nodes render on top.
  for (let eIdx = 0; eIdx < edgeInfos.length; eIdx++) {
    const e = edgeInfos[eIdx]!;
    const fromNode = nodeMap.get(e.from);
    const toNode = nodeMap.get(e.to);
    if (!fromNode || !toNode) continue;

    // Check for bidirectional pair and apply offset.
    const reverseKey = `${e.to}->${e.from}`;
    const isBidirectional = edgeKeySet.has(reverseKey) && e.from !== e.to;

    let curveOffset = 0;
    if (isBidirectional) {
      // Only one direction gets positive offset, the other negative.
      // Use string comparison to deterministically assign sides.
      curveOffset = e.from < e.to ? BIDIRECTIONAL_OFFSET : -BIDIRECTIONAL_OFFSET;
    }

    /**
     * Edge endpoint adjustment:
     * The edge should start/end at the node's circle boundary, not its center.
     * We shorten the line by NODE_RADIUS in the direction of the other node.
     *
     * For a straight edge from P1 to P2:
     *   direction = (P2 - P1) / |P2 - P1|
     *   adjustedP1 = P1 + direction × NODE_RADIUS
     *   adjustedP2 = P2 - direction × NODE_RADIUS
     */
    const dx = toNode.pixelX - fromNode.pixelX;
    const dy = toNode.pixelY - fromNode.pixelY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Avoid division by zero for self-loops or overlapping nodes.
    if (dist < 1) continue;

    const dirX = dx / dist;
    const dirY = dy / dist;

    const x1 = fromNode.pixelX + dirX * NODE_RADIUS;
    const y1 = fromNode.pixelY + dirY * NODE_RADIUS;
    const x2 = toNode.pixelX - dirX * NODE_RADIUS;
    const y2 = toNode.pixelY - dirY * NODE_RADIUS;

    const conn: ConnectionPrimitive = {
      kind: "connection",
      id: `edge-${e.from}-${e.to}`,
      x1,
      y1,
      x2,
      y2,
      curveOffset,
      color: e.color,
      lineWidth: e.lineWidth,
      dashPattern: [],
      arrowHead: e.directed ? "end" : "none",
      arrowSize: ARROW_SIZE,
      label: e.weight !== null ? String(e.weight) : "",
      labelFontSize: EDGE_WEIGHT_FONT_SIZE,
      labelColor: THEME.edgeWeight,
      opacity: 1,
      zIndex: Z_INDEX.CONNECTION,
    };
    primitives.push(conn);
  }

  // --- Emit node primitives ---
  for (const node of nodeMap.values()) {
    // Glow ring for current node.
    if (node.isCurrent) {
      const glow: ElementPrimitive = {
        kind: "element",
        id: `glow-${node.id}`,
        x: node.pixelX,
        y: node.pixelY,
        width: (NODE_RADIUS + GLOW_RING_EXTENSION) * 2,
        height: (NODE_RADIUS + GLOW_RING_EXTENSION) * 2,
        shape: "circle",
        cornerRadius: 0,
        fillColor: "transparent",
        strokeColor: THEME.glowRing,
        strokeWidth: GLOW_RING_LINE_WIDTH,
        label: "",
        labelFontSize: 0,
        labelColor: "",
        subLabel: "",
        subLabelFontSize: 0,
        subLabelColor: "",
        rotation: 0,
        opacity: 1,
        zIndex: Z_INDEX.ELEMENT - 1,
      };
      primitives.push(glow);
    }

    const element: ElementPrimitive = {
      kind: "element",
      id: `node-${node.id}`,
      x: node.pixelX,
      y: node.pixelY,
      width: NODE_RADIUS * 2,
      height: NODE_RADIUS * 2,
      shape: "circle",
      cornerRadius: 0,
      fillColor: node.color,
      strokeColor: THEME.nodeStroke,
      strokeWidth: 2,
      label: node.label,
      labelFontSize: NODE_LABEL_FONT_SIZE,
      labelColor: THEME.nodeLabel,
      subLabel: node.subLabel,
      subLabelFontSize: NODE_SUB_LABEL_FONT_SIZE,
      subLabelColor: THEME.nodeSubLabel,
      rotation: 0,
      opacity: node.opacity,
      zIndex: Z_INDEX.ELEMENT,
    };
    primitives.push(element);
  }

  // --- Data structure display (queue/stack/priority queue) ---
  if (dataStructure) {
    const dsY = canvasSize.height - LAYOUT_PADDING - dsReserved + 10;
    const dsX = LAYOUT_PADDING + 10;

    // Label
    const dsLbl: AnnotationPrimitive = {
      kind: "annotation",
      id: "ds-label",
      form: "label",
      x: dsX + 30,
      y: dsY + 12,
      text: `${dataStructure.label}:`,
      fontSize: 12,
      textColor: THEME.dsLabel,
      color: THEME.dsLabel,
      pointerHeight: 0,
      pointerWidth: 0,
      bracketWidth: 0,
      bracketTickHeight: 0,
      badgePaddingX: 0,
      badgePaddingY: 0,
      opacity: 1,
      zIndex: Z_INDEX.ANNOTATION,
    };
    primitives.push(dsLbl);

    // Items as badges
    const ITEM_WIDTH = 36;
    const ITEM_GAP = 4;
    const itemsStartX = dsX + 70;

    for (let di = 0; di < dataStructure.items.length; di++) {
      const item = dataStructure.items[di]!;
      const itemBadge: AnnotationPrimitive = {
        kind: "annotation",
        id: `ds-item-${di}`,
        form: "badge",
        x: itemsStartX + di * (ITEM_WIDTH + ITEM_GAP) + ITEM_WIDTH / 2,
        y: dsY + 12,
        text: item,
        fontSize: 12,
        textColor: THEME.dsItemText,
        color: THEME.dsItemBg,
        pointerHeight: 0,
        pointerWidth: 0,
        bracketWidth: 0,
        bracketTickHeight: 0,
        badgePaddingX: 8,
        badgePaddingY: 4,
        opacity: 1,
        zIndex: Z_INDEX.ANNOTATION,
      };
      primitives.push(itemBadge);
    }
  }

  // --- Distance table display ---
  if (Object.keys(distances).length > 0 && !dataStructure) {
    const dsY = canvasSize.height - LAYOUT_PADDING - dsReserved + 10;
    const dsX = LAYOUT_PADDING + 10;

    const distLabel: AnnotationPrimitive = {
      kind: "annotation",
      id: "dist-label",
      form: "label",
      x: dsX + 40,
      y: dsY + 12,
      text: "Distances:",
      fontSize: 12,
      textColor: THEME.dsLabel,
      color: THEME.dsLabel,
      pointerHeight: 0,
      pointerWidth: 0,
      bracketWidth: 0,
      bracketTickHeight: 0,
      badgePaddingX: 0,
      badgePaddingY: 0,
      opacity: 1,
      zIndex: Z_INDEX.ANNOTATION,
    };
    primitives.push(distLabel);

    const entries = Object.entries(distances).sort((a, b) => a[0].localeCompare(b[0]));
    const ENTRY_WIDTH = 50;
    const startX = dsX + 90;

    for (let di = 0; di < entries.length; di++) {
      const [nodeId, distVal] = entries[di]!;
      const entryBadge: AnnotationPrimitive = {
        kind: "annotation",
        id: `dist-entry-${di}`,
        form: "badge",
        x: startX + di * ENTRY_WIDTH + ENTRY_WIDTH / 2,
        y: dsY + 12,
        text: `${nodeId}=${distVal}`,
        fontSize: 11,
        textColor: THEME.dsItemText,
        color: THEME.dsItemBg,
        pointerHeight: 0,
        pointerWidth: 0,
        bracketWidth: 0,
        bracketTickHeight: 0,
        badgePaddingX: 6,
        badgePaddingY: 3,
        opacity: 1,
        zIndex: Z_INDEX.ANNOTATION,
      };
      primitives.push(entryBadge);
    }
  }

  // --- Message ---
  for (const action of step.visualActions) {
    if (action.type === "showMessage") {
      const a = action as Record<string, unknown>;
      const text = (a.text as string) ?? "";
      const msgType = (a.messageType as string) ?? "info";
      if (text === "") continue;

      const msgColor =
        msgType === "success" ? "#22c55e" :
        msgType === "error"   ? "#ef4444" :
        THEME.message;

      const msgLabel: AnnotationPrimitive = {
        kind: "annotation",
        id: "message",
        form: "label",
        x: canvasSize.width / 2,
        y: canvasSize.height - LAYOUT_PADDING - 10,
        text,
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
        zIndex: Z_INDEX.ANNOTATION + 1,
      };
      primitives.push(msgLabel);
    }
  }

  return { primitives };
}

// ---------------------------------------------------------------------------
// Self-Registration
// ---------------------------------------------------------------------------

registerLayout({
  name: "graph-network",
  description:
    "Graph layout with nodes (circles) and edges (lines/arcs). Supports " +
    "directed/undirected graphs, weighted edges, node visitation, path " +
    "highlighting, and auxiliary data structure displays.",
  layout: graphNetworkLayout,
});
