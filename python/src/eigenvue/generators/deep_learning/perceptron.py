"""
Perceptron (Single Neuron) — Step Generator (Python mirror of generator.ts).

Implements the full forward pass of a single perceptron:
  1. Show input values
  2. Show weights
  3. Compute weighted inputs (w_i x x_i for each i)
  4. Compute pre-activation z = dot(w, x) + b
  5. Apply activation function a = f(z)
  6. Show final output

INVARIANTS enforced and tested:
  - inputs.length == weights.length
  - Pre-activation z = dotProduct(weights, inputs) + bias
  - Output a = activationFunction(z)
  - Step count is always 6

CROSS-LANGUAGE PARITY: Must produce identical steps to the TypeScript version.
"""

from __future__ import annotations

from typing import Any

from eigenvue._step_types import CodeHighlight, Step, VisualAction
from eigenvue.math_utils.dl_math import (
    dot_product,
    relu,
    sigmoid,
    step_function,
    tanh_activation,
)


def _apply_activation(fn: str, z: float) -> float:
    """Dispatch to the correct activation function."""
    if fn == "sigmoid":
        return sigmoid(z)
    if fn == "relu":
        return relu(z)
    if fn == "tanh":
        return tanh_activation(z)
    if fn == "step":
        return step_function(z)
    return sigmoid(z)


def generate(inputs: dict[str, Any]) -> list[Step]:
    """Generate perceptron visualization steps."""
    x: list[float] = list(inputs["inputs"])
    w: list[float] = list(inputs["weights"])
    b: float = inputs["bias"]
    fn: str = inputs["activationFunction"]
    n = len(x)

    steps: list[Step] = []
    idx = 0

    # Step 0: Show Inputs
    steps.append(
        Step(
            index=idx,
            id="show-inputs",
            title="Input Values",
            explanation=(
                f"The neuron receives {n} input{'s' if n > 1 else ''}: "
                f"[{', '.join(str(v) for v in x)}]. Each input represents a feature or signal "
                f"fed into the neuron."
            ),
            state={
                "inputs": list(x),
                "weights": list(w),
                "bias": b,
                "activationFunction": fn,
                "n": n,
            },
            visual_actions=tuple(
                VisualAction(
                    type="activateNeuron", params={"layer": 0, "neuronIndex": i, "value": x[i]}
                )
                for i in range(n)
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=(1,)),
            is_terminal=False,
            phase="input",
        )
    )
    idx += 1

    # Step 1: Show Weights
    steps.append(
        Step(
            index=idx,
            id="show-weights",
            title="Weight Values",
            explanation=(
                f"Each input has a corresponding weight: [{', '.join(str(v) for v in w)}]. "
                f"Weights control how much influence each input has on the output. "
                f"Larger absolute weight = stronger influence."
            ),
            state={
                "inputs": list(x),
                "weights": list(w),
                "bias": b,
                "activationFunction": fn,
                "n": n,
            },
            visual_actions=(VisualAction(type="showWeights", params={"weights": list(w)}),),
            code_highlight=CodeHighlight(language="pseudocode", lines=(1,)),
            is_terminal=False,
            phase="weights",
        )
    )
    idx += 1

    # Step 2: Weighted Inputs
    weighted_inputs = [x[i] * w[i] for i in range(n)]

    steps.append(
        Step(
            index=idx,
            id="weighted-inputs",
            title="Weighted Inputs (w\u1d62 \u00d7 x\u1d62)",
            explanation=(
                "Multiply each input by its weight: "
                + ", ".join(f"{w[i]} \u00d7 {x[i]} = {weighted_inputs[i]}" for i in range(n))
                + ". These products determine each input's contribution to the sum."
            ),
            state={
                "inputs": list(x),
                "weights": list(w),
                "bias": b,
                "activationFunction": fn,
                "n": n,
                "weightedInputs": list(weighted_inputs),
            },
            visual_actions=(
                VisualAction(type="showPreActivation", params={"values": list(weighted_inputs)}),
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=(3, 4)),
            is_terminal=False,
            phase="computation",
        )
    )
    idx += 1

    # Step 3: Pre-activation (z = w.x + b)
    z = dot_product(w, x) + b

    steps.append(
        Step(
            index=idx,
            id="pre-activation",
            title=f"Pre-activation: z = {z:.4f}",
            explanation=(
                f"Sum all weighted inputs and add the bias: "
                f"z = ({' + '.join(str(v) for v in weighted_inputs)}) + {b} = {z:.4f}. "
                f"The bias shifts the activation threshold, allowing the neuron "
                f"to fire even when all inputs are zero."
            ),
            state={
                "inputs": list(x),
                "weights": list(w),
                "bias": b,
                "activationFunction": fn,
                "n": n,
                "weightedInputs": list(weighted_inputs),
                "z": z,
            },
            visual_actions=(VisualAction(type="showPreActivation", params={"value": z}),),
            code_highlight=CodeHighlight(language="pseudocode", lines=(5,)),
            is_terminal=False,
            phase="computation",
        )
    )
    idx += 1

    # Step 4: Activation
    a = _apply_activation(fn, z)

    steps.append(
        Step(
            index=idx,
            id="activation",
            title=f"Activation: {fn}({z:.4f}) = {a:.4f}",
            explanation=(
                f"Apply the {fn} activation function to z = {z:.4f}. "
                f"Result: {fn}({z:.4f}) = {a:.4f}. "
                f"The activation function introduces non-linearity, enabling the "
                f"neuron to learn patterns beyond simple linear relationships."
            ),
            state={
                "inputs": list(x),
                "weights": list(w),
                "bias": b,
                "activationFunction": fn,
                "n": n,
                "weightedInputs": list(weighted_inputs),
                "z": z,
                "a": a,
            },
            visual_actions=(
                VisualAction(
                    type="showActivationFunction", params={"fn": fn, "input": z, "output": a}
                ),
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=(6,)),
            is_terminal=False,
            phase="activation",
        )
    )
    idx += 1

    # Step 5: Output (Terminal)
    steps.append(
        Step(
            index=idx,
            id="output",
            title=f"Output: {a:.4f}",
            explanation=(
                f"The neuron's final output is {a:.4f}. "
                f"This value would be passed to the next layer in a neural network, "
                f"or used directly as the prediction in a single-neuron model."
            ),
            state={
                "inputs": list(x),
                "weights": list(w),
                "bias": b,
                "activationFunction": fn,
                "n": n,
                "weightedInputs": list(weighted_inputs),
                "z": z,
                "a": a,
                "output": a,
            },
            visual_actions=(
                VisualAction(
                    type="activateNeuron", params={"layer": 1, "neuronIndex": 0, "value": a}
                ),
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=(7,)),
            is_terminal=True,
            phase="output",
        )
    )

    return steps
