/**
 * @fileoverview State Inspector — Collapsible variable table.
 *
 * Displays the algorithm's state variables at the current step as a
 * key-value table. Arrays are rendered inline with brackets. Numbers,
 * strings, booleans, and null are rendered with appropriate formatting.
 *
 * DESIGN: This is intentionally simple. No tree viewer, no JSON editor.
 * Just a flat table of the top-level state keys and their values.
 * For nested objects, we JSON.stringify them compactly.
 */

"use client";

interface StateInspectorProps {
  /** The state object from the current step. Null if no step loaded. */
  readonly state: Record<string, unknown> | null;
}

export function StateInspector({ state }: StateInspectorProps) {
  if (!state) return null;

  const entries = Object.entries(state);

  return (
    <details className="bg-background-surface rounded-lg border border-border" open>
      <summary className="px-4 py-2 text-xs font-mono text-text-tertiary uppercase tracking-wider cursor-pointer hover:text-text-secondary">
        Variables
      </summary>
      <div className="px-4 pb-3">
        <table className="w-full text-sm" role="table" aria-label="Algorithm state variables">
          <tbody>
            {entries.map(([key, value]) => (
              <tr key={key} className="border-t border-border/50">
                <td className="py-1 pr-3 font-mono text-classical whitespace-nowrap align-top">
                  {key}
                </td>
                <td className="py-1 font-mono text-text-primary">
                  <StateValue value={value} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/** Renders a single state value with appropriate formatting. */
function StateValue({ value }: { value: unknown }) {
  if (value === null) {
    return <span className="text-text-disabled italic">null</span>;
  }
  if (typeof value === "boolean") {
    return <span className="text-genai">{String(value)}</span>;
  }
  if (typeof value === "number") {
    return <span className="text-deeplearning">{value}</span>;
  }
  if (typeof value === "string") {
    return <span className="text-quantum">&quot;{value}&quot;</span>;
  }
  if (Array.isArray(value)) {
    return (
      <span className="text-text-secondary">
        [{value.map((v, i) => (
          <span key={i}>
            {i > 0 && <span className="text-text-disabled">, </span>}
            <StateValue value={v} />
          </span>
        ))}]
      </span>
    );
  }
  // Fallback: JSON for objects.
  return <span className="text-text-tertiary">{JSON.stringify(value)}</span>;
}
