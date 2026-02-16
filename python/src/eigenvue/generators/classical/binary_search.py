"""
Binary Search — Step Generator (Python mirror of generator.ts).

Generates a step-by-step visualization of iterative binary search on a
sorted array of numbers.

ALGORITHM:
  Given a sorted array and a target value, binary search maintains two
  pointers (left, right) defining the search space. At each iteration:
  1. Compute mid = floor((left + right) / 2).
  2. If array[mid] == target -> found.
  3. If array[mid] < target  -> set left = mid + 1 (search right half).
  4. If array[mid] > target  -> set right = mid - 1 (search left half).
  Repeat until left > right (not found) or target is found.

CROSS-LANGUAGE PARITY: Must produce identical steps to the TypeScript version.
"""

from __future__ import annotations

from typing import Any

from eigenvue._step_types import CodeHighlight, Step, VisualAction


def generate(inputs: dict[str, Any]) -> list[Step]:
    """Generate binary search visualization steps."""
    array: list[int] = list(inputs["array"])
    target: int = inputs["target"]
    n = len(array)

    steps: list[Step] = []
    idx = 0

    left = 0
    right = n - 1

    # -- Step: Initialize --
    steps.append(
        Step(
            index=idx,
            id="initialize",
            title="Initialize Search",
            explanation=(
                f"Searching for {target} in a sorted array of {n} element"
                f"{'s' if n != 1 else ''}. "
                f"Setting left = 0, right = {right}. The entire array is the search space."
            ),
            state={
                "array": list(array),
                "target": target,
                "left": left,
                "right": right,
                "result": None,
            },
            visual_actions=(
                VisualAction(
                    type="highlightRange", params={"from": left, "to": right, "color": "highlight"}
                ),
                VisualAction(type="movePointer", params={"id": "left", "to": left}),
                VisualAction(type="movePointer", params={"id": "right", "to": right}),
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=(1, 2, 3)),
            is_terminal=False,
            phase="initialization",
        )
    )
    idx += 1

    # -- Main loop --
    iteration = 0
    while left <= right:
        iteration += 1
        mid = (left + right) // 2

        # -- Step: Calculate mid --
        steps.append(
            Step(
                index=idx,
                id="calculate_mid",
                title=f"Calculate Middle (Iteration {iteration})",
                explanation=(
                    f"mid = floor(({left} + {right}) / 2) = floor({left + right} / 2) = {mid}. "
                    f"Checking array[{mid}] = {array[mid]}."
                ),
                state={
                    "array": list(array),
                    "target": target,
                    "left": left,
                    "right": right,
                    "mid": mid,
                    "result": None,
                },
                visual_actions=(
                    VisualAction(
                        type="highlightRange",
                        params={"from": left, "to": right, "color": "highlight"},
                    ),
                    VisualAction(
                        type="highlightElement", params={"index": mid, "color": "compare"}
                    ),
                    VisualAction(type="movePointer", params={"id": "left", "to": left}),
                    VisualAction(type="movePointer", params={"id": "right", "to": right}),
                    VisualAction(type="movePointer", params={"id": "mid", "to": mid}),
                ),
                code_highlight=CodeHighlight(language="pseudocode", lines=(5, 6)),
                is_terminal=False,
                phase="search",
            )
        )
        idx += 1

        # -- Compare array[mid] with target --
        if array[mid] == target:
            # -- Step: Found --
            steps.append(
                Step(
                    index=idx,
                    id="found",
                    title="Target Found!",
                    explanation=(
                        f"array[{mid}] = {array[mid]} equals target {target}. "
                        f"Found at index {mid} after {iteration} iteration"
                        f"{'s' if iteration != 1 else ''}."
                    ),
                    state={
                        "array": list(array),
                        "target": target,
                        "left": left,
                        "right": right,
                        "mid": mid,
                        "result": mid,
                    },
                    visual_actions=(
                        VisualAction(type="markFound", params={"index": mid}),
                        VisualAction(type="movePointer", params={"id": "mid", "to": mid}),
                        VisualAction(
                            type="showMessage",
                            params={
                                "text": f"Found {target} at index {mid}!",
                                "messageType": "success",
                            },
                        ),
                    ),
                    code_highlight=CodeHighlight(language="pseudocode", lines=(8,)),
                    is_terminal=True,
                    phase="result",
                )
            )
            return steps

        if array[mid] < target:
            # -- Step: Search right half --
            new_left = mid + 1
            va_list: list[VisualAction] = [
                VisualAction(type="dimRange", params={"from": left, "to": mid}),
            ]
            if new_left <= right:
                va_list.append(
                    VisualAction(
                        type="highlightRange",
                        params={"from": new_left, "to": right, "color": "highlight"},
                    )
                )
            va_list.extend(
                [
                    VisualAction(type="movePointer", params={"id": "left", "to": new_left}),
                    VisualAction(type="movePointer", params={"id": "right", "to": right}),
                    VisualAction(type="movePointer", params={"id": "mid", "to": mid}),
                ]
            )

            steps.append(
                Step(
                    index=idx,
                    id="search_right",
                    title="Search Right Half",
                    explanation=(
                        f"array[{mid}] = {array[mid]} < target {target}. "
                        f"Target must be in the right half. Setting left = {mid} + 1 = {new_left}."
                    ),
                    state={
                        "array": list(array),
                        "target": target,
                        "left": new_left,
                        "right": right,
                        "mid": mid,
                        "result": None,
                    },
                    visual_actions=tuple(va_list),
                    code_highlight=CodeHighlight(language="pseudocode", lines=(10, 11)),
                    is_terminal=False,
                    phase="search",
                )
            )
            idx += 1
            left = new_left
        else:
            # -- Step: Search left half --
            new_right = mid - 1
            va_list2: list[VisualAction] = [
                VisualAction(type="dimRange", params={"from": mid, "to": right}),
            ]
            if left <= new_right:
                va_list2.append(
                    VisualAction(
                        type="highlightRange",
                        params={"from": left, "to": new_right, "color": "highlight"},
                    )
                )
            va_list2.extend(
                [
                    VisualAction(type="movePointer", params={"id": "left", "to": left}),
                    VisualAction(type="movePointer", params={"id": "right", "to": new_right}),
                    VisualAction(type="movePointer", params={"id": "mid", "to": mid}),
                ]
            )

            steps.append(
                Step(
                    index=idx,
                    id="search_left",
                    title="Search Left Half",
                    explanation=(
                        f"array[{mid}] = {array[mid]} > target {target}. "
                        f"Target must be in the left half. Setting right = {mid} - 1 = {new_right}."
                    ),
                    state={
                        "array": list(array),
                        "target": target,
                        "left": left,
                        "right": new_right,
                        "mid": mid,
                        "result": None,
                    },
                    visual_actions=tuple(va_list2),
                    code_highlight=CodeHighlight(language="pseudocode", lines=(12, 13)),
                    is_terminal=False,
                    phase="search",
                )
            )
            idx += 1
            right = new_right

    # -- Step: Not found --
    steps.append(
        Step(
            index=idx,
            id="not_found",
            title="Target Not Found",
            explanation=(
                f"Search space exhausted (left = {left} > right = {right}). "
                f"{target} is not in the array. Returning -1 after {iteration} iteration"
                f"{'s' if iteration != 1 else ''}."
            ),
            state={
                "array": list(array),
                "target": target,
                "left": left,
                "right": right,
                "result": -1,
            },
            visual_actions=(
                VisualAction(type="markNotFound", params={}),
                VisualAction(
                    type="showMessage",
                    params={
                        "text": f"{target} was not found in the array.",
                        "messageType": "warning",
                    },
                ),
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=(15,)),
            is_terminal=True,
            phase="result",
        )
    )

    return steps
