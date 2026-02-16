/**
 * Next.js Configuration — Phase 10 Enhanced
 *
 * OPTIMIZATION STRATEGY:
 * 1. Enable webpack bundle analyzer in CI for visibility.
 * 2. Configure code splitting: ensure each route loads only its code.
 * 3. Externalize heavy dependencies that aren't needed on initial load.
 * 4. Set security and caching headers.
 * 5. Configure redirects (www -> non-www).
 */

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Static export: produces a fully static site in the `out/` directory.
   * Required for Firebase Hosting deployment (no Node.js server needed).
   * All pages are pre-rendered at build time via generateStaticParams().
   *
   * Enabled via NEXT_OUTPUT_EXPORT=true (set in deploy-web.yml).
   * Disabled by default for local dev and CI type-checking builds.
   */
  output: process.env.NEXT_OUTPUT_EXPORT === "true" ? "export" : undefined,

  /**
   * Images: use unoptimized images for compatibility with static hosting.
   * OG images are pre-generated PNGs — no runtime optimization needed.
   */
  images: {
    unoptimized: true,
  },

  /**
   * Experimental features for bundle optimization.
   */
  experimental: {
    /**
     * optimizePackageImports: tells Next.js to tree-shake barrel exports
     * for listed packages. This prevents importing the entire package
     * when only a single component/function is used.
     */
    optimizePackageImports: ["framer-motion", "lucide-react"],
  },

  /**
   * Webpack customization for bundle size optimization.
   */
  webpack(config, { isServer }) {
    if (!isServer) {
      /**
       * Split the rendering engine into its own chunk.
       * This ensures the canvas rendering code (which is substantial)
       * is not included in the initial page load of non-visualizer pages
       * (landing page, catalog, about).
       */
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization?.splitChunks,
          cacheGroups: {
            ...(((config.optimization?.splitChunks as Record<string, unknown>)
              ?.cacheGroups as Record<string, unknown>) || {}),
            engine: {
              test: /[\\/]src[\\/]engine[\\/]/,
              name: "engine",
              chunks: "all" as const,
              priority: 10,
            },
          },
        },
      };
    }
    return config;
  },

  /**
   * Rewrites: proxy /docs requests to the Astro dev server during local
   * development. In production (output: "export"), rewrites are not supported
   * and not needed — the docs are built by Astro and merged into out/docs/
   * by the deploy-web.yml workflow.
   *
   * The Vite-internal paths (/@vite, /@id, /@fs, /node_modules, /src) are
   * proxied because Astro's dev server serves CSS and JS from these paths
   * without the /docs base prefix. Without these rules, styles and scripts
   * fail to load when viewing docs through the Next.js proxy.
   *
   * Usage: run both dev servers concurrently:
   *   Terminal 1: cd docs && npm run dev    (Astro on port 4321)
   *   Terminal 2: cd web && npm run dev     (Next.js on port 3000)
   * Then visit http://localhost:3000/docs
   */
  async rewrites() {
    if (process.env.NEXT_OUTPUT_EXPORT === "true") {
      return [];
    }

    const docsDevOrigin = "http://localhost:4321";
    return [
      // Docs pages
      { source: "/docs", destination: `${docsDevOrigin}/docs` },
      { source: "/docs/:path*", destination: `${docsDevOrigin}/docs/:path*` },
      // Vite dev server internals (CSS, JS, HMR)
      { source: "/@vite/:path*", destination: `${docsDevOrigin}/@vite/:path*` },
      { source: "/@id/:path*", destination: `${docsDevOrigin}/@id/:path*` },
      { source: "/@fs/:path*", destination: `${docsDevOrigin}/@fs/:path*` },
      {
        source: "/node_modules/:path*",
        destination: `${docsDevOrigin}/node_modules/:path*`,
      },
      {
        source: "/src/styles/:path*",
        destination: `${docsDevOrigin}/src/styles/:path*`,
      },
    ];
  },

  /**
   * Headers and redirects are NOT supported with output: "export".
   * All cache headers, security headers, and redirects are configured
   * in web/firebase.json for Firebase Hosting.
   */
};

export default nextConfig;
