/**
 * @fileoverview CodePanel — Unit Tests
 *
 * Tests the CodePanel component in isolation. Validates:
 * - Renders the correct number of code lines.
 * - Highlights active lines with visual distinction.
 * - Supports language tab switching.
 * - Shows no highlights when language tab mismatches the step's language.
 * - Accessibility: tablist, tab roles, aria-selected, aria-live region.
 *
 * See Phase5_Implementation.md Part S — Testing Strategy.
 */

import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CodePanel } from "../CodePanel";

// ─── Test Data ────────────────────────────────────────────────────────────────

const IMPLEMENTATIONS: Record<string, string> = {
  pseudocode:
    "function binarySearch(array, target):\n  left = 0\n  right = length(array) - 1\n\n  while left <= right:\n    mid = floor((left + right) / 2)",
  python: "def binary_search(array, target):\n    left = 0\n    right = len(array) - 1",
  javascript:
    "function binarySearch(array, target) {\n  let left = 0;\n  let right = array.length - 1;\n}",
};

// ─── Rendering Tests ─────────────────────────────────────────────────────────

describe("CodePanel — Rendering", () => {
  it("renders the correct number of code lines for default language", () => {
    render(
      <CodePanel
        implementations={IMPLEMENTATIONS}
        defaultLanguage="pseudocode"
        codeHighlight={null}
      />,
    );

    // Pseudocode has 6 lines.
    const lines = IMPLEMENTATIONS.pseudocode!.split("\n");
    // Check line numbers are rendered.
    for (let i = 1; i <= lines.length; i++) {
      expect(screen.getByText(String(i))).toBeInTheDocument();
    }
  });

  it("displays all language tabs", () => {
    render(
      <CodePanel
        implementations={IMPLEMENTATIONS}
        defaultLanguage="pseudocode"
        codeHighlight={null}
      />,
    );

    expect(screen.getByRole("tab", { name: "pseudocode" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "python" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "javascript" })).toBeInTheDocument();
  });

  it("marks the default language tab as selected", () => {
    render(
      <CodePanel
        implementations={IMPLEMENTATIONS}
        defaultLanguage="pseudocode"
        codeHighlight={null}
      />,
    );

    const pseudoTab = screen.getByRole("tab", { name: "pseudocode" });
    expect(pseudoTab).toHaveAttribute("aria-selected", "true");

    const pythonTab = screen.getByRole("tab", { name: "python" });
    expect(pythonTab).toHaveAttribute("aria-selected", "false");
  });
});

// ─── Highlighting Tests ──────────────────────────────────────────────────────

describe("CodePanel — Line Highlighting", () => {
  it("highlights active lines when language matches", () => {
    const { container } = render(
      <CodePanel
        implementations={IMPLEMENTATIONS}
        defaultLanguage="pseudocode"
        codeHighlight={{ language: "pseudocode", lines: [5, 6] }}
      />,
    );

    // At minimum, the highlighted code lines should be present (border-classical appears
    // on both the line div border and the line number). Filter to line divs with bg highlight.
    const bgHighlighted = container.querySelectorAll('[class*="bg-classical"]');
    expect(bgHighlighted.length).toBeGreaterThanOrEqual(2);
  });

  it("shows no highlights when codeHighlight is null", () => {
    const { container } = render(
      <CodePanel
        implementations={IMPLEMENTATIONS}
        defaultLanguage="pseudocode"
        codeHighlight={null}
      />,
    );

    const bgHighlighted = container.querySelectorAll('[class*="bg-classical"]');
    expect(bgHighlighted.length).toBe(0);
  });

  it("shows no highlights when language tab mismatches step language", () => {
    const { container } = render(
      <CodePanel
        implementations={IMPLEMENTATIONS}
        defaultLanguage="pseudocode"
        codeHighlight={{ language: "python", lines: [1, 2] }}
      />,
    );

    // Active tab is pseudocode, but highlight is for python → no highlights.
    const bgHighlighted = container.querySelectorAll('[class*="bg-classical"]');
    expect(bgHighlighted.length).toBe(0);
  });
});

// ─── Tab Switching Tests ─────────────────────────────────────────────────────

describe("CodePanel — Tab Switching", () => {
  it("switches displayed code when a different tab is clicked", () => {
    render(
      <CodePanel
        implementations={IMPLEMENTATIONS}
        defaultLanguage="pseudocode"
        codeHighlight={null}
      />,
    );

    // Initially shows pseudocode content.
    expect(screen.getByText(/binarySearch/)).toBeInTheDocument();

    // Click Python tab.
    fireEvent.click(screen.getByRole("tab", { name: "python" }));

    // Now should show python content.
    expect(screen.getByText(/binary_search/)).toBeInTheDocument();

    // Python tab should now be selected.
    expect(screen.getByRole("tab", { name: "python" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "pseudocode" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("shows highlights after switching to matching language tab", () => {
    const { container } = render(
      <CodePanel
        implementations={IMPLEMENTATIONS}
        defaultLanguage="pseudocode"
        codeHighlight={{ language: "python", lines: [1] }}
      />,
    );

    // No highlights on pseudocode tab (language mismatch).
    let bgHighlighted = container.querySelectorAll('[class*="bg-classical"]');
    expect(bgHighlighted.length).toBe(0);

    // Switch to Python tab.
    fireEvent.click(screen.getByRole("tab", { name: "python" }));

    // Now highlights should appear.
    bgHighlighted = container.querySelectorAll('[class*="bg-classical"]');
    expect(bgHighlighted.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── Accessibility Tests ─────────────────────────────────────────────────────

describe("CodePanel — Accessibility", () => {
  it("has a tablist with correct aria-label", () => {
    render(
      <CodePanel
        implementations={IMPLEMENTATIONS}
        defaultLanguage="pseudocode"
        codeHighlight={null}
      />,
    );

    expect(screen.getByRole("tablist")).toHaveAttribute("aria-label", "Code language");
  });

  it("has a code region with aria-label", () => {
    render(
      <CodePanel
        implementations={IMPLEMENTATIONS}
        defaultLanguage="pseudocode"
        codeHighlight={null}
      />,
    );

    expect(screen.getByRole("region")).toHaveAttribute("aria-label", "pseudocode source code");
  });

  it("has an aria-live region for active line announcements", () => {
    const { container } = render(
      <CodePanel
        implementations={IMPLEMENTATIONS}
        defaultLanguage="pseudocode"
        codeHighlight={{ language: "pseudocode", lines: [5, 6] }}
      />,
    );

    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion?.textContent).toContain("lines 5, 6");
  });
});
