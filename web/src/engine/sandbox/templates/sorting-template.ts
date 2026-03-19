/**
 * @fileoverview Sorting Template — Bubble Sort Example
 *
 * Demonstrates the `array-comparison` layout with:
 * - highlightElement
 * - compareElements
 * - swapElements
 */

import type { AlgorithmTemplate } from "./index";

export const SORTING_TEMPLATE: AlgorithmTemplate = {
  id: "sorting-bubble-sort",
  name: "Bubble Sort (Sorting)",
  description: "Sort an array by repeatedly swapping adjacent elements.",
  layoutId: "array-comparison",
  category: "classical",
  difficulty: "beginner",
  code: `// Bubble Sort — repeatedly swap adjacent out-of-order elements.
//
// Available visual actions for "array-comparison" layout:
//   { type: "highlightElement", index: N, color?: "..." }
//   { type: "compareElements", i: N, j: M, result: "less" | "greater" | "equal" }
//   { type: "swapElements", i: N, j: M }
//   { type: "highlightRange", from: N, to: M }
//   { type: "dimRange", from: N, to: M }
//   { type: "showMessage", text: "..." }

const array = [64, 34, 25, 12, 22, 11, 90];
const n = array.length;

step({
  title: "Initial Array",
  explanation: \`Starting bubble sort on an array of \${n} elements.\`,
  state: { array: [...array], pass: 0, sorted: false },
  visualActions: [
    { type: "highlightRange", from: 0, to: n - 1 },
  ],
});

for (let pass = 0; pass < n - 1; pass++) {
  let swapped = false;

  for (let j = 0; j < n - 1 - pass; j++) {
    // Compare adjacent elements.
    const comparison = array[j] > array[j + 1] ? "greater" : "less";

    step({
      title: \`Compare [\${j}] and [\${j + 1}]\`,
      explanation: \`Comparing \${array[j]} and \${array[j + 1]}: \${array[j]} \${comparison === "greater" ? ">" : "\\u2264"} \${array[j + 1]}\${comparison === "greater" ? " \\u2192 swap!" : " \\u2192 no swap."}\`,
      state: { array: [...array], pass, i: j, j: j + 1 },
      visualActions: [
        { type: "compareElements", i: j, j: j + 1, result: comparison },
        ...(pass > 0 ? [{ type: "dimRange", from: n - pass, to: n - 1 }] : []),
      ],
    });

    if (array[j] > array[j + 1]) {
      // Swap.
      const temp = array[j];
      array[j] = array[j + 1];
      array[j + 1] = temp;
      swapped = true;

      step({
        title: \`Swap [\${j}] \\u2194 [\${j + 1}]\`,
        explanation: \`Swapped \${array[j + 1]} and \${array[j]}.\`,
        state: { array: [...array], pass, i: j, j: j + 1 },
        visualActions: [
          { type: "swapElements", i: j, j: j + 1 },
        ],
      });
    }
  }

  if (!swapped) break; // Already sorted — early exit.
}

step({
  title: "Sorting Complete",
  explanation: \`Array is now sorted: [\${array.join(", ")}].\`,
  state: { array: [...array], sorted: true },
  visualActions: [
    { type: "highlightRange", from: 0, to: n - 1, color: "success" },
    { type: "showMessage", text: "Array sorted!", messageType: "success" },
  ],
  isTerminal: true,
});
`,
};
