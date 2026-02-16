/**
 * @fileoverview Crawlable Content Panel
 *
 * Server-rendered educational content placed below the interactive
 * visualization on each algorithm page. This content is:
 *
 * 1. Visible to search engine crawlers in the initial HTML response
 *    (because it's server-rendered by Next.js SSG at build time).
 * 2. Visible to all users as a scrollable "Learn More" section.
 * 3. Fully accessible to screen readers.
 *
 * CONTENT SOURCES (all from meta.json):
 * - description.long: full algorithm description
 * - complexity.time & complexity.space: Big-O analysis
 * - education.keyConcepts: conceptual explanations
 * - education.pitfalls: common mistakes
 * - prerequisites: links to prerequisite algorithm pages (internal links!)
 * - related: links to related algorithm pages (internal links!)
 *
 * INTERNAL LINKING:
 * The prerequisites and related algorithm links create a web of internal
 * links between algorithm pages. This is a critical SEO signal — it tells
 * search engines that Eigenvue is a comprehensive knowledge graph, not a
 * collection of isolated pages.
 *
 * WHY NOT VISUALLY HIDDEN:
 * This content is shown to ALL users (not sr-only). It adds genuine
 * educational value below the visualization and is part of the page's
 * information architecture. Hiding valuable content solely for crawlers
 * is a black-hat SEO technique that search engines penalize.
 */

import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CrawlableContentProps {
  readonly meta: {
    readonly id: string;
    readonly name: string;
    readonly description: {
      readonly short: string;
      readonly long?: string;
    };
    readonly complexity: {
      readonly time: string;
      readonly space: string;
      readonly level: string;
    };
    readonly education?: {
      readonly keyConcepts?: ReadonlyArray<{ title: string; description: string }>;
      readonly pitfalls?: ReadonlyArray<{ title: string; description: string }>;
    };
    readonly prerequisites?: readonly string[];
    readonly related?: readonly string[];
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CrawlableContent({ meta }: CrawlableContentProps) {
  return (
    <section
      aria-labelledby="algorithm-details-heading"
      className="max-w-5xl mx-auto px-6 py-16 text-text-secondary"
    >
      <h2 id="algorithm-details-heading" className="text-2xl font-semibold text-text-primary mb-8">
        About {meta.name}
      </h2>

      {/* ── Long Description ───────────────────────────────────────── */}
      {meta.description.long && (
        <div className="prose prose-invert max-w-none mb-12">
          <p className="text-base leading-relaxed">{meta.description.long}</p>
        </div>
      )}

      {/* ── Complexity Analysis ─────────────────────────────────────── */}
      <div className="mb-12">
        <h3 className="text-lg font-medium text-text-primary mb-4">Complexity Analysis</h3>
        <dl className="grid grid-cols-2 gap-4 max-w-md">
          <div>
            <dt className="text-sm text-text-tertiary">Time Complexity</dt>
            <dd className="text-base font-mono text-text-primary">{meta.complexity.time}</dd>
          </div>
          <div>
            <dt className="text-sm text-text-tertiary">Space Complexity</dt>
            <dd className="text-base font-mono text-text-primary">{meta.complexity.space}</dd>
          </div>
          <div>
            <dt className="text-sm text-text-tertiary">Difficulty</dt>
            <dd className="text-base text-text-primary capitalize">{meta.complexity.level}</dd>
          </div>
        </dl>
      </div>

      {/* ── Key Concepts ────────────────────────────────────────────── */}
      {meta.education?.keyConcepts && meta.education.keyConcepts.length > 0 && (
        <div className="mb-12">
          <h3 className="text-lg font-medium text-text-primary mb-4">Key Concepts</h3>
          <div className="space-y-4">
            {meta.education.keyConcepts.map((concept, index) => (
              <div key={index}>
                <h4 className="text-base font-medium text-text-primary">{concept.title}</h4>
                <p className="text-sm text-text-secondary mt-1">{concept.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Common Pitfalls ─────────────────────────────────────────── */}
      {meta.education?.pitfalls && meta.education.pitfalls.length > 0 && (
        <div className="mb-12">
          <h3 className="text-lg font-medium text-text-primary mb-4">Common Pitfalls</h3>
          <div className="space-y-4">
            {meta.education.pitfalls.map((pitfall, index) => (
              <div key={index}>
                <h4 className="text-base font-medium text-text-primary">{pitfall.title}</h4>
                <p className="text-sm text-text-secondary mt-1">{pitfall.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Internal Links: Prerequisites ───────────────────────────── */}
      {/*
       * CRITICAL SEO ELEMENT:
       * These <Link> components produce <a> tags with href="/algo/[id]".
       * Search engines follow these links, discovering the full algorithm
       * graph. This internal linking is one of the most impactful SEO
       * signals for establishing topical authority.
       */}
      {meta.prerequisites && meta.prerequisites.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-medium text-text-primary mb-3">Prerequisites</h3>
          <p className="text-sm text-text-tertiary mb-2">
            Understanding these algorithms first will help:
          </p>
          <div className="flex flex-wrap gap-2">
            {meta.prerequisites.map((prereqId) => (
              <Link
                key={prereqId}
                href={`/algo/${prereqId}`}
                className="px-3 py-1.5 text-sm bg-background-elevated rounded-md
                           text-classical hover:text-classical-light transition-colors
                           border border-border hover:border-classical/30"
              >
                {prereqId.replace(/-/g, " ")}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Internal Links: Related Algorithms ──────────────────────── */}
      {meta.related && meta.related.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-medium text-text-primary mb-3">Related Algorithms</h3>
          <div className="flex flex-wrap gap-2">
            {meta.related.map((relatedId) => (
              <Link
                key={relatedId}
                href={`/algo/${relatedId}`}
                className="px-3 py-1.5 text-sm bg-background-elevated rounded-md
                           text-genai hover:text-genai-light transition-colors
                           border border-border hover:border-genai/30"
              >
                {relatedId.replace(/-/g, " ")}
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
