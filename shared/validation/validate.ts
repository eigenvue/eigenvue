/**
 * @fileoverview Validation utilities for Eigenvue step sequences and algorithm metadata.
 *
 * This module provides two layers of validation:
 *
 * 1. **Schema validation** — checks structural conformance against JSON Schema.
 *    Catches missing fields, wrong types, pattern mismatches, etc.
 *
 * 2. **Semantic validation** — checks invariants that JSON Schema cannot express.
 *    Catches index mismatches, terminal step violations, mathematical errors
 *    (e.g., attention weights not summing to 1.0), etc.
 *
 * Both layers return a ValidationResult with a boolean `valid` flag and an
 * array of human-readable `errors` strings.
 *
 * @module @eigenvue/validation
 */

import Ajv from "ajv/dist/2020";
import addFormats from "ajv-formats";

import stepFormatSchema from "../step-format.schema.json";
import metaSchema from "../meta.schema.json";
import { STEP_FORMAT_VERSION, type Step, type StepSequence } from "../types/step";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** Result of a validation operation. */
export interface ValidationResult {
  /** True if the input is valid. */
  readonly valid: boolean;
  /**
   * Human-readable error messages. Empty if valid is true.
   * Each string is a self-contained error description.
   */
  readonly errors: readonly string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// AJV SETUP (singleton — compiled once, reused)
// ─────────────────────────────────────────────────────────────────────────────

const ajv = new Ajv({
  allErrors: true,      // Report ALL errors, not just the first.
  verbose: true,        // Include schema and data in error objects.
  strict: true,         // Enforce strict schema authoring.
});
addFormats(ajv);        // Adds "date-time", "uri", etc.

const validateStepSequenceSchema = ajv.compile(stepFormatSchema);
const validateMetaSchema = ajv.compile(metaSchema);

// ─────────────────────────────────────────────────────────────────────────────
// STEP SEQUENCE VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate a step sequence against the JSON Schema AND semantic invariants.
 *
 * @param data - A parsed JSON object to validate as a StepSequence.
 * @returns A ValidationResult indicating success or listing all errors.
 *
 * @example
 * const result = validateStepSequence(parsedJson);
 * if (!result.valid) {
 *   console.error("Validation failed:", result.errors);
 * }
 */
export function validateStepSequence(data: unknown): ValidationResult {
  const errors: string[] = [];

  // ── Layer 1: JSON Schema validation ──

  const schemaValid = validateStepSequenceSchema(data);

  if (!schemaValid) {
    for (const err of validateStepSequenceSchema.errors ?? []) {
      errors.push(
        `Schema (${err.keyword}): ${err.instancePath || "/"} ${err.message ?? "unknown error"}` +
        (err.params ? ` (${JSON.stringify(err.params)})` : "")
      );
    }
    // If schema fails, semantic checks may crash — return early.
    return { valid: false, errors };
  }

  // ── Layer 2: Semantic validation (schema passed, so shape is correct) ──

  const seq = data as unknown as StepSequence;

  // 2a. Index contiguity: steps[i].index === i
  for (let i = 0; i < seq.steps.length; i++) {
    const step = seq.steps[i]!;
    if (step.index !== i) {
      errors.push(
        `Semantic: steps[${i}].index is ${step.index}, expected ${i}. ` +
        `Step indices must be contiguous and 0-based.`
      );
    }
  }

  // 2b. Terminal step: exactly one, and it must be the last
  const terminalIndices: number[] = [];
  for (let i = 0; i < seq.steps.length; i++) {
    if (seq.steps[i]!.isTerminal) {
      terminalIndices.push(i);
    }
  }

  if (terminalIndices.length === 0) {
    errors.push(
      `Semantic: No step has isTerminal=true. ` +
      `The last step must be terminal.`
    );
  } else if (terminalIndices.length > 1) {
    errors.push(
      `Semantic: Multiple steps have isTerminal=true at indices [${terminalIndices.join(", ")}]. ` +
      `Only the last step may be terminal.`
    );
  } else if (terminalIndices[0] !== seq.steps.length - 1) {
    errors.push(
      `Semantic: isTerminal=true is at index ${terminalIndices[0]}, ` +
      `but the last step is at index ${seq.steps.length - 1}. ` +
      `Only the last step may be terminal.`
    );
  }

  // 2c. Attention weights sum to 1.0 (±1e-6)
  for (let i = 0; i < seq.steps.length; i++) {
    const step = seq.steps[i]!;
    for (let j = 0; j < step.visualActions.length; j++) {
      const action = step.visualActions[j]!;
      if (action.type === "showAttentionWeights") {
        const weights = (action as { weights?: readonly number[] }).weights;
        if (Array.isArray(weights) && weights.length > 0) {
          const sum = weights.reduce((a: number, b: number) => a + b, 0);
          if (Math.abs(sum - 1.0) > 1e-6) {
            errors.push(
              `Semantic: steps[${i}].visualActions[${j}] (showAttentionWeights) ` +
              `weights sum to ${sum}, expected 1.0 (tolerance ±1e-6). ` +
              `This indicates a mathematical error in the softmax computation.`
            );
          }
          // Validate each weight is in [0, 1]
          for (let k = 0; k < weights.length; k++) {
            const w = weights[k]!;
            if (w < -1e-9 || w > 1.0 + 1e-9) {
              errors.push(
                `Semantic: steps[${i}].visualActions[${j}] (showAttentionWeights) ` +
                `weights[${k}] = ${w}, expected value in [0, 1].`
              );
            }
          }
        }
      }
    }
  }

  // 2d. HighlightRange: from <= to
  for (let i = 0; i < seq.steps.length; i++) {
    const step = seq.steps[i]!;
    for (let j = 0; j < step.visualActions.length; j++) {
      const action = step.visualActions[j]! as Record<string, unknown>;
      if (action.type === "highlightRange" || action.type === "dimRange") {
        const from = action.from as number | undefined;
        const to = action.to as number | undefined;
        if (from !== undefined && to !== undefined && from > to) {
          errors.push(
            `Semantic: steps[${i}].visualActions[${j}] (${action.type as string}) ` +
            `has from=${from} > to=${to}. 'from' must be <= 'to'.`
          );
        }
      }
    }
  }

  // 2e. CompareElements: valid result values
  for (let i = 0; i < seq.steps.length; i++) {
    const step = seq.steps[i]!;
    for (let j = 0; j < step.visualActions.length; j++) {
      const action = step.visualActions[j]! as Record<string, unknown>;
      if (action.type === "compareElements") {
        const result = action.result;
        if (result !== "less" && result !== "greater" && result !== "equal") {
          errors.push(
            `Semantic: steps[${i}].visualActions[${j}] (compareElements) ` +
            `result="${String(result)}", expected "less" | "greater" | "equal".`
          );
        }
      }
    }
  }

  // 2f. UpdateBarChart: labels length matches values length (if labels present)
  for (let i = 0; i < seq.steps.length; i++) {
    const step = seq.steps[i]!;
    for (let j = 0; j < step.visualActions.length; j++) {
      const action = step.visualActions[j]! as Record<string, unknown>;
      if (action.type === "updateBarChart") {
        const values = action.values as unknown[] | undefined;
        const labels = action.labels as unknown[] | undefined;
        if (values && labels && values.length !== labels.length) {
          errors.push(
            `Semantic: steps[${i}].visualActions[${j}] (updateBarChart) ` +
            `has ${values.length} values but ${labels.length} labels. ` +
            `If labels are provided, their count must match values.`
          );
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// ─────────────────────────────────────────────────────────────────────────────
// ALGORITHM METADATA VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate an algorithm's meta.json against the JSON Schema AND semantic invariants.
 *
 * @param data - A parsed JSON object to validate as AlgorithmMeta.
 * @returns A ValidationResult indicating success or listing all errors.
 */
export function validateAlgorithmMeta(data: unknown): ValidationResult {
  const errors: string[] = [];

  // ── Layer 1: JSON Schema ──

  const schemaValid = validateMetaSchema(data);

  if (!schemaValid) {
    for (const err of validateMetaSchema.errors ?? []) {
      errors.push(
        `Schema (${err.keyword}): ${err.instancePath || "/"} ${err.message ?? "unknown error"}` +
        (err.params ? ` (${JSON.stringify(err.params)})` : "")
      );
    }
    return { valid: false, errors };
  }

  // ── Layer 2: Semantic validation ──

  const meta = data as Record<string, unknown>;

  // 2a. Quiz correctIndex within bounds
  const education = meta.education as Record<string, unknown>;
  const quiz = education.quiz as Array<Record<string, unknown>>;
  for (let i = 0; i < quiz.length; i++) {
    const q = quiz[i]!;
    const options = q.options as string[];
    const correctIndex = q.correctIndex as number;
    if (correctIndex < 0 || correctIndex >= options.length) {
      errors.push(
        `Semantic: education.quiz[${i}].correctIndex is ${correctIndex}, ` +
        `but options has ${options.length} items. Must be in [0, ${options.length - 1}].`
      );
    }
  }

  // 2b. defaultLanguage must exist in implementations
  const code = meta.code as Record<string, unknown>;
  const implementations = code.implementations as Record<string, unknown>;
  const defaultLanguage = code.defaultLanguage as string;
  if (!(defaultLanguage in implementations)) {
    errors.push(
      `Semantic: code.defaultLanguage is "${defaultLanguage}" ` +
      `but it is not a key in code.implementations. ` +
      `Available: [${Object.keys(implementations).join(", ")}].`
    );
  }

  return { valid: errors.length === 0, errors };
}
