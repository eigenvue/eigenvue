"""
Token Embedding — Step Generator (Python mirror of generator.ts).

Shows how tokens are mapped to numerical vectors via an embedding table.
Demonstrates the lookup process and cosine similarity computation.

NOTE: Embedding values are generated deterministically from a seeded PRNG.
CRITICAL: This generator uses seedRandom(token) directly (NOT the
generateEmbeddings helper which prefixes "embedding-").

CROSS-LANGUAGE PARITY: Must produce identical steps to the TypeScript version.
"""

from __future__ import annotations

from typing import Any

from eigenvue._step_types import CodeHighlight, Step, VisualAction
from eigenvue.math_utils.genai_math import cosine_similarity, seed_random


def generate(inputs: dict[str, Any]) -> list[Step]:
    """Generate token embedding visualization steps."""
    tokens: list[str] = inputs["tokens"]
    d: int = inputs["embeddingDim"]

    # Generate embeddings using seedRandom(token) — NOT seedRandom(f"embedding-{token}")
    # This matches the TypeScript generator which uses seedRandom(token) directly
    embeddings: list[list[float]] = []
    for token in tokens:
        rng = seed_random(token)
        embedding = [round(rng() * 2000 - 1000) / 1000 for _ in range(d)]
        embeddings.append(embedding)

    steps: list[Step] = []
    idx = 0

    # Step 0: Show Token Sequence
    steps.append(
        Step(
            index=idx,
            id="show-tokens",
            title="Input Token Sequence",
            explanation=(
                f"We have {len(tokens)} tokens: ["
                + ", ".join(f'"{t}"' for t in tokens)
                + f"]. Each token will be mapped to a {d}-dimensional embedding vector."
            ),
            state={"tokens": tokens, "embeddingDim": d, "embeddings": []},
            visual_actions=tuple(
                VisualAction(type="highlightToken", params={"index": i}) for i in range(len(tokens))
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=(1, 2)),
            is_terminal=False,
            phase="initialization",
        )
    )
    idx += 1

    # Steps 1..N: Lookup each token's embedding
    displayed_embeddings: list[list[float]] = []

    for i in range(len(tokens)):
        displayed_embeddings.append(list(embeddings[i]))

        steps.append(
            Step(
                index=idx,
                id="lookup-embedding",
                title=f'Embed Token: "{tokens[i]}"',
                explanation=(
                    f'Looking up the embedding for token "{tokens[i]}" (index {i}). '
                    f"The embedding table returns a {d}-dimensional vector: "
                    f"[{', '.join(f'{v:.3f}' for v in embeddings[i])}]."
                ),
                state={
                    "tokens": tokens,
                    "embeddingDim": d,
                    "currentTokenIndex": i,
                    "currentToken": tokens[i],
                    "currentEmbedding": embeddings[i],
                    "embeddings": [list(e) for e in displayed_embeddings],
                },
                visual_actions=(
                    VisualAction(type="highlightToken", params={"index": i, "color": "active"}),
                    VisualAction(
                        type="showEmbedding", params={"tokenIndex": i, "values": embeddings[i]}
                    ),
                ),
                code_highlight=CodeHighlight(language="pseudocode", lines=(4, 5)),
                is_terminal=False,
                phase="lookup",
            )
        )
        idx += 1

    # Similarity Steps
    if len(tokens) >= 2:
        for i in range(len(tokens)):
            for j in range(i + 1, len(tokens)):
                sim = cosine_similarity(embeddings[i], embeddings[j])

                steps.append(
                    Step(
                        index=idx,
                        id="cosine-similarity",
                        title=f'Similarity: "{tokens[i]}" \u2194 "{tokens[j]}"',
                        explanation=(
                            f'Computing cosine similarity between "{tokens[i]}" and "{tokens[j]}": '
                            f"cos(\u03b8) = (A \u00b7 B) / (\u2016A\u2016 \u00d7 \u2016B\u2016) = {sim:.4f}. "
                            + (
                                "These embeddings point in a similar direction."
                                if abs(sim) > 0.5
                                else "These embeddings point in quite different directions."
                            )
                        ),
                        state={
                            "tokens": tokens,
                            "embeddingDim": d,
                            "embeddings": [list(e) for e in embeddings],
                            "similarityPair": [i, j],
                            "similarityScore": sim,
                        },
                        visual_actions=(
                            VisualAction(
                                type="highlightToken", params={"index": i, "color": "active"}
                            ),
                            VisualAction(
                                type="highlightToken", params={"index": j, "color": "active"}
                            ),
                            VisualAction(
                                type="showEmbedding",
                                params={"tokenIndex": i, "values": embeddings[i]},
                            ),
                            VisualAction(
                                type="showEmbedding",
                                params={"tokenIndex": j, "values": embeddings[j]},
                            ),
                            VisualAction(
                                type="showSimilarity",
                                params={"tokenA": i, "tokenB": j, "score": sim},
                            ),
                        ),
                        code_highlight=CodeHighlight(language="pseudocode", lines=(7,)),
                        is_terminal=False,
                        phase="similarity",
                    )
                )
                idx += 1

    # Final Step
    steps.append(
        Step(
            index=idx,
            id="complete",
            title="Embedding Complete",
            explanation=(
                f"All {len(tokens)} tokens have been embedded into {d}-dimensional vectors. "
                f"These vectors are the input to the self-attention mechanism."
            ),
            state={
                "tokens": tokens,
                "embeddingDim": d,
                "embeddings": [list(e) for e in embeddings],
            },
            visual_actions=tuple(
                VisualAction(
                    type="showEmbedding", params={"tokenIndex": i, "values": embeddings[i]}
                )
                for i in range(len(embeddings))
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=(7,)),
            is_terminal=True,
            phase="result",
        )
    )

    return steps
