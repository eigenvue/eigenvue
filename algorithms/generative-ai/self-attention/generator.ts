/**
 * @fileoverview Self-Attention (Scaled Dot-Product) Step Generator
 *
 * Implements the full scaled dot-product attention mechanism:
 *   1. Generate input embeddings
 *   2. Linear projections: X → Q, K, V
 *   3. Compute raw scores: Q × K^T
 *   4. Scale by 1/√d_k
 *   5. Apply softmax (row-wise)
 *   6. Compute weighted values: weights × V
 *
 * Mathematical basis: Sections 4.1, 4.2, 4.3, 4.4 of Phase 8 specification.
 *
 * INVARIANTS enforced and tested:
 *   - Each row of the attention weight matrix sums to 1.0 (±1e-6)
 *   - All attention weights are non-negative
 *   - Score scaling uses sqrt(d_k) exactly
 *   - Matrix multiplication dimensions are verified at each step
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
} from "@/engine/utils/genai-math";

interface SelfAttentionInputs extends Record<string, unknown> {
  tokens: string[];
  embeddingDim: number;
}

export default createGenerator<SelfAttentionInputs>({
  id: "self-attention",

  *generate(inputs, step) {
    const { tokens, embeddingDim: d } = inputs;
    const seqLen = tokens.length;
    const d_k = d; // In single-head attention, d_k = d_model

    // Generate deterministic embeddings and weight matrices
    const X = generateEmbeddings(tokens, d);
    const W_Q = generateWeightMatrix("W_Q", d, d_k);
    const W_K = generateWeightMatrix("W_K", d, d_k);
    const W_V = generateWeightMatrix("W_V", d, d_k);

    // Step 0: Show Input Embeddings
    yield step({
      id: "show-input",
      title: "Input Embeddings",
      explanation:
        `Starting with ${seqLen} tokens, each represented as a ${d}-dimensional ` +
        `embedding vector. These embeddings are the input matrix X with shape [${seqLen}, ${d}].`,
      state: { tokens, embeddingDim: d, X, phase: "input" },
      visualActions: tokens.map((_, i) => ({
        type: "showEmbedding" as const,
        tokenIndex: i,
        values: X[i],
      })),
      codeHighlight: { language: "pseudocode", lines: [1] },
      phase: "input",
    });

    // Step 1: Q = X × W_Q
    const Q = matMul(X, W_Q);
    yield step({
      id: "compute-q",
      title: "Compute Query Matrix (Q)",
      explanation:
        `Q = X × W_Q. Each token's embedding is projected into "query" space. ` +
        `The query represents "what is this token looking for?" ` +
        `Shape: [${seqLen}, ${d}] × [${d}, ${d_k}] = [${seqLen}, ${d_k}].`,
      state: { tokens, Q, W_Q, phase: "projection" },
      visualActions: [
        { type: "showProjectionMatrix", projectionType: "Q", matrix: Q },
        { type: "showMessage", text: `Q = X × W_Q → shape [${seqLen}, ${d_k}]`, messageType: "info" },
      ],
      codeHighlight: { language: "pseudocode", lines: [2] },
      phase: "projection",
    });

    // Step 2: K = X × W_K
    const K = matMul(X, W_K);
    yield step({
      id: "compute-k",
      title: "Compute Key Matrix (K)",
      explanation:
        `K = X × W_K. Each token's embedding is projected into "key" space. ` +
        `The key represents "what does this token contain?" ` +
        `Shape: [${seqLen}, ${d}] × [${d}, ${d_k}] = [${seqLen}, ${d_k}].`,
      state: { tokens, K, W_K, phase: "projection" },
      visualActions: [
        { type: "showProjectionMatrix", projectionType: "K", matrix: K },
        { type: "showMessage", text: `K = X × W_K → shape [${seqLen}, ${d_k}]`, messageType: "info" },
      ],
      codeHighlight: { language: "pseudocode", lines: [3] },
      phase: "projection",
    });

    // Step 3: V = X × W_V
    const V = matMul(X, W_V);
    yield step({
      id: "compute-v",
      title: "Compute Value Matrix (V)",
      explanation:
        `V = X × W_V. Each token's embedding is projected into "value" space. ` +
        `The value represents "what information does this token provide?" ` +
        `Shape: [${seqLen}, ${d}] × [${d}, ${d_k}] = [${seqLen}, ${d_k}].`,
      state: { tokens, V, W_V, phase: "projection" },
      visualActions: [
        { type: "showProjectionMatrix", projectionType: "V", matrix: V },
        { type: "showMessage", text: `V = X × W_V → shape [${seqLen}, ${d_k}]`, messageType: "info" },
      ],
      codeHighlight: { language: "pseudocode", lines: [4] },
      phase: "projection",
    });

    // Step 4: Raw Scores = Q × K^T
    const K_T = transpose(K);
    const rawScores = matMul(Q, K_T);
    yield step({
      id: "compute-scores",
      title: "Compute Attention Scores (Q × Kᵀ)",
      explanation:
        `Multiply Q by the transpose of K to get raw attention scores. ` +
        `scores[i][j] = dot(Q[i], K[j]) measures how much token i's ` +
        `query matches token j's key. Shape: [${seqLen}, ${d_k}] × [${d_k}, ${seqLen}] = [${seqLen}, ${seqLen}].`,
      state: { tokens, rawScores, phase: "scores" },
      visualActions: [
        { type: "showAttentionScores", scores: rawScores },
        { type: "showMessage", text: "Raw scores = Q × Kᵀ (before scaling)", messageType: "info" },
      ],
      codeHighlight: { language: "pseudocode", lines: [5] },
      phase: "scores",
    });

    // Step 5: Scale by 1/√d_k
    // CRITICAL: The scaling factor is sqrt(d_k), NOT sqrt(d_model).
    const scaleFactor = Math.sqrt(d_k);
    const scaledScores = scaleMatrix(rawScores, 1 / scaleFactor);
    yield step({
      id: "scale-scores",
      title: `Scale by 1/√d_k = 1/√${d_k} ≈ ${(1 / scaleFactor).toFixed(4)}`,
      explanation:
        `Divide all scores by √d_k = √${d_k} ≈ ${scaleFactor.toFixed(4)}. ` +
        `Without scaling, large dot products would push softmax into regions with ` +
        `extremely small gradients, making training difficult. ` +
        `This is the "scaled" in "Scaled Dot-Product Attention."`,
      state: { tokens, scaledScores, scaleFactor, phase: "scaling" },
      visualActions: [
        { type: "showAttentionScores", scores: scaledScores },
        { type: "showMessage", text: `Scaled scores = scores / √${d_k}`, messageType: "info" },
      ],
      codeHighlight: { language: "pseudocode", lines: [6] },
      phase: "scaling",
    });

    // Step 6: Apply Softmax (Row-wise)
    const attentionWeights = softmaxRows(scaledScores);
    yield step({
      id: "apply-softmax",
      title: "Apply Softmax (Row-wise)",
      explanation:
        `Apply softmax to each row independently. This converts raw scores into ` +
        `a probability distribution: each row sums to exactly 1.0. ` +
        `Higher values mean the query token pays more attention to that key token. ` +
        `Uses numerically stable softmax: subtract the row maximum before exponentiating.`,
      state: { tokens, attentionWeights, phase: "softmax" },
      visualActions: [
        { type: "showFullAttentionMatrix", weights: attentionWeights },
      ],
      codeHighlight: { language: "pseudocode", lines: [7] },
      phase: "softmax",
    });

    // Steps 7..N: Per-query attention
    const output: number[][] = [];
    for (let q = 0; q < seqLen; q++) {
      const weights_q = attentionWeights[q]!;
      const contextVector = new Array<number>(d_k).fill(0);
      for (let j = 0; j < seqLen; j++) {
        for (let dim = 0; dim < d_k; dim++) {
          contextVector[dim]! += weights_q[j]! * V[j]![dim]!;
        }
      }
      output.push(contextVector);

      let maxWeight = 0;
      let maxKey = 0;
      for (let j = 0; j < seqLen; j++) {
        if (weights_q[j]! > maxWeight) {
          maxWeight = weights_q[j]!;
          maxKey = j;
        }
      }

      yield step({
        id: "per-query-attention",
        title: `"${tokens[q]}" Attends To...`,
        explanation:
          `Token "${tokens[q]}" (query ${q}) pays most attention to "${tokens[maxKey]}" ` +
          `(weight: ${maxWeight.toFixed(4)}). The output for this token is a ` +
          `weighted average of all value vectors: ` +
          `output[${q}] = ${weights_q.map((w, j) => `${w.toFixed(2)}×V[${j}]`).join(" + ")}.`,
        state: {
          tokens,
          attentionWeights,
          currentQuery: q,
          queryWeights: weights_q,
          contextVector,
          maxAttendedToken: maxKey,
          maxWeight,
          phase: "output",
        },
        visualActions: [
          { type: "showFullAttentionMatrix", weights: attentionWeights },
          { type: "showAttentionWeights", queryIdx: q, weights: weights_q },
          { type: "showWeightedValues", queryIdx: q, contextVector },
        ],
        codeHighlight: { language: "pseudocode", lines: [8, 9] },
        phase: "output",
      });
    }

    // Final Step
    yield step({
      id: "complete",
      title: "Self-Attention Complete",
      explanation:
        `Self-attention is complete. Each of the ${seqLen} tokens now has a new ` +
        `representation that incorporates context from all other tokens in the sequence. ` +
        `The output matrix has shape [${seqLen}, ${d_k}], same as the input.`,
      state: {
        tokens,
        attentionWeights,
        output,
        phase: "complete",
      },
      visualActions: [
        { type: "showFullAttentionMatrix", weights: attentionWeights },
      ],
      codeHighlight: { language: "pseudocode", lines: [10] },
      isTerminal: true,
      phase: "result",
    });
  },
});
