/**
 * IntegrationSection — shows how to use Eigenvue: the editor and the Python/npm packages.
 *
 * Two cards side by side on desktop:
 * 1. Custom Editor — write your own algorithms with the step() API
 * 2. Python & npm — pip install / npm install for Jupyter and scripts
 *
 * This replaces the separate EditorTeaser + CodeTeaser with a single,
 * denser section.
 */

import { Container } from "@/components/ui/Container";
import { SectionWrapper } from "@/components/ui/SectionWrapper";
import { Button } from "@/components/ui/Button";

const EDITOR_CODE: Array<Array<[string, string]>> = [
  [
    ["const", "text-purple-400"],
    [" arr = [", "text-slate-200"],
    ["14, 27, 3, 42", "text-teal-400"],
    ["];", "text-slate-200"],
  ],
  [
    ["for", "text-purple-400"],
    [" (", "text-slate-400"],
    ["let", "text-purple-400"],
    [" i = 0; i < arr.length; i++) {", "text-slate-200"],
  ],
  [
    ["  step", "text-emerald-400"],
    ["({ title: ", "text-slate-200"],
    ["`Check ${i}`", "text-teal-300"],
    [" });", "text-slate-400"],
  ],
  [["}", "text-slate-200"]],
];

const PYTHON_CODE: Array<Array<[string, string]>> = [
  [
    ["import", "text-purple-400"],
    [" eigenvue", "text-slate-200"],
  ],
  [["", "text-slate-200"]],
  [
    ["eigenvue", "text-slate-200"],
    [".", "text-slate-400"],
    ["show", "text-teal-400"],
    ["(", "text-slate-400"],
    ['"self-attention"', "text-teal-300"],
    [")", "text-slate-400"],
  ],
  [
    ["eigenvue", "text-slate-200"],
    [".", "text-slate-400"],
    ["jupyter", "text-teal-400"],
    ["(", "text-slate-400"],
    ['"transformer"', "text-teal-300"],
    [")", "text-slate-400"],
  ],
];

function MiniCodeBlock({
  lines,
  filename,
}: {
  lines: Array<Array<[string, string]>>;
  filename: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-[#0c1210]">
      <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2">
        <div className="flex gap-1">
          <div className="h-2 w-2 rounded-full bg-red-400/40" />
          <div className="h-2 w-2 rounded-full bg-yellow-400/40" />
          <div className="h-2 w-2 rounded-full bg-green-400/40" />
        </div>
        <span className="font-mono text-[10px] text-slate-500">{filename}</span>
      </div>
      <div className="p-3">
        <pre className="font-mono text-xs leading-relaxed">
          {lines.map((segments, li) => (
            <div key={li}>
              {segments.map(([text, color], si) => (
                <span key={si} className={color}>
                  {text}
                </span>
              ))}
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}

export function IntegrationSection() {
  return (
    <SectionWrapper id="integration" ariaLabelledBy="integration-heading">
      <Container>
        <div className="mx-auto max-w-prose text-center">
          <h2 id="integration-heading" className="text-3xl font-bold text-text-primary md:text-4xl">
            Use It <span className="accent-text">Your Way</span>
          </h2>
          <p className="mt-4 text-lg text-text-secondary">
            Build custom visualizations in the browser editor, or integrate into your existing
            Python and JavaScript workflows.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {/* Card 1: Editor */}
          <div className="flex flex-col rounded-xl border border-border bg-background-surface p-6">
            <h3 className="text-xl font-semibold text-text-primary">Custom Algorithm Editor</h3>
            <p className="mt-2 text-sm text-text-secondary">
              Write JavaScript using the{" "}
              <code className="rounded bg-background-elevated px-1 py-0.5 font-mono text-xs text-accent">
                step()
              </code>{" "}
              API. Choose from 13 built-in visualization layouts.
            </p>
            <div className="mt-4 flex-1">
              <MiniCodeBlock lines={EDITOR_CODE} filename="my-algorithm.js" />
            </div>
            <ul className="mt-4 space-y-1.5 text-xs text-text-secondary">
              <li className="flex items-center gap-2">
                <svg
                  className="h-3.5 w-3.5 shrink-0 text-btn-primary"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Sandboxed execution with real-time visualization
              </li>
              <li className="flex items-center gap-2">
                <svg
                  className="h-3.5 w-3.5 shrink-0 text-btn-primary"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                6 starter templates · Share via URL
              </li>
            </ul>
            <div className="mt-5">
              <Button variant="primary" size="md" href="/editor?template=array-binary-search">
                Try the Editor &#x2192;
              </Button>
            </div>
          </div>

          {/* Card 2: Python & npm */}
          <div className="flex flex-col rounded-xl border border-border bg-background-surface p-6">
            <h3 className="text-xl font-semibold text-text-primary">Python &amp; npm Packages</h3>
            <p className="mt-2 text-sm text-text-secondary">
              Use the same visualizations in Jupyter notebooks, Python scripts, or any JavaScript
              project.
            </p>
            <div className="mt-4 flex-1">
              <MiniCodeBlock lines={PYTHON_CODE} filename="example.py" />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <code className="rounded-md bg-background-elevated px-3 py-1.5 font-mono text-xs text-text-primary">
                pip install eigenvue
              </code>
              <code className="rounded-md bg-background-elevated px-3 py-1.5 font-mono text-xs text-text-primary">
                npm install eigenvue
              </code>
            </div>
            <div className="mt-5">
              <Button variant="secondary" size="md" href="/docs">
                Read the Docs &#x2192;
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </SectionWrapper>
  );
}
