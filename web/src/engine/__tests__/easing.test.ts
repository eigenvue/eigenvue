/**
 * @fileoverview Tests for easing functions.
 *
 * Every easing function must satisfy the mathematical contract:
 *   f(0) = 0
 *   f(1) = 1
 *   f is continuous on [0, 1]
 *
 * These tests verify boundary conditions and midpoint behavior with high
 * precision (10 decimal places as specified in the Phase 4 spec).
 */

import { describe, it, expect } from "vitest";
import {
  easeLinear,
  easeInQuad,
  easeOutQuad,
  easeInOutQuad,
  easeInCubic,
  easeOutCubic,
  easeInOutCubic,
  easeOutBack,
} from "../animation/easing";
import type { EasingFunction } from "../types";

/**
 * Test suite that applies to all easing functions.
 * Verifies the mathematical contract: f(0) = 0, f(1) = 1.
 */
function testEasingBoundaries(name: string, fn: EasingFunction): void {
  describe(name, () => {
    it("satisfies f(0) = 0", () => {
      expect(fn(0)).toBeCloseTo(0, 10);
    });

    it("satisfies f(1) = 1", () => {
      expect(fn(1)).toBeCloseTo(1, 10);
    });
  });
}

describe("easing functions", () => {
  // Apply boundary tests to all easing functions.
  testEasingBoundaries("easeLinear", easeLinear);
  testEasingBoundaries("easeInQuad", easeInQuad);
  testEasingBoundaries("easeOutQuad", easeOutQuad);
  testEasingBoundaries("easeInOutQuad", easeInOutQuad);
  testEasingBoundaries("easeInCubic", easeInCubic);
  testEasingBoundaries("easeOutCubic", easeOutCubic);
  testEasingBoundaries("easeInOutCubic", easeInOutCubic);
  testEasingBoundaries("easeOutBack", easeOutBack);
});

describe("easeLinear", () => {
  it("is the identity function", () => {
    expect(easeLinear(0.25)).toBe(0.25);
    expect(easeLinear(0.5)).toBe(0.5);
    expect(easeLinear(0.75)).toBe(0.75);
  });
});

describe("easeInQuad", () => {
  it("satisfies f(t) = t²", () => {
    expect(easeInQuad(0.5)).toBeCloseTo(0.25, 10);
    expect(easeInQuad(0.25)).toBeCloseTo(0.0625, 10);
    expect(easeInQuad(0.75)).toBeCloseTo(0.5625, 10);
  });
});

describe("easeOutQuad", () => {
  it("satisfies f(t) = t(2 - t)", () => {
    expect(easeOutQuad(0.5)).toBeCloseTo(0.75, 10);
    expect(easeOutQuad(0.25)).toBeCloseTo(0.4375, 10);
    expect(easeOutQuad(0.75)).toBeCloseTo(0.9375, 10);
  });
});

describe("easeInOutQuad", () => {
  it("satisfies f(0.5) = 0.5 (midpoint)", () => {
    expect(easeInOutQuad(0.5)).toBeCloseTo(0.5, 10);
  });

  it("applies ease-in for t < 0.5", () => {
    // f(0.25) = 2 * 0.25² = 2 * 0.0625 = 0.125
    expect(easeInOutQuad(0.25)).toBeCloseTo(0.125, 10);
  });

  it("applies ease-out for t >= 0.5", () => {
    // f(0.75) = -2(0.75)² + 4(0.75) - 1 = -1.125 + 3 - 1 = 0.875
    expect(easeInOutQuad(0.75)).toBeCloseTo(0.875, 10);
  });
});

describe("easeInCubic", () => {
  it("satisfies f(t) = t³", () => {
    expect(easeInCubic(0.5)).toBeCloseTo(0.125, 10);
    expect(easeInCubic(0.25)).toBeCloseTo(0.015625, 10);
    expect(easeInCubic(0.75)).toBeCloseTo(0.421875, 10);
  });
});

describe("easeOutCubic", () => {
  it("satisfies f(t) = 1 - (1 - t)³", () => {
    expect(easeOutCubic(0.5)).toBeCloseTo(0.875, 10);
    expect(easeOutCubic(0.25)).toBeCloseTo(0.578125, 10);
    expect(easeOutCubic(0.75)).toBeCloseTo(0.984375, 10);
  });
});

describe("easeInOutCubic", () => {
  it("satisfies f(0.5) = 0.5 (midpoint)", () => {
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 10);
  });

  it("applies ease-in for t < 0.5", () => {
    // f(0.25) = 4 * 0.25³ = 4 * 0.015625 = 0.0625
    expect(easeInOutCubic(0.25)).toBeCloseTo(0.0625, 10);
  });

  it("applies ease-out for t >= 0.5", () => {
    // f(0.75): u = 2(0.75) - 2 = -0.5
    // f(0.75) = 1 + (-0.5)³ / 2 = 1 + (-0.125) / 2 = 1 - 0.0625 = 0.9375
    expect(easeInOutCubic(0.75)).toBeCloseTo(0.9375, 10);
  });
});

describe("easeOutBack", () => {
  it("overshoots 1 before settling back", () => {
    // Find a point where f(t) > 1 (around t ≈ 0.874)
    const mid = easeOutBack(0.87);
    expect(mid).toBeGreaterThan(1.0);
  });

  it("satisfies f(0.5) is reasonable", () => {
    const mid = easeOutBack(0.5);
    // easeOutBack overshoots, so mid value can exceed 1.0
    // It should be positive and not too extreme
    expect(mid).toBeGreaterThan(0.4);
    expect(mid).toBeLessThan(1.2);
  });

  it("has continuity throughout the range", () => {
    // Test a few points to ensure no discontinuities
    const points = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
    let prev = easeOutBack(0);
    for (const t of points) {
      const curr = easeOutBack(t);
      // Ensure no wild jumps (difference should be reasonable)
      expect(Math.abs(curr - prev)).toBeLessThan(0.5);
      prev = curr;
    }
  });
});

describe("monotonicity", () => {
  it("easeLinear is monotonically increasing", () => {
    for (let t1 = 0; t1 <= 0.9; t1 += 0.1) {
      const t2 = t1 + 0.1;
      expect(easeLinear(t2)).toBeGreaterThan(easeLinear(t1));
    }
  });

  it("easeInQuad is monotonically increasing", () => {
    for (let t1 = 0; t1 <= 0.9; t1 += 0.1) {
      const t2 = t1 + 0.1;
      expect(easeInQuad(t2)).toBeGreaterThan(easeInQuad(t1));
    }
  });

  it("easeOutQuad is monotonically increasing", () => {
    for (let t1 = 0; t1 <= 0.9; t1 += 0.1) {
      const t2 = t1 + 0.1;
      expect(easeOutQuad(t2)).toBeGreaterThan(easeOutQuad(t1));
    }
  });

  it("easeInOutQuad is monotonically increasing", () => {
    for (let t1 = 0; t1 <= 0.9; t1 += 0.1) {
      const t2 = t1 + 0.1;
      expect(easeInOutQuad(t2)).toBeGreaterThan(easeInOutQuad(t1));
    }
  });

  it("easeInCubic is monotonically increasing", () => {
    for (let t1 = 0; t1 <= 0.9; t1 += 0.1) {
      const t2 = t1 + 0.1;
      expect(easeInCubic(t2)).toBeGreaterThan(easeInCubic(t1));
    }
  });

  it("easeOutCubic is monotonically increasing", () => {
    for (let t1 = 0; t1 <= 0.9; t1 += 0.1) {
      const t2 = t1 + 0.1;
      expect(easeOutCubic(t2)).toBeGreaterThan(easeOutCubic(t1));
    }
  });

  it("easeInOutCubic is monotonically increasing", () => {
    for (let t1 = 0; t1 <= 0.9; t1 += 0.1) {
      const t2 = t1 + 0.1;
      expect(easeInOutCubic(t2)).toBeGreaterThan(easeInOutCubic(t1));
    }
  });

  // Note: easeOutBack is NOT strictly monotonic due to the overshoot,
  // so we don't test it for monotonicity.
});
