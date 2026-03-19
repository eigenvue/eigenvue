/**
 * @fileoverview Layout Selector
 *
 * A dropdown component that lets users choose which rendering layout
 * their custom algorithm will use. The selected layout determines which
 * visual actions are meaningful.
 *
 * Layouts are grouped by category (Classical, Deep Learning, Generative AI, Quantum).
 * Each option shows the layout name, category badge, and description.
 *
 * @module LayoutSelector
 */

"use client";

import { useState, useCallback, useRef, useEffect } from "react";

// ─── Layout Metadata ──────────────────────────────────────────────────

export interface LayoutOption {
  readonly id: string;
  readonly name: string;
  readonly category: "classical" | "deep-learning" | "generative-ai" | "quantum" | "general";
  readonly description: string;
  readonly supportedActions: readonly string[];
  readonly accentColor: string;
}

export const LAYOUT_OPTIONS: readonly LayoutOption[] = [
  // ─── Classical ──────────────────────────────────────────────────
  {
    id: "array-with-pointers",
    name: "Array with Pointers",
    category: "classical",
    description: "Horizontal array of elements with movable pointers below.",
    supportedActions: [
      "highlightElement",
      "movePointer",
      "highlightRange",
      "dimRange",
      "markFound",
      "markNotFound",
      "showMessage",
    ],
    accentColor: "#38bdf8",
  },
  {
    id: "array-comparison",
    name: "Array Comparison",
    category: "classical",
    description: "Array with swap animations and comparison indicators.",
    supportedActions: [
      "highlightElement",
      "swapElements",
      "compareElements",
      "highlightRange",
      "dimRange",
      "showMessage",
    ],
    accentColor: "#38bdf8",
  },
  {
    id: "graph-network",
    name: "Graph Network",
    category: "classical",
    description: "Nodes and edges with force-directed or fixed positioning.",
    supportedActions: ["visitNode", "highlightEdge", "updateNodeValue", "showMessage"],
    accentColor: "#38bdf8",
  },
  // ─── Deep Learning ──────────────────────────────────────────────
  {
    id: "neuron-diagram",
    name: "Neuron Diagram",
    category: "deep-learning",
    description: "Single neuron with inputs, weights, activation, and output.",
    supportedActions: ["activateNeuron", "propagateSignal", "showMessage"],
    accentColor: "#8b5cf6",
  },
  {
    id: "layer-network",
    name: "Layer Network",
    category: "deep-learning",
    description: "Multi-layer neural network with forward/backward signal flow.",
    supportedActions: ["activateNeuron", "propagateSignal", "showGradient", "showMessage"],
    accentColor: "#8b5cf6",
  },
  {
    id: "convolution-grid",
    name: "Convolution Grid",
    category: "deep-learning",
    description: "Input grid with sliding kernel producing a feature map.",
    supportedActions: ["highlightElement", "highlightRange", "showMessage"],
    accentColor: "#8b5cf6",
  },
  {
    id: "loss-landscape",
    name: "Loss Landscape",
    category: "deep-learning",
    description: "2D/pseudo-3D loss surface with optimization trajectory.",
    supportedActions: ["updateBarChart", "showMessage"],
    accentColor: "#8b5cf6",
  },
  // ─── Generative AI ──────────────────────────────────────────────
  {
    id: "token-sequence",
    name: "Token Sequence",
    category: "generative-ai",
    description: "Horizontal token row with attention arcs above.",
    supportedActions: ["highlightToken", "showAttentionWeights", "showMessage"],
    accentColor: "#f472b6",
  },
  {
    id: "attention-heatmap",
    name: "Attention Heatmap",
    category: "generative-ai",
    description: "Token sequence with attention weight matrix heatmap.",
    supportedActions: ["highlightToken", "showAttentionWeights", "showMessage"],
    accentColor: "#f472b6",
  },
  {
    id: "layer-diagram",
    name: "Layer Diagram",
    category: "generative-ai",
    description: "Vertical/horizontal flow of sublayers with data flow.",
    supportedActions: ["propagateSignal", "showMessage"],
    accentColor: "#f472b6",
  },
  // ─── Quantum ────────────────────────────────────────────────────
  {
    id: "bloch-sphere",
    name: "Bloch Sphere",
    category: "quantum",
    description: "Pseudo-3D Bloch sphere with state vector arrow.",
    supportedActions: ["rotateBlochSphere", "showStateVector", "showMessage"],
    accentColor: "#00ffc8",
  },
  {
    id: "circuit-wires",
    name: "Circuit Wires",
    category: "quantum",
    description: "Quantum circuit diagram with gate symbols on qubit wires.",
    supportedActions: ["applyGate", "showStateVector", "collapseState", "showMessage"],
    accentColor: "#00ffc8",
  },
  {
    id: "amplitude-bars",
    name: "Amplitude Bars",
    category: "quantum",
    description: "Bar chart of state vector amplitudes and probabilities.",
    supportedActions: ["showStateVector", "updateBarChart", "showMessage"],
    accentColor: "#00ffc8",
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  classical: "Classical",
  "deep-learning": "Deep Learning",
  "generative-ai": "Generative AI",
  quantum: "Quantum",
};

const CATEGORY_ORDER = ["classical", "deep-learning", "generative-ai", "quantum"] as const;

// ─── Props ────────────────────────────────────────────────────────────────

export interface LayoutSelectorProps {
  selectedLayoutId: string;
  onSelect: (layoutId: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────

export function LayoutSelector({ selectedLayoutId, onSelect }: LayoutSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedLayout = LAYOUT_OPTIONS.find((l) => l.id === selectedLayoutId);

  // Close on outside click.
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Close on Escape.
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleSelect = useCallback(
    (layoutId: string) => {
      onSelect(layoutId);
      setIsOpen(false);
    },
    [onSelect],
  );

  // Group layouts by category.
  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    layouts: LAYOUT_OPTIONS.filter((l) => l.category === category),
  }));

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-slate-700 bg-slate-800/50 hover:bg-slate-700/50 transition-colors text-sm"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Layout: ${selectedLayout?.name ?? "Select layout"}`}
      >
        {selectedLayout && (
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: selectedLayout.accentColor }}
          />
        )}
        <span className="text-text-primary truncate max-w-[160px]">
          {selectedLayout?.name ?? "Select Layout"}
        </span>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 w-80 max-h-[400px] overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 shadow-xl z-50"
          role="listbox"
          aria-label="Select a layout"
        >
          {grouped.map(({ category, label, layouts }) => (
            <div key={category}>
              <div className="px-3 py-2 text-xs font-mono text-slate-500 uppercase tracking-wider sticky top-0 bg-slate-900 border-b border-slate-800">
                {label}
              </div>
              {layouts.map((layout) => (
                <button
                  key={layout.id}
                  type="button"
                  role="option"
                  aria-selected={layout.id === selectedLayoutId}
                  onClick={() => handleSelect(layout.id)}
                  className={`w-full text-left px-3 py-2.5 hover:bg-slate-800/70 transition-colors flex items-start gap-2.5 ${
                    layout.id === selectedLayoutId
                      ? "bg-slate-800/50 border-l-2"
                      : "border-l-2 border-transparent"
                  }`}
                  style={
                    layout.id === selectedLayoutId
                      ? { borderLeftColor: layout.accentColor }
                      : undefined
                  }
                >
                  <span
                    className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                    style={{ backgroundColor: layout.accentColor }}
                  />
                  <div className="min-w-0">
                    <div className="text-sm text-text-primary font-medium">{layout.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                      {layout.description}
                    </div>
                  </div>
                  {layout.id === selectedLayoutId && (
                    <svg
                      className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5 ml-auto"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
