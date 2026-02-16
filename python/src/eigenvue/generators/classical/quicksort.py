"""
QuickSort — Step Generator (Lomuto partition, Python mirror of generator.ts).

Lomuto partition:
  pivot = array[high]
  i = low - 1
  for j = low to high - 1:
    if array[j] <= pivot: i++; swap(array[i], array[j])
  swap(array[i + 1], array[high])
  return i + 1

Mathematical invariant:
  At all times during partition:
    array[low..i]   <= pivot
    array[i+1..j-1] > pivot
    array[high] = pivot

CROSS-LANGUAGE PARITY: Must produce identical steps to the TypeScript version.
"""

from __future__ import annotations

from typing import Any

from eigenvue._step_types import CodeHighlight, Step, VisualAction


def generate(inputs: dict[str, Any]) -> list[Step]:
    """Generate quicksort visualization steps."""
    array: list[int] = list(inputs["array"])
    n = len(array)

    steps: list[Step] = []
    idx = 0

    if n <= 1:
        va_list: list[VisualAction] = []
        if n == 1:
            va_list.append(VisualAction(type="markSorted", params={"indices": [0]}))
        va_list.append(
            VisualAction(
                type="showMessage",
                params={"text": "Already sorted!", "messageType": "success"},
            )
        )

        steps.append(
            Step(
                index=idx,
                id="already_sorted",
                title="Already Sorted",
                explanation=(
                    "The array is empty — nothing to sort."
                    if n == 0
                    else f"Only one element ({array[0]}). Trivially sorted."
                ),
                state={"array": list(array)},
                visual_actions=tuple(va_list),
                code_highlight=CodeHighlight(language="pseudocode", lines=(1,)),
                is_terminal=True,
            )
        )
        return steps

    sorted_indices: set[int] = set()

    steps.append(
        Step(
            index=idx,
            id="initialize",
            title="Initialize QuickSort",
            explanation=(
                f"Starting QuickSort on {n} elements. We will pick a pivot, "
                f"partition the array around it, and recursively sort the two halves."
            ),
            state={"array": list(array), "sorted": []},
            visual_actions=(VisualAction(type="highlightRange", params={"from": 0, "to": n - 1}),),
            code_highlight=CodeHighlight(language="pseudocode", lines=(1, 2)),
            is_terminal=False,
        )
    )
    idx += 1

    # Use an explicit stack to simulate recursion
    stack: list[tuple[int, int]] = [(0, n - 1)]

    while stack:
        low, high = stack.pop()

        if low >= high:
            if low == high and low not in sorted_indices:
                sorted_indices.add(low)
            continue

        # --- Pivot selection: last element ---
        pivot = array[high]

        sorted_va: list[VisualAction] = (
            [VisualAction(type="markSorted", params={"indices": sorted(sorted_indices)})]
            if sorted_indices
            else []
        )

        steps.append(
            Step(
                index=idx,
                id="select_pivot",
                title=f"Select Pivot = {pivot}",
                explanation=(
                    f"Partitioning sub-array [{low}..{high}]. "
                    f"Pivot = array[{high}] = {pivot} (last element)."
                ),
                state={
                    "array": list(array),
                    "low": low,
                    "high": high,
                    "pivot": pivot,
                    "sorted": sorted(sorted_indices),
                },
                visual_actions=tuple(
                    [
                        VisualAction(type="highlightRange", params={"from": low, "to": high}),
                        VisualAction(
                            type="highlightElement", params={"index": high, "color": "pivot"}
                        ),
                        VisualAction(type="markPivot", params={"index": high}),
                        VisualAction(type="movePointer", params={"id": "low", "to": low}),
                        VisualAction(type="movePointer", params={"id": "high", "to": high}),
                        *sorted_va,
                    ]
                ),
                code_highlight=CodeHighlight(language="pseudocode", lines=(3, 4)),
                is_terminal=False,
            )
        )
        idx += 1

        # --- Lomuto Partition ---
        i = low - 1

        for j in range(low, high):
            leq = array[j] <= pivot

            sorted_va2: list[VisualAction] = (
                [VisualAction(type="markSorted", params={"indices": sorted(sorted_indices)})]
                if sorted_indices
                else []
            )

            partition_va: list[VisualAction] = (
                [VisualAction(type="setPartition", params={"index": i})] if i >= low else []
            )

            steps.append(
                Step(
                    index=idx,
                    id="partition_compare",
                    title=f"Compare [{j}] with Pivot",
                    explanation=(
                        f"array[{j}] = {array[j]}. Pivot = {pivot}. "
                        + (
                            f'{array[j]} \u2264 {pivot}, so move it to the "small" section.'
                            if leq
                            else f'{array[j]} > {pivot}, leave it in the "large" section.'
                        )
                    ),
                    state={
                        "array": list(array),
                        "low": low,
                        "high": high,
                        "pivot": pivot,
                        "i": i,
                        "j": j,
                        "sorted": sorted(sorted_indices),
                    },
                    visual_actions=tuple(
                        [
                            VisualAction(type="highlightRange", params={"from": low, "to": high}),
                            VisualAction(
                                type="highlightElement",
                                params={
                                    "index": j,
                                    "color": "highlight" if leq else "highlightAlt",
                                },
                            ),
                            VisualAction(
                                type="highlightElement", params={"index": high, "color": "pivot"}
                            ),
                            VisualAction(type="movePointer", params={"id": "i", "to": max(low, i)}),
                            VisualAction(type="movePointer", params={"id": "j", "to": j}),
                            *partition_va,
                            *sorted_va2,
                        ]
                    ),
                    code_highlight=CodeHighlight(language="pseudocode", lines=(6, 7)),
                    is_terminal=False,
                )
            )
            idx += 1

            if leq:
                i += 1

                if i != j:
                    array[i], array[j] = array[j], array[i]

                    sorted_va3: list[VisualAction] = (
                        [
                            VisualAction(
                                type="markSorted", params={"indices": sorted(sorted_indices)}
                            )
                        ]
                        if sorted_indices
                        else []
                    )

                    steps.append(
                        Step(
                            index=idx,
                            id="partition_swap",
                            title=f"Swap [{i}] \u2194 [{j}]",
                            explanation=(
                                f"Swapping array[{i}] (was {array[j]}) with array[{j}] (was {array[i]}). "
                                f'This places {array[i]} in the "small" partition (indices [{low}..{i}]).'
                            ),
                            state={
                                "array": list(array),
                                "low": low,
                                "high": high,
                                "pivot": pivot,
                                "i": i,
                                "j": j,
                                "sorted": sorted(sorted_indices),
                            },
                            visual_actions=tuple(
                                [
                                    VisualAction(
                                        type="highlightRange", params={"from": low, "to": high}
                                    ),
                                    VisualAction(type="swapElements", params={"i": i, "j": j}),
                                    VisualAction(
                                        type="highlightElement",
                                        params={"index": high, "color": "pivot"},
                                    ),
                                    VisualAction(type="movePointer", params={"id": "i", "to": i}),
                                    VisualAction(type="movePointer", params={"id": "j", "to": j}),
                                    *sorted_va3,
                                ]
                            ),
                            code_highlight=CodeHighlight(language="pseudocode", lines=(8, 9)),
                            is_terminal=False,
                        )
                    )
                    idx += 1

        # --- Place the pivot in its final position ---
        pivot_idx = i + 1

        if pivot_idx != high:
            array[pivot_idx], array[high] = array[high], array[pivot_idx]

        sorted_indices.add(pivot_idx)

        steps.append(
            Step(
                index=idx,
                id="pivot_placed",
                title=f"Pivot Placed at [{pivot_idx}]",
                explanation=(
                    f"Swapped pivot ({pivot}) into its final position at index {pivot_idx}. "
                    f"All elements in [{low}..{pivot_idx - 1}] \u2264 {pivot}. "
                    f"All elements in [{pivot_idx + 1}..{high}] > {pivot}. "
                    f"Index {pivot_idx} is now permanently sorted."
                ),
                state={
                    "array": list(array),
                    "low": low,
                    "high": high,
                    "pivotIdx": pivot_idx,
                    "sorted": sorted(sorted_indices),
                },
                visual_actions=(
                    VisualAction(type="highlightRange", params={"from": low, "to": high}),
                    VisualAction(
                        type="highlightElement", params={"index": pivot_idx, "color": "sorted"}
                    ),
                    VisualAction(type="setPartition", params={"index": pivot_idx - 1}),
                    VisualAction(type="markSorted", params={"indices": sorted(sorted_indices)}),
                ),
                code_highlight=CodeHighlight(language="pseudocode", lines=(10, 11)),
                is_terminal=False,
            )
        )
        idx += 1

        # Push sub-problems (right first so left is processed first)
        if pivot_idx + 1 < high:
            stack.append((pivot_idx + 1, high))
        elif pivot_idx + 1 == high:
            sorted_indices.add(high)

        if low < pivot_idx - 1:
            stack.append((low, pivot_idx - 1))
        elif low == pivot_idx - 1:
            sorted_indices.add(low)

    # --- Final result ---
    steps.append(
        Step(
            index=idx,
            id="complete",
            title="Sorting Complete",
            explanation=f"QuickSort complete. All {n} elements are in sorted order.",
            state={
                "array": list(array),
                "sorted": list(range(n)),
            },
            visual_actions=(
                VisualAction(type="markSorted", params={"indices": list(range(n))}),
                VisualAction(
                    type="showMessage",
                    params={"text": "Array is sorted!", "messageType": "success"},
                ),
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=(13,)),
            is_terminal=True,
        )
    )

    return steps
