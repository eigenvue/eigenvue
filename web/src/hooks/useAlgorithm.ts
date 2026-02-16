/**
 * @fileoverview useAlgorithm — Algorithm loading and step generation hook.
 *
 * Encapsulates the complete lifecycle of loading an algorithm generator,
 * running it with inputs, and managing the resulting step sequence.
 *
 * RESPONSIBILITIES:
 * 1. Dynamically import the algorithm's generator module.
 * 2. Run the generator with the current inputs to produce a StepSequence.
 * 3. Re-run the generator when inputs change.
 * 4. Expose the current inputs, step sequence, error state, and an
 *    input-change handler.
 *
 * DESIGN DECISION: This hook is separated from usePlayback so that
 * algorithm concerns (loading, generation) are decoupled from playback
 * concerns (play/pause, speed, step navigation). The VisualizerShell
 * composes both hooks together.
 *
 * See Phase5_Implementation.md — Deliverable #23.
 */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

import type { AlgorithmMeta } from "@/lib/algorithm-loader";
import { loadGenerator } from "@/lib/algorithm-loader";
import type { StepSequence } from "@/shared/types/step";
import type { UrlState } from "@/lib/url-state";
import { runGenerator } from "@/engine/generator";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AlgorithmState {
  /** The current input parameters. */
  readonly inputs: Record<string, unknown>;
  /** The generated step sequence, or null if not yet generated / on error. */
  readonly stepSequence: StepSequence | null;
  /** Error message if generation failed, or null on success. */
  readonly error: string | null;
}

export interface AlgorithmControls {
  /**
   * Update the inputs and trigger re-generation.
   * Called by the InputEditor when the user clicks "Run".
   */
  setInputs: (newInputs: Record<string, unknown>) => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Custom hook for loading an algorithm generator and producing step sequences.
 *
 * @param algorithmId - The algorithm's URL-safe identifier (e.g., "binary-search").
 * @param meta        - The algorithm's metadata (from meta.json via the loader).
 * @param urlState    - Parsed URL state (for initial inputs and example selection).
 * @returns A tuple of [AlgorithmState, AlgorithmControls].
 *
 * @example
 * ```tsx
 * const [algoState, algoControls] = useAlgorithm(algorithmId, meta, urlState);
 * const { inputs, stepSequence, error } = algoState;
 * ```
 */
export function useAlgorithm(
  algorithmId: string,
  meta: AlgorithmMeta,
  urlState: UrlState,
): [AlgorithmState, AlgorithmControls] {
  // ── Determine initial inputs ────────────────────────────────────────
  const initialInputs = useMemo(() => {
    if (urlState.inputs) return urlState.inputs;
    if (urlState.exampleName) {
      const example = meta.inputs.examples.find((e) => e.name === urlState.exampleName);
      if (example) return example.values;
    }
    return meta.inputs.defaults;
  }, [urlState, meta.inputs]);

  // ── Current inputs (can change when user edits and re-runs) ─────────
  const [inputs, setInputsState] = useState<Record<string, unknown>>(initialInputs);

  // ── Step sequence and error state ───────────────────────────────────
  const [stepSequence, setStepSequence] = useState<StepSequence | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Dynamically import and run the generator ────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function generate() {
      try {
        // Load the generator via the algorithm registry.
        // This uses static import paths (one per algorithm) rather than a
        // template-literal dynamic import, which bundlers cannot resolve.
        const generator = await loadGenerator(algorithmId);

        if (cancelled) return;

        if (!generator) {
          setError(`No generator found for algorithm "${algorithmId}".`);
          setStepSequence(null);
          return;
        }

        const result = runGenerator(generator, inputs);
        setStepSequence(result);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to generate steps.");
        setStepSequence(null);
      }
    }

    generate();
    return () => {
      cancelled = true;
    };
  }, [algorithmId, inputs]);

  // ── Controls ────────────────────────────────────────────────────────
  const setInputs = useCallback((newInputs: Record<string, unknown>) => {
    setInputsState(newInputs);
    // The useEffect above will re-generate steps automatically.
  }, []);

  const state: AlgorithmState = { inputs, stepSequence, error };
  const controls: AlgorithmControls = { setInputs };

  return [state, controls];
}
