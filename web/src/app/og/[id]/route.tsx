/**
 * @fileoverview Open Graph Image Route Handler
 *
 * Generates 1200x630 PNG images for social media link previews.
 * Each algorithm gets a custom OG image showing:
 *   - Algorithm name (large, prominent)
 *   - Category badge with accent color
 *   - Complexity notation (time & space)
 *   - Eigenvue branding and logo
 *   - Subtle background pattern matching the category color
 *
 * RENDERING:
 * Uses @vercel/og (Satori) for HTML-to-image conversion.
 *
 * DESIGN SPEC:
 * - Background:     Dark (#06080f) with a subtle grid pattern
 * - Category color:  Used for the accent stripe and badge
 * - Typography:      Inter (system-available on Satori) at large sizes
 * - Dimensions:      1200x630px (standard OG image ratio)
 *
 * CACHING:
 * Next.js caches the route handler response. We also set
 * Cache-Control for pre-generated images since algorithm metadata
 * rarely changes.
 */

import { ImageResponse } from "@vercel/og";
import { loadAlgorithm, getAlgorithmIds } from "@/lib/algorithm-loader";

// ─── Static Params ────────────────────────────────────────────────────────────

/**
 * Static params for pre-rendering OG images at build time.
 * Also generates a "home" image for the landing page.
 */
export async function generateStaticParams() {
  const algorithmIds = getAlgorithmIds();
  return [...algorithmIds.map((id) => ({ id })), { id: "home" }];
}

// ─── Category Colors ──────────────────────────────────────────────────────────

/**
 * Maps category slugs to their accent colors.
 * Must stay in sync with the design token system from Phase 2.
 *
 * VERIFICATION: Compare these hex values against tailwind.config.ts.
 * classical    -> #38bdf8 (sky blue)
 * deep-learning -> #8b5cf6 (purple)
 * generative-ai -> #f472b6 (pink)
 * quantum      -> #00ffc8 (cyan)
 */
const CATEGORY_COLORS: Record<string, string> = {
  classical: "#38bdf8",
  "deep-learning": "#8b5cf6",
  "generative-ai": "#f472b6",
  quantum: "#00ffc8",
};

/** Category display names for the OG image badge. */
const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  classical: "Classical Algorithms",
  "deep-learning": "Deep Learning",
  "generative-ai": "Generative AI",
  quantum: "Quantum Computing",
};

/** Fallback color if category is not recognized. */
const DEFAULT_ACCENT = "#8b5cf6";

// ─── GET Handler ──────────────────────────────────────────────────────────────

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // ── Home page OG image ────────────────────────────────────────
  if (id === "home") {
    return new ImageResponse(
      renderHomeOgImage(),
      { width: 1200, height: 630 },
    );
  }

  // ── Algorithm-specific OG image ───────────────────────────────
  const algorithm = await loadAlgorithm(id);

  if (!algorithm) {
    // Return a generic fallback image for unknown algorithms.
    return new ImageResponse(
      renderFallbackOgImage(id),
      { width: 1200, height: 630 },
    );
  }

  const { meta } = algorithm;
  const accentColor = CATEGORY_COLORS[meta.category] ?? DEFAULT_ACCENT;

  return new ImageResponse(
    renderAlgorithmOgImage({
      name: meta.name,
      categoryDisplay: CATEGORY_DISPLAY_NAMES[meta.category] ?? meta.category,
      timeComplexity: meta.complexity.time,
      spaceComplexity: meta.complexity.space,
      accentColor,
    }),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    },
  );
}

// ─── Render Functions ─────────────────────────────────────────────────────────

/**
 * IMPORTANT NOTE ON JSX SYNTAX:
 * @vercel/og (Satori) uses a SUBSET of CSS. The following are supported:
 * - flexbox (display: flex only — no grid, no block)
 * - absolute positioning
 * - width, height, padding, margin, border, borderRadius
 * - color, backgroundColor, fontSize, fontWeight, fontFamily
 * - letterSpacing, lineHeight, textAlign
 * - backgroundImage (linear-gradient only)
 * - opacity, overflow
 *
 * NOT SUPPORTED: CSS Grid, transforms, animations, box-shadow, filter,
 * backdrop-filter, calc(), clamp(), CSS custom properties (var()).
 *
 * All styles must be inline objects. No Tailwind, no CSS classes.
 */

interface AlgorithmOgProps {
  name: string;
  categoryDisplay: string;
  timeComplexity: string;
  spaceComplexity: string;
  accentColor: string;
}

function renderAlgorithmOgImage(props: AlgorithmOgProps) {
  const { name, categoryDisplay, timeComplexity, spaceComplexity, accentColor } =
    props;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "60px 80px",
        backgroundColor: "#06080f",
        backgroundImage:
          `radial-gradient(circle at 1px 1px, ${accentColor}15 1px, transparent 0)`,
        backgroundSize: "40px 40px",
        fontFamily: "Inter, system-ui, sans-serif",
        color: "#ffffff",
      }}
    >
      {/* ── Top: Accent stripe ──────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "4px",
          backgroundColor: accentColor,
          position: "absolute",
          top: "0",
          left: "0",
        }}
      />

      {/* ── Middle: Algorithm name and category ─────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginTop: "20px" }}>
        {/* Category badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <div
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              backgroundColor: accentColor,
            }}
          />
          <span
            style={{
              fontSize: "24px",
              fontWeight: 500,
              color: accentColor,
              letterSpacing: "0.05em",
            }}
          >
            {categoryDisplay}
          </span>
        </div>

        {/* Algorithm name */}
        <div
          style={{
            fontSize: name.length > 25 ? "56px" : "72px",
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            maxWidth: "1000px",
          }}
        >
          {name}
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: "28px",
            fontWeight: 400,
            color: "#94a3b8",
          }}
        >
          Interactive Step-by-Step Visualization
        </div>
      </div>

      {/* ── Bottom: Complexity + Branding ───────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          width: "100%",
        }}
      >
        {/* Complexity badges */}
        <div style={{ display: "flex", gap: "24px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "14px", color: "#64748b", fontWeight: 500 }}>
              TIME
            </span>
            <span
              style={{
                fontSize: "22px",
                fontWeight: 600,
                fontFamily: "monospace",
                color: "#e2e8f0",
              }}
            >
              {timeComplexity}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "14px", color: "#64748b", fontWeight: 500 }}>
              SPACE
            </span>
            <span
              style={{
                fontSize: "22px",
                fontWeight: 600,
                fontFamily: "monospace",
                color: "#e2e8f0",
              }}
            >
              {spaceComplexity}
            </span>
          </div>
        </div>

        {/* Eigenvue branding */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <span
            style={{
              fontSize: "32px",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              backgroundImage: "linear-gradient(135deg, #8b5cf6, #00ffc8)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Eigenvue
          </span>
        </div>
      </div>
    </div>
  );
}

function renderHomeOgImage() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "60px 80px",
        backgroundColor: "#06080f",
        backgroundImage:
          "radial-gradient(circle at 1px 1px, #8b5cf615 1px, transparent 0)",
        backgroundSize: "40px 40px",
        fontFamily: "Inter, system-ui, sans-serif",
        color: "#ffffff",
      }}
    >
      <div
        style={{
          fontSize: "80px",
          fontWeight: 700,
          letterSpacing: "-0.03em",
          backgroundImage: "linear-gradient(135deg, #8b5cf6, #00ffc8)",
          backgroundClip: "text",
          color: "transparent",
          marginBottom: "24px",
        }}
      >
        Eigenvue
      </div>
      <div
        style={{
          fontSize: "32px",
          fontWeight: 400,
          color: "#94a3b8",
          textAlign: "center",
          maxWidth: "800px",
        }}
      >
        Interactive Algorithm Visualizations for AI, ML & Computer Science
      </div>
    </div>
  );
}

function renderFallbackOgImage(id: string) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#06080f",
        fontFamily: "Inter, system-ui, sans-serif",
        color: "#ffffff",
      }}
    >
      <div style={{ fontSize: "48px", fontWeight: 700 }}>{id}</div>
      <div style={{ fontSize: "24px", color: "#94a3b8", marginTop: "16px" }}>
        Eigenvue Algorithm Visualization
      </div>
    </div>
  );
}
