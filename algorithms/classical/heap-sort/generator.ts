/**
 * @fileoverview Heap Sort — Step Generator
 *
 * CLRS Chapter 6. Two phases:
 *
 *   1. BUILD-MAX-HEAP — for i = ⌊n/2⌋ − 1 down to 0, MAX-HEAPIFY at i.
 *      After this phase, array[0..n−1] is a max-heap: every parent ≥ both children.
 *
 *   2. Repeated extract-max — for heapSize = n down to 2:
 *        swap array[0] and array[heapSize − 1]
 *        heapSize -= 1
 *        MAX-HEAPIFY at 0 over the shrunken heap region
 *      Each iteration moves the current maximum to its final sorted position
 *      and grows a sorted suffix from the right.
 *
 * MAX-HEAPIFY at i over heapSize:
 *   left  = 2i + 1, right = 2i + 2
 *   largest = whichever of {i, left, right} has the greatest value (with i preferred
 *            on ties — strict > on each comparison)
 *   if largest != i: swap, then continue sifting at `largest`.
 *
 * STEP DECOMPOSITION (see meta.json pseudocode for line numbers):
 *   initialize / heapify_start
 *   for each i = ⌊n/2⌋ − 1 … 0:
 *     heapify_node, then sift-down loop emitting siftdown_compare and
 *     (only when largest != current) siftdown_swap.
 *   heap_built
 *   for heapSize = n … 2:
 *     extract_swap, extract_shrink, extract_siftdown, then sift-down loop.
 *   sorted (terminal)
 *
 * Sift-down emits no compare step when the current node has no in-heap children
 * (the loop simply terminates). When largest == current, the compare step is
 * still emitted (that comparison is the teaching moment); only the swap step is
 * suppressed.
 *
 * CROSS-LANGUAGE PARITY: the Python mirror in
 *   python/src/eigenvue/generators/classical/heap_sort.py
 * must yield byte-identical step IDs, state field names/values, and explanation
 * strings. Any change here must be reflected there.
 */

import { createGenerator } from "@/engine/generator";
import type { VisualAction } from "@/engine/generator";

interface HeapSortInputs extends Record<string, unknown> {
  readonly array: readonly number[];
}

const PHASE_BUILD = "build";
const PHASE_EXTRACT = "extract";
const PHASE_DONE = "done";

/**
 * Builds the canonical state snapshot. Every step uses this shape so that
 * the UI sees a stable schema and parity tests can reference fields by name.
 *
 * `sortedSuffix` is the list of indices in the sorted region (right side
 * of the array during phase 2). It is always [heapSize..n−1].
 */
function snapshot(
  array: readonly number[],
  heapSize: number,
  phase: string,
  sortedSuffix: readonly number[],
  node: number | null,
  left: number | null,
  right: number | null,
  largest: number | null,
): Record<string, unknown> {
  return {
    array: [...array],
    heapSize,
    phase,
    sortedSuffix: [...sortedSuffix],
    node,
    left,
    right,
    largest,
  };
}

/**
 * Returns the inclusive list of indices [from..to], or [] if from > to.
 * Used to compute the sortedSuffix snapshot.
 */
function range(from: number, to: number): number[] {
  if (from > to) return [];
  const out: number[] = [];
  for (let k = from; k <= to; k++) out.push(k);
  return out;
}

/** Inline dimRange action for the current sorted suffix, or nothing if empty. */
function dimSuffixAction(heapSize: number, n: number): VisualAction[] {
  return heapSize <= n - 1
    ? [{ type: "dimRange", from: heapSize, to: n - 1 } as VisualAction]
    : [];
}

export default createGenerator<HeapSortInputs>({
  id: "heap-sort",

  *generate(inputs, step) {
    const array = [...inputs.array];
    const n = array.length;

    // ── Edge case: 0 or 1 elements — trivially sorted, single terminal step. ──
    if (n <= 1) {
      const sortedSuffix = range(0, n - 1);
      yield step({
        id: "sorted",
        title: "Array Already Sorted",
        explanation:
          n === 0
            ? "The array is empty — nothing to sort."
            : `Only one element (${array[0]}). A single-element array is trivially a max-heap and is already in sorted order.`,
        state: snapshot(array, n, PHASE_DONE, sortedSuffix, null, null, null, null),
        visualActions: [
          ...(n === 1 ? [{ type: "dimRange", from: 0, to: 0 } as VisualAction] : []),
          {
            type: "showMessage",
            text: "Already sorted!",
            messageType: "success",
          } as VisualAction,
        ],
        codeHighlight: { language: "pseudocode", lines: [1, 4] },
        phase: "result",
        isTerminal: true,
      });
      return;
    }

    // ──────────────────────────────────────────────────────────────────────
    // PHASE 1 — BUILD-MAX-HEAP
    // ──────────────────────────────────────────────────────────────────────

    yield step({
      id: "initialize",
      title: "Initialize Heap Sort",
      explanation:
        `Starting Heap Sort on ${n} elements. The plan: first turn the array into a max-heap, ` +
        `then repeatedly take the largest element off the top of the heap and place it at the ` +
        `end of the array. The whole sort happens in-place.`,
      state: snapshot(array, n, PHASE_BUILD, [], null, null, null, null),
      visualActions: [{ type: "highlightRange", from: 0, to: n - 1 } as VisualAction],
      codeHighlight: { language: "pseudocode", lines: [1, 2] },
      phase: "initialization",
    });

    const startI = Math.floor(n / 2) - 1;
    yield step({
      id: "heapify_start",
      title: "Build Max-Heap",
      explanation:
        `BUILD-MAX-HEAP starts at index ${startI} = ⌊${n}/2⌋ − 1 — the last node with at ` +
        `least one child. We sift each internal node down, working back up to the root. ` +
        `Indices ${startI + 1}..${n - 1} are leaves; they trivially already satisfy the ` +
        `heap property and are skipped.`,
      state: snapshot(array, n, PHASE_BUILD, [], null, null, null, null),
      visualActions: [
        { type: "highlightRange", from: 0, to: n - 1 } as VisualAction,
      ],
      codeHighlight: { language: "pseudocode", lines: [9, 10] },
      phase: "build",
    });

    for (let i = startI; i >= 0; i--) {
      yield step({
        id: "heapify_node",
        title: `Heapify Node ${i}`,
        explanation:
          `Sifting node at index ${i} (value ${array[i]}) down through the heap. ` +
          `Its children are at indices ${2 * i + 1}` +
          (2 * i + 2 < n ? ` and ${2 * i + 2}` : ` (no right child)`) +
          `. We compare with the larger child and swap if the child is larger; ` +
          `we repeat until the heap property holds or we run out of children.`,
        state: snapshot(array, n, PHASE_BUILD, [], i, null, null, null),
        visualActions: [
          { type: "highlightRange", from: 0, to: n - 1 } as VisualAction,
          { type: "highlightElement", index: i, color: "highlight" } as VisualAction,
          { type: "movePointer", id: "i", to: i } as VisualAction,
        ],
        codeHighlight: { language: "pseudocode", lines: [10, 11] },
        phase: "build",
      });

      // ── Iterative sift-down from `i` over heapSize = n. ──
      let cur = i;
      while (true) {
        const left = 2 * cur + 1;
        const right = 2 * cur + 2;
        // No children at all → sift-down naturally ends, no compare emitted.
        if (left >= n) break;

        let largest = cur;
        if (left < n && array[left]! > array[largest]!) largest = left;
        if (right < n && array[right]! > array[largest]!) largest = right;

        const rightIn = right < n;
        const leftValStr = `array[${left}] = ${array[left]}`;
        const rightValStr = rightIn ? `array[${right}] = ${array[right]}` : "(none)";

        const visualActions: VisualAction[] = [
          { type: "highlightRange", from: 0, to: n - 1 } as VisualAction,
          { type: "highlightElement", index: cur, color: "highlight" } as VisualAction,
          { type: "highlightElement", index: left, color: "compare" } as VisualAction,
          { type: "movePointer", id: "i", to: cur } as VisualAction,
          { type: "movePointer", id: "L", to: left } as VisualAction,
        ];
        if (rightIn) {
          visualActions.push({ type: "highlightElement", index: right, color: "compare" } as VisualAction);
          visualActions.push({ type: "movePointer", id: "R", to: right } as VisualAction);
        }

        yield step({
          id: "siftdown_compare",
          title: `Compare Node ${cur} with Children`,
          explanation:
            `At index ${cur} (value ${array[cur]}). Left child: ${leftValStr}. Right child: ${rightValStr}. ` +
            (largest === cur
              ? `Both children are ≤ ${array[cur]}, so the heap property holds here — no swap needed and the sift ends.`
              : `The largest of the three is at index ${largest} (value ${array[largest]}), so we will swap ${array[cur]} down into position ${largest}.`),
          state: snapshot(array, n, PHASE_BUILD, [], cur, left, rightIn ? right : null, largest),
          visualActions,
          codeHighlight: { language: "pseudocode", lines: [17, 19] },
          phase: "build",
        });

        if (largest === cur) break; // Heap property already holds — done with this sift.

        // Perform swap, then yield the swap step.
        const tmp = array[cur]!;
        array[cur] = array[largest]!;
        array[largest] = tmp;

        yield step({
          id: "siftdown_swap",
          title: `Swap [${cur}] ↔ [${largest}]`,
          explanation:
            `Swapping array[${cur}] (was ${array[largest]}) with array[${largest}] (was ${array[cur]}). ` +
            `The larger child rises to index ${cur}; the smaller former parent drops to index ${largest}, ` +
            `where we continue sifting it down.`,
          state: snapshot(array, n, PHASE_BUILD, [], cur, null, null, largest),
          visualActions: [
            { type: "highlightRange", from: 0, to: n - 1 } as VisualAction,
            { type: "swapElements", i: cur, j: largest } as VisualAction,
            { type: "movePointer", id: "i", to: largest } as VisualAction,
          ],
          codeHighlight: { language: "pseudocode", lines: [21, 22] },
          phase: "build",
        });

        cur = largest;
      }
    }

    yield step({
      id: "heap_built",
      title: "Max-Heap Built",
      explanation:
        `BUILD-MAX-HEAP is complete. Every parent is now ≥ both children, and array[0] = ${array[0]} ` +
        `is the maximum of the whole array. We now move into phase 2: repeatedly extract the maximum ` +
        `and shrink the heap.`,
      state: snapshot(array, n, PHASE_BUILD, [], null, null, null, null),
      visualActions: [
        { type: "highlightRange", from: 0, to: n - 1 } as VisualAction,
        {
          type: "showMessage",
          text: "Max-heap built. Now extracting maximums.",
          messageType: "info",
        } as VisualAction,
      ],
      codeHighlight: { language: "pseudocode", lines: [3] },
      phase: "build",
    });

    // ──────────────────────────────────────────────────────────────────────
    // PHASE 2 — Repeated extract-max
    // ──────────────────────────────────────────────────────────────────────

    let heapSize = n;
    while (heapSize > 1) {
      const last = heapSize - 1;

      // extract_swap: swap root (current max) with last element of the heap region.
      const rootBefore = array[0]!;
      const lastBefore = array[last]!;
      array[0] = lastBefore;
      array[last] = rootBefore;

      // sortedSuffix BEFORE shrink: still [heapSize..n-1] (no new index yet).
      const suffixBeforeShrink = range(heapSize, n - 1);

      yield step({
        id: "extract_swap",
        title: `Extract Max: Swap [0] ↔ [${last}]`,
        explanation:
          `array[0] = ${rootBefore} is the current maximum of the heap. ` +
          `Swap it with array[${last}] (was ${lastBefore}). After this swap, ${rootBefore} sits at ` +
          `index ${last}, which will become its final sorted position once we shrink the heap.`,
        state: snapshot(array, heapSize, PHASE_EXTRACT, suffixBeforeShrink, 0, null, null, last),
        visualActions: [
          ...dimSuffixAction(heapSize, n),
          { type: "highlightRange", from: 0, to: last } as VisualAction,
          { type: "swapElements", i: 0, j: last } as VisualAction,
          { type: "movePointer", id: "i", to: 0 } as VisualAction,
        ],
        codeHighlight: { language: "pseudocode", lines: [5] },
        phase: "extract",
      });

      // extract_shrink: decrement heapSize; the just-swapped element joins the sorted suffix.
      heapSize -= 1;
      const suffixAfterShrink = range(heapSize, n - 1);

      yield step({
        id: "extract_shrink",
        title: `Shrink Heap to Size ${heapSize}`,
        explanation:
          `Heap size shrinks from ${heapSize + 1} to ${heapSize}. Index ${last} (value ${array[last]}) ` +
          `is now permanently placed in the sorted suffix. The remaining heap occupies indices ` +
          `0..${heapSize - 1}.`,
        state: snapshot(array, heapSize, PHASE_EXTRACT, suffixAfterShrink, null, null, null, null),
        visualActions: [
          ...dimSuffixAction(heapSize, n),
          ...(heapSize >= 1
            ? [{ type: "highlightRange", from: 0, to: heapSize - 1 } as VisualAction]
            : []),
        ],
        codeHighlight: { language: "pseudocode", lines: [6] },
        phase: "extract",
      });

      // extract_siftdown: announce that we will now sift the new root down.
      yield step({
        id: "extract_siftdown",
        title: "Sift New Root Down",
        explanation:
          `The new root is array[0] = ${array[0]}. It came from the bottom and probably violates ` +
          `the heap property. Sift it down over the heap region [0..${heapSize - 1}] to restore ` +
          `the max-heap.`,
        state: snapshot(array, heapSize, PHASE_EXTRACT, suffixAfterShrink, 0, null, null, null),
        visualActions: [
          ...dimSuffixAction(heapSize, n),
          ...(heapSize >= 1
            ? [{ type: "highlightRange", from: 0, to: heapSize - 1 } as VisualAction]
            : []),
          ...(heapSize >= 1
            ? [{ type: "highlightElement", index: 0, color: "highlight" } as VisualAction]
            : []),
          { type: "movePointer", id: "i", to: 0 } as VisualAction,
        ],
        codeHighlight: { language: "pseudocode", lines: [7] },
        phase: "extract",
      });

      // ── Iterative sift-down from root over the shrunken heapSize. ──
      let cur = 0;
      while (true) {
        const left = 2 * cur + 1;
        const right = 2 * cur + 2;
        if (left >= heapSize) break;

        let largest = cur;
        if (left < heapSize && array[left]! > array[largest]!) largest = left;
        if (right < heapSize && array[right]! > array[largest]!) largest = right;

        const rightIn = right < heapSize;
        const leftValStr = `array[${left}] = ${array[left]}`;
        const rightValStr = rightIn ? `array[${right}] = ${array[right]}` : "(none)";

        const visualActions: VisualAction[] = [
          ...dimSuffixAction(heapSize, n),
          { type: "highlightRange", from: 0, to: heapSize - 1 } as VisualAction,
          { type: "highlightElement", index: cur, color: "highlight" } as VisualAction,
          { type: "highlightElement", index: left, color: "compare" } as VisualAction,
          { type: "movePointer", id: "i", to: cur } as VisualAction,
          { type: "movePointer", id: "L", to: left } as VisualAction,
        ];
        if (rightIn) {
          visualActions.push({ type: "highlightElement", index: right, color: "compare" } as VisualAction);
          visualActions.push({ type: "movePointer", id: "R", to: right } as VisualAction);
        }

        yield step({
          id: "siftdown_compare",
          title: `Compare Node ${cur} with Children`,
          explanation:
            `At index ${cur} (value ${array[cur]}). Left child: ${leftValStr}. Right child: ${rightValStr}. ` +
            (largest === cur
              ? `Both children are ≤ ${array[cur]}, so the heap property holds here — no swap needed and the sift ends.`
              : `The largest of the three is at index ${largest} (value ${array[largest]}), so we will swap ${array[cur]} down into position ${largest}.`),
          state: snapshot(array, heapSize, PHASE_EXTRACT, suffixAfterShrink, cur, left, rightIn ? right : null, largest),
          visualActions,
          codeHighlight: { language: "pseudocode", lines: [17, 19] },
          phase: "extract",
        });

        if (largest === cur) break;

        const tmp = array[cur]!;
        array[cur] = array[largest]!;
        array[largest] = tmp;

        yield step({
          id: "siftdown_swap",
          title: `Swap [${cur}] ↔ [${largest}]`,
          explanation:
            `Swapping array[${cur}] (was ${array[largest]}) with array[${largest}] (was ${array[cur]}). ` +
            `The larger child rises to index ${cur}; the smaller former parent drops to index ${largest}, ` +
            `where we continue sifting it down.`,
          state: snapshot(array, heapSize, PHASE_EXTRACT, suffixAfterShrink, cur, null, null, largest),
          visualActions: [
            ...dimSuffixAction(heapSize, n),
            { type: "highlightRange", from: 0, to: heapSize - 1 } as VisualAction,
            { type: "swapElements", i: cur, j: largest } as VisualAction,
            { type: "movePointer", id: "i", to: largest } as VisualAction,
          ],
          codeHighlight: { language: "pseudocode", lines: [21, 22] },
          phase: "extract",
        });

        cur = largest;
      }
    }

    // ── Terminal ──
    const fullSuffix = range(0, n - 1);
    yield step({
      id: "sorted",
      title: "Sorting Complete",
      explanation: `Heap Sort complete. All ${n} elements are now in ascending sorted order.`,
      state: snapshot(array, 0, PHASE_DONE, fullSuffix, null, null, null, null),
      visualActions: [
        { type: "dimRange", from: 0, to: n - 1 } as VisualAction,
        {
          type: "showMessage",
          text: "Array is sorted!",
          messageType: "success",
        } as VisualAction,
      ],
      codeHighlight: { language: "pseudocode", lines: [4] },
      phase: "result",
      isTerminal: true,
    });
  },
});
