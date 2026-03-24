/**
 * HeroSection — above-the-fold hero with asymmetric editorial layout.
 *
 * Layout:
 * - Left column: headline, subtitle, CTAs, install badges, trust signal
 * - Right column: stacked deck of algorithm preview cards
 * - Key metrics strip below spanning full width
 */

"use client";

import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { InstallBadge } from "@/components/landing/PipInstallBadge";

const METRICS = [
  { value: "22+", label: "Interactive Visualizations" },
  { value: "4", label: "Algorithm Domains" },
  { value: "MIT", label: "Open Source License" },
  { value: "pip + npm", label: "Install Anywhere" },
];

/* ─── Card 1 (front): Grover's Quantum Search ─── */

function QuantumCard() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background-surface shadow-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-red-400/40" />
          <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/40" />
          <div className="h-2.5 w-2.5 rounded-full bg-green-400/40" />
        </div>
        <span className="ml-2 font-mono text-xs text-text-tertiary">
          eigenvue — Grover&#39;s Search
        </span>
        <span className="ml-auto rounded-full bg-quantum-muted px-2 py-0.5 text-[10px] font-mono font-medium text-quantum">
          Quantum
        </span>
      </div>

      <div className="p-4">
        {/* Quantum circuit mockup */}
        <div className="mb-3 text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
          Quantum Circuit — 3 Qubits
        </div>
        <div className="space-y-2">
          {/* Qubit lines */}
          {["q₀", "q₁", "q₂"].map((qubit, qi) => (
            <div key={qubit} className="flex items-center gap-1">
              <span className="w-5 font-mono text-[10px] text-text-tertiary">{qubit}</span>
              <div className="flex flex-1 items-center">
                {/* Wire */}
                <div className="relative flex flex-1 items-center">
                  <div className="absolute inset-x-0 h-px bg-border" />
                  {/* Gates */}
                  <div className="relative flex w-full justify-around">
                    {qi === 0 && (
                      <>
                        <div className="flex h-7 w-7 items-center justify-center rounded border border-quantum bg-quantum/10 font-mono text-[10px] font-bold text-quantum">
                          H
                        </div>
                        <div className="flex h-7 w-7 items-center justify-center rounded border border-border bg-background-elevated font-mono text-[10px] text-text-secondary">
                          X
                        </div>
                        <div className="flex h-7 w-7 items-center justify-center rounded border border-quantum bg-quantum/10 font-mono text-[10px] font-bold text-quantum">
                          H
                        </div>
                        <div className="flex h-7 w-7 items-center justify-center rounded border border-border bg-background-elevated font-mono text-[10px] text-text-secondary">
                          M
                        </div>
                      </>
                    )}
                    {qi === 1 && (
                      <>
                        <div className="flex h-7 w-7 items-center justify-center rounded border border-quantum bg-quantum/10 font-mono text-[10px] font-bold text-quantum">
                          H
                        </div>
                        <div className="flex h-7 w-7 items-center justify-center rounded border border-border bg-background-elevated font-mono text-[10px] text-text-secondary">
                          X
                        </div>
                        <div className="flex h-7 w-7 items-center justify-center rounded border border-quantum bg-quantum/10 font-mono text-[10px] font-bold text-quantum">
                          H
                        </div>
                        <div className="flex h-7 w-7 items-center justify-center rounded border border-border bg-background-elevated font-mono text-[10px] text-text-secondary">
                          M
                        </div>
                      </>
                    )}
                    {qi === 2 && (
                      <>
                        <div className="flex h-7 w-7 items-center justify-center rounded border border-border bg-background-elevated font-mono text-[10px] text-text-secondary">
                          X
                        </div>
                        <div className="flex h-7 w-7 items-center justify-center rounded border border-deeplearning bg-deeplearning/10 font-mono text-[10px] font-bold text-deeplearning">
                          O
                        </div>
                        <div className="flex h-7 w-7 items-center justify-center rounded border border-border bg-background-elevated font-mono text-[10px] text-text-secondary">
                          X
                        </div>
                        <div className="flex h-7 w-7 items-center justify-center rounded border border-border bg-background-elevated font-mono text-[10px] text-text-secondary">
                          M
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Step info */}
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-quantum/5 px-3 py-2">
          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-quantum/15 text-quantum text-[9px] font-bold">
            2
          </span>
          <p className="text-xs text-text-secondary">
            <span className="font-medium text-text-primary">Apply Oracle:</span> The oracle flips
            the phase of the target state |101⟩, marking it for amplification.
          </p>
        </div>

        {/* Controls */}
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <div className="flex items-center gap-1">
            <div className="flex h-6 w-6 items-center justify-center rounded text-text-tertiary">
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                aria-hidden="true"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </div>
            <div className="flex h-6 w-6 items-center justify-center rounded bg-btn-primary text-white">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <polygon points="5 3 19 12 5 21" />
              </svg>
            </div>
            <div className="flex h-6 w-6 items-center justify-center rounded text-text-tertiary">
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                aria-hidden="true"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </div>
          <span className="font-mono text-[10px] text-text-disabled">Step 2 / 5</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Stacked Deck ─── */

function ProductPreviewDeck() {
  return (
    <div
      className="relative overflow-visible"
      style={{ marginBottom: "48px", marginRight: "32px" }}
    >
      {/* Subtle glow behind the deck */}
      <div
        className="pointer-events-none absolute -inset-8 rounded-2xl opacity-[0.07] blur-3xl"
        style={{ background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)" }}
        aria-hidden="true"
      />

      {/* Card 3 (deepest) — Neural Net */}
      <div
        className="absolute inset-0 overflow-hidden rounded-xl border border-border bg-background-surface shadow-card opacity-50"
        style={{ transform: "translate(32px, 48px)", zIndex: 1 }}
        aria-hidden="true"
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-400/40" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/40" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-400/40" />
          </div>
          <span className="ml-2 font-mono text-xs text-text-tertiary">
            eigenvue — Backpropagation
          </span>
          <span className="ml-auto rounded-full bg-deeplearning-muted px-2 py-0.5 text-[10px] font-mono font-medium text-deeplearning">
            Deep Learning
          </span>
        </div>
      </div>

      {/* Card 2 (middle) — Self-Attention */}
      <div
        className="absolute inset-0 overflow-hidden rounded-xl border border-border bg-background-surface shadow-card opacity-70"
        style={{ transform: "translate(16px, 24px)", zIndex: 2 }}
        aria-hidden="true"
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-400/40" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/40" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-400/40" />
          </div>
          <span className="ml-2 font-mono text-xs text-text-tertiary">
            eigenvue — Self-Attention
          </span>
          <span className="ml-auto rounded-full bg-genai-muted px-2 py-0.5 text-[10px] font-mono font-medium text-genai">
            GenAI
          </span>
        </div>
      </div>

      {/* Card 1 (front) — Quantum: fully visible */}
      <div className="relative" style={{ zIndex: 3 }}>
        <QuantumCard />
      </div>
    </div>
  );
}

export function HeroSection() {
  return (
    <section
      className="relative flex min-h-screen flex-col justify-center overflow-hidden pt-20 pb-12"
      aria-labelledby="hero-heading"
    >
      <Container className="relative z-10">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          {/* ─── Text Column ─── */}
          <div>
            {/* Contextual badge */}
            <div className="mb-6 inline-flex items-center rounded-full border border-border bg-background-surface/60 px-3.5 py-1 text-xs font-medium text-text-secondary backdrop-blur-sm sm:text-sm">
              <span
                className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-green-500"
                aria-hidden="true"
              />
              Open-source · Free forever
            </div>

            <h1
              id="hero-heading"
              className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl md:text-5xl lg:text-6xl"
            >
              See How <span className="accent-text">AI Thinks</span>
              <br />
              &amp; Quantum Computes
            </h1>

            <p className="mt-5 max-w-lg text-base text-text-secondary sm:text-lg">
              Interactive, step-by-step dissection of deep learning, generative AI, and quantum
              algorithms. Watch every computation unfold — from binary search to self-attention.
            </p>

            {/* Domain highlights — visual chips with count */}
            <div className="mt-7 grid grid-cols-2 gap-2.5 max-w-md">
              {[
                {
                  label: "Classical",
                  count: "7 algos",
                  borderColor: "border-classical/30",
                  textColor: "text-classical",
                  bg: "bg-classical-muted",
                },
                {
                  label: "Deep Learning",
                  count: "5 algos",
                  borderColor: "border-deeplearning/30",
                  textColor: "text-deeplearning",
                  bg: "bg-deeplearning-muted",
                },
                {
                  label: "Generative AI",
                  count: "5 algos",
                  borderColor: "border-genai/30",
                  textColor: "text-genai",
                  bg: "bg-genai-muted",
                },
                {
                  label: "Quantum",
                  count: "5 algos",
                  borderColor: "border-quantum/30",
                  textColor: "text-quantum",
                  bg: "bg-quantum-muted",
                },
              ].map((d) => (
                <div
                  key={d.label}
                  className={`flex items-center gap-2.5 rounded-lg border ${d.borderColor} ${d.bg} px-3 py-2`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${d.textColor} bg-current shrink-0`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <div className={`text-xs font-semibold ${d.textColor}`}>{d.label}</div>
                    <div className="text-[10px] text-text-tertiary">{d.count}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA buttons */}
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="primary" size="lg" href="/algorithms">
                Explore Algorithms
                <span aria-hidden="true" className="ml-1">
                  &#x2192;
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
                <span aria-hidden="true" className="ml-1">
                  &#x2197;
                </span>
              </Button>
            </div>

            {/* Install badges */}
            <div className="mt-6 flex flex-wrap gap-3">
              <InstallBadge command="pip install" packageName="eigenvue" />
              <InstallBadge command="npm install" packageName="eigenvue" />
            </div>

            {/* Trust signal */}
            <p className="mt-4 text-xs text-text-tertiary sm:text-sm">
              No account required · MIT Licensed · Python &amp; JavaScript
            </p>
          </div>

          {/* ─── Stacked Card Deck ─── */}
          <div className="relative flex items-center justify-center">
            <ProductPreviewDeck />
          </div>
        </div>

        {/* ─── Metrics strip ─── */}
        <div className="mt-16 grid grid-cols-2 gap-y-6 border-t border-border pt-8 sm:grid-cols-4">
          {METRICS.map((metric) => (
            <div key={metric.label}>
              <div className="font-mono text-2xl font-bold text-text-primary">{metric.value}</div>
              <div className="mt-0.5 text-xs text-text-tertiary">{metric.label}</div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
