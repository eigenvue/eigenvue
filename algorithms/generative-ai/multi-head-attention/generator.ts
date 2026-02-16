/**
 * @fileoverview Multi-Head Attention Step Generator
 *
 * Splits attention across multiple heads, each attending to different
 * representation subspaces. Results are concatenated and projected.
 *
 * Mathematical basis: Section 4.5 of Phase 8 specification.
 *
 * INVARIANTS:
 *   - d_model must be evenly divisible by numHeads
 *   - d_k = d_model / numHeads (NOT d_model)
 *   - Each head's attention weights sum to 1.0 per row
 *   - Concatenated output has shape [seqLen, d_model]
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

interface MultiHeadAttentionInputs extends Record<string, unknown> {
  tokens: string[];
  embeddingDim: number;
  numHeads: number;
}

export default createGenerator<MultiHeadAttentionInputs>({
  id: "multi-head-attention",

  *generate(inputs, step) {
    const { tokens, embeddingDim: d, numHeads } = inputs;
    const seqLen = tokens.length;

    // PRECONDITION: d_model must be evenly divisible by numHeads
    if (d % numHeads !== 0) {
      throw new Error(
        `d_model (${d}) must be divisible by numHeads (${numHeads}). ` +
        `Got d_model % numHeads = ${d % numHeads}.`
      );
    }
    const d_k = d / numHeads; // CRITICAL: d_k = d_model / numHeads

    const X = generateEmbeddings(tokens, d);

    // Step 0: Show input
    yield step({
      id: "show-input",
      title: "Input Embeddings",
      explanation:
        `Starting with ${seqLen} tokens, each as a ${d}-dimensional embedding. ` +
        `These will be processed by ${numHeads} attention heads, each with d_k = ${d_k}.`,
      state: { tokens, embeddingDim: d, numHeads, d_k, X },
      visualActions: tokens.map((_, i) => ({
        type: "showEmbedding" as const,
        tokenIndex: i,
        values: X[i],
      })),
      codeHighlight: { language: "pseudocode", lines: [1] },
      phase: "initialization",
    });

    // Step 1: Explain head splitting
    yield step({
      id: "explain-heads",
      title: `Splitting Into ${numHeads} Heads`,
      explanation:
        `Multi-head attention splits the ${d}-dimensional space into ${numHeads} heads. ` +
        `Each head operates on d_k = ${d}/${numHeads} = ${d_k} dimensions. ` +
        `This allows the model to attend to information from different representation subspaces.`,
      state: { tokens, embeddingDim: d, numHeads, d_k },
      visualActions: [
        { type: "showMessage", text: `${numHeads} heads × ${d_k} dims = ${d} total dims`, messageType: "info" },
      ],
      codeHighlight: { language: "pseudocode", lines: [2] },
      phase: "initialization",
    });

    // Per-head attention
    const headOutputs: number[][][] = [];

    for (let h = 0; h < numHeads; h++) {
      // Generate head-specific weight matrices
      const W_Q_h = generateWeightMatrix(`W_Q_head${h}`, d, d_k);
      const W_K_h = generateWeightMatrix(`W_K_head${h}`, d, d_k);
      const W_V_h = generateWeightMatrix(`W_V_head${h}`, d, d_k);

      const Q_h = matMul(X, W_Q_h);
      const K_h = matMul(X, W_K_h);
      const V_h = matMul(X, W_V_h);

      yield step({
        id: `head-${h}-projections`,
        title: `Head ${h + 1}: Q, K, V Projections`,
        explanation:
          `Head ${h + 1} computes its own Q, K, V matrices using head-specific weights. ` +
          `Each has shape [${seqLen}, ${d_k}].`,
        state: { tokens, activeHead: h, totalHeads: numHeads, Q: Q_h, K: K_h, V: V_h },
        visualActions: [
          { type: "activateHead", headIndex: h, totalHeads: numHeads },
          { type: "showMessage", text: `Head ${h + 1}: Q, K, V with d_k = ${d_k}`, messageType: "info" },
        ],
        codeHighlight: { language: "pseudocode", lines: [3, 4] },
        phase: `head-${h}`,
      });

      // Compute attention scores for this head
      const K_h_T = transpose(K_h);
      const rawScores = matMul(Q_h, K_h_T);
      // CRITICAL: Scale by sqrt(d_k), NOT sqrt(d_model)
      const scaleFactor = Math.sqrt(d_k);
      const scaledScores = scaleMatrix(rawScores, 1 / scaleFactor);

      yield step({
        id: `head-${h}-scores`,
        title: `Head ${h + 1}: Attention Scores`,
        explanation:
          `Computing attention scores for head ${h + 1}: Q_${h + 1} × K_${h + 1}ᵀ / √${d_k}. ` +
          `Note: scaling by √d_k = √${d_k}, not √d_model = √${d}.`,
        state: { tokens, activeHead: h, totalHeads: numHeads, scaledScores },
        visualActions: [
          { type: "activateHead", headIndex: h, totalHeads: numHeads },
          { type: "showAttentionScores", scores: scaledScores },
        ],
        codeHighlight: { language: "pseudocode", lines: [5] },
        phase: `head-${h}`,
      });

      // Softmax
      const weights_h = softmaxRows(scaledScores);

      yield step({
        id: `head-${h}-softmax`,
        title: `Head ${h + 1}: Attention Weights`,
        explanation:
          `Applying softmax to head ${h + 1}'s scores. Each row sums to 1.0.`,
        state: { tokens, activeHead: h, totalHeads: numHeads, attentionWeights: weights_h },
        visualActions: [
          { type: "activateHead", headIndex: h, totalHeads: numHeads },
          { type: "showFullAttentionMatrix", weights: weights_h },
        ],
        codeHighlight: { language: "pseudocode", lines: [6] },
        phase: `head-${h}`,
      });

      // Weighted values
      const headOutput = matMul(weights_h, V_h); // [seqLen, d_k]
      headOutputs.push(headOutput);

      yield step({
        id: `head-${h}-output`,
        title: `Head ${h + 1}: Weighted Output`,
        explanation:
          `Head ${h + 1} output = weights × V. Shape: [${seqLen}, ${d_k}].`,
        state: { tokens, activeHead: h, totalHeads: numHeads, headOutput },
        visualActions: [
          { type: "activateHead", headIndex: h, totalHeads: numHeads },
          { type: "showFullAttentionMatrix", weights: weights_h },
        ],
        codeHighlight: { language: "pseudocode", lines: [7] },
        phase: `head-${h}`,
      });
    }

    // Concatenate all head outputs
    // concat[i] = [head_0[i] ; head_1[i] ; ... ; head_{h-1}[i]]
    const concat: number[][] = Array.from({ length: seqLen }, (_, i) => {
      const row: number[] = [];
      for (let h = 0; h < numHeads; h++) {
        row.push(...headOutputs[h]![i]!);
      }
      return row;
    });

    yield step({
      id: "concatenate",
      title: "Concatenate All Heads",
      explanation:
        `Concatenating outputs from all ${numHeads} heads. ` +
        `Each token's representations from all heads are joined: ` +
        `shape [${seqLen}, ${numHeads} × ${d_k}] = [${seqLen}, ${d}].`,
      state: { tokens, concat, numHeads },
      visualActions: [
        { type: "showConcatenatedHeads", matrix: concat },
        { type: "showMessage", text: `Concatenated: [${seqLen}, ${d}]`, messageType: "info" },
      ],
      codeHighlight: { language: "pseudocode", lines: [8] },
      phase: "concatenation",
    });

    // Final projection: output = concat × W_O
    const W_O = generateWeightMatrix("W_O", d, d);
    const finalOutput = matMul(concat, W_O);

    yield step({
      id: "final-projection",
      title: "Final Linear Projection (W_O)",
      explanation:
        `Applying the final projection: output = concat × W_O. ` +
        `This mixes information across heads. Shape: [${seqLen}, ${d}] × [${d}, ${d}] = [${seqLen}, ${d}].`,
      state: { tokens, finalOutput },
      visualActions: [
        { type: "showMessage", text: `Output = Concat × W_O → [${seqLen}, ${d}]`, messageType: "info" },
      ],
      codeHighlight: { language: "pseudocode", lines: [9] },
      phase: "projection",
    });

    // Complete
    yield step({
      id: "complete",
      title: "Multi-Head Attention Complete",
      explanation:
        `Multi-head attention with ${numHeads} heads is complete. ` +
        `The output has shape [${seqLen}, ${d}], same as the input. ` +
        `Each token's representation now incorporates information from multiple attention perspectives.`,
      state: { tokens, finalOutput, numHeads },
      visualActions: [
        { type: "showMessage", text: "Multi-Head Attention complete", messageType: "success" },
      ],
      codeHighlight: { language: "pseudocode", lines: [10] },
      isTerminal: true,
      phase: "result",
    });
  },
});
