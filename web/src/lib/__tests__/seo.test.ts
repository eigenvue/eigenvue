/**
 * @fileoverview Unit Tests for SEO Utility Library
 *
 * Tests ensure:
 * 1. All metadata functions return valid Metadata objects.
 * 2. Titles follow the exact format spec.
 * 3. Canonical URLs are absolute, lowercase, and have no trailing slash.
 * 4. OG images point to the correct generation endpoint.
 * 5. No field is undefined or empty when required data is provided.
 */

import { describe, it, expect } from "vitest";
import {
  buildAlgorithmMetadata,
  buildCatalogMetadata,
  buildCategoryMetadata,
  buildStaticPageMetadata,
  buildLandingPageMetadata,
  SITE_URL,
  SITE_NAME,
  TITLE_SEPARATOR,
} from "../seo";
import type { AlgorithmSeoInput, CategorySeoInput } from "../seo";

// ─── Test Fixtures ────────────────────────────────────────────────────────────

const mockAlgorithm: AlgorithmSeoInput = {
  id: "binary-search",
  name: "Binary Search",
  category: "classical",
  description: {
    short: "Search a sorted array by repeatedly dividing the search interval.",
    long: "Binary search is a divide-and-conquer search algorithm...",
  },
  complexity: { time: "O(log n)", space: "O(1)" },
  seo: {
    keywords: ["binary search", "algorithm", "visualization", "sorted array"],
    ogDescription:
      "Interactive visualization of binary search. Watch the algorithm execute step-by-step.",
  },
  prerequisites: [],
  related: ["linear-search"],
};

const mockCategory: CategorySeoInput = {
  slug: "classical",
  name: "Classical Algorithms",
  description:
    "Interactive step-by-step visualizations of classical algorithms.",
  algorithmCount: 7,
};

// ─── Algorithm Metadata Tests ─────────────────────────────────────────────────

describe("buildAlgorithmMetadata", () => {
  const meta = buildAlgorithmMetadata(mockAlgorithm);

  it("produces a title matching the exact format spec", () => {
    expect(meta.title).toBe(
      `Binary Search Visualization — Step-by-Step${TITLE_SEPARATOR}${SITE_NAME}`,
    );
  });

  it("uses ogDescription when available", () => {
    expect(meta.description).toBe(mockAlgorithm.seo.ogDescription);
  });

  it("falls back to short description when ogDescription is absent", () => {
    const noOg: AlgorithmSeoInput = {
      ...mockAlgorithm,
      seo: { keywords: [] },
    };
    const result = buildAlgorithmMetadata(noOg);
    expect(result.description).toBe(noOg.description.short);
  });

  it("generates an absolute canonical URL with no trailing slash", () => {
    const canonical = meta.alternates?.canonical;
    expect(canonical).toBe(`${SITE_URL}/algo/binary-search`);
    expect(typeof canonical === "string" && !canonical.endsWith("/")).toBe(true);
  });

  it("generates an OG image URL pointing to the OG route", () => {
    const ogImages = (meta.openGraph as Record<string, unknown>)?.images as Array<{ url: string }>;
    expect(ogImages).toBeDefined();
    expect(ogImages[0].url).toBe(`${SITE_URL}/og/binary-search`);
  });

  it("includes width and height for the OG image", () => {
    const ogImages = (meta.openGraph as Record<string, unknown>)?.images as Array<{ width: number; height: number }>;
    expect(ogImages[0].width).toBe(1200);
    expect(ogImages[0].height).toBe(630);
  });

  it("sets twitter card to summary_large_image", () => {
    expect((meta.twitter as Record<string, unknown>)?.card).toBe("summary_large_image");
  });

  it("includes keywords from meta.json", () => {
    expect(meta.keywords).toEqual(mockAlgorithm.seo.keywords);
  });

  it("includes complexity in custom meta tags", () => {
    expect((meta.other as Record<string, string>)?.["eigenvue:time-complexity"]).toBe("O(log n)");
    expect((meta.other as Record<string, string>)?.["eigenvue:space-complexity"]).toBe("O(1)");
  });
});

// ─── Catalog Metadata Tests ───────────────────────────────────────────────────

describe("buildCatalogMetadata", () => {
  const meta = buildCatalogMetadata(17);

  it("includes algorithm count in the title", () => {
    expect(meta.title).toContain("17");
  });

  it("generates the correct canonical URL", () => {
    expect(meta.alternates?.canonical).toBe(`${SITE_URL}/algorithms`);
  });
});

// ─── Category Metadata Tests ──────────────────────────────────────────────────

describe("buildCategoryMetadata", () => {
  const meta = buildCategoryMetadata(mockCategory);

  it("includes category name in the title", () => {
    expect(meta.title).toContain("Classical Algorithms");
  });

  it("generates the correct canonical URL", () => {
    expect(meta.alternates?.canonical).toBe(`${SITE_URL}/algorithms/classical`);
  });
});

// ─── Static Page Metadata Tests ───────────────────────────────────────────────

describe("buildStaticPageMetadata", () => {
  const meta = buildStaticPageMetadata("About", "Learn about Eigenvue.", "/about");

  it("appends site name to the title", () => {
    expect(meta.title).toBe(`About${TITLE_SEPARATOR}${SITE_NAME}`);
  });

  it("generates the correct canonical URL", () => {
    expect(meta.alternates?.canonical).toBe(`${SITE_URL}/about`);
  });
});

// ─── Landing Page Metadata Tests ──────────────────────────────────────────────

describe("buildLandingPageMetadata", () => {
  const meta = buildLandingPageMetadata();

  it("has a descriptive title", () => {
    expect(meta.title).toContain("Eigenvue");
    expect(meta.title).toContain("Algorithm");
  });

  it("canonical URL is the site root", () => {
    expect(meta.alternates?.canonical).toBe(SITE_URL);
  });

  it("includes an OG image", () => {
    const ogImages = (meta.openGraph as Record<string, unknown>)?.images as Array<unknown>;
    expect(ogImages).toBeDefined();
    expect(ogImages.length).toBeGreaterThan(0);
  });
});
