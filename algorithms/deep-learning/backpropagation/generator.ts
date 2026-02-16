/**
 * @fileoverview Backpropagation Step Generator
 *
 * Demonstrates a complete training step: forward pass -> loss -> backward pass
 * -> weight update. This is the algorithm that makes neural networks learn.
 *
 * Mathematical basis: Section 4.4 of the Phase 9 specification.
 *
 * CRITICAL INVARIANTS (tested via numerical gradient checking):
 *   1. d^(N)_j = (2/k)(a^(N)_j - y_j) * f'(z^(N)_j)     [MSE + any activation]
 *      OR d^(N)_j = a^(N)_j - y_j                          [BCE + sigmoid]
 *   2. d^(L)_j = f'(z^(L)_j) * Sum_k w^(L+1)_{kj} * d^(L+1)_k
 *   3. dLoss/dw^(L)_{ji} = d^(L)_j * a^(L-1)_i
 *   4. dLoss/db^(L)_j = d^(L)_j
 *   5. All gradients match numerical gradient +/-1e-4 relative tolerance
 */

import { createGenerator } from "@/engine/generator";
import {
  sigmoid,
  sigmoidDerivative,
  relu,
  reluDerivative,
  tanh as tanhFn,
  tanhDerivative,
  matVecMul,
  vecAdd,
  seedRandom,
  mseLoss,
  mseLossGradient,
  bceLoss,
} from "@/engine/utils/dl-math";

interface BackpropInputs extends Record<string, unknown> {
  inputValues: number[];
  targets: number[];
  layerSizes: number[];
  activationFunction: "sigmoid" | "relu" | "tanh";
  lossFunction: "mse" | "binary-cross-entropy";
  learningRate: number;
  seed: string;
}

function activate(fn: string, z: number): number {
  switch (fn) {
    case "sigmoid": return sigmoid(z);
    case "relu":    return relu(z);
    case "tanh":    return tanhFn(z);
    default:        return sigmoid(z);
  }
}

function activateDerivative(fn: string, z: number): number {
  switch (fn) {
    case "sigmoid": return sigmoidDerivative(z);
    case "relu":    return reluDerivative(z);
    case "tanh":    return tanhDerivative(z);
    default:        return sigmoidDerivative(z);
  }
}

export default createGenerator<BackpropInputs>({
  id: "backpropagation",

  *generate(inputs, step) {
    const {
      inputValues, targets, layerSizes, activationFunction: actFn,
      lossFunction: lossFn, learningRate: lr, seed,
    } = inputs;

    // -- Preconditions --
    if (inputValues.length !== layerSizes[0]) {
      throw new Error(`Input length must match layerSizes[0].`);
    }
    if (targets.length !== layerSizes[layerSizes.length - 1]) {
      throw new Error(`Targets length must match output layer size.`);
    }
    if (lossFn === "binary-cross-entropy" && actFn !== "sigmoid") {
      throw new Error(`Binary cross-entropy requires sigmoid activation on output.`);
    }

    const rng = seedRandom(seed);
    const N = layerSizes.length; // Total layers (including input)

    // -- Initialize weights (Xavier) and biases --
    const W: number[][][] = [[]]; // W[l] = weight matrix from layer l-1 to l
    const b: number[][] = [[]];

    for (let l = 1; l < N; l++) {
      const nIn = layerSizes[l - 1]!;
      const nOut = layerSizes[l]!;
      const limit = Math.sqrt(6 / (nIn + nOut));
      const Wl: number[][] = [];
      for (let j = 0; j < nOut; j++) {
        const row: number[] = [];
        for (let i = 0; i < nIn; i++) {
          row.push((rng() * 2 - 1) * limit);
        }
        Wl.push(row);
      }
      W.push(Wl);
      b.push(Array.from({ length: nOut }, () => 0.01));
    }

    // ======================================================================
    // FORWARD PASS
    // ======================================================================

    const aAll: number[][] = []; // activations per layer
    const zAll: number[][] = []; // pre-activations per layer (zAll[0] unused)
    aAll.push([...inputValues]);
    zAll.push([]); // No pre-activation for input layer

    yield step({
      id: "forward-start",
      title: "Forward Pass Begins",
      explanation: `Starting forward propagation with input [${inputValues.join(", ")}]. Target output: [${targets.join(", ")}].`,
      state: {
        layerSizes: [...layerSizes],
        activations: aAll.map(a => [...a]),
        weights: W.map(Wl => Wl.map(r => [...r])),
        targets: [...targets],
      },
      visualActions: inputValues.map((v, i) => ({
        type: "activateNeuron" as const, layer: 0, index: i, value: v,
      })),
      codeHighlight: { language: "pseudocode", lines: [1, 2] },
      phase: "forward",
    });

    for (let l = 1; l < N; l++) {
      const prev = aAll[l - 1]!;
      const zVec = vecAdd(matVecMul(W[l]!, prev), b[l]!);
      const aVec = zVec.map(zj => activate(actFn, zj));
      zAll.push([...zVec]);
      aAll.push([...aVec]);

      yield step({
        id: `forward-layer-${l}`,
        title: `Forward: Layer ${l}`,
        explanation: `Layer ${l}: z = W*a + b = [${zVec.map(v => v.toFixed(4)).join(", ")}]. After ${actFn}: [${aVec.map(v => v.toFixed(4)).join(", ")}].`,
        state: {
          layerSizes: [...layerSizes],
          activations: aAll.map(a => [...a]),
          weights: W.map(Wl => Wl.map(r => [...r])),
          targets: [...targets],
          preActivations: [...zVec],
          currentLayer: l,
        },
        visualActions: [
          { type: "propagateSignal" as const, fromLayer: l - 1, toLayer: l },
          ...aVec.map((v, j) => ({ type: "activateNeuron" as const, layer: l, index: j, value: v })),
        ],
        codeHighlight: { language: "pseudocode", lines: [3, 4, 5] },
        phase: "forward",
      });
    }

    // ======================================================================
    // COMPUTE LOSS
    // ======================================================================

    const predictions = aAll[N - 1]!;
    const k = predictions.length; // number of output neurons
    const loss = lossFn === "mse"
      ? mseLoss(predictions, targets)
      : bceLoss(predictions, targets);

    yield step({
      id: "compute-loss",
      title: "Compute Loss",
      explanation: `Predictions: [${predictions.map(v => v.toFixed(4)).join(", ")}]. Targets: [${targets.join(", ")}]. ` +
        `${lossFn === "mse" ? "MSE" : "BCE"} Loss = ${loss.toFixed(6)}.`,
      state: {
        layerSizes: [...layerSizes],
        activations: aAll.map(a => [...a]),
        weights: W.map(Wl => Wl.map(r => [...r])),
        targets: [...targets],
        loss,
        predictions: [...predictions],
      },
      visualActions: [{ type: "showLoss" as const, loss, lossFunction: lossFn, predictions: [...predictions], targets: [...targets] }],
      codeHighlight: { language: "pseudocode", lines: [6] },
      phase: "loss",
    });

    // ======================================================================
    // BACKWARD PASS
    // ======================================================================

    // delta[l][j] = error signal at neuron j in layer l
    const delta: number[][] = Array.from({ length: N }, () => []);

    // -- Output layer delta --
    // MSE:  delta^(N-1)_j = (2/k) * (a_j - y_j) * f'(z_j)
    // BCE+sigmoid: delta^(N-1)_j = a_j - y_j  (simplified form)
    const outputLayer = N - 1;
    const outputZ = zAll[outputLayer]!;
    const outputA = aAll[outputLayer]!;

    for (let j = 0; j < k; j++) {
      if (lossFn === "binary-cross-entropy" && actFn === "sigmoid") {
        // Combined sigmoid + BCE gradient -- numerically stable and simple.
        // dL/dz = a - y
        delta[outputLayer]![j] = outputA[j]! - targets[j]!;
      } else {
        // General MSE case: delta = (2/k)(a - y) * f'(z)
        const dLoss_dA = (2 / k) * (outputA[j]! - targets[j]!);
        const fPrime = activateDerivative(actFn, outputZ[j]!);
        delta[outputLayer]![j] = dLoss_dA * fPrime;
      }
    }

    yield step({
      id: "backward-output",
      title: "Backward: Output Layer Gradients",
      explanation: `Computing error signals (delta) at output layer: [${delta[outputLayer]!.map(v => v.toFixed(6)).join(", ")}]. ` +
        (lossFn === "binary-cross-entropy"
          ? `Using the simplified sigmoid+BCE form: delta = a - y.`
          : `delta = (2/${k})(a - y) * f'(z).`),
      state: {
        layerSizes: [...layerSizes],
        activations: aAll.map(a => [...a]),
        weights: W.map(Wl => Wl.map(r => [...r])),
        targets: [...targets],
        loss,
        gradients: delta.map(d => [...d]),
        currentLayer: outputLayer,
      },
      visualActions: [{ type: "showGradient" as const, layer: outputLayer, gradients: [...delta[outputLayer]!] }],
      codeHighlight: { language: "pseudocode", lines: [7, 8] },
      phase: "backward",
    });

    // -- Hidden layers delta (backward from output-1 to 1) --
    // delta^(L)_j = f'(z^(L)_j) * Sum_k w^(L+1)_{kj} * delta^(L+1)_k
    for (let l = outputLayer - 1; l >= 1; l--) {
      const nL = layerSizes[l]!;
      const nNext = layerSizes[l + 1]!;
      const nextW = W[l + 1]!;
      const nextDelta = delta[l + 1]!;
      const thisZ = zAll[l]!;

      for (let j = 0; j < nL; j++) {
        // Sum_k w^(L+1)_{kj} * delta^(L+1)_k
        let downstreamSum = 0;
        for (let kk = 0; kk < nNext; kk++) {
          downstreamSum += nextW[kk]![j]! * nextDelta[kk]!;
        }
        delta[l]![j] = activateDerivative(actFn, thisZ[j]!) * downstreamSum;
      }

      yield step({
        id: `backward-hidden-${l}`,
        title: `Backward: Hidden Layer ${l}`,
        explanation: `Propagating gradients to layer ${l}. delta = f'(z) * (W^T * delta_next): [${delta[l]!.map(v => v.toFixed(6)).join(", ")}].`,
        state: {
          layerSizes: [...layerSizes],
          activations: aAll.map(a => [...a]),
          weights: W.map(Wl => Wl.map(r => [...r])),
          targets: [...targets],
          loss,
          gradients: delta.map(d => [...d]),
          currentLayer: l,
        },
        visualActions: [{ type: "showGradient" as const, layer: l, gradients: [...delta[l]!] }],
        codeHighlight: { language: "pseudocode", lines: [9, 10] },
        phase: "backward",
      });
    }

    // ======================================================================
    // WEIGHT UPDATE
    // ======================================================================

    // dLoss/dw^(L)_{ji} = delta^(L)_j * a^(L-1)_i
    // dLoss/db^(L)_j = delta^(L)_j
    // w_new = w_old - eta * dLoss/dw

    for (let l = 1; l < N; l++) {
      const nOut = layerSizes[l]!;
      const nIn = layerSizes[l - 1]!;
      const prevA = aAll[l - 1]!;
      const deltaL = delta[l]!;

      const oldW = W[l]!.map(row => [...row]);
      const oldB = [...b[l]!];

      // Compute weight gradients and update
      const wGrads: number[][] = [];
      for (let j = 0; j < nOut; j++) {
        const rowGrads: number[] = [];
        for (let i = 0; i < nIn; i++) {
          const grad = deltaL[j]! * prevA[i]!;
          rowGrads.push(grad);
          W[l]![j]![i] = W[l]![j]![i]! - lr * grad;
        }
        wGrads.push(rowGrads);
        // Bias update
        b[l]![j] = b[l]![j]! - lr * deltaL[j]!;
      }

      yield step({
        id: `update-weights-${l}`,
        title: `Update Weights: Layer ${l}`,
        explanation: `Updating weights for layer ${l} with learning rate eta = ${lr}. w_new = w_old - eta * delta * a_prev.`,
        state: {
          layerSizes: [...layerSizes],
          activations: aAll.map(a => [...a]),
          weights: W.map(Wl => Wl.map(r => [...r])),
          biases: b.map(bl => [...bl]),
          targets: [...targets],
          loss,
          gradients: delta.map(d => [...d]),
          weightGradients: wGrads.map(row => [...row]),
          currentLayer: l,
          learningRate: lr,
        },
        visualActions: [{
          type: "updateWeights" as const,
          fromLayer: l - 1,
          toLayer: l,
          oldWeights: oldW,
          newWeights: W[l]!.map(row => [...row]),
          learningRate: lr,
        }],
        codeHighlight: { language: "pseudocode", lines: [11, 12] },
        phase: "update",
      });
    }

    // -- Final Step --
    yield step({
      id: "complete",
      title: "Training Step Complete",
      explanation: `One complete training step finished. Loss: ${loss.toFixed(6)}. All weights have been updated. ` +
        `In practice, this process repeats for many iterations until the loss converges.`,
      state: {
        layerSizes: [...layerSizes],
        activations: aAll.map(a => [...a]),
        weights: W.map(Wl => Wl.map(r => [...r])),
        biases: b.map(bl => [...bl]),
        targets: [...targets],
        loss,
        gradients: delta.map(d => [...d]),
      },
      visualActions: [],
      codeHighlight: { language: "pseudocode", lines: [13] },
      isTerminal: true,
      phase: "complete",
    });
  },
});
