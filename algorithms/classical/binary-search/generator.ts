/**
 * @fileoverview Binary Search — Step Generator
 *
 * Generates a step-by-step visualization of iterative binary search on a
 * sorted array of numbers.
 *
 * ALGORITHM:
 *   Given a sorted array and a target value, binary search maintains two
 *   pointers (left, right) defining the search space. At each iteration:
 *   1. Compute mid = floor((left + right) / 2).
 *   2. If array[mid] === target → found.
 *   3. If array[mid] < target  → set left = mid + 1 (search right half).
 *   4. If array[mid] > target  → set right = mid - 1 (search left half).
 *   Repeat until left > right (not found) or target is found.
 *
 * STEP GENERATION STRATEGY:
 *   The generator yields a step at each "interesting moment":
 *   - Initialization (pointers set up, search space shown)
 *   - Each mid calculation (mid pointer moves)
 *   - Each comparison (comparison result shown)
 *   - Each pointer update (search space narrows, eliminated region dims)
 *   - Final result (found or not found)
 *
 * MATHEMATICAL CORRECTNESS:
 *   - mid = Math.floor((left + right) / 2)
 *     This is safe for all arrays up to Number.MAX_SAFE_INTEGER / 2 in JS.
 *     For the constrained input range (maxItems: 20, values ±999), overflow
 *     is impossible. The floor operation is exact (no floating-point error)
 *     because left + right is always an integer, and Math.floor of an integer
 *     is an identity operation. For odd sums, Math.floor truncates toward
 *     negative infinity, which for positive integers is equivalent to integer
 *     division (matching Python's // operator for positive operands).
 *
 *   - Loop termination: Each iteration either returns (found) or strictly
 *     narrows the search space (left increases or right decreases). Since
 *     left and right are bounded integers, the loop terminates in at most
 *     ⌈log₂(n)⌉ + 1 iterations.
 *
 * STATE SNAPSHOT SAFETY:
 *   The array is spread-copied in every state snapshot: [...array].
 *   The primitive values (left, right, mid, target) are safe by value.
 *   No mutable references leak across steps.
 *
 * CODE HIGHLIGHT MAPPING:
 *   Lines reference the "pseudocode" implementation in meta.json.
 *   The pseudocode is 16 lines. Line numbers are 1-indexed.
 */

import { createGenerator } from "@/engine/generator";
import type { VisualAction } from "@/engine/generator";

// ─────────────────────────────────────────────────────────────────────────────
// INPUT TYPE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Input parameters for binary search.
 *
 * CONSTRAINTS (enforced by meta.json schema):
 * - array: sorted ascending, 1–20 elements, each value ∈ [-999, 999]
 * - target: a number ∈ [-999, 999]
 */
interface BinarySearchInputs extends Record<string, unknown> {
  readonly array: readonly number[];
  readonly target: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

export default createGenerator<BinarySearchInputs>({
  id: "binary-search",

  *generate(inputs, step) {
    const { array, target } = inputs;
    let left = 0;
    let right = array.length - 1;

    // ── Step: Initialize ───────────────────────────────────────────────
    // Show the full array with left and right pointers at the boundaries.
    // The entire array is the initial search space (highlighted range).
    yield step({
      id: "initialize",
      title: "Initialize Search",
      explanation:
        `Searching for ${target} in a sorted array of ${array.length} element${array.length === 1 ? "" : "s"}. ` +
        `Setting left = 0, right = ${right}. The entire array is the search space.`,
      state: {
        array: [...array],
        target,
        left,
        right,
        result: null,
      },
      visualActions: [
        { type: "highlightRange", from: left, to: right, color: "highlight" },
        { type: "movePointer", id: "left", to: left },
        { type: "movePointer", id: "right", to: right },
      ],
      codeHighlight: { language: "pseudocode", lines: [1, 2, 3] },
      phase: "initialization",
    });

    // ── Main loop ──────────────────────────────────────────────────────
    // Invariant: at each iteration, if the target exists in the array,
    // it is within array[left..right] (inclusive).
    let iteration = 0;
    while (left <= right) {
      iteration++;

      /**
       * MATHEMATICAL NOTE: mid computation.
       *
       * mid = Math.floor((left + right) / 2)
       *
       * For left=0, right=9: mid = floor(9/2) = 4
       * For left=5, right=9: mid = floor(14/2) = 7
       * For left=5, right=5: mid = floor(10/2) = 5
       *
       * The result always satisfies: left <= mid <= right
       * Proof: left <= (left+right)/2 because left <= right.
       *        (left+right)/2 <= right because left >= 0 (or more
       *        precisely, left <= right).
       *        floor() can only decrease the value, maintaining mid <= right.
       *        And floor((left+right)/2) >= left because (left+right)/2 >= left
       *        and floor of a value >= left (an integer) is >= left.
       */
      const mid = Math.floor((left + right) / 2);

      // ── Step: Calculate mid ────────────────────────────────────────
      // Show the mid pointer moving to position mid.
      // Highlight the mid element distinctly from the search range.
      yield step({
        id: "calculate_mid",
        title: `Calculate Middle (Iteration ${iteration})`,
        explanation:
          `mid = floor((${left} + ${right}) / 2) = floor(${left + right} / 2) = ${mid}. ` +
          `Checking array[${mid}] = ${array[mid]}.`,
        state: {
          array: [...array],
          target,
          left,
          right,
          mid,
          result: null,
        },
        visualActions: [
          { type: "highlightRange", from: left, to: right, color: "highlight" },
          { type: "highlightElement", index: mid, color: "compare" },
          { type: "movePointer", id: "left", to: left },
          { type: "movePointer", id: "right", to: right },
          { type: "movePointer", id: "mid", to: mid },
        ],
        codeHighlight: { language: "pseudocode", lines: [5, 6] },
        phase: "search",
      });

      // ── Compare array[mid] with target ─────────────────────────────
      if (array[mid] === target) {
        // ── Step: Found ────────────────────────────────────────────
        yield step({
          id: "found",
          title: "Target Found!",
          explanation:
            `array[${mid}] = ${array[mid]} equals target ${target}. ` +
            `Found at index ${mid} after ${iteration} iteration${iteration === 1 ? "" : "s"}.`,
          state: {
            array: [...array],
            target,
            left,
            right,
            mid,
            result: mid,
          },
          visualActions: [
            { type: "markFound", index: mid },
            { type: "movePointer", id: "mid", to: mid },
            {
              type: "showMessage",
              text: `Found ${target} at index ${mid}!`,
              messageType: "success",
            },
          ],
          codeHighlight: { language: "pseudocode", lines: [8] },
          phase: "result",
          isTerminal: true,
        });
        return; // Generator ends — the found step is terminal.
      }

      if (array[mid]! < target) {
        // ── Step: Target is in the right half ──────────────────────
        // array[mid] is too small. Target must be in [mid+1, right].
        // Dim the eliminated left portion [left, mid].
        const newLeft = mid + 1;

        yield step({
          id: "search_right",
          title: "Search Right Half",
          explanation:
            `array[${mid}] = ${array[mid]} < target ${target}. ` +
            `Target must be in the right half. Setting left = ${mid} + 1 = ${newLeft}.`,
          state: {
            array: [...array],
            target,
            left: newLeft,
            right,
            mid,
            result: null,
          },
          visualActions: [
            // Dim the eliminated portion (everything from old left to mid).
            { type: "dimRange", from: left, to: mid },
            // Highlight the remaining search space.
            ...(newLeft <= right
              ? [{ type: "highlightRange" as const, from: newLeft, to: right, color: "highlight" as const }]
              : []),
            { type: "movePointer", id: "left", to: newLeft },
            { type: "movePointer", id: "right", to: right },
            { type: "movePointer", id: "mid", to: mid },
          ],
          codeHighlight: { language: "pseudocode", lines: [10, 11] },
          phase: "search",
        });

        left = newLeft;
      } else {
        // ── Step: Target is in the left half ──────────────────────
        // array[mid] is too large. Target must be in [left, mid-1].
        // Dim the eliminated right portion [mid, right].
        const newRight = mid - 1;

        yield step({
          id: "search_left",
          title: "Search Left Half",
          explanation:
            `array[${mid}] = ${array[mid]} > target ${target}. ` +
            `Target must be in the left half. Setting right = ${mid} - 1 = ${newRight}.`,
          state: {
            array: [...array],
            target,
            left,
            right: newRight,
            mid,
            result: null,
          },
          visualActions: [
            // Dim the eliminated portion (everything from mid to old right).
            { type: "dimRange", from: mid, to: right },
            // Highlight the remaining search space.
            ...(left <= newRight
              ? [{ type: "highlightRange" as const, from: left, to: newRight, color: "highlight" as const }]
              : []),
            { type: "movePointer", id: "left", to: left },
            { type: "movePointer", id: "right", to: newRight },
            { type: "movePointer", id: "mid", to: mid },
          ],
          codeHighlight: { language: "pseudocode", lines: [12, 13] },
          phase: "search",
        });

        right = newRight;
      }
    }

    // ── Step: Not found ──────────────────────────────────────────────
    // The while condition (left <= right) failed, meaning the search
    // space is empty. The target does not exist in the array.
    yield step({
      id: "not_found",
      title: "Target Not Found",
      explanation:
        `Search space exhausted (left = ${left} > right = ${right}). ` +
        `${target} is not in the array. Returning -1 after ${iteration} iteration${iteration === 1 ? "" : "s"}.`,
      state: {
        array: [...array],
        target,
        left,
        right,
        result: -1,
      },
      visualActions: [
        { type: "markNotFound" },
        {
          type: "showMessage",
          text: `${target} was not found in the array.`,
          messageType: "warning",
        },
      ],
      codeHighlight: { language: "pseudocode", lines: [15] },
      phase: "result",
      isTerminal: true,
    });
  },
});
