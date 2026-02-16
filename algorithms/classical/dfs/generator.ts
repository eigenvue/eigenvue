/**
 * @fileoverview Depth-First Search — Step Generator (explicit stack)
 *
 * DFS explores as deep as possible before backtracking.
 * Uses "visit on pop" strategy — marks nodes visited when popped.
 * Does NOT guarantee shortest paths.
 */

import { createGenerator } from "@/engine/generator";
import type { VisualAction } from "@/engine/generator";

interface DFSInputs extends Record<string, unknown> {
  readonly adjacencyList: Record<string, string[]>;
  readonly positions: Record<string, { x: number; y: number }>;
  readonly startNode: string;
  readonly targetNode?: string;
}

export default createGenerator<DFSInputs>({
  id: "dfs",

  *generate(inputs, step) {
    const { adjacencyList, positions, startNode, targetNode } = inputs;

    const nodeIds = Object.keys(adjacencyList).sort();
    const nodes = nodeIds.map((id) => ({
      id,
      label: id,
      x: positions[id]?.x ?? 0.5,
      y: positions[id]?.y ?? 0.5,
    }));

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
    const stack: string[] = [startNode];
    predecessor[startNode] = null;

    yield step({
      id: "initialize",
      title: "Initialize DFS",
      explanation:
        `Starting DFS from node "${startNode}". ` +
        (targetNode
          ? `Searching for "${targetNode}".`
          : `Exploring all reachable nodes.`) +
        ` Push "${startNode}" onto the stack.`,
      state: {
        nodes,
        edges,
        visited: [...visited],
        stack: [...stack],
        dataStructure: { type: "stack", label: "Stack", items: [...stack] },
      },
      visualActions: [
        { type: "visitNode", nodeId: startNode, color: "start" },
      ],
      codeHighlight: { language: "pseudocode", lines: [1, 2, 3] },
    });

    let found = false;

    // --- Main DFS loop ---
    while (stack.length > 0) {
      const current = stack.pop()!;

      // Skip if already visited ("visit on pop" strategy).
      if (visited.has(current)) continue;

      visited.add(current);

      yield step({
        id: "visit_node",
        title: `Visit "${current}"`,
        explanation:
          `Popped "${current}" from the stack and marking it as visited. ` +
          `Stack: [${stack.join(", ")}]. Exploring its neighbors.`,
        state: {
          nodes,
          edges,
          visited: [...visited],
          stack: [...stack],
          current,
          predecessors: { ...predecessor },
          dataStructure: { type: "stack", label: "Stack", items: [...stack] },
        },
        visualActions: [
          { type: "setCurrentNode", nodeId: current },
          ...([...visited].map((id) => ({
            type: "visitNode" as const,
            nodeId: id,
            color: id === startNode ? "start" : "visited",
          }))),
        ],
        codeHighlight: { language: "pseudocode", lines: [5, 6, 7] },
      });

      // Check target.
      if (targetNode && current === targetNode) {
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
            `Found "${targetNode}"! DFS path: ${path.join(" → ")} ` +
            `(${path.length - 1} edge${path.length - 1 !== 1 ? "s" : ""}). ` +
            `Note: this may NOT be the shortest path.`,
          state: {
            nodes,
            edges,
            visited: [...visited],
            path,
            predecessors: { ...predecessor },
          },
          visualActions: [
            { type: "markPath", nodeIds: path },
            { type: "showMessage", text: `Path: ${path.join(" → ")}`, messageType: "success" },
          ],
          codeHighlight: { language: "pseudocode", lines: [8, 9] },
          isTerminal: true,
        });
        return;
      }

      // Push unvisited neighbors in reverse sorted order so that
      // alphabetically-first neighbor is on top (explored first).
      const neighbors = (adjacencyList[current] ?? []).slice().sort().reverse();

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (predecessor[neighbor] === undefined) {
            predecessor[neighbor] = current;
          }
          stack.push(neighbor);
        }
      }

      if (neighbors.filter((n) => !visited.has(n)).length > 0) {
        yield step({
          id: "push_neighbors",
          title: `Push Neighbors of "${current}"`,
          explanation:
            `Pushed unvisited neighbors of "${current}" onto the stack: ` +
            `[${neighbors.filter((n) => !visited.has(n)).join(", ")}]. ` +
            `Stack is now: [${stack.join(", ")}].`,
          state: {
            nodes,
            edges,
            visited: [...visited],
            stack: [...stack],
            current,
            dataStructure: { type: "stack", label: "Stack", items: [...stack] },
          },
          visualActions: [
            { type: "setCurrentNode", nodeId: current },
            ...neighbors
              .filter((n) => !visited.has(n))
              .map((n) => ({
                type: "highlightEdge" as const,
                from: current,
                to: n,
                color: "highlight",
              })),
            ...([...visited].map((id) => ({
              type: "visitNode" as const,
              nodeId: id,
              color: id === startNode ? "start" : "visited",
            }))),
          ],
          codeHighlight: { language: "pseudocode", lines: [10, 11, 12] },
        });
      }
    }

    // --- DFS complete ---
    if (targetNode && !found) {
      yield step({
        id: "target_not_found",
        title: `"${targetNode}" Not Reachable`,
        explanation:
          `DFS explored all reachable nodes from "${startNode}" but ` +
          `"${targetNode}" was not found.`,
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
        title: "DFS Exploration Complete",
        explanation:
          `Explored all ${visited.size} reachable node(s) from "${startNode}".`,
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
