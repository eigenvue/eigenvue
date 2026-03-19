/**
 * @fileoverview Array Template — Binary Search Example
 *
 * Demonstrates the `array-with-pointers` layout with:
 * - highlightElement
 * - movePointer
 * - highlightRange
 * - dimRange
 * - markFound / markNotFound
 * - showMessage
 *
 * This template implements binary search on a sorted array,
 * which is a classic divide-and-conquer algorithm and a natural
 * fit for the array-with-pointers layout's pointer system.
 */

import type { AlgorithmTemplate } from "./index";

export const ARRAY_TEMPLATE: AlgorithmTemplate = {
  id: "array-binary-search",
  name: "Binary Search (Array)",
  description:
    "Search for a target value in a sorted array by repeatedly halving the search space.",
  layoutId: "array-with-pointers",
  category: "classical",
  difficulty: "beginner",
  code: `// Binary Search — find a target in a sorted array by halving the search space.
//
// Available visual actions for "array-with-pointers" layout:
//   { type: "highlightElement", index: N, color?: "highlight" | "accent" | "success" | "error" }
//   { type: "movePointer", id: "pointerName", to: N }
//   { type: "highlightRange", from: N, to: M, color?: "..." }
//   { type: "dimRange", from: N, to: M }
//   { type: "markFound", index: N }
//   { type: "markNotFound" }
//   { type: "showMessage", text: "...", messageType?: "info" | "success" | "error" }

const array = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91];
const target = 23;

let left = 0;
let right = array.length - 1;

// Step 1: Show the initial sorted array with left and right pointers.
step({
  title: "Initialize",
  explanation: \`Searching for \${target} in a sorted array of \${array.length} elements. Set left=0, right=\${right}.\`,
  state: { array: [...array], target, left, right, mid: -1 },
  visualActions: [
    { type: "highlightRange", from: 0, to: array.length - 1 },
    { type: "movePointer", id: "left", to: left },
    { type: "movePointer", id: "right", to: right },
  ],
  phase: "initialization",
});

let found = false;

while (left <= right) {
  const mid = Math.floor((left + right) / 2);

  // Show the current search range and midpoint.
  step({
    title: \`Check mid=\${mid}\`,
    explanation: \`Midpoint: array[\${mid}] = \${array[mid]}. Comparing with target \${target}.\`,
    state: { array: [...array], target, left, right, mid, midValue: array[mid] },
    visualActions: [
      { type: "highlightRange", from: left, to: right },
      { type: "highlightElement", index: mid, color: "accent" },
      { type: "movePointer", id: "left", to: left },
      { type: "movePointer", id: "right", to: right },
      { type: "movePointer", id: "mid", to: mid },
      ...(left > 0 ? [{ type: "dimRange", from: 0, to: left - 1 }] : []),
      ...(right < array.length - 1 ? [{ type: "dimRange", from: right + 1, to: array.length - 1 }] : []),
    ],
    phase: "search",
  });

  if (array[mid] === target) {
    found = true;
    step({
      title: "Target Found!",
      explanation: \`array[\${mid}] = \${array[mid]} matches target \${target}. Found at index \${mid}!\`,
      state: { array: [...array], target, left, right, mid, result: mid },
      visualActions: [
        { type: "markFound", index: mid },
        { type: "showMessage", text: \`Found \${target} at index \${mid}!\`, messageType: "success" },
      ],
      isTerminal: true,
      phase: "result",
    });
    break;
  } else if (array[mid] < target) {
    // Target is in the right half — move left pointer up.
    step({
      title: \`\${array[mid]} < \${target} — go right\`,
      explanation: \`array[\${mid}] = \${array[mid]} < \${target}. Discard left half, set left = \${mid + 1}.\`,
      state: { array: [...array], target, left: mid + 1, right, mid },
      visualActions: [
        { type: "dimRange", from: left, to: mid },
        { type: "highlightRange", from: mid + 1, to: right },
        { type: "movePointer", id: "left", to: mid + 1 },
        { type: "showMessage", text: "Search right half", messageType: "info" },
      ],
      phase: "search",
    });
    left = mid + 1;
  } else {
    // Target is in the left half — move right pointer down.
    step({
      title: \`\${array[mid]} > \${target} — go left\`,
      explanation: \`array[\${mid}] = \${array[mid]} > \${target}. Discard right half, set right = \${mid - 1}.\`,
      state: { array: [...array], target, left, right: mid - 1, mid },
      visualActions: [
        { type: "dimRange", from: mid, to: right },
        { type: "highlightRange", from: left, to: mid - 1 },
        { type: "movePointer", id: "right", to: mid - 1 },
        { type: "showMessage", text: "Search left half", messageType: "info" },
      ],
      phase: "search",
    });
    right = mid - 1;
  }
}

if (!found) {
  step({
    title: "Target Not Found",
    explanation: \`Search space exhausted. \${target} is not in the array.\`,
    state: { array: [...array], target, result: -1 },
    visualActions: [
      { type: "markNotFound" },
      { type: "showMessage", text: \`\${target} not found in the array.\`, messageType: "error" },
    ],
    isTerminal: true,
    phase: "result",
  });
}
`,
};
