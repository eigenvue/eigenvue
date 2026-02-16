/**
 * @fileoverview Grover's Search Algorithm — Step Generator
 *
 * Demonstrates quantum search via amplitude amplification.
 * The oracle marks target states (sign flip), and the diffusion operator
 * amplifies their probability through interference.
 *
 * MATHEMATICAL CORRECTNESS:
 *   - Optimal iterations: R = floor(π/4 × √(N/M))
 *   - 2 qubits, 1 target: R = 1, P(target) = 1.0 exactly
 *   - 3 qubits, 1 target: R = 2, P(target) ≈ 0.9453
 *   - Normalization verified after every oracle + diffusion
 *
 * STATE SNAPSHOT SAFETY:
 *   Every yield produces fresh arrays and objects via cloneState() and
 *   spread operators. No mutable references escape into step snapshots.
 *
 * CODE HIGHLIGHT MAPPING:
 *   Lines reference the "pseudocode" implementation in meta.json:
 *     Lines 1-2:  Initialize
 *     Lines 4-5:  Hadamard (superposition)
 *     Lines 8-9:  Oracle
 *     Lines 11-12: Diffusion
 *     Lines 14-15: Measure
 */

import { createGenerator } from "@/engine/generator";
import type { VisualAction } from "@/engine/generator";
import {
  createZeroState,
  createUniformSuperposition,
  applySingleQubitGate,
  assertNormalized,
  measurementProbabilities,
  basisLabels,
  applyGroverOracle,
  applyGroverDiffusion,
  complexAbsSq,
  GATE_H,
  type Complex,
  type StateVector,
} from "@/engine/utils/quantum-math";

// ─────────────────────────────────────────────────────────────────────────────
// INPUT TYPE
// ─────────────────────────────────────────────────────────────────────────────

interface GroversSearchInputs extends Record<string, unknown> {
  readonly numQubits: number;
  readonly targets: readonly number[];
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deep-clone a state vector to prevent mutable reference leaks into step
 * snapshots. Each complex amplitude is a fresh [re, im] tuple.
 */
function cloneState(state: StateVector): [number, number][] {
  return state.map(([re, im]) => [re, im] as [number, number]);
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

export default createGenerator<GroversSearchInputs>({
  id: "grovers-search",

  *generate(inputs, step) {
    const { numQubits, targets } = inputs;
    const N = 1 << numQubits;
    const M = targets.length;
    const labels = basisLabels(numQubits);
    const targetLabels = targets.map(t => labels[t]).join(", ");

    // Optimal number of Grover iterations
    const R = Math.floor((Math.PI / 4) * Math.sqrt(N / M));

    // ── Step 0: Initialize ─────────────────────────────────────────
    const state: StateVector = createZeroState(numQubits);

    yield step({
      id: "initialize",
      title: "Initialize Quantum Register",
      explanation:
        `Starting with ${numQubits} qubits in |${"0".repeat(numQubits)}⟩. ` +
        `Searching for target${M > 1 ? "s" : ""} ${targetLabels} among ${N} items. ` +
        `Grover's algorithm will need ${R} iteration${R !== 1 ? "s" : ""}.`,
      state: {
        numQubits,
        targets: [...targets],
        stateVector: cloneState(state),
        probabilities: [...measurementProbabilities(state)],
        basisLabels: [...labels],
        iteration: 0,
        totalIterations: R,
        phase: "initialize",
        successProbability: targets.reduce((sum, t) => sum + complexAbsSq(state[t]!), 0),
      },
      visualActions: [
        {
          type: "showStateVector",
          amplitudes: cloneState(state),
          labels: [...labels],
        },
        {
          type: "showProbabilities",
          probabilities: [...measurementProbabilities(state)],
          labels: [...labels],
          targetStates: [...targets],
        },
      ],
      codeHighlight: { language: "pseudocode", lines: [1, 2] },
      phase: "initialization",
    });

    // ── Step 1: Hadamard on all qubits → uniform superposition ─────
    for (let q = 0; q < numQubits; q++) {
      applySingleQubitGate(state, GATE_H, q, numQubits);
    }
    assertNormalized(state, "after Hadamard on all qubits");

    const hadProbs = measurementProbabilities(state);
    const hadSuccess = targets.reduce((sum, t) => sum + complexAbsSq(state[t]!), 0);

    yield step({
      id: "hadamard_all",
      title: "Create Uniform Superposition",
      explanation:
        `Applied Hadamard (H) to all ${numQubits} qubits. Every basis state now has equal ` +
        `probability ${(1 / N * 100).toFixed(1)}%. All ${N} items are equally likely — ` +
        `we haven't searched yet. Will perform ${R} Grover iteration${R !== 1 ? "s" : ""}.`,
      state: {
        numQubits,
        targets: [...targets],
        stateVector: cloneState(state),
        probabilities: [...hadProbs],
        basisLabels: [...labels],
        iteration: 0,
        totalIterations: R,
        phase: "hadamard",
        successProbability: hadSuccess,
      },
      visualActions: [
        {
          type: "showStateVector",
          amplitudes: cloneState(state),
          labels: [...labels],
        },
        {
          type: "showProbabilities",
          probabilities: [...hadProbs],
          labels: [...labels],
          targetStates: [...targets],
        },
      ],
      codeHighlight: { language: "pseudocode", lines: [4, 5] },
      phase: "superposition",
    });

    // ── Grover iterations ──────────────────────────────────────────
    for (let iter = 1; iter <= R; iter++) {
      // Oracle: negate target amplitudes
      applyGroverOracle(state, [...targets]);
      assertNormalized(state, `after oracle iteration ${iter}`);

      const oracleProbs = measurementProbabilities(state);
      const oracleSuccess = targets.reduce((sum, t) => sum + complexAbsSq(state[t]!), 0);

      yield step({
        id: `oracle_${iter}`,
        title: `Iteration ${iter}: Oracle`,
        explanation:
          `The oracle flipped the sign of target state${M > 1 ? "s" : ""} ${targetLabels}. ` +
          `The probabilities haven't changed — the oracle's power is in the phase, not the probability. ` +
          `The negative amplitude will cause constructive interference in the next step.`,
        state: {
          numQubits,
          targets: [...targets],
          stateVector: cloneState(state),
          probabilities: [...oracleProbs],
          basisLabels: [...labels],
          iteration: iter,
          totalIterations: R,
          phase: "oracle",
          successProbability: oracleSuccess,
        },
        visualActions: [
          {
            type: "showStateVector",
            amplitudes: cloneState(state),
            labels: [...labels],
          },
          {
            type: "showProbabilities",
            probabilities: [...oracleProbs],
            labels: [...labels],
            targetStates: [...targets],
          },
        ],
        codeHighlight: { language: "pseudocode", lines: [8, 9] },
        phase: "grover_iteration",
      });

      // Diffusion: reflect about mean
      applyGroverDiffusion(state);
      assertNormalized(state, `after diffusion iteration ${iter}`);

      const diffProbs = measurementProbabilities(state);
      const diffSuccess = targets.reduce((sum, t) => sum + complexAbsSq(state[t]!), 0);

      yield step({
        id: `diffusion_${iter}`,
        title: `Iteration ${iter}: Diffusion`,
        explanation:
          `The diffusion operator reflected all amplitudes about the mean, amplifying the ` +
          `target${M > 1 ? "s" : ""}. Target probability is now ${(diffSuccess * 100).toFixed(1)}%.` +
          (iter === R
            ? ` After ${R} iteration${R !== 1 ? "s" : ""}, the target is maximally amplified.`
            : ""),
        state: {
          numQubits,
          targets: [...targets],
          stateVector: cloneState(state),
          probabilities: [...diffProbs],
          basisLabels: [...labels],
          iteration: iter,
          totalIterations: R,
          phase: "diffusion",
          successProbability: diffSuccess,
        },
        visualActions: [
          {
            type: "showStateVector",
            amplitudes: cloneState(state),
            labels: [...labels],
          },
          {
            type: "showProbabilities",
            probabilities: [...diffProbs],
            labels: [...labels],
            targetStates: [...targets],
          },
        ],
        codeHighlight: { language: "pseudocode", lines: [11, 12] },
        phase: "grover_iteration",
      });
    }

    // ── Final Step: Measure ────────────────────────────────────────
    const finalProbs = measurementProbabilities(state);
    const finalSuccess = targets.reduce((sum, t) => sum + complexAbsSq(state[t]!), 0);

    yield step({
      id: "measure",
      title: "Measurement Result",
      explanation:
        `Measurement would yield target ${targetLabels} with ${(finalSuccess * 100).toFixed(1)}% probability. ` +
        `Grover's algorithm found the target in ${R} iteration${R !== 1 ? "s" : ""} — ` +
        `a classical search would need up to ${N} checks.`,
      state: {
        numQubits,
        targets: [...targets],
        stateVector: cloneState(state),
        probabilities: [...finalProbs],
        basisLabels: [...labels],
        iteration: R,
        totalIterations: R,
        phase: "measure",
        successProbability: finalSuccess,
      },
      visualActions: [
        {
          type: "showProbabilities",
          probabilities: [...finalProbs],
          labels: [...labels],
          targetStates: [...targets],
        },
        {
          type: "showMessage",
          text: `Target found: ${targetLabels} (${(finalSuccess * 100).toFixed(1)}% probability)`,
          messageType: "success",
        },
      ],
      codeHighlight: { language: "pseudocode", lines: [14, 15] },
      phase: "result",
      isTerminal: true,
    });
  },
});
