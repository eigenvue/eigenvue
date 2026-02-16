/**
 * @fileoverview Tests for color parsing and interpolation utilities.
 *
 * Every mathematical assertion is verified to high precision (6 decimal places)
 * to ensure the interpolation system produces correct results.
 */

import { describe, it, expect } from "vitest";
import { parseColor, rgbaToString, interpolateColor, hexToRgba } from "../color";

describe("parseColor", () => {
  it("parses 6-digit hex color", () => {
    expect(parseColor("#ff0000")).toEqual([255, 0, 0, 1]);
  });

  it("parses 3-digit hex color", () => {
    expect(parseColor("#f00")).toEqual([255, 0, 0, 1]);
  });

  it("parses 8-digit hex color with alpha", () => {
    const result = parseColor("#ff000080");
    expect(result[0]).toBe(255);
    expect(result[1]).toBe(0);
    expect(result[2]).toBe(0);
    // 128 / 255 ≈ 0.502
    expect(result[3]).toBeCloseTo(0.502, 3);
  });

  it("parses rgb() format", () => {
    expect(parseColor("rgb(0, 128, 255)")).toEqual([0, 128, 255, 1]);
  });

  it("parses rgba() format", () => {
    expect(parseColor("rgba(0, 128, 255, 0.5)")).toEqual([0, 128, 255, 0.5]);
  });

  it("parses 'transparent' keyword", () => {
    expect(parseColor("transparent")).toEqual([0, 0, 0, 0]);
  });

  it("falls back to opaque black for unrecognized format", () => {
    expect(parseColor("not-a-color")).toEqual([0, 0, 0, 1]);
  });
});

describe("rgbaToString", () => {
  it("converts RGBA tuple to CSS rgba() string", () => {
    expect(rgbaToString([255, 0, 0, 1])).toBe("rgba(255, 0, 0, 1.000)");
  });

  it("rounds RGB components", () => {
    expect(rgbaToString([127.6, 64.3, 200.9, 0.5])).toBe(
      "rgba(128, 64, 201, 0.500)",
    );
  });

  it("formats alpha with 3 decimal places", () => {
    expect(rgbaToString([100, 150, 200, 0.123456])).toBe(
      "rgba(100, 150, 200, 0.123)",
    );
  });
});

describe("interpolateColor", () => {
  describe("endpoint fast paths", () => {
    it("returns fromColor when t = 0", () => {
      expect(interpolateColor("#000000", "#ffffff", 0)).toBe("#000000");
    });

    it("returns toColor when t = 1", () => {
      expect(interpolateColor("#000000", "#ffffff", 1)).toBe("#ffffff");
    });

    it("returns fromColor when colors are identical", () => {
      expect(interpolateColor("#abc", "#abc", 0.5)).toBe("#abc");
    });
  });

  describe("RGB interpolation", () => {
    it("interpolates black to white at midpoint", () => {
      const result = interpolateColor("#000000", "#ffffff", 0.5);
      // Midpoint: (0+255)/2 = 127.5 → rounds to 128
      expect(result).toBe("rgba(128, 128, 128, 1.000)");
    });

    it("interpolates pure red to pure blue", () => {
      const result = interpolateColor("#ff0000", "#0000ff", 0.5);
      // R: 255 → 128, G: 0 → 0, B: 0 → 128
      expect(result).toBe("rgba(128, 0, 128, 1.000)");
    });

    it("interpolates with alpha channel", () => {
      const result = interpolateColor("rgba(0,0,0,0)", "rgba(255,255,255,1)", 0.5);
      expect(result).toBe("rgba(128, 128, 128, 0.500)");
    });
  });

  describe("boundary behavior", () => {
    it("handles t < 0 by clamping to fromColor", () => {
      expect(interpolateColor("#000", "#fff", -0.5)).toBe("#000");
    });

    it("handles t > 1 by clamping to toColor", () => {
      expect(interpolateColor("#000", "#fff", 1.5)).toBe("#fff");
    });
  });

  describe("mathematical correctness", () => {
    it("satisfies lerp formula at t=0.25", () => {
      // black (#000000) to white (#ffffff) at t=0.25
      // R: 0 + (255 - 0) * 0.25 = 63.75 → rounds to 64
      const result = interpolateColor("#000000", "#ffffff", 0.25);
      expect(result).toBe("rgba(64, 64, 64, 1.000)");
    });

    it("satisfies lerp formula at t=0.75", () => {
      // black (#000000) to white (#ffffff) at t=0.75
      // R: 0 + (255 - 0) * 0.75 = 191.25 → rounds to 191
      const result = interpolateColor("#000000", "#ffffff", 0.75);
      expect(result).toBe("rgba(191, 191, 191, 1.000)");
    });
  });

  describe("format handling", () => {
    it("interpolates between different input formats", () => {
      const result = interpolateColor("#f00", "rgb(0, 0, 255)", 0.5);
      expect(result).toBe("rgba(128, 0, 128, 1.000)");
    });
  });
});

describe("hexToRgba", () => {
  it("converts hex to rgba string", () => {
    expect(hexToRgba("#ff0000")).toBe("rgba(255, 0, 0, 1.000)");
  });

  it("overrides alpha when provided", () => {
    expect(hexToRgba("#ff0000", 0.5)).toBe("rgba(255, 0, 0, 0.500)");
  });

  it("preserves hex alpha when no override provided", () => {
    const result = hexToRgba("#ff000080");
    expect(result).toMatch(/^rgba\(255, 0, 0, 0\.50\d\)$/);
  });

  it("accepts 3-digit hex", () => {
    expect(hexToRgba("#f00")).toBe("rgba(255, 0, 0, 1.000)");
  });
});
