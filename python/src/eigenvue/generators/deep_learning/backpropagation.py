"""
Backpropagation — Step Generator (Python mirror of generator.ts).

Demonstrates a complete training step: forward pass -> loss -> backward pass
-> weight update. This is the algorithm that makes neural networks learn.

CRITICAL INVARIANTS (tested via numerical gradient checking):
  1. d^(N)_j = (2/k)(a^(N)_j - y_j) * f'(z^(N)_j)     [MSE + any activation]
     OR d^(N)_j = a^(N)_j - y_j                          [BCE + sigmoid]
  2. d^(L)_j = f'(z^(L)_j) * Sum_k w^(L+1)_{kj} * d^(L+1)_k
  3. dLoss/dw^(L)_{ji} = d^(L)_j * a^(L-1)_i
  4. dLoss/db^(L)_j = d^(L)_j

CROSS-LANGUAGE PARITY: Must produce identical steps to the TypeScript version.
"""

from __future__ import annotations

import math
from typing import Any

from eigenvue._step_types import CodeHighlight, Step, VisualAction
from eigenvue.math_utils.dl_math import (
    bce_loss,
    mat_vec_mul,
    mse_loss,
    relu,
    relu_derivative,
    sigmoid,
    sigmoid_derivative,
    tanh_activation,
    tanh_derivative,
    vec_add,
)
from eigenvue.math_utils.genai_math import seed_random


def _activate(fn: str, z: float) -> float:
    if fn == "sigmoid":
        return sigmoid(z)
    if fn == "relu":
        return relu(z)
    if fn == "tanh":
        return tanh_activation(z)
    return sigmoid(z)


def _activate_derivative(fn: str, z: float) -> float:
    if fn == "sigmoid":
        return sigmoid_derivative(z)
    if fn == "relu":
        return relu_derivative(z)
    if fn == "tanh":
        return tanh_derivative(z)
    return sigmoid_derivative(z)


def generate(inputs: dict[str, Any]) -> list[Step]:
    """Generate backpropagation visualization steps."""
    input_values: list[float] = list(inputs["inputValues"])
    targets: list[float] = list(inputs.get("targets", inputs.get("targetValues", [])))
    layer_sizes: list[int] = list(inputs["layerSizes"])
    act_fn: str = inputs.get("activationFunction", "sigmoid")
    loss_fn: str = inputs.get("lossFunction", "mse")
    lr: float = inputs.get("learningRate", 0.1)
    seed: str = inputs.get("seed", "backprop")

    # Preconditions
    if len(input_values) != layer_sizes[0]:
        raise ValueError("Input length must match layerSizes[0].")
    if len(targets) != layer_sizes[-1]:
        raise ValueError("Targets length must match output layer size.")
    if loss_fn == "binary-cross-entropy" and act_fn != "sigmoid":
        raise ValueError("Binary cross-entropy requires sigmoid activation on output.")

    rng = seed_random(seed)
    num_layers = len(layer_sizes)  # Total layers (including input)

    # Initialize weights (Xavier) and biases
    w: list[list[list[float]]] = [[]]  # W[l] from layer l-1 to l
    b: list[list[float]] = [[]]

    for l in range(1, num_layers):
        n_in = layer_sizes[l - 1]
        n_out = layer_sizes[l]
        limit = math.sqrt(6.0 / (n_in + n_out))
        w_l: list[list[float]] = []
        for _j in range(n_out):
            row: list[float] = []
            for _i in range(n_in):
                row.append((rng() * 2 - 1) * limit)
            w_l.append(row)
        w.append(w_l)
        b.append([0.01] * n_out)

    steps: list[Step] = []
    idx = 0

    # ======================================================================
    # FORWARD PASS
    # ======================================================================

    a_all: list[list[float]] = []  # activations per layer
    z_all: list[list[float]] = []  # pre-activations per layer
    a_all.append(list(input_values))
    z_all.append([])  # No pre-activation for input layer

    steps.append(
        Step(
            index=idx,
            id="forward-start",
            title="Forward Pass Begins",
            explanation=(
                f"Starting forward propagation with input [{', '.join(str(v) for v in input_values)}]. "
                f"Target output: [{', '.join(str(v) for v in targets)}]."
            ),
            state={
                "layerSizes": list(layer_sizes),
                "activations": [list(a) for a in a_all],
                "weights": [[list(row) for row in w_l] for w_l in w],
                "targets": list(targets),
            },
            visual_actions=tuple(
                VisualAction(
                    type="activateNeuron", params={"layer": 0, "index": i, "value": input_values[i]}
                )
                for i in range(len(input_values))
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=(1, 2)),
            is_terminal=False,
            phase="forward",
        )
    )
    idx += 1

    for l in range(1, num_layers):
        prev = a_all[l - 1]
        z_vec = vec_add(mat_vec_mul(w[l], prev), b[l])
        a_vec = [_activate(act_fn, zj) for zj in z_vec]
        z_all.append(list(z_vec))
        a_all.append(list(a_vec))

        steps.append(
            Step(
                index=idx,
                id=f"forward-layer-{l}",
                title=f"Forward: Layer {l}",
                explanation=(
                    f"Layer {l}: z = W*a + b = [{', '.join(f'{v:.4f}' for v in z_vec)}]. "
                    f"After {act_fn}: [{', '.join(f'{v:.4f}' for v in a_vec)}]."
                ),
                state={
                    "layerSizes": list(layer_sizes),
                    "activations": [list(a) for a in a_all],
                    "weights": [[list(row) for row in w_l] for w_l in w],
                    "targets": list(targets),
                    "preActivations": list(z_vec),
                    "currentLayer": l,
                },
                visual_actions=tuple(
                    [
                        VisualAction(
                            type="propagateSignal", params={"fromLayer": l - 1, "toLayer": l}
                        ),
                        *[
                            VisualAction(
                                type="activateNeuron",
                                params={"layer": l, "index": j, "value": a_vec[j]},
                            )
                            for j in range(len(a_vec))
                        ],
                    ]
                ),
                code_highlight=CodeHighlight(language="pseudocode", lines=(3, 4, 5)),
                is_terminal=False,
                phase="forward",
            )
        )
        idx += 1

    # ======================================================================
    # COMPUTE LOSS
    # ======================================================================

    predictions = a_all[num_layers - 1]
    k = len(predictions)
    loss = mse_loss(predictions, targets) if loss_fn == "mse" else bce_loss(predictions, targets)

    steps.append(
        Step(
            index=idx,
            id="compute-loss",
            title="Compute Loss",
            explanation=(
                f"Predictions: [{', '.join(f'{v:.4f}' for v in predictions)}]. "
                f"Targets: [{', '.join(str(v) for v in targets)}]. "
                f"{'MSE' if loss_fn == 'mse' else 'BCE'} Loss = {loss:.6f}."
            ),
            state={
                "layerSizes": list(layer_sizes),
                "activations": [list(a) for a in a_all],
                "weights": [[list(row) for row in w_l] for w_l in w],
                "targets": list(targets),
                "loss": loss,
                "predictions": list(predictions),
            },
            visual_actions=(
                VisualAction(
                    type="showLoss",
                    params={
                        "loss": loss,
                        "lossFunction": loss_fn,
                        "predictions": list(predictions),
                        "targets": list(targets),
                    },
                ),
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=(6,)),
            is_terminal=False,
            phase="loss",
        )
    )
    idx += 1

    # ======================================================================
    # BACKWARD PASS
    # ======================================================================

    delta: list[list[float]] = [[] for _ in range(num_layers)]

    # Output layer delta
    output_layer = num_layers - 1
    output_z = z_all[output_layer]
    output_a = a_all[output_layer]

    delta[output_layer] = [0.0] * k
    for j in range(k):
        if loss_fn == "binary-cross-entropy" and act_fn == "sigmoid":
            delta[output_layer][j] = output_a[j] - targets[j]
        else:
            d_loss_d_a = (2.0 / k) * (output_a[j] - targets[j])
            f_prime = _activate_derivative(act_fn, output_z[j])
            delta[output_layer][j] = d_loss_d_a * f_prime

    steps.append(
        Step(
            index=idx,
            id="backward-output",
            title="Backward: Output Layer Gradients",
            explanation=(
                f"Computing error signals (delta) at output layer: "
                f"[{', '.join(f'{v:.6f}' for v in delta[output_layer])}]. "
                + (
                    "Using the simplified sigmoid+BCE form: delta = a - y."
                    if loss_fn == "binary-cross-entropy"
                    else f"delta = (2/{k})(a - y) * f'(z)."
                )
            ),
            state={
                "layerSizes": list(layer_sizes),
                "activations": [list(a) for a in a_all],
                "weights": [[list(row) for row in w_l] for w_l in w],
                "targets": list(targets),
                "loss": loss,
                "gradients": [list(d) for d in delta],
                "currentLayer": output_layer,
            },
            visual_actions=(
                VisualAction(
                    type="showGradient",
                    params={"layer": output_layer, "gradients": list(delta[output_layer])},
                ),
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=(7, 8)),
            is_terminal=False,
            phase="backward",
        )
    )
    idx += 1

    # Hidden layers delta (backward from output-1 to 1)
    for l in range(output_layer - 1, 0, -1):
        n_l = layer_sizes[l]
        n_next = layer_sizes[l + 1]
        next_w = w[l + 1]
        next_delta = delta[l + 1]
        this_z = z_all[l]

        delta[l] = [0.0] * n_l
        for j in range(n_l):
            downstream_sum = 0.0
            for kk in range(n_next):
                downstream_sum += next_w[kk][j] * next_delta[kk]
            delta[l][j] = _activate_derivative(act_fn, this_z[j]) * downstream_sum

        steps.append(
            Step(
                index=idx,
                id=f"backward-hidden-{l}",
                title=f"Backward: Hidden Layer {l}",
                explanation=(
                    f"Propagating gradients to layer {l}. delta = f'(z) * (W^T * delta_next): "
                    f"[{', '.join(f'{v:.6f}' for v in delta[l])}]."
                ),
                state={
                    "layerSizes": list(layer_sizes),
                    "activations": [list(a) for a in a_all],
                    "weights": [[list(row) for row in w_l] for w_l in w],
                    "targets": list(targets),
                    "loss": loss,
                    "gradients": [list(d) for d in delta],
                    "currentLayer": l,
                },
                visual_actions=(
                    VisualAction(
                        type="showGradient", params={"layer": l, "gradients": list(delta[l])}
                    ),
                ),
                code_highlight=CodeHighlight(language="pseudocode", lines=(9, 10)),
                is_terminal=False,
                phase="backward",
            )
        )
        idx += 1

    # ======================================================================
    # WEIGHT UPDATE
    # ======================================================================

    for l in range(1, num_layers):
        n_out = layer_sizes[l]
        n_in = layer_sizes[l - 1]
        prev_a = a_all[l - 1]
        delta_l = delta[l]

        old_w = [list(row) for row in w[l]]

        w_grads: list[list[float]] = []
        for j in range(n_out):
            row_grads: list[float] = []
            for i in range(n_in):
                grad = delta_l[j] * prev_a[i]
                row_grads.append(grad)
                w[l][j][i] = w[l][j][i] - lr * grad
            w_grads.append(row_grads)
            b[l][j] = b[l][j] - lr * delta_l[j]

        steps.append(
            Step(
                index=idx,
                id=f"update-weights-{l}",
                title=f"Update Weights: Layer {l}",
                explanation=(
                    f"Updating weights for layer {l} with learning rate eta = {lr}. "
                    f"w_new = w_old - eta * delta * a_prev."
                ),
                state={
                    "layerSizes": list(layer_sizes),
                    "activations": [list(a) for a in a_all],
                    "weights": [[list(row) for row in w_l] for w_l in w],
                    "biases": [list(b_l) for b_l in b],
                    "targets": list(targets),
                    "loss": loss,
                    "gradients": [list(d) for d in delta],
                    "weightGradients": [list(row) for row in w_grads],
                    "currentLayer": l,
                    "learningRate": lr,
                },
                visual_actions=(
                    VisualAction(
                        type="updateWeights",
                        params={
                            "fromLayer": l - 1,
                            "toLayer": l,
                            "oldWeights": old_w,
                            "newWeights": [list(row) for row in w[l]],
                            "learningRate": lr,
                        },
                    ),
                ),
                code_highlight=CodeHighlight(language="pseudocode", lines=(11, 12)),
                is_terminal=False,
                phase="update",
            )
        )
        idx += 1

    # Final Step
    steps.append(
        Step(
            index=idx,
            id="complete",
            title="Training Step Complete",
            explanation=(
                f"One complete training step finished. Loss: {loss:.6f}. All weights have been updated. "
                f"In practice, this process repeats for many iterations until the loss converges."
            ),
            state={
                "layerSizes": list(layer_sizes),
                "activations": [list(a) for a in a_all],
                "weights": [[list(row) for row in w_l] for w_l in w],
                "biases": [list(b_l) for b_l in b],
                "targets": list(targets),
                "loss": loss,
                "gradients": [list(d) for d in delta],
            },
            visual_actions=(),
            code_highlight=CodeHighlight(language="pseudocode", lines=(13,)),
            is_terminal=True,
            phase="complete",
        )
    )

    return steps
