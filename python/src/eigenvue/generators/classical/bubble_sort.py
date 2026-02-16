"""
Bubble Sort — Step Generator (Python mirror of generator.ts).

Produces a step sequence showing:
  1. Initialization
  2. For each pass (outer loop):
     a. For each adjacent pair comparison (inner loop):
        - Compare step: highlights the two elements being compared
        - Swap step (if needed): shows the swap and the resulting array
     b. Pass complete: marks the newly sorted element
  3. Early termination if no swaps in a full pass
  4. Final sorted result

Mathematical invariant: After pass p (0-indexed), the elements at
indices [N-1-p, N-1] are in their final sorted positions.

CROSS-LANGUAGE PARITY: Must produce identical steps to the TypeScript version.
"""

from __future__ import annotations

from typing import Any

from eigenvue._step_types import CodeHighlight, Step, VisualAction


def generate(inputs: dict[str, Any]) -> list[Step]:
    """Generate bubble sort visualization steps."""
    array: list[int] = list(inputs["array"])
    n = len(array)

    steps: list[Step] = []
    idx = 0

    # --- Edge case: empty or single-element array ---
    if n <= 1:
        va_list: list[VisualAction] = []
        if n == 1:
            va_list.append(VisualAction(type="markSorted", params={"indices": [0]}))
        va_list.append(
            VisualAction(
                type="showMessage",
                params={"text": "Array is already sorted!", "messageType": "success"},
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
                    else f"The array has only one element ({array[0]}). It is trivially sorted."
                ),
                state={"array": list(array)},
                visual_actions=tuple(va_list),
                code_highlight=CodeHighlight(language="pseudocode", lines=(1,)),
                is_terminal=True,
            )
        )
        return steps

    # --- Step: Initialize ---
    steps.append(
        Step(
            index=idx,
            id="initialize",
            title="Initialize Bubble Sort",
            explanation=(
                f"Starting Bubble Sort on an array of {n} elements. "
                f"We will make up to {n - 1} passes through the array, comparing "
                f"adjacent elements and swapping them if they are out of order."
            ),
            state={"array": list(array), "pass": 0, "sorted": []},
            visual_actions=(VisualAction(type="highlightRange", params={"from": 0, "to": n - 1}),),
            code_highlight=CodeHighlight(language="pseudocode", lines=(1, 2)),
            is_terminal=False,
        )
    )
    idx += 1

    sorted_indices: list[int] = []

    # --- Outer loop: passes ---
    for pass_num in range(n - 1):
        swapped = False

        # Build sorted markings
        sorted_actions: list[VisualAction] = [
            VisualAction(type="markSorted", params={"indices": [si]}) for si in sorted_indices
        ]

        steps.append(
            Step(
                index=idx,
                id="pass_start",
                title=f"Pass {pass_num + 1}",
                explanation=(
                    f"Starting pass {pass_num + 1} of at most {n - 1}. "
                    f"Comparing elements from index 0 to {n - 2 - pass_num}. "
                    f"After this pass, element at index {n - 1 - pass_num} will be in its final position."
                ),
                state={
                    "array": list(array),
                    "pass": pass_num,
                    "sorted": list(sorted_indices),
                },
                visual_actions=tuple(
                    [
                        VisualAction(
                            type="highlightRange", params={"from": 0, "to": n - 1 - pass_num}
                        ),
                        *sorted_actions,
                    ]
                ),
                code_highlight=CodeHighlight(language="pseudocode", lines=(3,)),
                is_terminal=False,
            )
        )
        idx += 1

        # --- Inner loop: adjacent comparisons ---
        for j in range(n - 1 - pass_num):
            is_greater = array[j] > array[j + 1]

            sorted_actions_inner: list[VisualAction] = [
                VisualAction(type="markSorted", params={"indices": [si]}) for si in sorted_indices
            ]

            steps.append(
                Step(
                    index=idx,
                    id="compare",
                    title=f"Compare [{j}] and [{j + 1}]",
                    explanation=(
                        f"Comparing array[{j}] = {array[j]} with array[{j + 1}] = {array[j + 1]}. "
                        + (
                            f"{array[j]} > {array[j + 1]}, so we need to swap."
                            if is_greater
                            else f"{array[j]} \u2264 {array[j + 1]}, no swap needed."
                        )
                    ),
                    state={
                        "array": list(array),
                        "pass": pass_num,
                        "comparing": [j, j + 1],
                        "sorted": list(sorted_indices),
                    },
                    visual_actions=tuple(
                        [
                            VisualAction(
                                type="compareElements",
                                params={
                                    "i": j,
                                    "j": j + 1,
                                    "result": "greater" if is_greater else "less",
                                },
                            ),
                            VisualAction(
                                type="highlightElement", params={"index": j, "color": "highlight"}
                            ),
                            VisualAction(
                                type="highlightElement",
                                params={"index": j + 1, "color": "highlightAlt"},
                            ),
                            VisualAction(type="movePointer", params={"id": "j", "to": j}),
                            *sorted_actions_inner,
                        ]
                    ),
                    code_highlight=CodeHighlight(language="pseudocode", lines=(4, 5)),
                    is_terminal=False,
                )
            )
            idx += 1

            if is_greater:
                # Perform the swap
                array[j], array[j + 1] = array[j + 1], array[j]
                swapped = True

                sorted_actions_swap: list[VisualAction] = [
                    VisualAction(type="markSorted", params={"indices": [si]})
                    for si in sorted_indices
                ]

                steps.append(
                    Step(
                        index=idx,
                        id="swap",
                        title=f"Swap [{j}] \u2194 [{j + 1}]",
                        explanation=(
                            f"Swapped {array[j + 1]} and {array[j]}. "
                            f"The larger value ({array[j + 1]}) moves one position to the right."
                        ),
                        state={
                            "array": list(array),
                            "pass": pass_num,
                            "swapped": [j, j + 1],
                            "sorted": list(sorted_indices),
                        },
                        visual_actions=tuple(
                            [
                                VisualAction(type="swapElements", params={"i": j, "j": j + 1}),
                                VisualAction(
                                    type="highlightElement",
                                    params={"index": j, "color": "highlight"},
                                ),
                                VisualAction(
                                    type="highlightElement",
                                    params={"index": j + 1, "color": "highlightAlt"},
                                ),
                                *sorted_actions_swap,
                            ]
                        ),
                        code_highlight=CodeHighlight(language="pseudocode", lines=(6, 7, 8)),
                        is_terminal=False,
                    )
                )
                idx += 1

        # Mark the element at N-1-pass as sorted
        sorted_indices.append(n - 1 - pass_num)

        # --- Early termination check ---
        if not swapped:
            for k in range(n - 2 - pass_num + 1):
                sorted_indices.append(k)

            steps.append(
                Step(
                    index=idx,
                    id="early_termination",
                    title="No Swaps \u2014 Early Termination",
                    explanation=(
                        f"No swaps occurred during pass {pass_num + 1}. "
                        f"This means the array is already sorted. Terminating early."
                    ),
                    state={
                        "array": list(array),
                        "pass": pass_num,
                        "sorted": list(sorted_indices),
                    },
                    visual_actions=(
                        VisualAction(type="markSorted", params={"indices": list(sorted_indices)}),
                        VisualAction(
                            type="showMessage",
                            params={
                                "text": "Sorted! (early termination)",
                                "messageType": "success",
                            },
                        ),
                    ),
                    code_highlight=CodeHighlight(language="pseudocode", lines=(9, 10)),
                    is_terminal=True,
                )
            )
            return steps

    # After N-1 passes, the first element is also in its final position
    sorted_indices.append(0)

    # --- Final result ---
    steps.append(
        Step(
            index=idx,
            id="complete",
            title="Sorting Complete",
            explanation=f"Bubble Sort complete. All {n} elements are now in sorted order.",
            state={
                "array": list(array),
                "sorted": list(sorted_indices),
            },
            visual_actions=(
                VisualAction(type="markSorted", params={"indices": list(sorted_indices)}),
                VisualAction(
                    type="showMessage",
                    params={"text": "Array is sorted!", "messageType": "success"},
                ),
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=(12,)),
            is_terminal=True,
        )
    )

    return steps
