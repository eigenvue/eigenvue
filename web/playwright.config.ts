/**
 * Playwright configuration for Eigenvue's browser-level tests.
 *
 * These tests run against a production build served by `next start`, exercising
 * the real Canvas rendering engine in a real browser — the layer that unit tests
 * (which mock the canvas) and the scene-graph snapshots (which stop at the draw
 * list) cannot reach.
 *
 * Test areas (in ../tests/web/e2e):
 *   - visual.spec.ts — every algorithm renders to a non-blank canvas with no
 *     uncaught errors, and playback/step/language interactions drive the render.
 *   - seo.spec.ts    — crawlable metadata on key pages.
 *
 * Pixel-exact screenshots are intentionally NOT used: they diverge across OS
 * font rasterisation, which would make CI flaky. The browser tests assert
 * tolerant, deterministic invariants instead; exact draw-list regressions are
 * covered by the cross-platform scene-graph snapshots.
 */

import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3000);
const BASE_URL = `http://localhost:${PORT}`;
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "../tests/web/e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  // A single worker keeps the shared dev server and canvas timing deterministic
  // in CI; locally Playwright picks a sensible default.
  workers: isCI ? 1 : undefined,
  reporter: isCI ? [["github"], ["list"], ["html", { open: "never" }]] : "list",
  timeout: 45_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Serves the production build. The build must already exist (run
    // `npm run build` first); CI does this in a dedicated step.
    command: `npm run start -- -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
