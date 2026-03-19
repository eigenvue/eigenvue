/**
 * @fileoverview Blank Template — Minimal Starting Point
 *
 * A bare-minimum template that demonstrates the step() function.
 * Intended as the default starting point for new users.
 */

import type { AlgorithmTemplate } from "./index";

export const BLANK_TEMPLATE: AlgorithmTemplate = {
  id: "blank",
  name: "Blank Template",
  description: "Minimal starting point — just the step() function.",
  layoutId: "array-with-pointers",
  category: "classical",
  difficulty: "beginner",
  code: `// Your custom algorithm!
//
// The step() function creates a visualization step.
// Each step has:
//   title         — short heading
//   explanation   — what's happening
//   state         — algorithm variables (shown in the state inspector)
//   visualActions — rendering instructions for the selected layout
//   isTerminal    — set to true on the LAST step
//
// Utility functions available via utils:
//   utils.deepClone(value)   — deep copy a value
//   utils.range(start, end)  — generate [start, start+1, ..., end-1]
//   utils.createMatrix(r, c) — create a rows × cols 2D array
//   utils.shuffle(array)     — deterministic shuffle
//   utils.formatNumber(n, d) — format number to d decimal places

// --- Your code here ---

step({
  title: "Hello, Eigenvue!",
  explanation: "This is your first step. Modify this code to visualize your own algorithm!",
  state: { message: "Hello!" },
  visualActions: [
    { type: "showMessage", text: "Welcome to the editor!", messageType: "info" },
  ],
  isTerminal: true,
});
`,
};
