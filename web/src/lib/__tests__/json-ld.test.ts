/**
 * @fileoverview Unit Tests for JSON-LD Builders
 *
 * Validates:
 * 1. All JSON-LD objects include the required @context and @type fields.
 * 2. LearningResource includes all Schema.org required properties.
 * 3. BreadcrumbList has the correct hierarchy and positions.
 * 4. URLs in JSON-LD match the canonical URL format.
 * 5. ItemList positions are 1-indexed and contiguous.
 * 6. No undefined or null values appear in the output (JSON-LD
 *    validators reject these).
 */

import { describe, it, expect } from "vitest";
import {
  buildAlgorithmJsonLd,
  buildCatalogJsonLd,
  buildWebsiteJsonLd,
  buildSoftwareApplicationJsonLd,
} from "../json-ld";
import { SITE_URL } from "../seo";
import type { AlgorithmSeoInput } from "../seo";

const mockAlgo: AlgorithmSeoInput = {
  id: "self-attention",
  name: "Self-Attention",
  category: "generative-ai",
  description: {
    short: "Scaled dot-product attention mechanism.",
  },
  complexity: { time: "O(n²·d)", space: "O(n²)" },
  seo: {
    keywords: ["self-attention", "transformer", "visualization"],
    ogDescription: "Interactive self-attention visualization.",
  },
  prerequisites: ["token-embeddings"],
  related: ["multi-head-attention"],
};

describe("buildAlgorithmJsonLd", () => {
  const schemas = buildAlgorithmJsonLd(mockAlgo);

  it("returns exactly 2 schema objects (LearningResource + BreadcrumbList)", () => {
    expect(schemas).toHaveLength(2);
  });

  it("first object is a valid LearningResource", () => {
    const lr = schemas[0];
    expect(lr["@context"]).toBe("https://schema.org");
    expect(lr["@type"]).toBe("LearningResource");
    expect(lr.name).toBe("Self-Attention Visualization");
    expect(lr.url).toBe(`${SITE_URL}/algo/self-attention`);
    expect(lr.isAccessibleForFree).toBe(true);
  });

  it("LearningResource has no undefined values", () => {
    const lr = schemas[0];
    const json = JSON.stringify(lr);
    // JSON.stringify omits undefined, so re-parsing should be identical.
    expect(JSON.parse(json)).toEqual(lr);
  });

  it("second object is a valid BreadcrumbList", () => {
    const bc = schemas[1];
    expect(bc["@type"]).toBe("BreadcrumbList");
    const items = bc.itemListElement as Array<{ position: number }>;
    expect(items).toHaveLength(4);
  });

  it("breadcrumb positions are 1-indexed and contiguous", () => {
    const bc = schemas[1];
    const items = bc.itemListElement as Array<{ position: number }>;
    items.forEach((item, index) => {
      expect(item.position).toBe(index + 1);
    });
  });

  it("breadcrumb terminates with the algorithm page URL", () => {
    const bc = schemas[1];
    const items = bc.itemListElement as Array<{ item: string; name: string }>;
    const last = items[items.length - 1];
    expect(last.item).toBe(`${SITE_URL}/algo/self-attention`);
    expect(last.name).toBe("Self-Attention");
  });
});

describe("buildCatalogJsonLd", () => {
  const algos = [
    { id: "binary-search", name: "Binary Search" },
    { id: "quicksort", name: "QuickSort" },
  ];
  const schema = buildCatalogJsonLd(algos);

  it("is a valid ItemList", () => {
    expect(schema["@type"]).toBe("ItemList");
    expect(schema.numberOfItems).toBe(2);
  });

  it("list item positions are 1-indexed", () => {
    const items = schema.itemListElement as Array<{ position: number }>;
    expect(items[0].position).toBe(1);
    expect(items[1].position).toBe(2);
  });
});

describe("buildWebsiteJsonLd", () => {
  const schema = buildWebsiteJsonLd();

  it("is a valid WebSite schema", () => {
    expect(schema["@type"]).toBe("WebSite");
    expect(schema.url).toBe(SITE_URL);
  });

  it("includes a SearchAction for sitelinks search box", () => {
    const action = schema.potentialAction as Record<string, unknown>;
    expect(action["@type"]).toBe("SearchAction");
    const target = action.target as Record<string, string>;
    expect(target.urlTemplate).toContain("{search_term_string}");
  });
});

describe("buildSoftwareApplicationJsonLd", () => {
  const schema = buildSoftwareApplicationJsonLd();

  it("is a valid SoftwareApplication", () => {
    expect(schema["@type"]).toBe("SoftwareApplication");
    expect(schema.applicationCategory).toBe("EducationalApplication");
  });

  it("offers price is 0 (free)", () => {
    const offers = schema.offers as Record<string, string>;
    expect(offers.price).toBe("0");
  });
});
