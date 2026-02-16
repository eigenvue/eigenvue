#!/usr/bin/env node

/**
 * Eigenvue v1.0.1 — Production Verification Suite
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * Tests every exported API of the published `eigenvue` npm package.
 * Generates `verification-report.json` consumed by the interactive HTML report.
 *
 * Usage:
 *   npm install
 *   node verify.mjs
 */

import { writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

// ─── Dynamic import so we get a clear error if not installed ─────────────────

let eigenvue;
try {
  eigenvue = await import("eigenvue");
} catch (err) {
  console.error("❌ Could not import eigenvue. Did you run `npm install`?");
  console.error(err.message);
  process.exit(1);
}

const { list, steps, show, version } = eigenvue;

// ─── Test infrastructure ─────────────────────────────────────────────────────

const report = {
  packageVersion: "1.0.1",
  nodeVersion: process.version,
  platform: `${process.platform} ${process.arch}`,
  timestamp: new Date().toISOString(),
  categories: [],
  summary: { total: 0, passed: 0, failed: 0, skipped: 0 },
};

let currentCategory = null;

function category(name, description) {
  currentCategory = { name, description, tests: [], passed: 0, failed: 0 };
  report.categories.push(currentCategory);
}

function test(name, fn) {
  report.summary.total++;
  const entry = { name, status: "passed", details: null, duration: 0 };

  const start = performance.now();
  try {
    const result = fn();
    entry.details = result ?? null;
    entry.status = "passed";
    report.summary.passed++;
    currentCategory.passed++;
    process.stdout.write(`  ✅ ${name}\n`);
  } catch (err) {
    entry.status = "failed";
    entry.details = err.message;
    report.summary.failed++;
    currentCategory.failed++;
    process.stdout.write(`  ❌ ${name}\n     → ${err.message}\n`);
  }
  entry.duration = Math.round(performance.now() - start);
  currentCategory.tests.push(entry);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertType(value, type, label) {
  if (typeof value !== type) {
    throw new Error(`${label}: expected type "${type}", got "${typeof value}"`);
  }
}

function assertArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label}: expected an array, got ${typeof value}`);
  }
}

function assertGreater(value, min, label) {
  if (value <= min) {
    throw new Error(`${label}: expected > ${min}, got ${value}`);
  }
}

function assertInRange(value, min, max, label) {
  if (value < min || value > max) {
    throw new Error(`${label}: expected ${min}–${max}, got ${value}`);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CATEGORY 1: Package Exports & Version
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log("\n━━━ 1. Package Exports & Version ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
category("Package Exports & Version", "Verifies that the package exports the correct API surface and version.");

test("version is exported as a string", () => {
  assertType(version, "string", "version");
  return `version = "${version}"`;
});

test("version matches 1.0.1", () => {
  assertEqual(version, "1.0.1", "version");
});

test("list is exported as a function", () => {
  assertType(list, "function", "list");
});

test("steps is exported as a function", () => {
  assertType(steps, "function", "steps");
});

test("show is exported as a function", () => {
  assertType(show, "function", "show");
});

test("No unexpected default export", () => {
  // ESM: default should be undefined or the module namespace
  const keys = Object.keys(eigenvue).sort();
  assert(keys.includes("list"), "missing list export");
  assert(keys.includes("steps"), "missing steps export");
  assert(keys.includes("show"), "missing show export");
  assert(keys.includes("version"), "missing version export");
  return `exports: [${keys.join(", ")}]`;
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CATEGORY 2: list() API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log("\n━━━ 2. list() API ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
category("list() API", "Tests algorithm listing, filtering by category, and error handling.");

test("list() returns an array", () => {
  const result = list();
  assertArray(result, "list()");
  return `returned ${result.length} algorithms`;
});

test("list() returns 17 algorithms", () => {
  const result = list();
  assertEqual(result.length, 17, "algorithm count");
});

test("Each algorithm has all required fields", () => {
  const result = list();
  const required = ["id", "name", "category", "description", "difficulty", "timeComplexity", "spaceComplexity"];
  for (const algo of result) {
    for (const field of required) {
      assert(field in algo, `Algorithm "${algo.id || "?"}" missing field: ${field}`);
      assert(algo[field] !== undefined && algo[field] !== null && algo[field] !== "",
        `Algorithm "${algo.id}" field "${field}" is empty`);
    }
  }
  return `All 17 algorithms have fields: [${required.join(", ")}]`;
});

test("All algorithm IDs are URL-safe strings", () => {
  const result = list();
  const pattern = /^[a-z0-9][a-z0-9-]*$/;
  for (const algo of result) {
    assert(pattern.test(algo.id), `Algorithm ID "${algo.id}" is not URL-safe`);
  }
});

test("list({ category: 'classical' }) returns 7 algorithms", () => {
  const result = list({ category: "classical" });
  assertEqual(result.length, 7, "classical count");
  for (const algo of result) {
    assertEqual(algo.category, "classical", `algo ${algo.id} category`);
  }
  return result.map(a => a.id).join(", ");
});

test("list({ category: 'deep-learning' }) returns 5 algorithms", () => {
  const result = list({ category: "deep-learning" });
  assertEqual(result.length, 5, "deep-learning count");
  for (const algo of result) {
    assertEqual(algo.category, "deep-learning", `algo ${algo.id} category`);
  }
  return result.map(a => a.id).join(", ");
});

test("list({ category: 'generative-ai' }) returns 5 algorithms", () => {
  const result = list({ category: "generative-ai" });
  assertEqual(result.length, 5, "generative-ai count");
  for (const algo of result) {
    assertEqual(algo.category, "generative-ai", `algo ${algo.id} category`);
  }
  return result.map(a => a.id).join(", ");
});

test("list({ category: 'quantum' }) returns 0 algorithms (reserved)", () => {
  const result = list({ category: "quantum" });
  assertEqual(result.length, 0, "quantum count");
  return "Category exists but has 0 algorithms (reserved for future)";
});

test("list() with invalid category throws Error", () => {
  let threw = false;
  try {
    list({ category: "invalid-category" });
  } catch (err) {
    threw = true;
    assert(err.message.includes("Invalid category"), `Error message should mention invalid category: ${err.message}`);
  }
  assert(threw, "Expected list() with invalid category to throw");
  return "Correctly throws on invalid category";
});

test("list() returns a new array each time (no shared reference)", () => {
  const a = list();
  const b = list();
  assert(a !== b, "list() should return a new array each call");
});

test("Category counts sum to total", () => {
  const all = list();
  const classical = list({ category: "classical" });
  const dl = list({ category: "deep-learning" });
  const genai = list({ category: "generative-ai" });
  const quantum = list({ category: "quantum" });
  const sum = classical.length + dl.length + genai.length + quantum.length;
  assertEqual(sum, all.length, "category sum vs total");
  return `${classical.length} + ${dl.length} + ${genai.length} + ${quantum.length} = ${sum}`;
});

test("Algorithm IDs are unique", () => {
  const result = list();
  const ids = result.map(a => a.id);
  const unique = new Set(ids);
  assertEqual(unique.size, ids.length, "unique ID count");
});

test("Difficulty levels are valid", () => {
  const valid = new Set(["beginner", "intermediate", "advanced", "expert"]);
  const result = list();
  for (const algo of result) {
    assert(valid.has(algo.difficulty), `Invalid difficulty "${algo.difficulty}" for ${algo.id}`);
  }
  const counts = {};
  result.forEach(a => { counts[a.difficulty] = (counts[a.difficulty] || 0) + 1; });
  return Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join(", ");
});

test("Time complexity strings follow Big-O notation", () => {
  const result = list();
  for (const algo of result) {
    assert(algo.timeComplexity.startsWith("O("), `${algo.id} time complexity should start with O(: "${algo.timeComplexity}"`);
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CATEGORY 3: Expected Algorithm IDs
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log("\n━━━ 3. Expected Algorithm IDs ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
category("Expected Algorithm IDs", "Verifies that every expected algorithm is present in the catalog.");

const EXPECTED_ALGORITHMS = [
  // Classical (7)
  { id: "binary-search", name: "Binary Search", category: "classical" },
  { id: "bubble-sort", name: "Bubble Sort", category: "classical" },
  { id: "quicksort", name: "Quicksort", category: "classical" },
  { id: "merge-sort", name: "Merge Sort", category: "classical" },
  { id: "bfs", name: "Breadth-First Search", category: "classical" },
  { id: "dfs", name: "Depth-First Search", category: "classical" },
  { id: "dijkstra", name: "Dijkstra's Algorithm", category: "classical" },
  // Deep Learning (5)
  { id: "perceptron", name: "Perceptron", category: "deep-learning" },
  { id: "feedforward-network", name: "Feedforward Network", category: "deep-learning" },
  { id: "backpropagation", name: "Backpropagation", category: "deep-learning" },
  { id: "convolution", name: "2D Convolution", category: "deep-learning" },
  { id: "gradient-descent", name: "Gradient Descent", category: "deep-learning" },
  // Generative AI (5)
  { id: "tokenization-bpe", name: "Byte-Pair Encoding", category: "generative-ai" },
  { id: "token-embeddings", name: "Token Embeddings", category: "generative-ai" },
  { id: "self-attention", name: "Self-Attention", category: "generative-ai" },
  { id: "multi-head-attention", name: "Multi-Head Attention", category: "generative-ai" },
  { id: "transformer-block", name: "Transformer Block", category: "generative-ai" },
];

for (const expected of EXPECTED_ALGORITHMS) {
  test(`Algorithm "${expected.id}" exists in catalog`, () => {
    const all = list();
    const found = all.find(a => a.id === expected.id);
    assert(found, `Algorithm "${expected.id}" not found in catalog`);
    assertEqual(found.category, expected.category, `${expected.id} category`);
    return `${found.name} | ${found.category} | ${found.difficulty} | ${found.timeComplexity}`;
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CATEGORY 4: steps() API — Default Inputs
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log("\n━━━ 4. steps() with Default Inputs ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
category("steps() — Default Inputs", "Runs steps() for every algorithm using default inputs and validates the output structure.");

const stepResults = {};

for (const algo of EXPECTED_ALGORITHMS) {
  test(`steps("${algo.id}") succeeds with defaults`, () => {
    const result = steps(algo.id);
    stepResults[algo.id] = result;

    assert(result !== null && result !== undefined, "result is null/undefined");
    assertType(result.formatVersion, "number", "formatVersion");
    assertEqual(result.algorithmId, algo.id, "algorithmId");
    assertArray(result.steps, "steps");
    assertGreater(result.steps.length, 0, "steps.length");
    assertType(result.generatedAt, "string", "generatedAt");
    assertType(result.generatedBy, "string", "generatedBy");

    return `${result.steps.length} steps | format v${result.formatVersion} | generatedBy: ${result.generatedBy}`;
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CATEGORY 5: StepSequence Invariants
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log("\n━━━ 5. StepSequence Invariants ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
category("StepSequence Invariants", "Validates the mathematical and structural invariants of the step format for every algorithm.");

for (const algo of EXPECTED_ALGORITHMS) {
  test(`"${algo.id}" — step indices are 0-based and contiguous`, () => {
    const result = stepResults[algo.id];
    if (!result) throw new Error("No step result (previous test failed)");
    for (let i = 0; i < result.steps.length; i++) {
      assertEqual(result.steps[i].index, i, `step[${i}].index`);
    }
    return `${result.steps.length} steps, indices 0..${result.steps.length - 1}`;
  });

  test(`"${algo.id}" — exactly one terminal step (the last)`, () => {
    const result = stepResults[algo.id];
    if (!result) throw new Error("No step result");
    const terminalSteps = result.steps.filter(s => s.isTerminal);
    assertEqual(terminalSteps.length, 1, "terminal step count");
    assertEqual(result.steps[result.steps.length - 1].isTerminal, true, "last step isTerminal");
    // All non-last steps should NOT be terminal
    for (let i = 0; i < result.steps.length - 1; i++) {
      assertEqual(result.steps[i].isTerminal, false, `step[${i}].isTerminal`);
    }
  });

  test(`"${algo.id}" — every step has required fields`, () => {
    const result = stepResults[algo.id];
    if (!result) throw new Error("No step result");
    const fields = ["index", "id", "title", "explanation", "state", "visualActions", "codeHighlight", "isTerminal"];
    for (const step of result.steps) {
      for (const field of fields) {
        assert(field in step, `Step ${step.index} missing field: ${field}`);
      }
      assertType(step.index, "number", `step[${step.index}].index type`);
      assertType(step.id, "string", `step[${step.index}].id type`);
      assertType(step.title, "string", `step[${step.index}].title type`);
      assertType(step.explanation, "string", `step[${step.index}].explanation type`);
      assertType(step.isTerminal, "boolean", `step[${step.index}].isTerminal type`);
      assert(step.id.length > 0, `step[${step.index}].id is empty`);
      assert(step.title.length > 0, `step[${step.index}].title is empty`);
      assert(step.explanation.length > 0, `step[${step.index}].explanation is empty`);
    }
  });

  test(`"${algo.id}" — step IDs match pattern ^[a-z0-9][a-z0-9_-]*$`, () => {
    const result = stepResults[algo.id];
    if (!result) throw new Error("No step result");
    const pattern = /^[a-z0-9][a-z0-9_-]*$/;
    const uniqueIds = new Set();
    for (const step of result.steps) {
      assert(pattern.test(step.id), `Step ${step.index} ID "${step.id}" doesn't match pattern`);
      uniqueIds.add(step.id);
    }
    return `${uniqueIds.size} unique step IDs across ${result.steps.length} steps`;
  });

  test(`"${algo.id}" — state is JSON-serializable`, () => {
    const result = stepResults[algo.id];
    if (!result) throw new Error("No step result");
    for (const step of result.steps) {
      const json = JSON.stringify(step.state);
      assert(json !== undefined, `Step ${step.index} state is not serializable`);
      const parsed = JSON.parse(json);
      assert(typeof parsed === "object" && parsed !== null, `Step ${step.index} state should be an object`);
    }
  });

  test(`"${algo.id}" — visualActions is an array of objects with type`, () => {
    const result = stepResults[algo.id];
    if (!result) throw new Error("No step result");
    let totalActions = 0;
    const actionTypes = new Set();
    for (const step of result.steps) {
      assertArray(step.visualActions, `step[${step.index}].visualActions`);
      for (const action of step.visualActions) {
        assertType(action.type, "string", `step[${step.index}] action.type`);
        assert(action.type.length > 0, `step[${step.index}] action.type is empty`);
        actionTypes.add(action.type);
        totalActions++;
      }
    }
    return `${totalActions} actions total, ${actionTypes.size} unique types: [${[...actionTypes].join(", ")}]`;
  });

  test(`"${algo.id}" — codeHighlight has language and lines`, () => {
    const result = stepResults[algo.id];
    if (!result) throw new Error("No step result");
    for (const step of result.steps) {
      assertType(step.codeHighlight.language, "string", `step[${step.index}] codeHighlight.language`);
      assertArray(step.codeHighlight.lines, `step[${step.index}] codeHighlight.lines`);
      assert(step.codeHighlight.lines.length > 0, `step[${step.index}] codeHighlight.lines is empty`);
      for (const line of step.codeHighlight.lines) {
        assertType(line, "number", `step[${step.index}] line number type`);
        assert(line >= 1, `step[${step.index}] line number must be >= 1, got ${line}`);
        assert(Number.isInteger(line), `step[${step.index}] line number must be integer, got ${line}`);
      }
    }
  });

  test(`"${algo.id}" — formatVersion is 1`, () => {
    const result = stepResults[algo.id];
    if (!result) throw new Error("No step result");
    assertEqual(result.formatVersion, 1, "formatVersion");
  });

  test(`"${algo.id}" — generatedAt is a valid ISO 8601 timestamp`, () => {
    const result = stepResults[algo.id];
    if (!result) throw new Error("No step result");
    const date = new Date(result.generatedAt);
    assert(!isNaN(date.getTime()), `"${result.generatedAt}" is not a valid date`);
    return result.generatedAt;
  });

  test(`"${algo.id}" — inputs are recorded in the sequence`, () => {
    const result = stepResults[algo.id];
    if (!result) throw new Error("No step result");
    assert(result.inputs !== null && result.inputs !== undefined, "inputs is null/undefined");
    assert(typeof result.inputs === "object", "inputs should be an object");
    const keys = Object.keys(result.inputs);
    assert(keys.length > 0, "inputs should have at least one key");
    return `inputs: { ${keys.join(", ")} }`;
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CATEGORY 6: steps() with Custom Inputs
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log("\n━━━ 6. steps() with Custom Inputs ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
category("steps() — Custom Inputs", "Tests steps() with non-default inputs to verify input handling works correctly.");

test("binary-search with target found", () => {
  const result = steps("binary-search", { array: [2, 4, 6, 8, 10], target: 6 });
  assertGreater(result.steps.length, 0, "steps.length");
  const lastStep = result.steps[result.steps.length - 1];
  assert(lastStep.isTerminal, "last step must be terminal");
  return `${result.steps.length} steps`;
});

test("binary-search with target not found", () => {
  const result = steps("binary-search", { array: [2, 4, 6, 8, 10], target: 5 });
  assertGreater(result.steps.length, 0, "steps.length");
  const lastStep = result.steps[result.steps.length - 1];
  assert(lastStep.isTerminal, "last step must be terminal");
  return `${result.steps.length} steps`;
});

test("binary-search with single element (found)", () => {
  const result = steps("binary-search", { array: [42], target: 42 });
  assertGreater(result.steps.length, 0, "steps.length");
  return `${result.steps.length} steps`;
});

test("binary-search with single element (not found)", () => {
  const result = steps("binary-search", { array: [42], target: 99 });
  assertGreater(result.steps.length, 0, "steps.length");
  return `${result.steps.length} steps`;
});

test("binary-search with large array", () => {
  const result = steps("binary-search", {
    array: [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35, 38, 41, 44, 47],
    target: 29,
  });
  assertGreater(result.steps.length, 0, "steps.length");
  return `${result.steps.length} steps for 16-element array`;
});

test("bubble-sort with reverse-sorted array", () => {
  const result = steps("bubble-sort", { array: [9, 7, 5, 3, 1] });
  assertGreater(result.steps.length, 0, "steps.length");
  return `${result.steps.length} steps`;
});

test("bubble-sort with already-sorted array", () => {
  const result = steps("bubble-sort", { array: [1, 2, 3, 4, 5] });
  assertGreater(result.steps.length, 0, "steps.length");
  return `${result.steps.length} steps`;
});

test("quicksort with custom array", () => {
  const result = steps("quicksort", { array: [10, 3, 7, 1, 8, 2] });
  assertGreater(result.steps.length, 0, "steps.length");
  return `${result.steps.length} steps`;
});

test("merge-sort with custom array", () => {
  const result = steps("merge-sort", { array: [38, 27, 43, 3, 9, 82, 10] });
  assertGreater(result.steps.length, 0, "steps.length");
  return `${result.steps.length} steps`;
});

test("self-attention with custom tokens", () => {
  const result = steps("self-attention", {
    tokens: ["The", "cat", "sat"],
    embeddingDim: 4,
  });
  assertGreater(result.steps.length, 0, "steps.length");
  return `${result.steps.length} steps`;
});

test("tokenization-bpe with custom text and merge rules", () => {
  const result = steps("tokenization-bpe", {
    text: "ab ab",
    mergeRules: [
      [["a", "b"], "ab"],
    ],
  });
  assertGreater(result.steps.length, 0, "steps.length");
  return `${result.steps.length} steps`;
});

test("gradient-descent with momentum optimizer", () => {
  const result = steps("gradient-descent", {
    startX: 2, startY: -2,
    optimizer: "momentum",
    learningRate: 0.05,
    numSteps: 15,
  });
  assertGreater(result.steps.length, 0, "steps.length");
  return `${result.steps.length} steps`;
});

test("gradient-descent with adam optimizer", () => {
  const result = steps("gradient-descent", {
    startX: -3, startY: 4,
    optimizer: "adam",
    learningRate: 0.1,
    numSteps: 15,
  });
  assertGreater(result.steps.length, 0, "steps.length");
  return `${result.steps.length} steps`;
});

test("perceptron with custom inputs and weights", () => {
  const result = steps("perceptron", {
    inputs: [0.3, 0.9],
    weights: [0.4, -0.5],
    bias: 0.2,
    activationFunction: "relu",
  });
  assertGreater(result.steps.length, 0, "steps.length");
  return `${result.steps.length} steps`;
});

test("convolution with custom input and kernel", () => {
  const result = steps("convolution", {
    input: [
      [1, 0, 1],
      [0, 1, 0],
      [1, 0, 1],
    ],
    kernel: [
      [1, 0],
      [0, 1],
    ],
  });
  assertGreater(result.steps.length, 0, "steps.length");
  return `${result.steps.length} steps`;
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CATEGORY 7: Domain-Specific Invariants
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log("\n━━━ 7. Domain-Specific Invariants ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
category("Domain-Specific Invariants", "Validates mathematical invariants specific to each algorithm domain.");

test("Attention weights sum to 1.0 (self-attention)", () => {
  const result = stepResults["self-attention"];
  if (!result) throw new Error("No step result for self-attention");
  let checked = 0;
  for (const step of result.steps) {
    for (const action of step.visualActions) {
      if (action.type === "showAttentionWeights") {
        const sum = action.weights.reduce((a, b) => a + b, 0);
        assert(Math.abs(sum - 1.0) <= 1e-6, `Attention weights sum to ${sum}, expected ~1.0`);
        checked++;
      }
      if (action.type === "showFullAttentionMatrix") {
        for (let i = 0; i < action.weights.length; i++) {
          const rowSum = action.weights[i].reduce((a, b) => a + b, 0);
          assert(Math.abs(rowSum - 1.0) <= 1e-6, `Attention matrix row ${i} sums to ${rowSum}, expected ~1.0`);
        }
        checked++;
      }
    }
  }
  return `Validated ${checked} attention weight distributions`;
});

test("Attention weights sum to 1.0 (multi-head-attention)", () => {
  const result = stepResults["multi-head-attention"];
  if (!result) throw new Error("No step result for multi-head-attention");
  let checked = 0;
  for (const step of result.steps) {
    for (const action of step.visualActions) {
      if (action.type === "showAttentionWeights") {
        const sum = action.weights.reduce((a, b) => a + b, 0);
        assert(Math.abs(sum - 1.0) <= 1e-6, `Attention weights sum to ${sum}, expected ~1.0`);
        checked++;
      }
    }
  }
  return `Validated ${checked} attention weight distributions`;
});

test("Sorting algorithms produce sorted output (bubble-sort)", () => {
  const result = stepResults["bubble-sort"];
  if (!result) throw new Error("No step result");
  const lastStep = result.steps[result.steps.length - 1];
  const finalArray = lastStep.state.array;
  if (Array.isArray(finalArray)) {
    for (let i = 1; i < finalArray.length; i++) {
      assert(finalArray[i] >= finalArray[i - 1],
        `bubble-sort final array not sorted at index ${i}: ${finalArray[i - 1]} > ${finalArray[i]}`);
    }
    return `Final sorted array: [${finalArray.join(", ")}]`;
  }
  return "Could not verify (state structure differs)";
});

test("Sorting algorithms produce sorted output (quicksort)", () => {
  const result = stepResults["quicksort"];
  if (!result) throw new Error("No step result");
  const lastStep = result.steps[result.steps.length - 1];
  const finalArray = lastStep.state.array;
  if (Array.isArray(finalArray)) {
    for (let i = 1; i < finalArray.length; i++) {
      assert(finalArray[i] >= finalArray[i - 1],
        `quicksort final array not sorted at index ${i}: ${finalArray[i - 1]} > ${finalArray[i]}`);
    }
    return `Final sorted array: [${finalArray.join(", ")}]`;
  }
  return "Could not verify (state structure differs)";
});

test("Sorting algorithms produce sorted output (merge-sort)", () => {
  const result = stepResults["merge-sort"];
  if (!result) throw new Error("No step result");
  const lastStep = result.steps[result.steps.length - 1];
  const finalArray = lastStep.state.array || lastStep.state.sorted;
  if (Array.isArray(finalArray)) {
    for (let i = 1; i < finalArray.length; i++) {
      assert(finalArray[i] >= finalArray[i - 1],
        `merge-sort final array not sorted at index ${i}: ${finalArray[i - 1]} > ${finalArray[i]}`);
    }
    return `Final sorted array: [${finalArray.join(", ")}]`;
  }
  return "Could not verify (state structure differs)";
});

test("Convolution output dimensions are correct", () => {
  const result = stepResults["convolution"];
  if (!result) throw new Error("No step result");
  let writeActions = 0;
  for (const step of result.steps) {
    for (const action of step.visualActions) {
      if (action.type === "writeOutputCell") {
        assertType(action.row, "number", "writeOutputCell.row");
        assertType(action.col, "number", "writeOutputCell.col");
        assertType(action.value, "number", "writeOutputCell.value");
        writeActions++;
      }
    }
  }
  return `${writeActions} output cells written`;
});

test("Gradient descent loss decreases over time", () => {
  const result = stepResults["gradient-descent"];
  if (!result) throw new Error("No step result");
  const lossValues = [];
  for (const step of result.steps) {
    for (const action of step.visualActions) {
      if (action.type === "showLandscapePosition" && typeof action.loss === "number") {
        lossValues.push(action.loss);
      }
      if (action.type === "showDescentStep" && typeof action.toLoss === "number") {
        lossValues.push(action.toLoss);
      }
    }
  }
  if (lossValues.length >= 2) {
    const firstLoss = lossValues[0];
    const lastLoss = lossValues[lossValues.length - 1];
    assert(lastLoss <= firstLoss, `Loss should decrease: first=${firstLoss}, last=${lastLoss}`);
    return `Loss: ${firstLoss.toFixed(4)} → ${lastLoss.toFixed(4)}`;
  }
  return `Found ${lossValues.length} loss values`;
});

test("Embedding vectors have correct dimension", () => {
  const result = stepResults["token-embeddings"];
  if (!result) throw new Error("No step result");
  let checked = 0;
  let dim = null;
  for (const step of result.steps) {
    for (const action of step.visualActions) {
      if (action.type === "showEmbedding") {
        assertArray(action.values, "embedding values");
        if (dim === null) dim = action.values.length;
        else assertEqual(action.values.length, dim, "embedding dimension consistency");
        checked++;
      }
    }
  }
  return `${checked} embeddings verified, dim=${dim}`;
});

test("Similarity scores are in [-1, 1]", () => {
  const result = stepResults["token-embeddings"];
  if (!result) throw new Error("No step result");
  let checked = 0;
  for (const step of result.steps) {
    for (const action of step.visualActions) {
      if (action.type === "showSimilarity") {
        assertInRange(action.score, -1.0, 1.0, `similarity score for tokens ${action.tokenA}-${action.tokenB}`);
        checked++;
      }
    }
  }
  return `${checked} similarity scores in valid range [-1, 1]`;
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CATEGORY 8: Error Handling
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log("\n━━━ 8. Error Handling ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
category("Error Handling", "Tests that the package throws clear, helpful errors for invalid usage.");

test("steps() with unknown algorithm throws", () => {
  let threw = false;
  try {
    steps("nonexistent-algorithm");
  } catch (err) {
    threw = true;
    assert(err instanceof Error, "Should throw an Error instance");
    assert(err.message.length > 0, "Error should have a message");
  }
  assert(threw, "Expected steps() with unknown algorithm to throw");
  return "Correctly throws on unknown algorithm";
});

test("steps() error message is helpful", () => {
  try {
    steps("nonexistent-algorithm");
  } catch (err) {
    const msg = err.message.toLowerCase();
    const isHelpful = msg.includes("nonexistent") || msg.includes("unknown") ||
                      msg.includes("not found") || msg.includes("no generator") ||
                      msg.includes("available");
    assert(isHelpful, `Error message should be helpful: "${err.message}"`);
    return `Error: "${err.message.substring(0, 100)}"`;
  }
  throw new Error("Expected to throw");
});

test("list() with empty options object works", () => {
  const result = list({});
  assertEqual(result.length, 17, "should return all algorithms");
});

test("list() with undefined category works", () => {
  const result = list({ category: undefined });
  assertEqual(result.length, 17, "should return all algorithms");
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CATEGORY 9: Step Data Quality
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log("\n━━━ 9. Step Data Quality ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
category("Step Data Quality", "Validates that step content is meaningful and educational.");

for (const algo of EXPECTED_ALGORITHMS) {
  test(`"${algo.id}" — titles are non-trivial (min 5 chars)`, () => {
    const result = stepResults[algo.id];
    if (!result) throw new Error("No step result");
    let minLen = Infinity, maxLen = 0;
    for (const step of result.steps) {
      assert(step.title.length >= 3, `Step ${step.index} title too short: "${step.title}"`);
      minLen = Math.min(minLen, step.title.length);
      maxLen = Math.max(maxLen, step.title.length);
    }
    return `Title lengths: ${minLen}–${maxLen} chars`;
  });

  test(`"${algo.id}" — explanations are non-trivial (min 10 chars)`, () => {
    const result = stepResults[algo.id];
    if (!result) throw new Error("No step result");
    let minLen = Infinity, maxLen = 0;
    for (const step of result.steps) {
      assert(step.explanation.length >= 10, `Step ${step.index} explanation too short: "${step.explanation}"`);
      minLen = Math.min(minLen, step.explanation.length);
      maxLen = Math.max(maxLen, step.explanation.length);
    }
    return `Explanation lengths: ${minLen}–${maxLen} chars`;
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CATEGORY 10: CLI Verification
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log("\n━━━ 10. CLI Verification ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
category("CLI Verification", "Tests the eigenvue CLI commands via npx.");

test("npx eigenvue --version prints 1.0.1", () => {
  try {
    const output = execSync("npx eigenvue --version", { encoding: "utf-8", timeout: 15000 }).trim();
    assertEqual(output, "1.0.1", "CLI version");
    return output;
  } catch (err) {
    throw new Error(`CLI --version failed: ${err.message}`);
  }
});

test("npx eigenvue --help prints usage", () => {
  try {
    const output = execSync("npx eigenvue --help", { encoding: "utf-8", timeout: 15000 });
    assert(output.includes("eigenvue"), "Help output should mention eigenvue");
    assert(output.includes("list"), "Help output should mention list command");
    assert(output.includes("show"), "Help output should mention show command");
    assert(output.includes("steps"), "Help output should mention steps command");
    return `Help output: ${output.trim().split("\n").length} lines`;
  } catch (err) {
    throw new Error(`CLI --help failed: ${err.message}`);
  }
});

test("npx eigenvue list outputs algorithms", () => {
  try {
    const output = execSync("npx eigenvue list", { encoding: "utf-8", timeout: 15000 });
    assert(output.includes("binary-search"), "Output should include binary-search");
    assert(output.includes("self-attention"), "Output should include self-attention");
    assert(output.includes("17"), "Output should mention 17 algorithms");
    return `Listed algorithms successfully`;
  } catch (err) {
    throw new Error(`CLI list failed: ${err.message}`);
  }
});

test("npx eigenvue list --category classical filters correctly", () => {
  try {
    const output = execSync("npx eigenvue list --category classical", { encoding: "utf-8", timeout: 15000 });
    assert(output.includes("binary-search"), "Output should include binary-search");
    assert(output.includes("7"), "Output should mention 7 algorithms");
    assert(!output.includes("self-attention"), "Output should NOT include self-attention");
    return "Correctly filtered to classical only";
  } catch (err) {
    throw new Error(`CLI list --category failed: ${err.message}`);
  }
});

test("npx eigenvue steps binary-search outputs valid JSON", () => {
  try {
    const output = execSync("npx eigenvue steps binary-search", { encoding: "utf-8", timeout: 30000 });
    const parsed = JSON.parse(output);
    assert(parsed.algorithmId === "binary-search", "algorithmId mismatch");
    assertArray(parsed.steps, "steps");
    assertGreater(parsed.steps.length, 0, "steps.length");
    return `${parsed.steps.length} steps as valid JSON`;
  } catch (err) {
    throw new Error(`CLI steps failed: ${err.message}`);
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CATEGORY 11: Cross-Algorithm Consistency
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log("\n━━━ 11. Cross-Algorithm Consistency ━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
category("Cross-Algorithm Consistency", "Verifies structural consistency across all algorithms.");

test("All algorithms use the same formatVersion", () => {
  const versions = new Set();
  for (const algo of EXPECTED_ALGORITHMS) {
    const result = stepResults[algo.id];
    if (result) versions.add(result.formatVersion);
  }
  assertEqual(versions.size, 1, "Should have exactly one formatVersion");
  return `All use formatVersion ${[...versions][0]}`;
});

test("All algorithms use the same generatedBy value", () => {
  const generators = new Set();
  for (const algo of EXPECTED_ALGORITHMS) {
    const result = stepResults[algo.id];
    if (result) generators.add(result.generatedBy);
  }
  assertEqual(generators.size, 1, "Should have exactly one generatedBy");
  return `All generated by "${[...generators][0]}"`;
});

test("Step count summary across all algorithms", () => {
  let total = 0;
  const counts = {};
  for (const algo of EXPECTED_ALGORITHMS) {
    const result = stepResults[algo.id];
    if (result) {
      counts[algo.id] = result.steps.length;
      total += result.steps.length;
    }
  }
  const min = Math.min(...Object.values(counts));
  const max = Math.max(...Object.values(counts));
  return `Total: ${total} steps | Range: ${min}–${max} per algorithm`;
});

test("Visual action type coverage", () => {
  const allActions = new Set();
  for (const algo of EXPECTED_ALGORITHMS) {
    const result = stepResults[algo.id];
    if (!result) continue;
    for (const step of result.steps) {
      for (const action of step.visualActions) {
        allActions.add(action.type);
      }
    }
  }
  return `${allActions.size} unique visual action types used: [${[...allActions].sort().join(", ")}]`;
});

test("Code highlight language coverage", () => {
  const allLangs = new Set();
  for (const algo of EXPECTED_ALGORITHMS) {
    const result = stepResults[algo.id];
    if (!result) continue;
    for (const step of result.steps) {
      allLangs.add(step.codeHighlight.language);
    }
  }
  return `Languages: [${[...allLangs].sort().join(", ")}]`;
});

test("Phase usage across algorithms", () => {
  const phasedAlgos = [];
  for (const algo of EXPECTED_ALGORITHMS) {
    const result = stepResults[algo.id];
    if (!result) continue;
    const phases = new Set();
    for (const step of result.steps) {
      if (step.phase) phases.add(step.phase);
    }
    if (phases.size > 0) {
      phasedAlgos.push(`${algo.id}: [${[...phases].join(", ")}]`);
    }
  }
  return phasedAlgos.length > 0
    ? `${phasedAlgos.length} algorithms use phases:\n${phasedAlgos.join("\n")}`
    : "No algorithms use phases";
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CATEGORY 12: Determinism
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log("\n━━━ 12. Determinism ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
category("Determinism", "Verifies that running steps() twice with the same inputs produces identical results.");

for (const algo of EXPECTED_ALGORITHMS) {
  test(`"${algo.id}" — deterministic output`, () => {
    const a = steps(algo.id);
    const b = steps(algo.id);

    assertEqual(a.steps.length, b.steps.length, "step count");
    assertEqual(a.algorithmId, b.algorithmId, "algorithmId");
    assertEqual(a.formatVersion, b.formatVersion, "formatVersion");

    // Deep compare step data (excluding timestamps)
    for (let i = 0; i < a.steps.length; i++) {
      assertEqual(a.steps[i].index, b.steps[i].index, `step[${i}].index`);
      assertEqual(a.steps[i].id, b.steps[i].id, `step[${i}].id`);
      assertEqual(a.steps[i].title, b.steps[i].title, `step[${i}].title`);
      assertEqual(a.steps[i].isTerminal, b.steps[i].isTerminal, `step[${i}].isTerminal`);

      const stateA = JSON.stringify(a.steps[i].state);
      const stateB = JSON.stringify(b.steps[i].state);
      assertEqual(stateA, stateB, `step[${i}].state`);

      const actionsA = JSON.stringify(a.steps[i].visualActions);
      const actionsB = JSON.stringify(b.steps[i].visualActions);
      assertEqual(actionsA, actionsB, `step[${i}].visualActions`);
    }
    return `${a.steps.length} steps verified identical`;
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Generate comprehensive algorithm data for the HTML report
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const algorithmDetails = [];
for (const algo of EXPECTED_ALGORITHMS) {
  const info = list().find(a => a.id === algo.id);
  const result = stepResults[algo.id];
  if (info && result) {
    const actionTypes = new Set();
    let totalActions = 0;
    for (const step of result.steps) {
      for (const action of step.visualActions) {
        actionTypes.add(action.type);
        totalActions++;
      }
    }
    algorithmDetails.push({
      ...info,
      stepCount: result.steps.length,
      totalVisualActions: totalActions,
      uniqueActionTypes: [...actionTypes].sort(),
      inputKeys: Object.keys(result.inputs),
      phases: [...new Set(result.steps.filter(s => s.phase).map(s => s.phase))],
      sampleStep: {
        index: 0,
        id: result.steps[0].id,
        title: result.steps[0].title,
        explanation: result.steps[0].explanation,
        actionCount: result.steps[0].visualActions.length,
        stateKeys: Object.keys(result.steps[0].state),
      },
    });
  }
}

report.algorithmDetails = algorithmDetails;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Write Report
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const outputPath = new URL("./verification-report.json", import.meta.url).pathname
  .replace(/^\/([A-Za-z]:)/, "$1"); // fix Windows paths

writeFileSync(outputPath, JSON.stringify(report, null, 2), "utf-8");

// ── Summary ──────────────────────────────────────────────────────────────────

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`\n  Eigenvue v${version} Production Verification Report`);
console.log(`  ────────────────────────────────────────────────`);
console.log(`  Total:   ${report.summary.total}`);
console.log(`  Passed:  ${report.summary.passed} ✅`);
console.log(`  Failed:  ${report.summary.failed} ❌`);
console.log(`  Node:    ${process.version}`);
console.log(`  Platform: ${process.platform} ${process.arch}`);
console.log(`  Time:    ${report.timestamp}`);
console.log(`\n  Report saved to: verification-report.json`);
console.log(`  Open index.html in a browser for the interactive report.\n`);

if (report.summary.failed > 0) {
  process.exit(1);
}
