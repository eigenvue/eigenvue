/**
 * @fileoverview Algorithm Visualizer Page — Dynamic Route (Phase 10 Enhanced)
 *
 * Next.js App Router page for /algo/[id].
 * - Uses generateStaticParams() for static site generation of all known algorithms.
 * - Uses generateMetadata() for per-algorithm SEO meta tags.
 * - Loads the algorithm on the server, passes metadata to the client shell.
 *
 * Changes from Phase 5:
 * 1. generateMetadata() delegates to buildAlgorithmMetadata() from seo.ts.
 * 2. JSON-LD structured data is injected via the JsonLd component.
 * 3. OG image URL points to the dynamic /og/[id] route.
 * 4. A CrawlableContent panel renders server-side educational content
 *    visible to crawlers and screen readers.
 * 5. rel="prev" / rel="next" links added for related algorithms.
 *
 * ARCHITECTURE NOTE: The page itself is a Server Component. It loads metadata
 * and passes it as props to VisualizerShell, which is a Client Component that
 * handles all interactive state (playback, inputs, URL sync).
 */

import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { loadAlgorithm, getAlgorithmIds } from "@/lib/algorithm-loader";
import { buildAlgorithmMetadata } from "@/lib/seo";
import { buildAlgorithmJsonLd } from "@/lib/json-ld";
import { JsonLd } from "@/components/seo/JsonLd";
import { CrawlableContent } from "@/components/seo/CrawlableContent";
import { VisualizerShell } from "@/components/visualizer/VisualizerShell";

// ─── Static Params (SSG) — unchanged from Phase 5 ────────────────────────────

/**
 * Generates the list of algorithm IDs for static site generation.
 * Every registered algorithm gets a pre-rendered page.
 */
export async function generateStaticParams() {
  return getAlgorithmIds().map((id) => ({ id }));
}

// ─── SEO Metadata — enhanced in Phase 10 ─────────────────────────────────────

/**
 * Generates per-algorithm SEO metadata by delegating to the centralized
 * seo.ts utility. This ensures every algorithm page has consistent,
 * tested metadata including OG images and canonical URLs.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const algorithm = await loadAlgorithm(id);
  if (!algorithm) {
    return { title: "Algorithm Not Found | Eigenvue" };
  }

  return buildAlgorithmMetadata(algorithm.meta);
}

// ─── Page Component — enhanced in Phase 10 ────────────────────────────────────

export default async function AlgorithmPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const algorithm = await loadAlgorithm(id);

  if (!algorithm) {
    notFound();
  }

  const { meta } = algorithm;

  // Build the JSON-LD structured data for this algorithm.
  const jsonLd = buildAlgorithmJsonLd(meta);

  return (
    <main className="min-h-screen bg-background-page">
      {/* ── Structured Data ─────────────────────────────────────────── */}
      <JsonLd data={jsonLd} />

      {/* ── Interactive Visualizer ──────────────────────────────────── */}
      <Suspense>
        <VisualizerShell algorithmId={meta.id} meta={meta} />
      </Suspense>

      {/* ── Crawlable Content ──────────────────────────────────────── */}
      {/*
       * Server-rendered educational content that is visible to search
       * engine crawlers and assistive technologies. This content is
       * rendered below the fold for visual users but is fully accessible
       * in the DOM. It includes: long description, complexity analysis,
       * key concepts, related algorithms (as internal links).
       *
       * WHY: Next.js SSG renders this HTML at build time. Search engines
       * index the text content without needing to execute JavaScript.
       * This makes each algorithm page a rich landing page with indexable
       * educational content — not just an empty JS app shell.
       */}
      <CrawlableContent meta={meta} />
    </main>
  );
}
