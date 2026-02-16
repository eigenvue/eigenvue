"""
Dijkstra's Shortest Path — Step Generator (Python mirror of generator.ts).

Finds shortest paths from source to all nodes in a weighted graph
with non-negative edge weights. Uses a simple sorted-array priority queue.

Correctness: When node u is extracted from PQ, dist[u] is final because
all edges are non-negative and we always extract the minimum.

CRITICAL: Requires non-negative edge weights.

CROSS-LANGUAGE PARITY: Must produce identical steps to the TypeScript version.
"""

from __future__ import annotations

import math
from typing import Any

from eigenvue._step_types import CodeHighlight, Step, VisualAction


def generate(inputs: dict[str, Any]) -> list[Step]:
    """Generate Dijkstra's algorithm visualization steps."""
    adjacency_list: dict[str, list[dict[str, Any]]] = inputs["adjacencyList"]
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

    # Build edges array with weights for display
    edge_set: set[str] = set()
    edges: list[dict[str, Any]] = []
    for from_node, neighbors in adjacency_list.items():
        for entry in neighbors:
            to_node = entry["to"]
            weight = entry["weight"]
            key = "-".join(sorted([from_node, to_node]))
            if key not in edge_set:
                edge_set.add(key)
                edges.append(
                    {"from": from_node, "to": to_node, "weight": weight, "directed": False}
                )

    steps: list[Step] = []
    idx = 0

    # --- Initialize ---
    dist: dict[str, float] = {}
    dist_display: dict[str, Any] = {}
    predecessor: dict[str, str | None] = {}
    visited: set[str] = set()

    for nid in node_ids:
        dist[nid] = 0.0 if nid == start_node else math.inf
        dist_display[nid] = 0 if nid == start_node else "\u221e"
        predecessor[nid] = None

    # Priority queue: list of (id, dist), sorted by dist ascending
    pq: list[dict[str, Any]] = [{"id": start_node, "dist": 0}]

    steps.append(
        Step(
            index=idx,
            id="initialize",
            title="Initialize Dijkstra's Algorithm",
            explanation=(
                f'Starting Dijkstra\'s algorithm from node "{start_node}". '
                f'Set distance to "{start_node}" = 0 and all others = \u221e. '
                f'Add "{start_node}" to the priority queue.'
            ),
            state={
                "nodes": nodes,
                "edges": edges,
                "visited": sorted(visited),
                "distances": dict(dist_display),
                "dataStructure": {
                    "type": "priority-queue",
                    "label": "PQ",
                    "items": [f"{e['id']}:{e['dist']}" for e in pq],
                },
            },
            visual_actions=tuple(
                [
                    VisualAction(type="visitNode", params={"nodeId": start_node, "color": "start"}),
                    *[
                        VisualAction(
                            type="updateNodeValue",
                            params={
                                "nodeId": nid,
                                "value": "0" if nid == start_node else "\u221e",
                            },
                        )
                        for nid in node_ids
                    ],
                ]
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=(1, 2, 3)),
            is_terminal=False,
        )
    )
    idx += 1

    # --- Main loop ---
    while pq:
        # Extract minimum
        pq.sort(key=lambda e: e["dist"])
        entry = pq.pop(0)
        u: str = entry["id"]
        u_dist: float = entry["dist"]

        # Skip stale PQ entries (already visited)
        if u in visited:
            continue

        visited.add(u)

        visited_actions: list[VisualAction] = [
            VisualAction(
                type="visitNode",
                params={"nodeId": vid, "color": "start" if vid == start_node else "visited"},
            )
            for vid in sorted(visited)
        ]
        node_value_actions: list[VisualAction] = [
            VisualAction(
                type="updateNodeValue",
                params={
                    "nodeId": nid,
                    "value": str(dist_display[nid]),
                },
            )
            for nid in node_ids
        ]

        steps.append(
            Step(
                index=idx,
                id="extract_min",
                title=f'Process "{u}" (dist = {u_dist})',
                explanation=(
                    f'Extracted "{u}" with distance {u_dist} from the priority queue. '
                    f"This is the closest unvisited node. Its distance is now finalized."
                ),
                state={
                    "nodes": nodes,
                    "edges": edges,
                    "visited": sorted(visited),
                    "distances": dict(dist_display),
                    "current": u,
                    "dataStructure": {
                        "type": "priority-queue",
                        "label": "PQ",
                        "items": [f"{e['id']}:{e['dist']}" for e in pq],
                    },
                },
                visual_actions=tuple(
                    [
                        VisualAction(type="setCurrentNode", params={"nodeId": u}),
                        *visited_actions,
                        *node_value_actions,
                    ]
                ),
                code_highlight=CodeHighlight(language="pseudocode", lines=(5, 6)),
                is_terminal=False,
            )
        )
        idx += 1

        # Check target
        if target_node and u == target_node:
            path: list[str] = []
            node: str | None = target_node
            while node is not None:
                path.insert(0, node)
                node = predecessor.get(node)

            node_value_actions2: list[VisualAction] = [
                VisualAction(
                    type="updateNodeValue",
                    params={
                        "nodeId": nid,
                        "value": str(dist_display[nid]),
                    },
                )
                for nid in node_ids
            ]

            steps.append(
                Step(
                    index=idx,
                    id="target_found",
                    title=f'Shortest Path to "{target_node}" Found!',
                    explanation=(
                        f'Found shortest path to "{target_node}" with total distance {u_dist}. '
                        + "Path: "
                        + " \u2192 ".join(path)
                        + "."
                    ),
                    state={
                        "nodes": nodes,
                        "edges": edges,
                        "visited": sorted(visited),
                        "distances": dict(dist_display),
                        "path": path,
                        "predecessors": dict(predecessor),
                    },
                    visual_actions=tuple(
                        [
                            VisualAction(type="markPath", params={"nodeIds": path}),
                            *node_value_actions2,
                            VisualAction(
                                type="showMessage",
                                params={
                                    "text": "Shortest path: "
                                    + " \u2192 ".join(path)
                                    + f" (cost: {u_dist})",
                                    "messageType": "success",
                                },
                            ),
                        ]
                    ),
                    code_highlight=CodeHighlight(language="pseudocode", lines=(14, 15)),
                    is_terminal=True,
                )
            )
            return steps

        # --- Relax edges ---
        neighbors = adjacency_list.get(u, [])

        for entry_n in neighbors:
            v: str = entry_n["to"]
            weight: float = entry_n["weight"]

            if v in visited:
                continue

            new_dist = dist[u] + weight
            improved = new_dist < dist[v]

            visited_actions3: list[VisualAction] = [
                VisualAction(
                    type="visitNode",
                    params={"nodeId": vid, "color": "start" if vid == start_node else "visited"},
                )
                for vid in sorted(visited)
            ]
            node_value_actions3: list[VisualAction] = [
                VisualAction(
                    type="updateNodeValue",
                    params={
                        "nodeId": nid,
                        "value": str(dist_display[nid]),
                    },
                )
                for nid in node_ids
            ]

            steps.append(
                Step(
                    index=idx,
                    id="relax_edge",
                    title=f"Relax Edge {u} \u2192 {v}",
                    explanation=(
                        f"Checking edge {u} \u2192 {v} (weight = {weight}). "
                        f"Current dist[{v}] = {dist_display[v]}. "
                        f"New candidate: dist[{u}] + {weight} = {u_dist} + {weight} = {new_dist}. "
                        + (
                            f"{new_dist} < {dist_display[v]}, so update dist[{v}] = {new_dist}."
                            if improved
                            else f"{new_dist} \u2265 {dist_display[v]}, no improvement."
                        )
                    ),
                    state={
                        "nodes": nodes,
                        "edges": edges,
                        "visited": sorted(visited),
                        "distances": dict(dist_display),
                        "current": u,
                        "relaxing": {"from": u, "to": v, "weight": weight, "newDist": new_dist},
                    },
                    visual_actions=tuple(
                        [
                            VisualAction(type="setCurrentNode", params={"nodeId": u}),
                            VisualAction(
                                type="highlightEdge",
                                params={
                                    "from": u,
                                    "to": v,
                                    "color": "highlight" if improved else "default",
                                },
                            ),
                            *visited_actions3,
                            *node_value_actions3,
                        ]
                    ),
                    code_highlight=CodeHighlight(language="pseudocode", lines=(8, 9, 10)),
                    is_terminal=False,
                )
            )
            idx += 1

            if improved:
                dist[v] = new_dist
                dist_display[v] = new_dist
                predecessor[v] = u
                pq.append({"id": v, "dist": new_dist})

                pq_sorted = sorted(pq, key=lambda e: e["dist"])

                visited_actions4: list[VisualAction] = [
                    VisualAction(
                        type="visitNode",
                        params={
                            "nodeId": vid,
                            "color": "start" if vid == start_node else "visited",
                        },
                    )
                    for vid in sorted(visited)
                ]
                node_value_actions4: list[VisualAction] = [
                    VisualAction(
                        type="updateNodeValue",
                        params={
                            "nodeId": nid,
                            "value": str(dist_display[nid]),
                        },
                    )
                    for nid in node_ids
                ]

                steps.append(
                    Step(
                        index=idx,
                        id="distance_updated",
                        title=f"Update dist[{v}] = {new_dist}",
                        explanation=(
                            f'Updated dist[{v}] to {new_dist}. Predecessor of "{v}" is now "{u}".'
                        ),
                        state={
                            "nodes": nodes,
                            "edges": edges,
                            "visited": sorted(visited),
                            "distances": dict(dist_display),
                            "current": u,
                            "dataStructure": {
                                "type": "priority-queue",
                                "label": "PQ",
                                "items": [f"{e['id']}:{e['dist']}" for e in pq_sorted],
                            },
                        },
                        visual_actions=tuple(
                            [
                                VisualAction(type="setCurrentNode", params={"nodeId": u}),
                                VisualAction(
                                    type="updateDistance", params={"nodeId": v, "value": new_dist}
                                ),
                                VisualAction(
                                    type="highlightEdge",
                                    params={"from": u, "to": v, "color": "highlight"},
                                ),
                                *visited_actions4,
                                *node_value_actions4,
                            ]
                        ),
                        code_highlight=CodeHighlight(language="pseudocode", lines=(11, 12, 13)),
                        is_terminal=False,
                    )
                )
                idx += 1

    # --- Algorithm complete ---
    if target_node and target_node not in visited:
        visited_actions_end: list[VisualAction] = [
            VisualAction(
                type="visitNode",
                params={"nodeId": vid, "color": "start" if vid == start_node else "visited"},
            )
            for vid in sorted(visited)
        ]
        node_value_end: list[VisualAction] = [
            VisualAction(
                type="updateNodeValue",
                params={
                    "nodeId": nid,
                    "value": str(dist_display[nid]),
                },
            )
            for nid in node_ids
        ]

        steps.append(
            Step(
                index=idx,
                id="target_unreachable",
                title=f'"{target_node}" is Unreachable',
                explanation=(
                    f'All reachable nodes processed. "{target_node}" was never reached. '
                    f'It is not connected to "{start_node}".'
                ),
                state={
                    "nodes": nodes,
                    "edges": edges,
                    "visited": sorted(visited),
                    "distances": dict(dist_display),
                },
                visual_actions=tuple(
                    [
                        *visited_actions_end,
                        *node_value_end,
                        VisualAction(
                            type="showMessage",
                            params={
                                "text": f'"{target_node}" is unreachable',
                                "messageType": "error",
                            },
                        ),
                    ]
                ),
                code_highlight=CodeHighlight(language="pseudocode", lines=(16,)),
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
        node_value_end2: list[VisualAction] = [
            VisualAction(
                type="updateNodeValue",
                params={
                    "nodeId": nid,
                    "value": str(dist_display[nid]),
                },
            )
            for nid in node_ids
        ]

        steps.append(
            Step(
                index=idx,
                id="complete",
                title="Dijkstra's Algorithm Complete",
                explanation=(
                    f'All reachable nodes have been processed. Final distances from "{start_node}": '
                    + ", ".join(f"{nid}={dist_display[nid]}" for nid in node_ids)
                    + "."
                ),
                state={
                    "nodes": nodes,
                    "edges": edges,
                    "visited": sorted(visited),
                    "distances": dict(dist_display),
                    "predecessors": dict(predecessor),
                },
                visual_actions=tuple(
                    [
                        *visited_actions_end2,
                        *node_value_end2,
                        VisualAction(
                            type="showMessage",
                            params={
                                "text": "All shortest distances computed!",
                                "messageType": "success",
                            },
                        ),
                    ]
                ),
                code_highlight=CodeHighlight(language="pseudocode", lines=(16,)),
                is_terminal=True,
            )
        )

    return steps
