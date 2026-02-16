/**
 * SearchInput — Text search field with clear button and keyboard shortcut.
 *
 * FEATURES:
 * - Displays a magnifying glass icon on the left.
 * - "✕" clear button on the right when the field has content.
 * - Global keyboard shortcut: "/" focuses the search field (common web convention).
 * - Escape key clears the search and blurs the field.
 *
 * ACCESSIBILITY:
 * - <input type="search"> for semantic correctness.
 * - aria-label describes the field's purpose.
 * - The clear button has an aria-label.
 * - The "/" shortcut is discoverable via a small hint badge.
 *
 * See Phase7_Implementation.md §11 — Component: SearchInput.
 */

'use client';

import { useRef, useEffect, useCallback, type KeyboardEvent } from 'react';

interface SearchInputProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onClear: () => void;
  readonly placeholder?: string;
}

export function SearchInput({
  value,
  onChange,
  onClear,
  placeholder = 'Search algorithms...',
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Global "/" shortcut to focus the search field.
   *
   * IMPORTANT: Only activate when:
   * - No other input/textarea/select has focus.
   * - No modal or dialog is open.
   * This prevents the shortcut from interfering with typing.
   */
  useEffect(() => {
    function handleGlobalKeyDown(e: globalThis.KeyboardEvent) {
      if (
        e.key === '/' &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes(
          (document.activeElement?.tagName ?? '')
        )
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  /** Escape key: clear search and blur the field. */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        onClear();
        inputRef.current?.blur();
      }
    },
    [onClear]
  );

  return (
    <div className="relative w-full max-w-sm">
      {/* Magnifying glass icon (left) */}
      <svg
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary"
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
          d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
        />
      </svg>

      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label="Search algorithms by name, description, or keyword"
        className={[
          'w-full rounded-lg border bg-background-surface',
          'border-border focus:border-border-focus',
          'pl-10 pr-16 py-2',
          'text-sm text-text-primary placeholder:text-text-disabled',
          'outline-none transition-colors duration-normal',
        ].join(' ')}
      />

      {/* Right-side controls: clear button OR shortcut hint */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
        {value ? (
          <button
            onClick={onClear}
            aria-label="Clear search"
            className="rounded p-0.5 text-text-tertiary hover:text-text-secondary transition-colors duration-fast"
          >
            <svg
              className="h-4 w-4"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        ) : (
          <kbd
            className="hidden sm:inline-flex items-center rounded border border-border bg-background-elevated px-1.5 py-0.5 font-mono text-xs text-text-disabled"
            aria-hidden="true"
          >
            /
          </kbd>
        )}
      </div>
    </div>
  );
}
