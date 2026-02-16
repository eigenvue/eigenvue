/**
 * @fileoverview QuickSort — Step Generator (Lomuto partition scheme)
 *
 * Lomuto partition:
 *   pivot = array[high]
 *   i = low - 1
 *   for j = low to high - 1:
 *     if array[j] <= pivot: i++; swap(array[i], array[j])
 *   swap(array[i + 1], array[high])
 *   return i + 1
 *
 * Mathematical invariant:
 *   At all times during partition:
 *     array[low..i]   ≤ pivot
 *     array[i+1..j-1] > pivot
 *     array[high] = pivot
 */

import { createGenerator } from "@/engine/generator";
import type { VisualAction } from "@/engine/generator";

interface QuickSortInputs extends Record<string, unknown> {
  readonly array: readonly number[];
}

export default createGenerator<QuickSortInputs>({
  id: "quicksort",

  *generate(inputs, step) {
    const array = [...inputs.array];
    const N = array.length;

    if (N <= 1) {
      yield step({
        id: "already_sorted",
        title: "Already Sorted",
        explanation:
          N === 0
            ? "The array is empty — nothing to sort."
            : `Only one element (${array[0]}). Trivially sorted.`,
        state: { array: [...array] },
        visualActions: [
          ...(N === 1 ? [{ type: "markSorted", indices: [0] } as VisualAction] : []),
          { type: "showMessage", text: "Already sorted!", messageType: "success" } as VisualAction,
        ],
        codeHighlight: { language: "pseudocode", lines: [1] },
        isTerminal: true,
      });
      return;
    }

    const sortedIndices = new Set<number>();

    yield step({
      id: "initialize",
      title: "Initialize QuickSort",
      explanation:
        `Starting QuickSort on ${N} elements. We will pick a pivot, ` +
        `partition the array around it, and recursively sort the two halves.`,
      state: { array: [...array], sorted: [] as number[] },
      visualActions: [{ type: "highlightRange", from: 0, to: N - 1 }],
      codeHighlight: { language: "pseudocode", lines: [1, 2] },
    });

    // Use an explicit stack to simulate recursion.
    const stack: Array<[number, number]> = [[0, N - 1]];

    while (stack.length > 0) {
      const [low, high] = stack.pop()!;

      if (low >= high) {
        if (low === high && !sortedIndices.has(low)) {
          sortedIndices.add(low);
        }
        continue;
      }

      // --- Pivot selection: last element ---
      const pivot = array[high]!;

      yield step({
        id: "select_pivot",
        title: `Select Pivot = ${pivot}`,
        explanation:
          `Partitioning sub-array [${low}..${high}]. ` +
          `Pivot = array[${high}] = ${pivot} (last element).`,
        state: {
          array: [...array],
          low,
          high,
          pivot,
          sorted: [...sortedIndices],
        },
        visualActions: [
          { type: "highlightRange", from: low, to: high },
          { type: "highlightElement", index: high, color: "pivot" },
          { type: "markPivot", index: high },
          { type: "movePointer", id: "low", to: low },
          { type: "movePointer", id: "high", to: high },
          ...(sortedIndices.size > 0
            ? [{ type: "markSorted", indices: [...sortedIndices] } as VisualAction]
            : []),
        ],
        codeHighlight: { language: "pseudocode", lines: [3, 4] },
      });

      // --- Lomuto Partition ---
      // Invariant: i starts at low - 1. Elements array[low..i] are ≤ pivot.
      let i = low - 1;

      for (let j = low; j < high; j++) {
        const leq = array[j]! <= pivot;

        yield step({
          id: "partition_compare",
          title: `Compare [${j}] with Pivot`,
          explanation:
            `array[${j}] = ${array[j]}. Pivot = ${pivot}. ` +
            (leq
              ? `${array[j]} ≤ ${pivot}, so move it to the "small" section.`
              : `${array[j]} > ${pivot}, leave it in the "large" section.`),
          state: {
            array: [...array],
            low,
            high,
            pivot,
            i,
            j,
            sorted: [...sortedIndices],
          },
          visualActions: [
            { type: "highlightRange", from: low, to: high },
            { type: "highlightElement", index: j, color: leq ? "highlight" : "highlightAlt" },
            { type: "highlightElement", index: high, color: "pivot" },
            { type: "movePointer", id: "i", to: Math.max(low, i) },
            { type: "movePointer", id: "j", to: j },
            ...(i >= low ? [{ type: "setPartition", index: i } as VisualAction] : []),
            ...(sortedIndices.size > 0
              ? [{ type: "markSorted", indices: [...sortedIndices] } as VisualAction]
              : []),
          ],
          codeHighlight: { language: "pseudocode", lines: [6, 7] },
        });

        if (leq) {
          i++;

          if (i !== j) {
            const temp = array[i]!;
            array[i] = array[j]!;
            array[j] = temp;

            yield step({
              id: "partition_swap",
              title: `Swap [${i}] ↔ [${j}]`,
              explanation:
                `Swapping array[${i}] (was ${array[j]}) with array[${j}] (was ${array[i]}). ` +
                `This places ${array[i]} in the "small" partition (indices [${low}..${i}]).`,
              state: {
                array: [...array],
                low,
                high,
                pivot,
                i,
                j,
                sorted: [...sortedIndices],
              },
              visualActions: [
                { type: "highlightRange", from: low, to: high },
                { type: "swapElements", i, j },
                { type: "highlightElement", index: high, color: "pivot" },
                { type: "movePointer", id: "i", to: i },
                { type: "movePointer", id: "j", to: j },
                ...(sortedIndices.size > 0
                  ? [{ type: "markSorted", indices: [...sortedIndices] } as VisualAction]
                  : []),
              ],
              codeHighlight: { language: "pseudocode", lines: [8, 9] },
            });
          }
        }
      }

      // --- Place the pivot in its final position ---
      const pivotIdx = i + 1;

      if (pivotIdx !== high) {
        const temp = array[pivotIdx]!;
        array[pivotIdx] = array[high]!;
        array[high] = temp;
      }

      sortedIndices.add(pivotIdx);

      yield step({
        id: "pivot_placed",
        title: `Pivot Placed at [${pivotIdx}]`,
        explanation:
          `Swapped pivot (${pivot}) into its final position at index ${pivotIdx}. ` +
          `All elements in [${low}..${pivotIdx - 1}] ≤ ${pivot}. ` +
          `All elements in [${pivotIdx + 1}..${high}] > ${pivot}. ` +
          `Index ${pivotIdx} is now permanently sorted.`,
        state: {
          array: [...array],
          low,
          high,
          pivotIdx,
          sorted: [...sortedIndices],
        },
        visualActions: [
          { type: "highlightRange", from: low, to: high },
          { type: "highlightElement", index: pivotIdx, color: "sorted" },
          { type: "setPartition", index: pivotIdx - 1 },
          { type: "markSorted", indices: [...sortedIndices] },
        ],
        codeHighlight: { language: "pseudocode", lines: [10, 11] },
      });

      // Push sub-problems (right first so left is processed first).
      if (pivotIdx + 1 < high) {
        stack.push([pivotIdx + 1, high]);
      } else if (pivotIdx + 1 === high) {
        sortedIndices.add(high);
      }

      if (low < pivotIdx - 1) {
        stack.push([low, pivotIdx - 1]);
      } else if (low === pivotIdx - 1) {
        sortedIndices.add(low);
      }
    }

    // --- Final result ---
    yield step({
      id: "complete",
      title: "Sorting Complete",
      explanation: `QuickSort complete. All ${N} elements are in sorted order.`,
      state: {
        array: [...array],
        sorted: [...sortedIndices],
      },
      visualActions: [
        { type: "markSorted", indices: Array.from({ length: N }, (_, k) => k) },
        { type: "showMessage", text: "Array is sorted!", messageType: "success" },
      ],
      codeHighlight: { language: "pseudocode", lines: [13] },
      isTerminal: true,
    });
  },
});
