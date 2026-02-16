/**
 * @fileoverview JSON-LD Structured Data Builders
 *
 * Generates Schema.org compliant JSON-LD objects for Eigenvue pages.
 * These are injected into the page HTML as <script type="application/ld+json">.
 *
 * SCHEMAS USED:
 * - LearningResource: for each algorithm visualization page
 *   (see https://schema.org/LearningResource)
 * - SoftwareApplication: for the Eigenvue platform itself
 *   (see https://schema.org/SoftwareApplication)
 * - ItemList: for the catalog page
 *   (see https://schema.org/ItemList)
 * - BreadcrumbList: for navigation breadcrumbs on algorithm pages
 *   (see https://schema.org/BreadcrumbList)
 * - WebSite: for the root site entity
 *   (see https://schema.org/WebSite)
 *
 * VALIDATION:
 * All generated JSON-LD must pass Google's Rich Results Test:
 * https://search.google.com/test/rich-results
 *
 * IMPORTANT — MATHEMATICAL ACCURACY:
 * The complexity values (time, space) are taken verbatim from the
 * algorithm's meta.json. They must be verified at the source (the
 * meta.json file) to be mathematically correct. This module does NOT
 * validate or transform complexity strings — it embeds them as-is.
 * Any error in complexity notation is a meta.json error, not a
 * JSON-LD builder error.
 */

import { SITE_URL, SITE_NAME, type AlgorithmSeoInput } from "./seo";

// ─── Type: JSON-LD can be any valid Schema.org object ─────────────────────────

export type JsonLdObject = Record<string, unknown>;

// ─── Category Display Names ───────────────────────────────────────────────────

/**
 * Maps category slugs to their human-readable display names.
 * Used in JSON-LD `about` and `educationalLevel` fields.
 *
 * IMPORTANT: This map must stay in sync with the catalog-constants.ts
 * from Phase 7. If a new category is added, add it here too.
 */
const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  classical: "Classical Algorithms",
  "deep-learning": "Deep Learning",
  "generative-ai": "Generative AI",
  quantum: "Quantum Computing",
};

// ─── Algorithm Page JSON-LD ───────────────────────────────────────────────────

/**
 * Builds JSON-LD structured data for an algorithm visualizer page.
 * Returns an array of JSON-LD objects (multiple schemas per page).
 *
 * @param algo - The algorithm's metadata.
 * @returns An array of JSON-LD objects to render as <script> tags.
 *
 * GENERATED SCHEMAS:
 * 1. LearningResource — describes this algorithm visualization as an
 *    educational resource with learning objectives, complexity level,
 *    and topic.
 * 2. BreadcrumbList — provides navigation breadcrumb trail:
 *    Home > Algorithm Library > {Category} > {Algorithm Name}
 */
export function buildAlgorithmJsonLd(algo: AlgorithmSeoInput): JsonLdObject[] {
  const canonicalUrl = `${SITE_URL}/algo/${algo.id}`;
  const categoryName = CATEGORY_DISPLAY_NAMES[algo.category] ?? algo.category;

  const learningResource: JsonLdObject = {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: `${algo.name} Visualization`,
    description: algo.seo.ogDescription || algo.description.short,
    url: canonicalUrl,
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    about: {
      "@type": "Thing",
      name: categoryName,
    },
    learningResourceType: "Interactive visualization",
    interactivityType: "active",
    isAccessibleForFree: true,
    inLanguage: "en",
    keywords: algo.seo.keywords ? algo.seo.keywords.join(", ") : "",
    /**
     * timeRequired uses ISO 8601 duration format.
     * Estimate: 5–15 minutes per algorithm visualization.
     * We use PT10M (10 minutes) as a reasonable default.
     */
    timeRequired: "PT10M",
    image: `${SITE_URL}/og/${algo.id}`,
  };

  const breadcrumb: JsonLdObject = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Algorithm Library",
        item: `${SITE_URL}/algorithms`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: categoryName,
        item: `${SITE_URL}/algorithms/${algo.category}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: algo.name,
        item: canonicalUrl,
      },
    ],
  };

  return [learningResource, breadcrumb];
}

// ─── Catalog Page JSON-LD ─────────────────────────────────────────────────────

/**
 * Builds JSON-LD for the main algorithm catalog page.
 *
 * @param algorithms - Array of algorithm metadata for all listed algorithms.
 * @returns A JSON-LD ItemList object.
 */
export function buildCatalogJsonLd(
  algorithms: ReadonlyArray<{ id: string; name: string }>,
): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Eigenvue Algorithm Library",
    description:
      "Interactive, step-by-step visualizations of algorithms across computer science, deep learning, and AI.",
    numberOfItems: algorithms.length,
    itemListElement: algorithms.map((algo, index) => ({
      "@type": "ListItem",
      /** 1-indexed positions as required by Schema.org. */
      position: index + 1,
      name: algo.name,
      url: `${SITE_URL}/algo/${algo.id}`,
    })),
  };
}

// ─── Website JSON-LD (Root Layout) ────────────────────────────────────────────

/**
 * Builds the root-level WebSite JSON-LD.
 * Injected once in the root layout to declare the site entity.
 *
 * @returns A WebSite JSON-LD object.
 */
export function buildWebsiteJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description:
      "The visual learning platform for understanding algorithms, AI architectures, and quantum computing.",
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    /**
     * potentialAction declares the site's internal search capability.
     * This enables Google to show a sitelinks search box in SERPs.
     *
     * The target URL uses the catalog page's search parameter (?q=).
     */
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/algorithms?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

// ─── SoftwareApplication JSON-LD ──────────────────────────────────────────────

/**
 * Builds a SoftwareApplication JSON-LD for the Eigenvue platform.
 * Used on the landing page and about page.
 *
 * @returns A SoftwareApplication JSON-LD object.
 */
export function buildSoftwareApplicationJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    url: SITE_URL,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web browser",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description:
      "Interactive algorithm visualizations for classical algorithms, deep learning, generative AI, and quantum computing.",
    softwareVersion: "1.0",
    license: "https://opensource.org/licenses/MIT",
  };
}
