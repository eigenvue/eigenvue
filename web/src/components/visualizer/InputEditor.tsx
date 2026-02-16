/**
 * @fileoverview Input Editor — Modify algorithm inputs and re-run.
 *
 * Provides form fields for the algorithm's input parameters, based on
 * the input schema in meta.json. Includes a dropdown to load preset
 * examples and a "Run" button to regenerate the step sequence.
 *
 * VALIDATION: Input validation is performed against the meta.json schema
 * before running the generator. Invalid inputs show inline error messages.
 *
 * ARRAY INPUT: Arrays are edited as comma-separated text fields.
 * The "sorted" constraint (for binary search) is validated and
 * an error is shown if the array is not in ascending order.
 */

"use client";

import { useState, useCallback } from "react";
import type { AlgorithmMeta } from "@/lib/algorithm-loader";

interface InputEditorProps {
  readonly meta: AlgorithmMeta;
  readonly currentInputs: Record<string, unknown>;
  readonly onRun: (inputs: Record<string, unknown>) => void;
}

export function InputEditor({ meta, currentInputs, onRun }: InputEditorProps) {
  const [inputs, setInputs] = useState<Record<string, string>>(() =>
    serializeInputs(currentInputs),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Serialize inputs for display (arrays as comma-separated strings).
  function serializeInputs(values: Record<string, unknown>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(values)) {
      if (Array.isArray(value)) {
        result[key] = value.join(", ");
      } else {
        result[key] = String(value);
      }
    }
    return result;
  }

  // Parse and validate inputs, then call onRun.
  const handleRun = useCallback(() => {
    const parsed: Record<string, unknown> = {};
    const newErrors: Record<string, string> = {};
    const schema = meta.inputs.schema as Record<
      string,
      { type: string; items?: { type: string }; minItems?: number; maxItems?: number; sorted?: boolean; minimum?: number; maximum?: number }
    >;

    for (const [key, fieldSchema] of Object.entries(schema)) {
      const raw = inputs[key] ?? "";

      if (fieldSchema.type === "array") {
        const parts = raw.split(",").map((s) => s.trim()).filter((s) => s !== "");
        const nums = parts.map(Number);

        if (parts.length === 0) {
          newErrors[key] = "Array must not be empty.";
          continue;
        }
        if (nums.some(isNaN)) {
          newErrors[key] = "All array values must be valid numbers.";
          continue;
        }
        if (fieldSchema.minItems && nums.length < fieldSchema.minItems) {
          newErrors[key] = `Minimum ${fieldSchema.minItems} elements required.`;
          continue;
        }
        if (fieldSchema.maxItems && nums.length > fieldSchema.maxItems) {
          newErrors[key] = `Maximum ${fieldSchema.maxItems} elements allowed.`;
          continue;
        }
        if (fieldSchema.sorted) {
          for (let i = 1; i < nums.length; i++) {
            if (nums[i]! < nums[i - 1]!) {
              newErrors[key] = "Array must be in ascending sorted order.";
              break;
            }
          }
          if (newErrors[key]) continue;
        }

        parsed[key] = nums;
      } else if (fieldSchema.type === "number") {
        const num = Number(raw);
        if (isNaN(num)) {
          newErrors[key] = "Must be a valid number.";
          continue;
        }
        if (fieldSchema.minimum !== undefined && num < fieldSchema.minimum) {
          newErrors[key] = `Minimum value is ${fieldSchema.minimum}.`;
          continue;
        }
        if (fieldSchema.maximum !== undefined && num > fieldSchema.maximum) {
          newErrors[key] = `Maximum value is ${fieldSchema.maximum}.`;
          continue;
        }
        parsed[key] = num;
      } else {
        parsed[key] = raw;
      }
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      onRun(parsed);
    }
  }, [inputs, meta.inputs.schema, onRun]);

  // Load a preset example.
  const handleLoadExample = useCallback(
    (exampleIndex: number) => {
      const example = meta.inputs.examples[exampleIndex];
      if (!example) return;
      setInputs(serializeInputs(example.values));
      setErrors({});
    },
    [meta.inputs.examples],
  );

  return (
    <div className="bg-background-surface rounded-lg border border-border p-4 space-y-3">
      <h3 className="text-xs font-mono text-text-tertiary uppercase tracking-wider">
        Inputs
      </h3>

      {/* Example presets dropdown */}
      <div>
        <label className="text-xs text-text-tertiary" htmlFor="example-select">
          Load example:
        </label>
        <select
          id="example-select"
          onChange={(e) => handleLoadExample(parseInt(e.target.value, 10))}
          defaultValue=""
          className="ml-2 text-xs bg-background-elevated text-text-primary border border-border rounded px-2 py-1"
        >
          <option value="" disabled>
            Choose...
          </option>
          {meta.inputs.examples.map((ex, i) => (
            <option key={i} value={i}>
              {ex.name}
            </option>
          ))}
        </select>
      </div>

      {/* Input fields */}
      {Object.entries(meta.inputs.schema as Record<string, { type: string; description?: string }>).map(
        ([key, fieldSchema]) => (
          <div key={key}>
            <label className="text-xs text-text-secondary" htmlFor={`input-${key}`}>
              {key}
              {fieldSchema.description && (
                <span className="text-text-disabled ml-1">— {fieldSchema.description}</span>
              )}
            </label>
            <input
              id={`input-${key}`}
              type="text"
              value={inputs[key] ?? ""}
              onChange={(e) => setInputs((prev) => ({ ...prev, [key]: e.target.value }))}
              className={`
                mt-1 w-full px-3 py-1.5 text-sm font-mono rounded-md
                bg-background-elevated text-text-primary border
                ${errors[key] ? "border-red-500" : "border-border"}
                focus:outline-none focus:border-border-focus
              `}
            />
            {errors[key] && (
              <p className="text-xs text-red-400 mt-1">{errors[key]}</p>
            )}
          </div>
        ),
      )}

      {/* Run button */}
      <button
        onClick={handleRun}
        className="w-full py-2 text-sm font-medium rounded-md bg-gradient-to-r from-gradient-from to-gradient-to text-white hover:opacity-90 transition-opacity"
      >
        Run Algorithm
      </button>
    </div>
  );
}
