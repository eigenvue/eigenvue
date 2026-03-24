/**
 * FeaturesSection — alternating left/right feature showcases.
 *
 * Each feature has a text column (title, description, bullet points)
 * and a visual mockup column showing the feature in action.
 * Alternates layout direction for visual rhythm (like AlgoExpert).
 */

import { Container } from "@/components/ui/Container";
import { SectionWrapper } from "@/components/ui/SectionWrapper";

/* ─── Feature 1: Step-by-Step Playback ─── */

function PlaybackMockup() {
  const steps = [
    { label: "Initialize low=0, high=6", active: false, done: true },
    { label: "Compute mid = 3, check A[3]=27", active: true, done: false },
    { label: "27 < 42 → search right half", active: false, done: false },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background-surface shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <span className="font-mono text-xs text-text-tertiary">Binary Search — Step 2 / 6</span>
        <div className="flex items-center gap-1">
          <button
            className="flex h-6 w-6 items-center justify-center rounded text-text-tertiary"
            aria-label="Previous"
          >
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
          </button>
          <button
            className="flex h-6 w-6 items-center justify-center rounded bg-btn-primary text-white"
            aria-label="Play"
          >
            <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <polygon points="5 3 19 12 5 21" />
            </svg>
          </button>
          <button
            className="flex h-6 w-6 items-center justify-center rounded text-text-tertiary"
            aria-label="Next"
          >
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
          </button>
        </div>
      </div>

      {/* Array viz */}
      <div className="flex items-center justify-center gap-1 px-4 pt-4 pb-2">
        {[3, 8, 14, 27, 33, 42, 55].map((n, i) => (
          <div
            key={n}
            className={`flex h-9 w-9 items-center justify-center rounded font-mono text-xs font-medium ${
              i === 3
                ? "bg-btn-primary text-white ring-2 ring-btn-primary/30"
                : i < 3
                  ? "bg-background-hover text-text-disabled"
                  : "bg-background-elevated text-text-secondary"
            }`}
          >
            {n}
          </div>
        ))}
      </div>

      {/* Steps */}
      <div className="space-y-1 px-4 pt-2 pb-4">
        {steps.map((s, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs ${
              s.active
                ? "bg-btn-primary/10 text-text-primary font-medium"
                : s.done
                  ? "text-text-disabled line-through"
                  : "text-text-tertiary"
            }`}
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full font-mono text-[9px] font-bold ${
                s.active
                  ? "bg-btn-primary text-white"
                  : s.done
                    ? "bg-background-hover text-text-disabled"
                    : "bg-background-elevated text-text-tertiary"
              }`}
            >
              {i + 1}
            </span>
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Feature 2: Synchronized Code ─── */

function SyncCodeMockup() {
  const lines = [
    { num: 1, text: "function binarySearch(arr, target) {", color: "text-text-primary" },
    { num: 2, text: "  let low = 0, high = arr.length - 1;", color: "text-text-primary" },
    { num: 3, text: "  while (low <= high) {", color: "text-text-primary" },
    {
      num: 4,
      text: "    let mid = Math.floor((low+high)/2);",
      color: "text-text-primary",
      highlight: true,
    },
    { num: 5, text: "    if (arr[mid] === target) return mid;", color: "text-text-primary" },
    { num: 6, text: "    if (arr[mid] < target) low = mid+1;", color: "text-text-primary" },
    { num: 7, text: "  }", color: "text-text-primary" },
    { num: 8, text: "}", color: "text-text-primary" },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background-surface shadow-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-red-400/40" />
          <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/40" />
          <div className="h-2.5 w-2.5 rounded-full bg-green-400/40" />
        </div>
        <span className="ml-2 font-mono text-xs text-text-tertiary">binary-search.js</span>
      </div>
      <div className="p-3">
        <pre className="font-mono text-xs leading-relaxed">
          {lines.map((l) => (
            <div
              key={l.num}
              className={`flex rounded px-2 py-0.5 ${l.highlight ? "bg-btn-primary/10 border-l-2 border-btn-primary" : ""}`}
            >
              <span className="mr-4 inline-block w-4 select-none text-right text-text-disabled">
                {l.num}
              </span>
              <span className={l.color}>{l.text}</span>
            </div>
          ))}
        </pre>
      </div>
      {/* Explanation panel */}
      <div className="border-t border-border px-4 py-3">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-btn-primary/15 text-btn-primary text-[9px] font-bold">
            i
          </span>
          <p className="text-xs text-text-secondary leading-relaxed">
            <span className="font-medium text-text-primary">Line 4:</span> Compute the midpoint
            index. Using{" "}
            <code className="rounded bg-background-elevated px-1 font-mono text-[10px]">
              Math.floor
            </code>{" "}
            ensures an integer index when the array has even length.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Feature 3: Plain-Language Explanations ─── */

function ExplanationMockup() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background-surface shadow-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <span className="font-mono text-xs text-text-tertiary">Self-Attention — Step 3 / 8</span>
      </div>

      {/* Attention matrix mockup */}
      <div className="px-4 pt-4 pb-2">
        <div className="mb-2 text-[10px] font-medium text-text-tertiary uppercase tracking-wider">
          Attention Weights
        </div>
        <div className="grid grid-cols-4 gap-0.5">
          {["The", "cat", "sat", "down"].map((word) => (
            <div key={word} className="text-center font-mono text-[10px] text-text-tertiary pb-1">
              {word}
            </div>
          ))}
          {[
            [0.1, 0.7, 0.1, 0.1],
            [0.2, 0.2, 0.4, 0.2],
            [0.05, 0.3, 0.15, 0.5],
            [0.1, 0.1, 0.6, 0.2],
          ].map((row, ri) =>
            row.map((val, ci) => (
              <div
                key={`${ri}-${ci}`}
                className="flex h-8 items-center justify-center rounded text-[10px] font-mono"
                style={{
                  backgroundColor: `rgba(var(--starfield-color), ${val * 0.5})`,
                  color: val > 0.4 ? "var(--text-primary)" : "var(--text-tertiary)",
                  fontWeight: val > 0.4 ? 600 : 400,
                }}
              >
                {val.toFixed(1)}
              </div>
            )),
          )}
        </div>
      </div>

      {/* Explanation */}
      <div className="border-t border-border px-4 py-3 space-y-2">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-btn-primary/15 text-btn-primary text-[9px] font-bold">
            ?
          </span>
          <p className="text-xs text-text-secondary leading-relaxed">
            <span className="font-medium text-text-primary">What&#39;s happening:</span> The word
            &#34;cat&#34; attends most strongly to &#34;The&#34; (0.7) because the model has learned
            that determiners modify the next noun. This is how self-attention builds context.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Feature Definitions ─── */

const FEATURES = [
  {
    title: "Step-by-Step Playback",
    subtitle: "Every computation, at your own pace",
    description:
      "Play, pause, step forward, step backward, and scrub through any algorithm. Each step shows what changed and why — so you never lose track of the logic.",
    bullets: [
      "Frame-by-frame control with keyboard shortcuts",
      "Variable speed from 0.25x to 4x",
      "Scrub to any step instantly",
    ],
    mockup: <PlaybackMockup />,
    reverse: false,
  },
  {
    title: "Synchronized Code",
    subtitle: "See the exact line being executed",
    description:
      "Every visualization step highlights the corresponding line of code. The connection between what you see and how it works is never broken.",
    bullets: [
      "Line-level highlighting in real time",
      "Variable state inspection on hover",
      "Full source code for every algorithm",
    ],
    mockup: <SyncCodeMockup />,
    reverse: true,
  },
  {
    title: "Plain-Language Explanations",
    subtitle: "Understand the why, not just the what",
    description:
      "Every step includes a human-readable explanation of what just happened. No jargon walls — just clear reasoning that builds genuine intuition.",
    bullets: [
      "Context-aware explanations for each step",
      "Mathematical notation when helpful, plain English always",
      "Key insight callouts for important moments",
    ],
    mockup: <ExplanationMockup />,
    reverse: false,
  },
];

export function FeaturesSection() {
  return (
    <SectionWrapper id="features" ariaLabelledBy="features-heading">
      <Container>
        <div className="mx-auto max-w-prose text-center">
          <h2 id="features-heading" className="text-3xl font-bold text-text-primary md:text-4xl">
            Built for <span className="accent-text">Real Understanding</span>
          </h2>
          <p className="mt-4 text-lg text-text-secondary">
            Not just pretty animations — every feature is designed to help you build genuine
            intuition about how algorithms work.
          </p>
        </div>

        <div className="mt-20 space-y-24 lg:space-y-32">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${
                feature.reverse ? "" : ""
              }`}
            >
              {/* Text */}
              <div className={feature.reverse ? "lg:order-2" : ""}>
                <p className="text-sm font-medium uppercase tracking-wider text-accent">
                  {feature.subtitle}
                </p>
                <h3 className="mt-2 text-2xl font-bold text-text-primary md:text-3xl">
                  {feature.title}
                </h3>
                <p className="mt-4 text-base text-text-secondary leading-relaxed">
                  {feature.description}
                </p>
                <ul className="mt-6 space-y-2.5">
                  {feature.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="flex items-start gap-2.5 text-sm text-text-secondary"
                    >
                      <svg
                        className="mt-1 h-4 w-4 shrink-0 text-btn-primary"
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
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Mockup */}
              <div className={feature.reverse ? "lg:order-1" : ""}>{feature.mockup}</div>
            </div>
          ))}
        </div>
      </Container>
    </SectionWrapper>
  );
}
