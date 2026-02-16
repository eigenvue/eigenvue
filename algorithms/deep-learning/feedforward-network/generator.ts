/**
 * @fileoverview Feedforward Neural Network — Step Generator
 *
 * Implements the forward propagation through a multi-layer feedforward network:
 *   1. Show network architecture and activate input layer
 *   2. For each hidden/output layer, compute z = W·a + b then a = activation(z)
 *   3. Show final output activations
 *
 * Mathematical basis: Section 4 of the Phase 9 specification.
 *
 * Weight convention: W[toNeuron][fromNeuron] (standard ML convention).
 * Xavier initialization: limit = sqrt(6 / (nIn + nOut)), w in [-limit, +limit].
 * Biases initialized to 0.01.
 *
 * INVARIANTS enforced:
 *   - inputValues.length === layerSizes[0]
 *   - layerSizes.length >= 2 (at least input + output)
 *   - All state snapshots are deep copies (no shared references)
 */

import { createGenerator } from "@/engine/generator";
import {
  sigmoid,
  relu,
  tanh as tanhFn,
  matVecMul,
  vecAdd,
  seedRandom,
} from "@/engine/utils/dl-math";

// ─────────────────────────────────────────────────────────────────────────────
// Input Interface
// ─────────────────────────────────────────────────────────────────────────────

interface FeedforwardInputs extends Record<string, unknown> {
  /** Input values fed to the first layer. Length must equal layerSizes[0]. */
  inputValues: number[];
  /** Number of neurons per layer (including input and output layers). */
  layerSizes: number[];
  /** Activation function applied after each linear transformation. */
  activationFunction: "sigmoid" | "relu" | "tanh";
  /** Random seed for deterministic weight initialization. */
  seed: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dispatches to the correct activation function based on name.
 *
 * @param z — Pre-activation value.
 * @param fn — Activation function name.
 * @returns Activated value.
 */
function applyActivation(z: number, fn: "sigmoid" | "relu" | "tanh"): number {
  switch (fn) {
    case "sigmoid":
      return sigmoid(z);
    case "relu":
      return relu(z);
    case "tanh":
      return tanhFn(z);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Generator
// ─────────────────────────────────────────────────────────────────────────────

export default createGenerator<FeedforwardInputs>({
  id: "feedforward-network",

  *generate(inputs, step) {
    const { inputValues, layerSizes, activationFunction, seed } = inputs;

    // ── Precondition Checks ──────────────────────────────────────────────
    if (inputValues.length !== layerSizes[0]) {
      throw new Error(
        `inputValues.length (${inputValues.length}) must equal layerSizes[0] (${layerSizes[0]}).`,
      );
    }
    if (layerSizes.length < 2) {
      throw new Error(
        `layerSizes must have at least 2 entries (input + output). Got ${layerSizes.length}.`,
      );
    }

    const numLayers = layerSizes.length;
    const rng = seedRandom(seed);

    // ── Weight & Bias Initialization ─────────────────────────────────────
    // allWeights[l][j][i]: weight from neuron i in layer l-1 to neuron j in layer l
    // allWeights[0] = [] (unused — input layer has no incoming weights)
    const allWeights: number[][][] = [[]];
    const allBiases: number[][] = [[]];

    for (let l = 1; l < numLayers; l++) {
      const nIn = layerSizes[l - 1]!;
      const nOut = layerSizes[l]!;
      // Xavier initialization: limit = sqrt(6 / (nIn + nOut))
      const limit = Math.sqrt(6 / (nIn + nOut));

      const W: number[][] = [];
      const b: number[] = [];

      for (let j = 0; j < nOut; j++) {
        const row: number[] = [];
        for (let i = 0; i < nIn; i++) {
          row.push((rng() * 2 - 1) * limit);
        }
        W.push(row);
        b.push(0.01);
      }

      allWeights.push(W);
      allBiases.push(b);
    }

    // ── Activation Storage ───────────────────────────────────────────────
    // activations[l] = activation vector for layer l
    const activations: number[][] = new Array(numLayers);
    activations[0] = [...inputValues];

    // ── Helper: Deep-copy state ──────────────────────────────────────────
    function snapshotState() {
      return {
        layerSizes: [...layerSizes],
        activations: activations.map((a) => [...a]),
        weights: allWeights.map((W) => W.map((row) => [...row])),
        biases: allBiases.map((b) => [...b]),
        activationFunction,
      };
    }

    // ── Step: Architecture ───────────────────────────────────────────────
    yield step({
      id: "architecture",
      title: "Network Architecture",
      explanation:
        `Feedforward network with ${numLayers} layers: [${layerSizes.join(", ")}]. ` +
        `Input layer has ${layerSizes[0]} neurons receiving values [${inputValues.join(", ")}]. ` +
        `Using ${activationFunction} activation. ` +
        `Weights initialized with Xavier initialization (seed: "${seed}").`,
      state: snapshotState(),
      visualActions: inputValues.map((value, i) => ({
        type: "activateNeuron" as const,
        layer: 0,
        index: i,
        value,
      })),
      codeHighlight: { language: "pseudocode", lines: [2] },
      phase: "initialization",
    });

    // ── Steps: Forward Propagation (layer by layer) ──────────────────────
    for (let l = 1; l < numLayers; l++) {
      const W = allWeights[l]!;
      const b = allBiases[l]!;
      const prevActivations = activations[l - 1]!;

      // z = W · a_{l-1} + b
      const z = vecAdd(matVecMul(W, prevActivations), b);
      // a = activation(z)
      const a = z.map((zi) => applyActivation(zi, activationFunction));
      activations[l] = a;

      const isHidden = l < numLayers - 1;
      const layerLabel = isHidden ? `Hidden Layer ${l}` : "Output Layer";

      yield step({
        id: `propagate-${l}`,
        title: `Forward Propagation → ${layerLabel}`,
        explanation:
          `Computing activations for layer ${l} (${layerSizes[l]} neurons). ` +
          `z = W·a + b, then a = ${activationFunction}(z). ` +
          `Input from ${layerSizes[l - 1]} neurons in layer ${l - 1}. ` +
          `Activations: [${a.map((v) => v.toFixed(4)).join(", ")}].`,
        state: snapshotState(),
        visualActions: [
          {
            type: "propagateSignal" as const,
            fromLayer: l - 1,
            toLayer: l,
          },
          ...a.map((value, j) => ({
            type: "activateNeuron" as const,
            layer: l,
            index: j,
            value,
          })),
        ],
        codeHighlight: { language: "pseudocode", lines: [3, 4] },
        phase: "forward-propagation",
      });
    }

    // ── Step: Output ─────────────────────────────────────────────────────
    const finalActivations = activations[numLayers - 1]!;

    yield step({
      id: "output",
      title: "Network Output",
      explanation:
        `Forward propagation complete. ` +
        `Final output: [${finalActivations.map((v) => v.toFixed(4)).join(", ")}]. ` +
        `The input [${inputValues.join(", ")}] was transformed through ${numLayers - 1} ` +
        `layer${numLayers - 1 > 1 ? "s" : ""} of ${activationFunction} activations.`,
      state: snapshotState(),
      visualActions: finalActivations.map((value, j) => ({
        type: "activateNeuron" as const,
        layer: numLayers - 1,
        index: j,
        value,
      })),
      codeHighlight: { language: "pseudocode", lines: [5] },
      isTerminal: true,
      phase: "result",
    });
  },
});
