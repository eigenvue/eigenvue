/**
 * EditorTeaser — promotes the custom algorithm editor on the landing page.
 *
 * Shows a code editor mockup with JavaScript generator code and a CTA
 * linking to /editor?template=array-binary-search.
 */

import { Container } from "@/components/ui/Container";
import { SectionWrapper } from "@/components/ui/SectionWrapper";
import { Button } from "@/components/ui/Button";

/**
 * Static code lines for the editor mockup.
 * Shows a simplified version of the step() API.
 */
const CODE_LINES: Array<Array<[string, string]>> = [
  [
    ["const", "text-purple-400"],
    [" array = [", "text-text-primary"],
    ["14, 27, 3, 42, 8", "text-teal-400"],
    ["];", "text-text-primary"],
  ],
  [
    ["const", "text-purple-400"],
    [" target = ", "text-text-primary"],
    ["42", "text-teal-400"],
    [";", "text-text-primary"],
  ],
  [["", "text-text-primary"]],
  [
    ["for", "text-purple-400"],
    [" (", "text-text-tertiary"],
    ["let", "text-purple-400"],
    [" i = ", "text-text-primary"],
    ["0", "text-teal-400"],
    ["; i < array.length; i++) {", "text-text-primary"],
  ],
  [
    ["  step", "text-emerald-400"],
    ["({", "text-text-tertiary"],
  ],
  [
    ["    title: ", "text-text-primary"],
    ["`Check index ${i}`", "text-teal-300"],
    [",", "text-text-tertiary"],
  ],
  [
    ["    state: ", "text-text-primary"],
    ["{ array, i }", "text-text-primary"],
    [",", "text-text-tertiary"],
  ],
  [
    ["    visualActions: ", "text-text-primary"],
    ["[{ type: ", "text-text-primary"],
    ['"highlightElement"', "text-teal-300"],
    [", index: i }]", "text-text-primary"],
  ],
  [
    ["  }", "text-text-tertiary"],
    [");", "text-text-tertiary"],
  ],
  [["}", "text-text-primary"]],
];

export function EditorTeaser() {
  return (
    <SectionWrapper id="editor-teaser" ariaLabelledBy="editor-teaser-heading">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* ─── Code Editor Mockup ─── */}
          <div
            className="overflow-hidden rounded-xl border border-border bg-[#0a0a1a] order-2 lg:order-1"
            role="img"
            aria-label="Code example showing the Eigenvue editor step() API"
          >
            {/* Title bar */}
            <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-3">
              <div className="h-3 w-3 rounded-full bg-red-500/50" aria-hidden="true" />
              <div className="h-3 w-3 rounded-full bg-yellow-500/50" aria-hidden="true" />
              <div className="h-3 w-3 rounded-full bg-green-500/50" aria-hidden="true" />
              <span className="ml-2 font-mono text-xs text-slate-500">my-algorithm.js</span>
            </div>

            {/* Code content */}
            <div className="overflow-x-auto p-4">
              <pre className="font-mono text-sm leading-relaxed">
                {CODE_LINES.map((segments, lineIndex) => (
                  <div key={lineIndex} className="flex">
                    <span className="mr-6 inline-block w-5 select-none text-right text-slate-600">
                      {lineIndex + 1}
                    </span>
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

          {/* ─── Text Column ─── */}
          <div className="order-1 lg:order-2">
            <h2
              id="editor-teaser-heading"
              className="text-3xl font-bold text-text-primary md:text-4xl"
            >
              Build Your Own <span className="accent-text">Algorithms</span>
            </h2>
            <p className="mt-4 text-lg text-text-secondary">
              Write JavaScript code using the{" "}
              <code className="rounded bg-background-elevated px-1.5 py-0.5 font-mono text-sm text-teal-400">
                step()
              </code>{" "}
              API and see your algorithm come to life. Choose from 13 built-in layouts spanning
              classical algorithms, neural networks, attention mechanisms, and quantum circuits.
            </p>
            <ul className="mt-6 space-y-2 text-text-secondary">
              <li className="flex items-center gap-2">
                <span className="text-teal-400" aria-hidden="true">
                  &#x2713;
                </span>
                Sandboxed execution with real-time visualization
              </li>
              <li className="flex items-center gap-2">
                <span className="text-teal-400" aria-hidden="true">
                  &#x2713;
                </span>
                6 starter templates across all domains
              </li>
              <li className="flex items-center gap-2">
                <span className="text-teal-400" aria-hidden="true">
                  &#x2713;
                </span>
                Share your creations via URL
              </li>
            </ul>
            <div className="mt-8">
              <Button variant="primary" href="/editor?template=array-binary-search">
                Try the Editor
                <span aria-hidden="true" className="ml-1">
                  &#x2192;
                </span>
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </SectionWrapper>
  );
}
