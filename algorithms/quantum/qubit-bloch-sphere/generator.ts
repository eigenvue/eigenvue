/**
 * @fileoverview Qubit States & Bloch Sphere — Step Generator
 *
 * Generates a step-by-step visualization of single-qubit states on the
 * Bloch sphere. Walks through a sequence of named qubit states, computing
 * Bloch sphere coordinates and measurement probabilities for each.
 *
 * ALGORITHM:
 *   Given a sequence of qubit states (each defined by [α₀, α₁] amplitudes):
 *   1. For each state, validate normalization (|α₀|² + |α₁|² = 1).
 *   2. Compute Bloch sphere angles (θ, φ) from the state vector.
 *   3. Convert to Cartesian coordinates (x, y, z) for rendering.
 *   4. Compute measurement probabilities P(|0⟩) = |α₀|², P(|1⟩) = |α₁|².
 *   5. Optionally show the gate matrix if a gate transformation is indicated.
 *
 * STATE SNAPSHOT SAFETY:
 *   The stateSequence array is spread-copied in every snapshot.
 *   Complex number tuples are fresh objects per step (no mutable references).
 *
 * CODE HIGHLIGHT MAPPING:
 *   Lines reference the "pseudocode" implementation in meta.json.
 */

import { createGenerator } from "@/engine/generator";
import type { VisualAction } from "@/engine/generator";
import {
  complexAbsSq,
  stateToBlochAngles,
  blochAnglesToCartesian,
  assertNormalized,
  getStandardGate,
  type Complex,
  type StateVector,
} from "@/engine/utils/quantum-math";

// ─────────────────────────────────────────────────────────────────────────────
// INPUT TYPE
// ─────────────────────────────────────────────────────────────────────────────

interface QubitBlochSphereInputs extends Record<string, unknown> {
  readonly stateSequence: ReadonlyArray<{
    readonly label: string;
    readonly amplitudes: readonly [number, number, number, number];
    readonly gate?: string;
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER
// ─────────────────────────────────────────────────────────────────────────────

/** Format a complex number for display in explanations. */
function formatComplex(z: Complex): string {
  const [re, im] = z;
  if (Math.abs(im) < 1e-10) return re.toFixed(4);
  if (Math.abs(re) < 1e-10) return `${im.toFixed(4)}i`;
  return `${re.toFixed(4)} ${im >= 0 ? "+" : "\u2212"} ${Math.abs(im).toFixed(4)}i`;
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

export default createGenerator<QubitBlochSphereInputs>({
  id: "qubit-bloch-sphere",

  *generate(inputs, step) {
    const { stateSequence } = inputs;

    // ── Step 0: Introduction ─────────────────────────────────────────
    yield step({
      id: "introduction",
      title: "What is a Qubit?",
      explanation:
        "A classical bit is either 0 or 1. A qubit can be in a superposition: " +
        "|ψ⟩ = α₀|0⟩ + α₁|1⟩, where α₀ and α₁ are complex numbers satisfying " +
        "|α₀|² + |α₁|² = 1. The Bloch sphere represents all possible single-qubit states.",
      state: {
        stateSequence: [...stateSequence],
        currentIndex: -1,
        alpha0: [1, 0] as Complex,
        alpha1: [0, 0] as Complex,
        theta: 0,
        phi: 0,
        blochX: 0,
        blochY: 0,
        blochZ: 1,
        probZero: 1,
        probOne: 0,
      },
      visualActions: [
        {
          type: "rotateBlochSphere",
          theta: 0,
          phi: 0,
          label: "|0⟩",
        },
        {
          type: "showProbabilities",
          probabilities: [1, 0],
          labels: ["|0⟩", "|1⟩"],
        },
      ],
      codeHighlight: { language: "pseudocode", lines: [1, 2] },
      phase: "introduction",
    });

    // ── Steps 1..N: Show each state in the sequence ──────────────────
    for (let i = 0; i < stateSequence.length; i++) {
      const entry = stateSequence[i]!;
      const [a0Re, a0Im, a1Re, a1Im] = entry.amplitudes;
      const alpha0: Complex = [a0Re, a0Im];
      const alpha1: Complex = [a1Re, a1Im];
      const stateVec: StateVector = [alpha0, alpha1];

      // Validate normalization
      assertNormalized(stateVec, `state "${entry.label}"`);

      // Compute Bloch sphere angles and Cartesian coordinates
      const { theta, phi } = stateToBlochAngles([alpha0, alpha1]);
      const { x: blochX, y: blochY, z: blochZ } = blochAnglesToCartesian(theta, phi);

      // Compute measurement probabilities
      const probZero = complexAbsSq(alpha0);
      const probOne = complexAbsSq(alpha1);

      const visualActions: VisualAction[] = [
        {
          type: "rotateBlochSphere",
          theta,
          phi,
          label: entry.label,
        },
        {
          type: "showProbabilities",
          probabilities: [probZero, probOne],
          labels: ["|0⟩", "|1⟩"],
        },
      ];

      // If a gate was applied, show the gate matrix
      if (entry.gate) {
        const gateMatrix = getStandardGate(entry.gate);
        if (gateMatrix) {
          visualActions.push({
            type: "showGateMatrix",
            gate: entry.gate,
            matrix: gateMatrix,
          });
        }
      }

      const explanation = entry.gate
        ? `Applying ${entry.gate} gate produces state ${entry.label}. ` +
          `α₀ = ${formatComplex(alpha0)}, α₁ = ${formatComplex(alpha1)}. ` +
          `P(|0⟩) = ${(probZero * 100).toFixed(1)}%, P(|1⟩) = ${(probOne * 100).toFixed(1)}%.`
        : `State: ${entry.label}. ` +
          `α₀ = ${formatComplex(alpha0)}, α₁ = ${formatComplex(alpha1)}. ` +
          `P(|0⟩) = ${(probZero * 100).toFixed(1)}%, P(|1⟩) = ${(probOne * 100).toFixed(1)}%.`;

      yield step({
        id: `show_state_${i}`,
        title: entry.gate ? `Apply ${entry.gate} → ${entry.label}` : `State: ${entry.label}`,
        explanation,
        state: {
          stateSequence: [...stateSequence],
          currentIndex: i,
          alpha0,
          alpha1,
          theta,
          phi,
          blochX,
          blochY,
          blochZ,
          probZero,
          probOne,
          gate: entry.gate ?? null,
        },
        visualActions,
        codeHighlight: { language: "pseudocode", lines: entry.gate ? [5, 6] : [3, 4] },
        phase: "exploration",
        isTerminal: i === stateSequence.length - 1,
      });
    }
  },
});
