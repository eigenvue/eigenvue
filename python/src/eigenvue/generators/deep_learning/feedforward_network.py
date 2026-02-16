"""
Feedforward Neural Network — Step Generator (Python mirror of generator.ts).

Implements forward propagation through a multi-layer feedforward network:
  1. Show network architecture and activate input layer
  2. For each hidden/output layer, compute z = W*a + b then a = activation(z)
  3. Show final output activations

Weight convention: W[toNeuron][fromNeuron] (standard ML convention).
Xavier initialization: limit = sqrt(6 / (nIn + nOut)), w in [-limit, +limit].
Biases initialized to 0.01.

CROSS-LANGUAGE PARITY: Must produce identical steps to the TypeScript version.
"""

from __future__ import annotations

import math
from typing import Any

from eigenvue._step_types import CodeHighlight, Step, VisualAction
from eigenvue.math_utils.dl_math import mat_vec_mul, relu, sigmoid, tanh_activation, vec_add
from eigenvue.math_utils.genai_math import seed_random


def _apply_activation(z: float, fn: str) -> float:
    """Dispatch to the correct activation function."""
    if fn == "sigmoid":
        return sigmoid(z)
    if fn == "relu":
        return relu(z)
    if fn == "tanh":
        return tanh_activation(z)
    return sigmoid(z)


def generate(inputs: dict[str, Any]) -> list[Step]:
    """Generate feedforward network visualization steps."""
    input_values: list[float] = list(inputs["inputValues"])
    layer_sizes: list[int] = list(inputs["layerSizes"])
    activation_function: str = inputs.get("activationFunction", "sigmoid")
    seed: str = inputs.get("seed", "feedforward")

    # Precondition checks
    if len(input_values) != layer_sizes[0]:
        raise ValueError(
            f"inputValues.length ({len(input_values)}) must equal layerSizes[0] ({layer_sizes[0]})."
        )
    if len(layer_sizes) < 2:
        raise ValueError(
            f"layerSizes must have at least 2 entries (input + output). Got {len(layer_sizes)}."
        )

    num_layers = len(layer_sizes)
    rng = seed_random(seed)

    # Weight & Bias Initialization
    # allWeights[l][j][i]: weight from neuron i in layer l-1 to neuron j in layer l
    all_weights: list[list[list[float]]] = [[]]  # W[0] = [] (input layer)
    all_biases: list[list[float]] = [[]]

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

        all_weights.append(w_l)
        all_biases.append([0.01] * n_out)

    # Activation storage
    activations: list[list[float]] = [None] * num_layers  # type: ignore[list-item]
    activations[0] = list(input_values)

    def snapshot_state() -> dict[str, Any]:
        return {
            "layerSizes": list(layer_sizes),
            "activations": [list(a) for a in activations if a is not None],
            "weights": [[list(row) for row in w_l] for w_l in all_weights],
            "biases": [list(b_l) for b_l in all_biases],
            "activationFunction": activation_function,
        }

    steps: list[Step] = []
    idx = 0

    # Step: Architecture
    steps.append(
        Step(
            index=idx,
            id="architecture",
            title="Network Architecture",
            explanation=(
                f"Feedforward network with {num_layers} layers: [{', '.join(str(s) for s in layer_sizes)}]. "
                f"Input layer has {layer_sizes[0]} neurons receiving values [{', '.join(str(v) for v in input_values)}]. "
                f"Using {activation_function} activation. "
                f'Weights initialized with Xavier initialization (seed: "{seed}").'
            ),
            state=snapshot_state(),
            visual_actions=tuple(
                VisualAction(
                    type="activateNeuron", params={"layer": 0, "index": i, "value": input_values[i]}
                )
                for i in range(len(input_values))
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=(2,)),
            is_terminal=False,
            phase="initialization",
        )
    )
    idx += 1

    # Steps: Forward Propagation (layer by layer)
    for l in range(1, num_layers):
        w_l = all_weights[l]
        b_l = all_biases[l]
        prev_activations = activations[l - 1]

        # z = W . a_{l-1} + b
        z_vec = vec_add(mat_vec_mul(w_l, prev_activations), b_l)
        # a = activation(z)
        a_vec = [_apply_activation(zi, activation_function) for zi in z_vec]
        activations[l] = a_vec

        is_hidden = l < num_layers - 1
        layer_label = f"Hidden Layer {l}" if is_hidden else "Output Layer"

        steps.append(
            Step(
                index=idx,
                id=f"propagate-{l}",
                title=f"Forward Propagation \u2192 {layer_label}",
                explanation=(
                    f"Computing activations for layer {l} ({layer_sizes[l]} neurons). "
                    f"z = W\u00b7a + b, then a = {activation_function}(z). "
                    f"Input from {layer_sizes[l - 1]} neurons in layer {l - 1}. "
                    f"Activations: [{', '.join(f'{v:.4f}' for v in a_vec)}]."
                ),
                state=snapshot_state(),
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
                code_highlight=CodeHighlight(language="pseudocode", lines=(3, 4)),
                is_terminal=False,
                phase="forward-propagation",
            )
        )
        idx += 1

    # Step: Output
    final_activations = activations[num_layers - 1]

    steps.append(
        Step(
            index=idx,
            id="output",
            title="Network Output",
            explanation=(
                f"Forward propagation complete. "
                f"Final output: [{', '.join(f'{v:.4f}' for v in final_activations)}]. "
                f"The input [{', '.join(str(v) for v in input_values)}] was transformed through {num_layers - 1} "
                f"layer{'s' if num_layers - 1 > 1 else ''} of {activation_function} activations."
            ),
            state=snapshot_state(),
            visual_actions=tuple(
                VisualAction(
                    type="activateNeuron",
                    params={"layer": num_layers - 1, "index": j, "value": final_activations[j]},
                )
                for j in range(len(final_activations))
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=(5,)),
            is_terminal=True,
            phase="result",
        )
    )

    return steps
