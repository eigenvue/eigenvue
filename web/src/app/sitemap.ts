/**
 * @fileoverview Sitemap Generation
 *
 * Next.js App Router convention: a sitemap.ts file in the app directory
 * automatically generates /sitemap.xml at build time.
 *
 * INCLUDED PAGES:
 * - / (landing page)
 * - /algorithms (main catalog)
 * - /algorithms/[category] (category landing pages)
 * - /algo/[id] (every algorithm visualization page)
 * - /about
 * - /contribute
 *
 * PRIORITY ASSIGNMENT:
 * - Landing page:        1.0
 * - Algorithm pages:     0.9 (these are the core content)
 * - Catalog pages:       0.8
 * - Category pages:      0.7
 * - Static pages:        0.5
 *
 * CHANGE FREQUENCY:
 * - Algorithm pages:     "monthly" (content is stable once published)
 * - Catalog/categories:  "weekly" (new algorithms may be added)
 * - Static pages:        "monthly"
 *
 * LAST MODIFIED:
 * Ideally set from git commit dates. For v1, we use the build date
 * for all pages. This can be refined in a future enhancement.
 */

import type { MetadataRoute } from "next";
import { getAlgorithmIds } from "@/lib/algorithm-loader";
import { SITE_URL } from "@/lib/seo";

/** Required for Next.js static export (output: "export"). */
export const dynamic = "force-static";

/**
 * The list of recognized category slugs.
 * Must stay in sync with catalog-constants.ts from Phase 7.
 */
const CATEGORIES = ["classical", "deep-learning", "generative-ai", "quantum"];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString();
  const algorithmIds = getAlgorithmIds();

  const entries: MetadataRoute.Sitemap = [];

  // ── Landing page ──────────────────────────────────────────────
  entries.push({
    url: SITE_URL,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 1.0,
  });

  // ── Main catalog page ─────────────────────────────────────────
  entries.push({
    url: `${SITE_URL}/algorithms`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  });

  // ── Category landing pages ────────────────────────────────────
  for (const category of CATEGORIES) {
    entries.push({
      url: `${SITE_URL}/algorithms/${category}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  // ── Individual algorithm pages ────────────────────────────────
  for (const id of algorithmIds) {
    entries.push({
      url: `${SITE_URL}/algo/${id}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    });
  }

  // ── Static pages ──────────────────────────────────────────────
  entries.push({
    url: `${SITE_URL}/about`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.5,
  });

  entries.push({
    url: `${SITE_URL}/contribute`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.5,
  });

  return entries;
}
