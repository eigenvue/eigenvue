/**
 * @fileoverview Perceptron (Single Neuron) Step Generator
 *
 * Implements the full forward pass of a single perceptron:
 *   1. Show input values
 *   2. Show weights
 *   3. Compute weighted inputs (w_i × x_i for each i)
 *   4. Compute pre-activation z = dot(w, x) + b
 *   5. Apply activation function a = f(z)
 *   6. Show final output
 *
 * Mathematical basis: Section 4 of the Phase 9 specification.
 *
 * INVARIANTS enforced and tested:
 *   - inputs.length === weights.length (equal number of inputs and weights)
 *   - Pre-activation z = dotProduct(weights, inputs) + bias
 *   - Output a = activationFunction(z)
 *   - Step count is always 6 (show-inputs, show-weights, weighted-inputs,
 *     pre-activation, activation, output)
 */

import { createGenerator } from "@/engine/generator";
import {
  sigmoid,
  relu,
  tanh,
  stepFunction,
  dotProduct,
} from "@/engine/utils/dl-math";

interface PerceptronInputs extends Record<string, unknown> {
  inputs: number[];
  weights: number[];
  bias: number;
  activationFunction: "sigmoid" | "relu" | "tanh" | "step";
}

/**
 * Dispatches to the correct activation function from dl-math.
 *
 * @param fn — Name of the activation function.
 * @param z — Pre-activation value.
 * @returns Activated value.
 */
function applyActivation(fn: string, z: number): number {
  switch (fn) {
    case "sigmoid":
      return sigmoid(z);
    case "relu":
      return relu(z);
    case "tanh":
      return tanh(z);
    case "step":
      return stepFunction(z);
    default:
      return sigmoid(z);
  }
}

export default createGenerator<PerceptronInputs>({
  id: "perceptron",

  *generate(inputs, step) {
    const { inputs: x, weights: w, bias: b, activationFunction: fn } = inputs;
    const n = x.length;

    // ── Step 0: Show Inputs ──────────────────────────────────────────────
    yield step({
      id: "show-inputs",
      title: "Input Values",
      explanation:
        `The neuron receives ${n} input${n > 1 ? "s" : ""}: ` +
        `[${x.join(", ")}]. Each input represents a feature or signal ` +
        `fed into the neuron.`,
      state: {
        inputs: [...x],
        weights: [...w],
        bias: b,
        activationFunction: fn,
        n,
      },
      visualActions: x.map((val, i) => ({
        type: "activateNeuron" as const,
        layer: 0,
        neuronIndex: i,
        value: val,
      })),
      codeHighlight: { language: "pseudocode", lines: [1] },
      phase: "input",
    });

    // ── Step 1: Show Weights ─────────────────────────────────────────────
    yield step({
      id: "show-weights",
      title: "Weight Values",
      explanation:
        `Each input has a corresponding weight: [${w.join(", ")}]. ` +
        `Weights control how much influence each input has on the output. ` +
        `Larger absolute weight = stronger influence.`,
      state: {
        inputs: [...x],
        weights: [...w],
        bias: b,
        activationFunction: fn,
        n,
      },
      visualActions: [
        {
          type: "showWeights" as const,
          weights: [...w],
        },
      ],
      codeHighlight: { language: "pseudocode", lines: [1] },
      phase: "weights",
    });

    // ── Step 2: Weighted Inputs ──────────────────────────────────────────
    const weightedInputs = x.map((xi, i) => xi * w[i]!);

    yield step({
      id: "weighted-inputs",
      title: "Weighted Inputs (wᵢ × xᵢ)",
      explanation:
        `Multiply each input by its weight: ` +
        x.map((xi, i) => `${w[i]} × ${xi} = ${weightedInputs[i]}`).join(", ") +
        `. These products determine each input's contribution to the sum.`,
      state: {
        inputs: [...x],
        weights: [...w],
        bias: b,
        activationFunction: fn,
        n,
        weightedInputs: [...weightedInputs],
      },
      visualActions: [
        {
          type: "showPreActivation" as const,
          values: [...weightedInputs],
        },
      ],
      codeHighlight: { language: "pseudocode", lines: [3, 4] },
      phase: "computation",
    });

    // ── Step 3: Pre-activation (z = w·x + b) ────────────────────────────
    const z = dotProduct(w, x) + b;

    yield step({
      id: "pre-activation",
      title: `Pre-activation: z = ${z.toFixed(4)}`,
      explanation:
        `Sum all weighted inputs and add the bias: ` +
        `z = (${weightedInputs.join(" + ")}) + ${b} = ${z.toFixed(4)}. ` +
        `The bias shifts the activation threshold, allowing the neuron ` +
        `to fire even when all inputs are zero.`,
      state: {
        inputs: [...x],
        weights: [...w],
        bias: b,
        activationFunction: fn,
        n,
        weightedInputs: [...weightedInputs],
        z,
      },
      visualActions: [
        {
          type: "showPreActivation" as const,
          value: z,
        },
      ],
      codeHighlight: { language: "pseudocode", lines: [5] },
      phase: "computation",
    });

    // ── Step 4: Activation ───────────────────────────────────────────────
    const a = applyActivation(fn, z);

    yield step({
      id: "activation",
      title: `Activation: ${fn}(${z.toFixed(4)}) = ${a.toFixed(4)}`,
      explanation:
        `Apply the ${fn} activation function to z = ${z.toFixed(4)}. ` +
        `Result: ${fn}(${z.toFixed(4)}) = ${a.toFixed(4)}. ` +
        `The activation function introduces non-linearity, enabling the ` +
        `neuron to learn patterns beyond simple linear relationships.`,
      state: {
        inputs: [...x],
        weights: [...w],
        bias: b,
        activationFunction: fn,
        n,
        weightedInputs: [...weightedInputs],
        z,
        a,
      },
      visualActions: [
        {
          type: "showActivationFunction" as const,
          fn,
          input: z,
          output: a,
        },
      ],
      codeHighlight: { language: "pseudocode", lines: [6] },
      phase: "activation",
    });

    // ── Step 5: Output (Terminal) ────────────────────────────────────────
    yield step({
      id: "output",
      title: `Output: ${a.toFixed(4)}`,
      explanation:
        `The neuron's final output is ${a.toFixed(4)}. ` +
        `This value would be passed to the next layer in a neural network, ` +
        `or used directly as the prediction in a single-neuron model.`,
      state: {
        inputs: [...x],
        weights: [...w],
        bias: b,
        activationFunction: fn,
        n,
        weightedInputs: [...weightedInputs],
        z,
        a,
        output: a,
      },
      visualActions: [
        {
          type: "activateNeuron" as const,
          layer: 1,
          neuronIndex: 0,
          value: a,
        },
      ],
      codeHighlight: { language: "pseudocode", lines: [7] },
      isTerminal: true,
      phase: "output",
    });
  },
});
