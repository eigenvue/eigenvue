// =============================================================================
// web/src/app/dev/renderer-test/page.tsx
//
// Interactive test harness for the rendering engine. Displays a hardcoded
// binary search step sequence and provides forward/backward navigation.
// This page is the Phase 4 completion proof.
//
// Route: /dev/renderer-test
// =============================================================================

"use client";

import React, { useState } from "react";
import { VisualizationPanel } from "@/engine/VisualizationPanel";
import type { Step } from "@/engine/types";

// Ensure the array-with-pointers layout is registered.
import "@/engine/layouts";

// ---------------------------------------------------------------------------
// Hardcoded binary search steps: searching for 7 in [1, 3, 5, 7, 9, 11, 13]
// ---------------------------------------------------------------------------

const HARDCODED_STEPS: Step[] = [
  {
    index: 0,
    id: "initialize",
    title: "Initialize Pointers",
    explanation: "Searching for 7 in a sorted array of 7 elements. Setting left=0, right=6.",
    state: {
      array: [1, 3, 5, 7, 9, 11, 13],
      target: 7,
      left: 0,
      right: 6,
    },
    visualActions: [
      { type: "highlightRange", from: 0, to: 6 },
      { type: "movePointer", id: "left", to: 0 },
      { type: "movePointer", id: "right", to: 6 },
    ],
    codeHighlight: { language: "pseudocode", lines: [2, 3] },
    isTerminal: false,
    phase: "initialization",
  },
  {
    index: 1,
    id: "calculate_mid",
    title: "Calculate Middle",
    explanation: "mid = floor((0 + 6) / 2) = 3. Checking array[3] = 7.",
    state: {
      array: [1, 3, 5, 7, 9, 11, 13],
      target: 7,
      left: 0,
      right: 6,
      mid: 3,
    },
    visualActions: [
      { type: "highlightRange", from: 0, to: 6 },
      { type: "movePointer", id: "left", to: 0 },
      { type: "movePointer", id: "right", to: 6 },
      { type: "movePointer", id: "mid", to: 3 },
      { type: "highlightElement", index: 3, color: "highlight" },
    ],
    codeHighlight: { language: "pseudocode", lines: [5, 6] },
    isTerminal: false,
    phase: "search",
  },
  {
    index: 2,
    id: "found",
    title: "Target Found!",
    explanation: "array[3] = 7 equals target 7. Found at index 3!",
    state: {
      array: [1, 3, 5, 7, 9, 11, 13],
      target: 7,
      left: 0,
      right: 6,
      mid: 3,
      result: 3,
    },
    visualActions: [
      { type: "dimRange", from: 0, to: 2 },
      { type: "dimRange", from: 4, to: 6 },
      { type: "markFound", index: 3 },
      { type: "movePointer", id: "mid", to: 3 },
    ],
    codeHighlight: { language: "pseudocode", lines: [8] },
    isTerminal: true,
    phase: "result",
  },
];

// ---------------------------------------------------------------------------
// Additional test: searching for 2 (not found)
// ---------------------------------------------------------------------------

const NOT_FOUND_STEPS: Step[] = [
  {
    index: 0,
    id: "initialize",
    title: "Initialize Pointers",
    explanation: "Searching for 2 in a sorted array of 7 elements. Setting left=0, right=6.",
    state: {
      array: [1, 3, 5, 7, 9, 11, 13],
      target: 2,
      left: 0,
      right: 6,
    },
    visualActions: [
      { type: "highlightRange", from: 0, to: 6 },
      { type: "movePointer", id: "left", to: 0 },
      { type: "movePointer", id: "right", to: 6 },
    ],
    codeHighlight: { language: "pseudocode", lines: [2, 3] },
    isTerminal: false,
    phase: "initialization",
  },
  {
    index: 1,
    id: "calculate_mid_1",
    title: "Calculate Middle",
    explanation: "mid = floor((0 + 6) / 2) = 3. Checking array[3] = 7.",
    state: {
      array: [1, 3, 5, 7, 9, 11, 13],
      target: 2,
      left: 0,
      right: 6,
      mid: 3,
    },
    visualActions: [
      { type: "highlightRange", from: 0, to: 6 },
      { type: "movePointer", id: "left", to: 0 },
      { type: "movePointer", id: "right", to: 6 },
      { type: "movePointer", id: "mid", to: 3 },
      { type: "highlightElement", index: 3, color: "highlight" },
    ],
    codeHighlight: { language: "pseudocode", lines: [5, 6] },
    isTerminal: false,
    phase: "search",
  },
  {
    index: 2,
    id: "go_left",
    title: "Target Is Smaller \u2014 Go Left",
    explanation: "7 > 2, so the target is in the left half. Setting right = mid - 1 = 2.",
    state: {
      array: [1, 3, 5, 7, 9, 11, 13],
      target: 2,
      left: 0,
      right: 2,
      mid: 3,
    },
    visualActions: [
      { type: "dimRange", from: 3, to: 6 },
      { type: "highlightRange", from: 0, to: 2 },
      { type: "movePointer", id: "left", to: 0 },
      { type: "movePointer", id: "right", to: 2 },
    ],
    codeHighlight: { language: "pseudocode", lines: [10, 11] },
    isTerminal: false,
    phase: "search",
  },
  {
    index: 3,
    id: "calculate_mid_2",
    title: "Calculate Middle",
    explanation: "mid = floor((0 + 2) / 2) = 1. Checking array[1] = 3.",
    state: {
      array: [1, 3, 5, 7, 9, 11, 13],
      target: 2,
      left: 0,
      right: 2,
      mid: 1,
    },
    visualActions: [
      { type: "dimRange", from: 3, to: 6 },
      { type: "highlightRange", from: 0, to: 2 },
      { type: "movePointer", id: "left", to: 0 },
      { type: "movePointer", id: "right", to: 2 },
      { type: "movePointer", id: "mid", to: 1 },
      { type: "highlightElement", index: 1, color: "highlight" },
    ],
    codeHighlight: { language: "pseudocode", lines: [5, 6] },
    isTerminal: false,
    phase: "search",
  },
  {
    index: 4,
    id: "go_left_2",
    title: "Target Is Smaller \u2014 Go Left",
    explanation: "3 > 2, so the target is in the left half. Setting right = mid - 1 = 0.",
    state: {
      array: [1, 3, 5, 7, 9, 11, 13],
      target: 2,
      left: 0,
      right: 0,
      mid: 1,
    },
    visualActions: [
      { type: "dimRange", from: 1, to: 6 },
      { type: "highlightRange", from: 0, to: 0 },
      { type: "movePointer", id: "left", to: 0 },
      { type: "movePointer", id: "right", to: 0 },
    ],
    codeHighlight: { language: "pseudocode", lines: [10, 11] },
    isTerminal: false,
    phase: "search",
  },
  {
    index: 5,
    id: "calculate_mid_3",
    title: "Calculate Middle",
    explanation: "mid = floor((0 + 0) / 2) = 0. Checking array[0] = 1.",
    state: {
      array: [1, 3, 5, 7, 9, 11, 13],
      target: 2,
      left: 0,
      right: 0,
      mid: 0,
    },
    visualActions: [
      { type: "dimRange", from: 1, to: 6 },
      { type: "movePointer", id: "left", to: 0 },
      { type: "movePointer", id: "right", to: 0 },
      { type: "movePointer", id: "mid", to: 0 },
      { type: "highlightElement", index: 0, color: "highlight" },
    ],
    codeHighlight: { language: "pseudocode", lines: [5, 6] },
    isTerminal: false,
    phase: "search",
  },
  {
    index: 6,
    id: "go_right",
    title: "Target Is Larger \u2014 Go Right",
    explanation:
      "1 < 2, so the target is in the right half. Setting left = mid + 1 = 1. But left (1) > right (0), search space exhausted.",
    state: {
      array: [1, 3, 5, 7, 9, 11, 13],
      target: 2,
      left: 1,
      right: 0,
    },
    visualActions: [{ type: "dimRange", from: 0, to: 6 }],
    codeHighlight: { language: "pseudocode", lines: [12, 13] },
    isTerminal: false,
    phase: "search",
  },
  {
    index: 7,
    id: "not_found",
    title: "Target Not Found",
    explanation: "Search space exhausted. 2 is not in the array.",
    state: {
      array: [1, 3, 5, 7, 9, 11, 13],
      target: 2,
      left: 1,
      right: 0,
      result: -1,
    },
    visualActions: [{ type: "dimRange", from: 0, to: 6 }, { type: "markNotFound" }],
    codeHighlight: { language: "pseudocode", lines: [15] },
    isTerminal: true,
    phase: "result",
  },
];

// ---------------------------------------------------------------------------
// Test Page Component
// ---------------------------------------------------------------------------

const STEP_SETS = {
  "Found (target=7)": HARDCODED_STEPS,
  "Not Found (target=2)": NOT_FOUND_STEPS,
};

export default function RendererTestPage() {
  const [activeSet, setActiveSet] = useState<keyof typeof STEP_SETS>("Found (target=7)");
  const steps = STEP_SETS[activeSet];
  const [stepIndex, setStepIndex] = useState(0);

  const currentStep = steps[stepIndex]!;

  const handlePrev = () => setStepIndex((i) => Math.max(0, i - 1));
  const handleNext = () => setStepIndex((i) => Math.min(steps.length - 1, i + 1));

  const handleSetChange = (name: keyof typeof STEP_SETS) => {
    setActiveSet(name);
    setStepIndex(0);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0f1e",
        color: "#e2e8f0",
        fontFamily: "'Inter', sans-serif",
        padding: 24,
      }}
    >
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
        Rendering Engine Test &mdash; Phase 4
      </h1>
      <p style={{ color: "#94a3b8", marginBottom: 24 }}>
        Binary search visualization using the array-with-pointers layout.
      </p>

      {/* Dataset selector */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(Object.keys(STEP_SETS) as Array<keyof typeof STEP_SETS>).map((name) => (
          <button
            key={name}
            onClick={() => handleSetChange(name)}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              border: "1px solid",
              borderColor: activeSet === name ? "#38bdf8" : "#475569",
              background: activeSet === name ? "#1e3a5f" : "transparent",
              color: activeSet === name ? "#38bdf8" : "#94a3b8",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: activeSet === name ? 600 : 400,
            }}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Visualization canvas */}
      <div
        style={{
          width: "100%",
          maxWidth: 900,
          height: 350,
          border: "1px solid #1e293b",
          borderRadius: 12,
          overflow: "hidden",
          marginBottom: 16,
          background: "#0f172a",
        }}
      >
        <VisualizationPanel
          steps={steps}
          currentStep={stepIndex}
          layoutName="array-with-pointers"
        />
      </div>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={handlePrev}
          disabled={stepIndex === 0}
          style={{
            padding: "8px 18px",
            borderRadius: 6,
            border: "none",
            background: stepIndex === 0 ? "#1e293b" : "#334155",
            color: stepIndex === 0 ? "#475569" : "#e2e8f0",
            cursor: stepIndex === 0 ? "not-allowed" : "pointer",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          &larr; Previous
        </button>

        <span
          style={{
            fontVariantNumeric: "tabular-nums",
            fontSize: 14,
            color: "#94a3b8",
          }}
        >
          Step {stepIndex + 1} / {steps.length}
        </span>

        <button
          onClick={handleNext}
          disabled={stepIndex === steps.length - 1}
          style={{
            padding: "8px 18px",
            borderRadius: 6,
            border: "none",
            background: stepIndex === steps.length - 1 ? "#1e293b" : "#38bdf8",
            color: stepIndex === steps.length - 1 ? "#475569" : "#0f172a",
            cursor: stepIndex === steps.length - 1 ? "not-allowed" : "pointer",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Next &rarr;
        </button>
      </div>

      {/* Step info */}
      <div
        style={{
          marginTop: 16,
          padding: 16,
          borderRadius: 8,
          background: "#1e293b",
          maxWidth: 900,
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{currentStep.title}</div>
        <div style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.5 }}>
          {currentStep.explanation}
        </div>
        <div
          style={{
            marginTop: 12,
            fontSize: 12,
            fontFamily: "'JetBrains Mono', monospace",
            color: "#64748b",
          }}
        >
          State: {JSON.stringify(currentStep.state, null, 0)}
        </div>
      </div>
    </div>
  );
}
