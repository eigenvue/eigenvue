/**
 * @fileoverview Standalone viewer assets — Node package.
 *
 * Verifies that the visualizer bundled into the Node package is the REAL
 * Canvas rendering engine (the same one the web app uses), not a placeholder
 * JSON dump. These assertions are the regression guard for the "ship the real
 * renderer" contract: if the bundle ever silently degrades to a stub, they fail.
 *
 * The assets are produced by `scripts/build-standalone-viewer.mjs` and copied
 * into `node/data/web/` by `scripts/bundle-node-data.py` (run in CI before the
 * Node tests).
 */

import { fileURLToPath } from "node:url";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(here, "../../node/data/web");

function read(name: string): string {
  const file = path.join(webDir, name);
  return readFileSync(file, "utf-8");
}

describe("standalone viewer assets (node package)", () => {
  it("ships all three viewer files", () => {
    for (const name of ["index.html", "styles.css", "visualizer.js"]) {
      expect(existsSync(path.join(webDir, name)), `${name} should exist`).toBe(true);
    }
  });

  it("bundles the real rendering engine, not a stub", () => {
    const js = read("visualizer.js");
    // The full engine + 13 layouts is ~85 KB minified; the old stub was ~3.5 KB.
    expect(js.length).toBeGreaterThan(40_000);
    // Real Canvas 2D rendering.
    expect(js).toContain("getContext");
  });

  it("includes registered layouts across all four domains", () => {
    const js = read("visualizer.js");
    for (const layout of [
      "array-with-pointers", // classical
      "loss-landscape", // deep learning
      "attention-heatmap", // generative AI
      "bloch-sphere", // quantum
    ]) {
      expect(js, `layout ${layout} should be bundled`).toContain(layout);
    }
  });

  it("renders into a <canvas> and loads the bundle", () => {
    const html = read("index.html");
    // The doctype is case-insensitive in HTML5; Prettier emits it lowercase.
    expect(html.toLowerCase()).toContain("<!doctype html>");
    expect(html).toContain("<canvas");
    expect(html).toContain("/static/visualizer.js");
    expect(html).toContain("/static/styles.css");
  });

  it("stays in sync with the Python package source of truth", () => {
    const pySource = path.resolve(here, "../../python/src/eigenvue/data/web");
    const nodeJs = read("visualizer.js");
    const pyJs = readFileSync(path.join(pySource, "visualizer.js"), "utf-8");
    expect(nodeJs).toBe(pyJs);
  });
});
