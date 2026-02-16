/**
 * @fileoverview URL State Manager
 *
 * Bidirectional synchronization between URL search params and
 * algorithm visualization state. Enables shareable deep links.
 *
 * URL STRUCTURE (from Architecture §9):
 *   /algo/binary-search?array=1,3,5,7,9&target=7&step=3
 *
 * ENCODING RULES:
 * - Primitive values (number, string, boolean): standard URL encoding.
 * - Arrays of numbers: comma-separated (e.g., "1,3,5,7").
 * - Arrays of strings: comma-separated with URI encoding per element.
 * - Nested objects: NOT supported in URL params (use examples instead).
 * - Step index: `step` param, 0-based integer.
 * - Example preset: `example` param, name from meta.json examples.
 *
 * DESIGN CONSTRAINT: URL state is read on page load and written on state change.
 * The URL is the source of truth for the initial state. After that, React state
 * drives the UI, and URL updates are fire-and-forget (replaceState, no navigation).
 */

// ─── Types ───────────────────────────────────────────────────────────────────

/** Parsed visualization state from the URL. */
export interface UrlState {
  /** Custom input values parsed from URL params. Null if no custom inputs. */
  readonly inputs: Record<string, unknown> | null;
  /** Step index to jump to. Null if not specified (start at 0). */
  readonly stepIndex: number | null;
  /** Example preset name. Null if not specified. */
  readonly exampleName: string | null;
}

// ─── Parsing (URL → State) ───────────────────────────────────────────────────

/**
 * Parses URL search params into a UrlState object.
 *
 * @param searchParams - The URL search parameters (from Next.js or window.location).
 * @param inputSchema  - The algorithm's input schema (from meta.json), used to
 *                        determine how to parse each parameter.
 * @returns The parsed URL state.
 *
 * PARSING RULES:
 * - The `step` param is always parsed as an integer.
 * - The `example` param is always parsed as a string.
 * - All other params are parsed according to the input schema:
 *   - schema type "array" with items type "number" → split by comma, parse each as number
 *   - schema type "number" → parseFloat
 *   - schema type "string" → raw string value
 *   - schema type "boolean" → "true" / "false"
 *
 * SAFETY: Invalid params are silently ignored. If a number param contains "abc",
 * it results in NaN, which the input validator will catch downstream.
 */
export function parseUrlState(
  searchParams: URLSearchParams,
  inputSchema: Record<string, { type: string; items?: { type: string } }>,
): UrlState {
  // Step index.
  const stepParam = searchParams.get("step");
  const stepIndex = stepParam !== null ? parseInt(stepParam, 10) : null;
  // Validate: NaN or negative → treat as null.
  const validStepIndex =
    stepIndex !== null && Number.isFinite(stepIndex) && stepIndex >= 0
      ? stepIndex
      : null;

  // Example preset.
  const exampleName = searchParams.get("example") ?? null;

  // Custom inputs — only if at least one input param is present.
  let inputs: Record<string, unknown> | null = null;
  const schemaKeys = Object.keys(inputSchema);
  const hasInputParams = schemaKeys.some((key) => searchParams.has(key));

  if (hasInputParams) {
    inputs = {};
    for (const key of schemaKeys) {
      const raw = searchParams.get(key);
      if (raw === null) continue;

      const fieldSchema = inputSchema[key]!;
      inputs[key] = parseParamValue(raw, fieldSchema);
    }
  }

  return { inputs, stepIndex: validStepIndex, exampleName };
}

/**
 * Parses a single URL parameter value according to its schema type.
 *
 * @param raw    - The raw string from the URL parameter.
 * @param schema - The field's schema definition.
 * @returns The parsed value.
 */
function parseParamValue(
  raw: string,
  schema: { type: string; items?: { type: string } },
): unknown {
  switch (schema.type) {
    case "array": {
      const itemType = schema.items?.type ?? "string";
      const parts = raw.split(",").map((s) => s.trim());
      if (itemType === "number") {
        return parts.map((s) => parseFloat(s));
      }
      return parts; // string array
    }
    case "number":
      return parseFloat(raw);
    case "boolean":
      return raw === "true";
    default:
      return raw;
  }
}

// ─── Serializing (State → URL) ───────────────────────────────────────────────

/**
 * Serializes visualization state into URL search params and updates the
 * browser URL using `history.replaceState` (no navigation, no history entry).
 *
 * @param algorithmId - The algorithm's ID (for the path segment).
 * @param inputs      - The current input values.
 * @param stepIndex   - The current step index.
 * @param defaults    - The algorithm's default inputs (from meta.json).
 *                       Params matching defaults are omitted from the URL for cleanliness.
 */
export function updateUrlState(
  algorithmId: string,
  inputs: Record<string, unknown>,
  stepIndex: number,
  defaults: Record<string, unknown>,
): void {
  // Only run in browser context (not during SSR/SSG).
  if (typeof window === "undefined") return;

  const params = new URLSearchParams();

  // Add input params that differ from defaults.
  for (const [key, value] of Object.entries(inputs)) {
    const defaultValue = defaults[key];
    const serialized = serializeParamValue(value);
    const defaultSerialized = serializeParamValue(defaultValue);

    if (serialized !== defaultSerialized) {
      params.set(key, serialized);
    }
  }

  // Add step param if not at the beginning.
  if (stepIndex > 0) {
    params.set("step", String(stepIndex));
  }

  // Build the URL.
  const paramString = params.toString();
  const url = `/algo/${algorithmId}${paramString ? `?${paramString}` : ""}`;

  // Update the URL without triggering a navigation.
  window.history.replaceState(null, "", url);
}

/**
 * Serializes a value for URL parameter encoding.
 *
 * @param value - The value to serialize.
 * @returns The string representation for the URL.
 */
function serializeParamValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.join(",");
  }
  return String(value);
}

/**
 * Generates a shareable URL for the current visualization state.
 * Returns an absolute URL suitable for clipboard copying.
 *
 * @param algorithmId - The algorithm's ID.
 * @param inputs      - Current input values.
 * @param stepIndex   - Current step index.
 * @returns The full shareable URL string.
 */
export function getShareUrl(
  algorithmId: string,
  inputs: Record<string, unknown>,
  stepIndex: number,
): string {
  if (typeof window === "undefined") return "";

  const params = new URLSearchParams();

  // Include ALL input params in share URLs (even defaults) for explicitness.
  for (const [key, value] of Object.entries(inputs)) {
    params.set(key, serializeParamValue(value));
  }

  // Always include step in share URLs.
  params.set("step", String(stepIndex));

  return `${window.location.origin}/algo/${algorithmId}?${params.toString()}`;
}
