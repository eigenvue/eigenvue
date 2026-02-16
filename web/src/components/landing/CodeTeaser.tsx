/**
 * CodeTeaser — shows a mock code editor demonstrating the Python API.
 *
 * Layout (desktop):
 * - Left: text description with heading and feature bullets
 * - Right: styled code block resembling a terminal/editor
 *
 * The code block uses a dark elevated background, monospace font,
 * line numbers, and syntax coloring via inline styles (no
 * syntax highlighting library needed for a static code block).
 */

import { Container } from "@/components/ui/Container";
import { SectionWrapper } from "@/components/ui/SectionWrapper";
import { Button } from "@/components/ui/Button";

/**
 * Static code lines for the mock editor.
 * Each line is an array of [text, colorClass] segments.
 * Color classes reference Tailwind text colors.
 */
const CODE_LINES: Array<Array<[string, string]>> = [
  [["import", "text-genai"], [" eigenvue", "text-text-primary"]],
  [["", "text-text-primary"]],
  [["# List all available algorithms", "text-text-disabled"]],
  [["eigenvue", "text-text-primary"], [".", "text-text-tertiary"], ["list", "text-classical"], ["()", "text-text-tertiary"]],
  [["", "text-text-primary"]],
  [["# Visualize self-attention interactively", "text-text-disabled"]],
  [["eigenvue", "text-text-primary"], [".", "text-text-tertiary"], ["show", "text-classical"], ["(", "text-text-tertiary"], ['"self-attention"', "text-genai"], [")", "text-text-tertiary"]],
  [["", "text-text-primary"]],
  [["# Use in Jupyter notebooks", "text-text-disabled"]],
  [["eigenvue", "text-text-primary"], [".", "text-text-tertiary"], ["jupyter", "text-classical"], ["(", "text-text-tertiary"], ['"transformer-block"', "text-genai"], [")", "text-text-tertiary"]],
];

export function CodeTeaser() {
  return (
    <SectionWrapper id="python-package" ariaLabelledBy="code-teaser-heading">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* ─── Text Column ─── */}
          <div>
            <h2
              id="code-teaser-heading"
              className="text-3xl font-bold text-text-primary md:text-4xl"
            >
              Works Where <span className="gradient-text">You Work</span>
            </h2>
            <p className="mt-4 text-lg text-text-secondary">
              Install the Python package and use the same visualizations
              in Jupyter notebooks, scripts, and research workflows.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <code className="rounded-lg bg-background-elevated px-4 py-2 font-mono text-sm text-text-primary">
                pip install eigenvue
              </code>
              <code className="rounded-lg bg-background-elevated px-4 py-2 font-mono text-sm text-text-primary">
                npm install eigenvue
              </code>
            </div>
            <div className="mt-8">
              <Button variant="secondary" href="/docs">
                Read the Docs
                <span aria-hidden="true" className="ml-1">→</span>
              </Button>
            </div>
          </div>

          {/* ─── Code Editor Mockup ─── */}
          <div
            className="overflow-hidden rounded-xl border border-border bg-background-elevated"
            role="img"
            aria-label="Code example showing eigenvue Python API usage"
          >
            {/* Title bar */}
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <div className="h-3 w-3 rounded-full bg-red-500/50" aria-hidden="true" />
              <div className="h-3 w-3 rounded-full bg-yellow-500/50" aria-hidden="true" />
              <div className="h-3 w-3 rounded-full bg-green-500/50" aria-hidden="true" />
              <span className="ml-2 font-mono text-xs text-text-tertiary">
                example.py
              </span>
            </div>

            {/* Code content */}
            <div className="overflow-x-auto p-4">
              <pre className="font-mono text-sm leading-relaxed">
                {CODE_LINES.map((segments, lineIndex) => (
                  <div key={lineIndex} className="flex">
                    {/* Line number */}
                    <span className="mr-6 inline-block w-5 select-none text-right text-text-disabled">
                      {lineIndex + 1}
                    </span>
                    {/* Code segments */}
                    <span>
                      {segments.map(([text, colorClass], segIndex) => (
                        <span key={segIndex} className={colorClass}>
                          {text}
                        </span>
                      ))}
                    </span>
                  </div>
                ))}
              </pre>
            </div>
          </div>
        </div>
      </Container>
    </SectionWrapper>
  );
}
