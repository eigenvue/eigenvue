/**
 * @fileoverview Token Embedding Step Generator
 *
 * Shows how tokens are mapped to numerical vectors via an embedding table.
 * Demonstrates the lookup process and cosine similarity computation.
 *
 * Mathematical basis: Sections 4.9 (cosine similarity) of Phase 8 spec.
 *
 * NOTE: Embedding values are generated deterministically from a seeded PRNG.
 */

import { createGenerator } from "@/engine/generator";
import type { VisualAction } from "@/engine/generator";
import { seedRandom, cosineSimilarity } from "@/engine/utils/genai-math";

interface TokenEmbeddingInputs extends Record<string, unknown> {
  tokens: string[];
  embeddingDim: number;
}

export default createGenerator<TokenEmbeddingInputs>({
  id: "token-embeddings",

  *generate(inputs, step) {
    const { tokens, embeddingDim } = inputs;
    const d = embeddingDim;

    const embeddings: number[][] = tokens.map((token) => {
      const rng = seedRandom(token);
      return Array.from({ length: d }, () => {
        return Math.round(rng() * 2000 - 1000) / 1000;
      });
    });

    // Step 0: Show Token Sequence
    yield step({
      id: "show-tokens",
      title: "Input Token Sequence",
      explanation:
        `We have ${tokens.length} tokens: [${tokens.map((t) => `"${t}"`).join(", ")}]. ` +
        `Each token will be mapped to a ${d}-dimensional embedding vector.`,
      state: { tokens, embeddingDim: d, embeddings: [] },
      visualActions: tokens.map((_, i) => ({
        type: "highlightToken" as const,
        index: i,
      })),
      codeHighlight: { language: "pseudocode", lines: [1, 2] },
      phase: "initialization",
    });

    // Steps 1..N: Lookup each token's embedding
    const displayedEmbeddings: number[][] = [];

    for (let i = 0; i < tokens.length; i++) {
      displayedEmbeddings.push(embeddings[i]!);

      yield step({
        id: "lookup-embedding",
        title: `Embed Token: "${tokens[i]}"`,
        explanation:
          `Looking up the embedding for token "${tokens[i]}" (index ${i}). ` +
          `The embedding table returns a ${d}-dimensional vector: ` +
          `[${embeddings[i]!.map((v) => v.toFixed(3)).join(", ")}].`,
        state: {
          tokens,
          embeddingDim: d,
          currentTokenIndex: i,
          currentToken: tokens[i],
          currentEmbedding: embeddings[i],
          embeddings: displayedEmbeddings.map((e) => [...e]),
        },
        visualActions: [
          { type: "highlightToken", index: i, color: "active" },
          { type: "showEmbedding", tokenIndex: i, values: embeddings[i] },
        ],
        codeHighlight: { language: "pseudocode", lines: [4, 5] },
        phase: "lookup",
      });
    }

    // Similarity Steps
    if (tokens.length >= 2) {
      for (let i = 0; i < tokens.length; i++) {
        for (let j = i + 1; j < tokens.length; j++) {
          const sim = cosineSimilarity(embeddings[i]!, embeddings[j]!);

          yield step({
            id: "cosine-similarity",
            title: `Similarity: "${tokens[i]}" \u2194 "${tokens[j]}"`,
            explanation:
              `Computing cosine similarity between "${tokens[i]}" and "${tokens[j]}": ` +
              `cos(\u03b8) = (A \u00b7 B) / (\u2016A\u2016 \u00d7 \u2016B\u2016) = ${sim.toFixed(4)}. ` +
              (Math.abs(sim) > 0.5
                ? "These embeddings point in a similar direction."
                : "These embeddings point in quite different directions."),
            state: {
              tokens,
              embeddingDim: d,
              embeddings: embeddings.map((e) => [...e]),
              similarityPair: [i, j],
              similarityScore: sim,
            },
            visualActions: [
              { type: "highlightToken", index: i, color: "active" },
              { type: "highlightToken", index: j, color: "active" },
              { type: "showEmbedding", tokenIndex: i, values: embeddings[i] },
              { type: "showEmbedding", tokenIndex: j, values: embeddings[j] },
              { type: "showSimilarity", tokenA: i, tokenB: j, score: sim },
            ],
            codeHighlight: { language: "pseudocode", lines: [7] },
            phase: "similarity",
          });
        }
      }
    }

    // Final Step
    yield step({
      id: "complete",
      title: "Embedding Complete",
      explanation:
        `All ${tokens.length} tokens have been embedded into ${d}-dimensional vectors. ` +
        `These vectors are the input to the self-attention mechanism.`,
      state: {
        tokens,
        embeddingDim: d,
        embeddings: embeddings.map((e) => [...e]),
      },
      visualActions: embeddings.map((emb, i) => ({
        type: "showEmbedding" as const,
        tokenIndex: i,
        values: emb,
      })),
      codeHighlight: { language: "pseudocode", lines: [7] },
      isTerminal: true,
      phase: "result",
    });
  },
});
