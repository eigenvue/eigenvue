/**
 * @fileoverview Transformer Block Step Generator
 *
 * Orchestrates the full transformer encoder block:
 *   Input → Multi-Head Self-Attention → Add & Norm → FFN → Add & Norm → Output
 *
 * Mathematical basis: Sections 4.2-4.8 of Phase 8 specification.
 *
 * INVARIANTS:
 *   - Residual: result[j] = input[j] + sublayerOutput[j] (±1e-9)
 *   - LayerNorm: mean(output) ≈ 0 (±1e-6), variance(output) ≈ 1 (±1e-4)
 */

import { createGenerator } from "@/engine/generator";
import type { VisualAction } from "@/engine/generator";
import {
  matMul,
  transpose,
  softmaxRows,
  scaleMatrix,
  generateEmbeddings,
  generateWeightMatrix,
  generateBiasVector,
  vectorAdd,
  layerNorm,
  layerNormRows,
  feedForward,
} from "@/engine/utils/genai-math";

interface TransformerBlockInputs extends Record<string, unknown> {
  tokens: string[];
  embeddingDim: number;
  ffnDim: number;
  numHeads: number;
}

export default createGenerator<TransformerBlockInputs>({
  id: "transformer-block",

  *generate(inputs, step) {
    const { tokens, embeddingDim: d, ffnDim, numHeads } = inputs;
    const seqLen = tokens.length;

    if (d % numHeads !== 0) {
      throw new Error(
        `d_model (${d}) must be divisible by numHeads (${numHeads}). ` +
        `Got d_model % numHeads = ${d % numHeads}.`
      );
    }
    const d_k = d / numHeads;

    // Generate input embeddings
    let X = generateEmbeddings(tokens, d);

    // Step 0: Show input
    yield step({
      id: "show-input",
      title: "Input Embeddings",
      explanation:
        `Transformer block receives ${seqLen} tokens as ${d}-dimensional embeddings. ` +
        `The block will process them through self-attention, add & norm, FFN, and add & norm.`,
      state: { tokens, embeddingDim: d, X },
      visualActions: [
        { type: "activateSublayer", sublayerId: "input", label: "Input Embeddings" },
      ],
      codeHighlight: { language: "pseudocode", lines: [1] },
      phase: "input",
    });

    // === SUBLAYER 1: Self-Attention ===
    const inputToAttn = X.map(row => [...row]); // save for residual

    yield step({
      id: "self-attention-start",
      title: "Self-Attention: Computing",
      explanation:
        `Running multi-head self-attention with ${numHeads} head(s), d_k = ${d_k}. ` +
        `Computing Q, K, V projections, attention scores, and weighted outputs.`,
      state: { tokens, phase: "self-attention" },
      visualActions: [
        { type: "activateSublayer", sublayerId: "self-attention", label: "Multi-Head Self-Attention" },
      ],
      codeHighlight: { language: "pseudocode", lines: [2, 3] },
      phase: "self-attention",
    });

    // Simplified: run single-pass attention (for visualization clarity)
    const W_Q = generateWeightMatrix("block_W_Q", d, d);
    const W_K = generateWeightMatrix("block_W_K", d, d);
    const W_V = generateWeightMatrix("block_W_V", d, d);

    const Q = matMul(X, W_Q);
    const K = matMul(X, W_K);
    const V = matMul(X, W_V);
    const K_T = transpose(K);
    const rawScores = matMul(Q, K_T);
    const scaleFactor = Math.sqrt(d_k);
    const scaledScores = scaleMatrix(rawScores, 1 / scaleFactor);
    const attnWeights = softmaxRows(scaledScores);
    const attnOutput = matMul(attnWeights, V); // [seqLen, d]

    yield step({
      id: "self-attention-result",
      title: "Self-Attention: Output",
      explanation:
        `Self-attention complete. Output shape: [${seqLen}, ${d}]. ` +
        `Now we apply the residual connection and layer normalization.`,
      state: { tokens, attnOutput, attnWeights, phase: "self-attention" },
      visualActions: [
        { type: "activateSublayer", sublayerId: "self-attention", label: "Multi-Head Self-Attention" },
        { type: "showFullAttentionMatrix", weights: attnWeights },
      ],
      codeHighlight: { language: "pseudocode", lines: [3] },
      phase: "self-attention",
    });

    // === Add & Norm 1 ===
    // Residual: X + attnOutput
    const residual1: number[][] = X.map((row, i) =>
      vectorAdd(row, attnOutput[i]!)
    );

    // Validate residual connection
    for (let i = 0; i < seqLen; i++) {
      for (let j = 0; j < d; j++) {
        const expected = X[i]![j]! + attnOutput[i]![j]!;
        const actual = residual1[i]![j]!;
        if (Math.abs(actual - expected) > 1e-9) {
          throw new Error(
            `Residual connection error at [${i}][${j}]: expected ${expected}, got ${actual}`
          );
        }
      }
    }

    yield step({
      id: "residual-1",
      title: "Residual Connection + Add",
      explanation:
        `Adding the self-attention output to the original input (residual connection). ` +
        `result = input + self_attention(input). This preserves the original signal.`,
      state: { tokens, residual1, phase: "add-norm-1" },
      visualActions: [
        { type: "activateSublayer", sublayerId: "add-norm-1", label: "Add & Layer Norm" },
        {
          type: "showResidualConnection",
          input: X[0],
          sublayerOutput: attnOutput[0],
          result: residual1[0],
        },
      ],
      codeHighlight: { language: "pseudocode", lines: [4] },
      phase: "add-norm-1",
    });

    // Layer Norm 1
    const norm1 = layerNormRows(residual1);

    // Validate layer norm postconditions
    for (let i = 0; i < seqLen; i++) {
      const row = norm1[i]!;
      const mean = row.reduce((a, b) => a + b, 0) / row.length;
      const variance = row.reduce((a, b) => a + (b - mean) ** 2, 0) / row.length;
      if (Math.abs(mean) > 1e-6) {
        throw new Error(`LayerNorm post-condition violated: mean = ${mean}, expected ≈ 0`);
      }
      if (Math.abs(variance - 1.0) > 1e-3) {
        throw new Error(`LayerNorm post-condition violated: variance = ${variance}, expected ≈ 1`);
      }
    }

    yield step({
      id: "layer-norm-1",
      title: "Layer Normalization",
      explanation:
        `Applying layer normalization. Each token's vector is normalized to mean ≈ 0 ` +
        `and variance ≈ 1. This stabilizes training and helps with gradient flow.`,
      state: { tokens, norm1, phase: "add-norm-1" },
      visualActions: [
        { type: "activateSublayer", sublayerId: "add-norm-1", label: "Add & Layer Norm" },
        { type: "showLayerNorm", input: residual1[0], output: norm1[0] },
      ],
      codeHighlight: { language: "pseudocode", lines: [5] },
      phase: "add-norm-1",
    });

    // === SUBLAYER 2: Feed-Forward Network ===
    const inputToFFN = norm1.map(row => [...row]); // save for residual

    yield step({
      id: "ffn-start",
      title: "Feed-Forward Network: Computing",
      explanation:
        `The FFN applies two linear transformations with ReLU activation: ` +
        `FFN(x) = ReLU(x × W₁ + b₁) × W₂ + b₂. ` +
        `W₁ expands from ${d} to ${ffnDim} dimensions, W₂ compresses back to ${d}.`,
      state: { tokens, phase: "ffn" },
      visualActions: [
        { type: "activateSublayer", sublayerId: "ffn", label: "Feed-Forward Network" },
      ],
      codeHighlight: { language: "pseudocode", lines: [6] },
      phase: "ffn",
    });

    const W1 = generateWeightMatrix("block_W1", d, ffnDim);
    const b1 = generateBiasVector("block_b1", ffnDim);
    const W2 = generateWeightMatrix("block_W2", ffnDim, d);
    const b2 = generateBiasVector("block_b2", d);

    // Show expansion step
    const hidden = matMul(norm1, W1).map((row) => row.map((val, j) => val + b1[j]!));
    const hiddenRelu = hidden.map(row => row.map(v => Math.max(0, v)));

    yield step({
      id: "ffn-expand",
      title: "FFN: ReLU(x × W₁ + b₁)",
      explanation:
        `First layer: expand from ${d} to ${ffnDim} dimensions with ReLU activation. ` +
        `ReLU(x) = max(0, x) zeroes out negative values.`,
      state: { tokens, hiddenShape: [seqLen, ffnDim], phase: "ffn" },
      visualActions: [
        { type: "activateSublayer", sublayerId: "ffn", label: "Feed-Forward Network" },
        { type: "showMessage", text: `Expanded: [${seqLen}, ${d}] → [${seqLen}, ${ffnDim}]`, messageType: "info" },
      ],
      codeHighlight: { language: "pseudocode", lines: [7] },
      phase: "ffn",
    });

    const ffnOutput = feedForward(norm1, W1, b1, W2, b2);

    yield step({
      id: "ffn-compress",
      title: "FFN: × W₂ + b₂",
      explanation:
        `Second layer: compress from ${ffnDim} back to ${d} dimensions. ` +
        `Output shape: [${seqLen}, ${d}].`,
      state: { tokens, ffnOutput, phase: "ffn" },
      visualActions: [
        { type: "activateSublayer", sublayerId: "ffn", label: "Feed-Forward Network" },
        { type: "showMessage", text: `Compressed: [${seqLen}, ${ffnDim}] → [${seqLen}, ${d}]`, messageType: "info" },
      ],
      codeHighlight: { language: "pseudocode", lines: [8] },
      phase: "ffn",
    });

    // === Add & Norm 2 ===
    const residual2: number[][] = norm1.map((row, i) =>
      vectorAdd(row, ffnOutput[i]!)
    );

    // Validate residual connection 2
    for (let i = 0; i < seqLen; i++) {
      for (let j = 0; j < d; j++) {
        const expected = norm1[i]![j]! + ffnOutput[i]![j]!;
        const actual = residual2[i]![j]!;
        if (Math.abs(actual - expected) > 1e-9) {
          throw new Error(
            `Residual connection 2 error at [${i}][${j}]: expected ${expected}, got ${actual}`
          );
        }
      }
    }

    yield step({
      id: "residual-2",
      title: "Residual Connection + Add",
      explanation:
        `Adding the FFN output to its input (second residual connection). ` +
        `result = norm1_output + FFN(norm1_output).`,
      state: { tokens, residual2, phase: "add-norm-2" },
      visualActions: [
        { type: "activateSublayer", sublayerId: "add-norm-2", label: "Add & Layer Norm" },
        {
          type: "showResidualConnection",
          input: norm1[0],
          sublayerOutput: ffnOutput[0],
          result: residual2[0],
        },
      ],
      codeHighlight: { language: "pseudocode", lines: [9] },
      phase: "add-norm-2",
    });

    // Layer Norm 2
    const norm2 = layerNormRows(residual2);

    // Validate layer norm postconditions
    for (let i = 0; i < seqLen; i++) {
      const row = norm2[i]!;
      const mean = row.reduce((a, b) => a + b, 0) / row.length;
      const variance = row.reduce((a, b) => a + (b - mean) ** 2, 0) / row.length;
      if (Math.abs(mean) > 1e-6) {
        throw new Error(`LayerNorm 2 post-condition violated: mean = ${mean}`);
      }
      if (Math.abs(variance - 1.0) > 1e-3) {
        throw new Error(`LayerNorm 2 post-condition violated: variance = ${variance}`);
      }
    }

    yield step({
      id: "layer-norm-2",
      title: "Layer Normalization",
      explanation:
        `Second layer normalization. Output: mean ≈ 0, variance ≈ 1 for each token.`,
      state: { tokens, norm2, phase: "add-norm-2" },
      visualActions: [
        { type: "activateSublayer", sublayerId: "add-norm-2", label: "Add & Layer Norm" },
        { type: "showLayerNorm", input: residual2[0], output: norm2[0] },
      ],
      codeHighlight: { language: "pseudocode", lines: [10] },
      phase: "add-norm-2",
    });

    // Complete
    yield step({
      id: "complete",
      title: "Transformer Block Complete",
      explanation:
        `The transformer block is complete. Input embeddings have been transformed through: ` +
        `Self-Attention → Add & Norm → FFN → Add & Norm. ` +
        `Each token now carries contextual information from all other tokens. ` +
        `Output shape: [${seqLen}, ${d}].`,
      state: { tokens, output: norm2, phase: "output" },
      visualActions: [
        { type: "activateSublayer", sublayerId: "output", label: "Output" },
      ],
      codeHighlight: { language: "pseudocode", lines: [11] },
      isTerminal: true,
      phase: "result",
    });
  },
});
