/**
 * @fileoverview Merge Sort — Step Generator (bottom-up / iterative)
 *
 * Bottom-up Merge Sort processes the array in rounds:
 *   Round 0: sub-arrays of size 1 (trivially sorted)
 *   Round 1: merge pairs into sorted sub-arrays of size 2
 *   Round ⌈log₂(N)⌉: final merge produces the complete sorted array
 *
 * The merge operation uses an auxiliary buffer. Stability is preserved
 * by taking from the left half when elements are equal.
 */

import { createGenerator } from "@/engine/generator";
import type { VisualAction } from "@/engine/generator";

interface MergeSortInputs extends Record<string, unknown> {
  readonly array: readonly number[];
}

export default createGenerator<MergeSortInputs>({
  id: "merge-sort",

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

    yield step({
      id: "initialize",
      title: "Initialize Merge Sort",
      explanation:
        `Starting bottom-up Merge Sort on ${N} elements. ` +
        `We will merge sub-arrays of increasing size: 1, 2, 4, ... ` +
        `until the entire array is sorted. This requires ⌈log₂(${N})⌉ = ` +
        `${Math.ceil(Math.log2(N))} rounds.`,
      state: { array: [...array], auxiliary: new Array(N).fill(null) },
      visualActions: [{ type: "highlightRange", from: 0, to: N - 1 }],
      codeHighlight: { language: "pseudocode", lines: [1, 2] },
    });

    // --- Bottom-up merge sort ---
    for (let size = 1; size < N; size *= 2) {
      const round = Math.log2(size) + 1;

      yield step({
        id: "round_start",
        title: `Round ${round}: Merge Sub-arrays of Size ${size}`,
        explanation:
          `Merging adjacent sub-arrays of size ${size} into sorted sub-arrays of size ${Math.min(size * 2, N)}. ` +
          `Processing ${Math.ceil(N / (size * 2))} merge(s).`,
        state: {
          array: [...array],
          auxiliary: new Array(N).fill(null),
          size,
          round,
        },
        visualActions: [{ type: "highlightRange", from: 0, to: N - 1 }],
        codeHighlight: { language: "pseudocode", lines: [3] },
      });

      for (let left = 0; left < N; left += size * 2) {
        const mid = Math.min(left + size - 1, N - 1);
        const right = Math.min(left + 2 * size - 1, N - 1);

        // Skip if no right sub-array to merge with.
        if (mid >= right) continue;

        // --- Merge [left..mid] and [mid+1..right] ---
        yield step({
          id: "merge_start",
          title: `Merge [${left}..${mid}] and [${mid + 1}..${right}]`,
          explanation:
            `Left half: [${array.slice(left, mid + 1).join(", ")}]. ` +
            `Right half: [${array.slice(mid + 1, right + 1).join(", ")}]. ` +
            `Merging into a sorted sub-array of length ${right - left + 1}.`,
          state: {
            array: [...array],
            auxiliary: new Array(N).fill(null),
            left,
            mid,
            right,
          },
          visualActions: [
            { type: "highlightRange", from: left, to: mid, color: "highlight" },
            { type: "highlightRange", from: mid + 1, to: right, color: "highlightAlt" },
            { type: "movePointer", id: "left", to: left },
            { type: "movePointer", id: "right", to: right },
          ],
          codeHighlight: { language: "pseudocode", lines: [4, 5] },
        });

        const aux = new Array(N).fill(null) as (number | null)[];
        let i = left;
        let j = mid + 1;
        let k = left;

        while (i <= mid && j <= right) {
          // Stability: use <= so equal elements from LEFT half go first.
          if (array[i]! <= array[j]!) {
            aux[k] = array[i]!;

            yield step({
              id: "merge_pick_left",
              title: `Pick ${array[i]} from Left`,
              explanation:
                `Comparing array[${i}] = ${array[i]} with array[${j}] = ${array[j]}. ` +
                `${array[i]} ≤ ${array[j]}, so take from the left half. ` +
                `Write ${array[i]} to auxiliary[${k}].`,
              state: {
                array: [...array],
                auxiliary: [...aux],
                i,
                j,
                k,
                left,
                mid,
                right,
              },
              visualActions: [
                { type: "highlightElement", index: i, color: "highlight" },
                { type: "highlightElement", index: j, color: "highlightAlt" },
                { type: "movePointer", id: "i", to: i },
                { type: "movePointer", id: "j", to: j },
                { type: "setAuxiliary", array: [...aux] },
                { type: "highlightAuxiliary", index: k, color: "highlight" },
              ],
              codeHighlight: { language: "pseudocode", lines: [7, 8] },
            });

            i++;
          } else {
            aux[k] = array[j]!;

            yield step({
              id: "merge_pick_right",
              title: `Pick ${array[j]} from Right`,
              explanation:
                `Comparing array[${i}] = ${array[i]} with array[${j}] = ${array[j]}. ` +
                `${array[j]} < ${array[i]}, so take from the right half. ` +
                `Write ${array[j]} to auxiliary[${k}].`,
              state: {
                array: [...array],
                auxiliary: [...aux],
                i,
                j,
                k,
                left,
                mid,
                right,
              },
              visualActions: [
                { type: "highlightElement", index: i, color: "highlight" },
                { type: "highlightElement", index: j, color: "highlightAlt" },
                { type: "movePointer", id: "i", to: i },
                { type: "movePointer", id: "j", to: j },
                { type: "setAuxiliary", array: [...aux] },
                { type: "highlightAuxiliary", index: k, color: "highlightAlt" },
              ],
              codeHighlight: { language: "pseudocode", lines: [9, 10] },
            });

            j++;
          }
          k++;
        }

        // Copy remaining from left half.
        while (i <= mid) {
          aux[k] = array[i]!;
          i++;
          k++;
        }

        // Copy remaining from right half.
        while (j <= right) {
          aux[k] = array[j]!;
          j++;
          k++;
        }

        // Copy auxiliary back into the main array.
        for (let w = left; w <= right; w++) {
          array[w] = aux[w] as number;
        }

        yield step({
          id: "merge_complete",
          title: `Merge Complete: [${left}..${right}]`,
          explanation:
            `Merged result: [${array.slice(left, right + 1).join(", ")}]. ` +
            `Sub-array [${left}..${right}] is now sorted.`,
          state: {
            array: [...array],
            auxiliary: [...aux],
            left,
            right,
          },
          visualActions: [
            { type: "highlightRange", from: left, to: right, color: "sorted" },
            { type: "setAuxiliary", array: [...aux] },
          ],
          codeHighlight: { language: "pseudocode", lines: [12, 13] },
        });
      }
    }

    // --- Final result ---
    yield step({
      id: "complete",
      title: "Sorting Complete",
      explanation: `Merge Sort complete. All ${N} elements are in sorted order.`,
      state: {
        array: [...array],
        sorted: Array.from({ length: N }, (_, k) => k),
      },
      visualActions: [
        { type: "markSorted", indices: Array.from({ length: N }, (_, k) => k) },
        { type: "showMessage", text: "Array is sorted!", messageType: "success" },
      ],
      codeHighlight: { language: "pseudocode", lines: [15] },
      isTerminal: true,
    });
  },
});
