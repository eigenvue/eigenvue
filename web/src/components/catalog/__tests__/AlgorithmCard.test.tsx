/**
 * Tests for the AlgorithmCard component.
 *
 * Validates:
 * - Renders algorithm name, category badge, difficulty tag.
 * - Renders short description.
 * - Renders time and space complexity with <abbr> elements.
 * - Links to the correct /algo/[id] route.
 * - Includes accessible aria-label on the link.
 * - Handles missing category/difficulty display info gracefully.
 *
 * See Phase7_Implementation.md §25 — Testing Strategy.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AlgorithmCard } from "../AlgorithmCard";
import { type AlgorithmMeta } from "@/shared/types/step";

// ─── Mocks ──────────────────────────────────────────────────────────────────

// Mock next/link to render a plain anchor for testability.
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// ─── Fixture Factory ────────────────────────────────────────────────────────

function makeMeta(overrides: Partial<AlgorithmMeta> = {}): AlgorithmMeta {
  return {
    id: "binary-search",
    name: "Binary Search",
    category: "classical",
    description: {
      short: "Efficient search in sorted arrays.",
      long: "A longer description.",
    },
    complexity: { time: "O(log n)", space: "O(1)", level: "beginner" },
    visual: { layout: "array-with-pointers" },
    inputs: { schema: {}, defaults: {}, examples: [] },
    code: {
      implementations: { pseudocode: "" },
      defaultLanguage: "pseudocode",
    },
    education: { keyConcepts: [], pitfalls: [], quiz: [], resources: [] },
    seo: { keywords: [], ogDescription: "" },
    prerequisites: [],
    related: [],
    author: "test",
    version: "1.0.0",
    ...overrides,
  } as AlgorithmMeta;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("AlgorithmCard — Rendering", () => {
  it("renders the algorithm name", () => {
    render(<AlgorithmCard algorithm={makeMeta()} />);

    expect(screen.getByText("Binary Search")).toBeInTheDocument();
  });

  it("renders the category badge", () => {
    render(<AlgorithmCard algorithm={makeMeta()} />);

    expect(screen.getByText("Classical Algorithms")).toBeInTheDocument();
  });

  it("renders the difficulty tag", () => {
    render(<AlgorithmCard algorithm={makeMeta()} />);

    expect(screen.getByText("Beginner")).toBeInTheDocument();
  });

  it("renders the short description", () => {
    render(<AlgorithmCard algorithm={makeMeta()} />);

    expect(screen.getByText("Efficient search in sorted arrays.")).toBeInTheDocument();
  });

  it("renders time complexity with abbr", () => {
    render(<AlgorithmCard algorithm={makeMeta()} />);

    const timeAbbr = screen.getByTitle("Time complexity: O(log n)");
    expect(timeAbbr).toBeInTheDocument();
    expect(timeAbbr.tagName).toBe("ABBR");
    expect(timeAbbr.textContent).toBe("O(log n)");
  });

  it("renders space complexity with abbr", () => {
    render(<AlgorithmCard algorithm={makeMeta()} />);

    const spaceAbbr = screen.getByTitle("Space complexity: O(1)");
    expect(spaceAbbr).toBeInTheDocument();
    expect(spaceAbbr.tagName).toBe("ABBR");
    expect(spaceAbbr.textContent).toBe("O(1)");
  });
});

describe("AlgorithmCard — Navigation", () => {
  it("links to /algo/[id]", () => {
    render(<AlgorithmCard algorithm={makeMeta({ id: "quicksort" })} />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/algo/quicksort");
  });

  it("links to the correct path for hyphenated ids", () => {
    render(<AlgorithmCard algorithm={makeMeta({ id: "merge-sort" })} />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/algo/merge-sort");
  });
});

describe("AlgorithmCard — Accessibility", () => {
  it("has an aria-label with algorithm name, category, and difficulty", () => {
    render(<AlgorithmCard algorithm={makeMeta()} />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute(
      "aria-label",
      "Binary Search — Classical Algorithms, Beginner difficulty",
    );
  });

  it("falls back gracefully for unrecognized category", () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const algo = makeMeta({ category: "unknown-category" as never });

    render(<AlgorithmCard algorithm={algo} />);

    // Should still render without crashing.
    expect(screen.getByText("Binary Search")).toBeInTheDocument();
    consoleSpy.mockRestore();
  });
});

describe("AlgorithmCard — Different algorithms", () => {
  it("renders deep-learning algorithm correctly", () => {
    const algo = makeMeta({
      id: "backpropagation",
      name: "Backpropagation",
      category: "deep-learning",
      description: { short: "Neural network training.", long: "" },
      complexity: { time: "O(n·w)", space: "O(w)", level: "advanced" },
    });

    render(<AlgorithmCard algorithm={algo} />);

    expect(screen.getByText("Backpropagation")).toBeInTheDocument();
    expect(screen.getByText("Deep Learning")).toBeInTheDocument();
    expect(screen.getByText("Advanced")).toBeInTheDocument();
    expect(screen.getByText("Neural network training.")).toBeInTheDocument();

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/algo/backpropagation");
  });
});
