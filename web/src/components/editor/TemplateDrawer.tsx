/**
 * @fileoverview Template Drawer
 *
 * A slide-in drawer that displays available algorithm templates grouped
 * by category. Users can browse templates and load them into the editor.
 *
 * DESIGN:
 * - Slides in from the left (overlays the editor panel).
 * - Templates grouped by category with colored category headers.
 * - Each template card shows: name, description, difficulty badge, layout badge.
 * - Clicking a template loads its code and layout into the editor.
 * - Close via X button, Escape key, or clicking outside.
 *
 * @module TemplateDrawer
 */

"use client";

import { useEffect, useRef, useCallback } from "react";
import { ALL_TEMPLATES, type AlgorithmTemplate } from "@/engine/sandbox/templates";

// ─── Props ────────────────────────────────────────────────────────────────

export interface TemplateDrawerProps {
  /** Whether the drawer is open. */
  isOpen: boolean;
  /** Called when the drawer should close. */
  onClose: () => void;
  /** Called when a template is selected. */
  onSelect: (template: AlgorithmTemplate) => void;
}

// ─── Difficulty Badge Colors ──────────────────────────────────────────────

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "bg-emerald-500/20 text-emerald-400",
  intermediate: "bg-amber-500/20 text-amber-400",
  advanced: "bg-red-500/20 text-red-400",
};

const CATEGORY_LABELS: Record<string, string> = {
  classical: "Classical",
  "deep-learning": "Deep Learning",
  "generative-ai": "Generative AI",
  quantum: "Quantum",
};

const CATEGORY_ACCENTS: Record<string, string> = {
  classical: "#38bdf8",
  "deep-learning": "#8b5cf6",
  "generative-ai": "#f472b6",
  quantum: "#00ffc8",
};

const CATEGORY_ORDER = ["classical", "deep-learning", "generative-ai", "quantum"] as const;

// ─── Component ────────────────────────────────────────────────────────────

export function TemplateDrawer({ isOpen, onClose, onSelect }: TemplateDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on Escape.
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSelect = useCallback(
    (template: AlgorithmTemplate) => {
      onSelect(template);
      onClose();
    },
    [onSelect, onClose],
  );

  if (!isOpen) return null;

  // Group templates by category.
  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    accent: CATEGORY_ACCENTS[category],
    templates: ALL_TEMPLATES.filter((t) => t.category === category),
  })).filter((g) => g.templates.length > 0);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} aria-hidden="true" />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed top-0 left-0 h-full w-80 max-w-[90vw] bg-slate-900 border-r border-slate-700 shadow-2xl z-50 flex flex-col animate-slide-in-left"
        role="dialog"
        aria-modal="true"
        aria-label="Template Library"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-text-primary">Templates</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-700/50 transition-colors text-slate-400 hover:text-slate-200"
            aria-label="Close template drawer"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Template List */}
        <div className="flex-1 overflow-y-auto p-2">
          {grouped.map(({ category, label, accent, templates }) => (
            <div key={category} className="mb-4">
              <div
                className="flex items-center gap-2 px-2 py-1.5 text-xs font-mono uppercase tracking-wider"
                style={{ color: accent }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accent }} />
                {label}
              </div>
              <div className="space-y-1">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleSelect(template)}
                    className="w-full text-left px-3 py-2.5 rounded-md hover:bg-slate-800/70 transition-colors group"
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm text-text-primary font-medium group-hover:text-cyan-300 transition-colors">
                        {template.name}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                          DIFFICULTY_COLORS[template.difficulty] ?? ""
                        }`}
                      >
                        {template.difficulty}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">{template.description}</p>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800">
          <p className="text-[10px] text-slate-600 text-center">
            Templates are starting points — modify them freely!
          </p>
        </div>
      </div>

      <style>{`
        @keyframes slide-in-left {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-left {
          animation: slide-in-left 0.2s ease-out;
        }
      `}</style>
    </>
  );
}
