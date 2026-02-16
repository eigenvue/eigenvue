/**
 * @fileoverview Tests for graph-network layout.
 *
 * Validates that the graph-network layout:
 * - Renders nodes as circle elements with correct labels
 * - Renders edges as connection primitives between nodes
 * - Handles all visual actions (visitNode, highlightEdge, setCurrentNode, markPath, etc.)
 * - Displays data structures (queue, stack, priority queue)
 * - Displays distance tables
 * - Handles edge cases (empty graphs, single nodes, self-loops)
 * - Produces stable IDs for animation diffing
 */

import { describe, it, expect, beforeEach } from "vitest";
import { getLayout } from "../layouts/registry";
import type {
  Step,
  CanvasSize,
  LayoutFunction,
  ElementPrimitive,
  ConnectionPrimitive,
  AnnotationPrimitive,
} from "../types";

// Import the layout module to trigger self-registration.
import "../layouts/graph-network";

const mockCanvasSize: CanvasSize = { width: 800, height: 600 };

/** Helper: create a Step with the given overrides. */
function makeStep({ state, ...rest }: Partial<Step> & { state: Record<string, unknown> }): Step {
  return {
    index: 0,
    id: "test-step",
    title: "Test Step",
    explanation: "Test explanation.",
    state,
    visualActions: [],
    codeHighlight: { language: "pseudocode", lines: [] },
    isTerminal: false,
    ...rest,
  };
}

/** Standard 3-node triangle graph for testing. */
const triangleNodes = [
  { id: "A", label: "A", x: 0.2, y: 0.2 },
  { id: "B", label: "B", x: 0.8, y: 0.2 },
  { id: "C", label: "C", x: 0.5, y: 0.8 },
];

const triangleEdges = [
  { from: "A", to: "B", directed: false },
  { from: "B", to: "C", directed: false },
  { from: "A", to: "C", directed: false },
];

describe("graph-network layout", () => {
  let layout: LayoutFunction;

  beforeEach(() => {
    layout = getLayout("graph-network")!;
    expect(layout).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // Basic rendering
  // ---------------------------------------------------------------------------

  describe("basic rendering", () => {
    it("returns empty scene for empty nodes array", () => {
      const step = makeStep({ state: { nodes: [], edges: [] } });
      const scene = layout(step, mockCanvasSize, {});
      expect(scene.primitives).toEqual([]);
    });

    it("renders a single node as a circle element", () => {
      const step = makeStep({
        state: {
          nodes: [{ id: "A", label: "A", x: 0.5, y: 0.5 }],
          edges: [],
        },
      });
      const scene = layout(step, mockCanvasSize, {});

      const node = scene.primitives.find((p) => p.id === "node-A") as ElementPrimitive;
      expect(node).toBeDefined();
      expect(node.kind).toBe("element");
      expect(node.shape).toBe("circle");
      expect(node.label).toBe("A");
    });

    it("renders 3 nodes with correct IDs and labels", () => {
      const step = makeStep({
        state: { nodes: triangleNodes, edges: [] },
      });
      const scene = layout(step, mockCanvasSize, {});

      const nodes = scene.primitives.filter(
        (p) => p.kind === "element" && p.id.startsWith("node-"),
      ) as ElementPrimitive[];
      expect(nodes).toHaveLength(3);

      for (const n of triangleNodes) {
        const rendered = nodes.find((p) => p.id === `node-${n.id}`);
        expect(rendered).toBeDefined();
        expect((rendered as ElementPrimitive).label).toBe(n.label);
      }
    });

    it("renders edges as connection primitives", () => {
      const step = makeStep({
        state: { nodes: triangleNodes, edges: triangleEdges },
      });
      const scene = layout(step, mockCanvasSize, {});

      const connections = scene.primitives.filter(
        (p) => p.kind === "connection" && p.id.startsWith("edge-"),
      ) as ConnectionPrimitive[];
      expect(connections).toHaveLength(3);
    });

    it("renders directed edges with arrowheads", () => {
      const step = makeStep({
        state: {
          nodes: [
            { id: "A", label: "A", x: 0.2, y: 0.5 },
            { id: "B", label: "B", x: 0.8, y: 0.5 },
          ],
          edges: [{ from: "A", to: "B", directed: true }],
        },
      });
      const scene = layout(step, mockCanvasSize, {});

      const edge = scene.primitives.find((p) => p.id === "edge-A-B") as ConnectionPrimitive;
      expect(edge).toBeDefined();
      expect(edge.arrowHead).toBe("end");
    });

    it("renders undirected edges without arrowheads", () => {
      const step = makeStep({
        state: {
          nodes: [
            { id: "A", label: "A", x: 0.2, y: 0.5 },
            { id: "B", label: "B", x: 0.8, y: 0.5 },
          ],
          edges: [{ from: "A", to: "B", directed: false }],
        },
      });
      const scene = layout(step, mockCanvasSize, {});

      const edge = scene.primitives.find((p) => p.id === "edge-A-B") as ConnectionPrimitive;
      expect(edge.arrowHead).toBe("none");
    });

    it("renders weighted edges with weight label", () => {
      const step = makeStep({
        state: {
          nodes: [
            { id: "A", label: "A", x: 0.2, y: 0.5 },
            { id: "B", label: "B", x: 0.8, y: 0.5 },
          ],
          edges: [{ from: "A", to: "B", weight: 5, directed: false }],
        },
      });
      const scene = layout(step, mockCanvasSize, {});

      const edge = scene.primitives.find((p) => p.id === "edge-A-B") as ConnectionPrimitive;
      expect(edge.label).toBe("5");
    });

    it("uses circular fallback layout when node positions are missing", () => {
      const step = makeStep({
        state: {
          nodes: [
            { id: "A", label: "A" },
            { id: "B", label: "B" },
            { id: "C", label: "C" },
          ],
          edges: [],
        },
      });
      const scene = layout(step, mockCanvasSize, {});

      const nodes = scene.primitives.filter(
        (p) => p.kind === "element" && p.id.startsWith("node-"),
      ) as ElementPrimitive[];
      expect(nodes).toHaveLength(3);

      // All nodes should have distinct positions.
      const positions = nodes.map((n) => `${n.x.toFixed(1)},${n.y.toFixed(1)}`);
      const uniquePositions = new Set(positions);
      expect(uniquePositions.size).toBe(3);
    });
  });

  // ---------------------------------------------------------------------------
  // Visual actions
  // ---------------------------------------------------------------------------

  describe("visual actions", () => {
    it("applies visitNode color to the target node", () => {
      const step = makeStep({
        state: { nodes: triangleNodes, edges: triangleEdges },
        visualActions: [{ type: "visitNode", nodeId: "B", color: "visited" }],
      });
      const scene = layout(step, mockCanvasSize, {});

      const nodeB = scene.primitives.find((p) => p.id === "node-B") as ElementPrimitive;
      expect(nodeB.fillColor).toBe("#38bdf8"); // THEME.nodeVisited (sky-400)
    });

    it("applies setCurrentNode with glow ring", () => {
      const step = makeStep({
        state: { nodes: triangleNodes, edges: triangleEdges },
        visualActions: [{ type: "setCurrentNode", nodeId: "A" }],
      });
      const scene = layout(step, mockCanvasSize, {});

      const nodeA = scene.primitives.find((p) => p.id === "node-A") as ElementPrimitive;
      expect(nodeA.fillColor).toBe("#fbbf24"); // THEME.nodeCurrent (amber-400)

      // Glow ring element should exist.
      const glow = scene.primitives.find((p) => p.id === "glow-A") as ElementPrimitive;
      expect(glow).toBeDefined();
      expect(glow.shape).toBe("circle");
      expect(glow.fillColor).toBe("transparent");
      // Glow ring should be larger than the node.
      expect(glow.width).toBeGreaterThan(nodeA.width);
    });

    it("applies highlightEdge to change edge color and width", () => {
      const step = makeStep({
        state: { nodes: triangleNodes, edges: triangleEdges },
        visualActions: [{ type: "highlightEdge", from: "A", to: "B", color: "highlight" }],
      });
      const scene = layout(step, mockCanvasSize, {});

      const edge = scene.primitives.find((p) => p.id === "edge-A-B") as ConnectionPrimitive;
      expect(edge.color).toBe("#60a5fa"); // THEME.edgeHighlight (blue-400)
      expect(edge.lineWidth).toBe(3); // EDGE_HIGHLIGHT_LINE_WIDTH
    });

    it("applies markPath to color path nodes green and thicken path edges", () => {
      const step = makeStep({
        state: { nodes: triangleNodes, edges: triangleEdges },
        visualActions: [{ type: "markPath", nodeIds: ["A", "B", "C"] }],
      });
      const scene = layout(step, mockCanvasSize, {});

      // Path nodes should be green.
      const nodeA = scene.primitives.find((p) => p.id === "node-A") as ElementPrimitive;
      const nodeB = scene.primitives.find((p) => p.id === "node-B") as ElementPrimitive;
      const nodeC = scene.primitives.find((p) => p.id === "node-C") as ElementPrimitive;
      expect(nodeA.fillColor).toBe("#22c55e"); // THEME.nodePath
      expect(nodeB.fillColor).toBe("#22c55e");
      expect(nodeC.fillColor).toBe("#22c55e");

      // Path edges should be highlighted.
      const edgeAB = scene.primitives.find((p) => p.id === "edge-A-B") as ConnectionPrimitive;
      expect(edgeAB.color).toBe("#22c55e"); // THEME.edgePath
      expect(edgeAB.lineWidth).toBe(3.5); // EDGE_PATH_LINE_WIDTH
    });

    it("applies updateNodeValue to set sub-label", () => {
      const step = makeStep({
        state: { nodes: triangleNodes, edges: triangleEdges },
        visualActions: [{ type: "updateNodeValue", nodeId: "A", value: "0" }],
      });
      const scene = layout(step, mockCanvasSize, {});

      const nodeA = scene.primitives.find((p) => p.id === "node-A") as ElementPrimitive;
      expect(nodeA.subLabel).toBe("0");
    });

    it("applies updateDistance to set sub-label on a node", () => {
      const step = makeStep({
        state: { nodes: triangleNodes, edges: triangleEdges },
        visualActions: [{ type: "updateDistance", nodeId: "B", value: 5 }],
      });
      const scene = layout(step, mockCanvasSize, {});

      const nodeB = scene.primitives.find((p) => p.id === "node-B") as ElementPrimitive;
      expect(nodeB.subLabel).toBe("5");
    });

    it("displays distances as sub-labels when distances in state", () => {
      const step = makeStep({
        state: {
          nodes: triangleNodes,
          edges: triangleEdges,
          distances: { A: 0, B: "∞", C: "∞" },
        },
      });
      const scene = layout(step, mockCanvasSize, {});

      const nodeA = scene.primitives.find((p) => p.id === "node-A") as ElementPrimitive;
      const nodeB = scene.primitives.find((p) => p.id === "node-B") as ElementPrimitive;
      expect(nodeA.subLabel).toBe("0");
      expect(nodeB.subLabel).toBe("∞");
    });

    it("displays showMessage annotation", () => {
      const step = makeStep({
        state: { nodes: triangleNodes, edges: triangleEdges },
        visualActions: [{ type: "showMessage", text: "Path found!", messageType: "success" }],
      });
      const scene = layout(step, mockCanvasSize, {});

      const msg = scene.primitives.find((p) => p.id === "message") as AnnotationPrimitive;
      expect(msg).toBeDefined();
      expect(msg.text).toBe("Path found!");
      expect(msg.textColor).toBe("#22c55e"); // success → green
    });
  });

  // ---------------------------------------------------------------------------
  // Data structure display
  // ---------------------------------------------------------------------------

  describe("data structure display", () => {
    it("renders queue data structure with items", () => {
      const step = makeStep({
        state: {
          nodes: triangleNodes,
          edges: triangleEdges,
          dataStructure: { type: "queue", label: "Queue", items: ["A", "B"] },
        },
      });
      const scene = layout(step, mockCanvasSize, {});

      // Label annotation.
      const dsLabel = scene.primitives.find((p) => p.id === "ds-label") as AnnotationPrimitive;
      expect(dsLabel).toBeDefined();
      expect(dsLabel.text).toBe("Queue:");

      // Item badges.
      const items = scene.primitives.filter((p) =>
        p.id.startsWith("ds-item-"),
      ) as AnnotationPrimitive[];
      expect(items).toHaveLength(2);
      expect(items[0]!.text).toBe("A");
      expect(items[1]!.text).toBe("B");
    });

    it("renders distance table when distances are present and no dataStructure", () => {
      const step = makeStep({
        state: {
          nodes: triangleNodes,
          edges: triangleEdges,
          distances: { A: 0, B: 3, C: 5 },
        },
      });
      const scene = layout(step, mockCanvasSize, {});

      const distLabel = scene.primitives.find((p) => p.id === "dist-label") as AnnotationPrimitive;
      expect(distLabel).toBeDefined();
      expect(distLabel.text).toBe("Distances:");

      const entries = scene.primitives.filter((p) =>
        p.id.startsWith("dist-entry-"),
      ) as AnnotationPrimitive[];
      expect(entries).toHaveLength(3);
    });
  });

  // ---------------------------------------------------------------------------
  // Bidirectional edges
  // ---------------------------------------------------------------------------

  describe("bidirectional edges", () => {
    it("offsets bidirectional edges to avoid overlap", () => {
      const step = makeStep({
        state: {
          nodes: [
            { id: "A", label: "A", x: 0.2, y: 0.5 },
            { id: "B", label: "B", x: 0.8, y: 0.5 },
          ],
          edges: [
            { from: "A", to: "B", directed: true },
            { from: "B", to: "A", directed: true },
          ],
        },
      });
      const scene = layout(step, mockCanvasSize, {});

      const edgeAB = scene.primitives.find((p) => p.id === "edge-A-B") as ConnectionPrimitive;
      const edgeBA = scene.primitives.find((p) => p.id === "edge-B-A") as ConnectionPrimitive;

      expect(edgeAB).toBeDefined();
      expect(edgeBA).toBeDefined();
      // They should have opposite curveOffsets.
      expect(edgeAB.curveOffset).not.toBe(0);
      expect(edgeBA.curveOffset).not.toBe(0);
      expect(Math.sign(edgeAB.curveOffset)).not.toBe(Math.sign(edgeBA.curveOffset));
    });
  });

  // ---------------------------------------------------------------------------
  // Stable IDs
  // ---------------------------------------------------------------------------

  describe("stable IDs across steps", () => {
    it("maintains consistent node IDs across steps", () => {
      const state = { nodes: triangleNodes, edges: triangleEdges };
      const step1 = makeStep({ index: 0, state });
      const step2 = makeStep({
        index: 1,
        state,
        visualActions: [{ type: "visitNode", nodeId: "A", color: "visited" }],
      });

      const scene1 = layout(step1, mockCanvasSize, {});
      const scene2 = layout(step2, mockCanvasSize, {});

      const nodeIds1 = scene1.primitives
        .filter((p) => p.kind === "element" && p.id.startsWith("node-"))
        .map((p) => p.id)
        .sort();
      const nodeIds2 = scene2.primitives
        .filter((p) => p.kind === "element" && p.id.startsWith("node-"))
        .map((p) => p.id)
        .sort();
      expect(nodeIds1).toEqual(nodeIds2);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  describe("edge cases", () => {
    it("handles missing nodes array gracefully", () => {
      const step = makeStep({ state: {} });
      const scene = layout(step, mockCanvasSize, {});
      expect(scene.primitives).toEqual([]);
    });

    it("handles edge referencing non-existent node gracefully", () => {
      const step = makeStep({
        state: {
          nodes: [{ id: "A", label: "A", x: 0.5, y: 0.5 }],
          edges: [{ from: "A", to: "NONEXISTENT", directed: false }],
        },
      });
      // Should not crash. Edge to non-existent node is skipped.
      const scene = layout(step, mockCanvasSize, {});
      const edges = scene.primitives.filter((p) => p.kind === "connection");
      expect(edges).toHaveLength(0);
    });

    it("ignores unknown visual action types (open vocabulary)", () => {
      const step = makeStep({
        state: { nodes: triangleNodes, edges: triangleEdges },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        visualActions: [{ type: "futureAction", data: 42 } as any],
      });
      const scene = layout(step, mockCanvasSize, {});
      // Should not crash. Nodes should still render.
      const nodes = scene.primitives.filter(
        (p) => p.kind === "element" && p.id.startsWith("node-"),
      );
      expect(nodes).toHaveLength(3);
    });
  });
});
