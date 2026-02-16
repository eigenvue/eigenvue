/**
 * /algorithms/[category] — Category-specific catalog landing page (Phase 10 Enhanced).
 *
 * This page is identical in structure to the main catalog page, but:
 * 1. Pre-filters by category (the category tab is locked).
 * 2. Shows category-specific header (title, description, accent color).
 * 3. Generates category-specific SEO metadata.
 * 4. Handles invalid categories by returning notFound().
 *
 * Phase 10 Changes:
 * - Metadata delegates to buildCategoryMetadata() from seo.ts for consistent,
 *   centralized SEO metadata with canonical URLs and OG tags.
 *
 * STATIC GENERATION: All valid category pages are pre-rendered at build time
 * via generateStaticParams(). This ensures fast loading and full SEO indexing.
 *
 * See Phase7_Implementation.md §18 — Page: /algorithms/[category].
 */

import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAlgorithmsByCategory } from "@/lib/algorithm-registry";
import { CATEGORY_BY_SLUG, ALL_CATEGORY_SLUGS } from "@/lib/catalog-constants";
import { type AlgorithmCategory, type AlgorithmMeta } from "@/shared/types/step";
import { buildCategoryMetadata } from "@/lib/seo";
import { CategoryPageClient } from "./CategoryPageClient";

// ——————————————————————————————————————————————————
// STATIC PARAMS
// ——————————————————————————————————————————————————

/**
 * Generate static params for all valid category slugs.
 * Next.js will pre-render a page for each.
 */
export function generateStaticParams(): { category: string }[] {
  return ALL_CATEGORY_SLUGS.map((slug) => ({ category: slug }));
}

// ——————————————————————————————————————————————————
// METADATA — Phase 10 Enhanced
// ——————————————————————————————————————————————————

interface PageProps {
  params: Promise<{ category: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category: slug } = await params;
  const categoryInfo = CATEGORY_BY_SLUG.get(slug);

  if (!categoryInfo) {
    return { title: "Category Not Found" };
  }

  const algorithms = getAlgorithmsByCategory(categoryInfo.id as AlgorithmCategory);

  return buildCategoryMetadata({
    slug: categoryInfo.slug,
    name: categoryInfo.label,
    description: `Interactive step-by-step visualizations of ${categoryInfo.label.toLowerCase()}. ${categoryInfo.description}`,
    algorithmCount: algorithms.length,
  });
}

// ——————————————————————————————————————————————————
// PAGE COMPONENT
// ——————————————————————————————————————————————————

export default async function CategoryPage({ params }: PageProps) {
  const { category: slug } = await params;
  const categoryInfo = CATEGORY_BY_SLUG.get(slug);

  /** Return 404 for invalid category slugs. */
  if (!categoryInfo) {
    notFound();
  }

  const algorithms = getAlgorithmsByCategory(categoryInfo.id as AlgorithmCategory);

  return (
    <Suspense>
      <CategoryPageClient
        algorithms={algorithms as unknown as AlgorithmMeta[]}
        categoryInfo={categoryInfo}
      />
    </Suspense>
  );
}
