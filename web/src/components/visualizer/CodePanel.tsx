/**
 * @fileoverview Code Panel — Syntax-highlighted code with active line marking.
 *
 * Displays the algorithm's source code with the lines relevant to the
 * current step visually highlighted. Supports multiple language tabs
 * (pseudocode, Python, JavaScript) as defined in meta.json.
 *
 * RENDERING APPROACH:
 * We use a simple custom renderer (no external syntax highlighting library)
 * that applies a background highlight to active lines. The code is displayed
 * in a monospace font with line numbers. This keeps the bundle size small
 * and avoids runtime syntax parsing. For v1, keyword-level coloring is NOT
 * implemented — the active-line highlight is the primary visual cue.
 *
 * Future enhancement: integrate a lightweight syntax highlighter like
 * Shiki (build-time) or Prism (runtime) for keyword-level coloring.
 *
 * ACCESSIBILITY:
 * - The code region has role="region" and aria-label for screen readers.
 * - Active lines are announced via an aria-live region.
 * - Language tabs are a tablist with proper ARIA roles.
 */

"use client";

import { useState, useMemo } from "react";
import type { CodeHighlight } from "@/shared/types/step";

// ─── Props ───────────────────────────────────────────────────────────────────

interface CodePanelProps {
  /** Code implementations from meta.json: { pseudocode: "...", python: "...", ... } */
  readonly implementations: Record<string, string>;
  /** The default language tab to show. */
  readonly defaultLanguage: string;
  /** The current step's code highlight (language + line numbers). Null if no step. */
  readonly codeHighlight: CodeHighlight | null;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CodePanel({
  implementations,
  defaultLanguage,
  codeHighlight,
}: CodePanelProps) {
  const languages = useMemo(() => Object.keys(implementations), [implementations]);
  const [activeLanguage, setActiveLanguage] = useState(defaultLanguage);

  // The code string for the currently selected language tab.
  const code = implementations[activeLanguage] ?? "";
  const lines = useMemo(() => code.split("\n"), [code]);

  // Active line numbers for highlighting (1-indexed).
  // Only highlight if the current step's language matches the active tab.
  const activeLines = useMemo(() => {
    if (!codeHighlight) return new Set<number>();
    if (codeHighlight.language !== activeLanguage) return new Set<number>();
    return new Set(codeHighlight.lines);
  }, [codeHighlight, activeLanguage]);

  return (
    <div className="flex flex-col h-full bg-background-surface rounded-lg border border-border overflow-hidden">
      {/* ── Language Tabs ───────────────────────────────────────────── */}
      <div
        role="tablist"
        aria-label="Code language"
        className="flex border-b border-border px-2 pt-2 gap-1"
      >
        {languages.map((lang) => (
          <button
            key={lang}
            role="tab"
            aria-selected={lang === activeLanguage}
            aria-controls={`code-panel-${lang}`}
            onClick={() => setActiveLanguage(lang)}
            className={`
              px-3 py-1.5 text-xs font-mono rounded-t-md transition-colors
              ${lang === activeLanguage
                ? "bg-background-elevated text-text-primary border-b-2 border-classical"
                : "text-text-tertiary hover:text-text-secondary"
              }
            `}
          >
            {lang}
          </button>
        ))}
      </div>

      {/* ── Code Display ───────────────────────────────────────────── */}
      <div
        id={`code-panel-${activeLanguage}`}
        role="region"
        aria-label={`${activeLanguage} source code`}
        className="flex-1 overflow-auto p-0"
      >
        <pre className="text-sm leading-6 font-mono">
          <code>
            {lines.map((line, i) => {
              const lineNum = i + 1; // 1-indexed for display and matching.
              const isActive = activeLines.has(lineNum);
              return (
                <div
                  key={lineNum}
                  className={`
                    flex px-4 min-h-[1.5rem]
                    ${isActive
                      ? "bg-classical/15 border-l-2 border-classical"
                      : "border-l-2 border-transparent"
                    }
                  `}
                >
                  {/* Line number */}
                  <span
                    className={`
                      inline-block w-8 text-right mr-4 select-none flex-shrink-0
                      ${isActive ? "text-classical" : "text-text-disabled"}
                    `}
                    aria-hidden="true"
                  >
                    {lineNum}
                  </span>
                  {/* Line content */}
                  <span className={isActive ? "text-text-primary" : "text-text-secondary"}>
                    {line || " " /* Preserve empty lines */}
                  </span>
                </div>
              );
            })}
          </code>
        </pre>
      </div>

      {/* ── Accessible live region for active line changes ────────── */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {codeHighlight
          ? `Active code: lines ${codeHighlight.lines.join(", ")} in ${codeHighlight.language}`
          : "No active code lines"}
      </div>
    </div>
  );
}
