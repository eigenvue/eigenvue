/**
 * @fileoverview Standalone viewer core — unit tests.
 *
 * Tests the pure (DOM-free) logic that powers the visualizer shipped in the
 * Python and Node packages. The DOM/Canvas wiring in viewer.ts is exercised
 * by the package-level asset tests and by the shared rendering-engine tests.
 */

import { describe, it, expect } from "vitest";

import type { Step } from "../../engine/types";
import {
  type ViewerMeta,
  availableLanguages,
  clampIndex,
  codeLines,
  formatStateValue,
  highlightedLines,
  nextSpeedIndex,
  playbackIntervalMs,
  resolveInitialLanguage,
  resolveLayoutConfig,
  resolveLayoutName,
  BASE_PLAYBACK_INTERVAL_MS,
  DEFAULT_SPEED_INDEX,
  SPEED_OPTIONS,
} from "../viewer-core";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const META: ViewerMeta = {
  id: "binary-search",
  name: "Binary Search",
  description: { short: "Find a target in a sorted array." },
  visual: {
    layout: "array-with-pointers",
    components: { showIndices: true, highlightColor: "#fbbf24" },
  },
  code: {
    implementations: {
      pseudocode: "line1\nline2\nline3",
      python: "def f():\n    pass",
      javascript: "function f() {}",
    },
    defaultLanguage: "pseudocode",
  },
};

function makeStep(overrides: Partial<Step> = {}): Step {
  return {
    index: 0,
    id: "init",
    title: "Initialize",
    explanation: "Set up pointers.",
    state: { left: 0, right: 9 },
    visualActions: [],
    codeHighlight: { language: "pseudocode", lines: [1, 2] },
    isTerminal: false,
    ...overrides,
  } as Step;
}

// ─── Layout resolution ───────────────────────────────────────────────────────

describe("layout resolution", () => {
  it("resolves the layout name from meta", () => {
    expect(resolveLayoutName(META)).toBe("array-with-pointers");
  });

  it("passes through visual.components as the layout config", () => {
    expect(resolveLayoutConfig(META)).toEqual({
      showIndices: true,
      highlightColor: "#fbbf24",
    });
  });

  it("returns an empty object when no components are defined", () => {
    const meta: ViewerMeta = { ...META, visual: { layout: "x" } };
    expect(resolveLayoutConfig(meta)).toEqual({});
  });
});

// ─── Languages ───────────────────────────────────────────────────────────────

describe("language selection", () => {
  it("lists all available implementation languages", () => {
    expect(availableLanguages(META)).toEqual(["pseudocode", "python", "javascript"]);
  });

  it("prefers meta.defaultLanguage when available", () => {
    expect(resolveInitialLanguage(META, [makeStep()])).toBe("pseudocode");
  });

  it("falls back to the first step's highlight language", () => {
    const meta: ViewerMeta = {
      ...META,
      code: { ...META.code, defaultLanguage: undefined },
    };
    const step = makeStep({ codeHighlight: { language: "python", lines: [1] } });
    expect(resolveInitialLanguage(meta, [step])).toBe("python");
  });

  it("falls back to the first implementation when nothing else matches", () => {
    const meta: ViewerMeta = {
      ...META,
      code: { ...META.code, defaultLanguage: "nonexistent" },
    };
    const step = makeStep({ codeHighlight: { language: "elvish", lines: [1] } });
    expect(resolveInitialLanguage(meta, [step])).toBe("pseudocode");
  });
});

// ─── Code lines + highlighting ───────────────────────────────────────────────

describe("code rendering", () => {
  it("splits an implementation into lines", () => {
    expect(codeLines(META, "pseudocode")).toEqual(["line1", "line2", "line3"]);
  });

  it("returns no lines for an unknown language", () => {
    expect(codeLines(META, "rust")).toEqual([]);
  });

  it("highlights lines only when the step targets the selected language", () => {
    const step = makeStep({ codeHighlight: { language: "pseudocode", lines: [2, 3] } });
    expect(highlightedLines(step, "pseudocode")).toEqual([2, 3]);
    expect(highlightedLines(step, "python")).toEqual([]);
  });

  it("returns no highlight for an undefined step", () => {
    expect(highlightedLines(undefined, "pseudocode")).toEqual([]);
  });
});

// ─── Index clamping ──────────────────────────────────────────────────────────

describe("clampIndex", () => {
  it("clamps below range to 0", () => {
    expect(clampIndex(-5, 10)).toBe(0);
  });
  it("clamps above range to last index", () => {
    expect(clampIndex(99, 10)).toBe(9);
  });
  it("passes through valid indices", () => {
    expect(clampIndex(4, 10)).toBe(4);
  });
  it("returns 0 for an empty sequence", () => {
    expect(clampIndex(3, 0)).toBe(0);
  });
});

// ─── Playback speed ──────────────────────────────────────────────────────────

describe("playback speed", () => {
  it("computes the interval at the default speed (1x)", () => {
    expect(playbackIntervalMs(DEFAULT_SPEED_INDEX)).toBe(BASE_PLAYBACK_INTERVAL_MS);
  });

  it("halves the interval at 2x and doubles at 0.5x", () => {
    const twoX = SPEED_OPTIONS.findIndex((o) => o.multiplier === 2);
    const halfX = SPEED_OPTIONS.findIndex((o) => o.multiplier === 0.5);
    expect(playbackIntervalMs(twoX)).toBe(BASE_PLAYBACK_INTERVAL_MS / 2);
    expect(playbackIntervalMs(halfX)).toBe(BASE_PLAYBACK_INTERVAL_MS / 0.5);
  });

  it("falls back to the default interval for an out-of-range index", () => {
    expect(playbackIntervalMs(999)).toBe(BASE_PLAYBACK_INTERVAL_MS);
  });

  it("cycles speed indices and wraps around", () => {
    expect(nextSpeedIndex(0)).toBe(1);
    expect(nextSpeedIndex(SPEED_OPTIONS.length - 1)).toBe(0);
  });
});

// ─── State formatting ────────────────────────────────────────────────────────

describe("formatStateValue", () => {
  it("shows strings verbatim", () => {
    expect(formatStateValue("hello")).toBe("hello");
  });
  it("pretty-prints objects as JSON", () => {
    expect(formatStateValue({ a: 1 })).toBe('{\n  "a": 1\n}');
  });
  it("degrades gracefully on circular references", () => {
    const obj: Record<string, unknown> = {};
    obj["self"] = obj;
    expect(typeof formatStateValue(obj)).toBe("string");
  });
});
