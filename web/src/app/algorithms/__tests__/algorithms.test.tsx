/**
 * Tests for the CatalogPageClient component (the /algorithms page client).
 *
 * Validates:
 * - Mounts without error with valid algorithm data.
 * - Renders the page header ("Algorithm Library").
 * - Renders the category filter bar with correct tabs.
 * - Renders the search input.
 * - Renders algorithm cards for provided data.
 * - Displays the correct total count.
 * - Renders empty state when no algorithms are provided.
 *
 * Next.js hooks (useSearchParams, useRouter, usePathname) are mocked.
 *
 * See Phase7_Implementation.md §25 — Testing Strategy.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { type AlgorithmMeta } from "@/shared/types/step";

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(""),
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/algorithms",
}));

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

// ─── Import after mocks ─────────────────────────────────────────────────────

import { CatalogPageClient } from "../CatalogPageClient";

// ─── Fixture Factory ────────────────────────────────────────────────────────

function makeMeta(overrides: Partial<AlgorithmMeta> = {}): AlgorithmMeta {
  return {
    id: "test-algo",
    name: "Test Algorithm",
    category: "classical",
    description: { short: "A test algorithm.", long: "A longer description." },
    complexity: { time: "O(n)", space: "O(1)", level: "beginner" },
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

const ALGORITHMS: AlgorithmMeta[] = [
  makeMeta({
    id: "binary-search",
    name: "Binary Search",
    category: "classical",
    description: { short: "Efficient search in sorted arrays.", long: "" },
    complexity: { time: "O(log n)", space: "O(1)", level: "beginner" },
  }),
  makeMeta({
    id: "quicksort",
    name: "Quicksort",
    category: "classical",
    description: { short: "Fast divide-and-conquer sort.", long: "" },
    complexity: { time: "O(n log n)", space: "O(log n)", level: "intermediate" },
  }),
  makeMeta({
    id: "backpropagation",
    name: "Backpropagation",
    category: "deep-learning",
    description: { short: "Neural network training.", long: "" },
    complexity: { time: "O(n·w)", space: "O(w)", level: "advanced" },
  }),
];

const CATEGORY_COUNTS: Record<string, number> = {
  classical: 2,
  "deep-learning": 1,
};

// ─── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CatalogPageClient — Mounting", () => {
  it("mounts without error", () => {
    expect(() =>
      render(<CatalogPageClient algorithms={ALGORITHMS} categoryCounts={CATEGORY_COUNTS} />),
    ).not.toThrow();
  });
});

describe("CatalogPageClient — Page Header", () => {
  it('renders the "Algorithm Library" heading', () => {
    render(<CatalogPageClient algorithms={ALGORITHMS} categoryCounts={CATEGORY_COUNTS} />);

    expect(screen.getByRole("heading", { name: "Algorithm Library" })).toBeInTheDocument();
  });

  it("renders the page description", () => {
    render(<CatalogPageClient algorithms={ALGORITHMS} categoryCounts={CATEGORY_COUNTS} />);

    expect(screen.getByText(/interactive, step-by-step visualizations/i)).toBeInTheDocument();
  });
});

describe("CatalogPageClient — Category Filter Bar", () => {
  it('renders the "All" tab', () => {
    render(<CatalogPageClient algorithms={ALGORITHMS} categoryCounts={CATEGORY_COUNTS} />);

    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /All/ })).toBeInTheDocument();
  });

  it("renders category tabs", () => {
    render(<CatalogPageClient algorithms={ALGORITHMS} categoryCounts={CATEGORY_COUNTS} />);

    expect(screen.getByRole("tab", { name: /Classical/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Deep Learning/ })).toBeInTheDocument();
  });

  it('"All" tab is active by default', () => {
    render(<CatalogPageClient algorithms={ALGORITHMS} categoryCounts={CATEGORY_COUNTS} />);

    const allTab = screen.getByRole("tab", { name: /All/ });
    expect(allTab).toHaveAttribute("aria-selected", "true");
  });
});

describe("CatalogPageClient — Search", () => {
  it("renders the search input", () => {
    render(<CatalogPageClient algorithms={ALGORITHMS} categoryCounts={CATEGORY_COUNTS} />);

    expect(screen.getByRole("searchbox")).toBeInTheDocument();
  });

  it("search input has correct placeholder", () => {
    render(<CatalogPageClient algorithms={ALGORITHMS} categoryCounts={CATEGORY_COUNTS} />);

    expect(screen.getByPlaceholderText("Search algorithms...")).toBeInTheDocument();
  });
});

describe("CatalogPageClient — Algorithm Cards", () => {
  it("renders all algorithm cards", () => {
    render(<CatalogPageClient algorithms={ALGORITHMS} categoryCounts={CATEGORY_COUNTS} />);

    expect(screen.getByText("Binary Search")).toBeInTheDocument();
    expect(screen.getByText("Quicksort")).toBeInTheDocument();
    expect(screen.getByText("Backpropagation")).toBeInTheDocument();
  });

  it("renders the algorithm grid with list role", () => {
    render(<CatalogPageClient algorithms={ALGORITHMS} categoryCounts={CATEGORY_COUNTS} />);

    expect(screen.getByRole("list", { name: "Algorithm cards" })).toBeInTheDocument();
  });

  it("renders correct number of list items", () => {
    render(<CatalogPageClient algorithms={ALGORITHMS} categoryCounts={CATEGORY_COUNTS} />);

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
  });
});

describe("CatalogPageClient — Result Count", () => {
  it("displays total count in the aria-live region", () => {
    const { container } = render(
      <CatalogPageClient algorithms={ALGORITHMS} categoryCounts={CATEGORY_COUNTS} />,
    );

    const liveRegion = container.querySelector('[aria-live="polite"][aria-atomic="true"]');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveTextContent(/3/);
    expect(liveRegion).toHaveTextContent(/algorithm/);
  });
});

describe("CatalogPageClient — Empty State", () => {
  it("shows empty state when no algorithms are provided", () => {
    render(<CatalogPageClient algorithms={[]} categoryCounts={{}} />);

    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});

describe("CatalogPageClient — Sort Selector", () => {
  it("renders the sort dropdown", () => {
    render(<CatalogPageClient algorithms={ALGORITHMS} categoryCounts={CATEGORY_COUNTS} />);

    const sortSelect = screen.getByRole("combobox");
    expect(sortSelect).toBeInTheDocument();
  });

  it('has "Name (A → Z)" as default sort option', () => {
    render(<CatalogPageClient algorithms={ALGORITHMS} categoryCounts={CATEGORY_COUNTS} />);

    const sortSelect = screen.getByRole("combobox") as HTMLSelectElement;
    expect(sortSelect.value).toBe("name-asc");
  });
});

describe("CatalogPageClient — Difficulty Filter", () => {
  it("renders difficulty filter chips", () => {
    render(<CatalogPageClient algorithms={ALGORITHMS} categoryCounts={CATEGORY_COUNTS} />);

    expect(screen.getByText("Difficulty:")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Beginner" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Intermediate" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Advanced" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expert" })).toBeInTheDocument();
  });
});
