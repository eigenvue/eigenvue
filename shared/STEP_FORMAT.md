# Eigenvue Step Format Specification — v1.0

## Overview

The Step Format is the universal contract between algorithm **generators** and the **rendering engine** in Eigenvue. Every generator — whether TypeScript (web), Python (package), or pre-computed (build-time) — produces an array of Step objects. Every renderer consumes Step objects without knowing which generator produced them.

This specification is the single source of truth. The TypeScript interfaces (`shared/types/step.ts`), Python dataclasses (`shared/types/step.py`), and JSON Schema (`shared/step-format.schema.json`) are all derived from this document.

## Wire Format

The JSON wire format uses **camelCase** key names (matching the TypeScript convention). Python code uses snake_case internally and converts at serialization boundaries.

## Version

The current step format version is **1**. The `formatVersion` field in every StepSequence must equal `1`. Breaking changes to the step structure require incrementing this version.

## StepSequence (Top-Level Object)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `formatVersion` | integer | Yes | Must be `1`. |
| `algorithmId` | string | Yes | URL-safe algorithm identifier. Pattern: `^[a-z0-9][a-z0-9-]*$` |
| `inputs` | object | Yes | The input parameters that produced this sequence. |
| `steps` | Step[] | Yes | Ordered array of Steps. Minimum 1 element. |
| `generatedAt` | string (ISO 8601) | Yes | Timestamp of generation. |
| `generatedBy` | `"typescript"` \| `"python"` \| `"precomputed"` | Yes | Generator origin. |

## Step Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `index` | integer (≥ 0) | Yes | 0-based position. **Invariant:** `steps[i].index === i` |
| `id` | string | Yes | Template identifier. Pattern: `^[a-z0-9][a-z0-9_-]*$`. Not globally unique. |
| `title` | string | Yes | Short heading (≤ 200 chars). |
| `explanation` | string | Yes | Plain-language narration. |
| `state` | object | Yes | Snapshot of all algorithm variables. All values JSON-serializable. |
| `visualActions` | VisualAction[] | Yes | Rendering instructions. May be empty. |
| `codeHighlight` | CodeHighlight | Yes | Source code line mapping. |
| `isTerminal` | boolean | Yes | **Invariant:** True only on the last step. Exactly one step is terminal. |
| `phase` | string | No | Optional grouping label (e.g., "initialization", "search", "result"). |

## CodeHighlight

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `language` | string | Yes | Language tab identifier (e.g., "pseudocode", "python"). |
| `lines` | integer[] | Yes | 1-indexed line numbers. Non-empty. All values ≥ 1. |

## VisualAction

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | Action type identifier (open vocabulary). |
| *(additional)* | any | Varies | Action-specific parameters. |

Renderers **must silently ignore** action types they do not recognize.

## Invariants

These rules are enforced by validation and must never be violated:

1. **Index contiguity:** `steps[i].index === i` for all `i` in `[0, steps.length)`.
2. **Single terminal:** Exactly one step has `isTerminal === true`, and it is `steps[steps.length - 1]`.
3. **Attention weight sum:** For any `showAttentionWeights` action, `sum(weights) === 1.0 ± 1e-6`.
4. **Attention weight range:** Each weight in `showAttentionWeights` must be in `[0, 1]`.
5. **Range ordering:** For `highlightRange` and `dimRange`, `from <= to`.
6. **Comparison result:** For `compareElements`, `result` must be `"less"`, `"greater"`, or `"equal"`.
7. **Bar chart label count:** For `updateBarChart`, if `labels` is present, `labels.length === values.length`.
8. **Quiz answer bounds:** For quiz questions in meta.json, `0 <= correctIndex < options.length`.

## Known Visual Action Types

See `shared/types/step.ts` for the full typed definitions of all known action types. The current vocabulary includes actions for arrays, graphs, neural networks, attention mechanisms, and general-purpose messages. This vocabulary is open — new types can be added at any time without breaking existing renderers.
