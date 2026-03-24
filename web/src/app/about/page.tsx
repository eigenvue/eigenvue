/**
 * About page — comprehensive information about the Eigenvue open-source project.
 *
 * Sections:
 * 1. Hero — what Eigenvue is
 * 2. Mission — why it exists
 * 3. What's Inside — algorithm domains at a glance
 * 4. Key Capabilities — features overview
 * 5. Installation — pip & npm
 * 6. Source Code — GitHub repositories
 * 7. Technology — tech stack
 * 8. License & Contributing — open-source details
 */

import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { SectionWrapper } from "@/components/ui/SectionWrapper";
import { Button } from "@/components/ui/Button";
import { buildStaticPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildStaticPageMetadata(
  "About",
  "Learn about Eigenvue — an open-source interactive visualization platform for algorithms, deep learning, generative AI, and quantum computing. Available on pip and npm.",
  "/about",
);

/* ─── Data ──────────────────────────────────────────────────────────────────── */

const DOMAINS = [
  {
    name: "Classical Algorithms",
    count: 7,
    examples: "Binary Search, QuickSort, Merge Sort, BFS, DFS, Dijkstra's Algorithm, Bubble Sort",
    color: "text-classical",
    bg: "bg-classical-muted",
    border: "border-classical/30",
  },
  {
    name: "Deep Learning",
    count: 5,
    examples: "Perceptron, Feedforward Network, Backpropagation, 2D Convolution, Gradient Descent",
    color: "text-deeplearning",
    bg: "bg-deeplearning-muted",
    border: "border-deeplearning/30",
  },
  {
    name: "Generative AI",
    count: 5,
    examples:
      "Tokenization (BPE), Token Embeddings, Self-Attention, Multi-Head Attention, Transformer Block",
    color: "text-genai",
    bg: "bg-genai-muted",
    border: "border-genai/30",
  },
  {
    name: "Quantum Computing",
    count: 5,
    examples:
      "Qubit Bloch Sphere, Quantum Gates, Superposition & Measurement, Grover's Search, Quantum Teleportation",
    color: "text-quantum",
    bg: "bg-quantum-muted",
    border: "border-quantum/30",
  },
] as const;

const CAPABILITIES = [
  {
    title: "Step-by-Step Playback",
    description:
      "Play, pause, step forward, step backward, and scrub through every algorithm state at your own pace.",
  },
  {
    title: "Synchronized Code Highlighting",
    description:
      "Each step highlights the exact line being executed in pseudocode, Python, or JavaScript.",
  },
  {
    title: "Plain-Language Explanations",
    description:
      "Every step includes a human-readable explanation of what just happened and why it matters.",
  },
  {
    title: "Custom Inputs",
    description:
      "Supply your own arrays, graphs, or parameters and watch the algorithm adapt in real time.",
  },
  {
    title: "Shareable URLs",
    description:
      "Every visualization state is URL-encoded. Share the exact step you are looking at with a link.",
  },
  {
    title: "Jupyter Notebook Integration",
    description:
      "Embed interactive visualizations directly inside Jupyter notebooks with the Python package.",
  },
] as const;

const TECH_STACK = [
  { layer: "Web Application", tech: "Next.js 15, React 19, Canvas 2D, Tailwind CSS 4" },
  { layer: "Python Package", tech: "Python 3.10+, Flask, Hatchling" },
  { layer: "Node Package", tech: "TypeScript, tsup, zero runtime dependencies" },
  { layer: "Testing", tech: "Vitest, pytest, JSON Schema validation" },
  { layer: "CI / CD", tech: "GitHub Actions — lint, typecheck, test, build, deploy" },
  { layer: "Documentation", tech: "Astro + Starlight" },
] as const;

const REPOSITORIES = [
  {
    name: "eigenvue/eigenvue",
    href: "https://github.com/eigenvue/eigenvue",
    description:
      "Contains the web application, Python package, Node package, shared algorithm definitions, documentation site, and CI/CD workflows.",
  },
] as const;

/* ─── Component ─────────────────────────────────────────────────────────────── */

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background-page pt-24 pb-16">
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold text-text-primary md:text-5xl">
            About <span className="accent-text">Eigenvue</span>
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-text-secondary md:text-xl">
            Eigenvue is a free, open-source interactive visualization platform for algorithms, deep
            learning, generative AI, and quantum computing. It provides step-by-step animated
            dissections with synchronized code highlighting and plain-language explanations —
            available in the browser, via Python, and via Node.js.
          </p>
        </div>
      </Container>

      {/* ── Mission ──────────────────────────────────────────────────────────── */}
      <SectionWrapper id="mission" ariaLabelledBy="mission-heading">
        <Container>
          <div className="mx-auto max-w-3xl">
            <h2
              id="mission-heading"
              className="text-center text-3xl font-bold text-text-primary md:text-4xl"
            >
              Why <span className="accent-text">Eigenvue</span> Exists
            </h2>
            <div className="mt-8 space-y-4 text-base leading-relaxed text-text-secondary md:text-lg">
              <p>
                Understanding algorithms requires building spatial and temporal intuition that
                static diagrams and textbook pseudocode cannot provide. A bubble sort comparison,
                the propagation of gradients through a neural network, the rotation of a qubit on a
                Bloch sphere — these are inherently dynamic processes.
              </p>
              <p>
                Eigenvue provides a unified visual language across four domains — classical computer
                science, deep learning, generative AI, and quantum computing — with dual
                distribution: a web application for instant browser access, and programmatic
                packages (pip and npm) for integration into notebooks, scripts, and educational
                toolchains.
              </p>
            </div>
          </div>
        </Container>
      </SectionWrapper>

      {/* ── Algorithm Domains ────────────────────────────────────────────────── */}
      <SectionWrapper id="domains" ariaLabelledBy="domains-heading">
        <Container>
          <div className="mx-auto max-w-prose text-center">
            <h2 id="domains-heading" className="text-3xl font-bold text-text-primary md:text-4xl">
              22+ <span className="accent-text">Visualizations</span> Across Four Domains
            </h2>
            <p className="mt-4 text-lg text-text-secondary">
              From foundational sorting algorithms to quantum teleportation — each visualization is
              built with the same architecture and level of detail.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {DOMAINS.map((domain) => (
              <div
                key={domain.name}
                className={`rounded-xl border ${domain.border} bg-background-surface p-6 transition-all duration-normal hover:bg-background-elevated`}
              >
                <div className="flex items-baseline justify-between">
                  <h3 className={`text-lg font-semibold ${domain.color}`}>{domain.name}</h3>
                  <span className="font-mono text-sm text-text-tertiary">
                    {domain.count} algorithms
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                  {domain.examples}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </SectionWrapper>

      {/* ── Key Capabilities ─────────────────────────────────────────────────── */}
      <SectionWrapper id="capabilities" ariaLabelledBy="capabilities-heading">
        <Container>
          <div className="mx-auto max-w-prose text-center">
            <h2
              id="capabilities-heading"
              className="text-3xl font-bold text-text-primary md:text-4xl"
            >
              Key <span className="accent-text">Capabilities</span>
            </h2>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((cap) => (
              <div
                key={cap.title}
                className="rounded-xl border border-border bg-background-surface p-6 transition-all duration-normal hover:border-border-hover hover:bg-background-elevated"
              >
                <h3 className="text-base font-semibold text-text-primary">{cap.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  {cap.description}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </SectionWrapper>

      {/* ── Installation ─────────────────────────────────────────────────────── */}
      <SectionWrapper id="install" ariaLabelledBy="install-heading">
        <Container>
          <div className="mx-auto max-w-3xl">
            <h2
              id="install-heading"
              className="text-center text-3xl font-bold text-text-primary md:text-4xl"
            >
              Install via <span className="accent-text">pip</span> or{" "}
              <span className="accent-text">npm</span>
            </h2>
            <p className="mt-4 text-center text-lg text-text-secondary">
              Use the same visualizations programmatically in Python scripts, Jupyter notebooks, or
              Node.js applications.
            </p>

            <div className="mt-10 grid gap-6 md:grid-cols-2">
              {/* Python */}
              <div className="rounded-xl border border-border bg-background-surface p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-quantum-muted text-quantum">
                    <span className="text-lg font-bold" aria-hidden="true">
                      Py
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary">Python Package</h3>
                    <p className="text-xs text-text-tertiary">Python 3.10+</p>
                  </div>
                </div>
                <div className="mt-4 rounded-lg bg-background-page p-3">
                  <code className="font-mono text-sm text-text-primary">pip install eigenvue</code>
                </div>
                <ul className="mt-4 space-y-1.5 text-sm text-text-secondary">
                  <li>Minimal dependencies — only Flask</li>
                  <li>Optional Jupyter integration via IPython</li>
                  <li>Serves interactive visualizations locally</li>
                </ul>
                <div className="mt-4">
                  <a
                    href="https://pypi.org/project/eigenvue/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-quantum transition-colors duration-fast hover:text-quantum-light"
                  >
                    View on PyPI →
                  </a>
                </div>
              </div>

              {/* Node */}
              <div className="rounded-xl border border-border bg-background-surface p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-quantum-muted text-quantum">
                    <span className="text-lg font-bold" aria-hidden="true">
                      JS
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary">Node.js Package</h3>
                    <p className="text-xs text-text-tertiary">Node 18+</p>
                  </div>
                </div>
                <div className="mt-4 rounded-lg bg-background-page p-3">
                  <code className="font-mono text-sm text-text-primary">npm install eigenvue</code>
                </div>
                <ul className="mt-4 space-y-1.5 text-sm text-text-secondary">
                  <li>Zero runtime dependencies</li>
                  <li>TypeScript types included</li>
                  <li>CLI binary available globally</li>
                </ul>
                <div className="mt-4">
                  <a
                    href="https://www.npmjs.com/package/eigenvue"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-quantum transition-colors duration-fast hover:text-quantum-light"
                  >
                    View on npm →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </SectionWrapper>

      {/* ── Source Code ───────────────────────────────────────────────────────── */}
      <SectionWrapper id="source" ariaLabelledBy="source-heading">
        <Container>
          <div className="mx-auto max-w-3xl">
            <h2
              id="source-heading"
              className="text-center text-3xl font-bold text-text-primary md:text-4xl"
            >
              Open Source on <span className="accent-text">GitHub</span>
            </h2>
            <p className="mt-4 text-center text-lg text-text-secondary">
              Eigenvue is fully open source under the MIT License. Contributions, issues, and
              discussions are welcome.
            </p>

            <div className="mt-10 space-y-4">
              {REPOSITORIES.map((repo) => (
                <a
                  key={repo.name}
                  href={repo.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block rounded-xl border border-border bg-background-surface p-6 transition-all duration-normal hover:border-border-hover hover:bg-background-elevated"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg" aria-hidden="true">
                      {/* GitHub icon as inline SVG */}
                      <svg
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        className="h-5 w-5 text-text-primary"
                        aria-hidden="true"
                      >
                        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                      </svg>
                    </span>
                    <span className="font-mono text-base font-semibold text-text-primary">
                      {repo.name}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-text-secondary">{repo.description}</p>
                </a>
              ))}
            </div>
          </div>
        </Container>
      </SectionWrapper>

      {/* ── Architecture ─────────────────────────────────────────────────────── */}
      <SectionWrapper id="architecture" ariaLabelledBy="architecture-heading">
        <Container>
          <div className="mx-auto max-w-3xl">
            <h2
              id="architecture-heading"
              className="text-center text-3xl font-bold text-text-primary md:text-4xl"
            >
              Three-Layer <span className="accent-text">Architecture</span>
            </h2>
            <p className="mt-4 text-center text-lg text-text-secondary">
              A clean separation between algorithm logic, data format, and rendering.
            </p>

            <div className="mt-10 space-y-4">
              {[
                {
                  label: "Generator Layer",
                  detail:
                    "TypeScript and Python functions that produce Step sequences for each algorithm.",
                },
                {
                  label: "Step Format",
                  detail:
                    "A universal JSON contract (v1.0.0) that serves as the interface between generators and renderers.",
                },
                {
                  label: "Rendering Layer",
                  detail:
                    "A Canvas 2D engine with layouts, animation, and playback controls that consumes step data.",
                },
              ].map((layer, i) => (
                <div
                  key={layer.label}
                  className="flex gap-4 rounded-xl border border-border bg-background-surface p-5"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-quantum-muted font-mono text-sm font-bold text-quantum">
                    {i + 1}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-text-primary">{layer.label}</h3>
                    <p className="mt-1 text-sm text-text-secondary">{layer.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </SectionWrapper>

      {/* ── Tech Stack ───────────────────────────────────────────────────────── */}
      <SectionWrapper id="tech" ariaLabelledBy="tech-heading">
        <Container>
          <div className="mx-auto max-w-3xl">
            <h2
              id="tech-heading"
              className="text-center text-3xl font-bold text-text-primary md:text-4xl"
            >
              Technology <span className="accent-text">Stack</span>
            </h2>

            <div className="mt-10 overflow-hidden rounded-xl border border-border">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border bg-background-surface">
                    <th className="px-5 py-3 text-sm font-semibold text-text-primary">Layer</th>
                    <th className="px-5 py-3 text-sm font-semibold text-text-primary">
                      Technologies
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {TECH_STACK.map((row, i) => (
                    <tr
                      key={row.layer}
                      className={`border-b border-border last:border-b-0 ${
                        i % 2 === 0 ? "bg-background-page" : "bg-background-surface"
                      }`}
                    >
                      <td className="px-5 py-3 text-sm font-medium text-text-primary whitespace-nowrap">
                        {row.layer}
                      </td>
                      <td className="px-5 py-3 font-mono text-sm text-text-secondary">
                        {row.tech}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Container>
      </SectionWrapper>

      {/* ── License & Contributing ───────────────────────────────────────────── */}
      <SectionWrapper id="license" ariaLabelledBy="license-heading">
        <Container>
          <div className="mx-auto max-w-3xl">
            <h2
              id="license-heading"
              className="text-center text-3xl font-bold text-text-primary md:text-4xl"
            >
              License & <span className="accent-text">Contributing</span>
            </h2>

            <div className="mt-10 grid gap-6 md:grid-cols-2">
              {/* License */}
              <div className="rounded-xl border border-border bg-background-surface p-6">
                <h3 className="text-lg font-semibold text-text-primary">MIT License</h3>
                <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                  Eigenvue is released under the{" "}
                  <a
                    href="https://github.com/eigenvue/eigenvue/blob/main/LICENSE"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-quantum transition-colors duration-fast hover:text-quantum-light"
                  >
                    MIT License
                  </a>
                  . You are free to use, modify, and distribute it for any purpose — personal,
                  educational, or commercial — with attribution.
                </p>
              </div>

              {/* Contributing */}
              <div className="rounded-xl border border-border bg-background-surface p-6">
                <h3 className="text-lg font-semibold text-text-primary">Contributions Welcome</h3>
                <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                  Bug reports, feature requests, new algorithm implementations, and documentation
                  improvements are all welcome. See the{" "}
                  <a
                    href="https://github.com/eigenvue/eigenvue/blob/main/CONTRIBUTING.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-quantum transition-colors duration-fast hover:text-quantum-light"
                  >
                    Contributing Guide
                  </a>{" "}
                  for development setup, branching strategy, and code standards.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </SectionWrapper>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <SectionWrapper className="relative" ariaLabelledBy="about-cta-heading">
        {/* Background glow */}
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          aria-hidden="true"
        >
          <div
            className="h-[400px] w-[600px] rounded-full opacity-30 blur-[100px]"
            style={{
              background:
                "radial-gradient(ellipse, rgba(13,148,136,0.2) 0%, rgba(15,118,110,0.08) 50%, transparent 80%)",
            }}
          />
        </div>

        <Container className="relative z-10">
          <div className="mx-auto max-w-2xl text-center">
            <h2 id="about-cta-heading" className="text-3xl font-bold text-text-primary md:text-4xl">
              Start <span className="accent-text">Learning</span> Today
            </h2>
            <p className="mt-4 text-lg text-text-secondary">
              No account required. No installation needed. Pick an algorithm and see it in action.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Button variant="primary" size="lg" href="/algorithms">
                Browse Algorithms
                <span aria-hidden="true" className="ml-1">
                  →
                </span>
              </Button>
              <Button
                variant="secondary"
                size="lg"
                href="https://github.com/eigenvue/eigenvue"
                target="_blank"
                rel="noopener noreferrer"
              >
                View on GitHub
              </Button>
            </div>
          </div>
        </Container>
      </SectionWrapper>
    </div>
  );
}
