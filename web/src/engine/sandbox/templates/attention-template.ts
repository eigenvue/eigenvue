/**
 * @fileoverview Attention Template — Simple Self-Attention Example
 *
 * Demonstrates the `attention-heatmap` layout with:
 * - highlightToken
 * - showAttentionWeights
 * - showMessage
 */

import type { AlgorithmTemplate } from "./index";

export const ATTENTION_TEMPLATE: AlgorithmTemplate = {
  id: "attention-simple",
  name: "Simple Attention (GenAI)",
  description: "Compute attention weights between tokens and visualize them.",
  layoutId: "attention-heatmap",
  category: "generative-ai",
  difficulty: "intermediate",
  code: `// Simple Attention — compute and visualize attention scores.
//
// Available visual actions for "attention-heatmap" layout:
//   { type: "highlightToken", index: N, color?: "..." }
//   { type: "showAttentionWeights", queryIdx: N, weights: [...] }
//   { type: "showMessage", text: "..." }

const tokens = ["The", "cat", "sat", "on", "the", "mat"];

// Simulated embedding vectors (4-dimensional for simplicity).
// In a real transformer, these would be d_model dimensional.
const embeddings = [
  [0.9, 0.1, 0.2, 0.4],  // "The"
  [0.1, 0.8, 0.3, 0.5],  // "cat"
  [0.2, 0.3, 0.9, 0.1],  // "sat"
  [0.3, 0.2, 0.1, 0.8],  // "on"
  [0.9, 0.1, 0.2, 0.4],  // "the"
  [0.4, 0.6, 0.2, 0.7],  // "mat"
];

// Dot product function.
function dot(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

// Softmax function.
function softmax(values) {
  const max = Math.max(...values);
  const exps = values.map(v => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(e => e / sum);
}

step({
  title: "Token Sequence",
  explanation: \`Input tokens: [\${tokens.map(t => '"' + t + '"').join(", ")}]. Computing self-attention.\`,
  state: { tokens: [...tokens] },
  visualActions: tokens.map((_, i) => ({
    type: "highlightToken", index: i,
  })),
});

// Compute attention for each query token.
for (let q = 0; q < tokens.length; q++) {
  // Compute raw scores (dot products).
  const scores = [];
  for (let k = 0; k < tokens.length; k++) {
    scores.push(dot(embeddings[q], embeddings[k]));
  }

  // Scale by sqrt(d_k).
  const d_k = embeddings[0].length;
  const scaledScores = scores.map(s => s / Math.sqrt(d_k));

  // Apply softmax to get attention weights.
  const weights = softmax(scaledScores);

  step({
    title: \`Attention: "\${tokens[q]}" (query \${q})\`,
    explanation: \`Query "\${tokens[q]}" attends most to "\${tokens[weights.indexOf(Math.max(...weights))]}" (weight: \${utils.formatNumber(Math.max(...weights))}).\`,
    state: {
      tokens: [...tokens],
      queryIndex: q,
      scores: scores.map(s => +s.toFixed(4)),
      weights: weights.map(w => +w.toFixed(4)),
    },
    visualActions: [
      { type: "highlightToken", index: q, color: "accent" },
      { type: "showAttentionWeights", queryIdx: q, weights: weights.map(w => +w.toFixed(4)) },
    ],
    isTerminal: q === tokens.length - 1,
  });
}
`,
};
