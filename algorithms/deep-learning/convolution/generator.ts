/**
 * @fileoverview Convolution (2D) Step Generator
 *
 * Implements the 2D convolution (correlation) operation:
 *   1. Show the input grid and kernel
 *   2. For each output position (row, col):
 *      a. Highlight the kernel window on the input
 *      b. Show element-wise products
 *      c. Sum products and write to output
 *   3. Show the complete output feature map
 *
 * Mathematical basis: Section 4.5 of the Phase 9 specification.
 *
 * CONVENTION: Convolution here is cross-correlation (no kernel flip).
 * This is the standard deep learning convention used by PyTorch, TensorFlow, etc.
 *
 * INVARIANTS:
 *   - output[r][c] = Σ_{kr,kc} input[r+kr][c+kc] * kernel[kr][kc]
 *   - Output dimensions = (H - kH + 1) × (W - kW + 1)
 *   - Kernel must fit within input: kH ≤ H and kW ≤ W
 */

import { createGenerator } from "@/engine/generator";

// ─────────────────────────────────────────────────────────────────────────────
// Input Interface
// ─────────────────────────────────────────────────────────────────────────────

interface ConvolutionInputs extends Record<string, unknown> {
  /** 2D input matrix. */
  input: number[][];
  /** 2D convolution kernel (filter). */
  kernel: number[][];
}

// ─────────────────────────────────────────────────────────────────────────────
// Generator
// ─────────────────────────────────────────────────────────────────────────────

export default createGenerator<ConvolutionInputs>({
  id: "convolution",

  *generate(inputs, step) {
    const { input, kernel } = inputs;

    const H = input.length;
    const W = input[0]!.length;
    const kH = kernel.length;
    const kW = kernel[0]!.length;

    // ── Precondition Checks ──────────────────────────────────────────────
    if (kH > H || kW > W) {
      throw new Error(
        `Kernel (${kH}×${kW}) must not exceed input (${H}×${W}).`,
      );
    }

    const outH = H - kH + 1;
    const outW = W - kW + 1;

    // Initialize output grid with zeros
    const output: number[][] = Array.from({ length: outH }, () =>
      Array.from({ length: outW }, () => 0),
    );

    // ── Step: Show Input and Kernel ──────────────────────────────────────
    yield step({
      id: "show-input",
      title: "Input Grid & Kernel",
      explanation:
        `Input is a ${H}×${W} grid. Kernel is ${kH}×${kW}. ` +
        `Output will be ${outH}×${outW} (valid convolution, no padding). ` +
        `The kernel slides across the input computing dot products at each position.`,
      state: {
        inputGrid: input.map((row) => [...row]),
        kernel: kernel.map((row) => [...row]),
        outputGrid: output.map((row) => [...row]),
        outputHeight: outH,
        outputWidth: outW,
      },
      visualActions: [],
      codeHighlight: { language: "pseudocode", lines: [1, 2, 3] },
      phase: "initialization",
    });

    // ── Steps: Slide kernel across input ─────────────────────────────────
    for (let r = 0; r < outH; r++) {
      for (let c = 0; c < outW; c++) {
        // Compute element-wise products
        const products: number[][] = [];
        let sum = 0;

        for (let kr = 0; kr < kH; kr++) {
          const prodRow: number[] = [];
          for (let kc = 0; kc < kW; kc++) {
            // output[r][c] += input[r+kr][c+kc] * kernel[kr][kc]
            // Correlation (no kernel flip) — deep learning convention
            const product = input[r + kr]![c + kc]! * kernel[kr]![kc]!;
            prodRow.push(product);
            sum += product;
          }
          products.push(prodRow);
        }

        output[r]![c] = sum;

        yield step({
          id: `conv-${r}-${c}`,
          title: `Position (${r}, ${c}): Sum = ${sum}`,
          explanation:
            `Kernel at input position (${r}, ${c}). ` +
            `Element-wise products: [${products.flat().map((v) => v.toFixed(2)).join(", ")}]. ` +
            `Sum = ${sum}. This becomes output[${r}][${c}].`,
          state: {
            inputGrid: input.map((row) => [...row]),
            kernel: kernel.map((row) => [...row]),
            outputGrid: output.map((row) => [...row]),
            currentRow: r,
            currentCol: c,
            products: products.map((row) => [...row]),
            sum,
          },
          visualActions: [
            {
              type: "highlightKernelPosition" as const,
              row: r,
              col: c,
              kernelHeight: kH,
              kernelWidth: kW,
            },
            {
              type: "showConvolutionProducts" as const,
              row: r,
              col: c,
              products: products.map((row) => [...row]),
              sum,
            },
            {
              type: "writeOutputCell" as const,
              row: r,
              col: c,
              value: sum,
            },
          ],
          codeHighlight: { language: "pseudocode", lines: [7, 8, 9, 10] },
          phase: "convolution",
        });
      }
    }

    // ── Step: Complete ────────────────────────────────────────────────────
    yield step({
      id: "complete",
      title: "Convolution Complete",
      explanation:
        `Convolution complete. Output is a ${outH}×${outW} feature map. ` +
        `Each output value is the sum of element-wise products between the kernel and the corresponding input patch.`,
      state: {
        inputGrid: input.map((row) => [...row]),
        kernel: kernel.map((row) => [...row]),
        outputGrid: output.map((row) => [...row]),
        outputHeight: outH,
        outputWidth: outW,
      },
      visualActions: [],
      codeHighlight: { language: "pseudocode", lines: [11] },
      isTerminal: true,
      phase: "complete",
    });
  },
});
