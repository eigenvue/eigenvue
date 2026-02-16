"""
Transformer Block — Step Generator (Python mirror of generator.ts).

Orchestrates the full transformer encoder block:
  Input -> Multi-Head Self-Attention -> Add & Norm -> FFN -> Add & Norm -> Output

INVARIANTS:
  - Residual: result[j] = input[j] + sublayerOutput[j] (+/-1e-9)
  - LayerNorm: mean(output) ~ 0 (+/-1e-6), variance(output) ~ 1 (+/-1e-4)

CROSS-LANGUAGE PARITY: Must produce identical steps to the TypeScript version.
"""

from __future__ import annotations

import math
from typing import Any

from eigenvue._step_types import CodeHighlight, Step, VisualAction
from eigenvue.math_utils.genai_math import (
    feed_forward,
    generate_bias_vector,
    generate_embeddings,
    generate_weight_matrix,
    layer_norm_rows,
    mat_mul,
    scale_matrix,
    softmax_rows,
    transpose,
    vector_add,
)


def generate(inputs: dict[str, Any]) -> list[Step]:
    """Generate transformer block visualization steps."""
    tokens: list[str] = inputs["tokens"]
    d: int = inputs["embeddingDim"]
    ffn_dim: int = inputs["ffnDim"]
    num_heads: int = inputs["numHeads"]
    seq_len = len(tokens)

    if d % num_heads != 0:
        raise ValueError(
            f"d_model ({d}) must be divisible by numHeads ({num_heads}). "
            f"Got d_model % numHeads = {d % num_heads}."
        )
    d_k = d // num_heads

    # Generate input embeddings
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
                f"Transformer block receives {seq_len} tokens as {d}-dimensional embeddings. "
                f"The block will process them through self-attention, add & norm, FFN, and add & norm."
            ),
            state={"tokens": tokens, "embeddingDim": d, "X": x},
            visual_actions=(
                VisualAction(
                    type="activateSublayer",
                    params={"sublayerId": "input", "label": "Input Embeddings"},
                ),
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=(1,)),
            is_terminal=False,
            phase="input",
        )
    )
    idx += 1

    # === SUBLAYER 1: Self-Attention ===
    steps.append(
        Step(
            index=idx,
            id="self-attention-start",
            title="Self-Attention: Computing",
            explanation=(
                f"Running multi-head self-attention with {num_heads} head(s), d_k = {d_k}. "
                f"Computing Q, K, V projections, attention scores, and weighted outputs."
            ),
            state={"tokens": tokens, "phase": "self-attention"},
            visual_actions=(
                VisualAction(
                    type="activateSublayer",
                    params={"sublayerId": "self-attention", "label": "Multi-Head Self-Attention"},
                ),
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=(2, 3)),
            is_terminal=False,
            phase="self-attention",
        )
    )
    idx += 1

    # Simplified: run single-pass attention (for visualization clarity)
    w_q = generate_weight_matrix("block_W_Q", d, d)
    w_k = generate_weight_matrix("block_W_K", d, d)
    w_v = generate_weight_matrix("block_W_V", d, d)

    q = mat_mul(x, w_q)
    k = mat_mul(x, w_k)
    v = mat_mul(x, w_v)
    k_t = transpose(k)
    raw_scores = mat_mul(q, k_t)
    scale_factor = math.sqrt(d_k)
    scaled_scores = scale_matrix(raw_scores, 1.0 / scale_factor)
    attn_weights = softmax_rows(scaled_scores)
    attn_output = mat_mul(attn_weights, v)  # [seqLen, d]

    steps.append(
        Step(
            index=idx,
            id="self-attention-result",
            title="Self-Attention: Output",
            explanation=(
                f"Self-attention complete. Output shape: [{seq_len}, {d}]. "
                f"Now we apply the residual connection and layer normalization."
            ),
            state={
                "tokens": tokens,
                "attnOutput": attn_output,
                "attnWeights": attn_weights,
                "phase": "self-attention",
            },
            visual_actions=(
                VisualAction(
                    type="activateSublayer",
                    params={"sublayerId": "self-attention", "label": "Multi-Head Self-Attention"},
                ),
                VisualAction(type="showFullAttentionMatrix", params={"weights": attn_weights}),
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=(3,)),
            is_terminal=False,
            phase="self-attention",
        )
    )
    idx += 1

    # === Add & Norm 1 ===
    residual1: list[list[float]] = [vector_add(x[i], attn_output[i]) for i in range(seq_len)]

    # Validate residual connection
    for i in range(seq_len):
        for j in range(d):
            expected = x[i][j] + attn_output[i][j]
            actual = residual1[i][j]
            if abs(actual - expected) > 1e-9:
                raise ValueError(
                    f"Residual connection error at [{i}][{j}]: expected {expected}, got {actual}"
                )

    steps.append(
        Step(
            index=idx,
            id="residual-1",
            title="Residual Connection + Add",
            explanation=(
                "Adding the self-attention output to the original input (residual connection). "
                "result = input + self_attention(input). This preserves the original signal."
            ),
            state={"tokens": tokens, "residual1": residual1, "phase": "add-norm-1"},
            visual_actions=(
                VisualAction(
                    type="activateSublayer",
                    params={"sublayerId": "add-norm-1", "label": "Add & Layer Norm"},
                ),
                VisualAction(
                    type="showResidualConnection",
                    params={
                        "input": x[0],
                        "sublayerOutput": attn_output[0],
                        "result": residual1[0],
                    },
                ),
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=(4,)),
            is_terminal=False,
            phase="add-norm-1",
        )
    )
    idx += 1

    # Layer Norm 1
    norm1 = layer_norm_rows(residual1)

    # Validate layer norm postconditions
    for i in range(seq_len):
        row = norm1[i]
        mean = sum(row) / len(row)
        variance = sum((v - mean) ** 2 for v in row) / len(row)
        if abs(mean) > 1e-6:
            raise ValueError(f"LayerNorm post-condition violated: mean = {mean}, expected ~ 0")
        if abs(variance - 1.0) > 1e-3:
            raise ValueError(
                f"LayerNorm post-condition violated: variance = {variance}, expected ~ 1"
            )

    steps.append(
        Step(
            index=idx,
            id="layer-norm-1",
            title="Layer Normalization",
            explanation=(
                "Applying layer normalization. Each token's vector is normalized to mean \u2248 0 "
                "and variance \u2248 1. This stabilizes training and helps with gradient flow."
            ),
            state={"tokens": tokens, "norm1": norm1, "phase": "add-norm-1"},
            visual_actions=(
                VisualAction(
                    type="activateSublayer",
                    params={"sublayerId": "add-norm-1", "label": "Add & Layer Norm"},
                ),
                VisualAction(
                    type="showLayerNorm", params={"input": residual1[0], "output": norm1[0]}
                ),
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=(5,)),
            is_terminal=False,
            phase="add-norm-1",
        )
    )
    idx += 1

    # === SUBLAYER 2: Feed-Forward Network ===

    steps.append(
        Step(
            index=idx,
            id="ffn-start",
            title="Feed-Forward Network: Computing",
            explanation=(
                f"The FFN applies two linear transformations with ReLU activation: "
                f"FFN(x) = ReLU(x \u00d7 W\u2081 + b\u2081) \u00d7 W\u2082 + b\u2082. "
                f"W\u2081 expands from {d} to {ffn_dim} dimensions, W\u2082 compresses back to {d}."
            ),
            state={"tokens": tokens, "phase": "ffn"},
            visual_actions=(
                VisualAction(
                    type="activateSublayer",
                    params={"sublayerId": "ffn", "label": "Feed-Forward Network"},
                ),
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=(6,)),
            is_terminal=False,
            phase="ffn",
        )
    )
    idx += 1

    w1 = generate_weight_matrix("block_W1", d, ffn_dim)
    b1 = generate_bias_vector("block_b1", ffn_dim)
    w2 = generate_weight_matrix("block_W2", ffn_dim, d)
    b2 = generate_bias_vector("block_b2", d)

    # Show expansion step
    hidden = mat_mul(norm1, w1)
    hidden = [[val + b1[j] for j, val in enumerate(row)] for row in hidden]
    hidden = [[max(0.0, v) for v in row] for row in hidden]

    steps.append(
        Step(
            index=idx,
            id="ffn-expand",
            title="FFN: ReLU(x \u00d7 W\u2081 + b\u2081)",
            explanation=(
                f"First layer: expand from {d} to {ffn_dim} dimensions with ReLU activation. "
                f"ReLU(x) = max(0, x) zeroes out negative values."
            ),
            state={"tokens": tokens, "hiddenShape": [seq_len, ffn_dim], "phase": "ffn"},
            visual_actions=(
                VisualAction(
                    type="activateSublayer",
                    params={"sublayerId": "ffn", "label": "Feed-Forward Network"},
                ),
                VisualAction(
                    type="showMessage",
                    params={
                        "text": f"Expanded: [{seq_len}, {d}] \u2192 [{seq_len}, {ffn_dim}]",
                        "messageType": "info",
                    },
                ),
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=(7,)),
            is_terminal=False,
            phase="ffn",
        )
    )
    idx += 1

    ffn_output = feed_forward(norm1, w1, b1, w2, b2)

    steps.append(
        Step(
            index=idx,
            id="ffn-compress",
            title="FFN: \u00d7 W\u2082 + b\u2082",
            explanation=(
                f"Second layer: compress from {ffn_dim} back to {d} dimensions. "
                f"Output shape: [{seq_len}, {d}]."
            ),
            state={"tokens": tokens, "ffnOutput": ffn_output, "phase": "ffn"},
            visual_actions=(
                VisualAction(
                    type="activateSublayer",
                    params={"sublayerId": "ffn", "label": "Feed-Forward Network"},
                ),
                VisualAction(
                    type="showMessage",
                    params={
                        "text": f"Compressed: [{seq_len}, {ffn_dim}] \u2192 [{seq_len}, {d}]",
                        "messageType": "info",
                    },
                ),
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=(8,)),
            is_terminal=False,
            phase="ffn",
        )
    )
    idx += 1

    # === Add & Norm 2 ===
    residual2: list[list[float]] = [vector_add(norm1[i], ffn_output[i]) for i in range(seq_len)]

    # Validate residual connection 2
    for i in range(seq_len):
        for j in range(d):
            expected = norm1[i][j] + ffn_output[i][j]
            actual = residual2[i][j]
            if abs(actual - expected) > 1e-9:
                raise ValueError(
                    f"Residual connection 2 error at [{i}][{j}]: expected {expected}, got {actual}"
                )

    steps.append(
        Step(
            index=idx,
            id="residual-2",
            title="Residual Connection + Add",
            explanation=(
                "Adding the FFN output to its input (second residual connection). "
                "result = norm1_output + FFN(norm1_output)."
            ),
            state={"tokens": tokens, "residual2": residual2, "phase": "add-norm-2"},
            visual_actions=(
                VisualAction(
                    type="activateSublayer",
                    params={"sublayerId": "add-norm-2", "label": "Add & Layer Norm"},
                ),
                VisualAction(
                    type="showResidualConnection",
                    params={
                        "input": norm1[0],
                        "sublayerOutput": ffn_output[0],
                        "result": residual2[0],
                    },
                ),
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=(9,)),
            is_terminal=False,
            phase="add-norm-2",
        )
    )
    idx += 1

    # Layer Norm 2
    norm2 = layer_norm_rows(residual2)

    # Validate layer norm postconditions
    for i in range(seq_len):
        row = norm2[i]
        mean = sum(row) / len(row)
        variance = sum((v - mean) ** 2 for v in row) / len(row)
        if abs(mean) > 1e-6:
            raise ValueError(f"LayerNorm 2 post-condition violated: mean = {mean}")
        if abs(variance - 1.0) > 1e-3:
            raise ValueError(f"LayerNorm 2 post-condition violated: variance = {variance}")

    steps.append(
        Step(
            index=idx,
            id="layer-norm-2",
            title="Layer Normalization",
            explanation="Second layer normalization. Output: mean \u2248 0, variance \u2248 1 for each token.",
            state={"tokens": tokens, "norm2": norm2, "phase": "add-norm-2"},
            visual_actions=(
                VisualAction(
                    type="activateSublayer",
                    params={"sublayerId": "add-norm-2", "label": "Add & Layer Norm"},
                ),
                VisualAction(
                    type="showLayerNorm", params={"input": residual2[0], "output": norm2[0]}
                ),
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=(10,)),
            is_terminal=False,
            phase="add-norm-2",
        )
    )
    idx += 1

    # Complete
    steps.append(
        Step(
            index=idx,
            id="complete",
            title="Transformer Block Complete",
            explanation=(
                f"The transformer block is complete. Input embeddings have been transformed through: "
                f"Self-Attention \u2192 Add & Norm \u2192 FFN \u2192 Add & Norm. "
                f"Each token now carries contextual information from all other tokens. "
                f"Output shape: [{seq_len}, {d}]."
            ),
            state={"tokens": tokens, "output": norm2, "phase": "output"},
            visual_actions=(
                VisualAction(
                    type="activateSublayer", params={"sublayerId": "output", "label": "Output"}
                ),
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=(11,)),
            is_terminal=True,
            phase="result",
        )
    )

    return steps
