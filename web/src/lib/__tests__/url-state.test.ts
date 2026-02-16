/**
 * @fileoverview URL State Manager — Unit Tests
 *
 * Tests parsing, serialization, and round-trip behavior of URL state.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { parseUrlState, getShareUrl } from "../url-state";

// ─── Schema for binary search ────────────────────────────────────────────────

const binarySearchSchema = {
  array: { type: "array", items: { type: "number" } },
  target: { type: "number" },
};

// ─── Parsing Tests ───────────────────────────────────────────────────────────

describe("parseUrlState — Parsing", () => {
  it("parses array param as comma-separated numbers", () => {
    const params = new URLSearchParams("array=1,3,5,7,9&target=7");
    const result = parseUrlState(params, binarySearchSchema);

    expect(result.inputs).toEqual({ array: [1, 3, 5, 7, 9], target: 7 });
  });

  it("parses number param", () => {
    const params = new URLSearchParams("target=42");
    const result = parseUrlState(params, binarySearchSchema);

    expect(result.inputs).toEqual({ target: 42 });
  });

  it("parses step param as integer", () => {
    const params = new URLSearchParams("step=5");
    const result = parseUrlState(params, binarySearchSchema);

    expect(result.stepIndex).toBe(5);
    expect(result.inputs).toBeNull();
  });

  it("treats invalid step param as null", () => {
    const params = new URLSearchParams("step=abc");
    const result = parseUrlState(params, binarySearchSchema);

    expect(result.stepIndex).toBeNull();
  });

  it("treats negative step param as null", () => {
    const params = new URLSearchParams("step=-1");
    const result = parseUrlState(params, binarySearchSchema);

    expect(result.stepIndex).toBeNull();
  });

  it("parses example param", () => {
    const params = new URLSearchParams("example=Large%20array");
    const result = parseUrlState(params, binarySearchSchema);

    expect(result.exampleName).toBe("Large array");
  });

  it("returns null inputs when no input params present", () => {
    const params = new URLSearchParams("step=3");
    const result = parseUrlState(params, binarySearchSchema);

    expect(result.inputs).toBeNull();
  });

  it("returns all null for empty params", () => {
    const params = new URLSearchParams("");
    const result = parseUrlState(params, binarySearchSchema);

    expect(result.inputs).toBeNull();
    expect(result.stepIndex).toBeNull();
    expect(result.exampleName).toBeNull();
  });

  it("parses boolean param", () => {
    const schema = { flag: { type: "boolean" } };
    const params = new URLSearchParams("flag=true");
    const result = parseUrlState(params, schema);

    expect(result.inputs).toEqual({ flag: true });
  });
});

// ─── Share URL Tests ─────────────────────────────────────────────────────────

describe("getShareUrl", () => {
  it("includes all input params and step", () => {
    // Mock window.location.origin
    const url = getShareUrl("binary-search", {
      array: [1, 3, 5],
      target: 3,
    }, 2);

    // In jsdom, window.location.origin is typically "http://localhost:3000" or similar.
    expect(url).toContain("/algo/binary-search");
    expect(url).toContain("array=1%2C3%2C5");
    expect(url).toContain("target=3");
    expect(url).toContain("step=2");
  });
});
