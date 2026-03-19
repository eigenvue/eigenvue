/**
 * @fileoverview Graph Template — BFS Traversal Example
 *
 * Demonstrates the `graph-network` layout with:
 * - visitNode
 * - highlightEdge
 * - updateNodeValue
 * - showMessage
 */

import type { AlgorithmTemplate } from "./index";

export const GRAPH_TEMPLATE: AlgorithmTemplate = {
  id: "graph-bfs-example",
  name: "BFS Traversal (Graph)",
  description: "Breadth-first search exploring a graph level by level.",
  layoutId: "graph-network",
  category: "classical",
  difficulty: "intermediate",
  code: `// BFS — explore a graph level by level using a queue.
//
// Available visual actions for "graph-network" layout:
//   { type: "visitNode", nodeId: "A", color?: "..." }
//   { type: "highlightEdge", from: "A", to: "B", color?: "..." }
//   { type: "updateNodeValue", nodeId: "A", value: "..." }
//   { type: "showMessage", text: "..." }

// Define the graph as an adjacency list.
const graph = {
  A: ["B", "C"],
  B: ["A", "D", "E"],
  C: ["A", "F"],
  D: ["B"],
  E: ["B", "F"],
  F: ["C", "E"],
};
const startNode = "A";

const visited = new Set();
const queue = [startNode];
visited.add(startNode);

step({
  title: "Initialize BFS",
  explanation: \`Starting BFS from node \${startNode}. Queue: [\${queue.join(", ")}].\`,
  state: { visited: [...visited], queue: [...queue], current: null },
  visualActions: [
    { type: "visitNode", nodeId: startNode, color: "accent" },
  ],
});

while (queue.length > 0) {
  const current = queue.shift();

  step({
    title: \`Visit node \${current}\`,
    explanation: \`Dequeued \${current}. Exploring its neighbors: \${graph[current].join(", ")}.\`,
    state: { visited: [...visited], queue: [...queue], current },
    visualActions: [
      { type: "visitNode", nodeId: current, color: "success" },
    ],
  });

  for (const neighbor of graph[current]) {
    if (!visited.has(neighbor)) {
      visited.add(neighbor);
      queue.push(neighbor);

      step({
        title: \`Discover node \${neighbor}\`,
        explanation: \`Found unvisited neighbor \${neighbor}. Added to queue. Queue: [\${queue.join(", ")}].\`,
        state: { visited: [...visited], queue: [...queue], current },
        visualActions: [
          { type: "highlightEdge", from: current, to: neighbor, color: "accent" },
          { type: "visitNode", nodeId: neighbor, color: "accent" },
        ],
      });
    }
  }
}

step({
  title: "BFS Complete",
  explanation: \`All reachable nodes visited: \${[...visited].join(", ")}.\`,
  state: { visited: [...visited], queue: [], current: null },
  visualActions: [
    { type: "showMessage", text: "BFS traversal complete!", messageType: "success" },
  ],
  isTerminal: true,
});
`,
};
