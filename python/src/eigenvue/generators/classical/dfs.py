"""
Depth-First Search — Step Generator (explicit stack, Python mirror of generator.ts).

DFS explores as deep as possible before backtracking.
Uses "visit on pop" strategy — marks nodes visited when popped.
Does NOT guarantee shortest paths.

CROSS-LANGUAGE PARITY: Must produce identical steps to the TypeScript version.
"""

from __future__ import annotations

from typing import Any

from eigenvue._step_types import CodeHighlight, Step, VisualAction


def generate(inputs: dict[str, Any]) -> list[Step]:
    """Generate DFS visualization steps."""
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
    stack: list[str] = [start_node]
    predecessor[start_node] = None

    steps.append(
        Step(
            index=idx,
            id="initialize",
            title="Initialize DFS",
            explanation=(
                f'Starting DFS from node "{start_node}". '
                + (
                    f'Searching for "{target_node}".'
                    if target_node
                    else "Exploring all reachable nodes."
                )
                + f' Push "{start_node}" onto the stack.'
            ),
            state={
                "nodes": nodes,
                "edges": edges,
                "visited": sorted(visited),
                "stack": list(stack),
                "dataStructure": {"type": "stack", "label": "Stack", "items": list(stack)},
            },
            visual_actions=(
                VisualAction(type="visitNode", params={"nodeId": start_node, "color": "start"}),
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=(1, 2, 3)),
            is_terminal=False,
        )
    )
    idx += 1

    found = False

    # --- Main DFS loop ---
    while stack:
        current = stack.pop()

        # Skip if already visited ("visit on pop" strategy)
        if current in visited:
            continue

        visited.add(current)

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
                id="visit_node",
                title=f'Visit "{current}"',
                explanation=(
                    f'Popped "{current}" from the stack and marking it as visited. '
                    f"Stack: [{', '.join(stack)}]. Exploring its neighbors."
                ),
                state={
                    "nodes": nodes,
                    "edges": edges,
                    "visited": sorted(visited),
                    "stack": list(stack),
                    "current": current,
                    "predecessors": dict(predecessor),
                    "dataStructure": {"type": "stack", "label": "Stack", "items": list(stack)},
                },
                visual_actions=tuple(
                    [
                        VisualAction(type="setCurrentNode", params={"nodeId": current}),
                        *visited_actions,
                    ]
                ),
                code_highlight=CodeHighlight(language="pseudocode", lines=(5, 6, 7)),
                is_terminal=False,
            )
        )
        idx += 1

        # Check target
        if target_node and current == target_node:
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
                        f'Found "{target_node}"! DFS path: '
                        + " \u2192 ".join(path)
                        + f" ({len(path) - 1} edge"
                        + ("s" if len(path) - 1 != 1 else "")
                        + "). Note: this may NOT be the shortest path."
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
                                "text": "Path: " + " \u2192 ".join(path),
                                "messageType": "success",
                            },
                        ),
                    ),
                    code_highlight=CodeHighlight(language="pseudocode", lines=(8, 9)),
                    is_terminal=True,
                )
            )
            return steps

        # Push unvisited neighbors in reverse sorted order so that
        # alphabetically-first neighbor is on top (explored first)
        neighbors = sorted(adjacency_list.get(current, []), reverse=True)

        for neighbor in neighbors:
            if neighbor not in visited:
                if neighbor not in predecessor:
                    predecessor[neighbor] = current
                stack.append(neighbor)

        unvisited_neighbors = [n for n in neighbors if n not in visited]

        if unvisited_neighbors:
            edge_actions: list[VisualAction] = [
                VisualAction(
                    type="highlightEdge", params={"from": current, "to": nb, "color": "highlight"}
                )
                for nb in unvisited_neighbors
            ]

            visited_actions2: list[VisualAction] = [
                VisualAction(
                    type="visitNode",
                    params={"nodeId": vid, "color": "start" if vid == start_node else "visited"},
                )
                for vid in sorted(visited)
            ]

            steps.append(
                Step(
                    index=idx,
                    id="push_neighbors",
                    title=f'Push Neighbors of "{current}"',
                    explanation=(
                        f'Pushed unvisited neighbors of "{current}" onto the stack: '
                        f"[{', '.join(unvisited_neighbors)}]. "
                        f"Stack is now: [{', '.join(stack)}]."
                    ),
                    state={
                        "nodes": nodes,
                        "edges": edges,
                        "visited": sorted(visited),
                        "stack": list(stack),
                        "current": current,
                        "dataStructure": {"type": "stack", "label": "Stack", "items": list(stack)},
                    },
                    visual_actions=tuple(
                        [
                            VisualAction(type="setCurrentNode", params={"nodeId": current}),
                            *edge_actions,
                            *visited_actions2,
                        ]
                    ),
                    code_highlight=CodeHighlight(language="pseudocode", lines=(10, 11, 12)),
                    is_terminal=False,
                )
            )
            idx += 1

    # --- DFS complete ---
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
                    f'DFS explored all reachable nodes from "{start_node}" but '
                    f'"{target_node}" was not found.'
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
                title="DFS Exploration Complete",
                explanation=f'Explored all {len(visited)} reachable node(s) from "{start_node}".',
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
