/**
 * @fileoverview Build-Time OG Image Pre-Generation Script
 *
 * Generates 1200x630 PNG Open Graph images for every algorithm and the
 * landing page. The output PNGs are placed in web/public/og-images/ and
 * served statically, reducing latency compared to dynamic generation.
 *
 * USAGE:
 *   cd web && npx tsx ../scripts/generate-og-images.ts
 *
 * INVOCATION IN CI:
 *   Called by the deploy-web.yml workflow before `next build`.
 *
 * APPROACH:
 *   1. Scan the algorithms/ directory for meta.json files.
 *   2. For each algorithm, build a virtual-DOM element matching the
 *      design of the /og/[id] route handler.
 *   3. Render the element to SVG via Satori.
 *   4. Convert the SVG to PNG via @resvg/resvg-js.
 *   5. Write the PNG to web/public/og-images/{id}.png.
 *   6. Also generate a "home.png" for the landing page OG image.
 *
 * DEPENDENCIES (installed in web/):
 *   satori        — JSX-to-SVG renderer (devDependency)
 *   @resvg/resvg-js — SVG-to-PNG rasterizer (devDependency)
 *
 * FONT:
 *   Inter (TTF) is fetched from Google Fonts CDN at build time.
 *   Requires network access during the build step.
 */

import { createRequire } from "node:module";
import {
  writeFileSync,
  mkdirSync,
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join, resolve } from "node:path";

// ─── Resolve packages from web/node_modules ──────────────────────────────────

const ROOT_DIR = resolve(__dirname, "..");
const WEB_DIR = join(ROOT_DIR, "web");
const ALGORITHMS_DIR = join(ROOT_DIR, "algorithms");
const OUTPUT_DIR = join(WEB_DIR, "public", "og-images");

/**
 * Use Node's createRequire to resolve satori and @resvg/resvg-js from the
 * web workspace's node_modules. This avoids needing a root-level install
 * while keeping the script at scripts/ as the spec requires.
 */
const webRequire = createRequire(join(WEB_DIR, "package.json"));

// satori CJS export may be a function directly or have a .default property.
const satoriMod = webRequire("satori");
const satori: (element: unknown, options: SatoriOptions) => Promise<string> =
  typeof satoriMod === "function" ? satoriMod : satoriMod.default;

const { Resvg } = webRequire("@resvg/resvg-js") as {
  Resvg: new (svg: string) => { render: () => { asPng: () => Uint8Array } };
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface SatoriFont {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 500 | 600 | 700;
  style: "normal" | "italic";
}

interface SatoriOptions {
  width: number;
  height: number;
  fonts: SatoriFont[];
}

/** Virtual-DOM node accepted by Satori (React-element-like shape). */
interface VNode {
  type: string;
  props: Record<string, unknown>;
}

/** Minimal metadata extracted from an algorithm's meta.json. */
interface AlgorithmOgMeta {
  id: string;
  name: string;
  category: string;
  timeComplexity: string;
  spaceComplexity: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Category accent colors — must stay in sync with the OG route handler
 * at web/src/app/og/[id]/route.tsx and the design tokens.
 */
const CATEGORY_COLORS: Record<string, string> = {
  classical: "#38bdf8",
  "deep-learning": "#8b5cf6",
  "generative-ai": "#f472b6",
  quantum: "#00ffc8",
};

const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  classical: "Classical Algorithms",
  "deep-learning": "Deep Learning",
  "generative-ai": "Generative AI",
  quantum: "Quantum Computing",
};

const DEFAULT_ACCENT = "#8b5cf6";

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

// ─── Virtual-DOM Helper ───────────────────────────────────────────────────────

/**
 * Creates a React-element-like virtual-DOM node that Satori accepts.
 * This avoids needing a JSX compiler or React dependency in this script.
 */
function h(
  type: string,
  props: Record<string, unknown> | null,
  ...children: (VNode | string | number)[]
): VNode {
  return {
    type,
    props: {
      ...(props ?? {}),
      children:
        children.length === 0
          ? undefined
          : children.length === 1
            ? children[0]
            : children,
    },
  };
}

// ─── Font Loading ─────────────────────────────────────────────────────────────

/**
 * Fetches Inter font data from Google Fonts CDN in TrueType format.
 * Satori requires TTF/OTF/WOFF font data (not WOFF2).
 *
 * Uses an old IE User-Agent to trigger TTF format from Google Fonts,
 * since modern UAs receive WOFF2 which older Satori versions reject.
 */
async function loadFont(weight: number): Promise<ArrayBuffer> {
  const cssUrl = `https://fonts.googleapis.com/css2?family=Inter:wght@${weight}&display=swap`;
  const cssResponse = await fetch(cssUrl, {
    headers: {
      // IE 10 User-Agent triggers TTF format from Google Fonts
      "User-Agent":
        "Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; Trident/6.0)",
    },
  });

  if (!cssResponse.ok) {
    throw new Error(
      `Failed to fetch font CSS for Inter ${weight}: HTTP ${cssResponse.status}`,
    );
  }

  const css = await cssResponse.text();
  const fontUrlMatch = css.match(/src:\s*url\(([^)]+)\)/);

  if (!fontUrlMatch?.[1]) {
    throw new Error(
      `Failed to extract font URL from Google Fonts CSS for Inter ${weight}`,
    );
  }

  const fontResponse = await fetch(fontUrlMatch[1]);

  if (!fontResponse.ok) {
    throw new Error(
      `Failed to fetch font data for Inter ${weight}: HTTP ${fontResponse.status}`,
    );
  }

  return fontResponse.arrayBuffer();
}

// ─── Algorithm Discovery ──────────────────────────────────────────────────────

/**
 * Scans the algorithms/ directory tree for meta.json files and extracts
 * the fields needed for OG image generation.
 *
 * Directory structure:
 *   algorithms/{category}/{algorithm-id}/meta.json
 */
function discoverAlgorithms(): AlgorithmOgMeta[] {
  if (!existsSync(ALGORITHMS_DIR)) {
    console.warn(`Algorithms directory not found: ${ALGORITHMS_DIR}`);
    return [];
  }

  const results: AlgorithmOgMeta[] = [];

  const categories = readdirSync(ALGORITHMS_DIR).filter((name) => {
    const fullPath = join(ALGORITHMS_DIR, name);
    return statSync(fullPath).isDirectory();
  });

  for (const category of categories) {
    const categoryDir = join(ALGORITHMS_DIR, category);
    const algorithmDirs = readdirSync(categoryDir).filter((name) => {
      const metaPath = join(categoryDir, name, "meta.json");
      return existsSync(metaPath);
    });

    for (const algoDir of algorithmDirs) {
      const metaPath = join(categoryDir, algoDir, "meta.json");
      const raw = readFileSync(metaPath, "utf-8");
      const meta = JSON.parse(raw) as {
        id: string;
        name: string;
        category: string;
        complexity: { time: string; space: string };
      };

      results.push({
        id: meta.id,
        name: meta.name,
        category: meta.category,
        timeComplexity: meta.complexity.time,
        spaceComplexity: meta.complexity.space,
      });
    }
  }

  return results;
}

// ─── OG Image Render Functions ────────────────────────────────────────────────

/**
 * Builds the virtual-DOM tree for an algorithm OG image.
 * Layout and styling match the /og/[id] route handler exactly.
 */
function renderAlgorithmOgImage(props: {
  name: string;
  categoryDisplay: string;
  timeComplexity: string;
  spaceComplexity: string;
  accentColor: string;
}): VNode {
  const { name, categoryDisplay, timeComplexity, spaceComplexity, accentColor } =
    props;

  return h(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "60px 80px",
        backgroundColor: "#06080f",
        backgroundImage: `radial-gradient(circle at 1px 1px, ${accentColor}15 1px, transparent 0)`,
        backgroundSize: "40px 40px",
        fontFamily: "Inter, system-ui, sans-serif",
        color: "#ffffff",
      },
    },
    // Top: accent stripe
    h("div", {
      style: {
        display: "flex",
        width: "100%",
        height: "4px",
        backgroundColor: accentColor,
        position: "absolute",
        top: "0",
        left: "0",
      },
    }),
    // Middle: algorithm name and category
    h(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          marginTop: "20px",
        },
      },
      // Category badge
      h(
        "div",
        { style: { display: "flex", alignItems: "center", gap: "8px" } },
        h("div", {
          style: {
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            backgroundColor: accentColor,
          },
        }),
        h(
          "span",
          {
            style: {
              fontSize: "24px",
              fontWeight: 500,
              color: accentColor,
              letterSpacing: "0.05em",
            },
          },
          categoryDisplay,
        ),
      ),
      // Algorithm name
      h(
        "div",
        {
          style: {
            fontSize: name.length > 25 ? "56px" : "72px",
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            maxWidth: "1000px",
          },
        },
        name,
      ),
      // Subtitle
      h(
        "div",
        { style: { fontSize: "28px", fontWeight: 400, color: "#94a3b8" } },
        "Interactive Step-by-Step Visualization",
      ),
    ),
    // Bottom: complexity + branding
    h(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          width: "100%",
        },
      },
      // Complexity badges
      h(
        "div",
        { style: { display: "flex", gap: "24px" } },
        h(
          "div",
          {
            style: { display: "flex", flexDirection: "column", gap: "4px" },
          },
          h(
            "span",
            {
              style: { fontSize: "14px", color: "#64748b", fontWeight: 500 },
            },
            "TIME",
          ),
          h(
            "span",
            {
              style: {
                fontSize: "22px",
                fontWeight: 600,
                fontFamily: "monospace",
                color: "#e2e8f0",
              },
            },
            timeComplexity,
          ),
        ),
        h(
          "div",
          {
            style: { display: "flex", flexDirection: "column", gap: "4px" },
          },
          h(
            "span",
            {
              style: { fontSize: "14px", color: "#64748b", fontWeight: 500 },
            },
            "SPACE",
          ),
          h(
            "span",
            {
              style: {
                fontSize: "22px",
                fontWeight: 600,
                fontFamily: "monospace",
                color: "#e2e8f0",
              },
            },
            spaceComplexity,
          ),
        ),
      ),
      // Eigenvue branding
      h(
        "div",
        { style: { display: "flex", alignItems: "center", gap: "12px" } },
        h(
          "span",
          {
            style: {
              fontSize: "32px",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              backgroundImage: "linear-gradient(135deg, #8b5cf6, #00ffc8)",
              backgroundClip: "text",
              color: "transparent",
            },
          },
          "Eigenvue",
        ),
      ),
    ),
  );
}

/**
 * Builds the virtual-DOM tree for the landing page OG image.
 */
function renderHomeOgImage(): VNode {
  return h(
    "div",
    {
      style: {
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
      },
    },
    h(
      "div",
      {
        style: {
          fontSize: "80px",
          fontWeight: 700,
          letterSpacing: "-0.03em",
          backgroundImage: "linear-gradient(135deg, #8b5cf6, #00ffc8)",
          backgroundClip: "text",
          color: "transparent",
          marginBottom: "24px",
        },
      },
      "Eigenvue",
    ),
    h(
      "div",
      {
        style: {
          fontSize: "32px",
          fontWeight: 400,
          color: "#94a3b8",
          textAlign: "center",
          maxWidth: "800px",
        },
      },
      "Interactive Algorithm Visualizations for AI, ML & Computer Science",
    ),
  );
}

// ─── PNG Generation ───────────────────────────────────────────────────────────

async function generatePng(
  element: VNode,
  options: SatoriOptions,
): Promise<Uint8Array> {
  const svg = await satori(element, options);
  const resvg = new Resvg(svg);
  return resvg.render().asPng();
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Load Inter font data for Satori
  console.log("Loading Inter font from Google Fonts...");
  const [fontRegular, fontBold] = await Promise.all([
    loadFont(400),
    loadFont(700),
  ]);

  const satoriOptions: SatoriOptions = {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    fonts: [
      { name: "Inter", data: fontRegular, weight: 400, style: "normal" },
      { name: "Inter", data: fontBold, weight: 700, style: "normal" },
    ],
  };

  // Discover algorithms
  console.log("Discovering algorithms...");
  const algorithms = discoverAlgorithms();
  console.log(`Found ${algorithms.length} algorithms.\n`);

  let generated = 0;

  // Generate algorithm OG images
  for (const algo of algorithms) {
    const accentColor = CATEGORY_COLORS[algo.category] ?? DEFAULT_ACCENT;
    const element = renderAlgorithmOgImage({
      name: algo.name,
      categoryDisplay:
        CATEGORY_DISPLAY_NAMES[algo.category] ?? algo.category,
      timeComplexity: algo.timeComplexity,
      spaceComplexity: algo.spaceComplexity,
      accentColor,
    });

    const png = await generatePng(element, satoriOptions);
    writeFileSync(join(OUTPUT_DIR, `${algo.id}.png`), png);
    generated++;
    console.log(`  [${generated}/${algorithms.length + 1}] ${algo.id}.png`);
  }

  // Generate home page OG image
  const homeElement = renderHomeOgImage();
  const homePng = await generatePng(homeElement, satoriOptions);
  writeFileSync(join(OUTPUT_DIR, "home.png"), homePng);
  generated++;
  console.log(`  [${generated}/${algorithms.length + 1}] home.png`);

  console.log(
    `\nOG image generation complete. ${generated} images written to ${OUTPUT_DIR}`,
  );
}

main().catch((err) => {
  console.error("OG image generation failed:", err);
  process.exit(1);
});
