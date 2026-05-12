"""
Heap Sort — Step Generator (Python mirror of generator.ts).

CLRS Chapter 6. Two phases:

  1. BUILD-MAX-HEAP — for i = n // 2 - 1 down to 0, MAX-HEAPIFY at i.
     After this phase, array[0..n-1] is a max-heap.

  2. Repeated extract-max — for heap_size = n down to 2:
       swap array[0] and array[heap_size - 1]
       heap_size -= 1
       MAX-HEAPIFY at 0 over the shrunken heap region

MAX-HEAPIFY at i over heap_size:
  left  = 2*i + 1, right = 2*i + 2
  largest = whichever of {i, left, right} has the greatest value (strict >;
           current node wins ties)
  if largest != i: swap and continue sifting at `largest`.

CROSS-LANGUAGE PARITY: must yield byte-identical step IDs, state field
names/values, and explanation strings to the TypeScript generator at
algorithms/classical/heap-sort/generator.ts. Any change here must be
reflected there.
"""

from __future__ import annotations

from typing import Any

from eigenvue._step_types import CodeHighlight, Step, VisualAction

PHASE_BUILD = "build"
PHASE_EXTRACT = "extract"
PHASE_DONE = "done"


def _snapshot(
    array: list[int],
    heap_size: int,
    phase: str,
    sorted_suffix: list[int],
    node: int | None,
    left: int | None,
    right: int | None,
    largest: int | None,
) -> dict[str, Any]:
    """Build the canonical state dict shared by every step.

    Key order must match the TypeScript snapshot() helper exactly so that
    JSON wire output is byte-identical.
    """
    return {
        "array": list(array),
        "heapSize": heap_size,
        "phase": phase,
        "sortedSuffix": list(sorted_suffix),
        "node": node,
        "left": left,
        "right": right,
        "largest": largest,
    }


def _range_inclusive(lo: int, hi: int) -> list[int]:
    """Return [lo, lo+1, ..., hi], or [] if lo > hi."""
    if lo > hi:
        return []
    return list(range(lo, hi + 1))


def _dim_suffix_actions(heap_size: int, n: int) -> list[VisualAction]:
    """Single dimRange action for the current sorted suffix, or [] if empty."""
    if heap_size <= n - 1:
        return [VisualAction(type="dimRange", params={"from": heap_size, "to": n - 1})]
    return []


def generate(inputs: dict[str, Any]) -> list[Step]:
    """Generate heap-sort visualization steps."""
    array: list[int] = list(inputs["array"])
    n = len(array)
    steps: list[Step] = []
    idx = 0

    # ── Edge case: 0 or 1 elements — trivially sorted, single terminal step. ──
    if n <= 1:
        sorted_suffix = _range_inclusive(0, n - 1)
        terminal_visuals: list[VisualAction] = []
        if n == 1:
            terminal_visuals.append(VisualAction(type="dimRange", params={"from": 0, "to": 0}))
        terminal_visuals.append(
            VisualAction(
                type="showMessage",
                params={"text": "Already sorted!", "messageType": "success"},
            )
        )

        steps.append(
            Step(
                index=idx,
                id="sorted",
                title="Array Already Sorted",
                explanation=(
                    "The array is empty — nothing to sort."
                    if n == 0
                    else (
                        f"Only one element ({array[0]}). A single-element array is trivially "
                        f"a max-heap and is already in sorted order."
                    )
                ),
                state=_snapshot(array, n, PHASE_DONE, sorted_suffix, None, None, None, None),
                visual_actions=tuple(terminal_visuals),
                code_highlight=CodeHighlight(language="pseudocode", lines=(1, 4)),
                is_terminal=True,
                phase="result",
            )
        )
        return steps

    # ──────────────────────────────────────────────────────────────────────
    # PHASE 1 — BUILD-MAX-HEAP
    # ──────────────────────────────────────────────────────────────────────

    steps.append(
        Step(
            index=idx,
            id="initialize",
            title="Initialize Heap Sort",
            explanation=(
                f"Starting Heap Sort on {n} elements. The plan: first turn the array into a max-heap, "
                f"then repeatedly take the largest element off the top of the heap and place it at the "
                f"end of the array. The whole sort happens in-place."
            ),
            state=_snapshot(array, n, PHASE_BUILD, [], None, None, None, None),
            visual_actions=(VisualAction(type="highlightRange", params={"from": 0, "to": n - 1}),),
            code_highlight=CodeHighlight(language="pseudocode", lines=(1, 2)),
            is_terminal=False,
            phase="initialization",
        )
    )
    idx += 1

    start_i = n // 2 - 1
    steps.append(
        Step(
            index=idx,
            id="heapify_start",
            title="Build Max-Heap",
            explanation=(
                f"BUILD-MAX-HEAP starts at index {start_i} = ⌊{n}/2⌋ \u2212 1 — the last node with at "
                f"least one child. We sift each internal node down, working back up to the root. "
                f"Indices {start_i + 1}..{n - 1} are leaves; they trivially already satisfy the "
                f"heap property and are skipped."
            ),
            state=_snapshot(array, n, PHASE_BUILD, [], None, None, None, None),
            visual_actions=(VisualAction(type="highlightRange", params={"from": 0, "to": n - 1}),),
            code_highlight=CodeHighlight(language="pseudocode", lines=(9, 10)),
            is_terminal=False,
            phase="build",
        )
    )
    idx += 1

    for i in range(start_i, -1, -1):
        right_idx = 2 * i + 2
        children_clause = f" and {right_idx}" if right_idx < n else " (no right child)"
        steps.append(
            Step(
                index=idx,
                id="heapify_node",
                title=f"Heapify Node {i}",
                explanation=(
                    f"Sifting node at index {i} (value {array[i]}) down through the heap. "
                    f"Its children are at indices {2 * i + 1}"
                    f"{children_clause}"
                    f". We compare with the larger child and swap if the child is larger; "
                    f"we repeat until the heap property holds or we run out of children."
                ),
                state=_snapshot(array, n, PHASE_BUILD, [], i, None, None, None),
                visual_actions=(
                    VisualAction(type="highlightRange", params={"from": 0, "to": n - 1}),
                    VisualAction(
                        type="highlightElement", params={"index": i, "color": "highlight"}
                    ),
                    VisualAction(type="movePointer", params={"id": "i", "to": i}),
                ),
                code_highlight=CodeHighlight(language="pseudocode", lines=(10, 11)),
                is_terminal=False,
                phase="build",
            )
        )
        idx += 1

        # ── Iterative sift-down from `i` over heap_size = n. ──
        cur = i
        while True:
            left = 2 * cur + 1
            right = 2 * cur + 2
            if left >= n:
                break

            largest = cur
            if left < n and array[left] > array[largest]:
                largest = left
            if right < n and array[right] > array[largest]:
                largest = right

            right_in = right < n
            left_val_str = f"array[{left}] = {array[left]}"
            right_val_str = f"array[{right}] = {array[right]}" if right_in else "(none)"

            compare_visuals: list[VisualAction] = [
                VisualAction(type="highlightRange", params={"from": 0, "to": n - 1}),
                VisualAction(type="highlightElement", params={"index": cur, "color": "highlight"}),
                VisualAction(type="highlightElement", params={"index": left, "color": "compare"}),
                VisualAction(type="movePointer", params={"id": "i", "to": cur}),
                VisualAction(type="movePointer", params={"id": "L", "to": left}),
            ]
            if right_in:
                compare_visuals.append(
                    VisualAction(
                        type="highlightElement", params={"index": right, "color": "compare"}
                    )
                )
                compare_visuals.append(
                    VisualAction(type="movePointer", params={"id": "R", "to": right})
                )

            steps.append(
                Step(
                    index=idx,
                    id="siftdown_compare",
                    title=f"Compare Node {cur} with Children",
                    explanation=(
                        f"At index {cur} (value {array[cur]}). Left child: {left_val_str}. "
                        f"Right child: {right_val_str}. "
                        + (
                            f"Both children are ≤ {array[cur]}, so the heap property holds here — "
                            f"no swap needed and the sift ends."
                            if largest == cur
                            else (
                                f"The largest of the three is at index {largest} "
                                f"(value {array[largest]}), so we will swap {array[cur]} down "
                                f"into position {largest}."
                            )
                        )
                    ),
                    state=_snapshot(
                        array,
                        n,
                        PHASE_BUILD,
                        [],
                        cur,
                        left,
                        right if right_in else None,
                        largest,
                    ),
                    visual_actions=tuple(compare_visuals),
                    code_highlight=CodeHighlight(language="pseudocode", lines=(17, 19)),
                    is_terminal=False,
                    phase="build",
                )
            )
            idx += 1

            if largest == cur:
                break

            # Perform swap, then yield the swap step.
            array[cur], array[largest] = array[largest], array[cur]

            steps.append(
                Step(
                    index=idx,
                    id="siftdown_swap",
                    title=f"Swap [{cur}] ↔ [{largest}]",
                    explanation=(
                        f"Swapping array[{cur}] (was {array[largest]}) with array[{largest}] "
                        f"(was {array[cur]}). "
                        f"The larger child rises to index {cur}; the smaller former parent drops "
                        f"to index {largest}, where we continue sifting it down."
                    ),
                    state=_snapshot(array, n, PHASE_BUILD, [], cur, None, None, largest),
                    visual_actions=(
                        VisualAction(type="highlightRange", params={"from": 0, "to": n - 1}),
                        VisualAction(type="swapElements", params={"i": cur, "j": largest}),
                        VisualAction(type="movePointer", params={"id": "i", "to": largest}),
                    ),
                    code_highlight=CodeHighlight(language="pseudocode", lines=(21, 22)),
                    is_terminal=False,
                    phase="build",
                )
            )
            idx += 1

            cur = largest

    steps.append(
        Step(
            index=idx,
            id="heap_built",
            title="Max-Heap Built",
            explanation=(
                f"BUILD-MAX-HEAP is complete. Every parent is now ≥ both children, and "
                f"array[0] = {array[0]} is the maximum of the whole array. We now move into "
                f"phase 2: repeatedly extract the maximum and shrink the heap."
            ),
            state=_snapshot(array, n, PHASE_BUILD, [], None, None, None, None),
            visual_actions=(
                VisualAction(type="highlightRange", params={"from": 0, "to": n - 1}),
                VisualAction(
                    type="showMessage",
                    params={
                        "text": "Max-heap built. Now extracting maximums.",
                        "messageType": "info",
                    },
                ),
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=(3,)),
            is_terminal=False,
            phase="build",
        )
    )
    idx += 1

    # ──────────────────────────────────────────────────────────────────────
    # PHASE 2 — Repeated extract-max
    # ──────────────────────────────────────────────────────────────────────

    heap_size = n
    while heap_size > 1:
        last = heap_size - 1

        # extract_swap: swap root (current max) with last element of heap region.
        root_before = array[0]
        last_before = array[last]
        array[0] = last_before
        array[last] = root_before

        suffix_before_shrink = _range_inclusive(heap_size, n - 1)

        extract_swap_visuals: list[VisualAction] = []
        extract_swap_visuals.extend(_dim_suffix_actions(heap_size, n))
        extract_swap_visuals.append(
            VisualAction(type="highlightRange", params={"from": 0, "to": last})
        )
        extract_swap_visuals.append(VisualAction(type="swapElements", params={"i": 0, "j": last}))
        extract_swap_visuals.append(VisualAction(type="movePointer", params={"id": "i", "to": 0}))

        steps.append(
            Step(
                index=idx,
                id="extract_swap",
                title=f"Extract Max: Swap [0] ↔ [{last}]",
                explanation=(
                    f"array[0] = {root_before} is the current maximum of the heap. "
                    f"Swap it with array[{last}] (was {last_before}). After this swap, "
                    f"{root_before} sits at index {last}, which will become its final sorted "
                    f"position once we shrink the heap."
                ),
                state=_snapshot(
                    array, heap_size, PHASE_EXTRACT, suffix_before_shrink, 0, None, None, last
                ),
                visual_actions=tuple(extract_swap_visuals),
                code_highlight=CodeHighlight(language="pseudocode", lines=(5,)),
                is_terminal=False,
                phase="extract",
            )
        )
        idx += 1

        # extract_shrink: decrement heap_size; the just-swapped element joins sorted suffix.
        heap_size -= 1
        suffix_after_shrink = _range_inclusive(heap_size, n - 1)

        extract_shrink_visuals: list[VisualAction] = []
        extract_shrink_visuals.extend(_dim_suffix_actions(heap_size, n))
        if heap_size >= 1:
            extract_shrink_visuals.append(
                VisualAction(type="highlightRange", params={"from": 0, "to": heap_size - 1})
            )

        steps.append(
            Step(
                index=idx,
                id="extract_shrink",
                title=f"Shrink Heap to Size {heap_size}",
                explanation=(
                    f"Heap size shrinks from {heap_size + 1} to {heap_size}. "
                    f"Index {last} (value {array[last]}) is now permanently placed in the "
                    f"sorted suffix. The remaining heap occupies indices 0..{heap_size - 1}."
                ),
                state=_snapshot(
                    array,
                    heap_size,
                    PHASE_EXTRACT,
                    suffix_after_shrink,
                    None,
                    None,
                    None,
                    None,
                ),
                visual_actions=tuple(extract_shrink_visuals),
                code_highlight=CodeHighlight(language="pseudocode", lines=(6,)),
                is_terminal=False,
                phase="extract",
            )
        )
        idx += 1

        # extract_siftdown: announce that we will now sift the new root down.
        extract_siftdown_visuals: list[VisualAction] = []
        extract_siftdown_visuals.extend(_dim_suffix_actions(heap_size, n))
        if heap_size >= 1:
            extract_siftdown_visuals.append(
                VisualAction(type="highlightRange", params={"from": 0, "to": heap_size - 1})
            )
            extract_siftdown_visuals.append(
                VisualAction(type="highlightElement", params={"index": 0, "color": "highlight"})
            )
        extract_siftdown_visuals.append(
            VisualAction(type="movePointer", params={"id": "i", "to": 0})
        )

        steps.append(
            Step(
                index=idx,
                id="extract_siftdown",
                title="Sift New Root Down",
                explanation=(
                    f"The new root is array[0] = {array[0]}. It came from the bottom and "
                    f"probably violates the heap property. Sift it down over the heap region "
                    f"[0..{heap_size - 1}] to restore the max-heap."
                ),
                state=_snapshot(
                    array, heap_size, PHASE_EXTRACT, suffix_after_shrink, 0, None, None, None
                ),
                visual_actions=tuple(extract_siftdown_visuals),
                code_highlight=CodeHighlight(language="pseudocode", lines=(7,)),
                is_terminal=False,
                phase="extract",
            )
        )
        idx += 1

        # ── Iterative sift-down from root over the shrunken heap_size. ──
        cur = 0
        while True:
            left = 2 * cur + 1
            right = 2 * cur + 2
            if left >= heap_size:
                break

            largest = cur
            if left < heap_size and array[left] > array[largest]:
                largest = left
            if right < heap_size and array[right] > array[largest]:
                largest = right

            right_in = right < heap_size
            left_val_str = f"array[{left}] = {array[left]}"
            right_val_str = f"array[{right}] = {array[right]}" if right_in else "(none)"

            compare_visuals2: list[VisualAction] = []
            compare_visuals2.extend(_dim_suffix_actions(heap_size, n))
            compare_visuals2.append(
                VisualAction(type="highlightRange", params={"from": 0, "to": heap_size - 1})
            )
            compare_visuals2.append(
                VisualAction(type="highlightElement", params={"index": cur, "color": "highlight"})
            )
            compare_visuals2.append(
                VisualAction(type="highlightElement", params={"index": left, "color": "compare"})
            )
            compare_visuals2.append(VisualAction(type="movePointer", params={"id": "i", "to": cur}))
            compare_visuals2.append(
                VisualAction(type="movePointer", params={"id": "L", "to": left})
            )
            if right_in:
                compare_visuals2.append(
                    VisualAction(
                        type="highlightElement", params={"index": right, "color": "compare"}
                    )
                )
                compare_visuals2.append(
                    VisualAction(type="movePointer", params={"id": "R", "to": right})
                )

            steps.append(
                Step(
                    index=idx,
                    id="siftdown_compare",
                    title=f"Compare Node {cur} with Children",
                    explanation=(
                        f"At index {cur} (value {array[cur]}). Left child: {left_val_str}. "
                        f"Right child: {right_val_str}. "
                        + (
                            f"Both children are ≤ {array[cur]}, so the heap property holds here — "
                            f"no swap needed and the sift ends."
                            if largest == cur
                            else (
                                f"The largest of the three is at index {largest} "
                                f"(value {array[largest]}), so we will swap {array[cur]} down "
                                f"into position {largest}."
                            )
                        )
                    ),
                    state=_snapshot(
                        array,
                        heap_size,
                        PHASE_EXTRACT,
                        suffix_after_shrink,
                        cur,
                        left,
                        right if right_in else None,
                        largest,
                    ),
                    visual_actions=tuple(compare_visuals2),
                    code_highlight=CodeHighlight(language="pseudocode", lines=(17, 19)),
                    is_terminal=False,
                    phase="extract",
                )
            )
            idx += 1

            if largest == cur:
                break

            array[cur], array[largest] = array[largest], array[cur]

            steps.append(
                Step(
                    index=idx,
                    id="siftdown_swap",
                    title=f"Swap [{cur}] ↔ [{largest}]",
                    explanation=(
                        f"Swapping array[{cur}] (was {array[largest]}) with array[{largest}] "
                        f"(was {array[cur]}). "
                        f"The larger child rises to index {cur}; the smaller former parent drops "
                        f"to index {largest}, where we continue sifting it down."
                    ),
                    state=_snapshot(
                        array,
                        heap_size,
                        PHASE_EXTRACT,
                        suffix_after_shrink,
                        cur,
                        None,
                        None,
                        largest,
                    ),
                    visual_actions=(
                        *_dim_suffix_actions(heap_size, n),
                        VisualAction(
                            type="highlightRange", params={"from": 0, "to": heap_size - 1}
                        ),
                        VisualAction(type="swapElements", params={"i": cur, "j": largest}),
                        VisualAction(type="movePointer", params={"id": "i", "to": largest}),
                    ),
                    code_highlight=CodeHighlight(language="pseudocode", lines=(21, 22)),
                    is_terminal=False,
                    phase="extract",
                )
            )
            idx += 1

            cur = largest

    # ── Terminal ──
    full_suffix = _range_inclusive(0, n - 1)
    steps.append(
        Step(
            index=idx,
            id="sorted",
            title="Sorting Complete",
            explanation=f"Heap Sort complete. All {n} elements are now in ascending sorted order.",
            state=_snapshot(array, 0, PHASE_DONE, full_suffix, None, None, None, None),
            visual_actions=(
                VisualAction(type="dimRange", params={"from": 0, "to": n - 1}),
                VisualAction(
                    type="showMessage",
                    params={"text": "Array is sorted!", "messageType": "success"},
                ),
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=(4,)),
            is_terminal=True,
            phase="result",
        )
    )

    return steps
