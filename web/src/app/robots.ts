/**
 * @fileoverview Robots.txt Generation
 *
 * Next.js App Router convention: a robots.ts file in the app directory
 * automatically generates /robots.txt at build time.
 *
 * POLICY:
 * - Allow all crawlers to access all pages.
 * - Point to the sitemap for discovery.
 * - Disallow internal routes that are not user-facing:
 *   - /dev/* (development test pages from Phase 4)
 *   - /api/* (any future API routes)
 *   - /og/* (OG image generation endpoint — not a user page)
 */

import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/** Required for Next.js static export (output: "export"). */
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dev/", "/api/", "/og/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
