"""
Breadth-First Search — Step Generator (Python mirror of generator.ts).

BFS explores nodes level by level using a FIFO queue.
Guarantees shortest path in unweighted graphs.

All graph generators provide fixed (x, y) positions in
[0, 1] normalized coordinates for deterministic layouts.

CROSS-LANGUAGE PARITY: Must produce identical steps to the TypeScript version.
"""

from __future__ import annotations

from collections import deque
from typing import Any

from eigenvue._step_types import CodeHighlight, Step, VisualAction


def generate(inputs: dict[str, Any]) -> list[Step]:
    """Generate BFS visualization steps."""
    adjacency_list: dict[str, list[str]] = inputs["adjacencyList"]
    positions: dict[str, dict[str, float]] = inputs["positions"]
    start_node: str = inputs["startNode"]
    target_node: str | None = inputs.get("targetNode")

    node_ids = sorted(adjacency_list.keys())
    nodes = [
        {
            "id": nid,
            "label": nid,
            "x": positions.get(nid, {}).get("x", 0.5),
            "y": positions.get(nid, {}).get("y", 0.5),
        }
        for nid in node_ids
    ]

    # Build deduplicated undirected edge list
    edge_set: set[str] = set()
    edges: list[dict[str, Any]] = []
    for from_node, neighbors in adjacency_list.items():
        for to_node in neighbors:
            key = "-".join(sorted([from_node, to_node]))
            if key not in edge_set:
                edge_set.add(key)
                edges.append({"from": from_node, "to": to_node, "directed": False})

    steps: list[Step] = []
    idx = 0

    # --- Initialize ---
    visited: set[str] = set()
    predecessor: dict[str, str | None] = {}
    queue: deque[str] = deque()

    visited.add(start_node)
    predecessor[start_node] = None
    queue.append(start_node)

    steps.append(
        Step(
            index=idx,
            id="initialize",
            title="Initialize BFS",
            explanation=(
                f'Starting BFS from node "{start_node}". '
                + (
                    f'Searching for node "{target_node}".'
                    if target_node
                    else "Exploring all reachable nodes."
                )
                + f' Enqueue "{start_node}" and mark it as visited.'
            ),
            state={
                "nodes": nodes,
                "edges": edges,
                "visited": sorted(visited),
                "queue": list(queue),
                "dataStructure": {"type": "queue", "label": "Queue", "items": list(queue)},
            },
            visual_actions=(
                VisualAction(type="visitNode", params={"nodeId": start_node, "color": "start"}),
                VisualAction(type="setCurrentNode", params={"nodeId": start_node}),
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=(1, 2, 3)),
            is_terminal=False,
        )
    )
    idx += 1

    found = False

    # --- Main BFS loop ---
    while queue:
        current = queue.popleft()

        visited_actions: list[VisualAction] = [
            VisualAction(
                type="visitNode",
                params={"nodeId": vid, "color": "start" if vid == start_node else "visited"},
            )
            for vid in sorted(visited)
        ]

        steps.append(
            Step(
                index=idx,
                id="dequeue",
                title=f'Dequeue "{current}"',
                explanation=(
                    f'Dequeued "{current}" from the front of the queue. '
                    f"Now examining its neighbors: [{', '.join(adjacency_list.get(current, []))}]."
                ),
                state={
                    "nodes": nodes,
                    "edges": edges,
                    "visited": sorted(visited),
                    "queue": list(queue),
                    "current": current,
                    "dataStructure": {"type": "queue", "label": "Queue", "items": list(queue)},
                },
                visual_actions=tuple(
                    [
                        VisualAction(type="setCurrentNode", params={"nodeId": current}),
                        *visited_actions,
                    ]
                ),
                code_highlight=CodeHighlight(language="pseudocode", lines=(5, 6)),
                is_terminal=False,
            )
        )
        idx += 1

        neighbors = adjacency_list.get(current, [])

        for neighbor in neighbors:
            if neighbor in visited:
                continue

            visited.add(neighbor)
            predecessor[neighbor] = current
            queue.append(neighbor)

            visited_actions2: list[VisualAction] = [
                VisualAction(
                    type="visitNode",
                    params={"nodeId": vid, "color": "start" if vid == start_node else "visited"},
                )
                for vid in sorted(visited)
                if vid != neighbor
            ]

            steps.append(
                Step(
                    index=idx,
                    id="visit_neighbor",
                    title=f'Visit "{neighbor}"',
                    explanation=(
                        f'"{neighbor}" is an unvisited neighbor of "{current}". '
                        f"Mark it as visited and enqueue it. Queue: [{', '.join(queue)}]."
                    ),
                    state={
                        "nodes": nodes,
                        "edges": edges,
                        "visited": sorted(visited),
                        "queue": list(queue),
                        "current": current,
                        "neighbor": neighbor,
                        "predecessors": dict(predecessor),
                        "dataStructure": {"type": "queue", "label": "Queue", "items": list(queue)},
                    },
                    visual_actions=tuple(
                        [
                            VisualAction(type="setCurrentNode", params={"nodeId": current}),
                            VisualAction(
                                type="visitNode", params={"nodeId": neighbor, "color": "visited"}
                            ),
                            VisualAction(
                                type="highlightEdge",
                                params={"from": current, "to": neighbor, "color": "highlight"},
                            ),
                            *visited_actions2,
                        ]
                    ),
                    code_highlight=CodeHighlight(language="pseudocode", lines=(7, 8, 9, 10)),
                    is_terminal=False,
                )
            )
            idx += 1

            # Check target
            if target_node and neighbor == target_node:
                found = True

                path: list[str] = []
                node: str | None = target_node
                while node is not None:
                    path.insert(0, node)
                    node = predecessor.get(node)

                steps.append(
                    Step(
                        index=idx,
                        id="target_found",
                        title=f'Target "{target_node}" Found!',
                        explanation=(
                            f'Found "{target_node}"! Shortest path: '
                            + " \u2192 ".join(path)
                            + f" ({len(path) - 1} edge"
                            + ("s" if len(path) - 1 != 1 else "")
                            + ")."
                        ),
                        state={
                            "nodes": nodes,
                            "edges": edges,
                            "visited": sorted(visited),
                            "path": path,
                            "predecessors": dict(predecessor),
                        },
                        visual_actions=(
                            VisualAction(type="markPath", params={"nodeIds": path}),
                            VisualAction(
                                type="showMessage",
                                params={
                                    "text": "Path found: " + " \u2192 ".join(path),
                                    "messageType": "success",
                                },
                            ),
                        ),
                        code_highlight=CodeHighlight(language="pseudocode", lines=(11, 12)),
                        is_terminal=True,
                    )
                )
                return steps

    # --- BFS complete ---
    if target_node and not found:
        visited_actions_end: list[VisualAction] = [
            VisualAction(
                type="visitNode",
                params={"nodeId": vid, "color": "start" if vid == start_node else "visited"},
            )
            for vid in sorted(visited)
        ]

        steps.append(
            Step(
                index=idx,
                id="target_not_found",
                title=f'"{target_node}" Not Reachable',
                explanation=(
                    f'BFS explored all reachable nodes from "{start_node}" but '
                    f'"{target_node}" was not found. It is not connected to "{start_node}".'
                ),
                state={"nodes": nodes, "edges": edges, "visited": sorted(visited)},
                visual_actions=tuple(
                    [
                        *visited_actions_end,
                        VisualAction(
                            type="showMessage",
                            params={
                                "text": f'"{target_node}" is unreachable',
                                "messageType": "error",
                            },
                        ),
                    ]
                ),
                code_highlight=CodeHighlight(language="pseudocode", lines=(14,)),
                is_terminal=True,
            )
        )
    else:
        visited_actions_end2: list[VisualAction] = [
            VisualAction(
                type="visitNode",
                params={"nodeId": vid, "color": "start" if vid == start_node else "visited"},
            )
            for vid in sorted(visited)
        ]

        steps.append(
            Step(
                index=idx,
                id="exploration_complete",
                title="BFS Exploration Complete",
                explanation=(
                    f'Explored all {len(visited)} reachable node(s) from "{start_node}". '
                    f"Visited: [{', '.join(sorted(visited))}]."
                ),
                state={"nodes": nodes, "edges": edges, "visited": sorted(visited)},
                visual_actions=tuple(
                    [
                        *visited_actions_end2,
                        VisualAction(
                            type="showMessage",
                            params={
                                "text": "Exploration complete!",
                                "messageType": "success",
                            },
                        ),
                    ]
                ),
                code_highlight=CodeHighlight(language="pseudocode", lines=(14,)),
                is_terminal=True,
            )
        )

    return steps
