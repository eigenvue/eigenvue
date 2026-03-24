/**
 * ContributePageClient — client component for the Contribute page.
 *
 * Contains all interactive elements (copy-to-clipboard buttons, expandable
 * code blocks) and uses SectionWrapper for scroll-triggered animations.
 */

"use client";

import { useState, useCallback } from "react";
import { Container } from "@/components/ui/Container";
import { SectionWrapper } from "@/components/ui/SectionWrapper";
import { Button } from "@/components/ui/Button";

/* ─── Data ──────────────────────────────────────────────────────────────────── */

const CONTRIBUTION_TYPES = [
  {
    icon: "+",
    title: "Add an Algorithm",
    description:
      "Implement a new algorithm visualization — write the generator, define metadata, and create layout mappings.",
    difficulty: "Intermediate",
    link: "https://eigenvue.web.app/docs/contributing/adding-an-algorithm/",
  },
  {
    icon: "\u2261",
    title: "Improve Documentation",
    description:
      "Fix typos, clarify explanations, add examples, or write new guides. Great for a first contribution.",
    difficulty: "Beginner",
    link: "https://github.com/eigenvue/eigenvue/labels/documentation",
  },
  {
    icon: "\u2717",
    title: "Fix a Bug",
    description:
      "Browse open issues, reproduce the bug, write a failing test, then fix it. Every fix makes the platform better.",
    difficulty: "Varies",
    link: "https://github.com/eigenvue/eigenvue/labels/bug",
  },
  {
    icon: "\u25b7",
    title: "Enhance the Renderer",
    description:
      "Work on the Canvas 2D rendering engine — add new layout types, improve animations, or optimize performance.",
    difficulty: "Advanced",
    link: "https://eigenvue.web.app/docs/api-reference/typescript-generator-api/",
  },
  {
    icon: "\u21c4",
    title: "Cross-Language Parity",
    description:
      "Ensure Python and TypeScript generators produce byte-identical output. Write parity tests and fix divergences.",
    difficulty: "Intermediate",
    link: "https://eigenvue.web.app/docs/contributing/cross-language-parity/",
  },
  {
    icon: "\u2605",
    title: "Write Tests",
    description:
      "Increase test coverage with unit tests (Vitest, pytest), snapshot tests, or integration tests.",
    difficulty: "Beginner",
    link: "https://eigenvue.web.app/docs/contributing/writing-tests/",
  },
] as const;

const WORKFLOW_STEPS = [
  {
    step: 1,
    title: "Fork & Clone",
    terminal: [
      { type: "comment" as const, text: "# Fork on GitHub, then clone your fork" },
      { type: "command" as const, text: "git clone https://github.com/<you>/eigenvue.git" },
      { type: "command" as const, text: "cd eigenvue" },
    ],
  },
  {
    step: 2,
    title: "Create a Branch",
    terminal: [
      { type: "comment" as const, text: "# Create a descriptive feature branch" },
      { type: "command" as const, text: "git checkout -b feature/add-linear-search" },
    ],
  },
  {
    step: 3,
    title: "Install & Develop",
    terminal: [
      { type: "comment" as const, text: "# Install dependencies and start the dev server" },
      { type: "command" as const, text: "cd web && npm install && npm run dev" },
      { type: "output" as const, text: "  \u25b6 ready on http://localhost:3000" },
    ],
  },
  {
    step: 4,
    title: "Test & Lint",
    terminal: [
      { type: "comment" as const, text: "# Run all checks before committing" },
      { type: "command" as const, text: "npm run lint && npm run typecheck && npm run test" },
      { type: "output" as const, text: "  \u2713 All checks passed" },
    ],
  },
  {
    step: 5,
    title: "Commit & Push",
    terminal: [
      { type: "comment" as const, text: "# Use Conventional Commits format" },
      {
        type: "command" as const,
        text: 'git commit -m "feat(algorithms): add linear search generator"',
      },
      { type: "command" as const, text: "git push origin feature/add-linear-search" },
    ],
  },
  {
    step: 6,
    title: "Open a Pull Request",
    terminal: [
      { type: "comment" as const, text: "# Open a PR on GitHub targeting main" },
      {
        type: "command" as const,
        text: 'gh pr create --title "feat: add linear search" --body "..."',
      },
      { type: "output" as const, text: "  \u2713 PR #42 created \u2014 CI checks running..." },
    ],
  },
] as const;

const COMMIT_TYPES = [
  { type: "feat", purpose: "A new feature (algorithm, layout, UI component)" },
  { type: "fix", purpose: "A bug fix" },
  { type: "docs", purpose: "Documentation-only changes" },
  { type: "style", purpose: "Formatting, whitespace, no logic change" },
  { type: "refactor", purpose: "Code restructuring without behavior change" },
  { type: "test", purpose: "Adding or updating tests" },
  { type: "chore", purpose: "Build system, CI, dependencies, tooling" },
] as const;

const CI_CHECKS = [
  { name: "ESLint", command: "npm run lint", scope: "Web" },
  { name: "TypeScript", command: "npm run typecheck", scope: "Web" },
  { name: "Vitest", command: "npm run test", scope: "Web" },
  { name: "Next.js Build", command: "npm run build", scope: "Web" },
  { name: "Ruff", command: "ruff check .", scope: "Python" },
  { name: "mypy", command: "mypy src/", scope: "Python" },
  { name: "pytest", command: "pytest", scope: "Python" },
  { name: "Step Parity", command: "python scripts/verify-step-parity.py", scope: "Cross-Language" },
] as const;

const ALGORITHM_STEPS = [
  {
    step: 1,
    title: "Define Metadata",
    description:
      "Create a meta.json in algorithms/<category>/<name>/ with the algorithm's name, description, category, complexity, and input schema.",
    path: "algorithms/<category>/<name>/meta.json",
  },
  {
    step: 2,
    title: "Write the TypeScript Generator",
    description:
      "Implement a generator function that takes input parameters and yields Step objects with visual actions, code highlights, and explanations.",
    path: "algorithms/<category>/<name>/generator.ts",
  },
  {
    step: 3,
    title: "Write the Python Generator",
    description:
      "Mirror the TypeScript generator in Python. Both must produce byte-identical JSON output for the same inputs.",
    path: "python/src/eigenvue/generators/<name>.py",
  },
  {
    step: 4,
    title: "Register the Layout",
    description:
      "If your algorithm needs a new visual layout, create a layout function in the engine and register it via registerLayout().",
    path: "web/src/engine/layouts/",
  },
  {
    step: 5,
    title: "Write Tests & Verify Parity",
    description:
      "Add Vitest and pytest tests. Run the parity checker to confirm cross-language output matches to \u00b11e-9 tolerance.",
    path: "tests/ + scripts/verify-step-parity.py",
  },
] as const;

/* ─── Reusable Sub-Components ───────────────────────────────────────────────── */

/** Copy-to-clipboard button for code blocks. */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="absolute top-3 right-3 rounded border border-border px-2 py-1 font-mono text-xs text-text-tertiary transition-all duration-normal hover:border-border-hover hover:text-text-secondary"
      aria-label="Copy to clipboard"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

/** Styled terminal-like code block. */
function TerminalBlock({
  lines,
  copyText,
}: {
  lines: ReadonlyArray<{ type: "comment" | "command" | "output"; text: string }>;
  copyText?: string;
}) {
  const commandsOnly =
    copyText ??
    lines
      .filter((l) => l.type === "command")
      .map((l) => l.text)
      .join("\n");

  return (
    <div className="group relative overflow-hidden rounded-lg border border-border bg-background-surface">
      {/* Terminal header */}
      <div className="flex items-center gap-1.5 border-b border-border px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-text-disabled" />
        <span className="h-2.5 w-2.5 rounded-full bg-text-disabled" />
        <span className="h-2.5 w-2.5 rounded-full bg-text-disabled" />
        <span className="ml-2 font-mono text-xs text-text-tertiary">terminal</span>
      </div>
      <div className="relative px-4 py-3">
        <CopyButton text={commandsOnly} />
        <pre className="overflow-x-auto font-mono text-sm leading-relaxed">
          {lines.map((line, i) => (
            <div key={i}>
              {line.type === "comment" && <span className="text-text-disabled">{line.text}</span>}
              {line.type === "command" && (
                <>
                  <span className="text-quantum">$</span>{" "}
                  <span className="text-text-primary">{line.text}</span>
                </>
              )}
              {line.type === "output" && <span className="text-text-tertiary">{line.text}</span>}
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}

/** Section heading with optional subtitle. */
function SectionHeading({
  id,
  title,
  accent,
  subtitle,
}: {
  id: string;
  title: string;
  accent: string;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto max-w-prose text-center">
      <h2 id={id} className="text-3xl font-bold text-text-primary md:text-4xl">
        {title} <span className="accent-text">{accent}</span>
      </h2>
      {subtitle && <p className="mt-4 text-lg text-text-secondary">{subtitle}</p>}
    </div>
  );
}

/* ─── Main Page Component ───────────────────────────────────────────────────── */

export function ContributePageClient() {
  return (
    <div className="min-h-screen bg-background-page pt-24 pb-16">
      {/* ── Hero ── */}
      <section className="relative pb-12" aria-labelledby="contribute-heading">
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
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center rounded-full border border-border bg-background-surface/60 px-4 py-1.5 text-sm text-text-secondary backdrop-blur-sm">
              Open Source &middot; MIT Licensed &middot; Community Driven
            </div>

            <h1
              id="contribute-heading"
              className="text-4xl font-bold tracking-tight text-text-primary sm:text-5xl md:text-6xl"
            >
              Help Build the Future of <span className="accent-text">Algorithm Education</span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-lg text-text-secondary md:text-xl">
              Eigenvue is an open-source platform for interactive algorithm visualization across
              classical CS, deep learning, generative AI, and quantum computing. Every contribution
              makes these concepts more accessible to learners worldwide.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Button
                variant="primary"
                size="lg"
                href="https://github.com/eigenvue/eigenvue"
                target="_blank"
                rel="noopener noreferrer"
              >
                View on GitHub
                <span aria-hidden="true" className="ml-1">
                  &#x2197;
                </span>
              </Button>
              <Button variant="secondary" size="lg" href="#quick-start">
                Get Started
                <span aria-hidden="true" className="ml-1">
                  &#x2193;
                </span>
              </Button>
            </div>

            {/* Project stats */}
            <div className="mx-auto mt-10 max-w-xl">
              <div className="grid grid-cols-2 gap-4 rounded-xl border border-border bg-background-surface/50 px-6 py-4 backdrop-blur-sm sm:grid-cols-4">
                {[
                  { value: "22+", label: "Algorithms" },
                  { value: "4", label: "Domains" },
                  { value: "3", label: "Packages" },
                  { value: "MIT", label: "License" },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <div className="font-mono text-xl font-bold text-text-primary">
                      {stat.value}
                    </div>
                    <div className="mt-0.5 text-xs text-text-tertiary">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ── Ways to Contribute ── */}
      <SectionWrapper id="ways-to-contribute" ariaLabelledBy="ways-heading">
        <Container>
          <SectionHeading
            id="ways-heading"
            title="Ways to"
            accent="Contribute"
            subtitle="Whether you're fixing a typo or implementing a new algorithm, every contribution matters. Pick a path that matches your interests and experience."
          />

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {CONTRIBUTION_TYPES.map((item) => (
              <a
                key={item.title}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-xl border border-border bg-background-surface p-6 transition-all duration-normal hover:border-border-hover hover:bg-background-elevated"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-quantum-muted text-quantum transition-colors duration-normal group-hover:bg-quantum/20">
                    <span className="font-mono text-lg" aria-hidden="true">
                      {item.icon}
                    </span>
                  </div>
                  <span className="rounded-full border border-border px-2.5 py-0.5 font-mono text-xs text-text-tertiary">
                    {item.difficulty}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-text-primary">{item.title}</h3>
                <p className="mt-2 text-sm text-text-secondary">{item.description}</p>
              </a>
            ))}
          </div>
        </Container>
      </SectionWrapper>

      {/* ── Quick Start ── */}
      <SectionWrapper id="quick-start" ariaLabelledBy="quickstart-heading">
        <Container>
          <SectionHeading
            id="quickstart-heading"
            title="Quick"
            accent="Start"
            subtitle="Get the development environment running in under two minutes."
          />

          <div className="mx-auto mt-12 max-w-2xl space-y-4">
            {/* Prerequisites */}
            <div className="rounded-xl border border-border bg-background-surface p-6">
              <h3 className="text-base font-semibold text-text-primary">Prerequisites</h3>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { name: "Node.js", version: "20+" },
                  { name: "npm", version: "10+" },
                  { name: "Python", version: "3.10+" },
                  { name: "Git", version: "2.30+" },
                ].map((tool) => (
                  <div
                    key={tool.name}
                    className="rounded-lg border border-border bg-background-page px-3 py-2 text-center"
                  >
                    <div className="font-mono text-sm font-medium text-text-primary">
                      {tool.name}
                    </div>
                    <div className="font-mono text-xs text-text-tertiary">{tool.version}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Clone & Install */}
            <TerminalBlock
              lines={[
                { type: "comment", text: "# Clone the repository" },
                { type: "command", text: "git clone https://github.com/eigenvue/eigenvue.git" },
                { type: "command", text: "cd eigenvue" },
                { type: "comment", text: "" },
                { type: "comment", text: "# Install web dependencies and start the dev server" },
                { type: "command", text: "cd web && npm install && npm run dev" },
                { type: "output", text: "  \u25b6 ready on http://localhost:3000" },
                { type: "comment", text: "" },
                { type: "comment", text: "# In a separate terminal, install Python package" },
                { type: "command", text: 'cd python && pip install -e ".[dev]"' },
              ]}
            />

            <p className="text-center text-sm text-text-tertiary">
              For the full setup guide including the docs site, editor config, and troubleshooting,
              see the{" "}
              <a
                href="https://eigenvue.web.app/docs/contributing/development-setup/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-quantum underline decoration-quantum/30 underline-offset-2 transition-colors hover:text-quantum-light"
              >
                Development Setup
              </a>{" "}
              docs.
            </p>
          </div>
        </Container>
      </SectionWrapper>

      {/* ── Contribution Workflow ── */}
      <SectionWrapper id="workflow" ariaLabelledBy="workflow-heading">
        <Container>
          <SectionHeading
            id="workflow-heading"
            title="Contribution"
            accent="Workflow"
            subtitle="From fork to merged PR — here's how a typical contribution flows."
          />

          <div className="mx-auto mt-12 max-w-3xl">
            <div className="space-y-6">
              {WORKFLOW_STEPS.map((item, index) => (
                <div key={item.step} className="relative flex gap-6">
                  {/* Timeline connector */}
                  <div className="flex flex-col items-center">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-quantum/30 bg-quantum-muted font-mono text-sm font-bold text-quantum">
                      {item.step}
                    </div>
                    {index < WORKFLOW_STEPS.length - 1 && (
                      <div className="mt-2 w-px grow bg-border" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 grow pb-6">
                    <h3 className="mb-3 text-lg font-semibold text-text-primary">{item.title}</h3>
                    <TerminalBlock lines={item.terminal} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </SectionWrapper>

      {/* ── Project Architecture ── */}
      <SectionWrapper id="architecture" ariaLabelledBy="architecture-heading">
        <Container>
          <SectionHeading
            id="architecture-heading"
            title="Project"
            accent="Architecture"
            subtitle="Eigenvue is a monorepo with three main workspaces and shared infrastructure."
          />

          <div className="mx-auto mt-12 max-w-3xl">
            <div className="overflow-hidden rounded-xl border border-border bg-background-surface">
              {/* Header */}
              <div className="flex items-center gap-1.5 border-b border-border px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-text-disabled" />
                <span className="h-2.5 w-2.5 rounded-full bg-text-disabled" />
                <span className="h-2.5 w-2.5 rounded-full bg-text-disabled" />
                <span className="ml-2 font-mono text-xs text-text-tertiary">eigenvue/</span>
              </div>
              <div className="px-4 py-4">
                <pre className="overflow-x-auto font-mono text-sm leading-relaxed text-text-secondary">
                  {`eigenvue/
\u251c\u2500\u2500 algorithms/          `}
                  <span className="text-text-tertiary">{`# Algorithm definitions (meta.json + generators)`}</span>
                  {`
\u2502   \u251c\u2500\u2500 classical/       `}
                  <span className="text-text-tertiary">{`# Binary search, sorting, graph traversal`}</span>
                  {`
\u2502   \u251c\u2500\u2500 deep-learning/   `}
                  <span className="text-text-tertiary">{`# Perceptron, backprop, convolution`}</span>
                  {`
\u2502   \u251c\u2500\u2500 generative-ai/   `}
                  <span className="text-text-tertiary">{`# Tokenization, attention, transformers`}</span>
                  {`
\u2502   \u2514\u2500\u2500 quantum/         `}
                  <span className="text-text-tertiary">{`# Bloch sphere, quantum gates, Grover's`}</span>
                  {`
\u251c\u2500\u2500 `}
                  <span className="text-classical">{`web/`}</span>
                  {`                 `}
                  <span className="text-text-tertiary">{`# Next.js web application`}</span>
                  {`
\u2502   \u2514\u2500\u2500 src/
\u2502       \u251c\u2500\u2500 engine/      `}
                  <span className="text-text-tertiary">{`# Canvas 2D rendering engine`}</span>
                  {`
\u2502       \u251c\u2500\u2500 components/  `}
                  <span className="text-text-tertiary">{`# React components`}</span>
                  {`
\u2502       \u2514\u2500\u2500 lib/         `}
                  <span className="text-text-tertiary">{`# Utilities, constants, SEO`}</span>
                  {`
\u251c\u2500\u2500 `}
                  <span className="text-deeplearning">{`python/`}</span>
                  {`              `}
                  <span className="text-text-tertiary">{`# PyPI package (pip install eigenvue)`}</span>
                  {`
\u2502   \u2514\u2500\u2500 src/eigenvue/
\u2502       \u251c\u2500\u2500 generators/  `}
                  <span className="text-text-tertiary">{`# Python algorithm implementations`}</span>
                  {`
\u2502       \u2514\u2500\u2500 runner.py    `}
                  <span className="text-text-tertiary">{`# Generator runner`}</span>
                  {`
\u251c\u2500\u2500 `}
                  <span className="text-genai">{`node/`}</span>
                  {`                `}
                  <span className="text-text-tertiary">{`# npm package (npm install eigenvue)`}</span>
                  {`
\u251c\u2500\u2500 `}
                  <span className="text-quantum">{`docs/`}</span>
                  {`                `}
                  <span className="text-text-tertiary">{`# Astro Starlight documentation`}</span>
                  {`
\u251c\u2500\u2500 shared/              `}
                  <span className="text-text-tertiary">{`# Cross-language types & schemas`}</span>
                  {`
\u2502   \u251c\u2500\u2500 types/           `}
                  <span className="text-text-tertiary">{`# Step, VisualAction, CodeHighlight`}</span>
                  {`
\u2502   \u2514\u2500\u2500 fixtures/        `}
                  <span className="text-text-tertiary">{`# Golden test fixtures`}</span>
                  {`
\u251c\u2500\u2500 scripts/             `}
                  <span className="text-text-tertiary">{`# Build & validation scripts`}</span>
                  {`
\u2514\u2500\u2500 tests/               `}
                  <span className="text-text-tertiary">{`# Integration & end-to-end tests`}</span>
                </pre>
              </div>
            </div>

            {/* Workspace cards */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                {
                  name: "web/",
                  color: "text-classical",
                  bgColor: "bg-classical-muted",
                  tech: "Next.js 15 \u00b7 React 19 \u00b7 Tailwind 4 \u00b7 Canvas 2D",
                  desc: "The interactive web application with algorithm visualizations, code editor, and step-by-step playback.",
                },
                {
                  name: "python/",
                  color: "text-deeplearning",
                  bgColor: "bg-deeplearning-muted",
                  tech: "Python 3.10+ \u00b7 Ruff \u00b7 mypy \u00b7 pytest",
                  desc: "The PyPI package that mirrors TypeScript generators for use in Jupyter notebooks and scripts.",
                },
                {
                  name: "docs/",
                  color: "text-quantum",
                  bgColor: "bg-quantum-muted",
                  tech: "Astro \u00b7 Starlight \u00b7 MDX",
                  desc: "The documentation site with contributor guides, API reference, and algorithm-specific docs.",
                },
                {
                  name: "shared/",
                  color: "text-genai",
                  bgColor: "bg-genai-muted",
                  tech: "TypeScript Types \u00b7 JSON Schema \u00b7 Fixtures",
                  desc: "Cross-language type definitions, validation schemas, and golden test fixtures for parity checks.",
                },
              ].map((ws) => (
                <div
                  key={ws.name}
                  className="rounded-xl border border-border bg-background-surface p-5"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`${ws.bgColor} rounded px-2 py-0.5 font-mono text-sm font-semibold ${ws.color}`}
                    >
                      {ws.name}
                    </span>
                  </div>
                  <p className="mt-1.5 font-mono text-xs text-text-tertiary">{ws.tech}</p>
                  <p className="mt-2 text-sm text-text-secondary">{ws.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </SectionWrapper>

      {/* ── Adding an Algorithm ── */}
      <SectionWrapper id="add-algorithm" ariaLabelledBy="algorithm-heading">
        <Container>
          <SectionHeading
            id="algorithm-heading"
            title="Adding an"
            accent="Algorithm"
            subtitle="The most impactful contribution — here's the process from start to finish."
          />

          <div className="mx-auto mt-12 max-w-3xl">
            <div className="space-y-4">
              {ALGORITHM_STEPS.map((item) => (
                <div
                  key={item.step}
                  className="rounded-xl border border-border bg-background-surface p-6"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-quantum-muted font-mono text-sm font-bold text-quantum">
                      {item.step}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-text-primary">{item.title}</h3>
                      <p className="mt-1.5 text-sm text-text-secondary">{item.description}</p>
                      <code className="mt-2 inline-block rounded border border-border bg-background-page px-2 py-0.5 font-mono text-xs text-text-tertiary">
                        {item.path}
                      </code>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-quantum/20 bg-quantum-muted p-5">
              <p className="text-sm text-text-secondary">
                <span className="font-semibold text-quantum">Key constraint:</span> TypeScript and
                Python generators must produce byte-identical JSON output for the same inputs. The
                CI parity checker enforces this to{" "}
                <span className="font-mono text-text-primary">&plusmn;1e-9</span> tolerance for
                floating-point values.
              </p>
            </div>

            <p className="mt-4 text-center text-sm text-text-tertiary">
              For the complete step-by-step walkthrough, see{" "}
              <a
                href="https://eigenvue.web.app/docs/contributing/adding-an-algorithm/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-quantum underline decoration-quantum/30 underline-offset-2 transition-colors hover:text-quantum-light"
              >
                Adding an Algorithm
              </a>{" "}
              in the docs.
            </p>
          </div>
        </Container>
      </SectionWrapper>

      {/* ── Code Standards ── */}
      <SectionWrapper id="code-standards" ariaLabelledBy="standards-heading">
        <Container>
          <SectionHeading
            id="standards-heading"
            title="Code"
            accent="Standards"
            subtitle="Consistent code keeps the project healthy. Here's what we enforce."
          />

          <div className="mx-auto mt-12 max-w-3xl space-y-8">
            {/* Commit Convention */}
            <div>
              <h3 className="text-xl font-semibold text-text-primary">Conventional Commits</h3>
              <p className="mt-2 text-sm text-text-secondary">
                Every commit follows the{" "}
                <a
                  href="https://www.conventionalcommits.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-quantum underline decoration-quantum/30 underline-offset-2 transition-colors hover:text-quantum-light"
                >
                  Conventional Commits
                </a>{" "}
                specification. Use the workspace name as the scope:{" "}
                <code className="rounded border border-border bg-background-surface px-1.5 py-0.5 font-mono text-xs text-text-primary">
                  web
                </code>
                ,{" "}
                <code className="rounded border border-border bg-background-surface px-1.5 py-0.5 font-mono text-xs text-text-primary">
                  python
                </code>
                ,{" "}
                <code className="rounded border border-border bg-background-surface px-1.5 py-0.5 font-mono text-xs text-text-primary">
                  docs
                </code>
                ,{" "}
                <code className="rounded border border-border bg-background-surface px-1.5 py-0.5 font-mono text-xs text-text-primary">
                  algorithms
                </code>
                , or{" "}
                <code className="rounded border border-border bg-background-surface px-1.5 py-0.5 font-mono text-xs text-text-primary">
                  shared
                </code>
                .
              </p>

              <div className="mt-4 overflow-hidden rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-background-surface">
                      <th className="px-4 py-2.5 text-left font-mono text-xs font-semibold text-text-primary">
                        Type
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-text-primary">
                        Purpose
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMMIT_TYPES.map((ct, i) => (
                      <tr
                        key={ct.type}
                        className={i < COMMIT_TYPES.length - 1 ? "border-b border-border" : ""}
                      >
                        <td className="px-4 py-2.5 font-mono text-quantum">{ct.type}</td>
                        <td className="px-4 py-2.5 text-text-secondary">{ct.purpose}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3">
                <TerminalBlock
                  lines={[
                    { type: "comment", text: "# Examples" },
                    {
                      type: "command",
                      text: 'git commit -m "feat(algorithms): add linear search generator"',
                    },
                    {
                      type: "command",
                      text: 'git commit -m "fix(python): correct off-by-one in merge sort"',
                    },
                    { type: "command", text: 'git commit -m "docs: update contributing guide"' },
                  ]}
                />
              </div>
            </div>

            {/* Linting & Formatting */}
            <div>
              <h3 className="text-xl font-semibold text-text-primary">Linting &amp; Formatting</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-background-surface p-5">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-classical-muted px-2 py-0.5 font-mono text-xs font-semibold text-classical">
                      Web
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-text-secondary">
                    ESLint for linting, Prettier for formatting. TypeScript strict mode with no
                    implicit any.
                  </p>
                  <div className="mt-3 space-y-1 font-mono text-xs">
                    <div className="rounded border border-border bg-background-page px-3 py-1.5 text-text-primary">
                      <span className="text-quantum">$</span> npm run lint
                    </div>
                    <div className="rounded border border-border bg-background-page px-3 py-1.5 text-text-primary">
                      <span className="text-quantum">$</span> npm run format
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-background-surface p-5">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-deeplearning-muted px-2 py-0.5 font-mono text-xs font-semibold text-deeplearning">
                      Python
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-text-secondary">
                    Ruff for both linting and formatting. mypy for static type checking in strict
                    mode.
                  </p>
                  <div className="mt-3 space-y-1 font-mono text-xs">
                    <div className="rounded border border-border bg-background-page px-3 py-1.5 text-text-primary">
                      <span className="text-quantum">$</span> ruff check .
                    </div>
                    <div className="rounded border border-border bg-background-page px-3 py-1.5 text-text-primary">
                      <span className="text-quantum">$</span> ruff format .
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CI Checks */}
            <div>
              <h3 className="text-xl font-semibold text-text-primary">CI Checks</h3>
              <p className="mt-2 text-sm text-text-secondary">
                All checks must pass before a PR can be merged. Run them locally before pushing.
              </p>

              <div className="mt-4 overflow-hidden rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-background-surface">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-text-primary">
                        Check
                      </th>
                      <th className="px-4 py-2.5 text-left font-mono text-xs font-semibold text-text-primary">
                        Command
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-text-primary">
                        Scope
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {CI_CHECKS.map((check, i) => (
                      <tr
                        key={check.name}
                        className={i < CI_CHECKS.length - 1 ? "border-b border-border" : ""}
                      >
                        <td className="px-4 py-2.5 text-text-primary">{check.name}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-text-secondary">
                          {check.command}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="rounded-full border border-border bg-background-page px-2 py-0.5 font-mono text-xs text-text-tertiary">
                            {check.scope}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3">
                <TerminalBlock
                  lines={[
                    { type: "comment", text: "# Run all CI checks locally before pushing" },
                    {
                      type: "command",
                      text: "cd web && npm run lint && npm run typecheck && npm run test && cd ..",
                    },
                    {
                      type: "command",
                      text: "cd python && ruff check . && mypy src/ && pytest && cd ..",
                    },
                    { type: "command", text: "python scripts/verify-step-parity.py" },
                    { type: "output", text: "  \u2713 All 8 checks passed" },
                  ]}
                />
              </div>
            </div>
          </div>
        </Container>
      </SectionWrapper>

      {/* ── Resources & Community ── */}
      <SectionWrapper id="resources" ariaLabelledBy="resources-heading">
        <Container>
          <SectionHeading
            id="resources-heading"
            title="Resources &"
            accent="Community"
            subtitle="Everything you need to start contributing, all in one place."
          />

          <div className="mx-auto mt-12 max-w-3xl">
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  title: "Contributor Docs",
                  description:
                    "Full setup guide, Generator API reference, layout system, code style, and testing strategy.",
                  href: "https://eigenvue.web.app/docs/contributing/development-setup/",
                  linkText: "Read the docs",
                },
                {
                  title: "GitHub Issues",
                  description:
                    'Browse open issues, find "good first issue" labels, or report a bug you found.',
                  href: "https://github.com/eigenvue/eigenvue/issues",
                  linkText: "Browse issues",
                },
                {
                  title: "API Reference",
                  description:
                    "Step format specification, Python API, TypeScript Generator API, and layout system docs.",
                  href: "https://eigenvue.web.app/docs/api-reference/step-format/",
                  linkText: "View API docs",
                },
                {
                  title: "GitHub Discussions",
                  description:
                    "Ask questions, propose new algorithms, discuss architecture decisions, or share feedback.",
                  href: "https://github.com/eigenvue/eigenvue/discussions",
                  linkText: "Join discussions",
                },
              ].map((resource) => (
                <a
                  key={resource.title}
                  href={resource.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col rounded-xl border border-border bg-background-surface p-6 transition-all duration-normal hover:border-border-hover hover:bg-background-elevated"
                >
                  <h3 className="text-base font-semibold text-text-primary">{resource.title}</h3>
                  <p className="mt-2 grow text-sm text-text-secondary">{resource.description}</p>
                  <span className="mt-4 inline-flex items-center text-sm font-medium text-quantum transition-colors group-hover:text-quantum-light">
                    {resource.linkText}
                    <span aria-hidden="true" className="ml-1">
                      &#x2192;
                    </span>
                  </span>
                </a>
              ))}
            </div>
          </div>
        </Container>
      </SectionWrapper>

      {/* ── Final CTA ── */}
      <SectionWrapper className="relative" ariaLabelledBy="cta-heading">
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
            <h2 id="cta-heading" className="text-3xl font-bold text-text-primary md:text-4xl">
              Ready to <span className="accent-text">Contribute</span>?
            </h2>
            <p className="mt-4 text-lg text-text-secondary">
              Every algorithm visualization you add helps someone build genuine understanding. Pick
              an issue, fork the repo, and submit your first PR.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Button
                variant="primary"
                size="lg"
                href="https://github.com/eigenvue/eigenvue/issues"
                target="_blank"
                rel="noopener noreferrer"
              >
                Find an Issue
                <span aria-hidden="true" className="ml-1">
                  &#x2192;
                </span>
              </Button>
              <Button
                variant="secondary"
                size="lg"
                href="https://github.com/eigenvue/eigenvue/fork"
                target="_blank"
                rel="noopener noreferrer"
              >
                Fork the Repo
                <span aria-hidden="true" className="ml-1">
                  &#x2197;
                </span>
              </Button>
            </div>
          </div>
        </Container>
      </SectionWrapper>
    </div>
  );
}
