/**
 * @fileoverview Browser visual-rendering & interaction tests.
 *
 * These run the REAL Canvas rendering engine in a real browser against a
 * production build, covering the gap that unit tests (which mock the canvas) and
 * the scene-graph snapshots (which stop at the draw list) cannot reach:
 *
 *   1. Every algorithm page actually rasterises a non-blank canvas with no
 *      uncaught errors — the engine runs end-to-end through React.
 *   2. Interactions (next/play/language) actually drive the rendering.
 *
 * Assertions are tolerant, deterministic invariants (non-blank pixels, distinct
 * colours, frame-to-frame change, no page errors) rather than pixel-exact
 * screenshots, which would be flaky across operating systems. Exact draw-list
 * regressions are caught cross-platform by tests/web/visual/scene-snapshots.
 */

import { readdirSync } from "node:fs";
import path from "node:path";

import { test, expect, type Locator, type Page } from "@playwright/test";

// ─── Enumerate algorithms from the source of truth (no hardcoded drift) ───────

// Playwright runs spec files as CommonJS, so __dirname is available here.
const algorithmsRoot = path.resolve(__dirname, "../../../algorithms");
const CATEGORIES = ["classical", "deep-learning", "generative-ai", "quantum"];

const ALGORITHM_IDS: string[] = CATEGORIES.flatMap((category) => {
  const dir = path.join(algorithmsRoot, category);
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}).sort();

// A representative algorithm per domain for the heavier interaction tests.
const REPRESENTATIVE = [
  "binary-search", // classical / array
  "dijkstra", // classical / graph
  "self-attention", // generative AI / heatmap
  "qubit-bloch-sphere", // quantum / 3D
];

// ─── Canvas helpers ───────────────────────────────────────────────────────────

interface CanvasStats {
  width: number;
  height: number;
  nonTransparent: number;
  distinctColors: number;
  signature: number;
}

/** Reads pixel statistics from the visualization canvas in-page. */
function readCanvasStats(canvas: Locator): Promise<CanvasStats> {
  return canvas.evaluate((el: HTMLCanvasElement) => {
    const width = el.width;
    const height = el.height;
    const ctx = el.getContext("2d");
    if (!ctx || width === 0 || height === 0) {
      return {
        width,
        height,
        nonTransparent: 0,
        distinctColors: 0,
        signature: 0,
      };
    }
    const { data } = ctx.getImageData(0, 0, width, height);
    const colors = new Set<number>();
    let nonTransparent = 0;
    let signature = 0x811c9dc5;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;
      const a = data[i + 3] ?? 0;
      if (a !== 0) {
        nonTransparent++;
        if (colors.size < 4096) colors.add((r << 16) | (g << 8) | b);
      }
      // FNV-1a over every pixel — sensitive enough to detect changes even in
      // mostly-empty scenes (e.g. the Bloch sphere) where subsampling would miss.
      signature ^= (r << 24) | (g << 16) | (b << 8) | a;
      signature = Math.imul(signature, 0x01000193);
    }
    return {
      width,
      height,
      nonTransparent,
      distinctColors: colors.size,
      signature: signature >>> 0,
    };
  });
}

/** The visualization canvas (engine output), unambiguously by its ARIA role. */
function vizCanvas(page: Page): Locator {
  return page.getByRole("img", { name: /Visualization/i });
}

/** Navigates to an algorithm page and waits until the engine has painted. */
async function gotoAlgorithmAndWaitForPaint(
  page: Page,
  id: string,
): Promise<Locator> {
  await page.goto(`/algo/${id}`);
  const canvas = vizCanvas(page);
  await expect(
    canvas,
    `${id}: visualization canvas should be present`,
  ).toBeVisible();
  await expect
    .poll(async () => (await readCanvasStats(canvas)).nonTransparent, {
      message: `${id}: canvas should paint non-blank pixels`,
      timeout: 20_000,
    })
    .toBeGreaterThan(100);
  return canvas;
}

// ─── Per-algorithm render smoke (all algorithms) ──────────────────────────────

test.describe("algorithm pages render to canvas", () => {
  for (const id of ALGORITHM_IDS) {
    test(`${id} renders without errors`, async ({ page }) => {
      const pageErrors: string[] = [];
      page.on("pageerror", (err) => pageErrors.push(String(err)));

      const canvas = await gotoAlgorithmAndWaitForPaint(page, id);
      const stats = await readCanvasStats(canvas);

      expect(stats.width, `${id}: canvas has a backing store`).toBeGreaterThan(
        0,
      );
      expect(stats.height, `${id}: canvas has a backing store`).toBeGreaterThan(
        0,
      );
      expect(
        stats.distinctColors,
        `${id}: canvas draws multiple colours`,
      ).toBeGreaterThanOrEqual(3);
      expect(pageErrors, `${id}: no uncaught page errors`).toEqual([]);
    });
  }
});

// ─── Interactions drive the rendering (representative algorithms) ──────────────

test.describe("playback interactions update the visualization", () => {
  /** Reads the current step number from the playback counter's ARIA label. */
  async function currentStep(page: Page): Promise<number> {
    const label = await page
      .getByLabel(/Step \d+ of \d+/)
      .getAttribute("aria-label");
    return Number(label?.match(/Step (\d+) of \d+/)?.[1] ?? 0);
  }

  for (const id of REPRESENTATIVE) {
    test(`${id}: stepping through changes the rendered canvas`, async ({
      page,
    }) => {
      const canvas = await gotoAlgorithmAndWaitForPaint(page, id);

      const label = await page
        .getByLabel(/Step \d+ of \d+/)
        .getAttribute("aria-label");
      const total = Number(label?.match(/of (\d+)/)?.[1] ?? 1);
      expect(total, `${id}: should have multiple steps`).toBeGreaterThan(1);

      // Walk several steps, collecting a canvas signature once each frame settles.
      const signatures = new Set<number>();
      signatures.add((await readCanvasStats(canvas)).signature);
      const stepsToVisit = Math.min(total - 1, 6);
      for (let i = 0; i < stepsToVisit; i++) {
        const expected = i + 2; // counter is 1-indexed and starts at step 1
        await page.getByRole("button", { name: "Next step" }).click();
        await expect.poll(() => currentStep(page)).toBe(expected);
        // Let the (≤400 ms) enter/transition finish before sampling pixels.
        await page.waitForTimeout(500);
        signatures.add((await readCanvasStats(canvas)).signature);
      }

      // Distinct frames prove the step data actually drives the rendering —
      // not merely that the counter advances.
      expect(
        signatures.size,
        `${id}: stepping should change the canvas`,
      ).toBeGreaterThan(1);
    });

    test(`${id}: play advances through steps`, async ({ page }) => {
      await gotoAlgorithmAndWaitForPaint(page, id);
      expect(await currentStep(page)).toBe(1);

      // `exact` avoids also matching the "Playback speed…" button.
      await page.getByRole("button", { name: "Play", exact: true }).click();

      await expect
        .poll(() => currentStep(page), {
          message: `${id}: playback should advance past the first step`,
          timeout: 15_000,
        })
        .toBeGreaterThan(1);
    });
  }

  test("switching the code language updates the code panel", async ({
    page,
  }) => {
    await gotoAlgorithmAndWaitForPaint(page, "binary-search");
    const tablist = page.getByRole("tablist", { name: "Code language" });
    await expect(tablist).toBeVisible();

    const tabs = tablist.getByRole("tab");
    const count = await tabs.count();
    expect(count).toBeGreaterThan(1);

    const codeRegion = page.getByRole("region", { name: /source code/i });
    const initialCode = (await codeRegion.textContent()) ?? "";

    // Click the last tab (a different language) and expect the code to change.
    await tabs.nth(count - 1).click();
    await expect
      .poll(async () => (await codeRegion.textContent()) ?? "", {
        message: "code panel should update when switching language",
        timeout: 10_000,
      })
      .not.toBe(initialCode);
  });
});
