"""
Multi-Head Attention — Step Generator (Python mirror of generator.ts).

Splits attention across multiple heads, each attending to different
representation subspaces. Results are concatenated and projected.

INVARIANTS:
  - d_model must be evenly divisible by numHeads
  - d_k = d_model / numHeads (NOT d_model)
  - Each head's attention weights sum to 1.0 per row
  - Concatenated output has shape [seqLen, d_model]

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
    """Generate multi-head attention visualization steps."""
    tokens: list[str] = inputs["tokens"]
    d: int = inputs["embeddingDim"]
    num_heads: int = inputs["numHeads"]
    seq_len = len(tokens)

    # PRECONDITION: d_model must be evenly divisible by numHeads
    if d % num_heads != 0:
        raise ValueError(
            f"d_model ({d}) must be divisible by numHeads ({num_heads}). "
            f"Got d_model % numHeads = {d % num_heads}."
        )
    d_k = d // num_heads  # CRITICAL: d_k = d_model / numHeads

    x = generate_embeddings(tokens, d)

    steps: list[Step] = []
    idx = 0

    # Step 0: Show input
    steps.append(
        Step(
            index=idx,
            id="show-input",
            title="Input Embeddings",
            explanation=(
                f"Starting with {seq_len} tokens, each as a {d}-dimensional embedding. "
                f"These will be processed by {num_heads} attention heads, each with d_k = {d_k}."
            ),
            state={"tokens": tokens, "embeddingDim": d, "numHeads": num_heads, "d_k": d_k, "X": x},
            visual_actions=tuple(
                VisualAction(type="showEmbedding", params={"tokenIndex": i, "values": x[i]})
                for i in range(seq_len)
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=(1,)),
            is_terminal=False,
            phase="initialization",
        )
    )
    idx += 1

    # Step 1: Explain head splitting
    steps.append(
        Step(
            index=idx,
            id="explain-heads",
            title=f"Splitting Into {num_heads} Heads",
            explanation=(
                f"Multi-head attention splits the {d}-dimensional space into {num_heads} heads. "
                f"Each head operates on d_k = {d}/{num_heads} = {d_k} dimensions. "
                f"This allows the model to attend to information from different representation subspaces."
            ),
            state={"tokens": tokens, "embeddingDim": d, "numHeads": num_heads, "d_k": d_k},
            visual_actions=(
                VisualAction(
                    type="showMessage",
                    params={
                        "text": f"{num_heads} heads \u00d7 {d_k} dims = {d} total dims",
                        "messageType": "info",
                    },
                ),
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=(2,)),
            is_terminal=False,
            phase="initialization",
        )
    )
    idx += 1

    # Per-head attention
    head_outputs: list[list[list[float]]] = []

    for h in range(num_heads):
        # Generate head-specific weight matrices
        w_q_h = generate_weight_matrix(f"W_Q_head{h}", d, d_k)
        w_k_h = generate_weight_matrix(f"W_K_head{h}", d, d_k)
        w_v_h = generate_weight_matrix(f"W_V_head{h}", d, d_k)

        q_h = mat_mul(x, w_q_h)
        k_h = mat_mul(x, w_k_h)
        v_h = mat_mul(x, w_v_h)

        steps.append(
            Step(
                index=idx,
                id=f"head-{h}-projections",
                title=f"Head {h + 1}: Q, K, V Projections",
                explanation=(
                    f"Head {h + 1} computes its own Q, K, V matrices using head-specific weights. "
                    f"Each has shape [{seq_len}, {d_k}]."
                ),
                state={
                    "tokens": tokens,
                    "activeHead": h,
                    "totalHeads": num_heads,
                    "Q": q_h,
                    "K": k_h,
                    "V": v_h,
                },
                visual_actions=(
                    VisualAction(
                        type="activateHead", params={"headIndex": h, "totalHeads": num_heads}
                    ),
                    VisualAction(
                        type="showMessage",
                        params={
                            "text": f"Head {h + 1}: Q, K, V with d_k = {d_k}",
                            "messageType": "info",
                        },
                    ),
                ),
                code_highlight=CodeHighlight(language="pseudocode", lines=(3, 4)),
                is_terminal=False,
                phase=f"head-{h}",
            )
        )
        idx += 1

        # Compute attention scores for this head
        k_h_t = transpose(k_h)
        raw_scores = mat_mul(q_h, k_h_t)
        # CRITICAL: Scale by sqrt(d_k), NOT sqrt(d_model)
        scale_factor = math.sqrt(d_k)
        scaled_scores = scale_matrix(raw_scores, 1.0 / scale_factor)

        steps.append(
            Step(
                index=idx,
                id=f"head-{h}-scores",
                title=f"Head {h + 1}: Attention Scores",
                explanation=(
                    f"Computing attention scores for head {h + 1}: Q_{h + 1} \u00d7 K_{h + 1}\u1d40 / \u221a{d_k}. "
                    f"Note: scaling by \u221ad_k = \u221a{d_k}, not \u221ad_model = \u221a{d}."
                ),
                state={
                    "tokens": tokens,
                    "activeHead": h,
                    "totalHeads": num_heads,
                    "scaledScores": scaled_scores,
                },
                visual_actions=(
                    VisualAction(
                        type="activateHead", params={"headIndex": h, "totalHeads": num_heads}
                    ),
                    VisualAction(type="showAttentionScores", params={"scores": scaled_scores}),
                ),
                code_highlight=CodeHighlight(language="pseudocode", lines=(5,)),
                is_terminal=False,
                phase=f"head-{h}",
            )
        )
        idx += 1

        # Softmax
        weights_h = softmax_rows(scaled_scores)

        steps.append(
            Step(
                index=idx,
                id=f"head-{h}-softmax",
                title=f"Head {h + 1}: Attention Weights",
                explanation=f"Applying softmax to head {h + 1}'s scores. Each row sums to 1.0.",
                state={
                    "tokens": tokens,
                    "activeHead": h,
                    "totalHeads": num_heads,
                    "attentionWeights": weights_h,
                },
                visual_actions=(
                    VisualAction(
                        type="activateHead", params={"headIndex": h, "totalHeads": num_heads}
                    ),
                    VisualAction(type="showFullAttentionMatrix", params={"weights": weights_h}),
                ),
                code_highlight=CodeHighlight(language="pseudocode", lines=(6,)),
                is_terminal=False,
                phase=f"head-{h}",
            )
        )
        idx += 1

        # Weighted values
        head_output = mat_mul(weights_h, v_h)  # [seqLen, d_k]
        head_outputs.append(head_output)

        steps.append(
            Step(
                index=idx,
                id=f"head-{h}-output",
                title=f"Head {h + 1}: Weighted Output",
                explanation=f"Head {h + 1} output = weights \u00d7 V. Shape: [{seq_len}, {d_k}].",
                state={
                    "tokens": tokens,
                    "activeHead": h,
                    "totalHeads": num_heads,
                    "headOutput": head_output,
                },
                visual_actions=(
                    VisualAction(
                        type="activateHead", params={"headIndex": h, "totalHeads": num_heads}
                    ),
                    VisualAction(type="showFullAttentionMatrix", params={"weights": weights_h}),
                ),
                code_highlight=CodeHighlight(language="pseudocode", lines=(7,)),
                is_terminal=False,
                phase=f"head-{h}",
            )
        )
        idx += 1

    # Concatenate all head outputs
    concat: list[list[float]] = []
    for i in range(seq_len):
        row: list[float] = []
        for h in range(num_heads):
            row.extend(head_outputs[h][i])
        concat.append(row)

    steps.append(
        Step(
            index=idx,
            id="concatenate",
            title="Concatenate All Heads",
            explanation=(
                f"Concatenating outputs from all {num_heads} heads. "
                f"Each token's representations from all heads are joined: "
                f"shape [{seq_len}, {num_heads} \u00d7 {d_k}] = [{seq_len}, {d}]."
            ),
            state={"tokens": tokens, "concat": concat, "numHeads": num_heads},
            visual_actions=(
                VisualAction(type="showConcatenatedHeads", params={"matrix": concat}),
                VisualAction(
                    type="showMessage",
                    params={
                        "text": f"Concatenated: [{seq_len}, {d}]",
                        "messageType": "info",
                    },
                ),
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=(8,)),
            is_terminal=False,
            phase="concatenation",
        )
    )
    idx += 1

    # Final projection: output = concat x W_O
    w_o = generate_weight_matrix("W_O", d, d)
    final_output = mat_mul(concat, w_o)

    steps.append(
        Step(
            index=idx,
            id="final-projection",
            title="Final Linear Projection (W_O)",
            explanation=(
                f"Applying the final projection: output = concat \u00d7 W_O. "
                f"This mixes information across heads. Shape: [{seq_len}, {d}] \u00d7 [{d}, {d}] = [{seq_len}, {d}]."
            ),
            state={"tokens": tokens, "finalOutput": final_output},
            visual_actions=(
                VisualAction(
                    type="showMessage",
                    params={
                        "text": f"Output = Concat \u00d7 W_O \u2192 [{seq_len}, {d}]",
                        "messageType": "info",
                    },
                ),
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=(9,)),
            is_terminal=False,
            phase="projection",
        )
    )
    idx += 1

    # Complete
    steps.append(
        Step(
            index=idx,
            id="complete",
            title="Multi-Head Attention Complete",
            explanation=(
                f"Multi-head attention with {num_heads} heads is complete. "
                f"The output has shape [{seq_len}, {d}], same as the input. "
                f"Each token's representation now incorporates information from multiple attention perspectives."
            ),
            state={"tokens": tokens, "finalOutput": final_output, "numHeads": num_heads},
            visual_actions=(
                VisualAction(
                    type="showMessage",
                    params={
                        "text": "Multi-Head Attention complete",
                        "messageType": "success",
                    },
                ),
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=(10,)),
            is_terminal=True,
            phase="result",
        )
    )

    return steps
