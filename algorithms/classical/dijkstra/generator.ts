/**
 * @fileoverview Dijkstra's Shortest Path — Step Generator
 *
 * Finds shortest paths from source to all nodes in a weighted graph
 * with non-negative edge weights. Uses a simple sorted-array priority queue.
 *
 * Correctness: When node u is extracted from PQ, dist[u] is final because
 * all edges are non-negative and we always extract the minimum.
 *
 * CRITICAL: Requires non-negative edge weights.
 */

import { createGenerator } from "@/engine/generator";
import type { VisualAction } from "@/engine/generator";

interface DijkstraInputs extends Record<string, unknown> {
  readonly adjacencyList: Record<string, Array<{ to: string; weight: number }>>;
  readonly positions: Record<string, { x: number; y: number }>;
  readonly startNode: string;
  readonly targetNode?: string;
}

export default createGenerator<DijkstraInputs>({
  id: "dijkstra",

  *generate(inputs, step) {
    const { adjacencyList, positions, startNode, targetNode } = inputs;

    const nodeIds = Object.keys(adjacencyList).sort();
    const nodes = nodeIds.map((id) => ({
      id,
      label: id,
      x: positions[id]?.x ?? 0.5,
      y: positions[id]?.y ?? 0.5,
    }));

    // Build edges array with weights for display.
    const edgeSet = new Set<string>();
    const edges: Array<{ from: string; to: string; weight: number; directed: boolean }> = [];
    for (const [from, neighbors] of Object.entries(adjacencyList)) {
      for (const { to, weight } of neighbors) {
        const key = [from, to].sort().join("-");
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          edges.push({ from, to, weight, directed: false });
        }
      }
    }

    // --- Initialize ---
    const dist: Record<string, number> = {};
    const distDisplay: Record<string, number | string> = {};
    const predecessor: Record<string, string | null> = {};
    const visited = new Set<string>();

    for (const id of nodeIds) {
      dist[id] = id === startNode ? 0 : Infinity;
      distDisplay[id] = id === startNode ? 0 : "∞";
      predecessor[id] = null;
    }

    // Priority queue: array of { id, dist }, sorted by dist ascending.
    let pq: Array<{ id: string; dist: number }> = [{ id: startNode, dist: 0 }];

    yield step({
      id: "initialize",
      title: "Initialize Dijkstra's Algorithm",
      explanation:
        `Starting Dijkstra's algorithm from node "${startNode}". ` +
        `Set distance to "${startNode}" = 0 and all others = ∞. ` +
        `Add "${startNode}" to the priority queue.`,
      state: {
        nodes,
        edges,
        visited: Array.from(visited).sort(),
        distances: { ...distDisplay },
        dataStructure: {
          type: "priority-queue",
          label: "PQ",
          items: pq.map((e) => `${e.id}:${e.dist}`),
        },
      },
      visualActions: [
        { type: "visitNode", nodeId: startNode, color: "start" },
        ...nodeIds.map((id) => ({
          type: "updateNodeValue" as const,
          nodeId: id,
          value: id === startNode ? "0" : "∞",
        })),
      ],
      codeHighlight: { language: "pseudocode", lines: [1, 2, 3] },
    });

    // --- Main loop ---
    while (pq.length > 0) {
      // Extract minimum.
      pq.sort((a, b) => a.dist - b.dist);
      const { id: u, dist: uDist } = pq.shift()!;

      // Skip stale PQ entries (already visited).
      if (visited.has(u)) continue;

      visited.add(u);

      yield step({
        id: "extract_min",
        title: `Process "${u}" (dist = ${uDist})`,
        explanation:
          `Extracted "${u}" with distance ${uDist} from the priority queue. ` +
          `This is the closest unvisited node. Its distance is now finalized.`,
        state: {
          nodes,
          edges,
          visited: Array.from(visited).sort(),
          distances: { ...distDisplay },
          current: u,
          dataStructure: {
            type: "priority-queue",
            label: "PQ",
            items: pq.map((e) => `${e.id}:${e.dist}`),
          },
        },
        visualActions: [
          { type: "setCurrentNode", nodeId: u },
          ...(Array.from(visited).sort().map((id) => ({
            type: "visitNode" as const,
            nodeId: id,
            color: id === startNode ? "start" : "visited",
          }))),
          ...nodeIds.map((id) => ({
            type: "updateNodeValue" as const,
            nodeId: id,
            value: String(distDisplay[id]),
          })),
        ],
        codeHighlight: { language: "pseudocode", lines: [5, 6] },
      });

      // Check target.
      if (targetNode && u === targetNode) {
        const path: string[] = [];
        let node: string | null = targetNode;
        while (node !== null) {
          path.unshift(node);
          node = predecessor[node] ?? null;
        }

        yield step({
          id: "target_found",
          title: `Shortest Path to "${targetNode}" Found!`,
          explanation:
            `Found shortest path to "${targetNode}" with total distance ${uDist}. ` +
            `Path: ${path.join(" → ")}.`,
          state: {
            nodes,
            edges,
            visited: Array.from(visited).sort(),
            distances: { ...distDisplay },
            path,
            predecessors: { ...predecessor },
          },
          visualActions: [
            { type: "markPath", nodeIds: path },
            ...nodeIds.map((id) => ({
              type: "updateNodeValue" as const,
              nodeId: id,
              value: String(distDisplay[id]),
            })),
            { type: "showMessage", text: `Shortest path: ${path.join(" → ")} (cost: ${uDist})`, messageType: "success" },
          ],
          codeHighlight: { language: "pseudocode", lines: [14, 15] },
          isTerminal: true,
        });
        return;
      }

      // --- Relax edges ---
      const neighbors = adjacencyList[u] ?? [];

      for (const { to: v, weight } of neighbors) {
        if (visited.has(v)) continue;

        // newDist = dist[u] + weight(u, v)
        // Mathematical guarantee: weight ≥ 0, dist[u] is finalized.
        const newDist = dist[u]! + weight;
        const improved = newDist < dist[v]!;

        yield step({
          id: "relax_edge",
          title: `Relax Edge ${u} → ${v}`,
          explanation:
            `Checking edge ${u} → ${v} (weight = ${weight}). ` +
            `Current dist[${v}] = ${distDisplay[v]}. ` +
            `New candidate: dist[${u}] + ${weight} = ${uDist} + ${weight} = ${newDist}. ` +
            (improved
              ? `${newDist} < ${distDisplay[v]}, so update dist[${v}] = ${newDist}.`
              : `${newDist} ≥ ${distDisplay[v]}, no improvement.`),
          state: {
            nodes,
            edges,
            visited: Array.from(visited).sort(),
            distances: { ...distDisplay },
            current: u,
            relaxing: { from: u, to: v, weight, newDist },
          },
          visualActions: [
            { type: "setCurrentNode", nodeId: u },
            { type: "highlightEdge", from: u, to: v, color: improved ? "highlight" : "default" },
            ...(Array.from(visited).sort().map((id) => ({
              type: "visitNode" as const,
              nodeId: id,
              color: id === startNode ? "start" : "visited",
            }))),
            ...nodeIds.map((id) => ({
              type: "updateNodeValue" as const,
              nodeId: id,
              value: String(distDisplay[id]),
            })),
          ],
          codeHighlight: { language: "pseudocode", lines: [8, 9, 10] },
        });

        if (improved) {
          dist[v] = newDist;
          distDisplay[v] = newDist;
          predecessor[v] = u;
          pq.push({ id: v, dist: newDist });

          yield step({
            id: "distance_updated",
            title: `Update dist[${v}] = ${newDist}`,
            explanation:
              `Updated dist[${v}] to ${newDist}. ` +
              `Predecessor of "${v}" is now "${u}".`,
            state: {
              nodes,
              edges,
              visited: Array.from(visited).sort(),
              distances: { ...distDisplay },
              current: u,
              dataStructure: {
                type: "priority-queue",
                label: "PQ",
                items: [...pq].sort((a, b) => a.dist - b.dist).map((e) => `${e.id}:${e.dist}`),
              },
            },
            visualActions: [
              { type: "setCurrentNode", nodeId: u },
              { type: "updateDistance", nodeId: v, value: newDist },
              { type: "highlightEdge", from: u, to: v, color: "highlight" },
              ...(Array.from(visited).sort().map((id) => ({
                type: "visitNode" as const,
                nodeId: id,
                color: id === startNode ? "start" : "visited",
              }))),
              ...nodeIds.map((id) => ({
                type: "updateNodeValue" as const,
                nodeId: id,
                value: String(distDisplay[id]),
              })),
            ],
            codeHighlight: { language: "pseudocode", lines: [11, 12, 13] },
          });
        }
      }
    }

    // --- Algorithm complete (no specific target, or target unreachable) ---
    if (targetNode && !visited.has(targetNode)) {
      yield step({
        id: "target_unreachable",
        title: `"${targetNode}" is Unreachable`,
        explanation:
          `All reachable nodes processed. "${targetNode}" was never reached. ` +
          `It is not connected to "${startNode}".`,
        state: {
          nodes,
          edges,
          visited: Array.from(visited).sort(),
          distances: { ...distDisplay },
        },
        visualActions: [
          ...(Array.from(visited).sort().map((id) => ({
            type: "visitNode" as const,
            nodeId: id,
            color: id === startNode ? "start" : "visited",
          }))),
          ...nodeIds.map((id) => ({
            type: "updateNodeValue" as const,
            nodeId: id,
            value: String(distDisplay[id]),
          })),
          { type: "showMessage", text: `"${targetNode}" is unreachable`, messageType: "error" },
        ],
        codeHighlight: { language: "pseudocode", lines: [16] },
        isTerminal: true,
      });
    } else {
      yield step({
        id: "complete",
        title: "Dijkstra's Algorithm Complete",
        explanation:
          `All reachable nodes have been processed. Final distances from "${startNode}": ` +
          nodeIds.map((id) => `${id}=${distDisplay[id]}`).join(", ") + ".",
        state: {
          nodes,
          edges,
          visited: Array.from(visited).sort(),
          distances: { ...distDisplay },
          predecessors: { ...predecessor },
        },
        visualActions: [
          ...(Array.from(visited).sort().map((id) => ({
            type: "visitNode" as const,
            nodeId: id,
            color: id === startNode ? "start" : "visited",
          }))),
          ...nodeIds.map((id) => ({
            type: "updateNodeValue" as const,
            nodeId: id,
            value: String(distDisplay[id]),
          })),
          { type: "showMessage", text: "All shortest distances computed!", messageType: "success" },
        ],
        codeHighlight: { language: "pseudocode", lines: [16] },
        isTerminal: true,
      });
    }
  },
});
