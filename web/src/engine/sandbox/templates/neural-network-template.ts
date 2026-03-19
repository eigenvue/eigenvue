/**
 * @fileoverview Neural Network Template — Forward Pass Example
 *
 * Demonstrates the `layer-network` layout with:
 * - activateNeuron
 * - propagateSignal
 * - showMessage
 */

import type { AlgorithmTemplate } from "./index";

export const NEURAL_NETWORK_TEMPLATE: AlgorithmTemplate = {
  id: "nn-forward-pass",
  name: "Forward Pass (Neural Network)",
  description: "Signal propagation through a 3-layer neural network.",
  layoutId: "layer-network",
  category: "deep-learning",
  difficulty: "intermediate",
  code: `// Forward Pass — propagate signals through a neural network.
//
// Available visual actions for "layer-network" layout:
//   { type: "activateNeuron", layer: N, index: M, value: V }
//   { type: "propagateSignal", fromLayer: N, toLayer: M }
//   { type: "showGradient", layer: N, values: [...] }
//   { type: "showMessage", text: "..." }

// Simple 3-layer network: 2 inputs -> 3 hidden -> 1 output
const inputs = [0.8, 0.5];

// Weights (hand-picked for educational clarity).
// Layer 0->1: 2 inputs x 3 hidden neurons = 6 weights.
const w01 = [[0.4, -0.3, 0.6], [0.2, 0.5, -0.1]];
// Layer 1->2: 3 hidden x 1 output = 3 weights.
const w12 = [[0.7], [-0.4], [0.3]];

// Sigmoid activation function.
function sigmoid(x) { return 1.0 / (1.0 + Math.exp(-x)); }

step({
  title: "Input Layer",
  explanation: \`Input values: [\${inputs.join(", ")}].\`,
  state: { inputs: [...inputs], layer: 0 },
  visualActions: [
    { type: "activateNeuron", layer: 0, index: 0, value: inputs[0] },
    { type: "activateNeuron", layer: 0, index: 1, value: inputs[1] },
  ],
});

// Hidden layer computation.
const hidden = [];
for (let j = 0; j < 3; j++) {
  let sum = 0;
  for (let i = 0; i < inputs.length; i++) {
    sum += inputs[i] * w01[i][j];
  }
  hidden.push(sigmoid(sum));
}

step({
  title: "Propagate to Hidden Layer",
  explanation: \`Computing hidden layer activations via sigmoid.\`,
  state: { inputs: [...inputs], hidden: hidden.map(h => +h.toFixed(4)), layer: 1 },
  visualActions: [
    { type: "propagateSignal", fromLayer: 0, toLayer: 1 },
    ...hidden.map((val, idx) => ({
      type: "activateNeuron", layer: 1, index: idx, value: +val.toFixed(4),
    })),
  ],
});

// Output layer computation.
let outputSum = 0;
for (let j = 0; j < hidden.length; j++) {
  outputSum += hidden[j] * w12[j][0];
}
const output = sigmoid(outputSum);

step({
  title: "Propagate to Output Layer",
  explanation: \`Output = sigmoid(\${utils.formatNumber(outputSum)}) = \${utils.formatNumber(output)}.\`,
  state: { inputs: [...inputs], hidden: hidden.map(h => +h.toFixed(4)), output: +output.toFixed(4), layer: 2 },
  visualActions: [
    { type: "propagateSignal", fromLayer: 1, toLayer: 2 },
    { type: "activateNeuron", layer: 2, index: 0, value: +output.toFixed(4) },
  ],
});

step({
  title: "Forward Pass Complete",
  explanation: \`Network output: \${utils.formatNumber(output)}. The network maps inputs [\${inputs.join(", ")}] to output \${utils.formatNumber(output)}.\`,
  state: { inputs: [...inputs], hidden: hidden.map(h => +h.toFixed(4)), output: +output.toFixed(4) },
  visualActions: [
    { type: "showMessage", text: \`Output: \${utils.formatNumber(output)}\`, messageType: "success" },
  ],
  isTerminal: true,
});
`,
};
