/**
 * @fileoverview Breadth-First Search — Step Generator
 *
 * BFS explores nodes level by level using a FIFO queue.
 * Guarantees shortest path in unweighted graphs.
 *
 * All graph generators provide fixed (x, y) positions in
 * [0, 1] normalized coordinates for deterministic layouts.
 */

import { createGenerator } from "@/engine/generator";
import type { VisualAction } from "@/engine/generator";

interface BFSInputs extends Record<string, unknown> {
  readonly adjacencyList: Record<string, string[]>;
  readonly positions: Record<string, { x: number; y: number }>;
  readonly startNode: string;
  readonly targetNode?: string;
}

export default createGenerator<BFSInputs>({
  id: "bfs",

  *generate(inputs, step) {
    const { adjacencyList, positions, startNode, targetNode } = inputs;

    const nodeIds = Object.keys(adjacencyList).sort();
    const nodes = nodeIds.map((id) => ({
      id,
      label: id,
      x: positions[id]?.x ?? 0.5,
      y: positions[id]?.y ?? 0.5,
    }));

    // Build deduplicated undirected edge list.
    const edgeSet = new Set<string>();
    const edges: Array<{ from: string; to: string; directed: boolean }> = [];
    for (const [from, neighbors] of Object.entries(adjacencyList)) {
      for (const to of neighbors) {
        const key = [from, to].sort().join("-");
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          edges.push({ from, to, directed: false });
        }
      }
    }

    // --- Initialize ---
    const visited = new Set<string>();
    const predecessor: Record<string, string | null> = {};
    const queue: string[] = [];

    visited.add(startNode);
    predecessor[startNode] = null;
    queue.push(startNode);

    yield step({
      id: "initialize",
      title: "Initialize BFS",
      explanation:
        `Starting BFS from node "${startNode}". ` +
        (targetNode
          ? `Searching for node "${targetNode}".`
          : `Exploring all reachable nodes.`) +
        ` Enqueue "${startNode}" and mark it as visited.`,
      state: {
        nodes,
        edges,
        visited: [...visited],
        queue: [...queue],
        dataStructure: { type: "queue", label: "Queue", items: [...queue] },
      },
      visualActions: [
        { type: "visitNode", nodeId: startNode, color: "start" },
        { type: "setCurrentNode", nodeId: startNode },
      ],
      codeHighlight: { language: "pseudocode", lines: [1, 2, 3] },
    });

    let found = false;

    // --- Main BFS loop ---
    while (queue.length > 0) {
      const current = queue.shift()!;

      yield step({
        id: "dequeue",
        title: `Dequeue "${current}"`,
        explanation:
          `Dequeued "${current}" from the front of the queue. ` +
          `Now examining its neighbors: [${(adjacencyList[current] ?? []).join(", ")}].`,
        state: {
          nodes,
          edges,
          visited: [...visited],
          queue: [...queue],
          current,
          dataStructure: { type: "queue", label: "Queue", items: [...queue] },
        },
        visualActions: [
          { type: "setCurrentNode", nodeId: current },
          ...([...visited].map((id) => ({
            type: "visitNode" as const,
            nodeId: id,
            color: id === startNode ? "start" : "visited",
          }))),
        ],
        codeHighlight: { language: "pseudocode", lines: [5, 6] },
      });

      const neighbors = adjacencyList[current] ?? [];

      for (const neighbor of neighbors) {
        if (visited.has(neighbor)) continue;

        visited.add(neighbor);
        predecessor[neighbor] = current;
        queue.push(neighbor);

        yield step({
          id: "visit_neighbor",
          title: `Visit "${neighbor}"`,
          explanation:
            `"${neighbor}" is an unvisited neighbor of "${current}". ` +
            `Mark it as visited and enqueue it. Queue: [${queue.join(", ")}].`,
          state: {
            nodes,
            edges,
            visited: [...visited],
            queue: [...queue],
            current,
            neighbor,
            predecessors: { ...predecessor },
            dataStructure: { type: "queue", label: "Queue", items: [...queue] },
          },
          visualActions: [
            { type: "setCurrentNode", nodeId: current },
            { type: "visitNode", nodeId: neighbor, color: "visited" },
            { type: "highlightEdge", from: current, to: neighbor, color: "highlight" },
            ...([...visited]
              .filter((id) => id !== neighbor)
              .map((id) => ({
                type: "visitNode" as const,
                nodeId: id,
                color: id === startNode ? "start" : "visited",
              }))),
          ],
          codeHighlight: { language: "pseudocode", lines: [7, 8, 9, 10] },
        });

        // Check target.
        if (targetNode && neighbor === targetNode) {
          found = true;

          const path: string[] = [];
          let node: string | null = targetNode;
          while (node !== null) {
            path.unshift(node);
            node = predecessor[node] ?? null;
          }

          yield step({
            id: "target_found",
            title: `Target "${targetNode}" Found!`,
            explanation:
              `Found "${targetNode}"! Shortest path: ${path.join(" → ")} ` +
              `(${path.length - 1} edge${path.length - 1 !== 1 ? "s" : ""}).`,
            state: {
              nodes,
              edges,
              visited: [...visited],
              path,
              predecessors: { ...predecessor },
            },
            visualActions: [
              { type: "markPath", nodeIds: path },
              { type: "showMessage", text: `Path found: ${path.join(" → ")}`, messageType: "success" },
            ],
            codeHighlight: { language: "pseudocode", lines: [11, 12] },
            isTerminal: true,
          });
          return;
        }
      }
    }

    // --- BFS complete ---
    if (targetNode && !found) {
      yield step({
        id: "target_not_found",
        title: `"${targetNode}" Not Reachable`,
        explanation:
          `BFS explored all reachable nodes from "${startNode}" but ` +
          `"${targetNode}" was not found. It is not connected to "${startNode}".`,
        state: { nodes, edges, visited: [...visited] },
        visualActions: [
          ...([...visited].map((id) => ({
            type: "visitNode" as const,
            nodeId: id,
            color: id === startNode ? "start" : "visited",
          }))),
          { type: "showMessage", text: `"${targetNode}" is unreachable`, messageType: "error" },
        ],
        codeHighlight: { language: "pseudocode", lines: [14] },
        isTerminal: true,
      });
    } else {
      yield step({
        id: "exploration_complete",
        title: "BFS Exploration Complete",
        explanation:
          `Explored all ${visited.size} reachable node(s) from "${startNode}". ` +
          `Visited: [${[...visited].join(", ")}].`,
        state: { nodes, edges, visited: [...visited] },
        visualActions: [
          ...([...visited].map((id) => ({
            type: "visitNode" as const,
            nodeId: id,
            color: id === startNode ? "start" : "visited",
          }))),
          { type: "showMessage", text: "Exploration complete!", messageType: "success" },
        ],
        codeHighlight: { language: "pseudocode", lines: [14] },
        isTerminal: true,
      });
    }
  },
});
