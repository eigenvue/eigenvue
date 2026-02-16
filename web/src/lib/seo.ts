/**
 * @fileoverview SEO Utility Library
 *
 * Centralizes all metadata generation for Eigenvue pages.
 * Every page's `generateMetadata()` delegates to functions here,
 * ensuring consistent title formatting, description templates,
 * Open Graph tags, and canonical URLs across the entire site.
 *
 * WHY CENTRALIZE:
 * - Single place to change the site name, title separator, or base URL.
 * - Testable: pure functions that take data and return metadata objects.
 * - Prevents drift between pages (e.g., one page using " | " and another using " — ").
 *
 * TITLE FORMAT:
 *   Algorithm pages: "{Name} Visualization — Step-by-Step | Eigenvue"
 *   Catalog pages:   "{Category} Algorithm Visualizations | Eigenvue"
 *   Static pages:    "{Page Title} | Eigenvue"
 *
 * URL RULES:
 *   Base URL is read from NEXT_PUBLIC_SITE_URL env var (defaults to https://eigenvue.dev).
 *   All canonical URLs are absolute, lowercase, and have no trailing slash.
 */

import type { Metadata } from "next";

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * The site's canonical base URL. Used for all absolute URL construction.
 * Read from environment to support staging/preview deployments.
 *
 * IMPORTANT: No trailing slash. All URL construction appends paths to this.
 */
export const SITE_URL: string =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "https://eigenvue.dev";

/** Site name used in Open Graph and title suffixes. */
export const SITE_NAME = "Eigenvue";

/** Title separator: the character(s) between the page title and site name. */
export const TITLE_SEPARATOR = " | ";

/** Default OG image dimensions (matches the OG image generation output). */
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

/** Twitter handle for the project (used in Twitter Card meta). */
export const TWITTER_HANDLE = "@eigenvue";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Minimal algorithm metadata needed for SEO generation. */
export interface AlgorithmSeoInput {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly description: {
    readonly short: string;
    readonly long?: string;
  };
  readonly complexity: {
    readonly time: string;
    readonly space: string;
  };
  readonly seo: {
    readonly keywords?: readonly string[];
    readonly ogDescription?: string;
  };
  readonly prerequisites?: readonly string[];
  readonly related?: readonly string[];
}

/** Category metadata needed for SEO generation. */
export interface CategorySeoInput {
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly algorithmCount: number;
}

// ─── Algorithm Page Metadata ──────────────────────────────────────────────────

/**
 * Builds the complete Next.js Metadata object for an algorithm visualizer page.
 *
 * @param algo - The algorithm's metadata (from meta.json).
 * @returns A complete Metadata object for Next.js `generateMetadata()`.
 *
 * GENERATED TAGS:
 * - <title>: "{Name} Visualization — Step-by-Step | Eigenvue"
 * - <meta name="description">: ogDescription or short description
 * - <link rel="canonical">: absolute URL to /algo/{id}
 * - <meta property="og:*">: full Open Graph tags with image
 * - <meta name="twitter:*">: Twitter Card (summary_large_image)
 * - <meta name="keywords">: from meta.json seo.keywords
 * - alternates.canonical: for Next.js canonical URL handling
 */
export function buildAlgorithmMetadata(algo: AlgorithmSeoInput): Metadata {
  const title = `${algo.name} Visualization — Step-by-Step${TITLE_SEPARATOR}${SITE_NAME}`;
  const description = algo.seo.ogDescription || algo.description.short;
  const canonicalUrl = `${SITE_URL}/algo/${algo.id}`;
  const ogImageUrl = `${SITE_URL}/og/${algo.id}`;

  return {
    title,
    description,
    keywords: algo.seo.keywords ? [...algo.seo.keywords] : [],
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${algo.name} — ${SITE_NAME}`,
      description,
      type: "website",
      url: canonicalUrl,
      siteName: SITE_NAME,
      images: [
        {
          url: ogImageUrl,
          width: OG_IMAGE_WIDTH,
          height: OG_IMAGE_HEIGHT,
          alt: `${algo.name} algorithm visualization preview`,
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${algo.name} — ${SITE_NAME}`,
      description,
      images: [ogImageUrl],
      site: TWITTER_HANDLE,
    },
    other: {
      /**
       * Algorithm-specific meta tags for potential rich snippet enhancement.
       * These are non-standard but can be consumed by custom scrapers or
       * browser extensions that understand Eigenvue's content.
       */
      "eigenvue:algorithm-id": algo.id,
      "eigenvue:category": algo.category,
      "eigenvue:time-complexity": algo.complexity.time,
      "eigenvue:space-complexity": algo.complexity.space,
    },
  };
}

// ─── Catalog Page Metadata ────────────────────────────────────────────────────

/**
 * Builds the complete Metadata object for the main catalog page (/algorithms).
 *
 * @param totalAlgorithmCount - Total number of algorithms in the catalog.
 * @returns A complete Metadata object for Next.js.
 */
export function buildCatalogMetadata(totalAlgorithmCount: number): Metadata {
  const title = `Algorithm Library — ${totalAlgorithmCount} Interactive Visualizations${TITLE_SEPARATOR}${SITE_NAME}`;
  const description =
    "Browse interactive, step-by-step visualizations of classical algorithms, " +
    "deep learning, generative AI, and quantum computing. Search, filter, and explore.";
  const canonicalUrl = `${SITE_URL}/algorithms`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `Algorithm Library${TITLE_SEPARATOR}${SITE_NAME}`,
      description,
      type: "website",
      url: canonicalUrl,
      siteName: SITE_NAME,
    },
    twitter: {
      card: "summary_large_image",
      title: `Algorithm Library${TITLE_SEPARATOR}${SITE_NAME}`,
      description,
      site: TWITTER_HANDLE,
    },
  };
}

// ─── Category Page Metadata ───────────────────────────────────────────────────

/**
 * Builds Metadata for a category landing page (/algorithms/[category]).
 *
 * @param category - Category metadata.
 * @returns A complete Metadata object.
 */
export function buildCategoryMetadata(category: CategorySeoInput): Metadata {
  const title = `${category.name} Visualizations${TITLE_SEPARATOR}${SITE_NAME}`;
  const description = category.description;
  const canonicalUrl = `${SITE_URL}/algorithms/${category.slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonicalUrl,
      siteName: SITE_NAME,
    },
    twitter: {
      card: "summary",
      title,
      description,
      site: TWITTER_HANDLE,
    },
  };
}

// ─── Static Page Metadata ─────────────────────────────────────────────────────

/**
 * Builds Metadata for a static page (About, Contribute, etc.).
 *
 * @param pageTitle - The page's display title (e.g., "About").
 * @param description - The page's meta description.
 * @param path - The URL path (e.g., "/about").
 * @returns A complete Metadata object.
 */
export function buildStaticPageMetadata(
  pageTitle: string,
  description: string,
  path: string,
): Metadata {
  const title = `${pageTitle}${TITLE_SEPARATOR}${SITE_NAME}`;
  const canonicalUrl = `${SITE_URL}${path}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonicalUrl,
      siteName: SITE_NAME,
    },
  };
}

// ─── Landing Page Metadata ────────────────────────────────────────────────────

/**
 * Builds Metadata for the root landing page (/).
 *
 * @returns A complete Metadata object.
 */
export function buildLandingPageMetadata(): Metadata {
  const title = "Eigenvue — Interactive Algorithm Visualizations for AI, ML & Computer Science";
  const description =
    "Watch algorithms execute step-by-step. Interactive visualizations for " +
    "classical algorithms, deep learning, generative AI, and quantum computing. " +
    "Open source and free.";

  return {
    title,
    description,
    alternates: {
      canonical: SITE_URL,
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: SITE_URL,
      siteName: SITE_NAME,
      images: [
        {
          url: `${SITE_URL}/og/home`,
          width: OG_IMAGE_WIDTH,
          height: OG_IMAGE_HEIGHT,
          alt: "Eigenvue — Interactive Algorithm Visualizations",
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Eigenvue — Interactive Algorithm Visualizations",
      description,
      images: [`${SITE_URL}/og/home`],
      site: TWITTER_HANDLE,
    },
  };
}
