/**
 * CategoryFilterBar — Horizontal tab row for filtering by algorithm category.
 *
 * ANATOMY:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  [All]  [Classical]  [Deep Learning]  [Generative AI]  [Quantum(soon)] │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * BEHAVIOR:
 * - Exactly one tab is active at a time (radio-button semantics).
 * - "All" shows algorithms from every category.
 * - Clicking an already-active tab does nothing (no toggle-off).
 * - "Quantum" tab is included but visually muted with a "Coming Soon" label
 *   (quantum has no algorithms in v1).
 * - On mobile, the tab row scrolls horizontally when it overflows.
 *
 * ACCESSIBILITY:
 * - Uses role="tablist" on the container, role="tab" on each button.
 * - aria-selected indicates the active tab.
 * - Arrow keys (← →) navigate between tabs (keyboard navigation).
 * - Tab key moves focus into and out of the tablist (not between tabs).
 *
 * See Phase7_Implementation.md §9 — Component: CategoryFilterBar.
 */

"use client";

import { useRef, useCallback, type KeyboardEvent } from "react";
import { type CategoryFilter } from "@/lib/catalog-types";
import { CATEGORIES } from "@/lib/catalog-constants";

interface CategoryFilterBarProps {
  readonly activeCategory: CategoryFilter;
  readonly onCategoryChange: (category: CategoryFilter) => void;
  /** Count of algorithms per category for badge display. */
  readonly categoryCounts: ReadonlyMap<string, number>;
}

export function CategoryFilterBar({
  activeCategory,
  onCategoryChange,
  categoryCounts,
}: CategoryFilterBarProps) {
  const tabListRef = useRef<HTMLDivElement>(null);

  /**
   * Keyboard navigation within the tablist.
   *
   * IMPLEMENTATION:
   * - ArrowRight / ArrowLeft move focus to the next / previous tab.
   * - Home / End move focus to the first / last tab.
   * - The focused tab is activated on Enter or Space (default button behavior).
   * - Tab order: only the active tab is in the tab sequence (tabindex=0).
   *   All other tabs have tabindex=-1 (roving tabindex pattern).
   *
   * ROVING TABINDEX SPEC: https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
   */
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    const tabList = tabListRef.current;
    if (!tabList) return;

    const tabs = Array.from(tabList.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    const currentIndex = tabs.findIndex((tab) => tab === document.activeElement);
    if (currentIndex === -1) return;

    let nextIndex: number | null = null;

    switch (e.key) {
      case "ArrowRight":
        nextIndex = (currentIndex + 1) % tabs.length;
        break;
      case "ArrowLeft":
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = tabs.length - 1;
        break;
      default:
        return; // Don't prevent default for unhandled keys
    }

    e.preventDefault();
    tabs[nextIndex].focus();
  }, []);

  /**
   * Build the complete tab list: "All" tab + one tab per category.
   */
  const allCount = Array.from(categoryCounts.values()).reduce((sum, count) => sum + count, 0);

  return (
    <div
      ref={tabListRef}
      role="tablist"
      aria-label="Filter algorithms by category"
      onKeyDown={handleKeyDown}
      className={[
        "flex items-center gap-1",
        /* Horizontal scroll on small screens */
        "overflow-x-auto scrollbar-none",
        /* Bottom border for tab-strip feel */
        "border-b border-border pb-0",
      ].join(" ")}
    >
      {/* "All" tab */}
      <CategoryTab
        label="All"
        count={allCount}
        isActive={activeCategory === "all"}
        onClick={() => onCategoryChange("all")}
        colorToken={null}
        comingSoon={false}
        isFirstTab
      />

      {/* Category tabs */}
      {CATEGORIES.map((cat) => (
        <CategoryTab
          key={cat.id}
          label={cat.label.replace(" Algorithms", "").replace(" Computing", "")}
          count={categoryCounts.get(cat.id) ?? 0}
          isActive={activeCategory === cat.id}
          onClick={() => onCategoryChange(cat.id)}
          colorToken={cat.colorToken}
          comingSoon={!cat.isAvailable}
          isFirstTab={false}
        />
      ))}
    </div>
  );
}

// ——————————————————————————————————————————————————
// INTERNAL: Single tab button
// ——————————————————————————————————————————————————

interface CategoryTabProps {
  readonly label: string;
  readonly count: number;
  readonly isActive: boolean;
  readonly onClick: () => void;
  readonly colorToken: string | null;
  readonly comingSoon: boolean;
  readonly isFirstTab: boolean;
}

/**
 * Individual category tab button.
 *
 * Uses roving tabindex: only the active tab has tabindex=0.
 * Other tabs have tabindex=-1 (reachable via arrow keys, not Tab).
 */
function CategoryTab({
  label,
  count,
  isActive,
  onClick,
  colorToken,
  comingSoon,
}: CategoryTabProps) {
  return (
    <button
      role="tab"
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      onClick={onClick}
      disabled={comingSoon}
      className={[
        /* Base styling */
        "relative flex items-center gap-1.5 whitespace-nowrap",
        "px-3 py-2.5 text-sm font-medium",
        "border-b-2 -mb-px transition-all duration-normal",
        /* Active state: solid bottom border + brighter text */
        isActive
          ? `border-current text-text-primary ${colorToken ? `text-${colorToken}` : ""}`
          : "border-transparent text-text-tertiary hover:text-text-secondary",
        /* Coming soon: dimmed and not clickable */
        comingSoon ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
      ].join(" ")}
      aria-label={
        comingSoon
          ? `${label} — Coming Soon`
          : `${label}: ${count} algorithm${count !== 1 ? "s" : ""}`
      }
    >
      {label}
      {!comingSoon && (
        <span
          className={`inline-flex items-center justify-center rounded-full px-1.5 py-0 font-mono text-xs ${
            isActive ? "bg-white/10 text-current" : "bg-background-elevated text-text-tertiary"
          }`}
        >
          {count}
        </span>
      )}
      {comingSoon && (
        <span className="rounded-full bg-background-elevated px-1.5 py-0 font-mono text-xs text-text-disabled">
          Soon
        </span>
      )}
    </button>
  );
}
