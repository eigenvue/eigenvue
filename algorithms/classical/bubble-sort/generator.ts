/**
 * @fileoverview Bubble Sort — Step Generator
 *
 * Produces a step sequence showing:
 *   1. Initialization
 *   2. For each pass (outer loop):
 *      a. For each adjacent pair comparison (inner loop):
 *         - Compare step: highlights the two elements being compared
 *         - Swap step (if needed): shows the swap arc and the resulting array
 *      b. Pass complete: marks the newly sorted element
 *   3. Early termination if no swaps in a full pass
 *   4. Final sorted result
 *
 * Mathematical invariant maintained:
 *   After pass p (0-indexed), the elements at indices [N-1-p, N-1] are in
 *   their final sorted positions.
 *
 * Edge cases handled:
 *   - Empty array → single "already sorted" step
 *   - Single element → single "already sorted" step
 *   - Already sorted → one pass with no swaps, early termination
 */

import { createGenerator } from "@/engine/generator";
import type { VisualAction } from "@/engine/generator";

interface BubbleSortInputs extends Record<string, unknown> {
  readonly array: readonly number[];
}

export default createGenerator<BubbleSortInputs>({
  id: "bubble-sort",

  *generate(inputs, step) {
    const array = [...inputs.array];
    const N = array.length;

    // --- Edge case: empty or single-element array ---
    if (N <= 1) {
      yield step({
        id: "already_sorted",
        title: "Already Sorted",
        explanation:
          N === 0
            ? "The array is empty — nothing to sort."
            : `The array has only one element (${array[0]}). It is trivially sorted.`,
        state: { array: [...array] },
        visualActions: [
          ...(N === 1
            ? [{ type: "markSorted", indices: [0] } as VisualAction]
            : []),
          { type: "showMessage", text: "Array is already sorted!", messageType: "success" } as VisualAction,
        ],
        codeHighlight: { language: "pseudocode", lines: [1] },
        isTerminal: true,
      });
      return;
    }

    // --- Step: Initialize ---
    yield step({
      id: "initialize",
      title: "Initialize Bubble Sort",
      explanation:
        `Starting Bubble Sort on an array of ${N} elements. ` +
        `We will make up to ${N - 1} passes through the array, comparing ` +
        `adjacent elements and swapping them if they are out of order.`,
      state: { array: [...array], pass: 0, sorted: [] as number[] },
      visualActions: [
        { type: "highlightRange", from: 0, to: N - 1 },
      ],
      codeHighlight: { language: "pseudocode", lines: [1, 2] },
    });

    // Track which indices are in their final sorted position.
    const sortedIndices: number[] = [];

    // --- Outer loop: passes ---
    // Invariant: After pass p, elements at indices [N-1-p, N-1] are in
    // their final sorted positions.
    for (let pass = 0; pass < N - 1; pass++) {
      let swapped = false;

      yield step({
        id: "pass_start",
        title: `Pass ${pass + 1}`,
        explanation:
          `Starting pass ${pass + 1} of at most ${N - 1}. ` +
          `Comparing elements from index 0 to ${N - 2 - pass}. ` +
          `After this pass, element at index ${N - 1 - pass} will be in its final position.`,
        state: {
          array: [...array],
          pass,
          sorted: [...sortedIndices],
        },
        visualActions: [
          { type: "highlightRange", from: 0, to: N - 1 - pass },
          ...sortedIndices.map((idx) => ({
            type: "markSorted" as const,
            indices: [idx],
          })),
        ],
        codeHighlight: { language: "pseudocode", lines: [3] },
      });

      // --- Inner loop: adjacent comparisons ---
      for (let j = 0; j < N - 1 - pass; j++) {
        // Invariant: We compare array[j] and array[j+1].
        // If array[j] > array[j+1], they are out of order and we swap.
        // STRICT greater-than preserves stability: equal elements are never swapped.
        const isGreater = array[j]! > array[j + 1]!;

        yield step({
          id: "compare",
          title: `Compare [${j}] and [${j + 1}]`,
          explanation:
            `Comparing array[${j}] = ${array[j]} with array[${j + 1}] = ${array[j + 1]}. ` +
            (isGreater
              ? `${array[j]} > ${array[j + 1]}, so we need to swap.`
              : `${array[j]} ≤ ${array[j + 1]}, no swap needed.`),
          state: {
            array: [...array],
            pass,
            comparing: [j, j + 1],
            sorted: [...sortedIndices],
          },
          visualActions: [
            { type: "compareElements", i: j, j: j + 1, result: isGreater ? "greater" : "less" },
            { type: "highlightElement", index: j, color: "highlight" },
            { type: "highlightElement", index: j + 1, color: "highlightAlt" },
            { type: "movePointer", id: "j", to: j },
            ...sortedIndices.map((idx) => ({
              type: "markSorted" as const,
              indices: [idx],
            })),
          ],
          codeHighlight: { language: "pseudocode", lines: [4, 5] },
        });

        if (isGreater) {
          // Perform the swap.
          const temp = array[j]!;
          array[j] = array[j + 1]!;
          array[j + 1] = temp;
          swapped = true;

          yield step({
            id: "swap",
            title: `Swap [${j}] ↔ [${j + 1}]`,
            explanation:
              `Swapped ${array[j + 1]} and ${array[j]}. ` +
              `The larger value (${array[j + 1]}) moves one position to the right.`,
            state: {
              array: [...array],
              pass,
              swapped: [j, j + 1],
              sorted: [...sortedIndices],
            },
            visualActions: [
              { type: "swapElements", i: j, j: j + 1 },
              { type: "highlightElement", index: j, color: "highlight" },
              { type: "highlightElement", index: j + 1, color: "highlightAlt" },
              ...sortedIndices.map((idx) => ({
                type: "markSorted" as const,
                indices: [idx],
              })),
            ],
            codeHighlight: { language: "pseudocode", lines: [6, 7, 8] },
          });
        }
      }

      // Mark the element at N-1-pass as sorted.
      sortedIndices.push(N - 1 - pass);

      // --- Early termination check ---
      if (!swapped) {
        // No swaps in this pass means the array is already sorted.
        // Proof: If no adjacent pair satisfies array[j] > array[j+1],
        // then for all j: array[j] ≤ array[j+1] → sorted.
        for (let k = 0; k <= N - 2 - pass; k++) {
          sortedIndices.push(k);
        }

        yield step({
          id: "early_termination",
          title: "No Swaps — Early Termination",
          explanation:
            `No swaps occurred during pass ${pass + 1}. ` +
            `This means the array is already sorted. Terminating early.`,
          state: {
            array: [...array],
            pass,
            sorted: [...sortedIndices],
          },
          visualActions: [
            { type: "markSorted", indices: [...sortedIndices] },
            { type: "showMessage", text: "Sorted! (early termination)", messageType: "success" },
          ],
          codeHighlight: { language: "pseudocode", lines: [9, 10] },
          isTerminal: true,
        });
        return;
      }
    }

    // After N-1 passes, the first element is also in its final position.
    sortedIndices.push(0);

    // --- Final result ---
    yield step({
      id: "complete",
      title: "Sorting Complete",
      explanation:
        `Bubble Sort complete. All ${N} elements are now in sorted order.`,
      state: {
        array: [...array],
        sorted: [...sortedIndices],
      },
      visualActions: [
        { type: "markSorted", indices: [...sortedIndices] },
        { type: "showMessage", text: "Array is sorted!", messageType: "success" },
      ],
      codeHighlight: { language: "pseudocode", lines: [12] },
      isTerminal: true,
    });
  },
});
