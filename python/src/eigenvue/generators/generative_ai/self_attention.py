"""
Self-Attention (Scaled Dot-Product) — Step Generator (Python mirror of generator.ts).

Implements the full scaled dot-product attention mechanism:
  1. Generate input embeddings
  2. Linear projections: X -> Q, K, V
  3. Compute raw scores: Q x K^T
  4. Scale by 1/sqrt(d_k)
  5. Apply softmax (row-wise)
  6. Compute weighted values: weights x V

INVARIANTS enforced and tested:
  - Each row of the attention weight matrix sums to 1.0 (+/-1e-6)
  - All attention weights are non-negative
  - Score scaling uses sqrt(d_k) exactly
  - Matrix multiplication dimensions are verified at each step

CROSS-LANGUAGE PARITY: Must produce identical steps to the TypeScript version.
"""

from __future__ import annotations

import math
from typing import Any

from eigenvue._step_types import CodeHighlight, Step, VisualAction
from eigenvue.math_utils.genai_math import (
    generate_embeddings,
    generate_weight_matrix,
    mat_mul,
    scale_matrix,
    softmax_rows,
    transpose,
)


def generate(inputs: dict[str, Any]) -> list[Step]:
    """Generate self-attention visualization steps."""
    tokens: list[str] = inputs["tokens"]
    d: int = inputs["embeddingDim"]
    seq_len = len(tokens)
    d_k = d  # In single-head attention, d_k = d_model

    # Generate deterministic embeddings and weight matrices
    x = generate_embeddings(tokens, d)
    w_q = generate_weight_matrix("W_Q", d, d_k)
    w_k = generate_weight_matrix("W_K", d, d_k)
    w_v = generate_weight_matrix("W_V", d, d_k)

    steps: list[Step] = []
    idx = 0

    # Step 0: Show Input Embeddings
    steps.append(
        Step(
            index=idx,
            id="show-input",
            title="Input Embeddings",
            explanation=(
                f"Starting with {seq_len} tokens, each represented as a {d}-dimensional "
                f"embedding vector. These embeddings are the input matrix X with shape [{seq_len}, {d}]."
            ),
            state={"tokens": tokens, "embeddingDim": d, "X": x, "phase": "input"},
            visual_actions=tuple(
                VisualAction(type="showEmbedding", params={"tokenIndex": i, "values": x[i]})
                for i in range(seq_len)
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=(1,)),
            is_terminal=False,
            phase="input",
        )
    )
    idx += 1

    # Step 1: Q = X x W_Q
    q = mat_mul(x, w_q)
    steps.append(
        Step(
            index=idx,
            id="compute-q",
            title="Compute Query Matrix (Q)",
            explanation=(
                f'Q = X \u00d7 W_Q. Each token\'s embedding is projected into "query" space. '
                f'The query represents "what is this token looking for?" '
                f"Shape: [{seq_len}, {d}] \u00d7 [{d}, {d_k}] = [{seq_len}, {d_k}]."
            ),
            state={"tokens": tokens, "Q": q, "W_Q": w_q, "phase": "projection"},
            visual_actions=(
                VisualAction(
                    type="showProjectionMatrix", params={"projectionType": "Q", "matrix": q}
                ),
                VisualAction(
                    type="showMessage",
                    params={
                        "text": f"Q = X \u00d7 W_Q \u2192 shape [{seq_len}, {d_k}]",
                        "messageType": "info",
                    },
                ),
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=(2,)),
            is_terminal=False,
            phase="projection",
        )
    )
    idx += 1

    # Step 2: K = X x W_K
    k = mat_mul(x, w_k)
    steps.append(
        Step(
            index=idx,
            id="compute-k",
            title="Compute Key Matrix (K)",
            explanation=(
                f'K = X \u00d7 W_K. Each token\'s embedding is projected into "key" space. '
                f'The key represents "what does this token contain?" '
                f"Shape: [{seq_len}, {d}] \u00d7 [{d}, {d_k}] = [{seq_len}, {d_k}]."
            ),
            state={"tokens": tokens, "K": k, "W_K": w_k, "phase": "projection"},
            visual_actions=(
                VisualAction(
                    type="showProjectionMatrix", params={"projectionType": "K", "matrix": k}
                ),
                VisualAction(
                    type="showMessage",
                    params={
                        "text": f"K = X \u00d7 W_K \u2192 shape [{seq_len}, {d_k}]",
                        "messageType": "info",
                    },
                ),
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=(3,)),
            is_terminal=False,
            phase="projection",
        )
    )
    idx += 1

    # Step 3: V = X x W_V
    v = mat_mul(x, w_v)
    steps.append(
        Step(
            index=idx,
            id="compute-v",
            title="Compute Value Matrix (V)",
            explanation=(
                f'V = X \u00d7 W_V. Each token\'s embedding is projected into "value" space. '
                f'The value represents "what information does this token provide?" '
                f"Shape: [{seq_len}, {d}] \u00d7 [{d}, {d_k}] = [{seq_len}, {d_k}]."
            ),
            state={"tokens": tokens, "V": v, "W_V": w_v, "phase": "projection"},
            visual_actions=(
                VisualAction(
                    type="showProjectionMatrix", params={"projectionType": "V", "matrix": v}
                ),
                VisualAction(
                    type="showMessage",
                    params={
                        "text": f"V = X \u00d7 W_V \u2192 shape [{seq_len}, {d_k}]",
                        "messageType": "info",
                    },
                ),
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=(4,)),
            is_terminal=False,
            phase="projection",
        )
    )
    idx += 1

    # Step 4: Raw Scores = Q x K^T
    k_t = transpose(k)
    raw_scores = mat_mul(q, k_t)
    steps.append(
        Step(
            index=idx,
            id="compute-scores",
            title="Compute Attention Scores (Q \u00d7 K\u1d40)",
            explanation=(
                f"Multiply Q by the transpose of K to get raw attention scores. "
                f"scores[i][j] = dot(Q[i], K[j]) measures how much token i's "
                f"query matches token j's key. Shape: [{seq_len}, {d_k}] \u00d7 [{d_k}, {seq_len}] = [{seq_len}, {seq_len}]."
            ),
            state={"tokens": tokens, "rawScores": raw_scores, "phase": "scores"},
            visual_actions=(
                VisualAction(type="showAttentionScores", params={"scores": raw_scores}),
                VisualAction(
                    type="showMessage",
                    params={
                        "text": "Raw scores = Q \u00d7 K\u1d40 (before scaling)",
                        "messageType": "info",
                    },
                ),
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=(5,)),
            is_terminal=False,
            phase="scores",
        )
    )
    idx += 1

    # Step 5: Scale by 1/sqrt(d_k)
    scale_factor = math.sqrt(d_k)
    scaled_scores = scale_matrix(raw_scores, 1.0 / scale_factor)
    steps.append(
        Step(
            index=idx,
            id="scale-scores",
            title=f"Scale by 1/\u221ad_k = 1/\u221a{d_k} \u2248 {1.0 / scale_factor:.4f}",
            explanation=(
                f"Divide all scores by \u221ad_k = \u221a{d_k} \u2248 {scale_factor:.4f}. "
                f"Without scaling, large dot products would push softmax into regions with "
                f"extremely small gradients, making training difficult. "
                f'This is the "scaled" in "Scaled Dot-Product Attention."'
            ),
            state={
                "tokens": tokens,
                "scaledScores": scaled_scores,
                "scaleFactor": scale_factor,
                "phase": "scaling",
            },
            visual_actions=(
                VisualAction(type="showAttentionScores", params={"scores": scaled_scores}),
                VisualAction(
                    type="showMessage",
                    params={
                        "text": f"Scaled scores = scores / \u221a{d_k}",
                        "messageType": "info",
                    },
                ),
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=(6,)),
            is_terminal=False,
            phase="scaling",
        )
    )
    idx += 1

    # Step 6: Apply Softmax (Row-wise)
    attention_weights = softmax_rows(scaled_scores)
    steps.append(
        Step(
            index=idx,
            id="apply-softmax",
            title="Apply Softmax (Row-wise)",
            explanation=(
                "Apply softmax to each row independently. This converts raw scores into "
                "a probability distribution: each row sums to exactly 1.0. "
                "Higher values mean the query token pays more attention to that key token. "
                "Uses numerically stable softmax: subtract the row maximum before exponentiating."
            ),
            state={"tokens": tokens, "attentionWeights": attention_weights, "phase": "softmax"},
            visual_actions=(
                VisualAction(type="showFullAttentionMatrix", params={"weights": attention_weights}),
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=(7,)),
            is_terminal=False,
            phase="softmax",
        )
    )
    idx += 1

    # Steps 7..N: Per-query attention
    output: list[list[float]] = []
    for qi in range(seq_len):
        weights_q = attention_weights[qi]
        context_vector = [0.0] * d_k
        for j in range(seq_len):
            for dim in range(d_k):
                context_vector[dim] += weights_q[j] * v[j][dim]
        output.append(context_vector)

        max_weight = 0.0
        max_key = 0
        for j in range(seq_len):
            if weights_q[j] > max_weight:
                max_weight = weights_q[j]
                max_key = j

        steps.append(
            Step(
                index=idx,
                id="per-query-attention",
                title=f'"{tokens[qi]}" Attends To...',
                explanation=(
                    f'Token "{tokens[qi]}" (query {qi}) pays most attention to "{tokens[max_key]}" '
                    f"(weight: {max_weight:.4f}). The output for this token is a "
                    f"weighted average of all value vectors: output[{qi}] = "
                    + " + ".join(f"{weights_q[j]:.2f}\u00d7V[{j}]" for j in range(seq_len))
                    + "."
                ),
                state={
                    "tokens": tokens,
                    "attentionWeights": attention_weights,
                    "currentQuery": qi,
                    "queryWeights": weights_q,
                    "contextVector": context_vector,
                    "maxAttendedToken": max_key,
                    "maxWeight": max_weight,
                    "phase": "output",
                },
                visual_actions=(
                    VisualAction(
                        type="showFullAttentionMatrix", params={"weights": attention_weights}
                    ),
                    VisualAction(
                        type="showAttentionWeights", params={"queryIdx": qi, "weights": weights_q}
                    ),
                    VisualAction(
                        type="showWeightedValues",
                        params={"queryIdx": qi, "contextVector": context_vector},
                    ),
                ),
                code_highlight=CodeHighlight(language="pseudocode", lines=(8, 9)),
                is_terminal=False,
                phase="output",
            )
        )
        idx += 1

    # Final Step
    steps.append(
        Step(
            index=idx,
            id="complete",
            title="Self-Attention Complete",
            explanation=(
                f"Self-attention is complete. Each of the {seq_len} tokens now has a new "
                f"representation that incorporates context from all other tokens in the sequence. "
                f"The output matrix has shape [{seq_len}, {d_k}], same as the input."
            ),
            state={
                "tokens": tokens,
                "attentionWeights": attention_weights,
                "output": output,
                "phase": "complete",
            },
            visual_actions=(
                VisualAction(type="showFullAttentionMatrix", params={"weights": attention_weights}),
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=(10,)),
            is_terminal=True,
            phase="result",
        )
    )

    return steps
