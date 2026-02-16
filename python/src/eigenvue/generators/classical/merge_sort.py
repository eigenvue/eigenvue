"""
Merge Sort — Step Generator (bottom-up / iterative, Python mirror of generator.ts).

Bottom-up Merge Sort processes the array in rounds:
  Round 0: sub-arrays of size 1 (trivially sorted)
  Round 1: merge pairs into sorted sub-arrays of size 2
  Round ceil(log2(N)): final merge produces the complete sorted array

The merge operation uses an auxiliary buffer. Stability is preserved
by taking from the left half when elements are equal.

CROSS-LANGUAGE PARITY: Must produce identical steps to the TypeScript version.
"""

from __future__ import annotations

import math
from typing import Any

from eigenvue._step_types import CodeHighlight, Step, VisualAction


def generate(inputs: dict[str, Any]) -> list[Step]:
    """Generate merge sort visualization steps."""
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

    steps.append(
        Step(
            index=idx,
            id="initialize",
            title="Initialize Merge Sort",
            explanation=(
                f"Starting bottom-up Merge Sort on {n} elements. "
                f"We will merge sub-arrays of increasing size: 1, 2, 4, ... "
                f"until the entire array is sorted. This requires \u2308log\u2082({n})\u2309 = "
                f"{math.ceil(math.log2(n))} rounds."
            ),
            state={"array": list(array), "auxiliary": [None] * n},
            visual_actions=(VisualAction(type="highlightRange", params={"from": 0, "to": n - 1}),),
            code_highlight=CodeHighlight(language="pseudocode", lines=(1, 2)),
            is_terminal=False,
        )
    )
    idx += 1

    # --- Bottom-up merge sort ---
    size = 1
    while size < n:
        round_num = int(math.log2(size)) + 1

        steps.append(
            Step(
                index=idx,
                id="round_start",
                title=f"Round {round_num}: Merge Sub-arrays of Size {size}",
                explanation=(
                    f"Merging adjacent sub-arrays of size {size} into sorted sub-arrays of size {min(size * 2, n)}. "
                    f"Processing {math.ceil(n / (size * 2))} merge(s)."
                ),
                state={
                    "array": list(array),
                    "auxiliary": [None] * n,
                    "size": size,
                    "round": round_num,
                },
                visual_actions=(
                    VisualAction(type="highlightRange", params={"from": 0, "to": n - 1}),
                ),
                code_highlight=CodeHighlight(language="pseudocode", lines=(3,)),
                is_terminal=False,
            )
        )
        idx += 1

        left_pos = 0
        while left_pos < n:
            mid_pos = min(left_pos + size - 1, n - 1)
            right_pos = min(left_pos + 2 * size - 1, n - 1)

            # Skip if no right sub-array to merge with
            if mid_pos >= right_pos:
                left_pos += size * 2
                continue

            # --- Merge [left..mid] and [mid+1..right] ---
            left_slice = array[left_pos : mid_pos + 1]
            right_slice = array[mid_pos + 1 : right_pos + 1]

            steps.append(
                Step(
                    index=idx,
                    id="merge_start",
                    title=f"Merge [{left_pos}..{mid_pos}] and [{mid_pos + 1}..{right_pos}]",
                    explanation=(
                        f"Left half: [{', '.join(str(x) for x in left_slice)}]. "
                        f"Right half: [{', '.join(str(x) for x in right_slice)}]. "
                        f"Merging into a sorted sub-array of length {right_pos - left_pos + 1}."
                    ),
                    state={
                        "array": list(array),
                        "auxiliary": [None] * n,
                        "left": left_pos,
                        "mid": mid_pos,
                        "right": right_pos,
                    },
                    visual_actions=(
                        VisualAction(
                            type="highlightRange",
                            params={"from": left_pos, "to": mid_pos, "color": "highlight"},
                        ),
                        VisualAction(
                            type="highlightRange",
                            params={"from": mid_pos + 1, "to": right_pos, "color": "highlightAlt"},
                        ),
                        VisualAction(type="movePointer", params={"id": "left", "to": left_pos}),
                        VisualAction(type="movePointer", params={"id": "right", "to": right_pos}),
                    ),
                    code_highlight=CodeHighlight(language="pseudocode", lines=(4, 5)),
                    is_terminal=False,
                )
            )
            idx += 1

            aux: list[int | None] = [None] * n
            i = left_pos
            j = mid_pos + 1
            k = left_pos

            while i <= mid_pos and j <= right_pos:
                # Stability: use <= so equal elements from LEFT half go first
                if array[i] <= array[j]:
                    aux[k] = array[i]

                    steps.append(
                        Step(
                            index=idx,
                            id="merge_pick_left",
                            title=f"Pick {array[i]} from Left",
                            explanation=(
                                f"Comparing array[{i}] = {array[i]} with array[{j}] = {array[j]}. "
                                f"{array[i]} \u2264 {array[j]}, so take from the left half. "
                                f"Write {array[i]} to auxiliary[{k}]."
                            ),
                            state={
                                "array": list(array),
                                "auxiliary": list(aux),
                                "i": i,
                                "j": j,
                                "k": k,
                                "left": left_pos,
                                "mid": mid_pos,
                                "right": right_pos,
                            },
                            visual_actions=(
                                VisualAction(
                                    type="highlightElement",
                                    params={"index": i, "color": "highlight"},
                                ),
                                VisualAction(
                                    type="highlightElement",
                                    params={"index": j, "color": "highlightAlt"},
                                ),
                                VisualAction(type="movePointer", params={"id": "i", "to": i}),
                                VisualAction(type="movePointer", params={"id": "j", "to": j}),
                                VisualAction(type="setAuxiliary", params={"array": list(aux)}),
                                VisualAction(
                                    type="highlightAuxiliary",
                                    params={"index": k, "color": "highlight"},
                                ),
                            ),
                            code_highlight=CodeHighlight(language="pseudocode", lines=(7, 8)),
                            is_terminal=False,
                        )
                    )
                    idx += 1
                    i += 1
                else:
                    aux[k] = array[j]

                    steps.append(
                        Step(
                            index=idx,
                            id="merge_pick_right",
                            title=f"Pick {array[j]} from Right",
                            explanation=(
                                f"Comparing array[{i}] = {array[i]} with array[{j}] = {array[j]}. "
                                f"{array[j]} < {array[i]}, so take from the right half. "
                                f"Write {array[j]} to auxiliary[{k}]."
                            ),
                            state={
                                "array": list(array),
                                "auxiliary": list(aux),
                                "i": i,
                                "j": j,
                                "k": k,
                                "left": left_pos,
                                "mid": mid_pos,
                                "right": right_pos,
                            },
                            visual_actions=(
                                VisualAction(
                                    type="highlightElement",
                                    params={"index": i, "color": "highlight"},
                                ),
                                VisualAction(
                                    type="highlightElement",
                                    params={"index": j, "color": "highlightAlt"},
                                ),
                                VisualAction(type="movePointer", params={"id": "i", "to": i}),
                                VisualAction(type="movePointer", params={"id": "j", "to": j}),
                                VisualAction(type="setAuxiliary", params={"array": list(aux)}),
                                VisualAction(
                                    type="highlightAuxiliary",
                                    params={"index": k, "color": "highlightAlt"},
                                ),
                            ),
                            code_highlight=CodeHighlight(language="pseudocode", lines=(9, 10)),
                            is_terminal=False,
                        )
                    )
                    idx += 1
                    j += 1

                k += 1

            # Copy remaining from left half
            while i <= mid_pos:
                aux[k] = array[i]
                i += 1
                k += 1

            # Copy remaining from right half
            while j <= right_pos:
                aux[k] = array[j]
                j += 1
                k += 1

            # Copy auxiliary back into the main array
            for w in range(left_pos, right_pos + 1):
                array[w] = aux[w]  # type: ignore[assignment]

            steps.append(
                Step(
                    index=idx,
                    id="merge_complete",
                    title=f"Merge Complete: [{left_pos}..{right_pos}]",
                    explanation=(
                        f"Merged result: [{', '.join(str(array[w]) for w in range(left_pos, right_pos + 1))}]. "
                        f"Sub-array [{left_pos}..{right_pos}] is now sorted."
                    ),
                    state={
                        "array": list(array),
                        "auxiliary": list(aux),
                        "left": left_pos,
                        "right": right_pos,
                    },
                    visual_actions=(
                        VisualAction(
                            type="highlightRange",
                            params={"from": left_pos, "to": right_pos, "color": "sorted"},
                        ),
                        VisualAction(type="setAuxiliary", params={"array": list(aux)}),
                    ),
                    code_highlight=CodeHighlight(language="pseudocode", lines=(12, 13)),
                    is_terminal=False,
                )
            )
            idx += 1

            left_pos += size * 2

        size *= 2

    # --- Final result ---
    steps.append(
        Step(
            index=idx,
            id="complete",
            title="Sorting Complete",
            explanation=f"Merge Sort complete. All {n} elements are in sorted order.",
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
            code_highlight=CodeHighlight(language="pseudocode", lines=(15,)),
            is_terminal=True,
        )
    )

    return steps
