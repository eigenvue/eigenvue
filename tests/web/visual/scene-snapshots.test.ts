/**
 * @fileoverview Scene-graph visual-regression snapshots.
 *
 * For every registered algorithm, this runs the real TypeScript generator over
 * its default inputs, feeds each step through the real layout function (the same
 * code path the web app and the bundled package viewer use), and snapshots a
 * compact digest of the resulting PrimitiveScene — the exact draw list the
 * Canvas renderer paints.
 *
 * WHY THIS EXISTS:
 * The rest of the suite verifies that *step data* is correct (cross-language
 * parity, schema validation, generator unit tests). Nothing verified what is
 * actually *drawn*. A layout regression — a Bloch-sphere vector pointing the
 * wrong way, an off-canvas label, a swapped colour — changes the scene geometry
 * while leaving the step data untouched, so it would pass every other test.
 * These snapshots close that gap deterministically.
 *
 * WHY A DIGEST (not the raw scene):
 * Some layouts emit very large scenes (the Bloch sphere is hundreds of line
 * segments; the loss landscape is a 50×50 contour grid). Snapshotting the raw
 * scene for every step produced a 37 MB file. Instead we snapshot, per step, the
 * primitive count, a primitive-type histogram, and a content hash (FNV-1a) of
 * the fully rounded scene. The hash changes if *anything* in the draw list
 * changes (position, size, colour, text, z-index), so regressions are caught;
 * the count and histogram make the diff human-readable at a glance.
 *
 * WHY DIGESTS (not pixel screenshots):
 * The scene is the rasteriser-independent description of every primitive.
 * Hashing the rounded scene (3 decimals; V8's bundled fdlibm makes the trig
 * deterministic) is fully cross-platform, so it is safe to gate CI on — unlike
 * pixel screenshots, which differ across OS font rasterisation. Real pixel
 * rendering is covered separately by the Playwright browser tests.
 */

import { describe, expect, it } from "vitest";

import { getAlgorithmIds, loadAlgorithm } from "@/lib/algorithm-loader";
import { runGenerator } from "@/engine/generator";
import { getLayout } from "@/engine/layouts";
import type {
  CanvasSize,
  PrimitiveScene,
  RenderPrimitive,
} from "@/engine/types";

// A fixed canvas size makes every layout deterministic regardless of the
// machine running the test. Chosen to resemble the real visualizer viewport.
const CANVAS_SIZE: CanvasSize = { width: 960, height: 600 };

// Decimal places retained before hashing. Layout maths is in CSS pixels on a
// 960×600 canvas, so 3 decimals (0.001 px) is far finer than any visible change
// while remaining robust to floating-point noise across platforms.
const PRECISION = 3;

/**
 * Recursively rounds every finite number and normalises -0 to 0 so the
 * serialisation (and therefore the hash) is stable across platforms.
 */
function roundDeep(value: unknown): unknown {
  return JSON.parse(
    JSON.stringify(value, (_key, v: unknown) => {
      if (typeof v === "number" && Number.isFinite(v)) {
        const factor = 10 ** PRECISION;
        const rounded = Math.round(v * factor) / factor;
        return Object.is(rounded, -0) ? 0 : rounded;
      }
      return v;
    }),
  );
}

/** FNV-1a 32-bit hash of a string, returned as zero-padded hex. */
function fnv1a(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/** Counts primitives by their `type` field, with deterministic key order. */
function typeHistogram(
  primitives: readonly RenderPrimitive[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const primitive of primitives) {
    const type = String((primitive as { type?: unknown }).type ?? "unknown");
    counts[type] = (counts[type] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)),
  );
}

/** Builds the compact, deterministic digest snapshotted for a single step. */
function digestScene(stepId: string, scene: PrimitiveScene) {
  const rounded = roundDeep(scene) as { primitives: RenderPrimitive[] };
  const primitives = rounded.primitives;
  return {
    stepId,
    primitiveCount: primitives.length,
    byType: typeHistogram(primitives),
    sceneHash: fnv1a(JSON.stringify(rounded)),
  };
}

const ids = getAlgorithmIds().sort();

describe("scene-graph visual snapshots", () => {
  it("covers every registered algorithm", () => {
    // Guards against the registry being empty / the loop silently covering nothing.
    expect(ids.length).toBeGreaterThanOrEqual(23);
  });

  it.each(ids)(
    "renders a stable scene graph for %s (default inputs)",
    async (id) => {
      const algorithm = await loadAlgorithm(id);
      if (!algorithm) {
        throw new Error(`Algorithm ${id} failed to load.`);
      }
      const { meta, generator } = algorithm;
      if (!generator) {
        throw new Error(`Algorithm ${id} has no generator.`);
      }

      const layout = getLayout(meta.visual.layout);
      if (!layout) {
        throw new Error(
          `Layout "${meta.visual.layout}" is not registered (for ${id}).`,
        );
      }

      const sequence = runGenerator(generator, meta.inputs.defaults);
      const config = meta.visual.components ?? {};

      const frames = sequence.steps.map((step) =>
        digestScene(step.id, layout(step, CANVAS_SIZE, config)),
      );

      expect({
        algorithmId: id,
        layout: meta.visual.layout,
        canvasSize: CANVAS_SIZE,
        stepCount: frames.length,
        frames,
      }).toMatchSnapshot();
    },
    20_000,
  );
});
