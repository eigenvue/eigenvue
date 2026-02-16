// =============================================================================
// web/src/engine/color.ts
//
// Color parsing and interpolation utilities for the rendering engine.
//
// All interpolation is performed in RGB space. For the animation use case
// (short transitions between similar colors), RGB interpolation is
// perceptually acceptable and computationally cheap.
//
// Supported input formats:
//   - 3-digit hex: "#f00"
//   - 6-digit hex: "#ff0000"
//   - 8-digit hex: "#ff000080" (with alpha)
//   - rgb():  "rgb(255, 0, 0)"
//   - rgba(): "rgba(255, 0, 0, 0.5)"
//   - Named: "transparent" (special-cased as rgba(0,0,0,0))
// =============================================================================

/** RGBA color as an array of [R, G, B, A] where R/G/B ∈ [0, 255] and A ∈ [0, 1]. */
type RGBA = [number, number, number, number];

/**
 * Parses a CSS color string into an RGBA tuple.
 *
 * @param color - CSS color string.
 * @returns RGBA tuple. Falls back to opaque black for unrecognized formats.
 */
export function parseColor(color: string): RGBA {
  if (color === "transparent") return [0, 0, 0, 0];

  // Hex formats.
  if (color.startsWith("#")) {
    return parseHex(color);
  }

  // rgb() and rgba() formats.
  const rgbaMatch = color.match(
    /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/,
  );
  if (rgbaMatch) {
    return [
      parseInt(rgbaMatch[1]!, 10),
      parseInt(rgbaMatch[2]!, 10),
      parseInt(rgbaMatch[3]!, 10),
      rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1,
    ];
  }

  // Fallback: opaque black.
  return [0, 0, 0, 1];
}

function parseHex(hex: string): RGBA {
  const h = hex.slice(1); // Remove '#'.

  if (h.length === 3) {
    // "#f00" → "#ff0000"
    const r = parseInt(h[0]! + h[0]!, 16);
    const g = parseInt(h[1]! + h[1]!, 16);
    const b = parseInt(h[2]! + h[2]!, 16);
    return [r, g, b, 1];
  }

  if (h.length === 6) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return [r, g, b, 1];
  }

  if (h.length === 8) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const a = parseInt(h.slice(6, 8), 16) / 255;
    return [r, g, b, a];
  }

  return [0, 0, 0, 1];
}

/**
 * Converts an RGBA tuple to a CSS rgba() string.
 */
export function rgbaToString(rgba: RGBA): string {
  const [r, g, b, a] = rgba;
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a.toFixed(3)})`;
}

/**
 * Interpolates between two CSS color strings in RGB space.
 *
 * Mathematical definition for each component c ∈ {R, G, B, A}:
 *   c_result = c_from + (c_to - c_from) * t
 *            = c_from * (1 - t) + c_to * t
 *
 * @param fromColor - Source CSS color string.
 * @param toColor   - Target CSS color string.
 * @param t         - Progress in [0, 1]. 0 = fromColor, 1 = toColor.
 * @returns Interpolated CSS rgba() string.
 */
export function interpolateColor(fromColor: string, toColor: string, t: number): string {
  // Fast path: identical colors.
  if (fromColor === toColor) return fromColor;

  // Fast path: endpoints.
  if (t <= 0) return fromColor;
  if (t >= 1) return toColor;

  const from = parseColor(fromColor);
  const to = parseColor(toColor);

  const result: RGBA = [
    from[0] + (to[0] - from[0]) * t,
    from[1] + (to[1] - from[1]) * t,
    from[2] + (to[2] - from[2]) * t,
    from[3] + (to[3] - from[3]) * t,
  ];

  return rgbaToString(result);
}

/**
 * Converts a hex color to an rgba() string (convenience function).
 *
 * @param hex   - Hex color (e.g., "#ff0000").
 * @param alpha - Alpha override in [0, 1]. Default: uses the hex alpha if present, else 1.
 */
export function hexToRgba(hex: string, alpha?: number): string {
  const rgba = parseColor(hex);
  if (alpha !== undefined) {
    rgba[3] = alpha;
  }
  return rgbaToString(rgba);
}
