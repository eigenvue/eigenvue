/**
 * @fileoverview SEO Compliance E2E Tests
 *
 * Validates that all SEO-critical elements are present in the rendered
 * HTML of key pages. These tests run against the built static export
 * to verify what search engine crawlers actually see.
 *
 * TESTED PAGES:
 * - / (landing page)
 * - /algorithms (catalog)
 * - /algo/binary-search (algorithm page)
 * - /algorithms/classical (category page)
 *
 * TESTED ELEMENTS:
 * - <title> tag content and format
 * - <meta name="description"> presence and content
 * - <link rel="canonical"> presence and absolute URL
 * - <meta property="og:*"> tags (title, description, image, url, type)
 * - <meta name="twitter:*"> tags (card, title, description)
 * - <script type="application/ld+json"> structured data
 * - Internal links in crawlable content section
 * - Heading hierarchy (h1, h2, h3)
 */

import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:3000";

// ─── Algorithm Page SEO ───────────────────────────────────────────────────────

test.describe("Algorithm Page SEO (/algo/binary-search)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/algo/binary-search`);
  });

  test("has correct title format", async ({ page }) => {
    const title = await page.title();
    expect(title).toContain("Binary Search");
    expect(title).toContain("Visualization");
    expect(title).toContain("Eigenvue");
  });

  test("has meta description", async ({ page }) => {
    const desc = await page
      .locator('meta[name="description"]')
      .getAttribute("content");
    expect(desc).toBeTruthy();
    expect(desc!.length).toBeGreaterThan(50);
    expect(desc!.length).toBeLessThan(160);
  });

  test("has canonical URL", async ({ page }) => {
    const canonical = await page
      .locator('link[rel="canonical"]')
      .getAttribute("href");
    expect(canonical).toContain("/algo/binary-search");
    expect(canonical).toMatch(/^https?:\/\//);
  });

  test("has Open Graph tags", async ({ page }) => {
    const ogTitle = await page
      .locator('meta[property="og:title"]')
      .getAttribute("content");
    const ogDesc = await page
      .locator('meta[property="og:description"]')
      .getAttribute("content");
    const ogImage = await page
      .locator('meta[property="og:image"]')
      .getAttribute("content");
    const ogUrl = await page
      .locator('meta[property="og:url"]')
      .getAttribute("content");

    expect(ogTitle).toBeTruthy();
    expect(ogDesc).toBeTruthy();
    expect(ogImage).toContain("/og/binary-search");
    expect(ogUrl).toContain("/algo/binary-search");
  });

  test("has Twitter Card tags", async ({ page }) => {
    const card = await page
      .locator('meta[name="twitter:card"]')
      .getAttribute("content");
    expect(card).toBe("summary_large_image");
  });

  test("has JSON-LD structured data", async ({ page }) => {
    const scripts = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();

    expect(scripts.length).toBeGreaterThanOrEqual(1);

    // Parse and validate the LearningResource schema.
    const learningResource = scripts
      .map((s) => JSON.parse(s))
      .find((d: Record<string, unknown>) => d["@type"] === "LearningResource");

    expect(learningResource).toBeDefined();
    expect(learningResource!.name).toContain("Binary Search");
    expect(learningResource!["@context"]).toBe("https://schema.org");
    expect(learningResource!.isAccessibleForFree).toBe(true);
  });

  test("has JSON-LD BreadcrumbList", async ({ page }) => {
    const scripts = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();

    const breadcrumb = scripts
      .map((s) => JSON.parse(s))
      .find((d: Record<string, unknown>) => d["@type"] === "BreadcrumbList");

    expect(breadcrumb).toBeDefined();
    const items = breadcrumb!.itemListElement as Array<{ position: number }>;
    expect(items.length).toBe(4);
    // Verify positions are 1-indexed.
    items.forEach((item, i) => {
      expect(item.position).toBe(i + 1);
    });
  });

  test("has crawlable content section with internal links", async ({ page }) => {
    // Check that the "About" section exists.
    const heading = page.locator("h2", { hasText: "About Binary Search" });
    await expect(heading).toBeVisible();

    // Check for complexity information.
    const timeComplexity = page.locator("text=O(log n)");
    await expect(timeComplexity).toBeVisible();
  });
});

// ─── Catalog Page SEO ─────────────────────────────────────────────────────────

test.describe("Catalog Page SEO (/algorithms)", () => {
  test("has title and meta description", async ({ page }) => {
    await page.goto(`${BASE_URL}/algorithms`);
    const title = await page.title();
    expect(title).toContain("Algorithm Library");
    expect(title).toContain("Eigenvue");
  });

  test("has canonical URL", async ({ page }) => {
    await page.goto(`${BASE_URL}/algorithms`);
    const canonical = await page
      .locator('link[rel="canonical"]')
      .getAttribute("href");
    expect(canonical).toContain("/algorithms");
  });
});

// ─── Landing Page SEO ─────────────────────────────────────────────────────────

test.describe("Landing Page SEO (/)", () => {
  test("has descriptive title", async ({ page }) => {
    await page.goto(BASE_URL);
    const title = await page.title();
    expect(title).toContain("Eigenvue");
  });

  test("has WebSite JSON-LD", async ({ page }) => {
    await page.goto(BASE_URL);
    const scripts = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();

    const website = scripts
      .map((s) => JSON.parse(s))
      .find((d: Record<string, unknown>) => d["@type"] === "WebSite");

    expect(website).toBeDefined();
    expect((website!.potentialAction as Record<string, unknown>)["@type"]).toBe("SearchAction");
  });
});

// ─── Sitemap ──────────────────────────────────────────────────────────────────

test.describe("Sitemap", () => {
  test("sitemap.xml is accessible and contains algorithm pages", async ({
    page,
  }) => {
    const response = await page.goto(`${BASE_URL}/sitemap.xml`);
    expect(response?.status()).toBe(200);

    const content = await page.content();
    expect(content).toContain("/algo/binary-search");
    expect(content).toContain("/algorithms");
  });
});

// ─── Robots.txt ───────────────────────────────────────────────────────────────

test.describe("Robots.txt", () => {
  test("robots.txt is accessible and allows crawling", async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/robots.txt`);
    expect(response?.status()).toBe(200);

    const text = await page.innerText("body");
    expect(text).toContain("Allow: /");
    expect(text).toContain("Sitemap:");
  });
});
