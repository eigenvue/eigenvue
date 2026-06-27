// =============================================================================
// web/src/standalone/viewer-core.ts
//
// Pure, DOM-free logic for the standalone visualizer that ships inside the
// Python (`pip install eigenvue`) and Node (`npm install eigenvue`) packages.
//
// This module is deliberately free of any DOM or Canvas access so it can be
// unit-tested in isolation (jsdom does not implement Canvas 2D). The DOM/engine
// wiring lives in `viewer.ts`, which consumes these helpers.
//
// The standalone viewer reads the exact same `/api/steps` payload that the local
// server (Python Flask / Node http) produces:
//
//   { algorithmId: string, meta: AlgorithmMeta, steps: Step[] }
//
// and drives the SAME rendering engine the web app uses, so the graphical
// output is identical across the browser, Jupyter, and the CLI.
// =============================================================================

import type { Step } from "../engine/types";

/**
 * The subset of `meta.json` the standalone viewer reads. The server returns the
 * full meta object; we type only the fields we depend on so the contract is
 * explicit and stable.
 */
export interface ViewerMeta {
  readonly id: string;
  readonly name: string;
  readonly description?: { readonly short?: string };
  readonly visual: {
    readonly layout: string;
    readonly components?: Record<string, unknown>;
  };
  readonly code: {
    readonly implementations: Record<string, string>;
    readonly defaultLanguage?: string;
  };
}

/** The payload returned by the local server's `/api/steps` endpoint. */
export interface ViewerPayload {
  readonly algorithmId: string;
  readonly meta: ViewerMeta;
  readonly steps: readonly Step[];
}

/** A single playback speed option. */
export interface SpeedOption {
  readonly label: string;
  readonly multiplier: number;
}

/**
 * Playback speed multipliers, matching the web app's `usePlayback` hook so the
 * standalone experience feels the same. The base interval is divided by the
 * multiplier — higher multiplier means faster playback.
 */
export const SPEED_OPTIONS: readonly SpeedOption[] = [
  { label: "0.5×", multiplier: 0.5 },
  { label: "1×", multiplier: 1 },
  { label: "2×", multiplier: 2 },
  { label: "4×", multiplier: 4 },
];

/** Base auto-play interval in milliseconds (at 1× speed). */
export const BASE_PLAYBACK_INTERVAL_MS = 1000;

/** Index of the default speed in {@link SPEED_OPTIONS} (1×). */
export const DEFAULT_SPEED_INDEX = 1;

/**
 * Computes the auto-play interval (ms) for a given speed option index.
 * Falls back to the 1× interval for out-of-range indices.
 */
export function playbackIntervalMs(speedIndex: number): number {
  const option = SPEED_OPTIONS[speedIndex] ?? SPEED_OPTIONS[DEFAULT_SPEED_INDEX];
  return Math.round(BASE_PLAYBACK_INTERVAL_MS / option.multiplier);
}

/** Advances to the next speed option, wrapping back to the first. */
export function nextSpeedIndex(speedIndex: number): number {
  return (speedIndex + 1) % SPEED_OPTIONS.length;
}

/** The layout name the engine should resolve for this algorithm. */
export function resolveLayoutName(meta: ViewerMeta): string {
  return meta.visual.layout;
}

/**
 * The layout configuration passed to the layout function. This mirrors the web
 * app, which passes `meta.visual.components`. Returns an empty object when no
 * components are defined so layouts always receive a valid config object.
 */
export function resolveLayoutConfig(meta: ViewerMeta): Record<string, unknown> {
  return meta.visual.components ?? {};
}

/** The set of code languages available for the language tab strip. */
export function availableLanguages(meta: ViewerMeta): string[] {
  return Object.keys(meta.code.implementations);
}

/**
 * Picks the language tab to show first. Preference order:
 *   1. `meta.code.defaultLanguage`, if it has an implementation.
 *   2. The first step's `codeHighlight.language`, if available.
 *   3. The first available implementation.
 *
 * This maximizes the chance that the initially-selected tab is the one the
 * generator highlights, so code/animation stay in sync from the first frame.
 */
export function resolveInitialLanguage(meta: ViewerMeta, steps: readonly Step[]): string {
  const languages = availableLanguages(meta);
  const preferred = meta.code.defaultLanguage;
  if (preferred && languages.includes(preferred)) {
    return preferred;
  }
  const firstStepLanguage = steps[0]?.codeHighlight?.language;
  if (firstStepLanguage && languages.includes(firstStepLanguage)) {
    return firstStepLanguage;
  }
  return languages[0] ?? "";
}

/** Splits a code implementation into individual lines for rendering. */
export function codeLines(meta: ViewerMeta, language: string): string[] {
  const source = meta.code.implementations[language];
  if (source === undefined) {
    return [];
  }
  return source.split("\n");
}

/**
 * The 1-indexed line numbers to highlight for the current step in the currently
 * selected language. Highlighting only applies when the step's highlight targets
 * the selected language — otherwise the user is viewing a different translation,
 * so no line is marked (matching the web app's CodePanel behavior).
 */
export function highlightedLines(
  step: Step | undefined,
  selectedLanguage: string,
): readonly number[] {
  if (!step || step.codeHighlight.language !== selectedLanguage) {
    return [];
  }
  return step.codeHighlight.lines;
}

/** Clamps a step index into the valid `[0, length - 1]` range (min 0). */
export function clampIndex(index: number, length: number): number {
  if (length <= 0) {
    return 0;
  }
  if (index < 0) {
    return 0;
  }
  if (index > length - 1) {
    return length - 1;
  }
  return index;
}

/**
 * Formats a state value for the state inspector. Strings are shown verbatim;
 * everything else is pretty-printed JSON. Values that cannot be serialized
 * (e.g. circular references) degrade gracefully to `String(value)`.
 */
export function formatStateValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
