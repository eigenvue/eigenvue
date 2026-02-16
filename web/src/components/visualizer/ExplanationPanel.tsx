/**
 * @fileoverview Explanation Panel — Step title, explanation, and education content.
 *
 * The right-side panel of the visualizer layout. Shows:
 * 1. The current step's title (large heading).
 * 2. The current step's explanation (body text).
 * 3. The phase badge (if the step has a phase).
 * 4. A step counter ("Step 5 of 12").
 * 5. Collapsible sections for education content (concepts, pitfalls, quiz).
 *
 * ACCESSIBILITY: All content is plain text and fully accessible to screen readers.
 * The step change is announced via aria-live.
 */

"use client";

import type { Step } from "@/shared/types/step";
import type { AlgorithmMeta } from "@/lib/algorithm-loader";

interface ExplanationPanelProps {
  /** The current step. Null if no steps loaded yet. */
  readonly currentStep: Step | null;
  /** Total number of steps. */
  readonly totalSteps: number;
  /** Algorithm metadata (for education content). */
  readonly meta: AlgorithmMeta;
}

export function ExplanationPanel({ currentStep, totalSteps, meta }: ExplanationPanelProps) {
  return (
    <div className="flex flex-col h-full bg-background-surface rounded-lg border border-border overflow-hidden min-h-0">
      {/* ── Step Header ─────────────────────────────────────────── */}
      <div className="p-4 border-b border-border" aria-live="polite" aria-atomic="true">
        {currentStep ? (
          <>
            {/* Step counter */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-text-tertiary">
                Step {currentStep.index + 1} of {totalSteps}
              </span>
              {currentStep.phase && (
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-background-elevated text-text-secondary">
                  {currentStep.phase}
                </span>
              )}
            </div>
            {/* Step title */}
            <h2 className="text-lg font-semibold text-text-primary mb-2">{currentStep.title}</h2>
            {/* Step explanation */}
            <p className="text-sm text-text-secondary leading-relaxed">{currentStep.explanation}</p>
          </>
        ) : (
          <p className="text-sm text-text-tertiary italic">Loading algorithm...</p>
        )}
      </div>

      {/* ── Algorithm Info ───────────────────────────────────────── */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Complexity */}
        <div>
          <h3 className="text-xs font-mono text-text-tertiary uppercase tracking-wider mb-1">
            Complexity
          </h3>
          <div className="flex gap-4 text-sm">
            <span className="text-text-secondary">
              Time: <span className="font-mono text-text-primary">{meta.complexity.time}</span>
            </span>
            <span className="text-text-secondary">
              Space: <span className="font-mono text-text-primary">{meta.complexity.space}</span>
            </span>
          </div>
        </div>

        {/* Key Concepts */}
        {meta.education.keyConcepts.length > 0 && (
          <details className="group">
            <summary className="text-xs font-mono text-text-tertiary uppercase tracking-wider cursor-pointer hover:text-text-secondary">
              Key Concepts ({meta.education.keyConcepts.length})
            </summary>
            <div className="mt-2 space-y-2">
              {meta.education.keyConcepts.map((concept, i) => (
                <div key={i} className="text-sm">
                  <h4 className="text-text-primary font-medium">{concept.title}</h4>
                  <p className="text-text-secondary mt-0.5">{concept.description}</p>
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Common Pitfalls */}
        {meta.education.pitfalls.length > 0 && (
          <details className="group">
            <summary className="text-xs font-mono text-text-tertiary uppercase tracking-wider cursor-pointer hover:text-text-secondary">
              Common Pitfalls ({meta.education.pitfalls.length})
            </summary>
            <div className="mt-2 space-y-2">
              {meta.education.pitfalls.map((pitfall, i) => (
                <div key={i} className="text-sm">
                  <h4 className="text-text-primary font-medium">{pitfall.title}</h4>
                  <p className="text-text-secondary mt-0.5">{pitfall.description}</p>
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Description */}
        <details>
          <summary className="text-xs font-mono text-text-tertiary uppercase tracking-wider cursor-pointer hover:text-text-secondary">
            About This Algorithm
          </summary>
          <p className="mt-2 text-sm text-text-secondary leading-relaxed">
            {meta.description.long}
          </p>
        </details>
      </div>
    </div>
  );
}
