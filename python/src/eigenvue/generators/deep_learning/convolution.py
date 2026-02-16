"""
Convolution (2D) — Step Generator (Python mirror of generator.ts).

Implements the 2D convolution (correlation) operation:
  1. Show the input grid and kernel
  2. For each output position (row, col):
     a. Highlight the kernel window on the input
     b. Show element-wise products
     c. Sum products and write to output
  3. Show the complete output feature map

CONVENTION: Convolution here is cross-correlation (no kernel flip).
This is the standard deep learning convention used by PyTorch, TensorFlow, etc.

INVARIANTS:
  - output[r][c] = Sum_{kr,kc} input[r+kr][c+kc] * kernel[kr][kc]
  - Output dimensions = (H - kH + 1) x (W - kW + 1)
  - Kernel must fit within input: kH <= H and kW <= W

CROSS-LANGUAGE PARITY: Must produce identical steps to the TypeScript version.
"""

from __future__ import annotations

from typing import Any

from eigenvue._step_types import CodeHighlight, Step, VisualAction


def generate(inputs: dict[str, Any]) -> list[Step]:
    """Generate convolution visualization steps."""
    input_grid: list[list[float]] = inputs["input"]
    kernel: list[list[float]] = inputs["kernel"]

    h = len(input_grid)
    w_dim = len(input_grid[0])
    kh = len(kernel)
    kw = len(kernel[0])

    # Precondition checks
    if kh > h or kw > w_dim:
        raise ValueError(f"Kernel ({kh}\u00d7{kw}) must not exceed input ({h}\u00d7{w_dim}).")

    out_h = h - kh + 1
    out_w = w_dim - kw + 1

    # Initialize output grid with zeros
    output: list[list[float]] = [[0.0] * out_w for _ in range(out_h)]

    steps: list[Step] = []
    idx = 0

    # Step: Show Input and Kernel
    steps.append(
        Step(
            index=idx,
            id="show-input",
            title="Input Grid & Kernel",
            explanation=(
                f"Input is a {h}\u00d7{w_dim} grid. Kernel is {kh}\u00d7{kw}. "
                f"Output will be {out_h}\u00d7{out_w} (valid convolution, no padding). "
                f"The kernel slides across the input computing dot products at each position."
            ),
            state={
                "inputGrid": [list(row) for row in input_grid],
                "kernel": [list(row) for row in kernel],
                "outputGrid": [list(row) for row in output],
                "outputHeight": out_h,
                "outputWidth": out_w,
            },
            visual_actions=(),
            code_highlight=CodeHighlight(language="pseudocode", lines=(1, 2, 3)),
            is_terminal=False,
            phase="initialization",
        )
    )
    idx += 1

    # Steps: Slide kernel across input
    for r in range(out_h):
        for c in range(out_w):
            # Compute element-wise products
            products: list[list[float]] = []
            total = 0.0

            for kr in range(kh):
                prod_row: list[float] = []
                for kc in range(kw):
                    product = input_grid[r + kr][c + kc] * kernel[kr][kc]
                    prod_row.append(product)
                    total += product
                products.append(prod_row)

            output[r][c] = total

            flat_products = [v for row in products for v in row]

            steps.append(
                Step(
                    index=idx,
                    id=f"conv-{r}-{c}",
                    title=f"Position ({r}, {c}): Sum = {total}",
                    explanation=(
                        f"Kernel at input position ({r}, {c}). "
                        f"Element-wise products: [{', '.join(f'{v:.2f}' for v in flat_products)}]. "
                        f"Sum = {total}. This becomes output[{r}][{c}]."
                    ),
                    state={
                        "inputGrid": [list(row) for row in input_grid],
                        "kernel": [list(row) for row in kernel],
                        "outputGrid": [list(row) for row in output],
                        "currentRow": r,
                        "currentCol": c,
                        "products": [list(row) for row in products],
                        "sum": total,
                    },
                    visual_actions=(
                        VisualAction(
                            type="highlightKernelPosition",
                            params={
                                "row": r,
                                "col": c,
                                "kernelHeight": kh,
                                "kernelWidth": kw,
                            },
                        ),
                        VisualAction(
                            type="showConvolutionProducts",
                            params={
                                "row": r,
                                "col": c,
                                "products": [list(row) for row in products],
                                "sum": total,
                            },
                        ),
                        VisualAction(
                            type="writeOutputCell",
                            params={
                                "row": r,
                                "col": c,
                                "value": total,
                            },
                        ),
                    ),
                    code_highlight=CodeHighlight(language="pseudocode", lines=(7, 8, 9, 10)),
                    is_terminal=False,
                    phase="convolution",
                )
            )
            idx += 1

    # Step: Complete
    steps.append(
        Step(
            index=idx,
            id="complete",
            title="Convolution Complete",
            explanation=(
                f"Convolution complete. Output is a {out_h}\u00d7{out_w} feature map. "
                f"Each output value is the sum of element-wise products between the kernel and the corresponding input patch."
            ),
            state={
                "inputGrid": [list(row) for row in input_grid],
                "kernel": [list(row) for row in kernel],
                "outputGrid": [list(row) for row in output],
                "outputHeight": out_h,
                "outputWidth": out_w,
            },
            visual_actions=(),
            code_highlight=CodeHighlight(language="pseudocode", lines=(11,)),
            is_terminal=True,
            phase="complete",
        )
    )

    return steps
