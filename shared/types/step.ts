/**
 * Shared type definitions for the Eigenvue step format and algorithm metadata.
 *
 * These interfaces are the single source of truth; the companion JSON Schemas
 * (step-format.schema.json, meta.schema.json) and Python dataclasses
 * (step.py) are kept in sync manually.
 */

// ---------------------------------------------------------------------------
// Step-related types
// ---------------------------------------------------------------------------

/**
 * A renderer directive describing one visual change that should be applied
 * when a step becomes active (e.g. highlight a node, swap two bars, etc.).
 *
 * The `type` field selects the renderer handler; every other property is
 * passed through as parameters.
 */
export interface VisualAction {
  type: string;
  [key: string]: unknown;
}

/**
 * Identifies which lines of source code should be highlighted for a given
 * step so the learner can follow the algorithm in code.
 */
export interface CodeHighlight {
  language: string;
  lines: number[];
}

/**
 * A single snapshot in an algorithm's execution trace.
 *
 * The engine produces an ordered array of `Step` objects; the front-end
 * iterates through them to drive the visualisation.
 */
export interface Step {
  /** 0-based position in the sequence. */
  index: number;
  /** Template ID that identifies the kind of step (e.g. "compare_mid", "found"). */
  id: string;
  /** Short human-readable title. */
  title: string;
  /** Plain-language narration of what is happening. */
  explanation: string;
  /** All algorithm variables captured at this point in the execution. */
  state: Record<string, unknown>;
  /** Ordered list of visual directives for the renderer. */
  visualActions: VisualAction[];
  /** Source-code highlight information. */
  codeHighlight: CodeHighlight;
  /** True when this is the final step of the trace. */
  isTerminal: boolean;
  /** Optional grouping label (e.g. "partition", "merge"). */
  phase?: string;
}

// ---------------------------------------------------------------------------
// Algorithm metadata types
// ---------------------------------------------------------------------------

export interface AlgorithmDescription {
  short: string;
  long: string;
}

export interface AlgorithmComplexity {
  time: string;
  space: string;
  level: "beginner" | "intermediate" | "advanced" | "expert";
}

export interface AlgorithmVisual {
  layout: string;
  theme?: {
    primary: string;
    secondary: string;
  };
  components?: Record<string, unknown>;
}

export interface AlgorithmInputExample {
  name: string;
  values: Record<string, unknown>;
}

export interface AlgorithmInputs {
  schema: Record<string, unknown>;
  defaults: Record<string, unknown>;
  examples: AlgorithmInputExample[];
}

export interface AlgorithmCode {
  implementations: {
    pseudocode: string;
    python: string;
    javascript?: string;
  };
  defaultLanguage: string;
}

export interface KeyConcept {
  title: string;
  description: string;
}

export interface Pitfall {
  title: string;
  description: string;
}

export interface QuizItem {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Resource {
  title: string;
  url: string;
  type: string;
}

export interface AlgorithmEducation {
  keyConcepts: KeyConcept[];
  pitfalls: Pitfall[];
  quiz: QuizItem[];
  resources: Resource[];
}

export interface AlgorithmSeo {
  keywords: string[];
  ogDescription: string;
}

/**
 * Complete metadata descriptor for a single algorithm.
 *
 * This is persisted as a JSON/YAML file and consumed by both the engine
 * (to discover available algorithms) and the front-end (to render the
 * algorithm detail page).
 */
export interface AlgorithmMeta {
  id: string;
  name: string;
  category: "classical" | "deep-learning" | "generative-ai" | "quantum";
  description: AlgorithmDescription;
  complexity: AlgorithmComplexity;
  visual: AlgorithmVisual;
  inputs: AlgorithmInputs;
  code: AlgorithmCode;
  education: AlgorithmEducation;
  seo: AlgorithmSeo;
  prerequisites: string[];
  related: string[];
  author: string;
  version: string;
}
