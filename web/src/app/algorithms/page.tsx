/**
 * /algorithms — Main algorithm catalog page (Phase 10 Enhanced).
 *
 * ARCHITECTURE:
 * This is a Server Component that:
 * 1. Loads all algorithm metadata from the registry at build time.
 * 2. Computes static values (total count, category counts).
 * 3. Passes the data as props to the CatalogPageClient component.
 *
 * The CatalogPageClient is a Client Component that handles:
 * - URL state synchronization
 * - User interactions (search, filter, sort)
 * - Reactive re-rendering of the algorithm grid
 *
 * Phase 10 Changes:
 * - Metadata delegates to buildCatalogMetadata() from seo.ts for consistent,
 *   centralized SEO metadata with canonical URLs and OG tags.
 * - JSON-LD ItemList structured data is injected for rich search results.
 *
 * WHY this split: Next.js Server Components cannot use hooks (useState,
 * useEffect, etc.). All interactive behavior lives in the client component.
 * All data fetching and SEO metadata lives in the server component.
 *
 * See Phase7_Implementation.md §17 — Page: /algorithms.
 */

import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getAllAlgorithms } from '@/lib/algorithm-registry';
import { type AlgorithmMeta } from '@/shared/types/step';
import { buildCatalogMetadata } from '@/lib/seo';
import { buildCatalogJsonLd } from '@/lib/json-ld';
import { JsonLd } from '@/components/seo/JsonLd';
import { CatalogPageClient } from './CatalogPageClient';

// ——————————————————————————————————————————————————
// METADATA (SEO) — Phase 10 Enhanced
// ——————————————————————————————————————————————————

export async function generateMetadata(): Promise<Metadata> {
  const algorithms = getAllAlgorithms();
  return buildCatalogMetadata(algorithms.length);
}

// ——————————————————————————————————————————————————
// PAGE COMPONENT (Server)
// ——————————————————————————————————————————————————

export default function AlgorithmsPage() {
  /** Load all algorithms at build time (no client-side fetching). */
  const algorithms = getAllAlgorithms();

  /**
   * Pre-compute category counts so the client doesn't have to iterate
   * the full list on every render. This is a O(n) computation done once.
   *
   * MATHEMATICAL INVARIANT:
   * sum(categoryCounts.values()) === algorithms.length
   */
  const categoryCounts: Record<string, number> = {};
  for (const algo of algorithms) {
    categoryCounts[algo.category] =
      (categoryCounts[algo.category] ?? 0) + 1;
  }

  // Build JSON-LD ItemList for the catalog.
  const catalogJsonLd = buildCatalogJsonLd(
    algorithms.map((a) => ({ id: a.id, name: a.name })),
  );

  return (
    <>
      <JsonLd data={catalogJsonLd} />
      <Suspense>
        <CatalogPageClient
          algorithms={algorithms as unknown as AlgorithmMeta[]}
          categoryCounts={categoryCounts}
        />
      </Suspense>
    </>
  );
}
