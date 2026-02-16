/**
 * SortSelector — Dropdown for selecting the algorithm sort order.
 *
 * Uses a native <select> element for maximum accessibility and mobile
 * compatibility. Native selects work correctly with screen readers,
 * touch devices, and keyboard navigation out of the box.
 *
 * STYLING: The native <select> is styled with Tailwind to match the
 * dark theme. A custom chevron icon replaces the browser's default.
 *
 * See Phase7_Implementation.md §12 — Component: SortSelector.
 */

'use client';

import { type SortOption, SORT_OPTION_LABELS } from '@/lib/catalog-types';

interface SortSelectorProps {
  readonly value: SortOption;
  readonly onChange: (sort: SortOption) => void;
}

export function SortSelector({ value, onChange }: SortSelectorProps) {
  return (
    <div className="relative">
      <label htmlFor="catalog-sort" className="sr-only">
        Sort algorithms by
      </label>
      <select
        id="catalog-sort"
        value={value}
        onChange={(e) => onChange(e.target.value as SortOption)}
        className={[
          'appearance-none rounded-lg border bg-background-surface',
          'border-border focus:border-border-focus',
          'pl-3 pr-8 py-2',
          'text-sm text-text-secondary',
          'outline-none transition-colors duration-normal',
          'cursor-pointer',
        ].join(' ')}
      >
        {(Object.entries(SORT_OPTION_LABELS) as [SortOption, string][]).map(
          ([optionValue, label]) => (
            <option key={optionValue} value={optionValue}>
              {label}
            </option>
          )
        )}
      </select>

      {/* Custom chevron icon */}
      <svg
        className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 8.25l-7.5 7.5-7.5-7.5"
        />
      </svg>
    </div>
  );
}
