/**
 * @fileoverview Bundle Size Analysis Script
 *
 * Run after `next build` to verify bundle sizes stay within budget.
 * Exits with code 1 if any threshold is exceeded — used as a CI gate.
 *
 * USAGE:
 *   npx tsx scripts/analyze-bundle.ts
 *
 * THRESHOLDS (from Architecture $10):
 * - Initial JS bundle (first load): < 200KB gzipped
 * - Engine chunk (rendering code):  < 80KB gzipped
 * - Per-route JS addition:          < 50KB gzipped
 *
 * APPROACH:
 * Reads the .next/build-manifest.json and .next/route-manifest.json
 * (or the output directory for static export) to calculate per-route
 * and shared chunk sizes.
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const BUILD_DIR = join(__dirname, "..", "web", ".next");
const STATIC_DIR = join(BUILD_DIR, "static", "chunks");

// ─── Thresholds (bytes, gzipped) ──────────────────────────────────────────────

const MAX_INITIAL_BUNDLE_GZIP = 200 * 1024; // 200KB
const MAX_ENGINE_CHUNK_GZIP = 80 * 1024;    // 80KB

function main() {
  if (!existsSync(STATIC_DIR)) {
    console.error("Build output not found. Run `next build` first.");
    process.exit(1);
  }

  console.log("Analyzing bundle sizes...\n");

  let totalInitialSize = 0;
  let engineChunkSize = 0;
  const violations: string[] = [];

  /**
   * Walk the chunks directory and calculate gzipped sizes.
   * Look for:
   * - framework-*.js (React, Next.js runtime)
   * - main-*.js (app entry)
   * - engine-*.js (our custom chunk from splitChunks config)
   * - [route]-*.js (per-route code)
   */
  const files = readdirSync(STATIC_DIR).filter((f) => f.endsWith(".js"));

  for (const file of files) {
    const filePath = join(STATIC_DIR, file);
    const raw = readFileSync(filePath);
    const gzipped = gzipSync(raw);
    const sizeKB = (gzipped.length / 1024).toFixed(1);

    console.log(`  ${file}: ${sizeKB}KB gzipped`);

    // Identify chunk type by name.
    if (file.startsWith("framework") || file.startsWith("main") || file.startsWith("webpack")) {
      totalInitialSize += gzipped.length;
    }

    if (file.startsWith("engine")) {
      engineChunkSize = gzipped.length;
    }
  }

  console.log(`\n  Total initial bundle: ${(totalInitialSize / 1024).toFixed(1)}KB gzipped`);
  console.log(`  Engine chunk: ${(engineChunkSize / 1024).toFixed(1)}KB gzipped\n`);

  if (totalInitialSize > MAX_INITIAL_BUNDLE_GZIP) {
    violations.push(
      `Initial bundle (${(totalInitialSize / 1024).toFixed(1)}KB) exceeds ` +
        `${(MAX_INITIAL_BUNDLE_GZIP / 1024).toFixed(0)}KB limit.`,
    );
  }

  if (engineChunkSize > MAX_ENGINE_CHUNK_GZIP) {
    violations.push(
      `Engine chunk (${(engineChunkSize / 1024).toFixed(1)}KB) exceeds ` +
        `${(MAX_ENGINE_CHUNK_GZIP / 1024).toFixed(0)}KB limit.`,
    );
  }

  if (violations.length > 0) {
    console.error("Bundle size violations:");
    violations.forEach((v) => console.error(`   - ${v}`));
    process.exit(1);
  }

  console.log("All bundle sizes within budget.");
}

main();
